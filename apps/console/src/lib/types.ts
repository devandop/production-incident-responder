/** Trace categories drive the icon + colour of each row in the Activity rail. */
export type TraceKind =
  | "posthog"
  | "grafana"
  | "sandbox"
  | "approval"
  | "message"
  | "lifecycle";

/** Trace categories that represent actual investigative evidence, as opposed to control/lifecycle activity. */
export type EvidenceSourceKind = "posthog" | "grafana" | "sandbox";

export function isEvidenceSource(kind: TraceKind): kind is EvidenceSourceKind {
  return kind === "posthog" || kind === "grafana" || kind === "sandbox";
}

/** Trace rows that represent a completed tool call, as opposed to approval bookkeeping or turn lifecycle rows. */
export function isToolActivity(kind: TraceKind): boolean {
  return kind !== "approval" && kind !== "lifecycle";
}

export type TraceState = "running" | "done" | "denied" | "failed";

export type TraceItem = {
  id: string;
  kind: TraceKind;
  /** Uppercase label shown on the row, e.g. READ_METRICS. */
  label: string;
  title: string;
  detail?: string;
  /** Raw tool payload, rendered as a dim monospace receipt. */
  receipt?: string;
  state: TraceState;
  at: string;
};

export type ChatMessage = {
  id: string;
  role: "user" | "agent";
  text: string;
  at: string;
  /** True while assembled from deltas and not yet finalised. */
  streaming?: boolean;
};

/** A tool call the agent is blocked on, waiting for a human decision. */
export type PendingApproval = {
  eventId: string;
  threadId: string;
  toolCallId: string;
  toolName: string;
  args: string;
  at: string;
};

/** A decision staged locally but not yet accepted by the backend. */
export type StagedDecision = {
  decision: "allow" | "deny";
  reason?: string;
};

export type ApprovalOutcome = {
  toolCallId: string;
  toolName: string;
  decision: "allow" | "deny";
  reason?: string;
  at: string;
};

export type ConnectionState =
  | { status: "connecting" }
  | { status: "ready" }
  | { status: "streaming" }
  | { status: "awaiting-approval" }
  | { status: "disconnected"; error: string };

/** A non-fatal condition worth surfacing without tearing down the session. */
export type Notice = {
  kind: "error" | "cancelled";
  text: string;
};
