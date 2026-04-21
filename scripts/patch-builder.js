#!/usr/bin/env node
// Patches builder-util's executeAppBuilder to use a 7za wrapper that treats
// macOS symlink creation failures as success on Windows.

const fs = require('fs')
const path = require('path')

const target = path.join(__dirname, '../node_modules/builder-util/out/util.js')

if (!fs.existsSync(target)) {
  console.log('[patch-builder] builder-util not found, skipping')
  process.exit(0)
}

let src = fs.readFileSync(target, 'utf-8')

// Patch: override SZA_PATH in executeAppBuilder to use our wrapper on Windows
// The wrapper intercepts symlink errors and exits 0 instead of 2.
const wrapperCmd = path.join(__dirname, '7za-wrapper.cmd').replace(/\\/g, '\\\\')
const real7zaExpr = `await (0, _7za_1.getPath7za)()`

const FROM = `        SZA_PATH: await (0, _7za_1.getPath7za)(),`
const TO   = `        SZA_PATH: await (0, _7za_1.getPath7za)(),
        // On Windows, wrap 7za to ignore macOS symlink errors (winCodeSign darwin dylibs)
        ...(process.platform === "win32" ? {
            REAL_7ZA_PATH: await (0, _7za_1.getPath7za)(),
            SZA_PATH: "${wrapperCmd}",
        } : {}),`

if (src.includes('REAL_7ZA_PATH')) {
  console.log('[patch-builder] already patched')
  process.exit(0)
}

if (!src.includes(FROM)) {
  console.log('[patch-builder] SZA_PATH pattern not found — skipping')
  process.exit(0)
}

src = src.replace(FROM, TO)
fs.writeFileSync(target, src, 'utf-8')
console.log('[patch-builder] patched: 7za wrapper will handle Windows symlink errors')
