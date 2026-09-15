# 03 — Design / UI / UX Blueprints

**Authority snapshot:** `MWB-PD-2026-09-15-r3`  
**Status:** implementation authority, not moodboard.

## 1. Experience thesis

The interface behaves like a **quiet project instrument**: persistent spatial orientation, low ambient prose, visible state, and deliberate expansion into complexity. The product should feel closer to returning to an arranged studio/research table than reopening a chat history or IDE.

Three perceptual rules govern every screen:

1. **One dominant question/action at a time.** Secondary apparatus is lighter and later.
2. **State is legible before explanation.** Labels, geometry, position, icon and concise copy communicate where the user is.
3. **Depth is progressive.** The interface begins with project meaning and only descends into technical/log detail on request.

## 2. Design foundation

### DS-TYPOGRAPHY

No network font dependency. Use local/system stacks:

```css
--font-ui: "Segoe UI Variable", "Segoe UI", Inter, system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
--font-reading: ui-serif, Georgia, "Times New Roman", serif;
--font-fa: Vazirmatn, "Noto Sans Arabic", Tahoma, "Segoe UI", sans-serif;
--font-mono: "Cascadia Code", "SFMono-Regular", Consolas, monospace;
```

Use the UI stack for controls and short project text; optional reading stack only for long source/document/artwork text. Persian blocks set `font-family: var(--font-fa)` when language/direction indicates it.

Type scale:

| Token | Size/line | Use |
|---|---|---|
| `display` | clamp(32, 3vw, 44) / 1.08 | current question/project-level statement only |
| `h1` | 28/34 | surface title |
| `h2` | 20/27 | section title |
| `h3` | 15/21, semibold | card/component title |
| `body` | 15/23 | interface content |
| `body-sm` | 13/19 | metadata/support |
| `label` | 11/16, 650, +.06em | compact category/state |
| `code` | 12.5/19 | identifiers/diffs only |

Maximum prose measure: 72ch for reading; 58–64ch for Focus/Review explanation. Avoid text columns spanning entire desktop canvas.

### DS-SPACING

Base unit 4px. Allowed spacing: `4, 8, 12, 16, 20, 24, 32, 40, 48, 64`.

- dense control gaps: 8px;
- card internal padding: 16px compact / 20px normal / 24px key card;
- section gap: 32–40px;
- surface top/bottom breathing room: 32–56px;
- grid gutter: 16px compact, 20–24px wide.

Avoid arbitrary 13/18/27px spacing except typography line-height.

### DS-COLOR

Use semantic CSS variables rather than hard-coded component colors. Reference palette in `UI/design-tokens.css` uses a warm-neutral light canvas and near-black ink; dark mode is explicitly optional after v1 and must not delay first release.

Roles:

- canvas / raised / inset surfaces;
- strong / muted / faint text;
- line subtle / line strong;
- accent = current focus/interactive selection;
- positive = verified/accepted;
- warning = stale/blocked/qualified;
- danger = destructive/failed/security;
- info = candidate/external/unverified.

Color must never be the only state cue. Every status uses text + icon/shape/border treatment.

### DS-SHAPE

- surface/card radius: 12px;
- dialogs/sheets: 16px;
- compact controls: 8px;
- pill only for tags/status/chips, never every button;
- 1px borders are default separation; shadows only for transient overlay elevation.

Avoid “card soup”: continuous surfaces use dividers and spacing rather than wrapping every text group in a card.

### DS-MOTION

- micro transition: 120–160ms;
- drawer/sheet: 180–220ms;
- Field focus transition: max 240ms;
- easing: standard ease-out; no spring/bounce by default;
- agent completion uses state/icon transition only;
- `prefers-reduced-motion` reduces to 0–80ms and disables canvas travel animation.

## 3. Application shell

### Desktop wide — ≥1180px

```text
┌──────┬─────────────────────────────────────────────────────────────┐
│ logo │ Project / current object                     Search  Status │  top context bar 56
├──────┼─────────────────────────────────────────────────────────────┤
│      │                                                             │
│ FOC  │  surface content                                            │
│ FLD  │  max content width varies by surface                        │
│ FLO  │                                                             │
│ REV2 │                                                             │
│ OUT  │                                                             │
│      │                                                             │
│  ?   │                                                             │
└──────┴─────────────────────────────────────────────────────────────┘
 72px
```

