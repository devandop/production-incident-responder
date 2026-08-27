/**
 * Grafana Cloud Prometheus accepts Influx line protocol at the /api/v1/push/influx/write
 * endpoint. This avoids snappy+protobuf remote_write in the demo app.
 */

export type PushResult =
  | { pushed: true }
  | { pushed: false; retryable: boolean; status?: number };

export async function pushInfluxLines(lines: string[]): Promise<PushResult> {
  const url = process.env.GRAFANA_CLOUD_INFLUX_URL;
  const token = process.env.GRAFANA_CLOUD_INFLUX_TOKEN;
  // Not configured is the normal local-demo path, not a failure to retry:
  // `GET /api/metrics` still serves the in-process counters.
  if (!url || !token) return { pushed: false, retryable: false };
  if (lines.length === 0) return { pushed: true };

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "text/plain",
      },
      body: lines.join("\n"),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      // 4xx means Grafana will never accept these lines (bad auth, malformed
      // payload) — replaying them forever would just wedge the buffer. 429 and
      // 5xx are transient, so those are worth keeping.
      const retryable = res.status === 429 || res.status >= 500;
      console.error("Grafana Cloud write failed", res.status, text.slice(0, 500));
      return { pushed: false, retryable, status: res.status };
    }

    return { pushed: true };
  } catch (error) {
    // A DNS/TLS/connection error must not take down `POST /api/metrics` — the
    // store keeps serving checkouts even when Grafana is unreachable.
    console.error(
      "Grafana Cloud write error",
      error instanceof Error ? error.message : error,
    );
    return { pushed: false, retryable: true };
  }
}
