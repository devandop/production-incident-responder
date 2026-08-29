# Provisioning Guide

This document describes how to configure the PostHog and Grafana Cloud credentials for the store app.

---

## 1. PostHog Setup

### Create a PostHog Project
1. Go to [PostHog](https://app.posthog.com/) and create a new project (or use an existing one).
2. Note the **Project API key** — it starts with `phc_`. This is the **public key** that goes in the store's env.
3. Go to **Project Settings → API Keys** and copy the `phc_` key.

### Create a Personal API Key (for TrueForge MCP connector only)
1. In PostHog, go to **User Settings → Personal API Keys**.
2. Create a new key named `trueforge-mcp`.
3. Grant these scopes:
   - `feature-flags-write`
   - `error-tracking-read`
   - `query-read`
   - `replay-read`
4. Copy the key — it starts with `phx_`.

### Where each key goes

| Key type | Prefix | Goes in |
|----------|--------|---------|
| Project API key | `phc_` | `apps/store/.env.local` → `NEXT_PUBLIC_POSTHOG_KEY` |
| Personal API key | `phx_` | **Only** in the TrueForge MCP connector config (outside this repo) |

**⚠️ CRITICAL:** The `phx_` personal key must **NEVER** be placed in `apps/store/.env.local` or any store environment file. It is only for the TrueForge MCP connector configuration.

### Store env vars (apps/store/.env.local)
```bash
NEXT_PUBLIC_POSTHOG_KEY=phc_your_project_api_key_here
NEXT_PUBLIC_POSTHOG_HOST=https://eu.i.posthog.com  # or your region endpoint
```

### Create the feature flag
1. In PostHog, go to **Feature Flags → New feature flag**.
2. Key: `new-checkout-v2`
3. Type: **Boolean**
4. Default value: **OFF** (false)
5. Save.

This flag is used by the incident demo to toggle the new checkout behavior.

---

## 2. Grafana Cloud Setup

### Create a Grafana Cloud Stack (or use existing)
1. Go to [Grafana Cloud](https://grafana.com/auth/sign-up/create-user) and create a stack with **Prometheus** enabled.
2. Note the **stack slug** (e.g., `my-stack`).

### Get Prometheus Details
1. In Grafana Cloud, go to **Connections → Data sources → Prometheus → Details**.
2. Copy the **Remote Write Endpoint** — it looks like:
   ```
   https://prometheus-prod-XX-...grafana.net/api/prom/push
   ```
3. Copy the **Prometheus Instance ID** (numeric, e.g., `123456`) — this is the **username**, NOT the stack ID.
4. Go to **Access Policies** and create (or use existing) a policy with **Metrics: Write** scope.
5. Generate a token for that policy — it looks like `glc_xxxxxxxxxxxx`.

### Transform Remote Write URL → Influx Write URL
The remote write URL uses path `/api/prom/push`. Change the path to `/api/v1/push/influx/write`:

| Original (remote write) | Influx write (use this) |
|-------------------------|-------------------------|
| `https://prometheus-prod-XX-...grafana.net/api/prom/push` | `https://prometheus-prod-XX-...grafana.net/api/v1/push/influx/write` |

**Only the path changes. The host stays the same.**

### Build the token string
The token for Influx line protocol is:
```
<prometheus_instance_id>:<metrics_write_token>
```
Example:
```
123456:glc_abcdef123456
```

### Store env vars (apps/store/.env.local)
```bash
GRAFANA_CLOUD_INFLUX_URL=https://prometheus-prod-XX-...grafana.net/api/v1/push/influx/write
GRAFANA_CLOUD_INFLUX_TOKEN=123456:glc_your_metrics_write_token
```

---

## 3. Verify Influx Endpoint Accepts Writes

Run this curl command (replace with your actual URL and token):

```bash
curl -X POST "https://prometheus-prod-XX-...grafana.net/api/v1/push/influx/write" \
  -H "Authorization: Bearer 123456:glc_your_metrics_write_token" \
  -H "Content-Type: text/plain" \
  -d 'checkout_requests_total value=1 1700000000000000000'
```

**Expected response:** HTTP **204 No Content** (empty body).

If you get 401, check:
- Token format is `instance_id:token` (not just the token)
- Access policy has `metrics:write` scope
- Using the Influx path `/api/v1/push/influx/write`, not `/api/prom/push`

---

## 4. Complete apps/store/.env.local Template

Copy this template and fill in your values:

```bash
# PostHog (project API key only — phc_ prefix)
NEXT_PUBLIC_POSTHOG_KEY=phc_xxxxxxxxxxxxxxxx
NEXT_PUBLIC_POSTHOG_HOST=https://eu.i.posthog.com

# Grafana Cloud Influx line protocol
GRAFANA_CLOUD_INFLUX_URL=https://prometheus-prod-XX-...grafana.net/api/v1/push/influx/write
GRAFANA_CLOUD_INFLUX_TOKEN=123456:glc_xxxxxxxxxxxxxxxx
```

---

## 5. Quick Verification Checklist

After filling in `.env.local` and starting the store (`npm run dev` in `apps/store`):

- [ ] Visit `http://localhost:3000` — page loads
- [ ] Open PostHog → Events → verify `pageview`, `checkout_started`, `purchase_completed/payment_failed` appear
- [ ] Open PostHog → Exceptions → trigger an error (e.g., simulate payment failure) → verify it appears
- [ ] Open PostHog → Session Replay → verify recordings capture
- [ ] Run `scripts/verify-provisioning.sh` — all checks pass
- [ ] In Grafana Explore, query `checkout_error_ratio` → returns a value
- [ ] Import the demo dashboard (if provided) → panels show data

---

## 6. What NOT to Commit

- `apps/store/.env.local` — contains secrets, gitignored
- `apps/console/.env.local` — contains secrets, gitignored
- Any `phx_` personal API keys — never in this repo
