# Testing and verification

## When to use

After implementation or when diagnosing regressions.

## Inputs and context required

Changed areas, package scripts, environment constraints, and expected behavior.

## Procedure

1. Run focused tests. 2. Run type-check. 3. Run build/lint as relevant. 4. Classify failures as caused, pre-existing, or environmental. 5. Run final diff check.

## Verification

Exact command output or concise pass/fail record; never inferred status.

## Expected artifacts

Verification matrix and known failures with causes.
