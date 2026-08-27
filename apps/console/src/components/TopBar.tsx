import type { ConnectionState } from "../lib/types";

const STATUS: Record<
  ConnectionState["status"],
  { label: string; dot: string; text: string }
> = {
  connecting: { label: "CONNECTING", dot: "bg-ink-mute", text: "text-ink-mute" },
  ready: { label: "READY", dot: "bg-good", text: "text-good" },
  streaming: { label: "INVESTIGATING", dot: "bg-accent", text: "text-accent" },
  "awaiting-approval": { label: "FIX READY", dot: "bg-warn", text: "text-warn" },
  disconnected: { label: "DISCONNECTED", dot: "bg-bad", text: "text-bad" },
};

export function TopBar({
  connection,
  storeUrl,
  onOpenReport,
  reportEnabled,
}: {
  connection: ConnectionState;
  storeUrl: string;
  onOpenReport: () => void;
  reportEnabled: boolean;
}) {
  const s = STATUS[connection.status];
  const live =
    connection.status === "streaming" ||
    connection.status === "awaiting-approval";

  return (
    <header className="flex flex-shrink-0 items-center gap-4 border-b border-line bg-panel px-4 py-2.5">
      <div className="flex items-center gap-3">
        <div className="grid h-9 w-9 place-items-center rounded-md border border-line bg-raised font-semibold text-accent">
          IR
        </div>
        <div className="leading-tight">
          <div className="micro">PRODUCTION INCIDENT</div>
          <div className="text-[15px] font-semibold">Responder</div>
        </div>
      </div>

      <div className="ml-auto flex items-center gap-2">
        <a
          href={storeUrl}
          target="_blank"
          rel="noreferrer"
          className="rounded-md border border-line px-3 py-1.5 text-xs text-ink-dim transition hover:border-accent hover:text-ink"
        >
          Forge Store ↗
        </a>
        <button
          type="button"
          onClick={onOpenReport}
          disabled={!reportEnabled}
          className="rounded-md border border-line px-3 py-1.5 text-xs text-ink-dim transition enabled:hover:border-accent enabled:hover:text-ink disabled:cursor-not-allowed disabled:opacity-40"
        >
          Post-incident report
        </button>
        <div className="ml-2 flex items-center gap-2">
          <span
            className={`h-2 w-2 rounded-full ${s.dot} ${live ? "live-dot" : ""}`}
          />
          <span className={`micro ${s.text}`}>{s.label}</span>
        </div>
      </div>
    </header>
  );
}
