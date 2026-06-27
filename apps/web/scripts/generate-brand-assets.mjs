// Draws the favicon set (./favicon) and the Open Graph card (./public/og-image.png)
// as pixel art. Every sprite is authored on a small grid and only ever scaled by
// whole numbers, so each output size stays pixel-sharp. No dependencies.
//
//   node apps/web/scripts/generate-brand-assets.mjs

import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deflateSync } from 'node:zlib';

const webRoot = join(dirname(fileURLToPath(import.meta.url)), '..');

// ---------------------------------------------------------------------------
// Colour
// ---------------------------------------------------------------------------

const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)).concat(255);
const mix = (a, b, t) => a.map((v, i) => (i === 3 ? 255 : Math.round(v + (b[i] - v) * t)));
const WHITE = hex('#FFFFFF');
const BLACK = hex('#000000');

const C = {
  bg: hex('#16161E'),
  bgDot: hex('#252532'),
  ink: hex('#0A0A10'),
  red: hex('#E3350D'),
  redLight: hex('#FF7A52'),
  redDark: hex('#A1220A'),
  shell: hex('#F4F4F8'),
  shellShade: hex('#C6C6D6'),
  shellDeep: hex('#9A9AB2'),
  gold: hex('#F7D02C'),
  goldDark: hex('#B8860B'),
  subtitle: hex('#A9A9C4'),
};

// Type colours from tailwind.config.ts, ordered by hue so the blocks sweep a
// colour wheel around the title.
const TYPE_WHEEL = [
  '#EE8130', '#F7D02C', '#A6B91A', '#7AC74C', '#96D9D6', '#6390F0', '#6F35FC',
  '#A98FF3', '#735797', '#A33EA1', '#D685AD', '#F95587', '#C22E28',
].map(hex);
const TYPE_NEUTRALS = ['#A8A77A', '#B6A136', '#E2BF65', '#B7B7CE', '#705746'].map(hex);

// ---------------------------------------------------------------------------
// Raster
// ---------------------------------------------------------------------------

class Canvas {
  constructor(width, height, fill) {
    this.width = width;
    this.height = height;
    this.data = new Uint8Array(width * height * 4);
    if (fill) this.rect(0, 0, width, height, fill);
  }

  rect(x, y, w, h, color) {
    const x0 = Math.max(0, x), y0 = Math.max(0, y);
    const x1 = Math.min(this.width, x + w), y1 = Math.min(this.height, y + h);
    for (let py = y0; py < y1; py++) {
      for (let px = x0; px < x1; px++) this.data.set(color, (py * this.width + px) * 4);
    }
  }

  // Paints a character grid; characters missing from the palette stay untouched.
  sprite(rows, palette, x, y, scale) {
    rows.forEach((row, ry) => {
      [...row].forEach((ch, rx) => {
        if (palette[ch]) this.rect(x + rx * scale, y + ry * scale, scale, scale, palette[ch]);
      });
    });
  }

  // Nearest-neighbour upscale: each source pixel becomes a scale×scale block.
  scaled(scale, pad = 0, fill) {
    const out = new Canvas(this.width * scale + pad * 2, this.height * scale + pad * 2, fill);
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const i = (y * this.width + x) * 4;
        if (this.data[i + 3] === 0) continue;
        out.rect(pad + x * scale, pad + y * scale, scale, scale, this.data.subarray(i, i + 4));
      }
    }
    return out;
  }
}

// ---------------------------------------------------------------------------
// PNG / ICO encoding
// ---------------------------------------------------------------------------

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const out = Buffer.alloc(body.length + 8);
  out.writeUInt32BE(data.length, 0);
  body.copy(out, 4);
  out.writeUInt32BE(crc32(body), body.length + 4);
  return out;
}

