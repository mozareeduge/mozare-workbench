# Layout / Geometry Contracts

## Global
- No page-level horizontal overflow at supported widths.
- Main surface has `min-width:0` in every grid/flex parent.
- Wide shell: `72px rail + minmax(0,1fr)`; top context bar height 56px.
- Surface padding: 24–40px wide; 20–24px compact; 16px mobile.
- Content grid uses 12 columns wide, 16–24px gutter.
- Long reading text ≤72ch; system explanation ≤64ch.

## Focus wide
- Hero max 900px.
- After hero: 7/12 next-action/context + 5/12 human-review/latest-decision stack.
- At <900px: one column in semantic order: question → state → next action → needs you → latest decision → latest output.

## Field
- Canvas owns its own pan/zoom; document page must not pan horizontally.
- Wide: canvas fills remainder; inspector 392px overlays or forms second column only when ≥1320px useful width.
- Mobile: list-first; map is explicit secondary mode.

## Review
- ≥1180px: 320px queue + 1fr detail. Both have independent vertical scroll beneath context bar.
- 760–1179px: queue route then detail; optional overlay drawer is acceptable if browser Back works.
- <760px: full route stack; decision bar `position:sticky; bottom:calc(var(--mobile-nav) + env(safe-area-inset-bottom))`.

## Sheets/dialogs
- mission: width 560px max, 100vw mobile; `max-height: min(92dvh, 900px)`; footer fixed within sheet, body scrolls.
- contextual inspector: 392px wide, full width mobile.
- confirmation dialog: 420px max, only for destructive/irreversible action.

## Touch/keyboard
- controls min 40px; primary mobile targets 44px.
- no action only on hover.
- tooltip appears after focus as well as hover and never contains required workflow content.
