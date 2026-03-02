import fs from 'node:fs/promises'
import path from 'node:path'

const EXPECTED_FILE_BY_VERSION = {
  '0.1': ['v0.1', 'expected.json'],
  '0.2': ['v0.2', 'expected.json'],
}

const ACCEPT = 'accept'
const REJECT = 'reject'
const REPORT_NONE = 'none'

export function normalizeSpecVersion(input) {
  const value = String(input ?? '').trim().replace(/^v/i, '')
  if (value === '0.1' || value === '0.2') return value
  throw new Error(`Unsupported spec version: ${String(input)}`)
}

export function toReportVersionKey(specVersion) {
  return `v${normalizeSpecVersion(specVersion)}`
}

function asFixtureEntries(expectedDocument) {
  if (Array.isArray(expectedDocument)) return expectedDocument
  if (expectedDocument && typeof expectedDocument === 'object') {
    if (Array.isArray(expectedDocument.fixtures)) return expectedDocument.fixtures
    if (Array.isArray(expectedDocument.tests)) return expectedDocument.tests
    if (Array.isArray(expectedDocument.cases)) return expectedDocument.cases
  }
  throw new Error('Expected manifest must be an array or contain fixtures/tests/cases array')
}

function normalizeExpectedResult(input) {
  const result = String(input ?? '').trim().toLowerCase()
  if (result === ACCEPT || result === REJECT) return result
  throw new Error(`Invalid expected result: ${String(input)}`)
}

function normalizeExpectedEntry(rawEntry, fallbackSpecVersion, index) {
  if (!rawEntry || typeof rawEntry !== 'object') {
    throw new Error(`Expected entry at index ${index} is not an object`)
  }

  const filename = rawEntry.filename ?? rawEntry.fixture ?? rawEntry.path ?? rawEntry.file
  if (typeof filename !== 'string' || filename.trim().length === 0) {
    throw new Error(`Expected entry at index ${index} is missing filename`) 
  }

  const specVersion = normalizeSpecVersion(rawEntry.specVersion ?? fallbackSpecVersion)

  return {
    filename: filename.trim(),
    expectedResult: normalizeExpectedResult(rawEntry.expectedResult ?? rawEntry.expected ?? rawEntry.result),
    reason: typeof rawEntry.reason === 'string' ? rawEntry.reason : '',
    category: typeof rawEntry.category === 'string' && rawEntry.category.length > 0 ? rawEntry.category : 'unspecified',
    specVersion,
    conformanceLevel:
      typeof rawEntry.conformanceLevel === 'string' && rawEntry.conformanceLevel.length > 0
        ? rawEntry.conformanceLevel
        : 'baseline',
  }
}

export function normalizeExpectedEntries(expectedDocument, specVersion) {
  const normalizedVersion = normalizeSpecVersion(specVersion)
  const entries = asFixtureEntries(expectedDocument)
    .map((entry, index) => normalizeExpectedEntry(entry, normalizedVersion, index))
    .sort((a, b) => a.filename.localeCompare(b.filename))

  return entries
}

async function fileExists(absolutePath) {
  try {
    await fs.access(absolutePath)
    return true
  } catch {
    return false
  }
}

async function resolveFixturePath(filename, specVersion, conformanceRoot) {
  const cleaned = filename.replace(/^\.\//, '')
  if (path.isAbsolute(cleaned)) {
    if (!(await fileExists(cleaned))) {
      throw new Error(`Fixture file not found: ${cleaned}`)
    }
    return cleaned
  }

  const versionTag = `v${normalizeSpecVersion(specVersion)}`
  const withoutVersionPrefix = cleaned.startsWith(`${versionTag}/`) ? cleaned.slice(versionTag.length + 1) : cleaned
  const repoRoot = path.resolve(conformanceRoot, '..')
  const versionRoot = path.join(conformanceRoot, versionTag)

  const candidates = [
    path.resolve(versionRoot, cleaned),
    path.resolve(versionRoot, withoutVersionPrefix),
    path.resolve(conformanceRoot, cleaned),
    path.resolve(repoRoot, cleaned),
    path.resolve(repoRoot, 'examples', versionTag, cleaned),
    path.resolve(repoRoot, 'examples', versionTag, withoutVersionPrefix),
  ]

  for (const candidate of candidates) {
    if (await fileExists(candidate)) return candidate
  }

  throw new Error(
    `Unable to resolve fixture path for "${filename}" (spec ${specVersion}). Tried:\n${candidates
      .map((candidate) => `- ${candidate}`)
      .join('\n')}`
  )
}

async function loadJsonFile(filePath) {
  const raw = await fs.readFile(filePath, 'utf8')
  try {
    return JSON.parse(raw)
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error)
    throw new Error(`Failed to parse JSON: ${filePath}: ${reason}`)
  }
}

