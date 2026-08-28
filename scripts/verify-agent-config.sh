#!/usr/bin/env bash
set -euo pipefail

AGENT_ID="${1:-production-incident-responder}"
API_URL="${TRUEFORGE_API_URL:-https://api.trueforge.dev}/api/v1/agents/${AGENT_ID}"

echo "Fetching agent config from ${API_URL}..."

response=$(curl -s "${API_URL}")

if [[ -z "${response}" ]]; then
  echo "ERROR: Empty response from API"
  exit 1
fi

echo "Agent config fetched successfully"

# Check posthog
echo ""
echo "=== PostHog MCP ==="
echo "${response}" | jq '.manifest.mcp_servers[] | select(.name=="posthog")'

# Check grafana
echo ""
echo "=== Grafana MCP ==="
echo "${response}" | jq '.manifest.mcp_servers[] | select(.name=="grafana")'

# Check github (optional - skip gracefully if not configured)
echo ""
echo "=== GitHub MCP (optional) ==="
github_entry=$(echo "${response}" | jq '.manifest.mcp_servers[] | select(.name=="github")')

if [[ -z "${github_entry}" || "${github_entry}" == "null" ]]; then
  echo "GitHub connector not configured (optional, skipping checks)"
  exit 0
fi

echo "${github_entry}"

# Verify require_approval_for_tools includes @write and @destructive
approval_tools=$(echo "${github_entry}" | jq -r '.require_approval_for_tools // [] | join(",")')

if [[ "${approval_tools}" != *"@write"* ]]; then
  echo "ERROR: github require_approval_for_tools missing @write"
  exit 1
fi

if [[ "${approval_tools}" != *"@destructive"* ]]; then
  echo "ERROR: github require_approval_for_tools missing @destructive"
  exit 1
fi

echo "✓ GitHub MCP config verified: require_approval_for_tools includes @write and @destructive"

# Verify enable_tools is read-only
enable_tools=$(echo "${github_entry}" | jq -r '.enable_tools // [] | join(",")')

if [[ "${enable_tools}" != *"@read-only"* ]]; then
  echo "WARNING: github enable_tools does not include @read-only (got: ${enable_tools})"
fi

echo "✓ All GitHub MCP checks passed"