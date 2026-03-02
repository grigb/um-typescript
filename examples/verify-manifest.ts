import fs from 'node:fs'
import { verify } from '@universalmanifest/typescript'

const inputPath = process.argv[2]
if (!inputPath) {
  throw new Error('Usage: node examples/verify-manifest.ts <manifest.json>')
}

const manifest = JSON.parse(fs.readFileSync(inputPath, 'utf8'))
const result = verify(manifest)

if (!result.ok) {
  console.error(result.error)
  process.exit(1)
}

console.log('Signature verification passed')
