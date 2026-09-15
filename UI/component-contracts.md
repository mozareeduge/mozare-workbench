# UI Component Contracts

These contracts are implementation authority. A library may supply primitives, but semantics/anatomy must remain.

## AppRail
**Owns:** primary view navigation only.  
**Anatomy:** product mark; five view buttons; bottom help/settings.  
**States:** default, active, has-count, unavailable (should be rare).  
**Behavior:** selected item exposed with `aria-current="page"`; Review badge announces count.  
**Responsive:** 72px rail wide, 56px compact, bottom nav mobile.

## ContextBar
**Owns:** project identity, breadcrumb/current object, command search, runtime safety/agent status.  
Does not repeat the five primary nav items.

## CurrentQuestionHero
**Owns:** one current question/object statement, short state summary.  
Title wraps freely; no fixed height. Long body truncation is deliberate with `More`, never CSS clipping.

## StateStrip
Horizontal/stacked list of 2–4 semantic states. Each item = icon + label + optional concise value. Color supplemental only.

## NextActionPanel
One recommended action and explanation. One primary button (`Work on this`) plus maximum two secondary routes.

## ObjectNode
Compact graph node. Props: type, title, lifecycle, evidence/use state, current/selected.  
No paragraph body. Keyboard focusable. Context drawer via Enter; focus via double click or explicit action.

## RelationInspector
Sections: Participants; Classification; Relation statement/descriptors; Evidence for/against; Uncertainty; Use; History. `Unsettled` remains literal when unknown.

## MissionSheet
Sections in order: Target, Outcome, Context, Acceptance, Agent, Advanced.  
Footer: `Save draft`, `Start mission`. Start disabled until outcome + ≥1 acceptance criterion + available/manual agent.  
Context rows explain *why included*; entire history is never selected by default.

## RunChip
Ambient only: agent, coarse phase, elapsed, state. Click opens detail. Never streams model text.

## ReviewQueueItem
Title, project/target, risk/freshness, verification cue. No proposal prose excerpt >2 lines.

## ReviewDetail
Sections: Effect, Verification, Impact, Architecture disclosure, Implementation disclosure. `ReviewDecisionBar` remains visible.

## ReviewDecisionBar
Displays base freshness and actions. Accept disabled for stale/conflict or policy-blocking failed verification. Request revision opens bounded sheet. Reject keeps record. Preserve creates residue.

## EvidenceRow
Source/evidence name, authority role, observed/claim state, evidence status, route. Separate `Observed` from `Agent claim` visually and semantically.

## SystemLadder
Five levels: Intent, System behavior, Architecture, Implementation, Verification. Intent/behavior visible; architecture/implementation collapsed; verification summary visible. Deep opening never hides decision controls.

## ArtifactTile
Preview, title, medium, canonicality, verification, lineage, primary medium action. Canonicality and verification are independent badges.

## ErrorReceipt
Four mandatory blocks: What failed; What remains safe; What was not changed; Next action. Details disclosure holds stack/log/technical data.

## TechnicalTerm
Popover content: term; plain system meaning; why it matters; optional exact detail. Use sparingly.

## DirectionAwareText
Use `dir=auto` for user-supplied prose; explicit `lang=fa dir=rtl` for known Persian paragraphs; `<bdi>` or isolated LTR for IDs/paths/hash/code.
