#!/usr/bin/env node
import { evaluateFixture } from './lib.mjs'

async function readStdin() {
  const chunks = []
  for await (const chunk of process.stdin) {
    chunks.push(Buffer.from(chunk))
  }
  return Buffer.concat(chunks).toString('utf8').trim()
}

async function main() {
  const input = await readStdin()

  if (input.length === 0) {
    process.stdout.write(
      `${JSON.stringify({ fixture: 'stdin-fixture', result: 'reject', reason: 'stdin payload is empty' })}\n`
    )
    return
  }

  let parsed
  try {
    parsed = JSON.parse(input)
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error)
    process.stdout.write(
      `${JSON.stringify({ fixture: 'stdin-fixture', result: 'reject', reason: `invalid JSON payload: ${reason}` })}\n`
    )
    return
  }

  process.stdout.write(`${JSON.stringify(evaluateFixture(parsed))}\n`)
}

main().catch((error) => {
  const reason = error instanceof Error ? error.message : String(error)
  process.stdout.write(`${JSON.stringify({ fixture: 'stdin-fixture', result: 'reject', reason })}\n`)
})
