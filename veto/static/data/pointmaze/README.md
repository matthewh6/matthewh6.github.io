# PointMaze ranking data export

This archive contains browser-ready ranking and trajectory data for the saved H32, seed-0 junction illustration.

## Contents

- `ranking.json`: maze grid and coordinate bounds, start and goal, 16 stable candidate IDs, raw 32-step actions and 33-point paths, oracle returns, and each method's saved prediction, complete rank order, and selected top four at every included measured budget.
- `junction32_background.svg`: clean vector maze background, with no method paths or text overlays.
- `preview.png`: six-panel rendering of the exported paths and saved rankings at 0 and 4,096 transitions, using canonical method labels.
- `animation_preview.mp4`: smooth 12 fps progression across measured training-example budgets. Candidate paths and maze stay fixed; selection emphasis eases between the measured top-four sets. Numeric labels show exact checkpoint budgets, and transition labels show the measured endpoints.
- `interactive_preview.html`: standalone browser preview with synchronized method panels, Play/Pause/Replay, and a slider that visits only measured budgets.
- `export.py`: deterministic rebuild script using the bundled saved source inputs.
- `make_preview.py`: rebuilds the animation and standalone preview from `ranking.json` (requires Matplotlib and FFmpeg).
- `source/`: recorded evaluation, per-budget prediction files, source protocol/result JSONs, and source metadata.
- `audit.json`: SHA-256 manifest and structural checks for the generated JSON and inputs.

## Budget and method handling

Included requested budgets: `0, 16, 32, 64, 128, 256, 512, 768, 1280, 2304, 4096` transitions. Also included are measured exact-prefix fits at `1024, 2048, 5096`, because saved predictions and provenance records exist for those budgets. No scores or rankings are interpolated. The animation crossfades visual emphasis between measured top-four sets; transition frames are not extra measurements. The preview uses one fixed close-up around the junction so the paths are legible. `coordinateBounds` and the SVG asset preserve the full maze; `recommendedViewBounds` records the fixed preview crop.

Website labels map to the stored prediction keys as follows: `VETO` → `WM-SL`, `H-return` → `Direct-SL`, and `Q-TD` → `Direct-TD`. The mapping is explicit in `ranking.json`; the original names remain available as `legacyMethod`. Scores are sorted high to low. Ties are resolved by ascending candidate index for deterministic full ranks.

The oracle return is the recorded discounted return for the actual 32-step MuJoCo rollout. Candidate paths are raw simulator coordinates and are not smoothed.

The project directory does not contain trained H32 PyTorch model weight files. The verified saved scoring artifacts are the bundled `predictions_n*.npz` files; bundled protocol and result records identify each fit budget and schedule. Each nonzero budget is a fresh independent fit on a nested prefix, not a sequential optimizer checkpoint. The 4096 fit was selected as the first tested prefix that makes all three methods choose the oracle top four on this illustrative scene; this is a selected single-seed example, not aggregate evidence.

## Rebuild

With Python 3 and NumPy installed:

```sh
python export.py
python make_preview.py
```

The first command rebuilds `ranking.json` and `audit.json` from `source/junction32_view/` and `source/source_metadata.json`. The second renders the animation and interactive preview from that JSON. Neither command refits models or reruns the simulator.
