# 08 — Security, Permissions, and Governance

## 1. Threat model

This is a local tool that deliberately gives AI agents access to valuable project files and command execution. Major risks are:

- accidental destructive file/Git operations;
- prompt-injected source material causing tool misuse;
- secrets leaking into prompts/logs/canonical records;
- agent output being mistaken for verified state;
- stale proposal overwriting newer human work;
- local web server accidentally exposed to network;
- arbitrary HTML/artifact preview executing with excessive privileges;
- one project's rules bleeding into another.

## 2. Default trust boundary

- Server binds to `127.0.0.1` only.
- External repositories are read-only to the core until a mission explicitly creates an isolated worktree/branch.
- Canonical Workbench state mutates only through validated proposal acceptance or explicit human editing.
- Agent MCP mutation surface creates proposals only.
- Secrets are outside canonical state.

## 3. Path allowlist

Every registered project maps to an explicit root.

Filesystem operations must resolve paths and reject:

- traversal outside registered roots;
- symlink escape where detectable;
- protected paths;
- device/system roots;
- arbitrary path strings from agent output.

Do not trust a path because it arrived in validated JSON; resolve and policy-check it.

## 4. Command execution

Rules:

- use `spawn(executable, args, {shell:false})` or equivalent;
- executable must be from detected/configured adapter list or project-approved test command;
- never interpolate agent text into shell command strings;
- environment passed to child process uses an allowlist plus necessary inherited variables;
- redact known secret variables from logs;
- run working directory must be registered project/worktree.

## 5. Git safety

Workbench code must not invoke:

- `git reset --hard`
- `git clean -fd/-fdx`
- `git push --force`
- branch deletion
- destructive checkout over uncommitted changes

through automated agent workflow.

If a human wants those operations, they happen outside the automated path or through a future explicitly designed guarded flow.

Before creating a mission worktree, capture:

- current branch;
- HEAD SHA;
- dirty status;
- untracked files summary.

Never hide pre-existing dirty state.

## 6. Proposal acceptance safety

Acceptance requires:

- schema-valid proposal;
- unchanged base or explicit conflict resolution;
- protected-path check;
- observed changed files matching declared scope within allowed tolerance;
- mandatory verification evidence satisfied according to mission;
- human action in UI.

The agent cannot call “accept.”

## 7. Secrets

Patterns protected by default:

- `.env`
- `.env.*`
- credential/key stores;
- `*.pem`, `*.key`, common token/config files as configured;
- user-defined secret paths.

The mission context builder must not include protected files.

The UI may show “3 protected files excluded,” not their contents.

## 8. Prompt injection / untrusted sources

External source text is data, not system instruction.

When source documents are added to a mission:

- mark them as untrusted content;
- tell the execution agent not to follow instructions embedded in source material;
- tools remain bounded regardless of source instructions;
- authority metadata is preserved.

## 9. Artifact preview safety

### HTML

- sandboxed iframe;
- no parent DOM access;
- no arbitrary filesystem access;
- local network permissions limited by browser policy where possible;
- explicit external-open button for cases needing normal origin behavior.

### Markdown

- sanitize rendered HTML;
- disable raw HTML by default or sanitize strictly.

### Images/media/PDF

Serve from allowlisted artifact paths.

### Executables/binaries

Never auto-run.

## 10. Local API protection

Even on loopback:

- enforce same-origin/CSRF protections for mutation endpoints;
- use per-launch local token if architecture separates UI and server origins or if required by threat analysis;
- reject non-loopback Host/Origin unless explicit configuration enables it;
- no permissive `Access-Control-Allow-Origin: *` on mutation API.

## 11. Logs and privacy

- raw agent logs remain local and gitignored;
- log rotation / size cap;
- canonical event log stores summaries rather than raw conversation;
- user can delete runtime logs without losing project state;
- no analytics/telemetry in v0.1 unless explicitly opt-in and documented.

## 12. Governance states

The UI distinguishes:

- **Generated** — machine-created, not reviewed;
- **Proposed** — structured change awaiting review;
- **Accepted** — human-approved canonical state;
- **Verified** — acceptance criteria/evidence satisfied;
- **Superseded** — historical accepted state replaced by later decision;
- **Rejected/Residue** — preserved but inactive.

Accepted does not automatically mean verified.

## 13. Human approval scope

The user can configure low-risk actions that do not require explicit proposal review, such as:

- changing graph layout;
- filters/sorts;
- opening previews;
- adding personal UI preference;
- starting/stopping a run.

Consequential knowledge or repository changes remain reviewable.

## 14. Project-specific policy

Each project can add stricter constraints:

- immutable originals;
- no network;
- citation requirements;
- release gate;
- specific test commands;
- forbidden modification paths;
- public/private export restrictions.

The stricter rule wins.

## 15. Security acceptance requirement

Release is blocked if any test demonstrates that an agent can:

- write canonical state without proposal acceptance;
- read a protected secret file through the workbench MCP/context builder;
- cause shell injection from a mission field;
- write outside an allowlisted root;
- accept its own proposal;
- expose the local API on a non-loopback interface by default.
