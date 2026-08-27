import { useEffect, useRef, useState } from "react";
import type { ChatMessage, ConnectionState, PendingApproval } from "../lib/types";
import { ApprovalCard } from "./ApprovalCard";

function time(at: string) {
  return new Date(at).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function Empty({ connection }: { connection: ConnectionState }) {
  if (connection.status === "disconnected") {
    return (
      <div className="rounded-lg border border-bad/30 bg-bad/[0.04] p-4">
        <div className="micro text-bad">TRUEFORGE UNREACHABLE</div>
        <p className="mt-2 text-[13px] leading-relaxed text-ink-dim">
          The console talks to a TrueForge instance — nothing is simulated here,
          so there is no transcript to show until one is running.
        </p>
        <pre className="receipt mt-3 overflow-x-auto rounded border border-line bg-ground/60 p-2.5">
          npx @truefoundry/trueforge
        </pre>
        <p className="receipt mt-2">{connection.error}</p>
      </div>
    );
  }
  return (
    <div className="rounded-lg border border-line bg-panel p-4">
      <div className="micro">NO INCIDENT YET</div>
      <p className="mt-2 text-[13px] leading-relaxed text-ink-dim">
        Ask the agent to investigate. It will pull PostHog user impact and
        Grafana metrics, reason in a sandbox, and propose a fix — pausing for
        your approval before any write.
      </p>
    </div>
  );
}

export function Transcript({
  messages,
  connection,
  pending,
  onSend,
  onDecide,
}: {
  messages: ChatMessage[];
  connection: ConnectionState;
  pending: PendingApproval | null;
  onSend: (text: string) => void;
  onDecide: (decision: "allow" | "deny", reason?: string) => void;
}) {
  const [draft, setDraft] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, pending]);

  const busy =
    connection.status === "streaming" || connection.status === "connecting";
  const blocked = connection.status === "disconnected";

  return (
    <section className="flex min-w-0 flex-1 flex-col border-r border-line">
      <div className="flex flex-shrink-0 items-center justify-between border-b border-line px-4 py-3">
        <div>
          <div className="micro">LIVE INCIDENT CHANNEL</div>
          <h2 className="text-[15px] font-semibold">Investigation</h2>
        </div>
        {connection.status === "awaiting-approval" && (
          <span className="micro flex items-center gap-1.5 text-warn">
            <span className="live-dot h-1.5 w-1.5 rounded-full bg-warn" />
            PAUSED FOR APPROVAL
          </span>
        )}
      </div>

      <div className="scroll-thin flex-1 space-y-4 overflow-y-auto p-4">
        {messages.length === 0 && !pending && <Empty connection={connection} />}

        {messages.map((m) => (
          <div key={m.id} className="flex gap-3">
            <div
              className={`mt-0.5 grid h-6 w-6 flex-shrink-0 place-items-center rounded text-[10px] font-bold ${
                m.role === "user"
                  ? "bg-raised text-ink-dim"
                  : "bg-accent/15 text-accent"
              }`}
            >
              {m.role === "user" ? "YOU" : "IR"}
            </div>
            <div className="min-w-0 flex-1">
              <div className="micro mb-1">{time(m.at)}</div>
              <p className="text-[13px] leading-relaxed whitespace-pre-wrap text-ink">
                {m.text}
              </p>
            </div>
          </div>
        ))}

        {pending && <ApprovalCard pending={pending} onDecide={onDecide} />}
        <div ref={endRef} />
      </div>

      <form
        className="flex flex-shrink-0 items-center gap-2 border-t border-line p-3"
        onSubmit={(e) => {
          e.preventDefault();
          if (!draft.trim() || busy || blocked || pending) return;
          onSend(draft);
          setDraft("");
        }}
      >
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          disabled={blocked || Boolean(pending)}
          placeholder={
            blocked
              ? "Start TrueForge to begin"
              : pending
                ? "Decide on the proposed action first"
                : "Ask the agent to investigate…"
          }
          className="flex-1 rounded border border-line bg-panel px-3 py-2 text-sm outline-none focus:border-accent disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={busy || blocked || Boolean(pending) || !draft.trim()}
          className="rounded bg-accent px-4 py-2 text-sm font-semibold text-ground transition enabled:hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {busy ? "…" : "Send ↑"}
        </button>
      </form>
    </section>
  );
}
