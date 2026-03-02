# @universalmanifest/typescript

Standalone TypeScript reference implementation for Universal Manifest.

## Install

```bash
npm install @universalmanifest/typescript
```

## Quickstart

```ts
import { create, sign, verify, resolve } from '@universalmanifest/typescript'

const unsigned = create({
  manifestVersion: '0.2',
  id: 'urn:um:example:minimal',
  subject: 'did:example:alice',
  issuedAt: '2026-01-01T00:00:00Z',
  expiresAt: '2027-01-01T00:00:00Z',
})

const signed = sign(unsigned, {
  privateKey: process.env.UM_PRIVATE_KEY_PEM,
  created: '2026-01-01T00:00:00Z',
})

const verifyResult = verify(signed)
if (!verifyResult.ok) throw new Error(verifyResult.error)

const resolved = await resolve(signed)
console.log(resolved['@id'])
```

## API

- `create(input)`
Creates a v0.1 manifest or unsigned v0.2 draft payload.

- `validate(value, options?)`
Structural validation for v0.1 and v0.2 manifests (with optional freshness checks).

- `sign(unsignedV02, options)`
Signs v0.2 manifests using Ed25519 + JCS canonicalization.

- `verify(value, options?)`
Verifies v0.2 signatures (and optional freshness checks).

- `resolve(input, options?)`
Resolves a manifest from an inline object, registry, custom fetch callback, or by default via HTTP (`https://myum.net/{UMID}`).

## Development

```bash
npm run build
npm test
npm run conformance
```

Conformance details and report output format are documented in `CONFORMANCE.md`.
