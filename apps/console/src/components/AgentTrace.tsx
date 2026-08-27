import { KIND_STYLE } from "../lib/toolmeta";
import type { TraceItem } from "../lib/types";

const STATE_BADGE: Record<TraceItem["state"], { text: string; cls: string }> = {
  running: { text: "RUNNING", cls: "text-accent" },
  done: { text: "DONE", cls: "text-ink-mute" },
  denied: { text: "DENIED", cls: "text-bad" },
  failed: { text: "FAILED", cls: "text-bad" },
};

function Row({ item }: { item: TraceItem }) {
  const style = KIND_STYLE[item.kind];
  const badge = STATE_BADGE[item.state];
  return (
    <li className="border-b border-line-soft px-4 py-3 last:border-b-0">
      <div className="flex items-start gap-2.5">
        <span
          className={`mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full ${style.dot} ${
            item.state === "running" ? "live-dot" : ""
          }`}
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <span className={`micro truncate ${style.text}`}>{item.label}</span>
            <span className={`micro flex-shrink-0 ${badge.cls}`}>
              {badge.text}
            </span>
          </div>
          <div className="mt-1 text-[13px] text-ink">{item.title}</div>
          {item.detail && (
            <div className="mt-0.5 text-[12px] text-ink-dim">{item.detail}</div>
          )}
          {item.receipt && (
            <div className="receipt mt-1.5 line-clamp-3">{item.receipt}</div>
          )}
        </div>
      </div>
    </li>
  );
}

export function AgentTrace({ trace }: { trace: TraceItem[] }) {
  const done = trace.filter((t) => t.state !== "running").length;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex flex-shrink-0 items-center justify-between border-b border-line px-4 py-3">
        <div>
          <div className="micro">AGENT TRACE</div>
          <h2 className="text-[15px] font-semibold">Activity</h2>
        </div>
        <span className="micro">
          {trace.length === 0 ? "IDLE" : `${done}/${trace.length} COMPLETE`}
        </span>
      </div>

      {trace.length === 0 ? (
        <div className="px-4 py-6">
          <p className="text-[13px] leading-relaxed text-ink-dim">
            Every PostHog query, Grafana range read, sandbox command and
            proposed fix appears here as it happens, with the raw tool payload
            attached.
          </p>
        </div>
      ) : (
        <ul className="scroll-thin min-h-0 flex-1 overflow-y-auto">
          {trace.map((item) => (
            <Row key={item.id} item={item} />
          ))}
        </ul>
      )}
    </div>
  );
}
