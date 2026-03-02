import { assertValidManifest } from './manifest.js'
import type { UniversalManifest, UniversalManifestDraft } from './types.js'

interface FetchResponse {
  ok: boolean
  status: number
  text(): Promise<string>
}

interface FetchJsonResponse extends FetchResponse {
  json(): Promise<unknown>
}

type FetchLike = (url: string, init?: { headers?: Record<string, string> }) => Promise<FetchJsonResponse>

export interface ResolveOptions {
  registry?: Record<string, unknown>
  fetchManifest?: (id: string) => Promise<unknown> | unknown
  fetchImpl?: FetchLike
  resolverBase?: string
  now?: Date
  requireFresh?: boolean
  allowUnsignedV02?: boolean
}

function normalizeResolverUrl(idOrUrl: string, resolverBase: string): string {
  if (/^https?:\/\//iu.test(idOrUrl)) return idOrUrl

  const base = resolverBase.replace(/\/+$/u, '')
  return `${base}/${encodeURIComponent(idOrUrl)}`
}

export async function resolve(
  input: string | unknown,
  options: ResolveOptions = {}
): Promise<UniversalManifest | UniversalManifestDraft> {
  let candidate: unknown

  if (typeof input === 'string') {
    if (options.registry && input in options.registry) {
      candidate = options.registry[input]
    } else if (options.fetchManifest) {
      candidate = await options.fetchManifest(input)
    } else {
      const fetchImpl = options.fetchImpl ?? (globalThis.fetch as unknown as FetchLike | undefined)
      if (!fetchImpl) {
        throw new Error(
          `Unable to resolve manifest: ${input} (no registry entry, no fetchManifest override, and fetch is unavailable)`
        )
      }

      const url = normalizeResolverUrl(input, options.resolverBase ?? 'https://myum.net')
      const response = await fetchImpl(url, {
        headers: {
          accept: 'application/json',
        },
      })

      if (!response.ok) {
        const body = await response.text()
        throw new Error(`Resolver request failed (${response.status}) for ${url}: ${body}`)
      }

      candidate = await response.json()
    }
  } else {
    candidate = input
  }

  assertValidManifest(candidate, {
    allowUnsignedV02: options.allowUnsignedV02,
    now: options.now,
    requireFresh: options.requireFresh,
  })

  return candidate
}
