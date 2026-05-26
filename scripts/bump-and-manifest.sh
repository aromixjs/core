#!/bin/bash
set -euo pipefail

npx beachball bump --yes

# Build manifest of bumped packages by checking which package.json had version changes
echo '{"packages":[]}' > .bumped.json

for pkg_json in packages/*/package.json; do
  if git diff HEAD -- "$pkg_json" | grep -q '"version"'; then
    name=$(jq -r '.name' "$pkg_json")
    version=$(jq -r '.version' "$pkg_json")
    jq --arg n "$name" --arg v "$version" '.packages += [{"name":$n,"version":$v}]' .bumped.json > /tmp/bumped.json
    mv /tmp/bumped.json .bumped.json
  fi
done
