# FoE-Info Design System — Chronicler

The Chronicler design system is the visual language for FoE-Info's redesigned UI.
It targets the DevTools panel, the options page, and the in-page HUD overlay.

---

## Philosophy

> "A war room, not a dashboard."

FoE is a strategy game with a medieval/fantasy tone. The UI should feel like reading a
guild hall notice board — functional, dense, slightly archaic — not like a modern SaaS tool.
Information density is more important than whitespace. Every pixel earns its place.

Three principles:
1. **Legible at small size** — the panel is narrow (≈300 px). No wasted chrome.
2. **Dark by default** — the game UI is dark. The panel should match.
3. **Semantic colour** — colour carries meaning (invest-good/fair/bad, danger/success).
   Don't add colour decoration for its own sake.

---

## Colour Tokens

Defined in `src/css/custom.scss` as CSS custom properties on `:root` and
`body[data-theme='dark']`.

### Chronicler Palette (Preview Mode)

Used inside `body[data-design-preview='true']`. Defined at the top of that block.

| Token | Value | Use |
|---|---|---|
| `--foe-preview-bg` | `#210f00` | Page background |
| `--foe-preview-surface` | `#2b1703` | Card background |
| `--foe-preview-surface-high` | `#3c250e` | Elevated surfaces (table headers) |
| `--foe-preview-surface-highest` | `#482f18` | Progress bar track |
| `--foe-preview-gold` | `#e8cb89` | Primary accent, headings |
| `--foe-preview-gold-dim` | `#e0c482` | Secondary gold (invest-fair) |
| `--foe-preview-vellum` | `#e6bf9e` | Body text on dark |
| `--foe-preview-oak` | `#5f432a` | Borders, scrollbar thumb |
| `--foe-preview-moss` | `#bfd6a0` | Positive/invest-good |
| `--foe-preview-text` | `#ffdcc0` | Primary text |
| `--foe-preview-text-muted` | `#cfc5b5` | Labels, secondary text |
| `--foe-preview-outline` | `rgba(76,70,58,0.6)` | Card inset border |

### Semantic Palette (Classic/Traditional Modes)

| Token | Light value | Dark value |
|---|---|---|
| `--foe-color-background` | `#f5f2e9` | `#1a0a00` |
| `--foe-color-text-primary` | `#1d1a14` | `#ffdcc0` |
| `--foe-color-surface` | `#fffdf7` | `#2d1f14` |
| `--foe-color-border` | `#d8ccb6` | `#5f432a` |
| `--foe-color-invest-good` | `#007e33` | (overridden in preview: moss) |
| `--foe-color-invest-fair` | `#ff8800` | (overridden in preview: gold-dim) |
| `--foe-color-invest-bad` | `#cc0000` | (overridden in preview: `#e06c75`) |

---

## Typography

| Context | Font | Size | Weight |
|---|---|---|---|
| Panel body | system-ui / Segoe UI (classic) | 0.8em | 400 |
| Panel body | Georgia / Times (traditional) | 0.85em | 400 |
| Preview body | Work Sans / Segoe UI | 0.875rem | 400 |
| Card headings | Noto Serif / Georgia | 0.82rem | 700 |
| Table headers | Noto Serif / Georgia | 0.72rem | 700 |
| Options title | Noto Serif / Georgia | 1.25rem | 700 |
| Labels / muted | same as body | 0.76rem | 400 |

---

## Component Patterns

### Cards (Alerts)

All panel content lives in Bootstrap `alert` cards. The card class encodes the
semantic meaning of the content:

| Class | Meaning | Preview mode border |
|---|---|---|
| `alert-warning` | City / player stats | amber inset |
| `alert-success` | Safe GB spots, positive results | moss inset |
| `alert-danger` | Unsafe GB spots, warnings | red inset |
| `alert-info` | Expedition, GBG, WS events | blue-grey inset |
| `alert-secondary` | Neutral supplementary info | default outline |

In preview mode, all cards share the same dark `--foe-preview-surface` background.
Semantic meaning is preserved through the `inset 0 0 0 1px rgba(...)` box-shadow.

