# Security policy

## Supported versions

| Version                                     | Supported |
| ------------------------------------------- | --------- |
| `0.x` (latest minor)                        | ✅        |
| `2.x`–`8.x` (deprecated prototype releases) | ❌        |

Before 1.0, security fixes ship only on the latest `0.x` minor release.

## Reporting a vulnerability

Please **do not open a public issue** for security problems.

Report privately through [GitHub private vulnerability reporting](https://github.com/rez-rayan-zin-eddine/mfe-forge/security/advisories/new). Include:

- the affected package(s) and version(s),
- a description of the issue and its impact,
- steps or a minimal project to reproduce it.

You can expect an acknowledgement within 3 business days and a status update within 10 business days. Once a fix is released, we publish a GitHub security advisory and credit the reporter unless they ask otherwise.

## Scope

In scope: the published packages (`mfe-forge`, `@mfe-forge/*`) and the project templates they generate. Out of scope: vulnerabilities in third-party dependencies that are already publicly tracked upstream (we still welcome a heads-up if a release is needed to pick up a fix).
