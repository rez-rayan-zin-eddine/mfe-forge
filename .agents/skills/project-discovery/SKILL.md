# Project discovery

## When to use

Topology, repository orientation, or unfamiliar package work.

## Inputs and context required

Repository root, task scope, current git status, relevant config/manifest.

## Procedure

1. Read AGENTS.md and relevant rules. 2. Inspect git status and package scripts. 3. Read the manifest if present. 4. Reconcile manifest, config, package metadata, and filesystem. 5. Record contradictions and affected packages.

## Verification

Run `status --json`, focused discovery tests, and `git diff --check` if edits occurred.

## Expected artifacts

Evidence summary, affected-file list, assumptions, and topology diagnostics.
