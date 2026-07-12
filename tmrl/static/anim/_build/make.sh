#!/usr/bin/env bash
# Rebuild static/anim/tmrl_learns.mp4 from frame.html
# Usage:  cd static/anim/_build && ./make.sh
set -euo pipefail
cd "$(dirname "$0")"
REPO_ROOT="$(cd ../../.. && pwd)"
PORT=8765

[ -d node_modules ] || npm install

# serve the repo so frame.html can reach ../figures/shrimp_frames/*
python3 -m http.server "$PORT" --bind 127.0.0.1 --directory "$REPO_ROOT" >/dev/null 2>&1 &
SERVER_PID=$!
trap 'kill $SERVER_PID 2>/dev/null || true' EXIT
sleep 1

node render.js   # -> ../frames/*.png

ffmpeg -y -hide_banner -loglevel error \
  -framerate 30 -i ../frames/%04d.png \
  -c:v libx264 -pix_fmt yuv420p -crf 17 -preset slow -movflags +faststart \
  ../tmrl_learns.mp4

echo "built: static/anim/tmrl_learns.mp4"
ffprobe -v error -show_entries format=duration:stream=width,height -of default=noprint_wrappers=1 ../tmrl_learns.mp4
