---
name: mozare-handoff
description: Convert a long or technical work session into a compact durable handoff that preserves project state, decisions, verification, unresolved items, and inspectable artifacts without carrying forward transcript bulk. Use before stopping, context compaction, agent switch, or human review.
---

# Mozare Handoff

## Principle

Preserve **state transitions and evidence**, not conversational volume.

## Required fields

Produce a handoff matching `config/handoff.schema.json` when that contract is available.

At minimum capture:

- state;
- one-sentence summary;
- system-level intent/behavior;
- changed objects/files;
- decisions actually made;
- tests actually executed;
- artifacts;
- technical terms that the next human/agent needs;
- blockers/open questions;
- one next action.

## Omit from durable handoff

- chain-of-thought;
- repeated discussion;
- terminal noise;
- abandoned micro-options that have no future value;
- generic praise/rhetoric.

If a failed route remains research/artistic evidence, preserve it explicitly as residue rather than silently deleting it.
