import zlib from 'zlib';
import fs from 'fs';

const crcTable = new Uint32Array(256);
for (let i = 0; i < 256; i++) {
  let c = i;
  for (let j = 0; j < 8; j++) c = (c & 1) ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
  crcTable[i] = c;
}
function crc32(buf) {
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) crc = crcTable[(crc ^ buf[i]) & 0xFF] ^ (crc >>> 8);
  return (crc ^ 0xFFFFFFFF) >>> 0;
}
function int32(n) { const b = Buffer.alloc(4); b.writeUInt32BE(n); return b; }
function chunk(type, data) {
  const t = Buffer.from(type);
  const crc = int32(crc32(Buffer.concat([t, data])));
  return Buffer.concat([int32(data.length), t, data, crc]);
}
function createPNG(size, r, g, b) {
  const sig = Buffer.from([137,80,78,71,13,10,26,10]);
  const ihdr = chunk('IHDR', Buffer.concat([int32(size), int32(size), Buffer.from([8,2,0,0,0])]));
  const row = Buffer.alloc(1 + size * 3);
  for (let x = 0; x < size; x++) { row[1+x*3]=r; row[2+x*3]=g; row[3+x*3]=b; }
  const raw = Buffer.concat(Array.from({length: size}, () => row));
  const idat = chunk('IDAT', zlib.deflateSync(raw));
  const iend = chunk('IEND', Buffer.alloc(0));
  return Buffer.concat([sig, ihdr, idat, iend]);
}

// Indigo #6366f1
fs.mkdirSync('public/icons', { recursive: true });
fs.writeFileSync('public/icons/icon-192.png', createPNG(192, 99, 102, 241));
fs.writeFileSync('public/icons/icon-512.png', createPNG(512, 99, 102, 241));
console.log('Icons created!');