- left rail: 72px, icon + 10px label, active item has 3px side marker + subtle filled background;
- top context bar: 56px, not another navigation row; contains breadcrumb/project switcher, current sync/safe status, search/command trigger;
- main content: min-width 0, no global horizontal scroll;
- `FOCUS` and `OUTPUT`: content max 1180px centered with left alignment;
- `REVIEW`: can use full width for split list/detail;
- `FIELD`: canvas fills available content area with internal controls.

### Desktop compact / tablet — 760–1179px

- rail collapses to 56px icons with accessible tooltips, or top segmented nav if width/height combination makes rail harmful;
- persistent right inspectors become overlays/drawers;
- Review queue/detail becomes a route/stack, preserving back position;
- Flow board may horizontally scroll internally, never page-wide.

### Mobile — <760px

- top bar 52px: project short name + search/status affordance;
- fixed bottom navigation: five equally reachable primary views with icon + short label + Review count;
- surface padding 16px; safe-area aware;
- drawers become full-height sheets or routes;
- sticky decision/action bars sit above bottom nav and safe area;
- Field opens with list-first if graph would be illegible; explicit “Map” toggle opens pan/zoom canvas;
- no horizontally scrolling nav labels.

## 4. Surface blueprints

### SURF-FOCUS

#### Hierarchy

1. breadcrumb/project label;
2. current question/object (`display`);
3. 1–2 sentence state explanation, max ~180 chars before “More”;
4. horizontal/stacked state strip: lifecycle, evidence, review need;
5. main two-column content:
   - left 7/12: **Next meaningful action** + related/context summary;
   - right 5/12: **Needs you**, **Latest accepted decision**, **Latest verified output**;
6. secondary Trace/Evidence links.

Do not lead with dashboard metrics. Counts only appear when actionable (`2 need review`).

#### Components

- `CurrentQuestionHero`
- `StateStrip`
- `NextActionPanel`
- `NeedsYouList`
- `DecisionExcerpt`
- `LatestOutputTile`
- `RelatedContextSummary`

#### Empty variations

- no active question → objective/artifact/mission becomes hero;
- new project → target horizon + first capture/import action;
- blocked → blocker replaces next action with repair route.

### SURF-FIELD

Canvas background is quiet, not graph-paper decoration at high contrast. Nodes are compact semantic objects, not floating cards containing paragraphs.

#### Node anatomy

```text
[type glyph]  TYPE / status
Object title (1–3 lines)
optional one-line state/evidence
```

Size: 176–232px wide. Current object receives accent outline + halo; selected gets strong outline; multiple selected uses counter.

Relation lines:
- settled: solid;
- provisional: solid with small state marker;
- unsettled: dashed;
- contradictory/counter relation: semantic danger marker only when relation authority says so.

Canvas controls: zoom in/out, fit current cluster, reset layout, Map/List toggle, filter button. Put these in compact floating groups, not a toolbar spanning the screen.

Right inspector width 380px wide desktop. It contains object/relation sections with routes to Evidence/Trace. Closing restores canvas keyboard focus to selected object.

### SURF-FLOW

Two modes, remembered per project:

- **Outcome board:** Ready / Active / Blocked / Review / Accepted;
- **Pipeline:** project-specific semantic path (e.g. Question → Evidence → Experiment → Decision → Artifact → Review).

Cards show title, target, owner/agent, state, one blocker/verification line. Avoid story-point/project-management chrome.

### SURF-REVIEW

This surface receives the greatest interaction rigor because it is the human/agent authority boundary.

#### Wide layout

```text
┌──────────── 320px queue ────────────┬──────────── review detail ───────────────┐
│ filters                              │ title / risk / freshness                 │
│ review item                           │ requested outcome                        │
│ review item                           │ what changed / unresolved                │
│ review item                           │ verification + artifact preview          │
│ ...                                   │ Architecture ▸                           │
│                                       │ Implementation ▸                         │
│                                       │                                          │
│                                       │ [Preserve] [Reject] [Revise] [Accept]    │
└───────────────────────────────────────┴──────────────────────────────────────────┘
```

Queue item anatomy: status glyph, concise title, project/object, age/freshness, verification cue. Do not preview entire proposal prose.

Detail sections:

1. **Effect** — requested outcome / observed result / unresolved;
2. **Verification** — evidence list, tests with provenance, artifact preview;
3. **Impact** — affected objects/files and protected neighbors at system level;
4. **Architecture/Rationale** — disclosure;
5. **Implementation** — disclosure containing diff/files/logs.

Decision bar is sticky to detail pane bottom. `Accept` uses strongest positive styling only when enabled. `Reject` is not red unless it causes destructive disposal; semantically it simply declines authority. `Preserve as residue` is tertiary.

