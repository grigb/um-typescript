import assert from 'node:assert/strict'
import test from 'node:test'

import { create, resolve, sign, validate, verify } from '../../dist/index.js'

const PRIVATE_KEY_PKCS8_DER_B64 =
  'MC4CAQAwBQYDK2VwBCIEIJpjSQlvlpMLqt+h0JpCd9vHqGxLKKCxnPCh5Tt2DQRJ'

function buildUnsignedV02(overrides = {}) {
  return create({
    manifestVersion: '0.2',
    id: 'urn:um:unit:minimal',
    subject: 'did:example:alice',
    issuedAt: '2026-01-01T00:00:00Z',
    expiresAt: '2027-01-01T00:00:00Z',
    ...overrides,
  })
}

test('create returns a valid manifest draft', () => {
  const manifest = create({
    id: 'urn:um:unit:v01',
    subject: 'did:example:alice',
    issuedAt: '2026-01-01T00:00:00Z',
    expiresAt: '2026-12-31T00:00:00Z',
  })

  assert.equal(manifest.manifestVersion, '0.1')

  const result = validate(manifest)
  assert.equal(result.ok, true)
})

test('sign + verify v0.2 succeeds and is deterministic for identical input', () => {
  const unsigned = buildUnsignedV02()

  const options = {
    privateKey: {
      key: Buffer.from(PRIVATE_KEY_PKCS8_DER_B64, 'base64'),
      format: 'der',
      type: 'pkcs8',
    },
    created: '2026-01-01T00:00:00Z',
  }

  const signedA = sign(unsigned, options)
  const signedB = sign(unsigned, options)

  assert.equal(signedA.signature.value, signedB.signature.value)
  assert.equal(verify(signedA).ok, true)
})

test('verify rejects tampered v0.2 manifests', () => {
  const unsigned = buildUnsignedV02()
  const signed = sign(unsigned, {
    privateKey: {
      key: Buffer.from(PRIVATE_KEY_PKCS8_DER_B64, 'base64'),
      format: 'der',
      type: 'pkcs8',
    },
    created: '2026-01-01T00:00:00Z',
  })

  const tampered = {
    ...signed,
    subject: 'did:example:mallory',
  }

  const result = verify(tampered)
  assert.equal(result.ok, false)
  assert.match(result.error, /Signature verification failed/)
})

test('resolve supports registry lookup and fetch fallback', async () => {
  const unsigned = buildUnsignedV02({ id: 'urn:um:unit:resolve' })
  const signed = sign(unsigned, {
    privateKey: {
      key: Buffer.from(PRIVATE_KEY_PKCS8_DER_B64, 'base64'),
      format: 'der',
      type: 'pkcs8',
    },
    created: '2026-01-01T00:00:00Z',
  })

  const fromRegistry = await resolve('urn:um:unit:resolve', {
    registry: {
      'urn:um:unit:resolve': signed,
    },
  })

  assert.equal(fromRegistry['@id'], 'urn:um:unit:resolve')

  const fromFetch = await resolve('urn:um:unit:fetch', {
    fetchManifest: async () => signed,
  })

  assert.equal(fromFetch['@id'], 'urn:um:unit:resolve')
})

test('resolve uses resolver HTTP fallback when registry and fetchManifest are absent', async () => {
  const unsigned = buildUnsignedV02({ id: 'urn:um:unit:http' })
  const signed = sign(unsigned, {
    privateKey: {
      key: Buffer.from(PRIVATE_KEY_PKCS8_DER_B64, 'base64'),
      format: 'der',
      type: 'pkcs8',
    },
    created: '2026-01-01T00:00:00Z',
  })

  const resolved = await resolve('urn:um:unit:http', {
    resolverBase: 'https://resolver.example',
    fetchImpl: async (url) => {
      assert.equal(url, 'https://resolver.example/urn%3Aum%3Aunit%3Ahttp')
      return {
        ok: true,
        status: 200,
        text: async () => '',
        json: async () => signed,
      }
    },
  })

  assert.equal(resolved['@id'], 'urn:um:unit:http')
})

test('resolve fails when no source can provide a manifest', async () => {
  await assert.rejects(
    async () => {
      await resolve('urn:um:unit:missing', {
        fetchImpl: async () => ({
          ok: false,
          status: 404,
          text: async () => 'not found',
          json: async () => ({ error: 'not_found' }),
        }),
      })
    },
    /Resolver request failed/
  )
})
