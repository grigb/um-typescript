import type { UniversalManifestV02 } from './types.js';
export interface VerifyOptions {
    now?: Date;
    requireFresh?: boolean;
    resolvePublicKeySpkiB64?: (keyRef: string, manifest: UniversalManifestV02) => string | undefined;
}
export type VerificationResult = {
    ok: true;
} | {
    ok: false;
    error: string;
};
/**
 * Assert that a v0.2 manifest is structurally valid and signature-verified.
 */
export declare function assertVerified(manifest: unknown, options?: VerifyOptions): asserts manifest is UniversalManifestV02;
/**
 * Verify a manifest and return a non-throwing result object.
 */
export declare function verify(manifest: unknown, options?: VerifyOptions): VerificationResult;
