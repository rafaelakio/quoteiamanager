#!/usr/bin/env node
/**
 * Quote IA Manager — Claude Code Stop hook
 *
 * Configure em ~/.claude/settings.json:
 *   "hooks": {
 *     "Stop": [{ "type": "command", "command": "node /caminho/para/claude-code-hook.js" }]
 *   }
 */

const fs = require('fs')
const http = require('http')

const INGEST_URL = 'http://127.0.0.1:47821/usage'

async function main() {
  const raw = await readStdin()
  let payload
  try { payload = JSON.parse(raw) } catch { process.exit(0) }

  const { session_id, transcript_path } = payload
  if (!transcript_path) process.exit(0)

  // Wait briefly for the file to be fully written
  await sleep(500)

  if (!fs.existsSync(transcript_path)) process.exit(0)

  const lines = fs.readFileSync(transcript_path, 'utf-8').split('\n').filter(Boolean)
  const sessions = {}

  for (const line of lines) {
    let entry
    try { entry = JSON.parse(line) } catch { continue }

    // Format: { type: "assistant", message: { model, usage: { input_tokens, output_tokens, ... } }, sessionId, uuid }
    if (entry.type !== 'assistant') continue
    const msg = entry.message
    if (!msg?.usage || !msg?.model) continue

    const model = msg.model
    const sid = entry.sessionId ?? session_id ?? 'unknown'
    const key = `${sid}::${model}`

    if (!sessions[key]) sessions[key] = { model, input: 0, output: 0, cacheCreate: 0, cacheRead: 0, count: 0, sid, ts: entry.timestamp }

    sessions[key].input += msg.usage.input_tokens ?? 0
    sessions[key].output += msg.usage.output_tokens ?? 0
    sessions[key].cacheCreate += msg.usage.cache_creation_input_tokens ?? 0
    sessions[key].cacheRead += msg.usage.cache_read_input_tokens ?? 0
    sessions[key].count++
    if (entry.timestamp) sessions[key].ts = entry.timestamp
  }

  for (const s of Object.values(sessions)) {
    const totalInput = s.input + s.cacheCreate + s.cacheRead
    if (totalInput + s.output === 0) continue
    try {
      await post(INGEST_URL, {
        model: s.model,
        inputTokens: totalInput,
        outputTokens: s.output,
        sessionId: s.sid,
      })
    } catch { /* app não está rodando */ }
  }

  process.exit(0)
}

function readStdin() {
  return new Promise(resolve => {
    let data = ''
    process.stdin.setEncoding('utf-8')
    process.stdin.on('data', c => { data += c })
    process.stdin.on('end', () => resolve(data.trim()))
    setTimeout(() => resolve('{}'), 3000)
  })
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)) }

function post(url, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body)
    const req = http.request(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) },
    }, res => { res.resume(); res.on('end', resolve) })
    req.on('error', reject)
    req.setTimeout(3000, () => { req.destroy(); reject(new Error('timeout')) })
    req.write(data)
    req.end()
  })
}

main()
