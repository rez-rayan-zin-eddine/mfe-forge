# Template engineering

## When to use

Init, generate, fixture projects, or template synchronization.

## Inputs and context required

Template source, variables, package scripts, and expected generated topology.

## Procedure

1. Identify every rendered file. 2. Keep template config aligned with runtime contracts. 3. Generate a temporary host/remote fixture. 4. Install/type-check/build/test/sync where feasible. 5. Remove only temporary fixtures.

## Verification

Fixture integration flow and generated-file inspection.

## Expected artifacts

Template changes, fixture evidence, and documentation updates.
