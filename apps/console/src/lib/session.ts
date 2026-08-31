import { useCallback, useEffect, useRef, useState } from "react";
import { TrueForge } from "@truefoundry/trueforge-sdk";
import { kindForTool, labelForTool, receipt } from "./toolmeta";
import type {
  ApprovalOutcome,
  ChatMessage,
  ConnectionState,
  Notice,
  PendingApproval,
  StagedDecision,
  TraceItem,
} from "./types";

const AGENT_NAME =
  import.meta.env.VITE_AGENT_NAME || "production-incident-responder";

/**
 * Default to same-origin: vite.config.ts proxies `/api` to TrueForge, which
 * keeps the browser off a cross-origin request in local dev.
 */
const BASE_URL = import.meta.env.VITE_TRUEFORGE_ORIGIN || window.location.origin;

/** Narrow view of the streamed event shapes this console reacts to. */
type DeltaToolCall = {
  index: number;
  id?: string;
  function?: { name?: string; arguments?: string };
};

type StreamEvent = {
  type: string;
  id?: string;
  createdAt?: string;
  threadId?: string | null;
  content?: unknown;
  finishReason?: string | null;
  toolCalls?: Array<{
    id?: string;
    sourceEventId?: string;
    index?: number;
    function?: { name?: string; arguments?: string };
    name?: string;
    arguments?: string;
  }>;
  toolCallId?: string;
  sandboxId?: string;
  state?: {
    status?: string;
    message?: string;
    reason?: unknown;
    requiredActions?: StreamEvent[];
  };
};

/** Assistant text arriving as deltas, accumulated per thread. */
type LiveMessage = {
  text: string;
  calls: Map<number, { id?: string; name: string; args: string }>;
};

function textOf(content: unknown): string {
  if (!content) return "";
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .map((part) =>
        part && typeof part === "object" && "text" in part
          ? String((part as { text?: unknown }).text ?? "")
          : "",
      )
      .join("");
  }
  return "";
}

function nameOfCall(call: NonNullable<StreamEvent["toolCalls"]>[number]) {
  return call.function?.name ?? call.name ?? "tool";
}

function argsOfCall(call: NonNullable<StreamEvent["toolCalls"]>[number]) {
  return call.function?.arguments ?? call.arguments ?? "";
}

