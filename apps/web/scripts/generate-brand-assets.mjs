// Draws the favicon set (./favicon), the ten Poké Ball logos (./public/logo) and
// the Open Graph card (./public/og-image.png) as pixel art. Every sprite is
// authored on a small grid and only ever scaled by whole numbers, so each output
// size stays pixel-sharp. It also cuts the original game icons for the same ten
// balls (./public/logo/original) out of the copies in ./scripts/ball-originals.
// No dependencies, no network.
//
//   node apps/web/scripts/generate-brand-assets.mjs

import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deflateSync, inflateSync } from 'node:zlib';

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

  // The smallest box holding every pixel that isn't fully transparent.
  bounds() {
    let x0 = this.width, y0 = this.height, x1 = -1, y1 = -1;
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        if (this.data[(y * this.width + x) * 4 + 3] === 0) continue;
        x0 = Math.min(x0, x); y0 = Math.min(y0, y);
        x1 = Math.max(x1, x); y1 = Math.max(y1, y);
      }
    }
    return { x0, y0, x1, y1 };
  }

  // A w×h window starting at (x, y); anything it takes from off the canvas is transparent.
  crop(x, y, w, h) {
    const out = new Canvas(w, h);
    for (let py = 0; py < h; py++) {
      for (let px = 0; px < w; px++) {
        const sx = x + px, sy = y + py;
        if (sx < 0 || sy < 0 || sx >= this.width || sy >= this.height) continue;
        const i = (sy * this.width + sx) * 4;
        out.data.set(this.data.subarray(i, i + 4), (py * w + px) * 4);
      }
    }
    return out;
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

// Just enough of a decoder for the original icons: palette or RGBA, eight bits
// or fewer a sample, not interlaced. Anything else is refused rather than guessed.
function decodePng(buf) {
  const chunks = {};
  const idat = [];
  for (let at = 8; at < buf.length; ) {
    const length = buf.readUInt32BE(at);
    const type = buf.toString('ascii', at + 4, at + 8);
    const data = buf.subarray(at + 8, at + 8 + length);
    if (type === 'IDAT') idat.push(data);
    else chunks[type] = data;
    at += length + 12;
  }
  const { IHDR: ihdr, PLTE: plte, tRNS: trns } = chunks;
  const width = ihdr.readUInt32BE(0), height = ihdr.readUInt32BE(4);
  const depth = ihdr[8], colorType = ihdr[9];
  const channels = { 3: 1, 6: 4 }[colorType];
  if (!channels || depth > 8 || (colorType === 6 && depth !== 8) || ihdr[12] !== 0) {
    throw new Error(`unsupported PNG: colour type ${colorType}, depth ${depth}, interlace ${ihdr[12]}`);
  }
  const bpp = Math.max(1, (channels * depth) >> 3);
  const stride = Math.ceil((width * channels * depth) / 8);
  const raw = inflateSync(Buffer.concat(idat));
  const canvas = new Canvas(width, height);
  let prev = Buffer.alloc(stride);
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)];
    const line = Buffer.from(raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1)));
    for (let x = 0; x < stride; x++) {
      const a = x >= bpp ? line[x - bpp] : 0, b = prev[x], c = x >= bpp ? prev[x - bpp] : 0;
      const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
      const paeth = pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
      line[x] = (line[x] + [0, a, b, (a + b) >> 1, paeth][filter]) & 0xff;
    }
    for (let x = 0; x < width; x++) {
      let rgba;
      if (colorType === 6) {
        rgba = line.subarray(x * 4, x * 4 + 4);
      } else {
        const bit = x * depth;
        const i = (line[bit >> 3] >> (8 - depth - (bit & 7))) & ((1 << depth) - 1);
        rgba = [plte[i * 3], plte[i * 3 + 1], plte[i * 3 + 2], trns && i < trns.length ? trns[i] : 255];
      }
      canvas.data.set(rgba, (y * width + x) * 4);
    }
    prev = line;
  }
  return canvas;
}

// ---------------------------------------------------------------------------
// Sprites
// ---------------------------------------------------------------------------

