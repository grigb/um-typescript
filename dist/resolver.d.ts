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
export declare function resolve(input: string | unknown, options?: ResolveOptions): Promise<UniversalManifest | UniversalManifestDraft>;
export {};
