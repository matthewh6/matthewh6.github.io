/* ───────────────────────────────────────────────────────────────
   render.js — drive static/anim/frame.html across a timeline and
   screenshot each frame to _build/../frames/NNNN.png

   The shrimp rollout has N=10 action chunks. We hold briefly on the
   first chunk, ease the cursor chunk-to-chunk (so each (frame, sigma)
   pair is readable), then hold on a summary outro card.
   ─────────────────────────────────────────────────────────────── */
const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer-core');

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const BASE = 'http://127.0.0.1:8765/static/anim/frame.html';
const FRAMES_DIR = path.join(__dirname, '..', 'frames');

const N = 10;            // action chunks
const FPS = 30;
const INTRO_F = 18;      // hold on chunk 1            (0.60 s)
const RAMP_F = 23;       // ease between two chunks    (0.77 s)
const HOLD_F = 14;       // settle on a chunk          (0.47 s)
const OUTRO_F = 48;      // hold on the final chunk    (1.60 s)

function easeInOutCubic(x) {
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
}

/* flat timeline of t values — one entry per output frame */
function buildTimeline() {
  const tl = [];
  for (let i = 0; i < INTRO_F; i++) tl.push(0);
  for (let c = 0; c < N - 1; c++) {
    for (let j = 1; j <= RAMP_F; j++) tl.push(c + easeInOutCubic(j / RAMP_F));
    if (c < N - 2) for (let j = 0; j < HOLD_F; j++) tl.push(c + 1);
  }
  for (let i = 0; i < OUTRO_F; i++) tl.push(N - 1);
  return tl;
}

(async () => {
  fs.rmSync(FRAMES_DIR, { recursive: true, force: true });
  fs.mkdirSync(FRAMES_DIR, { recursive: true });

  const timeline = buildTimeline();
  console.log(`timeline: ${timeline.length} frames (${(timeline.length / FPS).toFixed(2)} s @ ${FPS}fps)`);

  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: true,
    args: ['--no-sandbox', '--force-device-scale-factor=1', '--hide-scrollbars'],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 720, deviceScaleFactor: 1 });

  const t0 = Date.now();
  for (let i = 0; i < timeline.length; i++) {
    const t = timeline[i];
    await page.goto(`${BASE}?t=${t.toFixed(4)}`, { waitUntil: 'load' });
    await page.waitForSelector('body[data-ready="1"]', { timeout: 10000 });
    await page.screenshot({ path: path.join(FRAMES_DIR, String(i).padStart(4, '0') + '.png') });
    if (i % 30 === 0 || i === timeline.length - 1) {
      const pct = (((i + 1) / timeline.length) * 100).toFixed(0);
      console.log(`  ${String(i + 1).padStart(4)}/${timeline.length}  ${pct}%  (t=${t.toFixed(2)})`);
    }
  }
  await browser.close();
  console.log(`done in ${((Date.now() - t0) / 1000).toFixed(1)}s -> ${FRAMES_DIR}`);
})();