/**
 * Ten balls out of one drawing.
 *
 * The geometry below (BALL_16 by hand, computeBall(32) procedurally) is written
 * in characters, not colours: `K` outline, `R/h/r` the top shell's mid/light/
 * dark, `H` its specular, `W/w/g` the bottom shell. A palette colours the two
 * halves; everything else a ball wears is a *coat* painted over the result.
 *
 * Each coat was traced from a straight-on photo of the real object — the Wand
 * Company replicas, 3D prints and a render — one ball at a time: the photo's
 * silhouette is fitted with a circle, its tilt read off the band, and every
 * cell of this grid sampled from it; the result was then redrawn by hand where
 * a shape stepped badly and compared against the photo side by side. Colours
 * are the photos' medians. The coats are drawn for LOGO_BALL's button.
 *
 * Several balls are not spheres: fins, domes, blades, rims and a crest stand
 * proud of the shell, so the logos carry a two-pixel margin round the 32-grid
 * ball for them to stand in, outlined in ink. A coat is that whole 36-grid, top
 * row first; rows past the last one listed are left alone. It is not mirrored:
 * the shapes are symmetric, but their light is not. `.` means "leave the ball
 * as drawn", `K` is ink and every other letter names a colour from the ball's
 * `paint` or `flat` set. A coat may cover the band or the button (the Luxury,
 * Dusk, Quick and Beast Balls recolour one or both).
 */

/**
 * Builds the eight base keys from a top colour and a bottom colour. `gloss` and
 * `spec` are how far the lit patch and the specular spot go towards white; the
 * black balls turn them down so they read as black with a sheen, not grey.
 */
function shell(top, bottom, { ink = C.ink, gloss = 0.4, spec = 0.85 } = {}) {
  return {
    K: ink,
    R: top,
    h: mix(top, WHITE, gloss),
    r: mix(top, BLACK, 0.35),
    H: mix(top, WHITE, spec),
    W: bottom,
    w: mix(bottom, BLACK, 0.2),
    g: mix(bottom, BLACK, 0.38),
  };
}

const paints = (named) =>
  Object.fromEntries(Object.entries(named).map(([key, color]) => [key, typeof color === 'string' ? hex(color) : color]));

