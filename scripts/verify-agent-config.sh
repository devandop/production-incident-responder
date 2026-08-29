#!/usr/bin/env bash
set -euo pipefail

AGENT_ID="${1:-production-incident-responder}"
API_URL="${TRUEFORGE_API_URL:-http://localhost:8790}/api/v1/agents/${AGENT_ID}"

FAILED=0

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
posthog_entry=$(echo "${response}" | jq '.manifest.mcp_servers[] | select(.name=="posthog")')
if [[ -z "${posthog_entry}" || "${posthog_entry}" == "null" ]]; then
  echo "FAIL: PostHog MCP server not found"
  FAILED=1
else
  echo "${posthog_entry}"
  # Verify require_approval_for_tools includes @write and @destructive
  if ! echo "${posthog_entry}" | jq -e '.require_approval_for_tools | index("@write")' >/dev/null; then
    echo "FAIL: posthog require_approval_for_tools missing @write"
    FAILED=1
  fi
  if ! echo "${posthog_entry}" | jq -e '.require_approval_for_tools | index("@destructive")' >/dev/null; then
    echo "FAIL: posthog require_approval_for_tools missing @destructive"
    FAILED=1
  fi
fi

# Check grafana
echo ""
echo "=== Grafana MCP ==="
grafana_entry=$(echo "${response}" | jq '.manifest.mcp_servers[] | select(.name=="grafana")')
if [[ -z "${grafana_entry}" || "${grafana_entry}" == "null" ]]; then
  echo "FAIL: Grafana MCP server not found"
  FAILED=1
else
  echo "${grafana_entry}"
  # Verify require_approval_for_tools includes @write and @destructive
  if ! echo "${grafana_entry}" | jq -e '.require_approval_for_tools | index("@write")' >/dev/null; then
    echo "FAIL: grafana require_approval_for_tools missing @write"
    FAILED=1
  fi
  if ! echo "${grafana_entry}" | jq -e '.require_approval_for_tools | index("@destructive")' >/dev/null; then
    echo "FAIL: grafana require_approval_for_tools missing @destructive"
    FAILED=1
  fi
fi

# Check sandbox
echo ""
echo "=== Sandbox ==="
sandbox_enabled=$(echo "${response}" | jq -r '.manifest.config.sandbox.enabled // false')
if [[ "${sandbox_enabled}" == "true" ]]; then
  echo "PASS: Sandbox is enabled"
else
  echo "FAIL: Sandbox is not enabled (got: ${sandbox_enabled})"
  FAILED=1
fi

# Check model
echo ""
echo "=== Model ==="
model_name=$(echo "${response}" | jq -r '.manifest.model.name // ""')
if [[ -n "${model_name}" ]]; then
  echo "PASS: Model name is set to: ${model_name}"
else
  echo "FAIL: Model name is empty"
  FAILED=1
fi

# Check github (optional - skip gracefully if not configured)
echo ""
echo "=== GitHub MCP (optional) ==="
github_entry=$(echo "${response}" | jq '.manifest.mcp_servers[] | select(.name=="github")')

if [[ -z "${github_entry}" || "${github_entry}" == "null" ]]; then
  echo "GitHub connector not configured (optional, skipping checks)"
else
  echo "${github_entry}"

  # BUG 2: Verify require_approval_for_tools has EXACT elements @write and @destructive
  if ! echo "${github_entry}" | jq -e '.require_approval_for_tools | index("@write")' >/dev/null; then
    echo "FAIL: github require_approval_for_tools missing @write"
    FAILED=1
  fi

  if ! echo "${github_entry}" | jq -e '.require_approval_for_tools | index("@destructive")' >/dev/null; then
    echo "FAIL: github require_approval_for_tools missing @destructive"
    FAILED=1
  fi

  # BUG 1: Verify enable_tools is EXACTLY ["@read-only"]
  enable_tools_json=$(echo "${github_entry}" | jq -c '.enable_tools // []')
  if [[ "${enable_tools_json}" != '["@read-only"]' ]]; then
    echo "FAIL: github enable_tools must be exactly [\"@read-only\"] (got: ${enable_tools_json})"
    FAILED=1
  fi

  # BUG 3: Verify preload is exactly false
  preload_val=$(echo "${github_entry}" | jq -r '.preload // true')
  if [[ "${preload_val}" != "false" ]]; then
    echo "FAIL: github preload must be false (got: ${preload_val})"
    FAILED=1
  fi
fi

echo ""
if [[ "${FAILED}" -eq 1 ]]; then
  echo "Some checks FAILED"
  exit 1
else
  echo "All checks passed"
  exit 0
fi