#!/bin/sh
# build/icon.svg ve resources/tray/tray.svg'den PNG simgeleri üretir (Electron ile çizilir).
set -eu
cd "$(dirname "$0")/.."
E=./node_modules/.bin/electron
OUT="$(mktemp -d)"
$E dev/render-svg.cjs build/icon.svg "$OUT/icon" 1024,512,256,128,96,64,48,32,24,16 --ozone-platform=x11 >/dev/null 2>&1
cp "$OUT/icon-1024.png" build/icon.png
for s in 512 256 128 96 64 48 32 24 16; do cp "$OUT/icon-$s.png" "build/icons/${s}x${s}.png"; done
$E dev/render-svg.cjs resources/tray/tray.svg "$OUT/tray" 22,44 --ozone-platform=x11 >/dev/null 2>&1
cp "$OUT/tray-22.png" resources/tray/tray.png
cp "$OUT/tray-44.png" resources/tray/tray@2x.png
rm -rf "$OUT"
echo "simgeler üretildi"
