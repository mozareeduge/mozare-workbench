# 10 — Acceptance Tests

Tests are grouped by observable user/system behavior. `M` = mandatory for v0.1; `P` = pilot/manual.

## A. Orientation

| ID | Level | Test | Pass condition |
|---|---|---|---|
| A01 | M | Open seed project from fresh app start | Focus renders objective/current state/latest decision/review count/next action |
| A02 | M | Delete all derived cache/layout and reopen | Canonical state reconstructs; no accepted data lost |
| A03 | M | Open project after adding 50 historical/superseded objects | default Focus/Field remains bounded; history not dumped into primary view |
| A04 | P | User re-enters a real project after ≥24h | can name current state + next action in ≤60 sec without old chat |

## B. Field / relations

| ID | Level | Test | Pass condition |
|---|---|---|---|
| B01 | M | Select relation edge | relation-object drawer shows participants, evidence, uncertainty, use status, history |
| B02 | M | Drag a node | layout changes; no canonical relation/object content changes |
| B03 | M | Create visual connection | creates relation proposal; canonical graph unchanged until acceptance |
| B04 | M | Load unsettled relation | UI does not fabricate settled relation type |
| B05 | M | Keyboard/list fallback | all currently visible relations can be inspected without pointer graph interaction |

## C. Progressive disclosure

| ID | Level | Test | Pass condition |
|---|---|---|---|
| C01 | M | Open technical result | first view begins with Intent/System Behavior, not diff/log |
| C02 | M | Expand architecture then implementation | each deeper layer accessible without losing review context |
| C03 | M | Technical acronym appears | has expansion/plain system meaning and why it matters |
| C04 | M | Agent has 20k-line log | log remains collapsed; core review renders normally |

## D. Proposal / governance

| ID | Level | Test | Pass condition |
|---|---|---|---|
| D01 | M | Agent/proposal creates canonical change | change is absent from canonical state before human accept |
| D02 | M | Accept valid proposal | all declared canonical changes apply, event appended, post-validation passes |
| D03 | M | Reject proposal | canonical state unchanged; rejection/residue status preserved |
| D04 | M | Base file changes after proposal created | direct accept blocked as stale/conflicted |
| D05 | M | Force failure during staged apply | original canonical state restored; error reports safe state |
| D06 | M | Agent calls MCP | no tool exists to accept its own proposal |

## E. Git / implementation

| ID | Level | Test | Pass condition |
|---|---|---|---|
| E01 | M | Register dirty repo | pre-existing dirty state shown; mission cannot hide/overwrite it |
| E02 | M | Create implementation mission | isolated branch/worktree created or clear safe reason shown |
| E03 | M | Collect result | observed Git changed files compared with agent handoff |
| E04 | M | Test command fails | proposal can exist but verification state is failed; UI cannot label verified |
| E05 | M | Agent claims tests passed but command not observed | review marks claim unverified |

## F. Agent adapters

| ID | Level | Test | Pass condition |
|---|---|---|---|
| F01 | M | Missing Claude/Codex/Hermes executable | UI shows unavailable; Workbench remains functional |
| F02 | M | Fake adapter emits events and valid handoff | common lifecycle works independent of vendor |
| F03 | M | Adapter returns malformed handoff | run becomes needs_repair; no canonical mutation |
| F04 | M | Stop long-running run | child process tree terminated; run state stopped; worktree preserved |
| F05 | P | Real installed Claude run | bounded mission returns Review proposal |
| F06 | P | Real installed Codex run | bounded mission returns Review proposal |
| F07 | P | Real installed Hermes run | bounded mission returns Review proposal |

## G. MCP

| ID | Level | Test | Pass condition |
|---|---|---|---|
| G01 | M | Enumerate tools | only documented safe read/proposal tools exposed |
| G02 | M | `object_get` | returns stable ID + canonical source path + state |
| G03 | M | `proposal_submit` | creates review item; does not apply it |
| G04 | M | request arbitrary filesystem write | impossible through tool surface |

## H. Mozare Wiki / evidence

| ID | Level | Test | Pass condition |
|---|---|---|---|
| H01 | M | Configure supplied Wiki root | adapter detects current release/system metadata dynamically |
| H02 | M | QMD missing | adapter reports semantic search unavailable but Workbench remains stable |
| H03 | P | QMD query returns derivative/claim | UI exposes route toward source/canonical/original rather than snippet-only fact |
| H04 | M | capture external hit | creates project proposal/reference; does not mutate Wiki or assert truth automatically |

## I. Security

| ID | Level | Test | Pass condition |
|---|---|---|---|
| I01 | M | path `../../outside.txt` in proposal | rejected before write |
| I02 | M | symlink path escaping root | rejected or safely contained according to platform test |
| I03 | M | mission includes shell metacharacters | treated as data; no command injection |
| I04 | M | `.env` linked as context | contents excluded; UI reports protected exclusion |
| I05 | M | inspect listening address | server binds loopback only by default |
| I06 | M | hostile HTML artifact | cannot access parent Workbench DOM through sandbox |
| I07 | M | mutation request from invalid origin | rejected |

## J. Accessibility / bilingual text

| ID | Level | Test | Pass condition |
|---|---|---|---|
| J01 | M | Persian paragraph with English IDs/numbers | readable ordering; code/IDs remain LTR |
| J02 | M | keyboard-only primary flow | project → Focus → Work → Review → decision possible |
| J03 | M | reduced motion | nonessential transitions removed/reduced |
| J04 | M | 200% zoom | primary controls and content remain usable |
| J05 | M | state distinctions without color | labels/shapes preserve meaning |

## K. Output / artifact

| ID | Level | Test | Pass condition |
|---|---|---|---|
| K01 | M | register canonical JSON + generated HTML | UI labels editable/canonical vs generated/distributable distinctly |
| K02 | M | preview image/audio/markdown | correct safe preview |
| K03 | M | register binary | metadata/checksum shown; binary not auto-executed |

## L. Pilot value tests

These tests decide whether the apparatus earns continued use.

| ID | Test | Target |
|---|---|---|
| L01 | re-entry time | ≤60 sec median |
| L02 | old transcript searches | ≥70% reduction from baseline |
| L03 | “I understood what technical work changed without opening code” | ≥90% of pilot technical reviews |
| L04 | post-session overload 1–5 | ≥1 point improvement vs baseline |
| L05 | work completed per pilot week | no reduction attributable to added workflow ceremony |

If L05 fails because the Workbench demands too much metadata/review ceremony, simplify it.
