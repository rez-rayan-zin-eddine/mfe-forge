# ADR 0001: manifest and config roles

`mfeforge.config.*` is the human-authored policy layer. `mfe-forge.manifest.json` is generated, machine-readable topology used by diagnostics and sync. Keeping these roles separate avoids treating filesystem scanning as the only source of truth.
