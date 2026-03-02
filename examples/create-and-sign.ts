import { create, sign } from '@universalmanifest/typescript'

const unsigned = create({
  manifestVersion: '0.2',
  id: 'urn:um:example:create-sign',
  subject: 'did:example:alice',
  issuedAt: new Date().toISOString(),
  expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
})

const privateKeyPem = process.env.UM_PRIVATE_KEY_PEM
if (!privateKeyPem) {
  throw new Error('Set UM_PRIVATE_KEY_PEM to sign the manifest')
}

const signed = sign(unsigned, {
  privateKey: privateKeyPem,
  keyRef: 'did:example:alice#key-1',
  created: new Date().toISOString(),
})

console.log(JSON.stringify(signed, null, 2))
