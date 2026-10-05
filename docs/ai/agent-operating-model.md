# Agent operating model

MFE Forge uses three layers:

1. **Agent OS:** `AGENTS.md`, rules, skills, adapters, and handoff conventions.
2. **Project OS:** manifest, config, discovery, diagnostics, sync, and migrations.
3. **Runtime OS:** remote registry/loading, event bus, store, router, and health behavior.

Agents should move through these layers deliberately. A runtime change may require a project contract or docs update; a CLI change should expose machine-readable state when agents need to inspect it.

## Task lifecycle

```text
intake → discovery → design → implementation → verification → review → handoff
```

Each phase has a stopping rule: discovery stops when affected files and contradictions are known; implementation stops when acceptance behavior exists; verification stops when relevant checks are classified; review stops when no unresolved high-severity finding remains.

## Evidence standard

A claim is supported by source, a test, command output, or an explicitly labeled assumption. “Looks correct” is not verification. External state such as GitHub CI is reported separately from local checks.

## Handoff standard

Every agent handoff reports outcome, changed areas, verification, risks/limitations, and next steps. Follow-up agents should receive the smallest useful context rather than a full transcript.