### SURF-OUTPUT

Gallery/list hybrid. The artifact itself gets visual area; metadata is compact.

Artifact tile:
- preview or medium glyph;
- title;
- canonicality (`Canonical/editable`, `Generated/distributable`, `External`, `Temporary`);
- verification (`Verified`, `Unverified`, `Failed`);
- source/lineage link;
- primary medium-specific action (`Preview`, `Listen`, `Read`, `Inspect`).

Filters: type, canonicality, verification, recent/important. Default: important/recent, not every generated file.

## 5. Components

### `StatusBadge`
Use for lifecycle/evidence/verification. Anatomy: icon + label; optional tooltip explanation. Never status color alone.

### `ObjectChip`
One-line reference to project object; shows type glyph, title, optional status dot/label. Used in mission context and traces.

### `EvidenceRow`
Fields: source name, authority role, evidence state, provenance route, observed/claimed badge, action `Open source`.

### `SystemLadder`
Five ordered sections. Intent/Behavior open; Architecture/Implementation collapsed; Verification visible summary. Deep sections preserve scroll context.

### `MissionSheet`
Desktop: right modal sheet 520–600px. Mobile: full-screen route/sheet. Fixed footer actions; content scrolls independently. Explicit context inclusion checkboxes/chips.

### `ReviewDecisionBar`
Shows current base freshness + actions. When stale, replaces Accept with `Re-evaluate proposal`; explains why in one sentence.

### `ArtifactPreview`
Media-specific, sandboxed as needed. Never auto-runs binary. HTML iframe uses restrictive sandbox and separate origin/path policy.

### `EmptyState`
Contains: what this surface is for, why empty, next viable action. No illustration required.

### `ErrorReceipt`
Contains: what failed; what remains safe; what did not change; next action; optional details disclosure.

### `TechnicalTerm`
Inline chip only for terms likely unfamiliar/contextually important. Popover: exact term, plain system meaning, why it matters, optional deeper detail.

## 6. Interaction rules

- Clicking a main nav item changes surface and updates document title/heading; selected context survives where semantically valid.
- Escape closes the topmost non-destructive overlay and restores trigger focus.
- Browser Back follows semantic navigation (surface/detail), not every trivial panel toggle.
- Destructive/irreversible actions require confirmation. Routine Accept does not require a redundant modal if transaction is reversible/recorded and base is fresh.
- Hover never carries unique information or the only affordance.
- Dragging in Field alters derived layout only; connect requires an explicit mode.
- Toasts are receipts, not primary state. Persistent state changes remain visible in the affected object/surface.
- Loading >300ms shows localized skeleton/progress; never replace whole app with spinner for a single panel.
- Streaming agent tokens never appear in main workspace; coarse phase updates may update a run chip.

## 7. Responsive transformations

| Component | Wide | Compact/tablet | Mobile |
|---|---|---|---|
| Main nav | 72px left rail | 56px icon rail/top compact | bottom nav |
| Field inspector | persistent right drawer | overlay drawer | full sheet/route |
| Review | queue + detail | queue then detail | route stack |
| Mission composer | 560px sheet | 520px sheet | full screen |
| Flow board | all lanes visible if room | internal horizontal scroll | status filter + vertical cards; board optional |
| Output gallery | 2–3 cols | 2 cols | 1 col |
| Focus metrics | 2-col composition | 1–2 cols | one column, hero first |
| Decision bar | detail-pane sticky | viewport/pane sticky | above bottom nav |

Narrow 320px: actions stack or wrap; no fixed card height; identifiers use overflow-wrap:anywhere; tables become definition lists/cards when column meaning would otherwise collapse.

## 8. Accessibility contract

- semantic landmarks: `header`, `nav`, `main`, optional `aside`, `footer/status`;
- one `h1` per surface, logical hierarchy below;
- focus-visible ring ≥2px with 2px offset, contrast ≥3:1 against adjacent background;
- minimum target 40×40px, prefer 44×44 for mobile primary controls;
- modal/sheet focus trap, Escape close, trigger focus restore;
- asynchronous run/review completion announced through polite live region; failures requiring action use assertive only when necessary;
- Field graph has keyboard navigation and equivalent list; never rely on spatial canvas as sole interface;
- labels pair icons with text at least in accessible name; tooltips are supplementary;
- state cues survive grayscale/high-contrast mode;
- test 200% zoom at 1280×720 and 320 CSS px width;
- `prefers-reduced-motion` honored;
- contrast target WCAG AA for text/controls; disabled state remains readable.

