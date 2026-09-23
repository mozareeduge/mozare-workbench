# P10 Authority Addendum — Live, Multi-Project Workbench

**Authority ID:** `MWB-PD-P10-2026-09-23-r1`
**Status:** frozen for `TASK-P10-01..03`
**Basis:** owner correction on 2026-09-22, current v0.3 authority, observed repository state, and reviewed handoff `MWB-P10-LIVE-2026-09-22-r1`.

This addendum closes the product-liveness gap discovered after the fixture-backed candidate was launched. It does not replace the five surfaces or the local-files/Git authority model.

## P10-DEC-01 — Multi-project shell

Workbench registers multiple local projects and lets the owner add, create, and switch projects without changing the five conceptual surfaces. `mozare-wiki` is only the selected liveness/pilot target; it is never a built-in label, default, route, or schema value.

## P10-DEC-02 — Existing-folder registration is non-destructive

Registration writes no canonical files into the selected folder. Each registered folder is classified from current evidence:

- `ready`: the canonical Workbench structure validates;
- `needs_onboarding`: the folder is readable but has no complete canonical Workbench structure;
- `invalid`: Workbench records appear to exist but fail validation.

`needs_onboarding` may show bounded read-only orientation facts with external/candidate provenance. It must not synthesize canonical questions, relations, decisions, review items, outputs, or completion state. `invalid` returns a bounded error receipt and never falls back to fixtures.

## P10-DEC-03 — Existing-project onboarding remains a separate mutation

Creating canonical Workbench files inside an existing project requires a later explicit human action, a preview of the paths to be created, and refusal to overwrite conflicts. `TASK-P10-01..03` must not silently perform this mutation. Until a dedicated onboarding action exists, the UI must not present setup as an enabled operation that implies the mutation is implemented.

## P10-DEC-04 — New-project creation is first-class

Create project selects a parent folder, name, kind, and current objective, then creates a new non-conflicting child folder with the minimum validating canonical scaffold. A new project may have no active question. `current_question_id` is therefore nullable/optional, and Focus follows `SCN-FOC-02` without inventing a question, relation, review item, or artifact.

## P10-DEC-05 — Registry is derived operator state

The persistent workspace registry is runtime/operator state, not project truth. It stores a stable opaque ID, normalized absolute root, display name, classification, validation status, and last-opened metadata. Browser responses expose the opaque ID and safe display/orientation fields, not the absolute root. After folder selection/registration, ordinary browser calls address a workspace only by ID.

## P10-DEC-06 — Folder selection is operator-level

On first-release Windows, add/create flows provide a user-initiated native folder selection path. The selection crosses the loopback server through a short-lived opaque selection token or an equivalently bounded mechanism; the production browser is not given a generic arbitrary-path or shell endpoint. Fixed executable/argv invocation and existing path/secret protections remain mandatory.

## P10-DEC-07 — Live surface rule

Normal launch has no fixture-backed production fallback. Every visible project-specific fact comes from the active registered workspace/runtime. Missing data yields an honest loading, empty, unavailable, setup, or error state. Test fixtures stay outside production render modules.

## P10-DEC-08 — Owner-test boundary

`GATE-LIVE` must observe the running client fetching from the running API and visibly rendering current real project facts in dark-default mode with no demo markers. After `TASK-P10-01..03` pass on one candidate, status is `OWNER_TEST_READY`; `TASK-P09-02` then gathers human pilot evidence and `TASK-P09-03` performs independent candidate freeze. Automated evidence cannot substitute for owner acceptance.