export async function loadExpectedSuites({ conformanceRoot, versions }) {
  const normalizedRoot = path.resolve(conformanceRoot)
  const normalizedVersions = versions.map(normalizeSpecVersion)

  const suites = []

  for (const specVersion of normalizedVersions) {
    const expectedRelPath = EXPECTED_FILE_BY_VERSION[specVersion]
    if (!expectedRelPath) throw new Error(`No expected manifest mapping for version ${specVersion}`)

    const expectedPath = path.join(normalizedRoot, ...expectedRelPath)
    const expectedDocument = await loadJsonFile(expectedPath)
    const normalizedEntries = normalizeExpectedEntries(expectedDocument, specVersion)

    const fixtures = []
    for (const entry of normalizedEntries) {
      const fixturePath = await resolveFixturePath(entry.filename, entry.specVersion, normalizedRoot)
      const fixtureJson = await loadJsonFile(fixturePath)

      fixtures.push({
        ...entry,
        fixturePath,
        fixtureJson,
      })
    }

    suites.push({
      specVersion,
      reportKey: toReportVersionKey(specVersion),
      expectedPath,
      fixtures,
    })
  }

  return suites
}

export function normalizeAdapterResult(adapterResult, fallbackFixture) {
  if (!adapterResult || typeof adapterResult !== 'object') {
    throw new Error('Adapter response must be a JSON object')
  }

  const maybeResult =
    typeof adapterResult.result === 'string'
      ? adapterResult.result.toLowerCase()
      : typeof adapterResult.valid === 'boolean'
      ? adapterResult.valid
        ? ACCEPT
        : REJECT
      : ''

  if (maybeResult !== ACCEPT && maybeResult !== REJECT) {
    throw new Error('Adapter response must include result="accept" or result="reject"')
  }

  const fixture =
    typeof adapterResult.fixture === 'string' && adapterResult.fixture.trim().length > 0
      ? adapterResult.fixture
      : fallbackFixture

  const reason =
    typeof adapterResult.reason === 'string'
      ? adapterResult.reason
      : typeof adapterResult.error === 'string'
      ? adapterResult.error
      : ''

  return {
    fixture,
    result: maybeResult,
    reason,
  }
}

function summarizeVersion(details) {
  const total = details.length
  const passed = details.filter((detail) => detail.pass).length
  const failed = details.filter((detail) => !detail.pass).length

  return {
    total,
    passed,
    failed,
    skipped: 0,
    details,
  }
}

export function determineConformanceLevel(results) {
  const v02 = results['v0.2']
  if (v02 && v02.failed === 0 && v02.total > 0) {
    const hasExtendedFixtures =
      Array.isArray(v02.details) && v02.details.some((detail) => detail?.conformanceLevel === 'extended')
    if (hasExtendedFixtures) return 'v0.2-extended'
    return 'v0.2-baseline'
  }

  const v01 = results['v0.1']
  if (v01 && v01.failed === 0 && v01.total > 0) return 'v0.1-baseline'

  return REPORT_NONE
}

