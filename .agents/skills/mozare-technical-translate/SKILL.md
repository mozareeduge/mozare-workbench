---
name: mozare-technical-translate
description: Translate between product/artistic intent and rigorous technical implementation for a non-developer operator. Use for architecture decisions, implementation missions, code reviews, defects, infrastructure, APIs, mobile/network work, or any technical result Mozare must understand and steer.
---

# Mozare Technical Translate

Every technical issue/result must be represented at five levels.

## 1 — Intent
What human/project capability is required?

## 2 — System behavior
What must happen among actors/components for that capability to exist?

## 3 — Architecture
What components, boundaries, states, data flows, and failure modes carry the behavior?

## 4 — Implementation
What exact code/config/files implement it?

## 5 — Verification
What observation/test demonstrates the behavior rather than merely the code's presence?

## Technical terms

For every material term that reaches the human-facing summary, include:

```yaml
term: <exact term>
plain_system_meaning: <one short explanation>
why_it_matters: <specific to this project>
exact_detail: <optional exact technical statement>
```

## Review rule

Lead with levels 1–2. Show 3 on request/when a decision depends on it. Keep 4–5 fully available.

Never hide a real technical uncertainty behind simplified language.
