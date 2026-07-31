#!/usr/bin/env bash
# Produces the two sizes the page needs from each downloaded original, using
# macOS's built-in sips so the toolchain stays dependency-free.
set -euo pipefail

cd "$(dirname "$0")/.."

SRC="src/originals"
OUT="src/images"

HERO_MAX=1200
THUMB_MAX=420
HERO_Q=48
THUMB_Q=55

if [ ! -d "$SRC" ]; then
  echo "  no originals to optimize — run scripts/fetch-images.js first"
  exit 0
fi

mkdir -p "$OUT"
rm -f "$OUT"/*.jpg

total=0
count=0

shopt -s nullglob
for file in "$SRC"/*; do
  name="$(basename "$file")"
  base="${name%.*}"

  w=$(sips -g pixelWidth  "$file" 2>/dev/null | awk '/pixelWidth/  {print $2}')
  h=$(sips -g pixelHeight "$file" 2>/dev/null | awk '/pixelHeight/ {print $2}')
  if [ -z "${w:-}" ] || [ -z "${h:-}" ]; then
    echo "  skip $base — could not read dimensions"
    continue
  fi

  # sips -Z enlarges as well as shrinks, so clamp to the original's long edge
  # to avoid upscaling a small source into a large, soft file.
  long=$(( w > h ? w : h ))
  hero_max=$(( long < HERO_MAX ? long : HERO_MAX ))
  thumb_max=$(( long < THUMB_MAX ? long : THUMB_MAX ))

  sips -s format jpeg -s formatOptions "$HERO_Q"  -Z "$hero_max"  "$file" --out "$OUT/${base}-hero.jpg"  >/dev/null 2>&1
  sips -s format jpeg -s formatOptions "$THUMB_Q" -Z "$thumb_max" "$file" --out "$OUT/${base}-thumb.jpg" >/dev/null 2>&1

  hero_kb=$(( $(stat -f%z "$OUT/${base}-hero.jpg") / 1024 ))
  thumb_kb=$(( $(stat -f%z "$OUT/${base}-thumb.jpg") / 1024 ))
  total=$(( total + hero_kb + thumb_kb ))
  count=$(( count + 1 ))

  printf '  %-30s %5s x %-5s  hero %4s KB   thumb %3s KB\n' "$base" "$w" "$h" "$hero_kb" "$thumb_kb"
done

echo ""
echo "  $count images, $total KB total"
