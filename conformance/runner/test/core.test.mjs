import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'

import {
  assertConformanceReportShape,
  determineConformanceLevel,
  normalizeExpectedEntries,
  runConformanceSuite,
} from '../src/core.mjs'

test('normalizeExpectedEntries supports object shape and deterministic sorting', () => {
  const entries = normalizeExpectedEntries(
    {
      fixtures: [
        {
          filename: 'fixtures/z.jsonld',
          expectedResult: 'reject',
          reason: 'bad fixture',
          category: 'required-fields',
          conformanceLevel: 'baseline',
        },
        {
          filename: 'fixtures/a.jsonld',
          expectedResult: 'accept',
          reason: 'good fixture',
          category: 'required-fields',
        },
      ],
    },
    '0.1'
  )

  assert.equal(entries[0].filename, 'fixtures/a.jsonld')
  assert.equal(entries[1].filename, 'fixtures/z.jsonld')
  assert.equal(entries[0].conformanceLevel, 'baseline')
})

test('determineConformanceLevel picks highest fully passing version', () => {
  assert.equal(
    determineConformanceLevel({
      'v0.1': { total: 1, passed: 1, failed: 0, skipped: 0, details: [] },
      'v0.2': { total: 2, passed: 2, failed: 0, skipped: 0, details: [] },
    }),
    'v0.2-baseline'
  )

  assert.equal(
    determineConformanceLevel({
      'v0.2': {
        total: 2,
        passed: 2,
        failed: 0,
        skipped: 0,
        details: [{ conformanceLevel: 'baseline' }, { conformanceLevel: 'extended' }],
      },
    }),
    'v0.2-extended'
  )

  assert.equal(
    determineConformanceLevel({
      'v0.1': { total: 1, passed: 1, failed: 0, skipped: 0, details: [] },
      'v0.2': { total: 2, passed: 1, failed: 1, skipped: 0, details: [] },
    }),
    'v0.1-baseline'
  )

  assert.equal(
    determineConformanceLevel({
      'v0.1': { total: 2, passed: 1, failed: 1, skipped: 0, details: [] },
    }),
    'none'
  )
})

test('runConformanceSuite compares adapter output and builds report shape', async () => {
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'um-runner-test-'))
  const conformanceRoot = path.join(tempRoot, 'conformance')
  const v01Root = path.join(conformanceRoot, 'v0.1')
  const fixtureRoot = path.join(v01Root, 'fixtures')

  await fs.mkdir(fixtureRoot, { recursive: true })

  await fs.writeFile(
    path.join(v01Root, 'expected.json'),
    JSON.stringify([
      {
        filename: 'fixtures/accept.json',
        expectedResult: 'accept',
        reason: 'should pass',
        category: 'baseline',
        specVersion: '0.1',
      },
      {
        filename: 'fixtures/reject.json',
        expectedResult: 'reject',
        reason: 'should reject',
        category: 'baseline',
        specVersion: '0.1',
      },
    ]),
    'utf8'
  )

  await fs.writeFile(
    path.join(fixtureRoot, 'accept.json'),
    JSON.stringify({ manifestVersion: '0.1', id: 'urn:um:test:accept', _forceResult: 'accept' }),
    'utf8'
  )

  await fs.writeFile(
    path.join(fixtureRoot, 'reject.json'),
    JSON.stringify({ manifestVersion: '0.1', id: 'urn:um:test:reject', _forceResult: 'reject' }),
    'utf8'
  )

  const report = await runConformanceSuite({
    conformanceRoot,
    versions: ['0.1'],
    implementation: {
      name: 'test-validator',
      version: '1.2.3',
      language: 'javascript',
      organization: 'acme',
      repository: 'https://example.com/repo',
    },
    suiteVersion: '1.0.0',
    now: new Date('2026-03-01T00:00:00.000Z'),
    invokeAdapter: async (fixture) => ({ result: fixture._forceResult, reason: 'synthetic' }),
  })

  assert.equal(report.pass, true)
  assert.equal(report.specVersionsTested.join(','), '0.1')
  assert.equal(report.results['v0.1'].total, 2)
  assert.equal(report.results['v0.1'].failed, 0)
  assert.equal(report.conformanceLevel, 'v0.1-baseline')

  assertConformanceReportShape(report)
})