const BALLS = {
  'poke-ball': { palette: shell(C.red, C.shell) },
  'great-ball': {
    // Two red blocks on the shoulders, square to the ball and rounded at the
    // corners, straddling the outline; lit along the top edge, shadowed along the
    // edge facing the band. Traced from the Wand Company replica, front on.
    palette: shell(hex('#1D6CC3'), C.shell),
    flat: paints({ A: '#EE2A22', a: '#FF6A5E', z: '#B0170F' }),
    coat: [
      '....................................',
      '....................................',
      '....................................',
      '....................................',
      '....................................',
      '.......KK..................KK.......',
      '......Kaa..................aaK......',
      '.....KaAAa................aAAaK.....',
      '....KaAAAAa..............aAAAAaK....',
      '....KAAAAAAa............aAAAAAAK....',
      '.....zAAAAAz............zAAAAAz.....',
      '......zAAAz..............zAAAz......',
      '.......zzz................zzz.......',
    ],
  },
  'ultra-ball': {
    // Two yellow stripes, each a slice of the shell between two planes x = const,
    // so from the front they run straight up from the band to the outline: 0.49
    // to 0.78 radii out on both the replica and a 3D print.
    palette: shell(hex('#232326'), C.shell, { gloss: 0.14, spec: 0.34 }),
    paint: paints({ A: '#F8D23A' }),
    coat: [
      '....................................',
      '....................................',
      '....................................',
      '....................................',
      '....................................',
      '....................................',
      '..........A..............A..........',
      '.........AA..............AA.........',
      '........AAA..............AAA........',
      '.......AAAA..............AAAA.......',
      '.......AAAA..............AAAA.......',
      '.......AAAA..............AAAA.......',
      '.......AAAA..............AAAA.......',
      '.......AAAA..............AAAA.......',
      '.......AAAA..............AAAA.......',
      '.......AAAA..............AAAA.......',
    ],
  },
  'master-ball': {
    // Hot pink caps on both shoulders, their inner edge a straight diagonal, and
    // along their arc they stand a pixel proud of the outline; a bold white M
    // between them. Traced from a straight-on 3D print.
    palette: shell(hex('#7240C0'), C.shell),
    paint: paints({ P: '#DC3F95' }),
    flat: paints({ m: '#FFFFFF', p: '#EE67B0' }),
    coat: [
      '....................................',
      '....................................',
      '....................................',
      '..........KKp..........PKK..........',
      '........KKppp..........PPPKK........',
      '.......KKpppPP........PPPPPKK.......',
      '......KpppPPP.mm....mm.PPPPPPK......',
      '.....KpppPPP..mmm..mmm..PPPPPPK.....',
      '....KKppPPP..mm.mmmm.mm..PPPPPKK....',
      '....KppPPP...mm..mm..mm...PPPPPK....',
      '...KppPPP....mm......mm....PPPPPK...',
      '...KppPP....mm........mm....PPPPK...',
      '..KppPP.....mm........mm.....PPPPK..',
      '..KppP........................PPPK..',
      '..Kpp..........................PPK..',
    ],
  },
  'beast-ball': {
    // Blue over violet, with a light polar grid: a ring round the dark grey
    // housing, a middle ring, the vertical line and the equator. Four lime spikes
    // on the diagonals run from the ring to three cells past the outline, widest
    // three-quarters of the way out. Traced from the front render.
    palette: shell(hex('#1A3AA0'), hex('#553496')),
    paint: paints({ L: '#A9D2E8', P: C.shell }),
    flat: paints({ k: '#3C3F40', y: '#FBFF9C', Y: '#E3EB3E', e: '#A6AE1E' }),
    coat: [
      '....................................',
      '....................................',
      '....................................',
      '....................................',
      '.....KKK.........LL.........KKK.....',
      '....KYeeK........LL........KeeYK....',
      '....KyYYee.....LLLLLL.....eeYYyK....',
      '....KyYYYee..LL..LL..LL..eeYYYyK....',
      '.....KyYYYeLL....LL....LLeYYYyK.....',
      '......yyYYYe.....LL.....eYYYyy......',
      '.......yyYYe.....LL.....eYYyy.......',
      '........LyyYe....LL....eYyyL........',
      '........L..yY...LLLL...Yy..L........',
      '.......L.....YLLkkkkLLY.....L.......',
      '.......L.....LLkkkkkkLL.....L.......',
      '......L......LkkPPPPkkL......L......',
      '............LkkPPPPPPkkL............',
      '....LLLLLLLLLkkPPPPPPkkLLLLLLLLL....',
      '....LLLLLLLLLkkPPPPPPkkLLLLLLLLL....',
      '............LkkPPPPPPkkL............',
      '......L......LkkPPPPkkL......L......',
      '.......L.....LLkkkkkkLL.....L.......',
      '.......L.....YLLkkkkLLY.....L.......',
      '........L..eY...LLLL...Ye..L........',
      '........LeeYy....LL....yYeeL........',
      '.......eeYYy.....LL.....yYYee.......',
      '......eeYYYy.....LL.....yYYYee......',
      '.....KeYYYyLL....LL....LLyYYYeK.....',
      '....KeYYYyy..LL..LL..LL..yyYYYeK....',
      '....KeYYyy.....LLLLLL.....yyYYeK....',
      '....KYyyK........LL........KyyYK....',
      '.....KKK.........LL.........KKK.....',
    ],
  },
  'luxury-ball': {
    // Black, with a gold, red, gold ring round the crown; the band is gold between
    // silver trims that stand a pixel proud at the sides and wrap the gold button
    // housing. Traced from the Wand Company replica.
    palette: shell(hex('#1A191D'), hex('#1A191D'), { gloss: 0.12, spec: 0.3 }),
    paint: paints({ R: '#C42A42', G: '#D6A544', T: '#D6D7DC' }),
    flat: paints({ Y: '#E9C56A', y: '#FBE7B0', b: '#8A6418', t: '#C9CACF' }),
    coat: [
      '....................................',
      '....................................',
      '....................................',
      '....................................',
      '....................................',
      '....................................',
      '..........GGGGGGGGGGGGGGGG..........',
      '.........RRRRRRRRRRRRRRRRRR.........',
      '........GGGGGGGGGGGGGGGGGGGG........',
      '....................................',
      '....................................',
      '....................................',
      '................TTTT................',
      '..............TTGGGGTT..............',
      '.............TTGGGGGGTT.............',
      '.............TGGYYYYGGT.............',
      '.KttTTTTTTTTTGGYyyYYYGGTTTTTTTTTttK.',
      '....GGGGGGGGTGGYyyYYbGGTGGGGGGGG....',
      '....GGGGGGGGTGGYYYYbbGGTGGGGGGGG....',
      '.KttTTTTTTTTTGGYYYbbbGGTTTTTTTTTttK.',
      '.............TGGYbbbGGT.............',
      '.............TTGGGGGGTT.............',
      '..............TTGGGGTT..............',
      '................TTTT................',
    ],
  },
  'quick-ball': {
    // Blue, with a yellow starburst traced cell by cell from the replica: broad
    // diagonal arms, a spike up and down the middle, and blue wedges in from each
    // side. The button is painted back to white.
    palette: shell(hex('#1F7EBF'), hex('#1F7EBF')),
    paint: paints({ Y: '#F4C914', P: C.shell }),
    coat: [
      '....................................',
      '....................................',
      '....................................',
      '....................................',
      '....................................',
      '....................................',
      '..........Y..............Y..........',
      '.........YYY.....YY.....YYY.........',
      '........YYYYY....YY....YYYYY........',
      '.......YYYYYY...YYYY...YYYYYY.......',
      '......YYYYYYYY..YYYY..YYYYYYYY......',
      '.......YYYYYYYYYYYYYYYYYYYYYY.......',
      '........YYYYYYYYYYYYYYYYYYYY........',
      '.........YYYYYYY....YYYYYYY.........',
      '..........YYYYY......YYYYY..........',
      '..........YYYY..PPPP..YYYY..........',
      '...............PPPPPP...............',
      '...............PPPPPP...............',
      '...............PPPPPP...............',
      '...............PPPPPP...............',
      '..........YYYY..PPPP..YYYY..........',
      '..........YYYYY......YYYYY..........',
      '.........YYYYYYY....YYYYYYY.........',
      '........YYYYYYYYYYYYYYYYYYYY........',
      '.......YYYYYYYYYYYYYYYYYYYYYY.......',
      '......YYYYYYYY..YYYY..YYYYYYYY......',
      '.......YYYYYY...YYYY...YYYYYY.......',
      '........YYYYY....YY....YYYYY........',
      '.........YYY.....YY.....YYY.........',
      '..........Y..............Y..........',
    ],
  },
  'dusk-ball': {
    // Black, with green caps top and bottom, green slivers at the sides and a
    // green disc round the orange housing; an orange band. Traced from the Wand
    // Company replica.
    palette: shell(hex('#1F1F22'), hex('#1F1F22'), { gloss: 0.12, spec: 0.3 }),
    paint: paints({ G: '#3B9230' }),
    flat: paints({ O: '#DC6222', D: '#8E3510', Q: '#EF8438', q: '#FFB27A' }),
    coat: [
      '....................................',
      '....................................',
      '....................................',
      '....................................',
      '...............GGGGGG...............',
      '............GGGGGGGGGGGG............',
      '...........GGGGGGGGGGGGGG...........',
      '....................................',
      '....................................',
      '...............GGGGGG...............',
      '......G......GGGGGGGGGG......G......',
      '......G.....GGGGGGGGGGGG.....G......',
      '.....GG....GGGGGGOOGGGGGG....GG.....',
      '.....GG...GGGGGOOOOOOGGGGG...GG.....',
      '.....GG...GGGGOODDDDOOGGGG...GG.....',
      '....GGG..GGGGOODQQQQDOOGGGG..GGG....',
      '....KKKKKKKKKODQqqQQQDOKKKKKKKKK....',
      '....OOOOOOOOOODQqqQQQDOOOOOOOOOO....',
      '....OOOOOOOOOODQQQQQQDOOOOOOOOOO....',
      '....KKKKKKKKKODQQQQQQDOKKKKKKKKK....',
      '....GGG..GGGGOODQQQQDOOGGGG..GGG....',
      '.....GG...GGGGOODDDDOOGGGG...GG.....',
      '.....GG...GGGGGOOOOOOGGGGG...GG.....',
      '.....GG....GGGGGGOOGGGGGG....GG.....',
      '......G.....GGGGGGGGGGGG.....G......',
      '......G......GGGGGGGGGG......G......',
      '...............GGGGGG...............',
      '....................................',
      '....................................',
      '...........GGGGGGGGGGGGGG...........',
      '............GGGGGGGGGGGG............',
      '...............GGGGGG...............',
    ],
  },
  'timer-ball': {
    // White, with a black cap over the crown, a red wedge crest standing a pixel
    // proud of the top, red crescents down the upper sides and a red rim below
    // the band. Traced from a straight-on 3D print.
    palette: shell(C.shell, C.shell),
    flat: paints({
      A: '#E3403A',
      a: '#EE5A52',
      d: '#B22A25',
      c: '#F7776E',
      k: '#1E1D1D',
      j: '#3B3A3A',
    }),
    coat: [
      '....................................',
      '................KKKK................',
      '...............KccccK...............',
      '...............cAAAAd...............',
      '...............cAAAAd...............',
      '............jkkkcAAdkkkj............',
      '..........jjjjkkcAAdkkjjjj..........',
      '.........jjjjjkkkcdkkkjjjjj.........',
      '........aaaa.....cd.....AAAA........',
      '.......aaaa..............AAAd.......',
      '......aaaa................AAdd......',
      '......aaa..................Add......',
      '.....aaa....................ddd.....',
      '.....aa......................dd.....',
      '.....AA......................dd.....',
      '....AA........................dd....',
      '....................................',
      '....................................',
      '....................................',
      '....................................',
      '....AA........................dd....',
      '.....A........................d.....',
      '.....A........................d.....',
      '.....A........................d.....',
      '......A......................d......',
      '......A......................d......',
      '.......A....................d.......',
    ],
  },
  'net-ball': {
    // A grey cage on teal: an arch over the crown, a V of 45° bars from the button
    // ring, straight side bars, and knobs where they cross that stand past the
    // outline. Traced from the Wand Company replica.
    palette: shell(hex('#0FA3A8'), C.shell),
    paint: paints({ n: '#5A5E68' }),
    coat: [
      '....................................',
      '....................................',
      '....................................',
      '...............nnnnnn...............',
      '............nnnnnnnnnnnn............',
      '.....KKK..nnnnn......nnnnn..KKK.....',
      '.....Kn..nnn............nnn..nK.....',
      '.....Knnnnn..............nnnnnK.....',
      '.......nnn................nnn.......',
      '.......nnnn..............nnnn.......',
      '......nn.nnn............nnn.nn......',
      '......nn..nnn..........nnn..nn......',
      '......nn...nnn........nnn...nn......',
      '......nn....nnn......nnn....nn......',
      '......nn.....nn......nn.....nn......',
      '......nn....................nn......',
    ],
  },
};

