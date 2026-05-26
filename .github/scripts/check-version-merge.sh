#!/bin/bash
set -euo pipefail

msg=$(git log -1 --pretty=%B)

shopt -s nullglob
change_files=(change/*.json)
no_changes=false
[ ${#change_files[@]} -eq 0 ] && no_changes=true

if [[ "$msg" == "chore: version packages"* ]] && [ "$no_changes" = true ]; then
  echo "ready=true" >> "$GITHUB_OUTPUT"
else
  echo "ready=false" >> "$GITHUB_OUTPUT"
fi
