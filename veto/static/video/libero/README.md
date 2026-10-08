# Brighter LIBERO rollout clips

These are verified, successful LIBERO clips available from the SFT and archived VETO/WMGA experiments. Each MP4 is silent H.264, 448×448, 15 fps, yuv420p, and fast-start enabled. The matching JPEG is frame zero from that MP4.

The 224×224 source videos were upscaled with Lanczos and given the same restrained visibility correction: brightness +0.025, gamma 1.10, contrast 1.035, saturation 1.02. This is post-processing; it changes no recorded policy observation or trajectory and does not claim a simulator-lighting change. H.264 uses CRF 18. For 10 fps SFT input, the 15 fps output repeats frames to preserve original playback speed.

## Clips and provenance

- `sft_goal2.mp4`: LIBERO Goal-2, seed 1, deterministic post-SFT evaluation, placement seed 1073741824, 70 environment steps, success. Source: `exports/media/goal2_one_success/videos/after_sft/eval_step7_env0.mp4`. The original round-1 checkpoint and video were not retained; this is a reconstructed evaluation. Its replay inputs were checked against the production record with exact observation, action-noise, timestep, reward, terminal, and trajectory metadata matches. See `exports/media/goal2_one_success/verification.json`.
- `online_veto_goal2.mp4`: LIBERO Goal-2, VETO/WMGA collection policy, seed 1, round 50, successful collection episode, W&B step 196499. Source run `run-20260917_032948-yj4bmafh`, experiment `goal2_sac_wmga_fresh_s1_stock`.
- `online_veto_goal6.mp4`: LIBERO Goal-6, VETO/WMGA collection policy, seed 1, round 49, successful collection episode, W&B step 879417. Source run `run-20260906_120355-l9jfp2n8`; recorded source digest is in the original collection manifest.
- `online_veto_spatial9.mp4`: LIBERO Spatial-9, VETO/WMGA collection policy, seed 1, round 45, successful collection episode, W&B step 795108. Source run `run-20260906_121253-ulp7dpgj`; recorded source path and collection metadata are in the original review manifest.

The Goal-2/Goal-6/Spatial-9 collection clips are illustrative single episodes. They are not matched placements across tasks or methods. `sources.json` records source paths, hashes, task, outcome, and processing settings. `preview.png` and `index.html` provide a contact sheet and playable gallery.