/**
 * `paint` takes the light the base drawing puts under it, but less of the
 * gloss than bare shell does, so a stripe inside the specular patch still reads
 * as its own colour; on the band, the button or outside the ball it stays flat.
 * `flat` colours are used as they are: the domes, blades and crests that are
 * shaded from their own shape rather than the ball's.
 */
const PAINT_LIGHT = {
  H: [WHITE, 0.3],
  h: [WHITE, 0.14],
  r: [BLACK, 0.3],
  w: [BLACK, 0.2],
  g: [BLACK, 0.38],
};

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

// Larger sizes get a 32-grid ball lit from the top-left. The button's white
// disc and ink ring are radii in sixteenths of the ball.
function computeBall(n, { button = 2.3, ring = 3.3 } = {}) {
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
      else if (d <= button * s) ch = dx + dy > (button / 2.3) * 1.5 * s ? 'w' : 'W';
      else if (d <= ring * s) ch = 'K';
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

// The logos draw the button nearer the real thing's size, which leaves room
// round it for the markings; the favicon keeps the bold one, which is what
// still reads as a Poké Ball at 16px.
const LOGO_BALL = computeBall(32, { button: 1.5, ring: 2.4 });

function ballCanvas(rows, palette = BALLS['poke-ball'].palette) {
  const canvas = new Canvas(rows.length, rows.length);
  canvas.sprite(rows, palette, 0, 0, 1);
  return canvas;
}

const LOGO_MARGIN = 2;

/** A logo: the ball in its palette, inset by the margin, with its coat painted over it. */
function coatedBall(rows, { palette, paint = {}, flat = {}, coat = [] }) {
  const size = rows.length + 2 * LOGO_MARGIN;
  const canvas = new Canvas(size, size);
  canvas.sprite(rows, palette, LOGO_MARGIN, LOGO_MARGIN, 1);
  coat.forEach((row, y) => {
    [...row].forEach((key, x) => {
      if (key === '.') return;
      if (key === 'K') return canvas.rect(x, y, 1, 1, palette.K);
      if (key in flat) return canvas.rect(x, y, 1, 1, flat[key]);
      const light = PAINT_LIGHT[rows[y - LOGO_MARGIN]?.[x - LOGO_MARGIN]];
      canvas.rect(x, y, 1, 1, light ? mix(paint[key], ...light) : paint[key]);
    });
  });
  return canvas;
}

/**
 * The game's own icon, for anyone who would rather have it: the 30px PokeAPI
 * bag sprite, cut to a 20px square around the ball so every ball keeps the same
 * scale and sits in its box like the drawn logos do (an 18px ball with a pixel
 * either side, against their 32 with two), then blown up by whole pixels so it
 * stays sharp wherever CSS can't be told to.
 */
function originalIcon(ball) {
  const icon = decodePng(readFileSync(join(webRoot, 'scripts', 'ball-originals', `${ball}.png`)));
  const { x0, y0, x1, y1 } = icon.bounds();
  const side = 20;
  return icon.crop(Math.floor((x0 + x1 + 1 - side) / 2), Math.floor((y0 + y1 + 1 - side) / 2), side, side).scaled(6);
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

  for (const [bx, by] of balls) art.sprite(BALL_16, BALLS['poke-ball'].palette, bx * TILE + 1, by * TILE + 1, 1);

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
mkdirSync(join(logoDir, 'original'), { recursive: true });

const outputs = {};

// One logo per colourway, in public/ rather than favicon/: these are picked at
// runtime from the stored preference, so they need stable unhashed URLs. The
// header, the spinner, the Settings tiles and the browser tab all read them,
// which is what makes the ball a site theme rather than a spinner skin.
// Settings can swap the drawings for the game's own icons, which sit beside
// them for the same reason.
for (const [ball, spec] of Object.entries(BALLS)) {
  outputs[`public/logo/${ball}.png`] = encodePng(coatedBall(LOGO_BALL, spec).scaled(4));
  outputs[`public/logo/original/${ball}.png`] = encodePng(originalIcon(ball));
}

// index.html's tags resolve before any preference is known, so the default
// ball keeps the fingerprinted favicon set it has always had.
const small = ballCanvas(BALL_16);
const large = ballCanvas(BALL_32);
outputs['favicon/favicon.ico'] = encodeIco([small, large, small.scaled(3)]);
outputs['favicon/favicon-192x192.png'] = encodePng(large.scaled(6));
// iOS paints transparency black, so the touch icon gets a solid backdrop.
outputs['favicon/apple-touch-icon.png'] = encodePng(large.scaled(5, 10, C.bg));

outputs['public/og-image.png'] = encodePng(ogImage());

let total = 0;
for (const [file, bytes] of Object.entries(outputs)) {
  writeFileSync(join(webRoot, file), bytes);
  total += bytes.length;
}
console.log(`${Object.keys(outputs).length} files, ${(total / 1024).toFixed(1)} KB total`);
for (const ball of Object.keys(BALLS)) console.log(`  ${ball}`);
