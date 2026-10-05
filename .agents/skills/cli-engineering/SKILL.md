# CLI engineering

## When to use

Adding or changing commands, flags, output, config, or exit behavior.

## Inputs and context required

Command definition, project context, output mode, and failure cases.

## Procedure

1. Reuse shared context and utilities. 2. Define human/JSON/quiet semantics. 3. Validate inputs before mutation. 4. Use typed errors and non-zero exits. 5. Test success, failure, and idempotent reruns.

## Verification

CLI type-check/build, command help, focused command tests, and JSON parse validation.

## Expected artifacts

Command implementation, tests, help/docs updates, and exit-code evidence.
