#!/usr/bin/env bash
# Render static/anim/frame_concrete.html -> static/anim/frame_concrete.mp4 (1920x1080, 30fps).
# Frames are inlined in frame_concrete.html, so no local web server is needed.
# Usage:  cd static/anim/_build && ./make_concrete.sh [W] [H]
set -euo pipefail
cd "$(dirname "$0")"
W="${1:-1920}"; H="${2:-1080}"

[ -d node_modules ] || npm install puppeteer-core

node capture_concrete.js "$W" "$H"

ffmpeg -y -hide_banner -loglevel error \
  -framerate 30 -i ../frames_concrete/%04d.png \
  -c:v libx264 -pix_fmt yuv420p -crf 17 -preset slow -movflags +faststart \
  ../frame_concrete.mp4

echo "built: static/anim/frame_concrete.mp4"
ffprobe -v error -show_entries format=duration:stream=width,height -of default=noprint_wrappers=1 ../frame_concrete.mp4
