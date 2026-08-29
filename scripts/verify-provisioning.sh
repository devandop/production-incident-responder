```bash
#!/usr/bin/env bash

set -euo pipefail

echo "=== Provisioning Verification ==="
echo

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

PASS_COUNT=0
FAIL_COUNT=0

check_pass() {
  echo -e "${GREEN}✓ PASS${NC}: $1"
  ((++PASS_COUNT))
}

check_fail() {
  echo -e "${RED}✗ FAIL${NC}: $1"
  ((++FAIL_COUNT))
}

check_warn() {
  echo -e "${YELLOW}⚠ WARN${NC}: $1"
}

# 1. Check .env.local exists
ENV_FILE="apps/store/.env.local"

if [[ -f "$ENV_FILE" ]]; then
  check_pass "$ENV_FILE exists"
else
  check_fail "$ENV_FILE not found — copy from .env.example and fill in values"
  exit 1
fi

# 2. Check required vars are set (non-empty)
REQUIRED_VARS=(
  "NEXT_PUBLIC_POSTHOG_KEY"
  "NEXT_PUBLIC_POSTHOG_HOST"
  "GRAFANA_CLOUD_INFLUX_URL"
  "GRAFANA_CLOUD_INFLUX_TOKEN"
)

for var in "${REQUIRED_VARS[@]}"; do
  # Use grep to check if var is set and non-empty (not commented out)
  if grep -qE "^${var}=.+" "$ENV_FILE"; then
    # Get value without printing it
    value=$(grep -E "^${var}=" "$ENV_FILE" | cut -d'=' -f2-)

    if [[ -n "$value" &&
          "$value" != "phc_your_project_api_key" &&
          "$value" != "123456:glc_your_token" &&
          "$value" != "https://prometheus-prod-XX-....grafana.net/api/v1/push/influx/write" ]]; then
      check_pass "$var is set (non-empty, not placeholder)"
    else
      check_fail "$var appears to be a placeholder or empty"
    fi
  else
    check_fail "$var is missing or empty in $ENV_FILE"
  fi
done

# 3. Validate key prefixes and formats

# grep may return exit code 1 when the variable is missing.
# || true prevents set -e from terminating the verifier.
POSTHOG_KEY=$(grep -E "^NEXT_PUBLIC_POSTHOG_KEY=" "$ENV_FILE" | cut -d'=' -f2- || true)

# Only validate the prefix when the variable was found.
if [[ -n "$POSTHOG_KEY" ]]; then
  if [[ "$POSTHOG_KEY" == phc_* ]]; then
    check_pass "NEXT_PUBLIC_POSTHOG_KEY uses phc_ prefix (project API key)"

  elif [[ "$POSTHOG_KEY" == phx_* ]]; then
    check_fail "NEXT_PUBLIC_POSTHOG_KEY uses phx_ prefix — this is a PERSONAL key, must use phc_ PROJECT key"

  else
    check_warn "NEXT_PUBLIC_POSTHOG_KEY doesn't match expected phc_ prefix"
  fi
fi

# grep may return exit code 1 when the variable is missing.
GRAFANA_TOKEN=$(grep -E "^GRAFANA_CLOUD_INFLUX_TOKEN=" "$ENV_FILE" | cut -d'=' -f2- || true)

# Only validate the format when the variable was found.
if [[ -n "$GRAFANA_TOKEN" ]]; then
  if [[ "$GRAFANA_TOKEN" == *:* ]]; then
    check_pass "GRAFANA_CLOUD_INFLUX_TOKEN format looks correct (instance_id:token)"
  else
    check_warn "GRAFANA_CLOUD_INFLUX_TOKEN should be 'instance_id:metrics_write_token'"
  fi
fi

# grep may return exit code 1 when the variable is missing.
GRAFANA_URL=$(grep -E "^GRAFANA_CLOUD_INFLUX_URL=" "$ENV_FILE" | cut -d'=' -f2- || true)

# Only validate the URL when the variable was found.
if [[ -n "$GRAFANA_URL" ]]; then
  if [[ "$GRAFANA_URL" == */api/v1/push/influx/write ]]; then
    check_pass "GRAFANA_CLOUD_INFLUX_URL uses Influx path /api/v1/push/influx/write"

  elif [[ "$GRAFANA_URL" == */api/prom/push ]]; then
    check_fail "GRAFANA_CLOUD_INFLUX_URL uses old Prometheus path /api/prom/push — must use /api/v1/push/influx/write"

  else
    check_warn "GRAFANA_CLOUD_INFLUX_URL path unrecognized"
  fi
fi

echo

echo "=== Runtime Checks (requires store running on localhost:3000) ==="
echo

# 4. Check /api/metrics endpoint
METRICS_URL="http://localhost:3000/api/metrics"

echo "Checking $METRICS_URL ..."

if curl -sf -o /dev/null -w "%{http_code}" "$METRICS_URL" | grep -q "^200$"; then
  check_pass "GET /api/metrics returns 200"

  # Check metrics content
  METRICS_BODY=$(curl -s "$METRICS_URL")

  if echo "$METRICS_BODY" | grep -q "checkout_error_ratio"; then
    check_pass "/api/metrics includes checkout_error_ratio metric"
  else
    check_warn "/api/metrics missing checkout_error_ratio (may be no checkouts yet)"
  fi

else
  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$METRICS_URL" || echo "000")
  check_fail "GET /api/metrics returned HTTP $HTTP_CODE (is the store running on localhost:3000?)"
fi

echo

echo "=== Summary ==="

echo -e "${GREEN}Passed: $PASS_COUNT${NC}"
echo -e "${RED}Failed: $FAIL_COUNT${NC}"

if [[ $FAIL_COUNT -gt 0 ]]; then
  echo
  echo "Some checks failed. Fix the issues above and re-run."
  exit 1
else
  echo
  echo "All checks passed!"
  exit 0
fi
```