## 9. Bidi / language contract

- default app shell LTR unless full locale becomes Persian later;
- user/content blocks use `dir="auto"` when direction is content-driven;
- Persian paragraphs may explicitly use `lang="fa" dir="rtl"`;
- code, IDs, hashes, paths, URLs use `dir="ltr"` plus `unicode-bidi:isolate` / `<bdi>`;
- tables set direction at cell content level rather than flipping the entire table when mixed;
- punctuation around IDs inside Persian sentences is tested with real fixtures;
- no CSS `direction: rtl` on broad containers simply to “fix Persian”.

## 10. Visual QA thresholds

Production candidate must be inspected at: 1440×900, 1280×720, 1024×768, 768×1024, 390×844, 320×700, plus 200% zoom. At each size:

- no page-level horizontal overflow;
- primary action visible/reachable;
- nav items reachable without horizontal scrolling;
- no text clipped by fixed heights;
- modal/sheet footer remains reachable;
- dense identifiers wrap or scroll inside their own bounded control;
- visual hierarchy remains Focus/Effect-first rather than metadata-first.

## 11. Anti-pattern rejection list

Implementation fails design authority if it produces:

- chat composer as permanent bottom bar/home;
- terminal/log stream occupying primary viewport;
- equal-weight cards for every fact;
- five text tabs squeezed in a mobile header;
- tiny gray-on-gray metadata as the only status information;
- arbitrary gradients/glows/AI purple palette;
- decorative graph with no list/inspect equivalent;
- “AI summary” with no evidence route;
- acceptance button active for stale/failed policy state;
- engineering task board as the default Flow;
- raw file explorer as Output;
- fixed-height cards that clip Persian/long content;
- global RTL applied to mixed technical interfaces.

## 12. Adaptive representation layer

Adaptive UI exists *inside* stable Workbench surfaces. It does not turn the whole application into model-generated layout.

### Representation modes

| Mode | Default use | Model call |
|---|---|---|
| `STATIC` | Focus orientation, Flow status, Review queue, Output registry, known errors | never |
| `DETERMINISTIC` | known structured compositions: status ladder, evidence chain, decision options, comparison with fixed schema | never |
| `GENERATIVE_OPENUI` | novel comparison/synthesis/arrangement where representation choice itself adds value | bounded |

A visible `View as` control may offer contextually valid modes such as **Orient / Compare / Decide / System**. Switching mode changes projection, never authority.

### Mozare semantic component grammar

The generative library is intentionally semantic rather than SaaS-generic:

- `OrientationBrief` — current question/state/next action.
- `EvidencePath` — source/evidence → claim → decision/proposal path.
- `CompareMatrix` — comparable dimensions with explicit unknown/unequal cells.
- `DecisionGate` — bounded owner/reviewer options with consequence and recommendation.
- `SystemLadder` — Intent → Behavior → Architecture → Implementation → Verification, with deeper tiers collapsible.
- `ProposalReview` — requested outcome, effects, evidence provenance, protected behavior, unresolved items and allowlisted review actions.
- `ArtifactSummary` — medium, canonicality, verification, lineage and open/preview actions.
- `UncertaintyBlock` — unresolved/contested/insufficient evidence state.
- `NextMoves` — 1–3 viable structured actions; no generic suggestion dump.
- `RelationSlice` — small relational neighborhood, not an unrestricted whole-graph renderer.

### Generative composition constraints

1. Root must be a Workbench-owned semantic container.
2. Generated UI receives no raw canonical mutation function.
3. Component props carry IDs/short display strings; long source text stays behind explicit expansion.
4. No generated nested card wall: maximum 2 hierarchy levels before disclosure/navigation.
5. No decorative chart when a simpler comparison/list communicates the fact more accurately.
6. Human-visible generated prose defaults to <=150 words per composition excluding labels/table cells; longer analysis becomes a referenced artifact or explicit expanded view.
7. Each dynamic composition exposes why it exists through a small mode label (`Orient`, `Compare`, `Decide`, `System`) rather than pretending to be permanent project structure.
8. Failure returns to fixed deterministic UI with no lost action/state.

### Token-aware component design

OpenUI component schemas must be flat, required/identifying props first, optional props last, and micro-library size kept small. Common state should be expressed as enum/ID/value props rather than natural-language paragraphs. Generated UI receives already-compiled compact data, never the whole project transcript/source corpus.
