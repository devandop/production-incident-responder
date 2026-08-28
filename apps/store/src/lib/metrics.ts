const totals = {
  requests: 0,
  errors: 0,
  latencySumMs: 0,
  latencyCount: 0,
};

/**
 * Formatted Influx line-protocol lines waiting to be shipped to Grafana Cloud.
 * Lines are built at record time so a failed push can hand them straight back
 * (see `restoreRemoteWriteLines`) without re-deriving anything.
 */
let pending: string[] = [];

/** Drop the oldest lines rather than grow without bound if Grafana stays down. */
const MAX_PENDING_LINES = 5000;

/**
 * Keep timestamps unique and monotonic for each metric series.
 * Date.now() only has millisecond precision, so multiple checkouts can
 * otherwise receive the same timestamp during burst traffic.
 */
let lastTimestampMs = 0;

function nextTimestampMs() {
  const now = Date.now();
  lastTimestampMs = Math.max(now, lastTimestampMs + 1);
  return lastTimestampMs;
}

/** Influx line protocol escapes commas, equals signs and spaces in tag keys/values. */
function escapeTag(value: string) {
  return value.replace(/([,=\s])/g, "\\$1");
}

/** Same, minus `=`, for the measurement name. */
function escapeMeasurement(value: string) {
  return value.replace(/([,\s])/g, "\\$1");
}

function line(
  name: string,
  value: number,
  labels: Record<string, string>,
  timestampMs: number,
) {
  const tags = Object.entries(labels)
    .map(([k, v]) => `${escapeTag(k)}=${escapeTag(v)}`)
    .join(",");
  const measurement = tags
    ? `${escapeMeasurement(name)},${tags}`
    : escapeMeasurement(name);

  // Influx defaults to nanosecond precision; append zeros instead of
  // multiplying so we never lose precision through a float.
  return `${measurement} value=${value} ${timestampMs}000000`;
}

export function recordCheckout(input: { ok: boolean; latencyMs: number }) {
  totals.requests += 1;
  if (!input.ok) totals.errors += 1;
  totals.latencySumMs += input.latencyMs;
  totals.latencyCount += 1;

  // Stamp every sample from one checkout with the same instant so the agent's
  // inflection analysis sees them as a single event.
  const at = nextTimestampMs();

  pending.push(
    line(
      "checkout_requests_total",
      1,
      { status: input.ok ? "success" : "error" },
      at,
    ),
    line("checkout_latency_seconds", input.latencyMs / 1000, {}, at),
  );

  if (!input.ok) {
    pending.push(line("checkout_errors_total", 1, {}, at));
  }

  if (pending.length > MAX_PENDING_LINES) {
    pending = pending.slice(-MAX_PENDING_LINES);
  }
}

export function prometheusText(): string {
  const errorRate =
    totals.requests === 0 ? 0 : totals.errors / totals.requests;

  const avgLatency =
    totals.latencyCount === 0
      ? 0
      : totals.latencySumMs / totals.latencyCount / 1000;

  return [
    "# HELP checkout_requests_total Checkout attempts",
    "# TYPE checkout_requests_total counter",
    `checkout_requests_total ${totals.requests}`,
    "# HELP checkout_errors_total Failed checkout attempts",
    "# TYPE checkout_errors_total counter",
    `checkout_errors_total ${totals.errors}`,
    "# HELP checkout_error_ratio Failed checkouts / total (in-process)",
    "# TYPE checkout_error_ratio gauge",
    `checkout_error_ratio ${errorRate}`,
    "# HELP checkout_latency_seconds Average checkout latency",
    "# TYPE checkout_latency_seconds gauge",
    `checkout_latency_seconds ${avgLatency}`,
  ].join("\n");
}

export function drainRemoteWriteLines(): string[] {
  return pending.splice(0);
}

/**
 * Put drained lines back after a failed push, ahead of anything recorded since,
 * so a transient Grafana error doesn't silently erase incident data.
 */
export function restoreRemoteWriteLines(lines: string[]) {
  if (lines.length === 0) return;
  pending = [...lines, ...pending].slice(-MAX_PENDING_LINES);
}