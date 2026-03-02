#!/usr/bin/env node
import fs from 'node:fs/promises'
import path from 'node:path'
import { spawn } from 'node:child_process'

async function exists(pathname) {
  try {
    await fs.access(pathname)
    return true
  } catch {
    return false
  }
}

async function findConformanceRoot() {
  const candidates = [
    process.env.UM_CONFORMANCE_ROOT,
    path.resolve(process.cwd(), 'conformance'),
    path.resolve(process.cwd(), '../universalmanifest/conformance'),
  ].filter(Boolean)

  for (const candidate of candidates) {
    const normalized = path.resolve(candidate)
    const runnerPath = path.join(normalized, 'runner', 'cli.mjs')
    if (await exists(runnerPath)) {
      return normalized
    }
  }

  throw new Error(
    [
      'Unable to locate Universal Manifest conformance suite.',
      'Set UM_CONFORMANCE_ROOT to the conformance directory path.',
      'Example:',
      'UM_CONFORMANCE_ROOT=/Users/grig/work/repo/universalmanifest/conformance npm run conformance',
    ].join('\n')
  )
}

async function readPackageMetadata() {
  const packageJsonPath = path.resolve(process.cwd(), 'package.json')
  const raw = await fs.readFile(packageJsonPath, 'utf8')
  const parsed = JSON.parse(raw)

  return {
    name: typeof parsed.name === 'string' ? parsed.name : '@universalmanifest/typescript',
    version: typeof parsed.version === 'string' ? parsed.version : '0.0.0',
  }
}

async function main() {
  const conformanceRoot = await findConformanceRoot()
  const { name, version } = await readPackageMetadata()

  const runnerCli = path.join(conformanceRoot, 'runner', 'cli.mjs')
  const adapterPath = path.resolve(process.cwd(), 'tests', 'conformance', 'adapter.mjs')
  const reportPath = path.resolve(process.cwd(), 'tests', 'conformance', 'conformance-report.json')

  const args = [
    runnerCli,
    '--mode',
    'command',
    '--adapter-command',
    `${process.execPath} ${adapterPath}`,
    '--conformance-root',
    conformanceRoot,
    '--report',
    reportPath,
    '--impl-name',
    name,
    '--impl-version',
    version,
    '--impl-language',
    'typescript',
  ]

  const code = await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, args, {
      stdio: 'inherit',
      env: process.env,
    })

    child.on('error', reject)
    child.on('close', resolve)
  })

  if (code !== 0) {
    process.exitCode = code
  }
}

main().catch((error) => {
  const reason = error instanceof Error ? error.message : String(error)
  process.stderr.write(`${reason}\n`)
  process.exitCode = 1
})
