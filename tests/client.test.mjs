import test from 'node:test'
import assert from 'node:assert/strict'
import { SiYuanClient, SiYuanError } from '../lib/client.js'

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

test('request unwraps SiYuan envelope and sends auth header', async () => {
  let captured
  const fetchFn = async (url, init) => {
    captured = { url, init }
    return jsonResponse({ code: 0, msg: '', data: { ok: true } })
  }

  const client = new SiYuanClient({
    baseUrl: 'http://127.0.0.1:6806/',
    apiToken: 'secret',
    timeoutMs: 1000,
    fetchFn,
  })

  const data = await client.request('/api/query/sql', { stmt: 'SELECT 1' })
  assert.deepEqual(data, { ok: true })
  assert.equal(captured.url, 'http://127.0.0.1:6806/api/query/sql')
  assert.equal(captured.init.headers.Authorization, 'Token secret')
  assert.equal(captured.init.body, JSON.stringify({ stmt: 'SELECT 1' }))
})

test('request throws SiYuanError on non-zero code', async () => {
  const fetchFn = async () => jsonResponse({ code: -1, msg: 'bad', data: null })
  const client = new SiYuanClient({
    baseUrl: 'http://127.0.0.1:6806',
    apiToken: '',
    timeoutMs: 1000,
    fetchFn,
  })

  await assert.rejects(
    client.request('/api/query/sql', { stmt: 'SELECT 1' }),
    (err) => err instanceof SiYuanError && /bad/.test(err.message),
  )
})

test('request throws SiYuanError on HTTP error', async () => {
  const fetchFn = async () => new Response('nope', { status: 500, statusText: 'Internal Server Error' })
  const client = new SiYuanClient({
    baseUrl: 'http://127.0.0.1:6806',
    apiToken: '',
    timeoutMs: 1000,
    fetchFn,
  })

  await assert.rejects(
    client.request('/api/query/sql', { stmt: 'SELECT 1' }),
    (err) => err instanceof SiYuanError && err.message.includes('HTTP 500'),
  )
})
