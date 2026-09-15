# 05 — Agent Orchestration Specification

## 1. Principle

Agent harnesses are replaceable workers over shared project state.

```text
                  MOZARE WORKBENCH
              canonical + proposal state
                      │
            ┌─────────┼─────────┐
            ▼         ▼         ▼
         Claude      Codex    Hermes
         adapter     adapter   adapter
            │         │         │
            └──── bounded mission ────┐
                                      ▼
                              target repo/worktree
                                      │
                              tests + artifacts
                                      │
                               HANDOFF ENVELOPE
                                      │
                                      ▼
                                 REVIEW PROPOSAL
```

No agent owns project memory.

## 2. Role library

Roles are behavioral presets, not model identities.

### Cartographer / Orienter

Purpose: reconstruct current project topology and next action from canonical state.

May:

- read project records;
- find relevant objects;
- propose grouping/relations;
- create an orientation summary.

May not:

- silently settle uncertain relations;
- rewrite canonical claims;
- make implementation changes.

Ready-made skill: `.agents/skills/mozare-orient/`.

### Researcher

Purpose: gather/compare evidence using authority-aware retrieval.

Must:

- distinguish source-derived facts from inference;
- route derivative hits to original/primary material when possible;
- preserve contradiction/uncertainty;
- output evidence objects/relations, not only prose.

### Maker / Writer

Purpose: make the requested artifact—text, structure, design specification, artistic material—within stated constraints.

Must preserve the distinction between source material and authored transformation.

### Technical Translator / Lead

Purpose: bridge human intent and engineering implementation.

Every technical mission gets the system ladder:

`Intent → Behavior → Architecture → Implementation → Verification`.

This role can delegate actual implementation to the selected harness but must return the ladder in the handoff.

### Reviewer

Purpose: independently test evidence, acceptance criteria, behavior, and defects.

Default Reviewer must not edit the implementation under review. If it must fix, create a separate mission after reporting review results.

### Handoff / Archivist

Purpose: convert transient run results into compact durable state, preserve selected genesis, and prepare proposal/re-entry information.

## 3. Mission lifecycle

### Step 1 — Select target

Mission begins from a persistent object/project, not empty chat.

### Step 2 — Compose mission packet

Workbench gathers only explicitly included context:

- target object;
- linked accepted decisions;
- selected source/evidence records;
- project rules/instructions;
- acceptance criteria;
- protected paths;
- output schema.

The UI shows what is included.

### Step 3 — Preflight

Check:

- executable exists;
- target path allowed;
- Git status known;
- worktree/branch can be created if required;
- protected path policy loaded;
- acceptance criteria present;
- user-approved permissions adequate.

### Step 4 — Isolate

Implementation missions should use a dedicated Git worktree/branch when repository state allows.

Research/writing missions that only produce proposals can use a temporary output directory.

### Step 5 — Run

Launch selected adapter with prompt file rather than interpolated command text.

Store stdout/stderr as disposable run evidence.

### Step 6 — Verify handoff

Agent result must validate against `handoff.schema.json`.

If invalid:

- mark run `needs_repair`;
- no canonical apply;
- optionally ask same agent for one bounded “repair handoff only” turn.

### Step 7 — Independently collect evidence

Workbench, not the agent alone, gathers what it can:

- Git status/diff;
- changed file list;
- test exit codes;
- artifact existence/checksum;
- schema validation.

Agent assertions are compared to observed evidence.

### Step 8 — Build proposal

Human-facing Review is generated from the mission, handoff, and observed evidence.

### Step 9 — Human decision

Accept / revision / reject / preserve as residue.

### Step 10 — Commit visible genesis

Accepted changes update canonical records and append meaningful events.

## 4. Adapter contract

All adapters expose a common interface:

```ts
interface AgentAdapter {
  id: string;
  displayName: string;
  detect(): Promise<Availability>;
  run(mission: MissionPacket, runtime: RunContext): AsyncIterable<RunEvent>;
  stop(runId: string): Promise<void>;
  collect(runId: string): Promise<AgentRawResult>;
}
```

The UI does not depend on vendor-specific events.

Canonical run event vocabulary:

- `queued`
- `started`
- `phase`
- `artifact`
- `warning`
- `needs_input`
- `completed`
- `failed`
- `stopped`

Vendor event detail can be preserved in raw logs.

## 5. Claude Code adapter

Preferred automation mode: non-interactive print mode with structured output where supported.

Implementation requirements:

- executable detection;
- use file-based mission input when practical;
- restrict allowed tools/permissions according to mission;
- request final JSON matching handoff schema when supported;
- do not enable broad bypass/danger flags by default;
- preserve Claude's project-local instructions;
- expose MCP configuration for workbench tools.

The adapter must tolerate CLI version differences and report detected capabilities rather than assuming every flag exists.

## 6. Codex adapter

Preferred automation mode: `codex exec` non-interactive operation with machine-readable event output when available.

Requirements:

- respect `AGENTS.md` hierarchy in target repository;
- consume project-scoped skills where supported;
- parse JSONL events into coarse run events;
- preserve MCP tool calls in raw trace;
- do not expose reasoning events in human-facing UI;
- use configured sandbox/approval policy rather than automatically disabling safeguards.

## 7. Hermes adapter

Preferred mode: finite one-shot query using a prompt/query file.

Requirements:

- detect Hermes project context file rules;
- use project-local skills when trusted;
- support MCP connections;
- if structured final output cannot be enforced natively, require Hermes to write `result/handoff.json` and validate it after process completion;
- expose subagent activity only as coarse worker/status cards unless user expands.

## 8. Cross-agent skills

Canonical skill source lives in `.agents/skills/` using the open Agent Skills-style layout.

`scripts/sync_skills.py` mirrors skills to agent-specific locations when needed:

- Claude Code: `.claude/skills/`
- Codex: `.agents/skills/`
- Hermes: `.agents/skills/` and/or trusted Hermes project skill location as detected.

Do not manually maintain divergent prompt copies.

## 9. MCP server

The workbench exposes a local MCP server that is safe by construction.

### Read tools

- `workspace_status`
- `project_list`
- `project_get`
- `object_search`
- `object_get`
- `relation_get`
- `artifact_list`
- `review_queue`
- `run_status`

### Proposal-only mutation tools

- `proposal_create`
- `proposal_add_operation`
- `proposal_attach_evidence`
- `proposal_submit`
- `artifact_register_proposal`

There is **no generic write-file or accept-proposal tool** exposed to agents in v0.1.

Acceptance remains a human/UI/local action.

## 10. Context budgeting

Agents should receive enough context to perform the mission, not the entire project universe.

Priority order:

1. direct mission contract;
2. target object and current accepted decisions;
3. relevant source/evidence route;
4. adjacent relations;
5. project-specific rules;
6. broader historical material only when requested.

A mission packet records included object IDs so a later reviewer can see what the worker actually had available.

## 11. Agent disagreement

When two agents disagree:

- preserve each result as candidate evidence/proposal;
- compare evidence and acceptance criteria;
- do not synthesize fake consensus;
- route to human Review or independent Reviewer;
- accepted decision records why one route was chosen.

## 12. Failure behavior

An agent crash, malformed output, timeout, or partial change must never mutate canonical state automatically.

Partial implementation worktree remains inspectable and can be:

- resumed;
- reviewed;
- preserved as residue;
- discarded explicitly.