function encodePng(canvas) {
  const { width, height, data } = canvas;
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  // Filter type 2 ("Up") on every row: pixel art repeats rows, which then deflate to nothing.
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    const at = y * (stride + 1);
    raw[at] = 2;
    for (let x = 0; x < stride; x++) {
      const above = y ? data[(y - 1) * stride + x] : 0;
      raw[at + 1 + x] = (data[y * stride + x] - above) & 0xff;
    }
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', deflateSync(raw, { level: 9 })),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

// PNG-compressed ICO frames (supported by every browser and Windows Vista+).
function encodeIco(canvases) {
  const pngs = canvases.map(encodePng);
  const header = Buffer.alloc(6 + 16 * pngs.length);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(pngs.length, 4);
  let offset = header.length;
  canvases.forEach((c, i) => {
    const at = 6 + 16 * i;
    header[at] = c.width >= 256 ? 0 : c.width;
    header[at + 1] = c.height >= 256 ? 0 : c.height;
    header.writeUInt16LE(1, at + 4); // colour planes
    header.writeUInt16LE(32, at + 6); // bits per pixel
    header.writeUInt32LE(pngs[i].length, at + 8);
    header.writeUInt32LE(offset, at + 12);
    offset += pngs[i].length;
  });
  return Buffer.concat([header, ...pngs]);
}

// ---------------------------------------------------------------------------
// Sprites
// ---------------------------------------------------------------------------

/**
 * Ten balls out of one drawing.
 *
 * The geometry below (BALL_16 by hand, computeBall(32) procedurally) is written
 * in characters, not colours: `K` outline, `R/h/r` the top shell's mid/light/
 * dark, `H` its specular, `W/w/g` the bottom shell. So a colourway is just a
 * palette — and the four balls whose identity is a marking rather than a hue
 * (Ultra's band, Master's M, Timer's rings, Net's mesh) add a *decal*: a grid
 * of the same size painted over the ball afterwards, clipped to the silhouette
 * so it can never leak past the outline.
 */

/** Builds the eight base keys from a top colour and a bottom colour. */
function shell(top, bottom, { ink = C.ink } = {}) {
  return {
    K: ink,
    R: top,
    h: mix(top, WHITE, 0.4),
    r: mix(top, BLACK, 0.35),
    H: mix(top, WHITE, 0.85),
    W: bottom,
    w: mix(bottom, BLACK, 0.2),
    g: mix(bottom, BLACK, 0.38),
  };
}

const ACCENT = {
  gold: hex('#F7D02C'),
  goldDeep: hex('#B8860B'),
  pink: hex('#E75BA8'),
  crimson: hex('#CE2020'),
  ink: hex('#17171C'),
  sky: hex('#5BC8F5'),
  navy: hex('#123C86'),
  teal: hex('#0E6F77'),
  ember: hex('#F0761E'),
};

const BALL_PALETTES = {
  'poke-ball': shell(C.red, C.shell),
  'great-ball': { ...shell(hex('#2064C8'), C.shell), A: C.red, a: WHITE },
  'ultra-ball': { ...shell(hex('#27272E'), C.shell), A: ACCENT.gold, a: ACCENT.goldDeep },
  'master-ball': { ...shell(hex('#7A34B0'), C.shell), A: ACCENT.pink, a: WHITE },
  'beast-ball': { ...shell(hex('#3E47A0'), hex('#DFE3F7')), A: ACCENT.gold, a: ACCENT.sky },
  'luxury-ball': { ...shell(hex('#232326'), hex('#1A1A1D'), { ink: hex('#050507') }), A: ACCENT.gold, a: ACCENT.crimson },
  'quick-ball': { ...shell(hex('#F2C230'), C.shell), A: ACCENT.navy, a: ACCENT.sky },
  'dusk-ball': { ...shell(hex('#1E6B45'), hex('#26262B')), A: ACCENT.ember, a: hex('#3FD98A') },
  'timer-ball': { ...shell(C.shell, C.shell), A: ACCENT.crimson, a: ACCENT.ink },
  'net-ball': { ...shell(hex('#17919B'), C.shell), A: ACCENT.navy, a: ACCENT.teal },
};

/**
 * Decals, authored on the 16-grid and scaled up for the 32. `.` means "leave
 * the ball alone"; every other character is a palette key.
 */
const BALL_DECALS = {
  // Red shoulders sweeping up from the band, the way the Great Ball's caps read.
  'great-ball': [
    '................',
    '...AA......AA...',
    '..AAA......AAA..',
    '.AAA........AAA.',
    '.AAa........aAA.',
    '.AAA........AAA.',
    '.AAA........AAA.',
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
  ],
  // The Ultra Ball's gold H.
  'ultra-ball': [
    '................',
    '................',
    '....A......A....',
    '....A......A....',
    '....AAAAAAAA....',
    '....A......A....',
    '....A......A....',
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
  ],
  // Master Ball: the M between two studs.
  'master-ball': [
    '................',
    '................',
    '.....A....A.....',
    '..aa.AA..AA.aa..',
    '..aa.A.AA.A.aa..',
    '.....A....A.....',
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
  ],
  // Beast Ball: concentric bands, gold over sky.
  'beast-ball': [
    '................',
    '....AAAAAAAA....',
    '..aa........aa..',
    '..AAAA....AAAA..',
    '.aa..........aa.',
    '.AAAA......AAAA.',
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
  ],
  // Luxury Ball: gold trim hugging the band, a crimson crown on top.
  'luxury-ball': [
    '................',
    '.....aaaaaa.....',
    '....aa....aa....',
    '................',
    '................',
    '.AAAAAA..AAAAAA.',
    '.AAAAA....AAAAA.',
    '................',
    '................',
    '.AAAAA....AAAAA.',
    '.AAAAAA..AAAAAA.',
    '................',
    '................',
    '................',
    '................',
    '................',
  ],
  // Quick Ball: blue speed lines raking up the sides, yellow crown left showing.
  'quick-ball': [
    '................',
    '................',
    '...AA......AA...',
    '..AA........AA..',
    '..A..........A..',
    '.AA..........AA.',
    '.A............A.',
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
  ],
  // Dusk Ball: the ember ring, and a pale green glow under the crown.
  'dusk-ball': [
    '................',
    '................',
    '.....aaaaaa.....',
    '................',
    '.AAAAAA..AAAAAA.',
    '.AAAAAA..AAAAAA.',
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
  ],
  // Timer Ball: the red rings over black, on a silver shell.
  'timer-ball': [
    '................',
    '...aaaaaaaaaa...',
    '..AAAAAAAAAAAA..',
    '.aaaaaaaaaaaaaa.',
    '.AAAAAAAAAAAAAA.',
    '.aaaaaa..aaaaaa.',
    '.AAAAA....AAAAA.',
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
  ],
  // Net Ball: a sparse lattice, so the teal still reads through the mesh.
  'net-ball': [
    '................',
    '................',
    '....A..A..A.....',
    '....A..A..A.....',
    '..AAAAAAAAAAAA..',
    '....A.....A.....',
    '....A.....A.....',
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
  ],
};

/**
 * Paints a decal onto a ball grid. Cells outside the silhouette and the ink
 * outline are left alone, so a decal can be drawn loosely and still land
 * inside the ball at any size.
 */
function applyDecal(rows, decal) {
  if (!decal) return rows;
  return rows.map((row, y) =>
    [...row]
      .map((ch, x) => {
        const mark = decal[y]?.[x];
        if (!mark || mark === '.' || ch === '.' || ch === 'K') return ch;
        return mark;
      })
      .join(''),
  );
}

/** Nearest-neighbour upscale of a character grid, for the 32px ball. */
function scaleGrid(rows, factor) {
  return rows.flatMap((row) => {
    const wide = [...row].flatMap((ch) => Array(factor).fill(ch)).join('');
    return Array(factor).fill(wide);
  });
}

// Hand-placed for 16px, where a computed circle turns to mush.
const BALL_16 = [
  '.....KKKKKK.....',
  '...KKRRRRRRKK...',
  '..KRRhRRRRRRRK..',
  '.KRhHhRRRRRRRrK.',
  '.KRRhRRRRRRRRrK.',
  'KRRRRRRKKRRRRrrK',
  'KRRRRRKWWKRRrrrK',
  'KKKKKKWWWWKKKKKK',
  'KKKKKKWWwwKKKKKK',
  'KWWWWWKWwKWWWwwK',
  'KWWWWWWKKWWWWwwK',
  '.KWWWWWWWWWWWwK.',
  '.KWWWWWWWWWWwwK.',
  '..KWWWWWWWwwwK..',
  '...KKwwwwwwKK...',
  '.....KKKKKK.....',
];

// Larger sizes get a 32-grid ball lit from the top-left.
function computeBall(n) {
  const s = n / 16;
  const c = n / 2;
  const light = [-0.5, -0.62, 0.6];
  const len = Math.hypot(...light);
  const inner = c - s * 1.05;
  const rows = [];
  for (let y = 0; y < n; y++) {
    let row = '';
    for (let x = 0; x < n; x++) {
      const dx = x + 0.5 - c;
      const dy = y + 0.5 - c;
      const d = Math.hypot(dx, dy);
      const nx = dx / c, ny = dy / c;
      const nz = Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny));
      const lambert = (nx * light[0] + ny * light[1] + nz * light[2]) / len;
      let ch;
      if (d > c - 0.3) ch = '.';
      else if (d > inner) ch = 'K';
      else if (d <= 2.3 * s) ch = dx + dy > 1.5 * s ? 'w' : 'W';
      else if (d <= 3.3 * s) ch = 'K';
      else if (Math.abs(dy) <= s) ch = 'K';
      else if (dy < 0) ch = lambert > 0.97 ? 'H' : lambert > 0.9 ? 'h' : lambert > 0.35 ? 'R' : 'r';
      // The shell is shaded with crescents: pixels outside a disc nudged towards the light.
      else if (Math.hypot(dx + s, dy + s) < inner) ch = 'W';
      else ch = Math.hypot(dx + 2.2 * s, dy + 2.2 * s) < inner ? 'w' : 'g';
      row += ch;
    }
    rows.push(row);
  }
  return rows;
}

