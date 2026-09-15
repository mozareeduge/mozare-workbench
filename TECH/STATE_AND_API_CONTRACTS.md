# State and API Contracts

## Canonical record versioning
Every canonical schema-bearing record should include or inherit `schema_version`. Migration must be explicit and testable. Never silently rewrite unknown future schema versions.

## Optimistic concurrency
Proposal base includes workspace revision + affected record hashes + repo HEAD where applicable. Acceptance compares current values. Mismatch yields `STALE`, never best-effort partial apply.

## Atomicity
For multi-file Workbench mutation, stage all changed files and validate the staged affected workspace. Commit/replace only after validation. On failure restore originals and produce recovery receipt.

## Artifact identity
At minimum: stable artifact ID, kind/MIME, path/ref, canonicality, source mission/object, hash when local immutable output, verification refs, created timestamp.

## Test evidence
Observed evidence record includes `candidate_id`, `command`/method, `exit_code` or observation result, timestamp, evidence path/ref, and provenance `VERIFIED_CANDIDATE|CLAIMED_CANDIDATE|UNKNOWN`.

## UI projection never becomes source authority
No endpoint may accept a graph coordinate, collapsed state, filter or AI summary as semantic object/relation mutation unless it is transformed into an explicit user action/proposal.

## v0.3 state authority additions

| Fact | Authority |
|---|---|
| context policy/model route config | versioned local configuration |
| compiled context pack | durable run input record, derived from canonical/external refs |
| capsule | derived cache bound to fingerprints |
| context snapshot/delta | reproducible derived metadata |
| representation plan/program | ephemeral/derived cache |
| token metrics | local run telemetry |

Generated UI programs and summaries are never promoted to accepted decisions or source evidence without explicit capture/proposal workflow.
