import { assertValidManifest } from './manifest.js';
function normalizeResolverUrl(idOrUrl, resolverBase) {
    if (/^https?:\/\//iu.test(idOrUrl))
        return idOrUrl;
    const base = resolverBase.replace(/\/+$/u, '');
    return `${base}/${encodeURIComponent(idOrUrl)}`;
}
/**
 * Resolve a manifest from:
 * - an inline manifest object
 * - a local registry map
 * - a caller-provided fetch callback
 * - or a resolver HTTP endpoint (defaults to `https://myum.net/{UMID}`)
 */
export async function resolve(input, options = {}) {
    let candidate;
    if (typeof input === 'string') {
        if (options.registry && input in options.registry) {
            candidate = options.registry[input];
        }
        else if (options.fetchManifest) {
            candidate = await options.fetchManifest(input);
        }
        else {
            const fetchImpl = options.fetchImpl ?? globalThis.fetch;
            if (!fetchImpl) {
                throw new Error(`Unable to resolve manifest: ${input} (no registry entry, no fetchManifest override, and fetch is unavailable)`);
            }
            const url = normalizeResolverUrl(input, options.resolverBase ?? 'https://myum.net');
            const response = await fetchImpl(url, {
                headers: {
                    accept: 'application/json',
                },
            });
            if (!response.ok) {
                const body = await response.text();
                throw new Error(`Resolver request failed (${response.status}) for ${url}: ${body}`);
            }
            candidate = await response.json();
        }
    }
    else {
        candidate = input;
    }
    assertValidManifest(candidate, {
        allowUnsignedV02: options.allowUnsignedV02,
        now: options.now,
        requireFresh: options.requireFresh,
    });
    return candidate;
}
