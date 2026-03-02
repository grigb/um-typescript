import { createPublicKey, verify as cryptoVerify } from 'node:crypto';
import { assertSignatureV02, assertValidManifest, canonicalizeManifestPayload } from './manifest.js';
function asErrorMessage(error) {
    return error instanceof Error ? error.message : String(error);
}
function toPublicKeyFromSpkiB64(spkiB64) {
    try {
        return createPublicKey({
            key: Buffer.from(spkiB64, 'base64'),
            format: 'der',
            type: 'spki',
        });
    }
    catch {
        throw new Error('Invalid signature.publicKeySpkiB64 (expected base64 SPKI DER)');
    }
}
function resolvePublicKey(manifest, options) {
    const signature = manifest.signature;
    if (signature.publicKeySpkiB64) {
        return toPublicKeyFromSpkiB64(signature.publicKeySpkiB64);
    }
    if (signature.keyRef && options.resolvePublicKeySpkiB64) {
        const resolved = options.resolvePublicKeySpkiB64(signature.keyRef, manifest);
        if (resolved) {
            return toPublicKeyFromSpkiB64(resolved);
        }
    }
    throw new Error('Missing signature.publicKeySpkiB64 (key resolution is out of scope for this helper)');
}
export function assertVerified(manifest, options = {}) {
    assertValidManifest(manifest, {
        allowUnsignedV02: false,
        requireFresh: options.requireFresh,
        now: options.now,
    });
    if (manifest.manifestVersion !== '0.2') {
        throw new Error('verify only supports manifestVersion 0.2');
    }
    const typed = manifest;
    assertSignatureV02(typed.signature);
    const publicKey = resolvePublicKey(typed, options);
    const payload = canonicalizeManifestPayload(typed);
    const ok = cryptoVerify(null, Buffer.from(payload, 'utf8'), publicKey, Buffer.from(typed.signature.value, 'base64url'));
    if (!ok) {
        throw new Error('Signature verification failed');
    }
}
export function verify(manifest, options = {}) {
    try {
        assertVerified(manifest, options);
        return { ok: true };
    }
    catch (error) {
        return { ok: false, error: asErrorMessage(error) };
    }
}
