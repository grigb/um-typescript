import { spawn } from 'node:child_process'

function parseJsonFromOutput(stdout) {
  const trimmed = stdout.trim()
  if (trimmed.length === 0) {
    throw new Error('Adapter produced empty stdout; expected JSON output')
  }

  try {
    return JSON.parse(trimmed)
  } catch {
    const lines = trimmed
      .split(/\r?\n/u)
      .map((line) => line.trim())
      .filter(Boolean)

    for (let index = lines.length - 1; index >= 0; index -= 1) {
      try {
        return JSON.parse(lines[index])
      } catch {
        // Continue scanning for the most recent valid JSON line.
      }
    }
  }

  throw new Error('Adapter stdout did not contain parseable JSON')
}

export async function invokeCommandAdapter({ command, payload, timeoutMs }) {
  if (typeof command !== 'string' || command.trim().length === 0) {
    throw new Error('Command mode requires a non-empty adapter command')
  }

  return await new Promise((resolve, reject) => {
    const child = spawn(command, {
      shell: true,
      stdio: ['pipe', 'pipe', 'pipe'],
      env: process.env,
    })

    let stdout = ''
    let stderr = ''

    const timer = setTimeout(() => {
      child.kill('SIGKILL')
      reject(new Error(`Adapter command timed out after ${timeoutMs}ms`))
    }, timeoutMs)

    child.stdout.setEncoding('utf8')
    child.stdout.on('data', (chunk) => {
      stdout += chunk
    })

    child.stderr.setEncoding('utf8')
    child.stderr.on('data', (chunk) => {
      stderr += chunk
    })

    child.on('error', (error) => {
      clearTimeout(timer)
      reject(error)
    })

    child.on('close', (code) => {
      clearTimeout(timer)
      if (code !== 0) {
        const stderrMessage = stderr.trim()
        reject(
          new Error(
            `Adapter command exited with code ${code}${
              stderrMessage.length > 0 ? `: ${stderrMessage}` : ''
            }`
          )
        )
        return
      }

      try {
        resolve(parseJsonFromOutput(stdout))
      } catch (error) {
        reject(error)
      }
    })

    child.stdin.end(JSON.stringify(payload))
  })
}

export async function invokeHttpAdapter({ endpoint, payload, timeoutMs }) {
  if (typeof endpoint !== 'string' || endpoint.trim().length === 0) {
    throw new Error('HTTP mode requires a non-empty adapter endpoint')
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    })

    if (!response.ok) {
      const body = await response.text()
      throw new Error(`Adapter endpoint ${endpoint} returned ${response.status}: ${body}`)
    }

    return await response.json()
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`Adapter endpoint timed out after ${timeoutMs}ms`)
    }
    throw error
  } finally {
    clearTimeout(timer)
  }
}

export function createAdapterInvoker({ mode, command, endpoint, timeoutMs }) {
  const normalizedMode = String(mode ?? '').trim().toLowerCase()
  const normalizedTimeout = Number.isFinite(Number(timeoutMs)) ? Number(timeoutMs) : 15000

  if (normalizedMode === 'command') {
    return async (payload) =>
      await invokeCommandAdapter({
        command,
        payload,
        timeoutMs: normalizedTimeout,
      })
  }

  if (normalizedMode === 'http') {
    return async (payload) =>
      await invokeHttpAdapter({
        endpoint,
        payload,
        timeoutMs: normalizedTimeout,
      })
  }

  throw new Error(`Unsupported adapter mode: ${String(mode)}`)
}

export { parseJsonFromOutput }
