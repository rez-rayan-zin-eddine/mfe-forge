# ADR 0002: operational Agent OS

## Decision

Use one canonical repository contract with thin tool-specific adapters, invariant rules, and procedural skills. Skills must have explicit inputs, procedure, verification, and artifacts.

## Rationale

Duplicated instructions drift. A layered contract lets Codex, Claude Code, and Antigravity share repository invariants while retaining small tool-specific habits. Explicit verification and handoff formats make autonomous work auditable.

## Consequences

New workflows belong in `.agents/skills/`; durable architecture knowledge belongs in `docs/ai/decisions/`. Adapters should link to the canonical contract rather than copy it.