### Tables

Inside cards. Use `.table.mb-1` Bootstrap class. Styling in preview mode:
- `th` → `--foe-preview-surface-high` background, gold text, uppercase
- `td` → `--foe-preview-text`, thin bottom border, 0.25rem vertical padding
- Last row: no bottom border
- Hover: `rgba(255,255,255,0.03)` tint

### Progress Bars

Use Bootstrap `.progress` + `.progress-bar`. In preview mode:
- Track: `--foe-preview-surface-highest`
- Fill: `linear-gradient(90deg, moss → gold)`
- Height: 0.4rem (or 5px for inline use)

### Badges / Pills

`.badge` class. In preview mode:
- Background: `rgba(232,203,137,0.15)` (gold tint)
- Border: `1px solid rgba(232,203,137,0.3)`
- Text: `--foe-preview-gold`

### Collapse Toggles

Panel cards are collapsible via Bootstrap's collapse plugin. Each collapsible
section has:
- A trigger icon (from `AddElement.icon()`)
- A `.collapse` / `.show` div containing the content
- Collapse state persisted via `collapse.ts`

---

## UI Modes

Three modes, set via `body.ui-mode-classic` / `body.ui-mode-traditional` class
and `body[data-design-preview='true']` attribute.

| Mode | Trigger | Character |
|---|---|---|
| Classic | default | Clean, system fonts, standard Bootstrap |
| Traditional | options toggle | Serif fonts, bevelled borders |
| Preview (Chronicler) | `designPreview` option | Dark themed, dense, serif headings |

Modes are **orthogonal to the dark/light theme** (`body[data-theme='dark']`).
Preview mode implies its own dark background — it overrides `--foe-color-background`.

---

## SCSS File Map

```
src/css/
  _variables.scss         — raw value tokens (spacing, radius, etc.)
  custom.scss             — component styles + Chronicler theme block
  _preview-empire.scss    — city dashboard preview overrides
  _preview-gb.scss        — great buildings tracker preview overrides
  _preview-expedition.scss — expedition hub preview overrides
  _preview-goods.scss     — trade goods preview overrides
  main.scss               — panel entry point (imports bootstrap + custom)
  options.scss            — options page (full Chronicler styling, no mode toggle)
  popup.scss              — popup page styles
```

### Writing a New Preview Partial

1. Create `src/css/_preview-{view}.scss`
2. Scope ALL rules to `body[data-design-preview='true'] #your-section-id { ... }`
3. Use `--foe-preview-*` variables — do not hardcode colours
4. Add `@import 'preview-{view}';` near the top of `custom.scss` (before the main block)

---

## Design Review Notes

### Current strengths
- CSS variable system is clean and comprehensive
- Semantic alert colours map well to game concepts
- Options page redesign (Chronicler) looks polished

### Known gaps / improvement opportunities

1. **No panel-level navigation** — all sections stack vertically with no way to jump.
   Consider a sticky tab bar or accordion header anchors for the panel.

2. **Card density inconsistency** — some cards (city stats) are very terse; others
   (GB tracker) scroll very long. A consistent max-height + scroll pattern per card
   would help.

3. **Progress bars underused** — only WorldChallenge uses one. GB FP progress,
   expedition round progress, and GBG sector progress are all good candidates.

4. **Collapse state is binary** — sections are either fully shown or hidden. A
   "compact mode" (show summary row only) would be useful for power users who
   want all sections visible at a glance.

5. **Panel title bar** — the title bar only shows the extension name and mode badge.
   Could show current world + player name + era without much space cost.

---

## Prototyping New Layouts

The `designPreview` flag is the prototype toggle. New panel layout experiments
should live in the `_preview-*.scss` partials so they can be reverted without
affecting the classic/traditional modes.

For structural layout changes (e.g. two-column grid, tabbed sections), the
preferred approach is to add a CSS class to `#content` in preview mode and
define the grid/tab behaviour entirely in SCSS, without changing the JS rendering.
This keeps the prototype reversible.
