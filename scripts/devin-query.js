#!/usr/bin/env node
// Reads Devin CLI sessions.db and returns new usage records as JSON.
// Runs with system Node.js (>=22.5) which has node:sqlite built-in.
// Args: <db-path> <last-row-id>

'use strict'
const { DatabaseSync } = require('node:sqlite')

const [,, dbPath, lastRowIdArg = '0'] = process.argv
const lastRowId = parseInt(lastRowIdArg, 10) || 0

if (!dbPath) {
  process.stdout.write('[]')
  process.exit(0)
}

try {
  const db = new DatabaseSync(dbPath, { open: true })

  const rows = db.prepare(`
    SELECT mn.row_id, mn.session_id, s.model AS session_model, mn.chat_message
    FROM message_nodes mn
    JOIN sessions s ON mn.session_id = s.id
    WHERE mn.row_id > ?
      AND json_extract(mn.chat_message, '$.role') = 'assistant'
      AND json_extract(mn.chat_message, '$.metadata.metrics') IS NOT NULL
    ORDER BY mn.row_id ASC
    LIMIT 1000
  `).all(lastRowId)

  db.close()

  const result = []
  for (const row of rows) {
    try {
      const msg = JSON.parse(row.chat_message)
      const meta = msg?.metadata ?? {}
      const metrics = meta?.metrics ?? {}
      const inputTokens = metrics.input_tokens ?? 0
      const outputTokens = metrics.output_tokens ?? 0
      if (!inputTokens && !outputTokens) continue
      result.push({
        rowId: row.row_id,
        sessionId: row.session_id,
        sessionModel: row.session_model,
        requestId: meta.request_id ?? null,
        inputTokens,
        outputTokens,
        cacheReadTokens: metrics.cache_read_tokens ?? 0,
        cacheCreationTokens: metrics.cache_creation_tokens ?? 0,
        createdAt: meta.created_at ?? new Date().toISOString(),
        generationModel: meta.generation_model ?? row.session_model,
      })
    } catch { /* skip malformed row */ }
  }

  process.stdout.write(JSON.stringify(result))
} catch {
  process.stdout.write('[]')
}
