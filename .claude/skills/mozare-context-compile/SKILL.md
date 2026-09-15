# mozare-context-compile

Use whenever a mission/model call needs project context.

1. Identify operation class + role profile.
2. Start from current authority/snapshot/delta, not chat history.
3. Compile L0/L1/L2 records, acceptance/oracles and protected neighbors using `CONTEXT/context-policy.yaml`.
4. Deduplicate canonical refs and use valid checksum-bound capsules/excerpt refs.
5. Enforce target/hard budget. Never silently drop required authority/evidence.
6. If insufficient, expand specific handles or escalate/batch with a recorded reason.
7. Emit a schema-valid ContextPack + expansion handles + metrics.
8. Do not use a model for deterministic compaction/routing that code can perform safely.
