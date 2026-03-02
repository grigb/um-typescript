# Universal Manifest Conformance Suite (Draft)

This directory packages Universal Manifest conformance fixtures and machine-readable expectations for external implementers.

The source of truth remains:
- `examples/v0.1/`
- `examples/v0.2/`

This package exposes those fixtures through a stable conformance layout.

## Fixture Packaging

Layout:
- `conformance/v0.1/valid/` -> valid v0.1 fixtures (root fixtures + `stubs/`)
- `conformance/v0.1/invalid/` -> invalid v0.1 fixtures
- `conformance/v0.2/valid/` -> valid v0.2 fixtures
- `conformance/v0.2/invalid/` -> invalid v0.2 fixtures
- `conformance/v0.1/expected.json` -> expected outcomes for all v0.1 fixtures
- `conformance/v0.2/expected.json` -> expected outcomes for all v0.2 fixtures

Packaging mode:
- Fixture files in `valid/` and `invalid/` are symlinked to `examples/` so the conformance package stays synchronized with canonical fixtures.

## Expected Results Schema

Each `expected.json` file contains:
- `suiteVersion`: conformance suite version label
- `specVersion`: target spec version (`0.1` or `0.2`)
- `fixtures`: array of expectation entries

Each fixture entry includes:
- `filename`: path relative to the version package (`valid/...` or `invalid/...`)
- `expectedResult`: `accept` or `reject`
- `reason`: human-readable test intent
- `category`: conformance bucket (for example `required-fields`, `ttl`, `signature`, `adversarial`)
- `specVersion`: `0.1` or `0.2`
- `conformanceLevel`: `baseline` or `extended`

Example entry:

```json
{
  "filename": "invalid/missing-signature.jsonld",
  "expectedResult": "reject",
  "reason": "Reject fixture: Missing signature.",
  "category": "signature",
  "specVersion": "0.2",
  "conformanceLevel": "baseline"
}
```

## Conformance Levels

Conformance levels used by this suite:
- `v0.1-baseline`: passes all v0.1 fixture expectations
- `v0.2-baseline`: passes all v0.2 baseline fixture expectations
- `v0.2-extended`: passes v0.2 baseline plus revocation-aware expectations

Entry-level `conformanceLevel` values (`baseline` or `extended`) are used inside `expected.json` to mark which fixtures belong to the extended lane.

## Report And Status Schemas

Machine-readable schemas:
- `conformance/schema/conformance-report.schema.json`
- `conformance/schema/conformance-status.schema.json`

These define the standard JSON formats for implementation test reports and hosted conformance status declarations.

## Badges

Badge assets:
- `conformance/badges/v0.1-baseline.svg`
- `conformance/badges/v0.2-baseline.svg`
- `conformance/badges/v0.2-extended.svg`

Typical usage:

```markdown
![UM conformance v0.2 baseline](./badges/v0.2-baseline.svg)
```
