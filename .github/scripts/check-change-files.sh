#!/bin/bash
set -euo pipefail

shopt -s nullglob
files=(change/*.json)

if [ ${#files[@]} -gt 0 ]; then
  echo "has=true" >> "$GITHUB_OUTPUT"
else
  echo "has=false" >> "$GITHUB_OUTPUT"
fi
