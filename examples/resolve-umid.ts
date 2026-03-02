import { resolve } from '@universalmanifest/typescript'

const umid = process.argv[2]
if (!umid) {
  throw new Error('Usage: node examples/resolve-umid.ts <UMID>')
}

const manifest = await resolve(umid)
console.log(JSON.stringify(manifest, null, 2))
