import type {
  CreateManifestInput,
  ManifestVersion,
  UmSignatureV02,
  UniversalManifest,
  UniversalManifestDraft,
} from './types.js'

const RFC3339_DATE_TIME =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/

const DEFAULT_CONTEXT = 'https://universalmanifest.org/context/v1'

export interface ValidateOptions {
  allowUnsignedV02?: boolean
  requireFresh?: boolean
  now?: Date
}

export type ValidationResult =
  | { ok: true; manifestVersion: ManifestVersion }
  | { ok: false; error: string }

function asErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function assertIsoDateTime(value: unknown, fieldName: string): asserts value is string {
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(`Missing ${fieldName}`)
  }

  if (!RFC3339_DATE_TIME.test(value)) {
    throw new Error(`${fieldName} must be an ISO date-time`)
  }

  const ms = Date.parse(value)
  if (!Number.isFinite(ms)) {
    throw new Error(`${fieldName} must be an ISO date-time`)
  }
}

function jsonLdTypeIncludes(value: unknown, required: string): boolean {
  if (typeof value === 'string') return value === required
  if (Array.isArray(value)) return value.some((entry) => entry === required)
  return false
}

function assertSignatureV02(value: unknown): asserts value is UmSignatureV02 {
  if (!isRecord(value)) throw new Error('Missing signature')

  if (value.algorithm !== 'Ed25519') {
    throw new Error('signature.algorithm must be Ed25519')
  }

  if (value.canonicalization !== 'JCS-RFC8785') {
    throw new Error('signature.canonicalization must be JCS-RFC8785')
  }

  if (typeof value.value !== 'string' || value.value.length === 0) {
    throw new Error('Missing signature.value')
  }

  if (value.publicKeySpkiB64 !== undefined) {
    if (typeof value.publicKeySpkiB64 !== 'string' || value.publicKeySpkiB64.length === 0) {
      throw new Error('signature.publicKeySpkiB64 must be a non-empty string')
    }
  }

  if (value.keyRef !== undefined) {
    if (typeof value.keyRef !== 'string' || value.keyRef.length === 0) {
      throw new Error('signature.keyRef must be a non-empty string')
    }
  }

  if (typeof value.created === 'string' && value.created.length > 0) {
    assertIsoDateTime(value.created, 'signature.created')
  }

  if (value.publicKeySpkiB64 === undefined && value.keyRef === undefined) {
    throw new Error('signature must include keyRef or publicKeySpkiB64')
  }
}

export function canonicalizeJson(value: unknown): string {
  if (value === null) return 'null'

  const valueType = typeof value
  if (valueType === 'string' || valueType === 'number' || valueType === 'boolean') {
    return JSON.stringify(value)
  }

  if (Array.isArray(value)) {
    return `[${value.map((item) => canonicalizeJson(item)).join(',')}]`
  }

  if (valueType !== 'object') {
    return JSON.stringify(value)
  }

  const obj = value as Record<string, unknown>
  const keys = Object.keys(obj)
    .filter((key) => obj[key] !== undefined)
    .sort((a, b) => (a < b ? -1 : a > b ? 1 : 0))

  return `{${keys.map((key) => `${JSON.stringify(key)}:${canonicalizeJson(obj[key])}`).join(',')}}`
}

export function canonicalizeManifestPayload(manifest: Record<string, unknown>): string {
  const unsigned: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(manifest)) {
    if (key === 'signature') continue
    unsigned[key] = value
  }

  return canonicalizeJson(unsigned)
}

export function getManifestId(manifest: { '@id': string }): string {
  return manifest['@id']
}

/**
 * Create a Universal Manifest payload.
 *
 * When `manifestVersion` is `"0.2"`, the payload is returned unsigned and is
 * intended to be passed into {@link sign}.
 */
export function create(input: CreateManifestInput): UniversalManifestDraft {
  const manifestVersion = input.manifestVersion ?? '0.1'
  const manifest: Record<string, unknown> = {
    '@context': input.context ?? DEFAULT_CONTEXT,
    '@id': input.id,
    '@type': input.type ?? 'um:Manifest',
    manifestVersion,
    subject: input.subject,
    issuedAt: input.issuedAt,
    expiresAt: input.expiresAt,
  }

  if (input.shards !== undefined) manifest.shards = input.shards
  if (input.claims !== undefined) manifest.claims = input.claims
  if (input.consents !== undefined) manifest.consents = input.consents
  if (input.devices !== undefined) manifest.devices = input.devices
  if (input.pointers !== undefined) manifest.pointers = input.pointers

  if (input.extra) {
    for (const [key, value] of Object.entries(input.extra)) {
      manifest[key] = value
    }
  }

  // v0.2 creation emits an unsigned payload that can be passed to sign().
  if (manifestVersion === '0.2') {
    delete manifest.signature
  }

  assertValidManifest(manifest, { allowUnsignedV02: true })
  return manifest as UniversalManifestDraft
}

/**
 * Assert that a value is a structurally valid Universal Manifest payload.
 */
export function assertValidManifest(
  value: unknown,
  options: ValidateOptions = {}
): asserts value is UniversalManifest | UniversalManifestDraft {
  if (!isRecord(value)) throw new Error('Manifest must be an object')

  if (!('@context' in value)) throw new Error('Missing @context')
  if (typeof value['@id'] !== 'string' || value['@id'].length === 0) throw new Error('Missing @id')
  if (!jsonLdTypeIncludes(value['@type'], 'um:Manifest')) {
    throw new Error('Missing um:Manifest in @type')
  }

  const manifestVersion = value.manifestVersion
  if (manifestVersion !== '0.1' && manifestVersion !== '0.2') {
    throw new Error(`Unknown manifestVersion: ${String(manifestVersion)}`)
  }

  if (typeof value.subject !== 'string' || value.subject.length === 0) {
    throw new Error('Missing subject')
  }

  assertIsoDateTime(value.issuedAt, 'issuedAt')
  assertIsoDateTime(value.expiresAt, 'expiresAt')

  if (Date.parse(value.issuedAt) > Date.parse(value.expiresAt)) {
    throw new Error('issuedAt must be <= expiresAt')
  }

  if (value.shards !== undefined) {
    if (!Array.isArray(value.shards)) throw new Error('shards must be an array')

    for (const shard of value.shards) {
      if (!isRecord(shard)) throw new Error('shard must be an object')
      if (!jsonLdTypeIncludes(shard['@type'], 'um:Shard')) {
        throw new Error('Missing um:Shard in shard @type')
      }
    }
  }

  if (manifestVersion === '0.2') {
    if (value.signature === undefined) {
      if (!options.allowUnsignedV02) {
        throw new Error('Missing signature')
      }
    } else {
      assertSignatureV02(value.signature)
    }
  }

  if (options.requireFresh) {
    const nowMs = (options.now ?? new Date()).getTime()
    const expiresMs = Date.parse(value.expiresAt)

    if (nowMs > expiresMs) {
      throw new Error('Manifest expired')
    }
  }
}

/**
 * Validate a manifest and return a non-throwing result object.
 */
export function validate(value: unknown, options: ValidateOptions = {}): ValidationResult {
  try {
    assertValidManifest(value, options)
    const manifestVersion = (value as { manifestVersion: ManifestVersion }).manifestVersion
    return { ok: true, manifestVersion }
  } catch (error) {
    return { ok: false, error: asErrorMessage(error) }
  }
}

export { assertSignatureV02 }
