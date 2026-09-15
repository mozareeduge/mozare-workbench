# 12 — Traceability Matrix

This matrix begins as a design contract. The implementation agent must replace `TBD` evidence with actual test/report paths as milestones complete.

| Req | Requirement | Primary design source | Implementation locus | Verification |
|---|---|---|---|---|
| R01 | Canonical state survives UI/cache loss | Data Model §1–2 | workspace engine | A02 / TBD |
| R02 | Home is project state, not empty chat | Product §5; UI §2 | web shell | A01 / TBD |
| R03 | Relation can exist before settled type | IA §3 | relation model + Field | B01,B04 / TBD |
| R04 | AI consequential changes are proposals | Data §10; Agents §3 | proposal service | D01,D02 / TBD |
| R05 | Agent cannot self-accept | Governance §6; Agents §9 | MCP/API | D06,G01 / TBD |
| R06 | Review starts at human/system effect | UI §6 | Review view | C01 / TBD |
| R07 | Code/logs progressively disclosed | UI §6,10 | Review/run detail | C02,C04 / TBD |
| R08 | Technical terms translated | Framing §0.5; UI §8 | System panel | C03 / TBD |
| R09 | External source authority preserved | IA §4; Integrations §2 | evidence adapter | H03 / TBD |
| R10 | Git missions isolated | Architecture §9 | worktree manager | E02 / TBD |
| R11 | Agent assertions independently checked | Agents §3.7 | evidence collector | E03–E05 / TBD |
| R12 | Cross-agent common mission model | Agents §4 | adapters | F02 / TBD |
| R13 | Safe MCP read/proposal surface | Agents §9 | MCP server | G01–G04 / TBD |
| R14 | Local services loopback-only | Security §2,10 | server | I05 / TBD |
| R15 | No shell-string injection | Security §4 | process manager | I03 / TBD |
| R16 | Protected secrets excluded | Security §7 | context builder | I04 / TBD |
| R17 | Bilingual mixed text robust | UI §12 | renderer/components | J01 / TBD |
| R18 | Work/artifact vs instrument distinction | Framing P9; IA §7 | artifact/project model | K01 / TBD |
| R19 | Mozare Wiki retains its own controller authority | Integrations §2 | wiki adapter | H01,H04 / TBD |
| R20 | Tana not required for recovery | Framing P7; Integrations §10 | optional adapter | A02 / TBD |
| R21 | Raw transcripts are not canonical memory | Data §11; UI §10 | runtime/log policy | C04 / TBD |
| R22 | Field layout is derived | UI §3; Data §2 | view state | B02,A02 / TBD |
| R23 | Artifact previews are safe | Architecture §10; Security §9 | preview service | I06,K02 / TBD |
| R24 | Pilot apparatus must prove value | Product §9; Acceptance L | pilot report | L01–L05 / TBD |
