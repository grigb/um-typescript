import { getManifestId, validate, verify } from '../../dist/index.js'

function normalizeValidationMode(manifest) {
  const mode = manifest?.__validate
  if (mode === undefined) return 'structural'
  if (mode === 'structural' || mode === 'fresh') return mode
  throw new Error(`Unsupported __validate mode: ${String(mode)}`)
}

function deriveFixtureLabel(manifest) {
  try {
    const id = getManifestId(manifest)
    if (typeof id === 'string' && id.length > 0) return id
  } catch {
    // Keep deterministic fallback for invalid fixtures.
  }

  return 'stdin-fixture'
}

function validateFixture(manifest, mode) {
  const requireFresh = mode === 'fresh'

  if (manifest?.manifestVersion === '0.1') {
    return validate(manifest, { requireFresh, allowUnsignedV02: true })
  }

  if (manifest?.manifestVersion === '0.2') {
    return verify(manifest, { requireFresh })
  }

  return { ok: false, error: `Unknown manifestVersion: ${String(manifest?.manifestVersion)}` }
}

export function evaluateFixture(manifest) {
  const fixture = deriveFixtureLabel(manifest)

  try {
    const validationMode = normalizeValidationMode(manifest)
    const result = validateFixture(manifest, validationMode)

    if (result.ok) {
      return {
        fixture,
        result: 'accept',
        reason: `${manifest.manifestVersion} manifest validated (${validationMode})`,
        manifestVersion: typeof manifest?.manifestVersion === 'string' ? manifest.manifestVersion : 'unknown',
        validationMode,
      }
    }

    return {
      fixture,
      result: 'reject',
      reason: result.error,
      manifestVersion: typeof manifest?.manifestVersion === 'string' ? manifest.manifestVersion : 'unknown',
      validationMode,
    }
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error)

    return {
      fixture,
      result: 'reject',
      reason,
      manifestVersion: typeof manifest?.manifestVersion === 'string' ? manifest.manifestVersion : 'unknown',
      validationMode: manifest?.__validate === 'fresh' ? 'fresh' : 'structural',
    }
  }
}
