# Theme

Single source of truth for the site's visual design. Everything about how the
site *looks* — color, type, spacing, radius, shadow, motion, and the handful of
reusable UI pieces — is defined here so pages stay consistent and easy to change.

```
theme/
  theme.css    # CSS variables (tokens) + reusable component classes  ← the source of truth
  theme.json   # the same tokens as data, for tooling/reference
  README.md    # this file
```

Related files at the repo root:
- `fonts.css` — `@font-face` declarations (IBM Plex Sans + Mono, self-hosted in `assets/fonts/`).
- `styles.css` — page **layout only**; it consumes the tokens below, no hardcoded colors or fonts.

Load order matters — tokens must be defined before anything uses them:

```html
<link rel="stylesheet" href="fonts.css">
<link rel="stylesheet" href="theme/theme.css">   <!-- tokens + components -->
<link rel="stylesheet" href="styles.css">        <!-- page layout -->
```

---

## Visual style

Clean, research-oriented, minimal. Warm paper background, one accent color used
sparingly, generous whitespace, hairline borders instead of heavy chrome, and
only subtle transitions. Light and dark themes are the same palette re-pointed.

## Color palette

Semantic tokens — name by **role**, not by hue, so dark mode is a drop-in override.

| Token             | Light     | Role                                        |
| ----------------- | --------- | ------------------------------------------- |
| `--bg`            | `#f9f0de` | Page background (warm cream)                |
| `--surface`       | `#fdf8ee` | Cards, media wells, raised areas            |
| `--text`          | `#1a1714` | Headings, name, strong emphasis             |
| `--text-body`     | `#2f2b27` | Default body copy                           |
| `--text-muted`    | `#6b6358` | Captions, meta, labels                      |
| `--border`        | `#eadcc2` | Hairlines, dividers, card edges             |
| `--accent`        | `#0e7e33` | Method green (paper figures) — hover, emphasis |
| `--accent-strong` | `#0b6a2b` | Link text — darker for AA contrast on light |
| `--accent-light`  | `#dcefe0` | Soft tint for subtle fills                  |

`--accent-strong` is the *link* shade (better contrast against the background);
`--accent` is reserved for hover, emphasis, and active states. In dark mode the
two swap relative lightness so links stay legible. `--swatches-1/2/3` are the
decorative earthy triad for the footer colophon.

Secondary text has 5.22:1 contrast on the light page background; link text
(`--accent-strong`) has 5.96:1. Dark-mode secondary text (`#9a9387`) has 5.82:1
on the page and 5.38:1 on raised surfaces. These pairs clear the 4.5:1 normal-text AA threshold.

Dark values live in the `[data-theme="dark"]` block. `main.js` sets
`data-theme` on `<html>` before first paint (default light; choice persisted to
`localStorage`), so there's no flash.

## Typography

Palatino (`--font-serif`) for main text, the name, publication titles, and author lists, matching
the typeface used in Matthew's paper figures. It uses installed system fonts,
with related serif faces and Georgia as fallbacks. IBM Plex Mono stays on labels/meta (the small uppercase eyebrows, dates,
tags). Homepage sizes are overridden by `.home` in `theme.css` and mirrored in
`typography.homepageScale` in `theme.json`. Four clear roles in the scale:

- **Name** — `--fs-name` (30px on the homepage), tight tracking.
- **Titles** — `--fs-title` (17.5px, entry titles); `--fs-pub-title` (17px on
  the homepage). Publication authors use `--fs-meta` (14px);
  venues and paper links use `--fs-caption` (12px).
- **Body** — introduction and news share `--fs-body` (16px on the homepage),
  with line heights of 1.65 and 1.5 respectively. The homepage has an 860px
  content width, with the introduction spanning the same width.
  Publication media use a 200px column and 16px gap on desktop, following Ge
  Yan's page proportions. Below 665px, media fill the content width above the
  publication text. Videos use slightly taller 8:5 frames with a mild center
  crop; diagram images keep their natural aspect ratios. Other pages retain
  the 760px base wrapper or their own reading-width override.
- **Captions / labels** — social links and email use `--fs-caption` (12px);
  section headings, dates, and footer use `--fs-label` (11.5px).
  Other pages retain the base typography scale.

The homepage profile photo is 128px square. Its light/dark toggle is a 34px
circle with a 14px symbol, growing to 44px on touch devices. The compact scale
is based on https://geyan21.github.io/ while retaining the Palatino identity.

## Spacing system

A 4px-based scale (`--space-2xs` … `--space-4xl`). Use these tokens for margins,
padding, and gaps rather than raw pixels — that's what keeps vertical rhythm
consistent across sections.

The homepage tightens the larger spacing steps to 40px, 56px, and 64px; these
overrides are mirrored in `homepageSpace` in `theme.json`.

Also tokenized: `--radius-sm|--radius|--radius-pill`, `--shadow-sm|--shadow`
(soft and low-contrast; the site is border-first, so shadows are opt-in via
`.card--raised`), and `--transition` for all motion.

## Reusable components

Defined in `theme.css`, usable on any page:

- `.pill` — tag/link/button chip. Add `.pill--tag` for the smaller variant.
  (The theme toggle and publication links use it.)
- `.card` / `.card--raised` — rounded surface with a hairline border; `--raised`
  adds the soft shadow.
- `.media` — rounded container that clips an image or video; pair with fixed
  dimensions from the page layer (the publication thumbnails use it).
- `.eyebrow` — small uppercase mono section label.

Focus states (`:focus-visible`) are handled centrally in `theme.css`.

## Adding a new theme variable

1. Add it to the right group in `theme.css` `:root`, with a one-line comment on
   its role. If it's a color that differs in dark mode, add the override to
   `[data-theme="dark"]`.
2. Mirror it in `theme.json` so tooling/reference stays accurate.
3. Reference it as `var(--name)` — never re-inline the literal value.

## How future pages should use the theme

- Link the three stylesheets in the order shown above.
- Build with tokens (`var(--…)`) and the reusable classes; avoid hardcoded
  colors, fonts, or ad-hoc pixel spacing, and avoid inline styles.
- Keep it plain HTML/CSS/JS — no framework or build step.
- Preserve accessibility: semantic HTML, AA contrast (use `--accent-strong` for
  link text on light surfaces), and don't remove the shared focus outlines.
