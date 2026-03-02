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
export declare function assertVerified(manifest: unknown, options?: VerifyOptions): asserts manifest is UniversalManifestV02;
export declare function verify(manifest: unknown, options?: VerifyOptions): VerificationResult;
