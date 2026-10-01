const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

function createPNG(size, r, g, b) {
  const SIG = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const table = Array.from({ length: 256 }, (_, i) => {
    let v = i;
    for (let j = 0; j < 8; j++) v = (v & 1) ? 0xEDB88320 ^ (v >>> 1) : v >>> 1;
    return v;
  });
  const crc32 = (buf) => {
    let c = 0xFFFFFFFF;
    for (const b of buf) c = table[(c ^ b) & 0xFF] ^ (c >>> 8);
    return (c ^ 0xFFFFFFFF) >>> 0;
  };
  const chunk = (type, data) => {
    const l = Buffer.alloc(4); l.writeUInt32BE(data.length);
    const t = Buffer.from(type);
    const cr = Buffer.alloc(4); cr.writeUInt32BE(crc32(Buffer.concat([t, data])));
    return Buffer.concat([l, t, data, cr]);
  };
  const hdr = Buffer.alloc(13);
  hdr.writeUInt32BE(size, 0); hdr.writeUInt32BE(size, 4);
  hdr[8] = 8; hdr[9] = 2;
  const raw = Buffer.alloc(size * (size * 3 + 1));
  for (let y = 0; y < size; y++) {
    raw[y * (size * 3 + 1)] = 0;
    for (let x = 0; x < size; x++) {
      const i = y * (size * 3 + 1) + 1 + x * 3;
      raw[i] = r; raw[i + 1] = g; raw[i + 2] = b;
    }
  }
  return Buffer.concat([SIG, chunk('IHDR', hdr), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}

const out192 = path.join(__dirname, '..', 'public', 'icon-192.png');
const out512 = path.join(__dirname, '..', 'public', 'icon-512.png');

fs.writeFileSync(out192, createPNG(192, 249, 115, 22));
fs.writeFileSync(out512, createPNG(512, 249, 115, 22));

console.log('✓ icon-192.png ->', out192);
console.log('✓ icon-512.png ->', out512);
