const fs = require('fs');
const path = require('path');
const { Jimp } = require('jimp');

async function makeIcons() {
  const sourceLogo = path.join(__dirname, '..', 'assets', 'brand', 'logo.png');
  if (!fs.existsSync(sourceLogo)) {
    console.error('Source logo does not exist at', sourceLogo);
    return;
  }

  const solidImg = await Jimp.read(sourceLogo);

  // Generate transparent logo
  const bgR = 0x1f, bgG = 0x26, bgB = 0x2e;
  const clone = solidImg.clone();
  for (let y = 0; y < 1024; y++) {
    for (let x = 0; x < 1024; x++) {
      const idx = (y * 1024 + x) * 4;
      const r = clone.bitmap.data[idx];
      const g = clone.bitmap.data[idx + 1];
      const b = clone.bitmap.data[idx + 2];
      const dist = Math.sqrt((r - bgR) ** 2 + (g - bgG) ** 2 + (b - bgB) ** 2);
      if (dist < 15) {
        clone.bitmap.data[idx + 3] = 0;
      } else if (dist < 30) {
        const alpha = Math.floor(((dist - 15) / 15) * 255);
        clone.bitmap.data[idx + 3] = alpha;
      }
    }
  }

  const transBuf = await clone.getBuffer('image/png');
  const transLogoPath = path.join(__dirname, '..', 'assets', 'brand', 'logo-transparent.png');
  fs.writeFileSync(transLogoPath, transBuf);

  const transImg = await Jimp.read(transLogoPath);

  // Tray icons
  const tray32 = transImg.clone().resize({ w: 32, h: 32 });
  const tray64 = transImg.clone().resize({ w: 64, h: 64 });
  fs.writeFileSync(path.join(__dirname, '..', 'assets', 'brand', 'tray.png'), await tray32.getBuffer('image/png'));
  fs.writeFileSync(path.join(__dirname, '..', 'assets', 'brand', 'tray@2x.png'), await tray64.getBuffer('image/png'));

  // Icon PNGs
  const icon512 = solidImg.clone().resize({ w: 512, h: 512 });
  const icon256 = solidImg.clone().resize({ w: 256, h: 256 });
  fs.writeFileSync(path.join(__dirname, '..', 'assets', 'brand', 'icon.png'), await icon512.getBuffer('image/png'));
  fs.writeFileSync(path.join(__dirname, '..', 'assets', 'brand', 'icon-256.png'), await icon256.getBuffer('image/png'));

  const buildDir = path.join(__dirname, '..', 'build');
  if (!fs.existsSync(buildDir)) fs.mkdirSync(buildDir, { recursive: true });
  fs.writeFileSync(path.join(buildDir, 'icon.png'), await icon512.getBuffer('image/png'));

  // Multi-resolution ICO
  const sizes = [256, 128, 64, 48, 32, 16];
  const pngBuffers = [];
  for (const s of sizes) {
    const resized = solidImg.clone().resize({ w: s, h: s });
    const buf = await resized.getBuffer('image/png');
    pngBuffers.push({ size: s, buf });
  }

  const count = pngBuffers.length;
  const headerSize = 6 + count * 16;
  let currentOffset = headerSize;
  const entries = [];

  for (const item of pngBuffers) {
    entries.push({
      width: item.size === 256 ? 0 : item.size,
      height: item.size === 256 ? 0 : item.size,
      colorCount: 0,
      reserved: 0,
      planes: 1,
      bitCount: 32,
      bytesInRes: item.buf.length,
      imageOffset: currentOffset,
      buf: item.buf
    });
    currentOffset += item.buf.length;
  }

  const icoBuf = Buffer.alloc(currentOffset);
  icoBuf.writeUInt16LE(0, 0);
  icoBuf.writeUInt16LE(1, 2);
  icoBuf.writeUInt16LE(count, 4);

  let entryPos = 6;
  for (const e of entries) {
    icoBuf.writeUInt8(e.width, entryPos);
    icoBuf.writeUInt8(e.height, entryPos + 1);
    icoBuf.writeUInt8(e.colorCount, entryPos + 2);
    icoBuf.writeUInt8(e.reserved, entryPos + 3);
    icoBuf.writeUInt16LE(e.planes, entryPos + 4);
    icoBuf.writeUInt16LE(e.bitCount, entryPos + 6);
    icoBuf.writeUInt32LE(e.bytesInRes, entryPos + 8);
    icoBuf.writeUInt32LE(e.imageOffset, entryPos + 12);
    e.buf.copy(icoBuf, e.imageOffset);
    entryPos += 16;
  }

  fs.writeFileSync(path.join(__dirname, '..', 'assets', 'brand', 'icon.ico'), icoBuf);
  fs.writeFileSync(path.join(buildDir, 'icon.ico'), icoBuf);
  console.log('Successfully generated all brand icon assets.');
}

if (require.main === module) {
  makeIcons().catch(console.error);
}

module.exports = { makeIcons };
