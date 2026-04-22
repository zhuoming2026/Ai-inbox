#!/usr/bin/env bash

set -euo pipefail

API_BASE="${HERMES_API_BASE:-http://127.0.0.1:8642/v1/chat/completions}"
API_KEY="${HERMES_API_KEY:-change-me-local-dev}"
MODEL="${HERMES_MODEL:-hermes-agent}"
RAW_OUTPUT="${HERMES_RAW_OUTPUT:-0}"

usage() {
  cat <<'EOF'
Usage:
  ./scripts/hermes-chat.sh "your prompt"
  echo "your prompt" | ./scripts/hermes-chat.sh

Environment:
  HERMES_API_BASE    Default: http://127.0.0.1:8642/v1/chat/completions
  HERMES_API_KEY     Default: change-me-local-dev
  HERMES_MODEL       Default: hermes-agent
  HERMES_RAW_OUTPUT  Set to 1 to print raw JSON instead of assistant text
EOF
}

if [[ "${1:-}" == "--help" || "${1:-}" == "-h" ]]; then
  usage
  exit 0
fi

if [[ $# -gt 0 ]]; then
  PROMPT="$*"
else
  if [[ -t 0 ]]; then
    usage
    exit 1
  fi
  PROMPT="$(cat)"
fi

if [[ -z "${PROMPT}" ]]; then
  echo "Prompt is empty." >&2
  exit 1
fi

REQUEST_BODY="$(MODEL="${MODEL}" PROMPT="${PROMPT}" node -e '
const payload = {
  model: process.env.MODEL,
  messages: [{ role: "user", content: process.env.PROMPT }],
}
process.stdout.write(JSON.stringify(payload))
' )"

RESPONSE="$(curl --silent --show-error --fail \
  "${API_BASE}" \
  -H "Authorization: Bearer ${API_KEY}" \
  -H "Content-Type: application/json" \
  -d "${REQUEST_BODY}")"

if [[ "${RAW_OUTPUT}" == "1" ]]; then
  printf '%s\n' "${RESPONSE}"
  exit 0
fi

RESPONSE_JSON="${RESPONSE}" node -e '
const response = JSON.parse(process.env.RESPONSE_JSON || "{}")
const content = response?.choices?.[0]?.message?.content
if (typeof content !== "string" || !content.trim()) {
  console.error("Hermes response did not include assistant content.")
  process.exit(1)
}
process.stdout.write(content.trimEnd() + "\n")
'
