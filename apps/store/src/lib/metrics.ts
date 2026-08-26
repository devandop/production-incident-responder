type Sample = {
  name: string;
  value: number;
  labels: Record<string, string>;
};

const totals = {
  requests: 0,
  errors: 0,
  latencySumMs: 0,
  latencyCount: 0,
};

const samples: Sample[] = [];

export function recordCheckout(input: { ok: boolean; latencyMs: number }) {
  totals.requests += 1;
  if (!input.ok) totals.errors += 1;
  totals.latencySumMs += input.latencyMs;
  totals.latencyCount += 1;

  samples.push(
    {
      name: "checkout_requests_total",
      value: 1,
      labels: { status: input.ok ? "success" : "error" },
    },
    {
      name: "checkout_errors_total",
      value: input.ok ? 0 : 1,
      labels: {},
    },
    {
      name: "checkout_latency_seconds",
      value: input.latencyMs / 1000,
      labels: {},
    },
  );
}

export function prometheusText(): string {
  const errorRate =
    totals.requests === 0 ? 0 : totals.errors / totals.requests;
  const avgLatency =
    totals.latencyCount === 0 ? 0 : totals.latencySumMs / totals.latencyCount / 1000;

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
  const lines = samples.splice(0).flatMap((s) => {
    if (s.name === "checkout_errors_total" && s.value === 0) return [];
    const labelStr = Object.entries(s.labels)
      .map(([k, v]) => `${k}=${JSON.stringify(v)}`)
      .join(",");
    const metric = labelStr ? `${s.name},${labelStr}` : s.name;
    return [`${metric} value=${s.value}`];
  });
  return lines;
}