const BALL_32 = computeBall(32);

function ballCanvas(rows, palette = BALL_PALETTES['poke-ball']) {
  const canvas = new Canvas(rows.length, rows.length);
  canvas.sprite(rows, palette, 0, 0, 1);
  return canvas;
}

// ---------------------------------------------------------------------------
// Fonts
// ---------------------------------------------------------------------------

// Chunky 2px-stem capitals for the title. `top` lifts rows above the cap line.
const CHUNKY = {
  P: ['######.', '##...##', '##...##', '######.', '##.....', '##.....', '##.....'],
  O: ['.#####.', '##...##', '##...##', '##...##', '##...##', '##...##', '.#####.'],
  K: ['##...##', '##..##.', '##.##..', '####...', '##.##..', '##..##.', '##...##'],
  É: {
    top: 3,
    rows: ['....##.', '...##..', '.......', '#######', '##.....', '##.....', '######.', '##.....', '##.....', '#######'],
  },
  E: ['#######', '##.....', '##.....', '######.', '##.....', '##.....', '#######'],
  D: ['#####..', '##..##.', '##...##', '##...##', '##...##', '##..##.', '#####..'],
  X: ['##...##', '##...##', '.##.##.', '..###..', '.##.##.', '##...##', '##...##'],
  M: ['##...##', '###.###', '#######', '##.#.##', '##...##', '##...##', '##...##'],
  A: ['..###..', '.##.##.', '##...##', '##...##', '#######', '##...##', '##...##'],
  S: ['.#####.', '##...##', '##.....', '.#####.', '.....##', '##...##', '.#####.'],
  T: ['######', '..##..', '..##..', '..##..', '..##..', '..##..', '..##..'],
  R: ['######.', '##...##', '##...##', '######.', '##.##..', '##..##.', '##...##'],
};

