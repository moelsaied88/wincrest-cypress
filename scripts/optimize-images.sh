#!/usr/bin/env bash
# Produces the two sizes the page needs from each downloaded original, using
# macOS's built-in sips so the toolchain stays dependency-free.
set -euo pipefail

cd "$(dirname "$0")/.."

SRC="src/originals"
OUT="src/images"

if [ ! -d "$SRC" ]; then
  echo "  no originals to optimize — run scripts/fetch-images.js first"
  exit 0
fi

mkdir -p "$OUT"
rm -f "$OUT"/*.jpg

count=0
shopt -s nullglob
for file in "$SRC"/*; do
  name="$(basename "$file")"
  base="${name%.*}"

  sips -s format jpeg -s formatOptions 78 -Z 1600 "$file" --out "$OUT/${base}-hero.jpg" >/dev/null 2>&1
  sips -s format jpeg -s formatOptions 72 -Z 480  "$file" --out "$OUT/${base}-thumb.jpg" >/dev/null 2>&1

  hero_kb=$(( $(stat -f%z "$OUT/${base}-hero.jpg") / 1024 ))
  printf '  %-34s %4s KB\n' "$base" "$hero_kb"
  count=$((count + 1))
done

echo ""
echo "  $count images optimized into $OUT"
