#!/usr/bin/env bash
# Publish the MMG Labs packages to npm (makes `npx humanity-check` and
# `npx synergy-ipsum` work). Run once:  bash ~/AI-Business/publish-npm.sh
# Delete this file afterwards.
set -euo pipefail
export PATH="$HOME/.local/node/bin:$PATH"
npm whoami >/dev/null 2>&1 || npm login
for pkg in humanity-check synergy-ipsum; do
  dir="$HOME/AI-Business/machine-made-god/lab/$pkg"
  version=$(node -p "require('$dir/package.json').version")
  if [ "$(npm view "$pkg" version 2>/dev/null || true)" = "$version" ]; then
    echo "$pkg@$version is already on npm"
  else
    (cd "$dir" && npm publish --access public) && echo "published $pkg@$version"
  fi
done
