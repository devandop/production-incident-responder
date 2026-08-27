import type { ApprovalOutcome, ChatMessage, TraceItem } from "../lib/types";

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "good" | "warn";
}) {
  const color =
    tone === "good" ? "text-good" : tone === "warn" ? "text-warn" : "text-ink";
  return (
    <div className="flex-1 border-r border-line px-4 py-3 last:border-r-0">
      <div className="micro">{label}</div>
      <div className={`mt-1 text-[15px] font-semibold ${color}`}>{value}</div>
    </div>
  );
}

export function PostIncidentReport({
  incidentId,
  trace,
  messages,
  outcomes,
  onClose,
}: {
  incidentId: string | null;
  trace: TraceItem[];
  messages: ChatMessage[];
  outcomes: ApprovalOutcome[];
  onClose: () => void;
}) {
  const completed = trace.filter((t) => t.state === "done");
  const approved = outcomes.filter((o) => o.decision === "allow");
  const denied = outcomes.filter((o) => o.decision === "deny");

  const status =
    approved.length > 0
      ? { text: "REMEDIATED", tone: "good" as const }
      : denied.length > 0
        ? { text: "NO ACTION TAKEN", tone: "warn" as const }
        : { text: "INVESTIGATED", tone: "warn" as const };

  const rootCause =
    [...messages].reverse().find((m) => m.role === "agent")?.text ?? null;

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-6"
      onClick={onClose}
    >
      <div
        className="scroll-thin max-h-[85vh] w-full max-w-3xl overflow-y-auto rounded-lg border border-line bg-panel"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-line p-5">
          <div>
            <div className="micro">POST-INCIDENT REPORT</div>
            <h2 className="mt-1 text-xl font-semibold">Incident review</h2>
            {incidentId && (
              <div className="receipt mt-1">{incidentId}</div>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded border border-line px-2.5 py-1 text-xs text-ink-dim transition hover:text-ink"
          >
            Close ×
          </button>
        </div>

        <div className="flex border-b border-line">
          <Stat label="STATUS" value={status.text} tone={status.tone} />
          <Stat label="MESSAGES" value={String(messages.length)} />
          <Stat label="TOOL EVENTS" value={String(completed.length)} />
          <Stat label="APPROVALS" value={String(outcomes.length)} />
        </div>

        <div className="p-5">
          <h3 className="text-sm font-semibold">Root cause</h3>
          <p className="mt-1.5 text-[13px] leading-relaxed text-ink-dim">
            {rootCause ?? "The agent did not reach a conclusion in this session."}
          </p>

          <h3 className="mt-5 text-sm font-semibold">Action taken</h3>
          {outcomes.length === 0 ? (
            <p className="mt-1.5 text-[13px] text-ink-dim">
              No write was proposed, so nothing required approval.
            </p>
          ) : (
            <ul className="mt-1.5 space-y-2">
              {outcomes.map((o) => (
                <li
                  key={o.toolCallId}
                  className="rounded border border-line bg-raised px-3 py-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="mono text-[12px] text-ink">
                      {o.toolName}
                    </span>
                    <span
                      className={`micro ${o.decision === "allow" ? "text-good" : "text-bad"}`}
                    >
                      {o.decision === "allow" ? "APPROVED" : "DENIED"}
                    </span>
                  </div>
                  {o.reason && (
                    <div className="receipt mt-1">Reason: {o.reason}</div>
                  )}
                </li>
              ))}
            </ul>
          )}

          <h3 className="mt-5 text-sm font-semibold">Evidence timeline</h3>
          {completed.length === 0 ? (
            <p className="mt-1.5 text-[13px] text-ink-dim">
              No completed tool calls were recorded.
            </p>
          ) : (
            <ul className="mt-1.5 divide-y divide-line-soft">
              {completed.map((t) => (
                <li key={t.id} className="flex gap-3 py-2.5">
                  <span className="receipt w-16 flex-shrink-0 pt-0.5">
                    {new Date(t.at).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit",
                    })}
                  </span>
                  <div className="min-w-0 flex-1">
                    <span className="micro text-accent">{t.label}</span>
                    <div className="text-[13px] text-ink">{t.title}</div>
                    {t.receipt && (
                      <div className="receipt mt-0.5 line-clamp-2">
                        {t.receipt}
                      </div>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
