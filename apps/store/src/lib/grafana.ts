/**
 * Grafana Cloud Prometheus accepts Influx line protocol at the /api/v1/push/influx/write
 * endpoint. This avoids snappy+protobuf remote_write in the demo app.
 */
export async function pushInfluxLines(lines: string[]) {
  const url = process.env.GRAFANA_CLOUD_INFLUX_URL;
  const token = process.env.GRAFANA_CLOUD_INFLUX_TOKEN;
  if (!url || !token || lines.length === 0) return { pushed: false as const };

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "text/plain",
    },
    body: lines.join("\n"),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error("Grafana Cloud write failed", res.status, text);
    return { pushed: false as const, status: res.status };
  }

  return { pushed: true as const };
}
