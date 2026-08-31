function Cell({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "good" | "warn";
}) {
  const color =
    tone === "good"
      ? "text-good"
      : tone === "warn"
        ? "text-warn"
        : "text-ink";
  return (
    <div className="min-w-0 flex-1 border-r border-line px-4 py-3 last:border-r-0">
      <div className="micro">{label}</div>
      <div className={`mt-1 truncate text-[13px] font-medium ${color}`}>
        {value}
      </div>
    </div>
  );
}

export function StatusStrip({
  incidentId,
  agentName,
  awaitingApproval,
  toolCount,
}: {
  incidentId: string | null;
  agentName: string;
  awaitingApproval: boolean;
  toolCount: number;
}) {
  return (
    <div className="flex flex-shrink-0 border-b border-line bg-panel">
      <Cell
        label={incidentId ? `INCIDENT / ${incidentId.slice(0, 8).toUpperCase()}` : "INCIDENT"}
        value="Evidence-driven incident response"
      />
      <Cell label="AGENT" value={agentName} />
      <Cell
        label="CONTROL"
        value={awaitingApproval ? "Human approval required" : "Writes gated on approval"}
        tone={awaitingApproval ? "warn" : "good"}
      />
      <Cell
        label="EVIDENCE"
        value={toolCount === 0 ? "None yet" : `${toolCount} tool calls`}
      />
    </div>
  );
}
