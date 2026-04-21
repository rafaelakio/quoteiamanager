'use strict'
// Wraps a PNG file into an ICO container (PNG-in-ICO, valid on Windows Vista+)
const fs = require('fs')
const path = require('path')

const png = fs.readFileSync(path.join(__dirname, '../build/icon.png'))
const dataOffset = 6 + 16 // header(6) + one directory entry(16)
const ico = Buffer.alloc(dataOffset + png.length)

// Header
ico.writeUInt16LE(0, 0)  // reserved
ico.writeUInt16LE(1, 2)  // type: 1 = ICO
ico.writeUInt16LE(1, 4)  // image count

// Directory entry
ico[6]  = 0    // width  (0 means 256)
ico[7]  = 0    // height (0 means 256)
ico[8]  = 0    // color count
ico[9]  = 0    // reserved
ico.writeUInt16LE(1,  10)  // color planes
ico.writeUInt16LE(32, 12)  // bits per pixel
ico.writeUInt32LE(png.length, 14)  // image data size
ico.writeUInt32LE(dataOffset,  18) // image data offset

png.copy(ico, dataOffset)

const out = path.join(__dirname, '../build/icon.ico')
fs.writeFileSync(out, ico)
console.log('icon.ico saved (' + ico.length + ' bytes)')
