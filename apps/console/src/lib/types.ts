/** Trace categories drive the icon + colour of each row in the Activity rail. */
export type TraceKind =
  | "posthog"
  | "grafana"
  | "sandbox"
  | "approval"
  | "message"
  | "lifecycle";

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
