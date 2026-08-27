import type { ApprovalOutcome, TraceItem } from "../lib/types";

export function EvidenceSummary({
  trace,
  outcomes,
  lastAgentText,
}: {
  trace: TraceItem[];
  outcomes: ApprovalOutcome[];
  lastAgentText: string | null;
}) {
  const completed = trace.filter((t) => t.state === "done");
  const sources = new Set(completed.map((t) => t.kind));
  const approved = outcomes.filter((o) => o.decision === "allow").length;

  return (
    <div className="flex-shrink-0 border-t border-line bg-panel p-4">
      <div className="micro">LATEST EVIDENCE SUMMARY</div>

      {lastAgentText ? (
        <p className="mt-2 line-clamp-5 text-[13px] leading-relaxed text-ink">
          {lastAgentText}
        </p>
      ) : (
        <p className="mt-2 text-[13px] text-ink-dim">Awaiting investigation</p>
      )}

      <div className="mt-3 flex items-center justify-between">
        <span className="micro">EVIDENCE COVERAGE</span>
        <span className="text-[11px] text-accent">
          {sources.size === 0 ? "None yet" : `${sources.size} sources`}
        </span>
      </div>
      <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-line">
        <div
          className="h-full rounded-full bg-accent transition-all"
          style={{ width: `${Math.min(sources.size / 3, 1) * 100}%` }}
        />
      </div>

      <div className="receipt mt-3">
        {completed.length} completed tool call
        {completed.length === 1 ? "" : "s"}
        {approved > 0 && ` · ${approved} approved write${approved === 1 ? "" : "s"}`}
      </div>
    </div>
  );
}
