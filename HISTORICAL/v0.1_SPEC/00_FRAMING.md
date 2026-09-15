# 00 — Framing: From Transcript-Centric AI to an Interface for Work

## 0.1 Problem statement

Contemporary agentic systems are capable of reading large corpora, modifying software, researching, writing, testing, and coordinating subagents. Their most common human interface remains a sequential stream: prompt, response, prompt, response. Terminal-based harnesses intensify this by adding raw execution logs, file paths, commands, and transient process state to the same perceptual channel.

For Mozare's work this causes a specific failure. The projects themselves are not linear. They contain simultaneous and partially independent layers:

- artistic material and sensory form;
- research questions and theoretical frames;
- sources and provenance;
- claims and uncertainty;
- methodologies and experiments;
- design rationale and concrete interface decisions;
- technical architecture and implementation;
- testing, review, release, and historical traces.

Flattening these into a conversation makes the transcript carry too many functions at once: archive, interface, task manager, explanation, state, decision log, implementation log, and final artifact. The result is high textual abundance and low project visibility.

The workbench therefore starts from a different premise:

> **Conversation is a control channel. The project is the interface object.**

## 0.2 Interface as epistemic infrastructure

The system treats interface design as part of knowledge production rather than presentation polish. A representation changes what can be seen, compared, manipulated, remembered, and questioned.

The design therefore uses several simultaneous but non-equivalent surfaces:

- **Field** exposes objects and relations.
- **Focus** constrains attention to the current question/object/next action.
- **Flow** exposes process, dependencies, and transition state.
- **Review** exposes proposed change, evidence, and consequences.
- **Output** exposes actual artifacts.

No one view claims to be the project itself. Each is a projection over canonical state.

This mirrors a core Mozare Wiki principle: authoritative Markdown/records remain primary while graphs, views, indexes, and maps are generated and replaceable.

## 0.3 Design inheritance from Mozare's existing practice

The workbench should feel structurally continuous with Mozare's actual works rather than imported from generic productivity software.

### TAROKE RIMIXER: visible constraint + authoritative project state

TAROKE RIMIXER exposes the machinery of a poem-machine through named chambers—Source, Samples, Forms, Devices, Stanza, Flow, Triggers, Surface, Run, Notes, Export—while keeping an authoritative editable project representation separate from the generated playable artifact. The workbench adopts this pattern:

- project state is inspectable and editable;
- constraints are visible;
- the produced artifact remains distinct from its apparatus;
- a generated experience can be rebuilt from durable project state.

### The Black Bird Field: canonical source, lab history, semantic content, generated output

The Black Bird repositories distinguish released work, development lab, semantic content, generated distribution, tests, and documentation. The workbench adopts this separation rather than treating “latest chat” as the authoritative state.

### Mozare Wiki: evidence grammar, relation-object, visible genesis

The Wiki contributes four essential moves:

1. **Authority hierarchy:** original and verified evidence outrank generated interpretation.
2. **Relation before classification:** a connection may be preserved before its type is settled.
3. **Use-status separated from truth-status:** a relation may be poetically generative while scholarly assertion remains blocked.
4. **Visible genesis:** selected operations and revisions remain inspectable without demanding total exposure of every internal trace.

The workbench generalizes these beyond scholarship. A product decision, interface experiment, artwork relation, technical architecture choice, or writing revision can all carry provenance, uncertainty, and history.

## 0.4 Human role

The human is not the terminal operator for an autonomous engineering team. The human is the principal investigator / artist / product owner who must remain able to:

- understand what the project currently is;
- see the space of possible next moves;
- judge whether an agent transformed the right object;
- inspect evidence and consequences;
- give feedback at an appropriate level of abstraction;
- descend into technical detail when necessary;
- recover and continue work after days or weeks without rereading long transcripts.

The interface therefore privileges **orientation and judgment** over continuous observation of agent activity.

## 0.5 Progressive technical disclosure

Technical work must remain technically rigorous while becoming intelligible at multiple resolutions.

Every consequential technical result is represented as a ladder:

```text
INTENT
What human/project behavior are we trying to enable?
   ↓
SYSTEM BEHAVIOR
What should happen between actors/components?
   ↓
ARCHITECTURE
What components, boundaries, states, and data flows implement it?
   ↓
IMPLEMENTATION
What files/code/config actually changed?
   ↓
VERIFICATION
What evidence shows the behavior works?
```

The UI opens at the first two levels. Architecture is one action away. Code and logs are deeper details.

A technical term should appear with a short system-level explanation, for example:

```text
NetworkRequest
→ Android mechanism used to ask the OS for a network matching certain conditions.
Why it matters here: it is the joiner's request to reach the local peer network.
```

This is not “dumbing down” engineering. It is a second representation over engineering evidence.

## 0.6 Bounded aperture

The workbench intentionally constrains what is visible at once.

Default surfaces should answer a small number of questions:

- Where am I?
- What exists around this work?
- What changed?
- What is blocked?
- What needs my judgment?
- What can I inspect or experience now?

Details are recoverable but not ambient.

The generative constraint is important: an interface that refuses to show everything simultaneously forces the system to distinguish current state from historical trace, evidence from interpretation, and actionable change from background material.

## 0.7 Design principles

### P1 — State before narration
Show project state before explaining it in prose.

### P2 — Objects before transcripts
Promote questions, sources, claims, decisions, artifacts, tasks, tests, and relations to persistent objects.

### P3 — Relations are inspectable objects
Do not reduce every relation to a bare graph edge.

### P4 — Authority is explicit
Generated views and AI summaries never silently replace source material.

### P5 — Human judgment has a queue
There must be one visible place for items requiring human review.

### P6 — Agents work underneath the interface
Claude Code, Codex, Hermes, and future harnesses are execution adapters, not competing project universes.

### P7 — Durable state is vendor-neutral
A project must remain intelligible from files and Git if every AI/UI integration disappears.

### P8 — Every layer earns its existence
Apply the research-through-design “minimum apparatus” test. Remove surfaces and abstractions that do not measurably improve orientation, action, review, or recovery.

### P9 — Work and instrument remain distinct
The artwork/article/product is not the same object as the system used to construct it.

### P10 — Completion requires evidence
An agent's assertion is not verification. Tests, diffs, rendered artifacts, or source evidence determine verified status.

## 0.8 What v0.1 deliberately does not solve

- total personal knowledge management;
- all historical migration;
- perfect automatic ontology induction;
- automatic assessment of artistic quality;
- autonomous merging of agent work;
- replacing specialist tools for coding, audio, image, or document editing;
- universal multi-user collaboration;
- remote/cloud operation.

v0.1 must establish a reliable human/agent interface loop first.
