# Grounding and Technical References

This handoff was produced from three layers: Mozare's supplied Wiki releases/controller, direct inspection of Mozare's public GitHub repositories, and current official/current technical documentation for the agent/tool integration surface.

## A. Supplied Mozare Wiki material

Local source package inspected:

- `Mozare_Wiki_Controller_v2.1.0(1).md`
- `Mozare_Wiki_Release_v1.4.0_FULL(1).zip`

Key files used after extracting the Wiki release:

- `SYSTEM_DESIGN.md`
- `CLAUDE.md`
- `SEARCH_GUIDE.md`
- `GPT_WORKFLOW.md`
- `_system/` schemas/manifests where relevant
- relation-object concept note
- graphesis concept note
- visible-genesis concept note
- capta concept note
- scenography-to-interface-architecture method note
- research-through-design method note
- Grave-Machine work record
- works and concepts/methods indexes

### Concepts directly carried into Workbench

- authoritative records > generated views;
- immutable originals and additive history;
- source/derivative/canonical distinctions;
- relation-object richer than graph edge;
- evidence state separated from use status;
- uncertainty/counterevidence preserved;
- visible genesis as selective process trace;
- interface/graphical arrangement as epistemically consequential;
- minimum-apparatus test;
- transaction-safe proposal/validation pattern;
- bounded context and compact handoff rather than corpus dumping.

## B. Mozare GitHub repositories directly inspected

Public account: `https://github.com/mozareeduge`

Directly inspected during this handoff:

### `mozareeduge/the-black-bird-field`

README establishes:

- portfolio for five browser-native works;
- semantic `content/` separated from build/rendering;
- generated `dist/` is not committed;
- static/browser test suites;
- explicit repository map distinguishing portfolio, canonical source archives, development lab, and active construction.

### `mozareeduge/taroke-remixer`

README establishes:

- local-first browser workbench;
- visible constraint chambers;
- authoritative editable project JSON;
- generated standalone HTML artifact;
- browser-local autosave distinct from archive;
- embedded preview;
- legacy checkpoint with extensive tests;
- current live app and archive separation.

### `mozareeduge/black-bird-lab`

README explicitly says development/experimental history is not the canonical released artwork and must not be cited as such.

### `mozareeduge/Ganjoor-Ontogrph`

README + `AGENTS.md` establish:

- local Markdown/QMD architecture;
- project-local index;
- exact/semantic collection separation;
- MCP exposure;
- explicit agent playbook;
- retrieval route from search hit to full source document;
- generated corpus/index state separated from upstream sources.

The seeded project registry also records the other public repositories found in the account on 2026-09-14, but they were not all microscopically inspected for this architecture pass.

## C. Agent/tool documentation checked for implementation viability

### Claude Code

Current documentation checked for:

- project `CLAUDE.md` memory/instructions;
- skills;
- subagents;
- hooks;
- MCP;
- non-interactive/programmatic execution;
- structured output / JSON schema support where available;
- permissions and diagnostics.

Primary documentation domain: `https://docs.anthropic.com/` / `https://code.claude.com/`

Implementation rule: capability-detect the installed CLI rather than assuming flags from this handoff remain identical forever.

### OpenAI Codex

Current documentation/source checked for:

- `AGENTS.md` scoped project instructions;
- non-interactive execution;
- MCP;
- skills;
- agents/subagents;
- project configuration.

Primary documentation/source domains: `https://developers.openai.com/codex/` and `https://github.com/openai/codex`

Implementation rule: capability-detect the installed CLI.

### Hermes Agent

Current official docs checked for:

- project context file precedence;
- project-local skills;
- MCP servers;
- non-interactive/one-shot execution;
- Codex MCP interoperability option.

Primary documentation: `https://hermes-agent.nousresearch.com/`

### Tana

Current docs checked for:

- remote MCP endpoint;
- external agent read/write/proposal behavior;
- Claude/Codex handoff;
- local Tana Outliner MCP path.

Primary documentation: `https://tana.inc/`

Tana is intentionally optional in this spec.

