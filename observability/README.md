# Grafana Cloud metrics

The demo store keeps in-process counters and exposes Prometheus text at
`GET /api/metrics`. Each checkout also `POST`s `{ ok, latencyMs }` to that
route. When Grafana Cloud env vars are set, the same samples are pushed with
Influx line protocol (no public scrape of localhost).

## Metrics

| Name | Type | Meaning |
|------|------|---------|
| `checkout_requests_total` | counter | Checkout attempts |
| `checkout_errors_total` | counter | Failed attempts |
| `checkout_error_ratio` | gauge | errors / requests in this process |
| `checkout_latency_seconds` | gauge | Average latency in this process |

Label `status=success|error` is included on remote-write request samples.

## Grafana Cloud setup

The portal no longer labels this **Hosted Prometheus → Send metrics**. You do
not need Grafana Alloy, Kubernetes monitoring, or the OTLP gateway URL
(`otlp-gateway-…/otlp/v1/metrics`). That path is a different protocol.

1. Create a Grafana Cloud stack (free tier is enough).
2. If asked how to send data: **fully managed Prometheus** → **custom
   endpoints** → **Send metrics over HTTP** → **Prometheus** (not Graphite).
   Skip Alloy install.
3. In the **Grafana Cloud Portal** ([grafana.com](https://grafana.com)), open
   your stack → **Prometheus** → **Details**. Copy the **Remote Write
   Endpoint** (`https://prometheus-….grafana.net/api/prom/push`) and the
   **Username** (Prometheus instance ID).
4. Create a Cloud Access Policy token with **`metrics:write`**. Tokens from
   the OTLP HTTP wizard often work on OTLP and **401** on Prometheus writes.
5. In `apps/store/.env.local`:

   ```
   GRAFANA_CLOUD_INFLUX_URL=https://prometheus-prod-XX-....grafana.net/api/v1/push/influx/write
   GRAFANA_CLOUD_INFLUX_TOKEN=<prometheus_instance_id>:<token>
   ```

   Build the URL from the remote-write host by replacing `/api/prom/push`
   with `/api/v1/push/influx/write`.

   If writes return **401**, the username is usually wrong (OTLP/stack id vs
   Prometheus instance id) or the token lacks `metrics:write`.

6. Confirm with curl (**204** = success), then run a few checkouts (Demo
   Timeouts on and off).
7. In the stack UI (`https://<stack>.grafana.net`) open **Explore**, pick the
   Cloud Prometheus datasource, query `checkout_error_ratio`.
8. Import [`dashboard.json`](dashboard.json) (**Dashboards → Import**). Pick
   that Prometheus datasource when prompted.

## TrueForge MCP

Add connector **grafana**:

- URL: `https://mcp.grafana.com/mcp`
- Auth: OAuth (in-chat Connect)
- Header if required: `X-Grafana-URL` = `https://<stack>.grafana.net`

Keep `preload: false`. Investigation is read-only; writes still require
approval via `@write` / `@destructive`.

## Local scrape (optional)

Point Prometheus at `http://localhost:3000/api/metrics`. Series reset when the
Next.js process restarts.
