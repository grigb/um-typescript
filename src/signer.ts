import {
  KeyObject,
  createPrivateKey,
  createPublicKey,
  sign as cryptoSign,
} from 'node:crypto'

import { assertValidManifest, canonicalizeManifestPayload } from './manifest.js'
import type { UniversalManifestUnsignedV02, UniversalManifestV02 } from './types.js'

export type SigningKeyInput =
  | KeyObject
  | string
  | Buffer
  | Uint8Array
  | {
      key: string | Buffer | Uint8Array
      format?: 'pem' | 'der'
      type?: 'pkcs8'
      passphrase?: string
    }

export interface SignOptions {
  privateKey: SigningKeyInput
  keyRef?: string
  publicKeySpkiB64?: string
  created?: string
}

function toPrivateKey(input: SigningKeyInput): KeyObject {
  if (input instanceof KeyObject) return input

  if (typeof input === 'string' || Buffer.isBuffer(input)) {
    return createPrivateKey(input)
  }

  if (input instanceof Uint8Array) {
    return createPrivateKey(Buffer.from(input))
  }

  return createPrivateKey({
    key: input.key instanceof Uint8Array ? Buffer.from(input.key) : input.key,
    format: input.format,
    type: input.type,
    passphrase: input.passphrase,
  })
}

function derivePublicKeySpkiB64(privateKey: KeyObject): string {
  if (privateKey.asymmetricKeyType !== 'ed25519') {
    throw new Error('sign requires an Ed25519 private key')
  }

  const publicKey = createPublicKey(privateKey)
  const spkiDer = publicKey.export({ format: 'der', type: 'spki' })
  return Buffer.from(spkiDer as Buffer).toString('base64')
}

export function sign(manifest: UniversalManifestUnsignedV02, options: SignOptions): UniversalManifestV02 {
  assertValidManifest(manifest, { allowUnsignedV02: true })

  if (manifest.manifestVersion !== '0.2') {
    throw new Error('sign only supports manifestVersion 0.2')
  }

  const privateKey = toPrivateKey(options.privateKey)
  const payload = canonicalizeManifestPayload(manifest as unknown as Record<string, unknown>)

  const signature = cryptoSign(null, Buffer.from(payload, 'utf8'), privateKey)

  const signed: UniversalManifestV02 = {
    ...manifest,
    signature: {
      algorithm: 'Ed25519',
      canonicalization: 'JCS-RFC8785',
      ...(options.keyRef ? { keyRef: options.keyRef } : {}),
      ...(options.created ? { created: options.created } : {}),
      publicKeySpkiB64: options.publicKeySpkiB64 ?? derivePublicKeySpkiB64(privateKey),
      value: signature.toString('base64url'),
    },
  }

  assertValidManifest(signed, { allowUnsignedV02: false })
  return signed
}
