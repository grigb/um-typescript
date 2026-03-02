# Universal Manifest Conformance Runner

Node ESM CLI runner for Universal Manifest conformance suites.

## What it does

- Loads expected manifests from:
  - `conformance/v0.1/expected.json`
  - `conformance/v0.2/expected.json`
- Resolves and loads fixture JSON for each expected entry.
- Invokes an adapter in one of two modes:
  - `command`: spawn adapter command, send fixture JSON on stdin, parse JSON stdout.
  - `http`: POST fixture JSON to adapter endpoint, parse JSON response.
- Compares adapter results to expected outcomes.
- Emits JSON report shaped for `conformance/schema/conformance-report.schema.json` fields.

## Adapter response contract

Adapter output must be JSON with at least:

```json
{
  "result": "accept",
  "reason": "validated"
}
```

Allowed `result` values:
- `accept`
- `reject`

Optional fields:
- `fixture` (string)
- `error` (string; used as fallback reason)

## Usage

From `/Users/grig/work/repo/universalmanifest/conformance/runner`:

Command mode:

```bash
node ./cli.mjs \
  --mode command \
  --adapter-command "node ../adapters/typescript/adapter.mjs" \
  --report ./conformance-report.json
```

HTTP mode:

```bash
node ./cli.mjs \
  --mode http \
  --adapter-endpoint http://127.0.0.1:8788/validate \
  --report ./conformance-report.json
```

## Useful options

- `--versions 0.1,0.2` (default)
- `--timeout-ms 15000`
- `--conformance-root /Users/grig/work/repo/universalmanifest/conformance`
- `--suite-version 1.0.0`
- `--impl-name my-validator`
- `--impl-version 1.2.3`
- `--impl-language rust`
- `--impl-organization Acme`
- `--impl-repository https://github.com/acme/my-validator`

## npm scripts

- `npm test` -> run core tests
- `npm run run:typescript-adapter` -> run command-mode suite against TS reference adapter
- `npm run run:typescript-adapter:http` -> run HTTP-mode suite (expects adapter server running)
