#!/usr/bin/env bash
# Builds Kira firmware from a saved layout JSON.
# Usage: tools/build-firmware.sh <layout.json> <default-layout.json> <outdir>
set -euo pipefail

if [ "$#" -ne 3 ]; then
  echo "usage: $0 <layout.json> <default-layout.json> <outdir>" >&2
  exit 2
fi

TOOLS="$(cd "$(dirname "$0")" && pwd)"
mkdir -p "$3"

layers=()
while IFS= read -r file; do
  layers+=("${file%.kll}")
done < <(node --no-warnings "$TOOLS/gen-kll.ts" "$1" "$2" "$3")

"$TOOLS/compile-firmware.sh" "$3" "${layers[@]}"