// Thin 5×7 capitals for the tagline; `•` is the separator diamond.
const THIN = {
  R: ['####.', '#...#', '#...#', '####.', '#.#..', '#..#.', '#...#'],
  E: ['#####', '#....', '#....', '####.', '#....', '#....', '#####'],
  G: ['.###.', '#...#', '#....', '#.###', '#...#', '#...#', '.###.'],
  I: ['###', '.#.', '.#.', '.#.', '.#.', '.#.', '###'],
  O: ['.###.', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
  N: ['#...#', '##..#', '#.#.#', '#.#.#', '#..##', '#...#', '#...#'],
  S: ['.###.', '#...#', '#....', '.###.', '....#', '#...#', '.###.'],
  U: ['#...#', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
  T: ['#####', '..#..', '..#..', '..#..', '..#..', '..#..', '..#..'],
  A: ['.###.', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
  ' ': ['..', '..', '..', '..', '..', '..', '..'],
  '•': ['...', '...', '.#.', '###', '.#.', '...', '...'],
};

const glyph = (font, ch) => {
  const g = font[ch];
  return Array.isArray(g) ? { top: 0, rows: g } : g;
};

// Width of a string in font pixels, with one pixel of tracking.
const textWidth = (font, text) =>
  [...text].reduce((w, ch) => w + glyph(font, ch).rows[0].length, 0) + text.length - 1;

// Rasterises text into a boolean mask on the unit grid.
function drawText(mask, font, text, x, y, scale) {
  let cursor = x;
  for (const ch of text) {
    const { top, rows } = glyph(font, ch);
    rows.forEach((row, ry) => {
      [...row].forEach((bit, rx) => {
        if (bit !== '#') return;
        for (let sy = 0; sy < scale; sy++) {
          for (let sx = 0; sx < scale; sx++) {
            mask.set(cursor + rx * scale + sx, y + (ry - top) * scale + sy);
          }
        }
      });
    });
    cursor += (rows[0].length + 1) * scale;
  }
}

class Mask {
  constructor(width, height) {
    this.width = width;
    this.height = height;
    this.bits = new Uint8Array(width * height);
  }
  set(x, y) {
    if (x >= 0 && y >= 0 && x < this.width && y < this.height) this.bits[y * this.width + x] = 1;
  }
  has(x, y) {
    return x >= 0 && y >= 0 && x < this.width && y < this.height && this.bits[y * this.width + x] === 1;
  }
  // Union of the mask shifted diagonally by 1..depth: a slab extruded down-right.
  extrude(depth) {
    const out = new Mask(this.width, this.height);
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        for (let k = 1; k <= depth; k++) if (this.has(x - k, y - k)) out.set(x, y);
      }
    }
    return out;
  }
  // 8-neighbour dilation of this mask together with `other`.
  outline(other) {
    const out = new Mask(this.width, this.height);
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        for (let oy = -1; oy <= 1; oy++) {
          for (let ox = -1; ox <= 1; ox++) {
            if (this.has(x + ox, y + oy) || other.has(x + ox, y + oy)) out.set(x, y);
          }
        }
      }
    }
    return out;
  }
  paint(canvas, unit, colorAt) {
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        if (this.has(x, y)) canvas.rect(x * unit, y * unit, unit, unit, colorAt(x, y));
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Open Graph card
// ---------------------------------------------------------------------------

function mulberry32(seed) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = seed;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function drawBlock(canvas, x, y, size, base) {
  const light = mix(base, WHITE, 0.38);
  const dark = mix(base, BLACK, 0.38);
  canvas.rect(x, y, size, size, base);
  canvas.rect(x, y, size, 1, light);
  canvas.rect(x, y, 1, size, light);
  canvas.rect(x, y + size - 1, size, 1, dark);
  canvas.rect(x + size - 1, y, 1, size, dark);
  canvas.rect(x + 1, y + 1, 1, 1, mix(base, WHITE, 0.7));
}

function ogImage() {
  const UNIT = 5; // px per art pixel
  const W = 240, H = 126; // 1200×630 in units
  const TILE = 6; // units per block cell (5 block + 1 gap)
  const art = new Canvas(W, H, C.bg);

  for (let y = TILE - 1; y < H; y += TILE) {
    for (let x = TILE - 1; x < W; x += TILE) art.rect(x, y, 1, 1, C.bgDot);
  }

  // Title stack: MASTER over POKÉDEX over the tagline, centred with extrusion included.
  const master = { text: 'MASTER', scale: 2, depth: 2 };
  const title = { text: 'POKÉDEX', scale: 3, depth: 3 };
  const tagline = 'REGIONS • ROUTES • TRAINERS';
  const accentLift = 3 * title.scale;
  const masterW = textWidth(CHUNKY, master.text) * master.scale + master.depth;
  const titleW = textWidth(CHUNKY, title.text) * title.scale + title.depth;
  const tagW = textWidth(THIN, tagline);
  const masterH = 7 * master.scale + master.depth;
  const titleH = 7 * title.scale + title.depth;
  const gapAbove = accentLift + 5;
  const gapBelow = 8;
  const stackH = masterH + gapAbove + titleH + gapBelow + 7;
  const top = Math.floor((H - stackH) / 2);
  const masterX = (W - masterW) / 2, masterY = top;
  const titleX = (W - titleW) / 2, titleY = masterY + masterH + gapAbove;
  const tagX = Math.floor((W - tagW) / 2), tagY = titleY + titleH + gapBelow;

  const clearZones = [
    { x0: masterX, y0: masterY, x1: masterX + masterW, y1: masterY + masterH },
    { x0: titleX, y0: titleY - accentLift, x1: titleX + titleW, y1: titleY + titleH },
    { x0: tagX, y0: tagY, x1: tagX + tagW, y1: tagY + 7 },
  ];

  // Poké Balls occupy 3×3 block cells (tile coordinates).
  const balls = [
    [2, 1],
    [34, 3],
    [3, 16],
    [29, 17],
  ];
  const ballCells = new Set();
  for (const [bx, by] of balls) {
    for (let dy = 0; dy < 3; dy++) for (let dx = 0; dx < 3; dx++) ballCells.add(`${bx + dx},${by + dy}`);
  }

  const rand = mulberry32(151);
  const cols = W / TILE, rows = H / TILE;
  for (let ty = 0; ty < rows; ty++) {
    for (let tx = 0; tx < cols; tx++) {
      if (ballCells.has(`${tx},${ty}`)) continue;
      const x = tx * TILE, y = ty * TILE;
      // Chebyshev gap (in units) between this cell and the nearest text zone.
      const gap = Math.min(
        ...clearZones.map((z) =>
          Math.max(z.x0 - (x + TILE), x - z.x1, z.y0 - (y + TILE), y - z.y1),
        ),
      );
      const roll = rand(), dimRoll = rand(), colorRoll = rand(), neutralRoll = rand();
      if (gap < 4) continue;
      const depth = gap / TILE;
      if (roll > Math.min(0.94, 0.08 + depth * 0.2)) continue;

      const angle = Math.atan2((y + TILE / 2 - H / 2) * (W / H), x + TILE / 2 - W / 2);
      const wheelPos = ((angle + Math.PI) / (2 * Math.PI)) * TYPE_WHEEL.length;
      let color = neutralRoll < 0.12
        ? TYPE_NEUTRALS[Math.floor(colorRoll * TYPE_NEUTRALS.length)]
        : TYPE_WHEEL[Math.floor(wheelPos + (colorRoll - 0.5) * 2.2 + TYPE_WHEEL.length) % TYPE_WHEEL.length];

      if (dimRoll < (depth < 2.2 ? 0.75 : 0.22)) {
        art.rect(x, y, TILE - 1, TILE - 1, mix(color, C.bg, 0.68));
      } else {
        drawBlock(art, x, y, TILE - 1, color);
      }
    }
  }

  for (const [bx, by] of balls) art.sprite(BALL_16, BALL_PALETTES['poke-ball'], bx * TILE + 1, by * TILE + 1, 1);

  const out = art.scaled(UNIT);

  // Text is drawn on the unit grid over the upscaled art.
  const paintTitle = ({ text, scale, depth }, x, y, face, slab, slabDark) => {
    const faceMask = new Mask(W, H);
    drawText(faceMask, CHUNKY, text, x, y, scale);
    const slabMask = faceMask.extrude(depth);
    faceMask.outline(slabMask).paint(out, UNIT, () => C.ink);
    slabMask.paint(out, UNIT, (px, py) => (faceMask.has(px - depth, py - depth) ? slabDark : slab));
    faceMask.paint(out, UNIT, () => face);
  };
  paintTitle(master, masterX, masterY, C.gold, C.goldDark, mix(C.goldDark, BLACK, 0.35));
  paintTitle(title, titleX, titleY, WHITE, C.red, C.redDark);

  let cursor = tagX;
  for (const ch of tagline) {
    const mask = new Mask(W, H);
    drawText(mask, THIN, ch, cursor, tagY, 1);
    mask.paint(out, UNIT, () => (ch === '•' ? C.red : C.subtitle));
    cursor += glyph(THIN, ch).rows[0].length + 1;
  }

  return out;
}

// ---------------------------------------------------------------------------
// Output
// ---------------------------------------------------------------------------

const faviconDir = join(webRoot, 'favicon');
const logoDir = join(webRoot, 'public', 'logo');
rmSync(faviconDir, { recursive: true, force: true });
rmSync(logoDir, { recursive: true, force: true });
mkdirSync(faviconDir, { recursive: true });
mkdirSync(logoDir, { recursive: true });

const outputs = {};

// One logo per colourway, in public/ rather than favicon/: these are picked at
// runtime from the stored preference, so they need stable unhashed URLs. The
// header, the spinner, the Settings tiles and the browser tab all read them,
// which is what makes the ball a site theme rather than a spinner skin.
for (const [ball, palette] of Object.entries(BALL_PALETTES)) {
  const decal = BALL_DECALS[ball] ?? null;
  const small = ballCanvas(applyDecal(BALL_16, decal), palette);
  const large = ballCanvas(applyDecal(BALL_32, decal && scaleGrid(decal, 2)), palette);

  outputs[`public/logo/${ball}-64.png`] = encodePng(large.scaled(2));
  outputs[`public/logo/${ball}-128.png`] = encodePng(large.scaled(4));

  // index.html's tags resolve before any preference is known, so the default
  // ball keeps the fingerprinted favicon set it has always had.
  if (ball === 'poke-ball') {
    outputs['favicon/favicon.ico'] = encodeIco([small, large, small.scaled(3)]);
    outputs['favicon/favicon-192x192.png'] = encodePng(large.scaled(6));
    // iOS paints transparency black, so the touch icon gets a solid backdrop.
    outputs['favicon/apple-touch-icon.png'] = encodePng(large.scaled(5, 10, C.bg));
  }
}

outputs['public/og-image.png'] = encodePng(ogImage());

let total = 0;
for (const [file, bytes] of Object.entries(outputs)) {
  writeFileSync(join(webRoot, file), bytes);
  total += bytes.length;
}
console.log(`${Object.keys(outputs).length} files, ${(total / 1024).toFixed(1)} KB total`);
for (const ball of Object.keys(BALL_PALETTES)) console.log(`  ${ball}`);