### MCP Apps

Official Model Context Protocol material checked for the 2026 MCP Apps extension: interactive UI components returned from MCP tools. This is retained as a Phase-2 option, not a v0.2 dependency.

Primary source: `https://modelcontextprotocol.io/` and official MCP blog.

## D. Open-source design references searched

Projects examined as reference patterns included local-first visual/graph/agent workspaces such as OpenGraph, OpenCanvas, Tuval, AFFiNE, and MCP-native context-graph projects.

They influenced the survey of possible interaction/graph approaches. None is made a mandatory runtime dependency because Mozare Workbench's critical state/review model should remain small, local, and controllable while these projects evolve.

## E. Explicit limits of this grounding pass

- The private canonical `mozare-wiki` GitHub repository was not accessed through GitHub; the supplied release package was the Wiki source inspected here.
- The public GitHub seed list was account-level discovery; only the repositories named in section B were directly read for architecture evidence in this pass.
- Tool CLIs evolve. The implementation must verify installed versions/capabilities during Milestone 0.

## F. v0.2 compiler controls supplied by the owner

v0.2 was revised against three explicit control documents, preserved byte-for-byte under `CONTROL/`:

- `01_PRODUCT_DESIGN_POSSIBILITY_SPACE_COMPILER_v1.1.md` — requires an authority map, product horizon, object/state/surface model, consequence-class scenarios, concrete UI/UX/responsive/accessibility/copy behavior, stable IDs, and design closure before implementation.
- `02_LLM_QA_AND_CLAUDE_QA_COMPILER_v1.1.md` — separates oracles/evidence/claims, freezes candidate and authority identity, requires candidate-bound proof, negative controls/canaries, and durable QA state.
- `03_EXECUTION_INTAKE_AND_LAUNCH_COMPILER_v1.1.md` — integrates product/design and QA authority with technical architecture, task DAG, release units, launch topology, execution safety, scope-fidelity audit, and honest terminal states.

These controls supersede v0.1's looser document structure. The previous v0.1 specification is retained only under `HISTORICAL/v0.1_SPEC/` for audit.

## v0.3 external implementation verification — 2026-09-15

Primary current sources checked for the adaptive representation layer:

- OpenUI repository: https://github.com/thesysdev/openui — compact streaming OpenUI Lang, framework packages, prompt generation from component libraries, streaming renderer, agent skill, token-efficiency benchmark claims.
- OpenUI Defining Components: https://www.openui.com/docs/openui-lang/defining-components — current `defineComponent` + `createLibrary` + Zod library contract and guidance to keep schemas flat/library small.
- OpenUI Queries & Mutations: https://www.openui.com/docs/openui-lang/queries-mutations — generated wiring to application tools executed by runtime.
- AG-UI repository/spec: https://github.com/ag-ui-protocol/ag-ui — event-based agent↔frontend state/tool/human-interrupt protocol; retained as optional adapter, not first-release dependency.

These sources support technical implementation choices only. They do not override Workbench product authority. The implementation agent must verify current installed package APIs before pinning dependencies.

## v0.3.1 implementation verification — 2026-09-15

External checks used only to pin volatile implementation baselines, not to change product authority:

- Node.js release status: Node 24 is LTS; Node 26 is Current on the verification date. First-release baseline is therefore Node 24 LTS.
- OpenUI docs: `defineComponent`, `createLibrary`, React Lang, and Zod v4 remain current documented APIs; runtime keeps deterministic fallback and does not require a cloud gateway for product authority.
- Claude Code docs: print mode (`claude -p`), JSON output and stdin piping are supported.
- Hermes docs: one-shot `hermes chat -q` is supported.
- Codex docs/repository: `codex exec`/JSONL/structured-output paths exist; capability probes remain mandatory because structured-output and native-Windows sandbox behavior have had version-specific issue reports.

See `EXECUTION/AGENT_ADAPTER_BASELINES.md` for the operational consequence: probe capabilities; trust Workbench evidence and authority boundaries rather than vendor CLI claims.
