# Agent Setup Instructions

## 1. Add Daytona API Key in TrueForge UI

1. Open TrueForge UI at `http://localhost:8790`
2. Go to **Settings → Sandbox provider**
3. Select **Daytona** as the provider
4. Paste your Daytona API key
5. Save

## 2. Enable Sandbox on the Agent

The agent manifest already has sandbox enabled (`"sandbox": { "enabled": true, "file_downloads": true }`). After creating/updating the agent via API (step 3), verify in the UI:
- Open the agent details
- Confirm "Sandbox" shows as enabled with Daytona provider

## 3. Create/Update Agent via API

Run this exact curl command from the repo root:

```bash
curl -X PUT "http://localhost:8790/api/v1/agents/production-incident-responder" \
  -H "Content-Type: application/json" \
  -d @agent/manifest.json
```

**Note:** Uses PUT with the agent name as ID. If the agent doesn't exist, TrueForge will create it. If it exists, it will update.

## 4. Verify Agent Config Was Applied

Run this exact curl command:

```bash
curl -s "http://localhost:8790/api/v1/agents/production-incident-responder" | jq .
```

Check the response for:
- `"sandbox": {"enabled": true, "file_downloads": true, "provider": "daytona"}` (provider may appear after UI config)
- `"require_approval_for_tools": ["@write", "@destructive", "update-feature-flag"]` under the PostHog MCP server
- `"model": {"name": "<your-actual-model>", ...}` — not a placeholder

## 5. Update Model Name (Required)

The current manifest has `"name": "anthropic/claude-sonnet-4-6"` as a placeholder. **Before running step 3**, edit `agent/manifest.json` and replace it with your actual provider/model string (e.g., `anthropic/claude-3-5-sonnet-20241022`, `openai/gpt-4o`, etc.).

```bash
# Example - replace with your actual model
sed -i 's/"name": "anthropic\/claude-sonnet-4-6"/"name": "YOUR_PROVIDER\/YOUR_MODEL"/' agent/manifest.json
```

Then re-run step 3.

## 6. Run Verification Script

```bash
./scripts/verify-agent-config.sh production-incident-responder
```

Or with custom TrueForge URL:

```bash
./scripts/verify-agent-config.sh production-incident-responder http://localhost:8790
```