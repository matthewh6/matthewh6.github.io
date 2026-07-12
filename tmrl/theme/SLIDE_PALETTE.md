# TMRL Slide Palette

The talk deck pulls **identical** hexes to the website and tweet media. This file is the
human-readable mirror of [`theme.json`](./theme.json) — same values, copy-paste ready for
Keynote / PowerPoint / Google Slides / Figma. If a value changes, change it in `theme.json`
first, then sync here.

## Backgrounds — never pure white, never navy
| Token | Hex | Use |
|---|---|---|
| bg | `#ebe8e0` | slide base (concrete) |
| panel | `#f5f3ec` | content cards, figure mattes, image letterbox |
| panel-tint | `#e3dfd2` | inset panels |
| bg-deep | `#d9d4c3` | section dividers / deeper bands |

## Ink — warm near-black, never `#000000`
| Token | Hex | Use |
|---|---|---|
| ink | `#1c1c19` | titles, body |
| ink-soft | `#383832` | secondary |
| ink-muted | `#7a7872` | captions |

## Emerald — PRIMARY (always = ours / CSP / TMRL)
| Token | Hex |
|---|---|
| em-deep | `#1d4530` |
| **em** | **`#2a5d40`** (brand + active states) |
| em-mid | `#4a8068` |
| em-glow | `#8db59b` |
| em-light | `#d8e3dc` |

## Series accents — baselines (keep identity stable across every chart)
| Token | Hex |
|---|---|
| amber (bronze) | `#a67a3a` |
| walnut | `#6b4a30` |
| coral | `#c87a78` |
| periwinkle | `#6e7ec7` |
| olive | `#8a7e3e` |

### Fixed series → color (use the same mapping in every plot)
`TMRL/CSP/ours = #2a5d40` · `PostBC = #a67a3a` · `DSRL/BC = #6e7ec7` · `RLPD = #6b4a30` · `SPiRL = #c87a78` · `RND = #8a7e3e`

## Plot prop-cycle order
`#2a5d40 → #a67a3a → #6e7ec7 → #6b4a30 → #c87a78 → #8a7e3e`

## Rules / shadows
- rule-faint `#ddd9cc` (grid) · rule-soft `#c8c2b0` · rule `#1c1c19`
- card shadow `0 6px 18px rgba(28,28,25,.10)` · emerald glow `0 8px 26px rgba(29,69,48,.22)`

## Fonts
- **Fraunces** — serif display / titles
- **JetBrains Mono** — labels, tick labels, mono UI
- **Pretendard** — body copy
