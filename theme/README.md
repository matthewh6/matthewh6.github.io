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
| `--bg`            | `#f6f2e9` | Page background (warm paper)                |
| `--surface`       | `#fbf8f1` | Cards, media wells, raised areas            |
| `--text`          | `#241f1a` | Headings, name, strong emphasis             |
| `--text-body`     | `#4a4339` | Default body copy                           |
| `--text-muted`    | `#9b9384` | Captions, meta, labels                      |
| `--border`        | `#e1d9c9` | Hairlines, dividers, card edges             |
| `--accent`        | `#bf5700` | The one accent (UT Austin burnt orange)     |
| `--accent-strong` | `#9c4700` | Link text — darker for AA contrast on light |
| `--accent-light`  | `#f0e3d2` | Soft tint for subtle fills                  |

`--accent-strong` is the *link* shade (better contrast against the background);
`--accent` is reserved for hover, emphasis, and active states. In dark mode the
two swap relative lightness so links stay legible. `--klee-1/2/3` are the
decorative earthy triad shared with the favicon and footer colophon.

Dark values live in the `[data-theme="dark"]` block. `main.js` sets
`data-theme` on `<html>` before first paint (default light; choice persisted to
`localStorage`), so there's no flash.

## Typography

IBM Plex Sans for text, IBM Plex Mono for labels/meta (the small uppercase
eyebrows, dates, tags). Four clear roles in the scale:

- **Name** — `--fs-name` (1.8rem), tight tracking.
- **Titles** — `--fs-title` (entry/publication titles).
- **Body** — `--fs-body` (15.5px) at `--leading` 1.62; body width capped at
  `760px` (`.wrap`) for comfortable line length.
- **Captions / labels** — `--fs-caption`, `--fs-label`, `--fs-fine`.

## Spacing system

A 4px-based scale (`--space-2xs` … `--space-4xl`). Use these tokens for margins,
padding, and gaps rather than raw pixels — that's what keeps vertical rhythm
consistent across sections.

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