export function assertConformanceReportShape(report) {
  const requiredTopLevel = ['implementation', 'specVersionsTested', 'testDate', 'suiteVersion', 'results', 'conformanceLevel', 'pass']
  for (const key of requiredTopLevel) {
    if (!(key in report)) {
      throw new Error(`Conformance report missing required top-level field: ${key}`)
    }
  }

  if (!report.implementation || typeof report.implementation !== 'object') {
    throw new Error('Conformance report implementation must be an object')
  }

  const implementationFields = ['name', 'version', 'language']
  for (const key of implementationFields) {
    if (typeof report.implementation[key] !== 'string') {
      throw new Error(`Conformance report implementation.${key} must be a string`)
    }
  }

  if (
    'organization' in report.implementation &&
    typeof report.implementation.organization !== 'string'
  ) {
    throw new Error('Conformance report implementation.organization must be a string when provided')
  }

  if (
    'repository' in report.implementation &&
    typeof report.implementation.repository !== 'string'
  ) {
    throw new Error('Conformance report implementation.repository must be a string when provided')
  }

  if (!Array.isArray(report.specVersionsTested) || report.specVersionsTested.some((value) => typeof value !== 'string')) {
    throw new Error('Conformance report specVersionsTested must be an array of strings')
  }

  if (typeof report.testDate !== 'string' || Number.isNaN(Date.parse(report.testDate))) {
    throw new Error('Conformance report testDate must be an ISO-8601 string')
  }

  if (typeof report.suiteVersion !== 'string' || report.suiteVersion.length === 0) {
    throw new Error('Conformance report suiteVersion must be a non-empty string')
  }

  if (!report.results || typeof report.results !== 'object') {
    throw new Error('Conformance report results must be an object')
  }

  for (const [versionKey, summary] of Object.entries(report.results)) {
    if (!summary || typeof summary !== 'object') {
      throw new Error(`Conformance report results.${versionKey} must be an object`)
    }

    const summaryFields = ['total', 'passed', 'failed', 'skipped', 'details']
    for (const field of summaryFields) {
      if (!(field in summary)) {
        throw new Error(`Conformance report results.${versionKey} missing ${field}`)
      }
    }

    if (!Array.isArray(summary.details)) {
      throw new Error(`Conformance report results.${versionKey}.details must be an array`)
    }
  }

  if (typeof report.conformanceLevel !== 'string') {
    throw new Error('Conformance report conformanceLevel must be a string')
  }

  if (typeof report.pass !== 'boolean') {
    throw new Error('Conformance report pass must be a boolean')
  }
}

export async function runConformanceSuite({
  conformanceRoot,
  versions,
  implementation,
  suiteVersion,
  invokeAdapter,
  now = new Date(),
}) {
  const suites = await loadExpectedSuites({ conformanceRoot, versions })
  const results = {}

  for (const suite of suites) {
    const details = []

    for (const fixture of suite.fixtures) {
      try {
        const adapterRaw = await invokeAdapter(fixture.fixtureJson, fixture)
        const adapter = normalizeAdapterResult(adapterRaw, fixture.filename)

        details.push({
          fixture: fixture.filename,
          expectedResult: fixture.expectedResult,
          actualResult: adapter.result,
          pass: adapter.result === fixture.expectedResult,
          reason: fixture.reason,
          adapterReason: adapter.reason,
          category: fixture.category,
          specVersion: fixture.specVersion,
          conformanceLevel: fixture.conformanceLevel,
        })
      } catch (error) {
        const reason = error instanceof Error ? error.message : String(error)
        details.push({
          fixture: fixture.filename,
          expectedResult: fixture.expectedResult,
          actualResult: 'error',
          pass: false,
          reason: fixture.reason,
          adapterReason: reason,
          category: fixture.category,
          specVersion: fixture.specVersion,
          conformanceLevel: fixture.conformanceLevel,
        })
      }
    }

    results[suite.reportKey] = summarizeVersion(details)
  }

  const report = {
    implementation,
    specVersionsTested: versions.map(normalizeSpecVersion),
    testDate: now.toISOString(),
    suiteVersion,
    results,
    conformanceLevel: determineConformanceLevel(results),
    pass: Object.values(results).every((summary) => summary.failed === 0),
  }

  assertConformanceReportShape(report)
  return report
}

export async function writeReport(report, reportPath) {
  const outputPath = path.resolve(reportPath)
  await fs.mkdir(path.dirname(outputPath), { recursive: true })
  await fs.writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8')
  return outputPath
}
