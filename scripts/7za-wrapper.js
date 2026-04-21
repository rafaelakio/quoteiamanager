#!/usr/bin/env node
// Wrapper for 7za that treats symlink creation failures as success.
// Used during electron-builder to bypass the winCodeSign macOS dylib symlinks
// that cannot be created on Windows without Developer Mode or admin privileges.

const { spawnSync } = require('child_process')
const fs = require('fs')
const path = require('path')

const real7za = process.env.REAL_7ZA_PATH
if (!real7za) {
  process.stderr.write('[7za-wrapper] REAL_7ZA_PATH not set\n')
  process.exit(2)
}

const result = spawnSync(real7za, process.argv.slice(2), {
  stdio: ['inherit', 'inherit', 'pipe'],
  maxBuffer: 20 * 1024 * 1024,
})

const stderr = (result.stderr || Buffer.alloc(0)).toString()

if ((result.status === 1 || result.status === 2) && stderr.includes('Cannot create symbolic link')) {
  // Find output dir from -o flag (e.g. '-oC:\path\to\dir')
  const oArg = process.argv.slice(2).find(a => a.startsWith('-o'))
  if (oArg) {
    const outDir = oArg.slice(2)
    // These are the only two problematic symlinks in winCodeSign darwin packages
    const stubs = [
      'darwin/10.12/lib/libcrypto.dylib',
      'darwin/10.12/lib/libssl.dylib',
    ]
    for (const stub of stubs) {
      const fullPath = path.join(outDir, stub)
      if (!fs.existsSync(fullPath)) {
        try {
          fs.mkdirSync(path.dirname(fullPath), { recursive: true })
          fs.writeFileSync(fullPath, '')
        } catch {
          // ignore — stub creation failure is non-fatal
        }
      }
    }
  }
  // Write stderr to actual stderr so electron-builder can still log it (as info, not error)
  process.stderr.write(stderr)
  process.exit(0)
}

process.exit(result.status ?? 1)
