import test from 'node:test'
import assert from 'node:assert/strict'
import { clampLimit, normalizeDocPath, splitDocPath, withSySuffix } from '../lib/utils.js'

test('normalizeDocPath', () => {
  assert.equal(normalizeDocPath('/a/b/'), '/a/b')
  assert.equal(normalizeDocPath('a/b'), '/a/b')
  assert.equal(normalizeDocPath('/'), '/')
})

test('withSySuffix', () => {
  assert.equal(withSySuffix('/a/b'), '/a/b.sy')
  assert.equal(withSySuffix('/a/b.SY'), '/a/b.SY')
})

test('splitDocPath', () => {
  assert.deepEqual(splitDocPath('/a/b/name'), { dir: '/a/b', name: 'name' })
  assert.deepEqual(splitDocPath('/name'), { dir: '/', name: 'name' })
})

test('clampLimit', () => {
  assert.equal(clampLimit(undefined), 50)
  assert.equal(clampLimit(0), 1)
  assert.equal(clampLimit(999), 500)
  assert.equal(clampLimit(10.9), 10)
})
