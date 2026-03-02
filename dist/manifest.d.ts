import type { CreateManifestInput, ManifestVersion, UmSignatureV02, UniversalManifest, UniversalManifestDraft } from './types.js';
export interface ValidateOptions {
    allowUnsignedV02?: boolean;
    requireFresh?: boolean;
    now?: Date;
}
export type ValidationResult = {
    ok: true;
    manifestVersion: ManifestVersion;
} | {
    ok: false;
    error: string;
};
declare function assertSignatureV02(value: unknown): asserts value is UmSignatureV02;
export declare function canonicalizeJson(value: unknown): string;
export declare function canonicalizeManifestPayload(manifest: Record<string, unknown>): string;
export declare function getManifestId(manifest: {
    '@id': string;
}): string;
/**
 * Create a Universal Manifest payload.
 *
 * When `manifestVersion` is `"0.2"`, the payload is returned unsigned and is
 * intended to be passed into {@link sign}.
 */
export declare function create(input: CreateManifestInput): UniversalManifestDraft;
/**
 * Assert that a value is a structurally valid Universal Manifest payload.
 */
export declare function assertValidManifest(value: unknown, options?: ValidateOptions): asserts value is UniversalManifest | UniversalManifestDraft;
/**
 * Validate a manifest and return a non-throwing result object.
 */
export declare function validate(value: unknown, options?: ValidateOptions): ValidationResult;
export { assertSignatureV02 };
