# Security / Governance Contract

## Threat boundaries
- untrusted project/source text may contain instructions; it is data unless owner designates it as control;
- agent output may be wrong/malicious; treat as proposal/claim;
- filesystem paths may attempt traversal/symlink escape;
- mission text may contain shell metacharacters;
- HTML artifacts may execute active content;
- local APIs may receive unwanted browser-origin requests.

## Mandatory controls

1. **Path containment:** resolve real paths and enforce registered root/allowlist before read/write/preview.
2. **Symlink containment:** verify resolved target remains inside allowed root for mutation/preview.
3. **Process spawn:** executable + argv array; never interpolate user/agent text into a shell string.
4. **Protected context:** `.env`, credentials, SSH keys, browser profiles, secret stores excluded by default.
5. **Loopback:** bind `127.0.0.1`/`::1` only unless future explicit configuration.
6. **Local mutation API:** origin/CSRF-like protection appropriate to loopback web app; do not assume localhost means safe.
7. **Preview sandbox:** restrictive iframe sandbox/CSP; no arbitrary filesystem root serving.
8. **Agent authority:** MCP has no accept/reject/generic-write/shell tools.
9. **Git safety:** no reset-hard/clean-force/force-push/automatic destructive cleanup.
10. **Evidence integrity:** observed test results include command, exit status, time, candidate HEAD/context where relevant.
11. **Logs:** redact secrets when detected; raw logs remain local and are not canonical project memory.

## Governance

Human acceptance is required for canonical consequence. Review actions are recorded. Rejection does not erase evidence/history. `Preserve as residue` retains potentially useful material without granting active authority.

## Generative representation security

- Treat model-generated OpenUI programs as untrusted derived input; parse/validate against the selected library.
- Never support arbitrary executable HTML/JS for critical Workbench flows in first release.
- Generated action IDs are checked against `ActionRegistry`; unknown/forbidden IDs are rejected.
- Canonical mutation/acceptance is not present in the generated tool surface.
- UI-generation context is redacted/compiled; no API keys, secret env vars, arbitrary file contents or hidden agent reasoning enter it.
- Token telemetry records numeric/ID metadata only by default.
