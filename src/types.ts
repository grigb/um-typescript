export type JsonLdContext =
  | string
  | Record<string, unknown>
  | Array<string | Record<string, unknown>>

export type JsonLdType = string | string[]
export type ManifestVersion = '0.1' | '0.2'

export interface UmEntityV01 {
  '@id': string
  '@type': JsonLdType
  [key: string]: unknown
}

export interface UmShardV01 {
  '@id'?: string
  '@type': JsonLdType
  name?: string
  description?: string
  ref?: string
  entity?: UmEntityV01 | Record<string, unknown> | string | null
  [key: string]: unknown
}

export interface UmSignatureV01 {
  algorithm?: string
  keyRef?: string
  value?: string
  [key: string]: unknown
}

export interface UmSignatureV02 {
  algorithm: 'Ed25519'
  canonicalization: 'JCS-RFC8785'
  keyRef?: string
  publicKeySpkiB64?: string
  created?: string
  value: string
  [key: string]: unknown
}

export interface UniversalManifestBase {
  '@context': JsonLdContext
  '@id': string
  '@type': JsonLdType
  manifestVersion: ManifestVersion
  subject: string
  issuedAt: string
  expiresAt: string
  shards?: UmShardV01[]
  claims?: Array<Record<string, unknown>>
  consents?: Array<Record<string, unknown>>
  devices?: Array<Record<string, unknown>>
  pointers?: Array<Record<string, unknown>>
  [key: string]: unknown
}

export interface UniversalManifestV01 extends UniversalManifestBase {
  manifestVersion: '0.1'
  signature?: UmSignatureV01
}

export interface UniversalManifestUnsignedV02 extends UniversalManifestBase {
  manifestVersion: '0.2'
  signature?: never
}

export interface UniversalManifestV02 extends UniversalManifestBase {
  manifestVersion: '0.2'
  signature: UmSignatureV02
}

export type UniversalManifest = UniversalManifestV01 | UniversalManifestV02
export type UniversalManifestDraft = UniversalManifestV01 | UniversalManifestUnsignedV02

export interface CreateManifestInput {
  manifestVersion?: ManifestVersion
  id: string
  subject: string
  issuedAt: string
  expiresAt: string
  context?: JsonLdContext
  type?: JsonLdType
  shards?: UmShardV01[]
  claims?: Array<Record<string, unknown>>
  consents?: Array<Record<string, unknown>>
  devices?: Array<Record<string, unknown>>
  pointers?: Array<Record<string, unknown>>
  extra?: Record<string, unknown>
}
