# Agent Adapter Baselines — verified 2026-09-15

These are **implementation baselines, not product authority**. Every adapter must probe the installed executable/version/help before enabling a capability.

## Shared adapter contract

1. Save the compiled mission packet to a run-local file under `.mozare/runtime/runs/<run-id>/`.
2. Spawn executable + argv array with an explicit working directory; never build a shell command string from mission/user text.
3. Prefer stdin or a prompt-file route over placing a large mission in the process command line.
4. Treat CLI stdout/session events as diagnostics. The durable completion contract is the Workbench handoff file validated against `config/handoff.schema.json` plus independently observed Git/filesystem/test evidence.
5. If an advertised permission/sandbox/structured-output capability fails a harmless probe, downgrade that capability to `PARTIAL`/`UNAVAILABLE`; do not infer it from CLI version alone.

## Claude Code baseline

Current documented non-interactive path:

```text
claude -p --output-format json
```

Text can be supplied through stdin. Use the worktree as cwd and keep permissions explicit. JSON output can drive run status/diagnostics, but successful final ingestion still requires the schema-valid handoff file and independent evidence.

## Codex baseline

Current source supports headless `codex exec`, JSONL events, stdin prompt behavior, and `--output-schema` on top-level exec. Use stdin (`codex exec - ...`) or a prompt file/wrapper rather than a long positional mission.

Important current safeguards:

- do not make `--output-schema` the only correctness barrier; recent Codex CLI issue reports show edge cases around structured output with tools/intermediate messages;
- on native Windows, capability-probe actual `workspace-write` behavior before claiming writable sandbox support; recent reports show versions/configurations where the requested writable sandbox behaved read-only;
- Workbench's registered path, isolated worktree, proposal boundary, handoff validation and observed evidence remain the security/correctness boundary even when Codex sandboxing works.

## Hermes baseline

Current official CLI provides one-shot execution through:

```text
hermes chat -q "..."
```

It also supports project/context files and skills. Prefer a short query directing Hermes to the run-local mission file rather than embedding the complete mission in argv. Detect provider/model/tool availability through the installed Hermes configuration; absence must become an adapter capability state rather than a Workbench startup failure.

## Capability probes required before `AVAILABLE`

- executable/version/help works;
- harmless read-only mission works in the selected cwd;
- for coding/mutation capability: disposable worktree write probe succeeds and cannot write outside the registered root;
- stop/termination path is observed;
- expected handoff file can be produced and validated;
- restart/reconcile test produces truthful durable status.
