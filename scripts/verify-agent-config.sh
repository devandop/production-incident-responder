#!/usr/bin/env bash
set -euo pipefail

AGENT_ID="${1:-}"
BASE_URL="${2:-http://localhost:8790}"

if [[ -z "$AGENT_ID" ]]; then
  echo "Usage: $0 <agent-id> [base-url]"
  echo "  base-url defaults to http://localhost:8790"
  exit 1
fi

if ! command -v jq &> /dev/null; then
  echo "ERROR: jq is not installed."
  echo "Install it with: sudo apt-get install jq  (Debian/Ubuntu)"
  echo "             or: brew install jq  (macOS)"
  exit 1
fi

echo "Fetching agent config from ${BASE_URL}/api/v1/agents/${AGENT_ID}..."
RESPONSE=$(curl -s "${BASE_URL}/api/v1/agents/${AGENT_ID}")

if [[ -z "$RESPONSE" || "$RESPONSE" == "null" ]]; then
  echo "FAIL: Empty response - agent not found or API error"
  exit 1
fi

echo "$RESPONSE" | jq . > /tmp/agent_response.json

# Check 1: Sandbox enabled
SANDBOX_ENABLED=$(jq -r '.manifest.config.sandbox.enabled // false' /tmp/agent_response.json)
if [[ "$SANDBOX_ENABLED" == "true" ]]; then
  echo "PASS: Sandbox is enabled"
else
  echo "FAIL: Sandbox is not enabled (got: $SANDBOX_ENABLED)"
fi

# Check 2: update-feature-flag in require_approval_for_tools (PostHog MCP)
HAS_APPROVAL=$(jq -r '.manifest.mcp_servers[] | select(.name=="posthog") | .require_approval_for_tools[]? | select(.=="update-feature-flag")' /tmp/agent_response.json)
if [[ -n "$HAS_APPROVAL" ]]; then
  echo "PASS: update-feature-flag is in require_approval_for_tools (PostHog)"
else
  echo "FAIL: update-feature-flag NOT found in require_approval_for_tools (PostHog)"
fi

# Check 3: Model name is non-empty and not placeholder
MODEL_NAME=$(jq -r '.manifest.model.name // ""' /tmp/agent_response.json)
if [[ -n "$MODEL_NAME" && "$MODEL_NAME" != "anthropic/claude-sonnet-4-6" ]]; then
  echo "PASS: Model name is set to: $MODEL_NAME"
else
  echo "FAIL: Model name is empty or still placeholder (got: '$MODEL_NAME')"
fi

# Check 4: Sandbox provider is daytona (optional but recommended)
SANDBOX_PROVIDER=$(jq -r '.manifest.config.sandbox.provider // ""' /tmp/agent_response.json)
if [[ "$SANDBOX_PROVIDER" == "daytona" ]]; then
  echo "PASS: Sandbox provider is daytona"
else
  echo "WARN: Sandbox provider not set to daytona (got: '$SANDBOX_PROVIDER') - configure in TrueForge UI Settings → Sandbox provider"
fi

echo ""
echo "Full response saved to /tmp/agent_response.json"