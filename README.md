# Production Incident Responder

An SRE agent on [TrueForge](https://trueforge.dev) that combines **PostHog** user impact with **Grafana Cloud** metrics, investigates in a **Daytona sandbox**, and only disables a feature flag after **human approval**.

Pitch: *An SRE agent that combines PostHog user impact with Grafana system metrics, investigates inside a sandbox, and only acts after human approval — built entirely on the TrueForge harness.*

## Architecture

```
TrueForge :8790 (agent loop, MCP, sandbox, approvals)
  ↑
Incident console :3001  (@truefoundry/trueforge-ui + sdk)
  └── custom chrome around their chat widgets

Forge Store :3000 → PostHog + optional Grafana write
```

TrueForge is **not** vendored here. Run it separately (`npx @truefoundry/trueforge`), then attach this repo’s skill and [`agent/manifest.json`](agent/manifest.json).

## Repository

| Path | Purpose |
|------|---------|
| [`apps/store`](apps/store) | Breakable checkout demo (`:3000`) |
| [`apps/console`](apps/console) | Custom chat UI + TrueForge SDK (`:3001`) |
| [`agent/SKILL.md`](agent/SKILL.md) | SRE playbook (import as a TrueForge skill) |
| [`agent/instructions.md`](agent/instructions.md) | Short system prompt |
| [`agent/manifest.json`](agent/manifest.json) | Saved-agent spec (API / copy-paste) |
| [`agent/fixtures`](agent/fixtures) | Python helper to find error-rate inflection on live Grafana/PostHog series |
| [`observability`](observability) | Grafana dashboard + remote-write notes |
| [`docs/PLAN.md`](docs/PLAN.md) | Hackathon narrative |

## Accounts you need

1. **LLM** — any provider TrueForge supports (Anthropic, OpenAI, …)
2. **PostHog** — project key (`phc_…`) for the store + personal key (`phx_…`) for MCP
3. **Grafana Cloud** — Prometheus write URL + metrics token (see below)
4. **Daytona** — API key for TrueForge sandbox (required for skills and Code Mode)
5. **TrueForge** — Node 22+, local mode is enough for the demo

`posthog-js` is already a store dependency. You do not install extra PostHog packages.

## Set up PostHog

The store uses **`phc_…`**. TrueForge MCP uses **`phx_…`**. Do not put `phx_` in `.env.local`.

1. Create a project at [posthog.com](https://posthog.com) (US or EU cloud).
2. Copy the **Project API key** (`phc_…`) from project settings.
3. In `apps/store/.env.local`:

   ```bash
   NEXT_PUBLIC_POSTHOG_KEY=phc_...
   NEXT_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com
   ```

   EU projects use `https://eu.i.posthog.com`.
4. In PostHog, enable **exception autocapture** and **session replay**.
5. Create a boolean feature flag whose key is exactly **`new-checkout-v2`**. Leave it off until you want the incident.
6. Create a **Personal API key** (`phx_…`): avatar → **Settings → Personal API keys**
   ([US](https://us.posthog.com/settings/user-api-keys) / [EU](https://eu.posthog.com/settings/user-api-keys)).
   Copy it once. Include **feature flags write** (and error tracking / query / replay read) so the agent can disable the flag after approval.
7. TrueForge **Connectors → posthog**: URL
   `https://mcp.posthog.com/mcp?features=error_tracking,flags,replay,sql`
   Header: `Authorization: Bearer phx_…`. Keep **preload off**.

## Set up Grafana Cloud

The Cloud UI no longer says “Hosted Prometheus → Send metrics.” Skip Alloy / OTLP. This app POSTs **Influx line protocol**.

1. Create a Grafana Cloud stack (free tier is enough).
2. Onboarding: **fully managed Prometheus** → **custom endpoints** → **Send metrics over HTTP** → format **Prometheus**. You can skip installing Alloy.
3. Open [grafana.com](https://grafana.com) → your stack → **Prometheus → Details**. Copy:
   - **Remote Write Endpoint** (ends in `/api/prom/push`)
   - **Username** (Prometheus instance ID, a number — not the OTLP/stack id)
4. Create a **Cloud Access Policy** token with **`metrics:write`**. The OTLP wizard token often 401s on this endpoint.
5. In `apps/store/.env.local`, change only the path `/api/prom/push` → `/api/v1/push/influx/write`:

   ```bash
   GRAFANA_CLOUD_INFLUX_URL=https://prometheus-prod-XX-....grafana.net/api/v1/push/influx/write
   GRAFANA_CLOUD_INFLUX_TOKEN=<prometheus_username>:<metrics_write_token>
   ```

   Example: if remote write is `https://prometheus-prod-65-prod-eu-west-2.grafana.net/api/prom/push` and username is `3531088`, the Influx URL uses that same host plus `/api/v1/push/influx/write`, and the token is `3531088:glc_…`.
6. Test (expect **204**):

   ```bash
   curl -i -X POST \
     -u "USERNAME:TOKEN" \
     -H "Content-Type: text/plain" \
     "https://prometheus-prod-XX-....grafana.net/api/v1/push/influx/write" \
     --data-binary 'checkout_error_ratio value=0.1'
   ```

7. Restart the store, run a few checkouts. In `https://<stack>.grafana.net` open **Explore** (compass) → Grafana Cloud **Prometheus** datasource → query `checkout_error_ratio`.
8. **Dashboards → Import** [`observability/dashboard.json`](observability/dashboard.json). Pick that Prometheus datasource.
9. TrueForge **Connectors → grafana**: URL `https://mcp.grafana.com/mcp`, OAuth; header `X-Grafana-URL: https://<stack>.grafana.net` if asked. Preload **off**.

More detail: [`observability/README.md`](observability/README.md).

## 1. Run the store

```bash
cd apps/store
cp .env.example .env.local
# set PostHog + Grafana vars from the sections above
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Generate an incident:

1. Shop as Alice (header dropdown; also try Bob / Guest)
2. Add an item, open the cart drawer, go to checkout
3. In header **Demo**, choose **Timeouts** (local buggy path) **and/or** enable `new-checkout-v2` in PostHog at 100%. **Slow gateway** only raises Grafana latency.
4. Continue to payment and click **Pay** several times until you land on the failure page

You should see `TimeoutError` from `processPayment`, `payment_failed` events, identified users, and replays. `GET /api/metrics` shows in-process counters. With Grafana env vars set, series appear in Grafana Cloud.

## 2. Run TrueForge

Requires Node.js 22+:

```bash
npx @truefoundry/trueforge
```

Open [http://localhost:8790](http://localhost:8790).

### Settings

| Setting | What to configure |
|---------|-------------------|
| **Models** | Your provider API key |
| **Connectors → posthog** | URL `https://mcp.posthog.com/mcp?features=error_tracking,flags,replay,sql` Header `Authorization: Bearer phx_…` |
| **Connectors → grafana** | URL `https://mcp.grafana.com/mcp` OAuth; header `X-Grafana-URL: https://<stack>.grafana.net` if asked |
| **Skills** | Import from GitHub (this repo). Skill path: `agent/SKILL.md`, name `incident-responder` |
| **Sandbox** | Daytona API key; enable sandbox on the agent |

Keep **preload off** so PostHog’s catalog does not fill the context window.

### Save the agent

Create an agent named `production-incident-responder`:

- Instructions: copy [`agent/instructions.md`](agent/instructions.md)
- Connectors: `posthog`, `grafana`
- Skill: `incident-responder`
- Capabilities: sandbox **on**, dynamic sub-agents **on**, ask-user-questions on

Tool approval for writes is **API-only**. After saving in the UI, replace the spec with [`agent/manifest.json`](agent/manifest.json) via `PUT /api/v1/agents/{id}` (or create via `POST /api/v1/agents`) so `require_approval_for_tools` includes `update-feature-flag`. Default `@write` / `@destructive` should already pause PostHog flag updates; the explicit names make the demo checkpoint reliable.

Example:

```bash
curl -s http://localhost:8790/api/v1/agents \
  -H 'content-type: application/json' \
  -d @agent/manifest.json
```

Adjust `manifest.model.name` to a model you actually configured.

## 3. Demo script

In the store, generate failures (section 1). Open the [incident console](apps/console) at `http://localhost:3001` (or TrueForge’s own UI at `:8790`) and start a session with the saved agent:

> Investigate the payment failures that started ~15 minutes ago.

Expect:

1. PostHog issues / HogQL / flag `new-checkout-v2`
2. Grafana error ratio vs request count
3. Sandbox counts + error-rate inflection from live Grafana/PostHog samples
4. Proposal to disable `new-checkout-v2`
5. **Approve** in the TrueForge UI (do not skip this)
6. Agent re-checks PostHog + Grafana
7. Turn Chaos Mode off and/or confirm the flag is disabled, then checkout should succeed

## Session persistence / reconnects

TrueForge local mode stores sessions in SQLite. Leave the same chat open, or reopen the session from the UI. Events remain on the session (`GET /api/v1/sessions/{id}/events`). There is no extra store in this repo. Compaction may summarize old turns in the *working* context; the full event log is still persisted.

## Real inflection (no fake deploys)

The sandbox does **not** use canned commits. The agent writes a time series from
Grafana range queries and/or PostHog event buckets, then runs
[`agent/fixtures/bisect_checkout.py`](agent/fixtures/bisect_checkout.py) on that
file. You do not deploy the store for this.

Enabling `new-checkout-v2` in PostHog (or Demo → Timeouts) **is** the change.
Git is only relevant if you attach GitHub MCP.

## Optional: GitHub MCP

To also ask “did a store commit land in this window?”:

1. Connect GitHub from the TrueForge catalog (OAuth)
2. Add `{ "name": "github", "preload": false, "require_approval_for_tools": ["@write", "@destructive"] }` to `mcp_servers` in the manifest

The skill already treats GitHub as optional and read-only. Remediation can stay
“disable the flag” when the flag is implicated.

## Troubleshooting

| Symptom | Check |
|---------|--------|
| No PostHog events | Ad blocker, wrong `NEXT_PUBLIC_POSTHOG_KEY` / host, flag not created |
| `usePostHog` / no flag | Wait for flags to load; use Chaos Mode for a guaranteed buggy path |
| MCP 401 | Rotate PostHog personal API key (`phx_`); Bearer header |
| Grafana empty | Remote write URL/token; process-local `/api/metrics` still works |
| Skill not loading | Sandbox provider configured and sandbox enabled on the agent |
| Flag update did not pause | Apply `agent/manifest.json` so `update-feature-flag` requires approval |

## License

Demo code in this repository is for the TrueForge hackathon.
