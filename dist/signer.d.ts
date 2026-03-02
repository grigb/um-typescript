import { KeyObject } from 'node:crypto';
import type { UniversalManifestUnsignedV02, UniversalManifestV02 } from './types.js';
export type SigningKeyInput = KeyObject | string | Buffer | Uint8Array | {
    key: string | Buffer | Uint8Array;
    format?: 'pem' | 'der';
    type?: 'pkcs8';
    passphrase?: string;
};
export interface SignOptions {
    privateKey: SigningKeyInput;
    keyRef?: string;
    publicKeySpkiB64?: string;
    created?: string;
}
/**
 * Sign an unsigned v0.2 manifest using Ed25519 over JCS-canonicalized payload.
 */
export declare function sign(manifest: UniversalManifestUnsignedV02, options: SignOptions): UniversalManifestV02;
