import { KeyObject, createPublicKey, verify as cryptoVerify } from 'node:crypto'

import { assertSignatureV02, assertValidManifest, canonicalizeManifestPayload } from './manifest.js'
import type { UniversalManifestV02 } from './types.js'

export interface VerifyOptions {
  now?: Date
  requireFresh?: boolean
  resolvePublicKeySpkiB64?: (keyRef: string, manifest: UniversalManifestV02) => string | undefined
}

export type VerificationResult =
  | { ok: true }
  | { ok: false; error: string }

function asErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

function toPublicKeyFromSpkiB64(spkiB64: string): KeyObject {
  try {
    return createPublicKey({
      key: Buffer.from(spkiB64, 'base64'),
      format: 'der',
      type: 'spki',
    })
  } catch {
    throw new Error('Invalid signature.publicKeySpkiB64 (expected base64 SPKI DER)')
  }
}

function resolvePublicKey(manifest: UniversalManifestV02, options: VerifyOptions): KeyObject {
  const signature = manifest.signature

  if (signature.publicKeySpkiB64) {
    return toPublicKeyFromSpkiB64(signature.publicKeySpkiB64)
  }

  if (signature.keyRef && options.resolvePublicKeySpkiB64) {
    const resolved = options.resolvePublicKeySpkiB64(signature.keyRef, manifest)
    if (resolved) {
      return toPublicKeyFromSpkiB64(resolved)
    }
  }

  throw new Error('Missing signature.publicKeySpkiB64 (key resolution is out of scope for this helper)')
}

export function assertVerified(manifest: unknown, options: VerifyOptions = {}): asserts manifest is UniversalManifestV02 {
  assertValidManifest(manifest, {
    allowUnsignedV02: false,
    requireFresh: options.requireFresh,
    now: options.now,
  })

  if ((manifest as { manifestVersion: string }).manifestVersion !== '0.2') {
    throw new Error('verify only supports manifestVersion 0.2')
  }

  const typed = manifest as UniversalManifestV02
  assertSignatureV02(typed.signature)

  const publicKey = resolvePublicKey(typed, options)
  const payload = canonicalizeManifestPayload(typed as unknown as Record<string, unknown>)

  const ok = cryptoVerify(
    null,
    Buffer.from(payload, 'utf8'),
    publicKey,
    Buffer.from(typed.signature.value, 'base64url')
  )

  if (!ok) {
    throw new Error('Signature verification failed')
  }
}

export function verify(manifest: unknown, options: VerifyOptions = {}): VerificationResult {
  try {
    assertVerified(manifest, options)
    return { ok: true }
  } catch (error) {
    return { ok: false, error: asErrorMessage(error) }
  }
}
