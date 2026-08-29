# Agent Setup Guide

> **Note:** This file is new on branch `feat/github-mcp-readonly`. The PR that creates it has not merged to `main` yet — expect a merge conflict when both PRs land.

## Connect GitHub via OAuth (Optional)

The GitHub MCP connector is **optional** and strictly **read-only**. It allows the agent to reference recent commits as corroborating evidence during incident investigation.

### Steps to Connect

1. Open the **TrueForge UI** → **Connector Catalog**
2. Find **GitHub** in the catalog
3. Click **Connect** and complete the OAuth flow (authorize the TrueForge app)
4. Once authorized, the connector will appear in your available MCP servers

### Verify Connection

After connecting, verify the github entry appears in the agent config with the correct read-only guards:

```bash
curl -s "http://localhost:8790/api/v1/agents/{agent_id}" | jq '.manifest.mcp_servers[] | select(.name=="github")'
```

Expected output:
```json
{
  "name": "github",
  "enable_tools": ["@read-only"],
  "require_approval_for_tools": ["@write", "@destructive"],
  "preload": false
}
```

**Key checks:**
- `enable_tools` includes only `@read-only` (no write tools enabled)
- `require_approval_for_tools` includes both `@write` and `@destructive`
- `preload` is `false`

If the github entry is missing or has different values, re-check the connector catalog connection.