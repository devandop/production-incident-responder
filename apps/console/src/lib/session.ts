import { useCallback, useEffect, useRef, useState } from "react";
import { TrueForge } from "@truefoundry/trueforge-sdk";
import { kindForTool, labelForTool, receipt } from "./toolmeta";
import type {
  ApprovalOutcome,
  ChatMessage,
  ConnectionState,
  PendingApproval,
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
type StreamEvent = {
  type: string;
  id?: string;
  createdAt?: string;
  threadId?: string | null;
  content?: unknown;
  toolCalls?: Array<{
    id?: string;
    sourceEventId?: string;
    function?: { name?: string; arguments?: string };
    name?: string;
    arguments?: string;
  }>;
  toolCallId?: string;
  sandboxId?: string;
  state?: unknown;
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
  const toolNames = useRef(new Map<string, string>());

  const [connection, setConnection] = useState<ConnectionState>({
    status: "connecting",
  });
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [trace, setTrace] = useState<TraceItem[]>([]);
  const [pending, setPending] = useState<PendingApproval | null>(null);
  const [outcomes, setOutcomes] = useState<ApprovalOutcome[]>([]);
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

  /** Open a session against the agent. Failure leaves an honest error state. */
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

  const consume = useCallback(
    async (stream: AsyncIterable<unknown>) => {
      for await (const raw of stream) {
        const ev = raw as StreamEvent;
        const at = ev.createdAt ?? new Date().toISOString();
        const id = ev.id ?? `${ev.type}-${Date.now()}`;

        switch (ev.type) {
          case "model.message": {
            const text = textOf(ev.content);
            if (text.trim()) {
              setMessages((prev) => [
                ...prev,
                { id, role: "agent", text, at },
              ]);
            }
            for (const call of ev.toolCalls ?? []) {
              const callId = call.id ?? id;
              const name = nameOfCall(call);
              toolNames.current.set(callId, name);
              pushTrace({
                id: callId,
                kind: kindForTool(name),
                label: labelForTool(name),
                title: "Tool call issued",
                receipt: receipt(argsOfCall(call)),
                state: "running",
                at,
              });
            }
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
            const call = (ev.toolCalls ?? [])[0];
            const callId = call?.id ?? id;
            const name = toolNames.current.get(callId) ?? nameOfCall(call ?? {});
            setPending({
              eventId: id,
              threadId: ev.threadId ?? "main",
              toolCallId: callId,
              toolName: name,
              args: receipt(argsOfCall(call ?? {}), 1200),
              at,
            });
            pushTrace({
              id: `${callId}:approval`,
              kind: "approval",
              label: labelForTool(name),
              title: "Awaiting human approval",
              state: "running",
              at,
            });
            setConnection({ status: "awaiting-approval" });
            // The stream ends here until a decision resumes the turn.
            return;
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
            pushTrace({
              id,
              kind: "lifecycle",
              label: "TURN",
              title: "Turn complete",
              state: "done",
              at,
            });
            break;
          }

          default:
            break;
        }
      }
      setConnection({ status: "ready" });
    },
    [pushTrace],
  );

  const send = useCallback(
    async (text: string) => {
      const client = clientRef.current;
      const sessionId = sessionRef.current;
      if (!client || !sessionId || !text.trim()) return;

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

      try {
        const stream = await client.sessions.createTurnStream(sessionId, {
          input: [{ type: "user.message", content: text } as never],
        });
        await consume(stream as unknown as AsyncIterable<unknown>);
      } catch (error) {
        setConnection({
          status: "disconnected",
          error: error instanceof Error ? error.message : String(error),
        });
      }
    },
    [consume],
  );

  /**
   * Resume the blocked turn with the human's decision. TrueForge rejects a
   * payload that mixes user messages with approval items, so this sends the
   * approval on its own.
   */
  const decide = useCallback(
    async (decision: "allow" | "deny", reason?: string) => {
      const client = clientRef.current;
      const sessionId = sessionRef.current;
      const target = pending;
      if (!client || !sessionId || !target) return;

      setOutcomes((prev) => [
        ...prev,
        {
          toolCallId: target.toolCallId,
          toolName: target.toolName,
          decision,
          reason,
          at: new Date().toISOString(),
        },
      ]);
      pushTrace({
        id: `${target.toolCallId}:approval`,
        kind: "approval",
        label: labelForTool(target.toolName),
        title: decision === "allow" ? "Approved by human" : "Denied by human",
        detail: reason,
        state: decision === "allow" ? "done" : "denied",
        at: new Date().toISOString(),
      });
      setPending(null);
      setConnection({ status: "streaming" });

      try {
        const stream = await client.sessions.createTurnStream(sessionId, {
          input: [
            {
              type: "user.tool_approval",
              threadId: target.threadId,
              toolCallId: target.toolCallId,
              approval:
                decision === "allow"
                  ? { status: "allow" }
                  : { status: "deny", reason },
            } as never,
          ],
        });
        await consume(stream as unknown as AsyncIterable<unknown>);
      } catch (error) {
        setConnection({
          status: "disconnected",
          error: error instanceof Error ? error.message : String(error),
        });
      }
    },
    [pending, consume, pushTrace],
  );

  return {
    connection,
    messages,
    trace,
    pending,
    outcomes,
    incidentId,
    send,
    decide,
  };
}
