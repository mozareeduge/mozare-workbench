# Representation Runtime Contract

## 1. Planner

Input: surface, user intent/action, selected object(s), structured project projection, available deterministic templates.  
Output: `RepresentationPlan` validated by `CONTEXT/representation-plan.schema.json`.

Selection order is `STATIC → DETERMINISTIC → GENERATIVE_OPENUI`. The planner must be deterministic for explicit intents such as `system`, `compare`, `decide`, `orient` when a known semantic composition is sufficient.

## 2. OpenUI generation

When `GENERATIVE_OPENUI` is justified:

1. choose exactly one micro-library;
2. compile a `ui` profile context packet within `700/1200` defaults;
3. generate the OpenUI system prompt *from that micro-library only*;
4. request OpenUI Lang, not JSON/Markdown;
5. stream/parse/validate against the library;
6. bind Query/Mutation only to the explicit action registry;
7. record token metrics + representation plan;
8. render in the owning Workbench region.

The full project data, raw transcript, secret values and arbitrary filesystem/tool surface are never injected into the generated program.

## 3. Action boundary

Allowed read actions: `open_object`, `open_source`, `expand_reference`, `open_artifact`, `inspect_evidence`.  
Allowed write-like actions: `create_proposal`, `request_revision`, `start_mission` only.  
Forbidden: canonical writes, proposal acceptance, shell execution, unrestricted path access.

## 4. Fallback

Any parse/schema/action failure, timeout, library mismatch or generation-budget breach returns `deterministic_semantic_view`. The user must retain all critical information and actions. Failure may show a quiet derived-view warning; it does not become a project defect unless deterministic functionality is also unavailable.

## 5. Accessibility

Semantic components own keyboard/focus/name/state/responsive rules. The model chooses components and compact content; it cannot generate raw arbitrary interaction primitives for critical Workbench flows.

## 6. Durable vs ephemeral

Generated view programs are ephemeral cacheable projections. Saving one as design evidence is explicit. A generated UI program is never a decision, artifact authority or source record merely because it was displayed.
