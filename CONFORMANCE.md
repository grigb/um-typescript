# Conformance

This repo includes a command-mode adapter and runner wrapper under:

- `tests/conformance/adapter.mjs`
- `tests/conformance/run-conformance.mjs`

## Run

```bash
npm run conformance
```

The wrapper searches for conformance root in this order:

1. `UM_CONFORMANCE_ROOT`
2. `./conformance` (bundled snapshot used by CI)
3. `../universalmanifest/conformance` (developer fallback for sibling workspace setups)

## Explicit Root Example

Use this when the suite is not in the default sibling location:

```bash
UM_CONFORMANCE_ROOT=/Users/grig/work/repo/universalmanifest/conformance npm run conformance
```

## Output

Runner output is written to:

- `tests/conformance/conformance-report.json`

The wrapper forwards the external runner exit code, so CI can fail on conformance regressions.
