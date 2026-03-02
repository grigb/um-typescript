import type { UniversalManifest, UniversalManifestDraft } from './types.js';
interface FetchResponse {
    ok: boolean;
    status: number;
    text(): Promise<string>;
}
interface FetchJsonResponse extends FetchResponse {
    json(): Promise<unknown>;
}
type FetchLike = (url: string, init?: {
    headers?: Record<string, string>;
}) => Promise<FetchJsonResponse>;
export interface ResolveOptions {
    registry?: Record<string, unknown>;
    fetchManifest?: (id: string) => Promise<unknown> | unknown;
    fetchImpl?: FetchLike;
    resolverBase?: string;
    now?: Date;
    requireFresh?: boolean;
    allowUnsignedV02?: boolean;
}
/**
 * Resolve a manifest from:
 * - an inline manifest object
 * - a local registry map
 * - a caller-provided fetch callback
 * - or a resolver HTTP endpoint (defaults to `https://myum.net/{UMID}`)
 */
export declare function resolve(input: string | unknown, options?: ResolveOptions): Promise<UniversalManifest | UniversalManifestDraft>;
export {};
