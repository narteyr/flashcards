#!/bin/sh
#
# Usage:
#   ./scripts/set_claude_key.sh <your_api_key>
#
# Exports the Anthropic Claude API key for the current shell session.
# Add `export ANTHROPIC_API_KEY=...` to your shell profile for persistence.

if [ -z "$1" ]; then
  echo "Usage: $0 <your_api_key>" >&2
  exit 1
fi

export ANTHROPIC_API_KEY="$1"
echo "ANTHROPIC_API_KEY set for this session."

