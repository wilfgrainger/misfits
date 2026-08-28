// Generates public/favicon.ico from the club mark palette.
// A concentric-ring bullseye on the near-black club ground, matching
// public/brand/misfits-501-mark.svg. Emits a 16x16 + 32x32 ICO (32-bit BGRA).
import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const outPath = resolve(here, '..', 'public', 'favicon.ico');

// Palette from misfits-501-mark.svg
const GROUND = [0x09, 0x0d, 0x0c]; // #090d0c
const OUTER = [0x2a, 0x36, 0x30]; // #2a3630
const INNER = [0xf3, 0xf5, 0xef]; // #f3f5ef
const BULL = [0xd4, 0x40, 0x40]; // #d44040

/** Render one square RGBA image of the bullseye at the given size. */
function renderImage(size) {
  const px = Buffer.alloc(size * size * 4); // RGBA
  const c = (size - 1) / 2;
  // Radii as a fraction of half-size, tracking the SVG proportions (r=66/40/15 of 96).
  const half = size / 2;
  const rOuter = half * (66 / 96);
  const rOuterInner = rOuter - Math.max(1, size * (10 / 192)); // ring thickness
  const rInner = half * (40 / 96);
  const rInnerInner = rInner - Math.max(1, size * (12 / 192));
  const rBull = half * (15 / 96);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = x - c;
      const dy = y - c;
      const dist = Math.sqrt(dx * dx + dy * dy);
      let rgb = GROUND;
      if (dist <= rBull) rgb = BULL;
      else if (dist <= rInner && dist >= rInnerInner) rgb = INNER;
      else if (dist <= rOuter && dist >= rOuterInner) rgb = OUTER;
      const i = (y * size + x) * 4;
      px[i] = rgb[0];
      px[i + 1] = rgb[1];
      px[i + 2] = rgb[2];
      px[i + 3] = 0xff; // opaque
    }
  }
  return px;
}

/** Build a BMP (DIB) body for an ICO entry: BITMAPINFOHEADER + BGRA pixels + AND mask. */
function buildDib(size, rgba) {
  const headerSize = 40;
  const xorSize = size * size * 4;
  // AND mask: 1 bit per pixel, rows padded to 32-bit boundary. All zero (opaque).
  const andRowBytes = Math.ceil(size / 32) * 4;
  const andSize = andRowBytes * size;
  const buf = Buffer.alloc(headerSize + xorSize + andSize);

  buf.writeUInt32LE(headerSize, 0); // biSize
  buf.writeInt32LE(size, 4); // biWidth
  buf.writeInt32LE(size * 2, 8); // biHeight (XOR + AND)
  buf.writeUInt16LE(1, 12); // biPlanes
  buf.writeUInt16LE(32, 14); // biBitCount
  buf.writeUInt32LE(0, 16); // biCompression = BI_RGB
  buf.writeUInt32LE(xorSize, 20); // biSizeImage

  // Pixels are bottom-up, BGRA.
  let o = headerSize;
  for (let y = size - 1; y >= 0; y--) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      buf[o++] = rgba[i + 2]; // B
      buf[o++] = rgba[i + 1]; // G
      buf[o++] = rgba[i]; // R
      buf[o++] = rgba[i + 3]; // A
    }
  }
  // AND mask stays zero.
  return buf;
}

function buildIco(sizes) {
  const images = sizes.map((size) => buildDib(size, renderImage(size)));
  const count = images.length;
  const header = Buffer.alloc(6 + count * 16);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type = icon
  header.writeUInt16LE(count, 4); // count

  let offset = 6 + count * 16;
  images.forEach((img, idx) => {
    const size = sizes[idx];
    const e = 6 + idx * 16;
    header.writeUInt8(size >= 256 ? 0 : size, e); // width
    header.writeUInt8(size >= 256 ? 0 : size, e + 1); // height
    header.writeUInt8(0, e + 2); // colors
    header.writeUInt8(0, e + 3); // reserved
    header.writeUInt16LE(1, e + 4); // planes
    header.writeUInt16LE(32, e + 6); // bit count
    header.writeUInt32LE(img.length, e + 8); // bytes
    header.writeUInt32LE(offset, e + 12); // offset
    offset += img.length;
  });

  return Buffer.concat([header, ...images]);
}

mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, buildIco([16, 32]));
console.log(`Wrote ${outPath}`);
