# Production Incident Responder

**Track:** Best Use of TrueForge  
**Theme:** SRE / DevOps agent with real MCP tools, sandbox execution, human approval, and persistent sessions

## 1. Project overview

Production Incident Responder is an AI agent that acts as a junior SRE. When a production alert fires (or a human asks it to investigate), the agent:

1. Queries live metrics and logs (Grafana Cloud / Prometheus)
2. Queries user-facing impact and application errors (PostHog)
3. Runs debug / bisect scripts inside the TrueForge sandbox
4. Forms a root-cause hypothesis
5. Proposes a concrete remediation (disable feature flag)
6. Pauses and waits for human approval
7. Executes the action only after approval
8. Keeps a full session log that survives reconnects

The agent can spawn subagents to investigate metrics vs errors in parallel.

Sandbox bisect uses live Grafana/PostHog time series, not a fake commit list.
GitHub MCP (recent commits / PRs) is optional and can be attached later without
changing the demo app.

## 2. Problem

On-call engineers jump between Grafana, error trackers, and feature flags. Detection tools do not close the loop. This project uses TrueForge so the agent can reach real systems through MCP, investigate safely, run code in an isolated sandbox, and require human approval before anything irreversible.

## 3. Success criteria

- Agent runs on TrueForge
- Uses PostHog + Grafana Cloud via MCP
- Investigation uses real tool calls
- Sandbox used for at least one debug/bisect step
- Human approval before any write/action
- Session state persists across reconnects
- README (and later a demo video) showing the full loop

## 4. Demo application

Minimal e-commerce / checkout app in `apps/store`:

- Home / product list, product detail, cart, checkout, success / failure
- Client-side cart (`localStorage`)
- PostHog events, exception capture, session replay, fake identify
- Feature flag `new-checkout-v2` plus local Chaos Mode
- Checkout metrics pushed optionally to Grafana Cloud

## 5. Agent

TrueForge agent definition:

- `agent/instructions.md` — short role prompt
- `agent/SKILL.md` — SRE playbook
- `agent/manifest.json` — model, MCP, sandbox, subagents, write-tool approval
- `agent/fixtures/` — live time-series bisect helper (`bisect_checkout.py`)

Connectors:

- PostHog: `https://mcp.posthog.com/mcp?features=error_tracking,flags,replay,sql`
- Grafana: `https://mcp.grafana.com/mcp`

Default remediation: disable `new-checkout-v2` after approval.

## 6. Demo script

```
User: Investigate the payment failures that started ~15 minutes ago.
```

Agent queries PostHog + Grafana, counts events and finds the error-rate inflection
from live samples in the sandbox, proposes disabling the flag when implicated,
waits for approval, executes, confirms recovery.

## 7. Risks

| Risk | Mitigation |
|------|------------|
| Grafana series empty | Chaos Mode still produces PostHog errors; document remote write |
| PostHog tool catalog is large | Restrict MCP URL with `features=` and `preload: false` |
| Approval skipped | Manifest lists `update-feature-flag` plus `@write` / `@destructive` |
| Demo breaks live | README + this plan + recorded video |

Full setup is in the root [README](../README.md).