export function useIncidentSession() {
  const clientRef = useRef<TrueForge | null>(null);
  const sessionRef = useRef<string | null>(null);
  /** tool call id → tool name, learned from model.message / deltas. */
  const toolNames = useRef(new Map<string, string>());
  /** threadId → assistant message being assembled from deltas. */
  const live = useRef(new Map<string, LiveMessage>());
  /** threadId → the message just finalised by a finish_reason, for dedupe. */
  const finalized = useRef(new Map<string, { msgId: string; text: string }>());
  /** Events seen on the current stream; distinguishes a close from a failure. */
  const progress = useRef(0);

  const [connection, setConnection] = useState<ConnectionState>({
    status: "connecting",
  });
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [trace, setTrace] = useState<TraceItem[]>([]);
  const [pending, setPending] = useState<PendingApproval[]>([]);
  const [staged, setStaged] = useState<Record<string, StagedDecision>>({});
  const [outcomes, setOutcomes] = useState<ApprovalOutcome[]>([]);
  const [notice, setNotice] = useState<Notice | null>(null);
  /** Set when a submission failed; blocks auto-retry until a human acts. */
  const [submitBlocked, setSubmitBlocked] = useState(false);
  const [incidentId, setIncidentId] = useState<string | null>(null);

  const pushTrace = useCallback((item: TraceItem) => {
    setTrace((prev) => {
      const at = prev.findIndex((t) => t.id === item.id);
      if (at === -1) return [...prev, item];
      const next = [...prev];
      next[at] = { ...next[at], ...item };
      return next;
    });
  }, []);

  /** Upsert the in-flight assistant message for a thread. */
  const upsertLive = useCallback((threadId: string, at: string) => {
    const buf = live.current.get(threadId);
    if (!buf) return;
    const id = `live-${threadId}`;
    setMessages((prev) => {
      const idx = prev.findIndex((m) => m.id === id);
      const msg: ChatMessage = {
        id,
        role: "agent",
        text: buf.text,
        at,
        streaming: true,
      };
      if (idx === -1) return buf.text ? [...prev, msg] : prev;
      const next = [...prev];
      next[idx] = msg;
      return next;
    });
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const client = new TrueForge({ baseUrl: BASE_URL });
        const session = await client.sessions.create({
          agent: { name: AGENT_NAME },
        });
        if (cancelled) return;
        clientRef.current = client;
        const id = (session as { id?: string }).id ?? null;
        sessionRef.current = id;
        setIncidentId(id);
        setConnection({ status: "ready" });
      } catch (error) {
        if (cancelled) return;
        setConnection({
          status: "disconnected",
          error: error instanceof Error ? error.message : String(error),
        });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  /** Record the tool calls named by an assembled or accumulated message. */
  const registerCalls = useCallback(
    (
      calls: Array<{ id?: string; name: string; args: string }>,
      at: string,
      fallbackId: string,
    ) => {
      for (const call of calls) {
        const callId = call.id ?? fallbackId;
        toolNames.current.set(callId, call.name);
        pushTrace({
          id: callId,
          kind: kindForTool(call.name),
          label: labelForTool(call.name),
          title: "Tool call issued",
          receipt: receipt(call.args),
          state: "running",
          at,
        });
      }
    },
    [pushTrace],
  );

  /** Turn a tool.approval_required event into pending approval entries. */
  const collectApprovals = useCallback(
    (ev: StreamEvent, at: string, fallbackId: string) => {
      const refs = ev.toolCalls ?? [];
      if (refs.length === 0) return false;
      const items: PendingApproval[] = refs.map((ref) => {
        const callId = ref.id ?? fallbackId;
        // ToolCallRef carries no name — recover it from the issuing message.
        const name = toolNames.current.get(callId) ?? nameOfCall(ref);
        const known = trace.find((t) => t.id === callId);
        return {
          eventId: ev.id ?? fallbackId,
          threadId: ev.threadId ?? "main",
          toolCallId: callId,
          toolName: name,
          args: known?.receipt ?? receipt(argsOfCall(ref), 1200),
          at,
        };
      });
      setPending((prev) => {
        const seen = new Set(prev.map((p) => p.toolCallId));
        return [...prev, ...items.filter((i) => !seen.has(i.toolCallId))];
      });
      for (const item of items) {
        pushTrace({
          id: `${item.toolCallId}:approval`,
          kind: "approval",
          label: labelForTool(item.toolName),
          title: "Awaiting human approval",
          state: "running",
          at,
        });
      }
      setConnection({ status: "awaiting-approval" });
      return true;
    },
    [pushTrace, trace],
  );

  const consume = useCallback(
    async (stream: AsyncIterable<unknown>) => {
      let paused = false;

      for await (const raw of stream) {
        const ev = raw as StreamEvent;
        progress.current += 1;
        const at = ev.createdAt ?? new Date().toISOString();
        const id = ev.id ?? `${ev.type}-${Date.now()}`;
        const thread = ev.threadId ?? "main";

        switch (ev.type) {
          // The most frequent streaming event: incremental assistant output.
          case "model.message.delta": {
            const buf =
              live.current.get(thread) ?? { text: "", calls: new Map() };
            if (typeof ev.content === "string") buf.text += ev.content;
            for (const part of (ev.toolCalls ?? []) as DeltaToolCall[]) {
              const slot = buf.calls.get(part.index) ?? {
                id: undefined,
                name: "",
                args: "",
              };
              if (part.id) slot.id = part.id;
              if (part.function?.name) slot.name += part.function.name;
              if (part.function?.arguments) slot.args += part.function.arguments;
              buf.calls.set(part.index, slot);
            }
            live.current.set(thread, buf);
            upsertLive(thread, at);
            // finish_reason terminates the message: register the tool calls
            // now, in case no assembled model.message follows on this stream.
            if (ev.finishReason) {
              registerCalls([...buf.calls.values()], at, id);
              // Finalise under a permanent id so the next message in this
              // thread starts a new bubble instead of appending to this one.
              const permId = `msg-${id}`;
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === `live-${thread}`
                    ? { ...m, id: permId, streaming: false }
                    : m,
                ),
              );
              finalized.current.set(thread, { msgId: permId, text: buf.text });
              live.current.delete(thread);
            }
            break;
          }

          case "model.message": {
            // The assembled message supersedes anything accumulated so far.
            live.current.delete(thread);
            const text = textOf(ev.content);
            const fin = finalized.current.get(thread);
            finalized.current.delete(thread);
            setMessages((prev) => {
              const without = prev.filter((m) => m.id !== `live-${thread}`);
              // The same message may arrive both as deltas and assembled;
              // replace rather than showing it twice.
              if (fin && fin.text.trim() === text.trim()) {
                return without.map((m) =>
                  m.id === fin.msgId ? { ...m, id, text, streaming: false } : m,
                );
              }
              return text.trim()
                ? [...without, { id, role: "agent", text, at }]
                : without;
            });
            registerCalls(
              (ev.toolCalls ?? []).map((c) => ({
                id: c.id,
                name: nameOfCall(c),
                args: argsOfCall(c),
              })),
              at,
              id,
            );
            break;
          }

          case "tool.response": {
            const callId = ev.toolCallId ?? id;
            const name = toolNames.current.get(callId) ?? "tool";
            pushTrace({
              id: callId,
              kind: kindForTool(name),
              label: labelForTool(name),
              title: "Tool completed",
              receipt: receipt(ev.content),
              state: "done",
              at,
            });
            break;
          }

          case "tool.approval_required": {
            // Promote any deltas seen so far so the card can name the tool.
            const buf = live.current.get(thread);
            if (buf) {
              registerCalls([...buf.calls.values()], at, id);
            }
            paused = collectApprovals(ev, at, id) || paused;
            break;
          }

          case "sandbox.created": {
            pushTrace({
              id,
              kind: "sandbox",
              label: "SANDBOX",
              title: "Sandbox created",
              detail: ev.sandboxId,
              state: "done",
              at,
            });
            break;
          }

          case "turn.done": {
            const status = ev.state?.status ?? "done";
            // A "done" turn may still be paused on required actions.
            for (const action of ev.state?.requiredActions ?? []) {
              if (action.type === "tool.approval_required") {
                paused = collectApprovals(action, at, id) || paused;
              }
            }
            if (status === "error") {
              const text = ev.state?.message ?? "The turn failed.";
              pushTrace({
                id,
                kind: "lifecycle",
                label: "TURN",
                title: "Turn failed",
                detail: text,
                state: "failed",
                at,
              });
              setNotice({ kind: "error", text });
            } else if (status === "cancelled") {
              pushTrace({
                id,
                kind: "lifecycle",
                label: "TURN",
                title: "Turn cancelled",
                state: "failed",
                at,
              });
              setNotice({ kind: "cancelled", text: "The turn was cancelled." });
            } else {
              pushTrace({
                id,
                kind: "lifecycle",
                label: "TURN",
                title: "Turn complete",
                state: "done",
                at,
              });
            }
            break;
          }

          default:
            break;
        }
      }

      // Only fall back to ready when the turn is not parked on a decision.
      if (!paused) setConnection({ status: "ready" });
    },
    [pushTrace, registerCalls, collectApprovals, upsertLive],
  );

  const run = useCallback(
    async (input: unknown[]) => {
      const client = clientRef.current;
      const sessionId = sessionRef.current;
      if (!client || !sessionId) return false;
      progress.current = 0;
      try {
        const stream = await client.sessions.createTurnStream(sessionId, {
          input: input as never,
        });
        await consume(stream as unknown as AsyncIterable<unknown>);
        return true;
      } catch (error) {
        // The server closes the stream when a turn parks on an approval, which
        // surfaces as an abort. Only treat it as a disconnect when nothing at
        // all came through — otherwise the events already handled stand.
        if (progress.current > 0) return true;
        setConnection({
          status: "disconnected",
          error: error instanceof Error ? error.message : String(error),
        });
        return false;
      }
    },
    [consume],
  );

  const send = useCallback(
    async (text: string) => {
      if (!text.trim()) return;
      setNotice(null);
      setMessages((prev) => [
        ...prev,
        {
          id: `user-${Date.now()}`,
          role: "user",
          text,
          at: new Date().toISOString(),
        },
      ]);
      setConnection({ status: "streaming" });
      await run([{ type: "user.message", content: text }]);
    },
    [run],
  );

  /**
   * Stage one decision. The backend turn stays blocked until every pending
   * call has an answer, so the decisions are submitted together — one
   * user.tool_approval item per call, as the contract requires.
   */
  const decide = useCallback(
    (toolCallId: string, decision: "allow" | "deny", reason?: string) => {
      setSubmitBlocked(false);
      setStaged((prev) => ({ ...prev, [toolCallId]: { decision, reason } }));
    },
    [],
  );

  const unstage = useCallback((toolCallId: string) => {
    setSubmitBlocked(false);
    setStaged((prev) => {
      const next = { ...prev };
      delete next[toolCallId];
      return next;
    });
  }, []);

  const submitDecisions = useCallback(async () => {
    const client = clientRef.current;
    const sessionId = sessionRef.current;
    if (!client || !sessionId || pending.length === 0) return;
    if (pending.some((p) => !staged[p.toolCallId])) return;

    const decided = pending.map((p) => ({
      pending: p,
      choice: staged[p.toolCallId],
    }));
    const input = decided.map(({ pending: p, choice }) => ({
      type: "user.tool_approval",
      threadId: p.threadId,
      toolCallId: p.toolCallId,
      approval:
        choice.decision === "allow"
          ? { status: "allow" }
          : { status: "deny", reason: choice.reason },
    }));

    setNotice(null);
    setConnection({ status: "streaming" });

    const ok = await run(input);
    if (!ok) {
      // Park here. Without this the auto-submit effect below would see
      // awaiting-approval again and resubmit forever.
      setSubmitBlocked(true);
      // The backend never accepted these, so the turn is still blocked.
      // Keep the cards and the staged choices so the operator can retry.
      setNotice({
        kind: "error",
        text: "The decision was not accepted. The agent is still waiting — retry when the connection is back.",
      });
      setConnection({ status: "awaiting-approval" });
      return;
    }

    // Only record the audit trail once the backend has taken the decision.
    const at = new Date().toISOString();
    setOutcomes((prev) => [
      ...prev,
      ...decided.map(({ pending: p, choice }) => ({
        toolCallId: p.toolCallId,
        toolName: p.toolName,
        decision: choice.decision,
        reason: choice.reason,
        at,
      })),
    ]);
    for (const { pending: p, choice } of decided) {
      pushTrace({
        id: `${p.toolCallId}:approval`,
        kind: "approval",
        label: labelForTool(p.toolName),
        title:
          choice.decision === "allow" ? "Approved by human" : "Denied by human",
        detail: choice.reason,
        state: choice.decision === "allow" ? "done" : "denied",
        at,
      });
    }
    setPending((prev) =>
      prev.filter((p) => !decided.some((d) => d.pending.toolCallId === p.toolCallId)),
    );
    setStaged({});
  }, [pending, staged, run, pushTrace]);

  /**
   * Never sit in "awaiting approval" with nothing to approve — that state has
   * no control the operator can reach, so it would be a dead end.
   */
  useEffect(() => {
    if (connection.status === "awaiting-approval" && pending.length === 0) {
      setConnection({ status: "ready" });
    }
  }, [connection.status, pending.length]);

  /** Submit automatically once every pending call has been decided. */
  useEffect(() => {
    if (
      pending.length > 0 &&
      connection.status === "awaiting-approval" &&
      !submitBlocked &&
      pending.every((p) => staged[p.toolCallId])
    ) {
      void submitDecisions();
    }
  }, [pending, staged, connection.status, submitBlocked, submitDecisions]);

  return {
    connection,
    messages,
    trace,
    pending,
    staged,
    outcomes,
    notice,
    incidentId,
    send,
    decide,
    unstage,
    retry: () => {
      setSubmitBlocked(false);
      void submitDecisions();
    },
  };
}
