// Draws the favicon set (./favicon), the ten Poké Ball logos (./public/logo) and
// the Open Graph card (./public/og-image.png) as pixel art. Every sprite is
// authored on a small grid and only ever scaled by whole numbers, so each output
// size stays pixel-sharp. It also cuts the original game icons for the same ten
// balls (./public/logo/original) out of the copies in ./scripts/ball-originals.
// No dependencies, no network.
//
//   node apps/web/scripts/generate-brand-assets.mjs              # every file
//   node apps/web/scripts/generate-brand-assets.mjs beast-ball   # one ball's three
//   node apps/web/scripts/generate-brand-assets.mjs fine/beast   # one file
//   node apps/web/scripts/generate-brand-assets.mjs --list       # the names

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
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
 * a shape stepped badly and compared against the photo side by side, and where
 * a curve reads better as a measured curve than as sampled cells (the Net
 * Ball's bars, the Master Ball's caps) it was drawn from the curve, and where a
 * whole coat is measurable (the Beast Ball's grid and blades, the Luxury Ball's
 * divider, the Dusk Ball's six discs) it is a painter rather than a grid,
 * drawing itself at either size. Colours are the photos' medians. The coats are
 * drawn for LOGO_BALL's button and band.
 *
 * Several balls are not spheres: fins, caps, blades, rims and a crest stand
 * proud of the shell, so the logos carry a two-pixel margin round the 32-grid
 * ball for them to stand in, outlined in ink. A coat is that whole 36-grid, top
 * row first; rows past the last one listed are left alone. It is not mirrored:
 * the shapes are symmetric, but their light is not. `.` means "leave the ball
 * as drawn", a space clears that cell, `K` is ink and every other letter names
 * a colour from the ball's `paint` or `flat` set. A coat may cover the band or
 * the button (the Luxury, Dusk, Quick and Beast Balls recolour one or both).
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

// The Net Ball's shell, hoisted so its coat can put the shaded tone of it back
// where the cage cuts a cell of the lit tone off from the rest.
const NET_SHELL = shell(hex('#0FA3A8'), C.shell);

// The Beast Ball's shell, hoisted so its coat can put a tone of it back where it
// takes a cell of the ball's line away. `SKIN` is those tones under keys a coat
// can name: the gold already owns `h`, so the crown's second tone answers to `c`.
const BEAST_SHELL = shell(hex('#1A3AA0'), hex('#553496'));
const SKIN = { H: 'H', h: 'c', R: 'R', r: 'r', W: 'W', w: 'w', g: 'g' };
const BEAST_SKIN = Object.fromEntries(Object.entries(SKIN).map(([ch, key]) => [key, BEAST_SHELL[ch]]));

// The pale blue of this ball's polar grid, which the divider is drawn in too:
// the two are one marking in one colour and are told apart only by their keys,
// so `sheen` below can hold the shadow off the divider and not off the grid.
const BEAST_GRID = '#A9D2E8';

// The six golds a blade is drawn in, lightest first: the line down its crease,
// the reference yellow of its lit side, that side turning away at its own edge,
// the roll, the light that comes back up the shaded edge, and the core of the
// shadow between them. Hoisted up here with the shell so the ball's entry can
// name them; `bladeTone` is what decides which cell takes which.
const GOLD = 'yYfneE';

// What the four blades take of the ball's own lamp — its share of the gloss and
// its share of the shadow — over the shading their own crease already carries.
//
// **The shadow is off: the blades take the gloss and nothing else.** The two
// lower blades run down into the base's own shadow crescent, and the crescent's
// edge is a step, so what the shadow drew was a hard band across each of them
// about two thirds of the way out — a line where the blade is meant to be
// rounding off. The gloss has no such edge: the crown's light falls away over
// several cells, so it reads as the ball's highlight crossing the upper-left
// blade rather than as a mark on it.
//
// The gloss goes easy too, at a bit under half. All four are one blade lit once
// and the crease is what says so; the lamp on top of that is meant to read as
// the same sweep that crosses the shell, not as a second light picking the
// blades out one at a time, which is what a full share draws.
//
// **Either number stands alone.** `[0, 0]` takes the lamp off the spikes
// altogether, `[0.45, 0.45]` is the shadow back on at the gloss's own share,
// and whatever is set here leaves the rest of the coat exactly where it is — a
// share of nothing is the colour itself, so nothing else has to move with it.
const BLADE_SHEEN = [0.45, 0];

// And the whole of what this ball's markings take, by coat key. The divider is
// the one that is not the same at both ends: the pale equator is this ball's
// band, the only thing on it standing for the inked seam every other ball
// carries, and a band that darkens where it runs off into the shade reads as a
// line drawn in two colours rather than as one divider. It keeps the gloss and
// takes none of the shadow.
//
// Nothing else is listed: the grid and the button take the light of the cell
// under them the way every other ball's markings do, and the housing sits over
// the middle of the ball, where the sphere faces the lamp square on and there is
// neither gloss nor shadow to take.
const BEAST_SHEEN = { D: [1, 0], ...Object.fromEntries([...GOLD].map((ch) => [ch, BLADE_SHEEN])) };

// The Master Ball's shell, hoisted so its coat can hand a cell of the crown back
// to the gloss: see the one `h` in the drawn coat.
const MASTER_SHELL = shell(hex('#7240C0'), C.shell);

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
    // to 0.78 radii out on both the replica and a 3D print. Measured rather than
    // drawn, so they reach whatever the seam is on the grid they are drawn on.
    palette: shell(hex('#232326'), C.shell, { gloss: 0.14, spec: 0.34 }),
    paint: paints({ A: '#F8D23A' }),
    coat: (ball) =>
      drawCoat(ball, ({ u, base }) =>
        TOP_SHELL.includes(base) && Math.abs(u) >= 7 / 16 && Math.abs(u) <= 11 / 16 ? 'A' : ''),
  },
  'master-ball': {
    // Two pink caps on the shoulders with a white M between them, measured off a
    // straight-on photo of the Wand Company replica rather than traced from it.
    // The silhouette fits a circle to within a pixel, and the button sits a
    // thirteenth of a radius low, which is the whole of the ball's lean: four
    // and a half degrees tipped back, no roll, no yaw. Every shape below is read
    // on the sphere with that lean undone and then drawn face on. Only the two
    // markings come from the photograph; the shell's light and shadow are the
    // Poke Ball's own and are not touched.
    //
    // Each cap is a circle drawn on the sphere — thirty-four degrees of radius
    // about a point on the ball's side, halfway between the crown and the band.
    // A cone fitted to the near cap's inner edge lands within half a degree of
    // that, and the far cap agrees once its foreshortening is allowed for. Its
    // centre sitting on the silhouette settles the run: it begins eleven degrees
    // from the crown and ends at eighty, the third row up from the bottom of the
    // upper half.
    //
    // Drawn, it is an ellipse inscribed in that run's own box: twelve cells by
    // twelve on the drawn grid, twenty four by twenty four on the fine one,
    // counted off the picture rather than guessed. The major axis lies on the
    // box's diagonal, from the corner nearest the crown to the corner nearest
    // the band, and the minor follows from the box, since a figure tilted forty
    // five degrees in a square box has a half-extent of root of (a squared plus
    // b squared) over two whichever way round its axes are. That leaves one
    // number to choose, and it is chosen so **the four corners of the box come
    // out empty**: too long an axis and the two ends land square in the corners
    // they point at, which is what stopped every earlier drawing reading as an
    // ellipse. The figure is 180 degrees symmetric about its own centre, so the
    // head and the tail match cell for cell.
    //
    // Only two things are settled against the ball, and deliberately no more —
    // pushing the figure around to satisfy anything else is what broke it
    // before. The cap stops standing proud where the ball's line holds the same
    // column three rows running, or a one-cell pink column juts out of the
    // outline; and where a single cell of that line is left between the paint
    // and the shell, the paint takes it. The line is redrawn a cell outside the
    // paint (two on the fine grid) whether the paint is proud or not, and
    // closed: a bare cell between the cap's line and the crown's punches a hole
    // through the silhouette.
    //
    // **The inner edge is a staircase with no broken step**, which is the one
    // thing about the figure that has to be read off the drawing rather than
    // the box: three rows on the turn where the edge is steep at the head, then
    // a column a row the rest of the way down, 22, 21, 21, 21, 22, 23, 24, 25,
    // 26, 27, 28, 29 on the right cap. Every cell that has been added or taken
    // away since the ellipse was fitted was to keep that sequence whole — a
    // tread of one between two longer ones reads as a nick, and a column
    // skipped at the tail leaves the tip hanging off the rest. The figure that
    // comes out of it is 180 degrees symmetric cell for cell: three deep at
    // the head, five, six, then seven for six rows, and back down the same way.
    //
    // **The caps take their gloss and shadow from the ball's own lamp, at the
    // ball's own thresholds**, exactly as the Poke Ball's shell does and as the
    // fine grid already did: every cell of paint is banded by the same lambert
    // that decides H, h, R and r, and the four pink tones stand in for those
    // four — highlight, light, mid, shade. So the pink turns with the red
    // rather than carrying a light of its own, the near cap comes out mostly
    // highlight and light, and the far one mostly mid with the shade along its
    // lower edge, which is where the Poke Ball keeps its own.
    //
    // Shading each lens along its own length instead — darkest at both tips, a
    // highlight cored in the middle, the same painting mirrored onto the far
    // cap — was built and rejected: it reads as two lit objects laid on the
    // ball rather than one ball lit once.
    //
    // The M is twelve cells wide against the ring's ten, six rows tall on rows
    // 7 to 12, and its middle comes to a point one clear row above the ring —
    // the gap is counted in the ring's own columns, where the middle stroke
    // ends, not at the legs.
    //
    // It is the letter the photograph gives back when its white is rasterised
    // straight onto that twelve by six box: strokes two cells wide, **columns
    // three rows deep**, peaks opening a cell a row, and a band on row 9 where
    // the letter runs solid across, between the notch shutting and the counters
    // opening. The one change made to the raster is that the middle's point is
    // no longer held for two rows, which is what frees the row the band sits
    // on; two rows of the same cells is a tread two pixels deep and the corner
    // reads blunt.
    //
    // A thinner letter was drawn from this one — strokes a single cell wide, no
    // column deeper than two rows, and a row shorter so that every step could
    // share a row with the one before it — and it is **parked in the commented
    // block below** rather than thrown away. Swapping the two blocks is the
    // whole of the change; the caps are the same cells either way.
    palette: MASTER_SHELL,
    // Four pink tones and white, banded the way the shell's own four are: the
    // photo's medians for the light, the mid and the shade, plus a highlight
    // only a third of the way from the lit tone to white — the Poke Ball's own
    // specular is eighty-five per cent of the way there and reads as a white
    // blot on pink, so the cap's is dimmed to about what the Ultra Ball's shell
    // carries. Both grids cut the caps into those bands by the ball's own
    // lambert at the ball's own thresholds, so the pink turns with the red on
    // the Poke Ball rather than sitting flat on top of it.
    //
    // `h` is not a pink at all but the shell's own gloss, so the coat can hand
    // a cell back to it. The crown's specular is a single cell wide here, and
    // the one cell it lands on sits on the diagonal of the M's left peak, where
    // a tone that light reads as a chip out of the letter rather than as a
    // shine. Putting the gloss there instead keeps the crown turning without
    // the blot.
    flat: { ...paints({ m: '#FFFFFF', s: '#F293CA', p: '#EB5CAE', P: '#CD2470', q: '#B91056' }), h: MASTER_SHELL.h },
    // The same picture with the thin letter, parked rather than thrown away:
    // swap the two blocks to put it back. It is the letter one cell wide with
    // no column deeper than two rows, five rows tall on rows 8 to 12, every
    // step sharing a row with the one before it. Only the letter differs; the
    // caps below are the same cells.
    // coat: [
    //   '....................................',
    //   '....................................',
    //   '...........KKKK......KKKK...........',
    //   '.........KKPPP........PPPKK.........',
    //   '........KKppppp......PPPPPKK........',
    //   '.......KKppsspp......PPPPPPKK.......',
    //   '......K.psssssp......PPPPPPP.K......',
    //   '.....K.pssssss........PPPPPPq.K.....',
    //   '....KKpssssss..m....m..PPPPPqqKK....',
    //   '...KKppsssss..mmm..mmm..PPPPqqqKK...',
    //   '...KPppssss..mm.mmmm.mm..PPPqqqqK...',
    //   '..KPPppppp..mm...mm...mm..PPqqqqqK..',
    //   '..KPPpppp...m..........m...PqqqqqK..',
    //   '..KPPppp....................qqqqqK..',
    //   '..K.PPP......................qqq.K..',
    // ],
    coat: [
      '....................................',
      '....................................',
      '...........KKKK      KKKK...........',
      '.........KKKPP........PPKKK.........',
      '........KKppppp......PPPPPKK........',
      '.......KKppsspp......PPPPPPKK.......',
      '......K.psssss........PPPPPP.K......',
      '.....K.psssssh.m....m..PPPPPq.K.....',
      '....KKpssssss.mmm..mmm.PPPPPqqKK....',
      '....KKpsssss..mmmmmmmm..PPPPqqKK....',
      '...KKppssss..mm.mmmm.mm..PPPqqqKK...',
      '...KKppppp...mm..mm..mm...PPqqqKK...',
      '..KKPpppp...mm........mm...PqqqqKK..',
      '..KKPppp....................qqqqKK..',
      '..K.PP........................qq.K..',
    ],
  },
  'beast-ball': {
    // Blue over violet, its halves meeting by colour alone, with a light polar
    // grid: a ring round the dark grey housing, a ring of latitude, the meridian
    // and the equator. Four gold spikes on the diagonals leave the housing on
    // that inner ring, are widest on the ball's own outline and round off to a
    // blunt far corner outside it, each a creased ridge rather than a tube.
    // Measured from the front render rather than traced: see `beastCoat`.
    ball: { band: false },
    // The shell's own gloss and specular, not turned down: the white shine up
    // and to the left is `mix(top, white, 0.85)`, which is what the override to
    // 0.5 was flattening away.
    palette: BEAST_SHELL,
    // `L` is the grid — the meridian, the ring of latitude and the pale rim
    // round the housing — and `D` the divider, the equator between the halves.
    // One colour under two keys: they differ only in what `sheen` lets the
    // ball's lamp do to them.
    paint: paints({ L: BEAST_GRID, D: BEAST_GRID, P: C.shell }),
    // A gold yellow, not the chartreuse the render's own medians come out as —
    // sampled straight, the spikes read green. `#F6D63C` is the yellow taken off
    // the reference and it is what a blade is over most of itself.
    //
    // The five round it are that yellow shaded the way gold is shaded, which is
    // not by turning the light up and down. A ramp made of one hue at six values
    // reads as one colour however many steps it has; the hue has to travel with
    // the value. Here it runs 55 at the line, through 50 where the blade's own
    // yellow sits, to 44 in the core of the shadow — the light end towards lemon,
    // the deep end towards amber — while saturation climbs 58 per cent to 92 and
    // the blue channel falls 103 to 18.
    //
    // What keeps the deep end from going brown is that **red holds**: 244, 246,
    // 243, 240, 235, 220 across the ramp while green and blue fall away. Brown is
    // what a gold becomes when its red falls with the rest of it, and a hue held
    // still to avoid that is what made the ramp before this one look like a
    // single colour.
    //
    // Two more things it must not do: lose saturation at the light end, which
    // makes it white gold, or carry the hue past 58, which makes it lemon.
    //
    // It also sits brighter than the render. Measured, the shaded edge of a spike
    // is 0.70 of its lit gold; here it is 0.79, and every tone between is lifted
    // to match — the render's own gold is a chartreuse photographed under a hard
    // lamp, and taken literally the blades come out on the dark side of yellow.
    flat: {
      ...paints({
        k: '#3C3F40',
        y: '#F4E867',
        Y: '#F6D63C',
        f: '#F3CE31',
        n: '#F0C426',
        e: '#EBB91C',
        E: '#DCA612',
      }),
      ...BEAST_SKIN,
    },
    // The ball's own gloss and shadow over the two markings that carry a colour
    // of their own rather than the shell's: the blades, gently, and the divider,
    // which takes the gloss and never the shadow. See `BLADE_SHEEN`.
    sheen: BEAST_SHEEN,
    coat: beastCoat,
  },
  'luxury-ball': {
    // Black, with a gold, red, gold ring round the crown, and a divider that is
    // the ball's own: every cell the drawing inks between the halves — the seam,
    // and the ring round the button — is gold here, and the silver is the line
    // the halves meet that gold along, so nothing silver crosses the band where
    // the housing bulges out of it. See `luxuryCoat`.
    palette: shell(hex('#1A191D'), hex('#1A191D'), { gloss: 0.12, spec: 0.3 }),
    paint: paints({ R: '#C42A42', G: '#D6A544', Y: '#E9C56A' }),
    // The chrome is flat, not lit by the shell under it: the trims lie on the
    // halves, and the ball's own shading was cutting each one into a bright half
    // and a grey one where the crescents pass beneath. It is one silver the whole
    // way out, tips included — the plating does not dull where it stands proud.
    // The button's gold is not flat: it takes the ball's button shading, like
    // every other ball's.
    flat: paints({ T: '#D6D7DC' }),
    coat: luxuryCoat,
  },
  'quick-ball': {
    // Blue, with a yellow arm on each diagonal and a yellow spike out of the
    // housing along each of the four axes, a blue lobe between every two of
    // them. The two spikes that lie along the band are the ones the band's own
    // line divides: it runs down the middle of each, so the spike shows as a
    // tapering wedge of yellow above the line and another below it. Traced
    // from the Wand Company replica, with the band spikes from the Sugimori
    // art, and measured since: see `quickCoat`.
    palette: shell(hex('#1F7EBF'), hex('#1F7EBF')),
    paint: paints({ Y: '#F4C914', P: C.shell }),
    coat: quickCoat,
  },
  'dusk-ball': {
    // Black, with an orange divider and six green discs round the ball: the
    // Poké Ball's own drawing recoloured, not a coat traced cell by cell. See
    // `duskCoat`.
    palette: shell(hex('#1F1F22'), hex('#1F1F22'), { gloss: 0.07, spec: 0.18 }),
    // Nothing here is flat: the green takes the shell's light, so the crown
    // reads brighter than the base the way the black round it does, and the
    // button takes the ball's own button shading. `O` is the divider — the
    // seam and the ring — and `D` the button, the same orange lifted towards
    // white far enough that its shaded half still tells against the ring.
    paint: paints({ G: '#3B9230', O: '#D65E20', D: '#F79240' }),
    coat: duskCoat,
  },
  'timer-ball': {
    // White, with a black cap over the crown, a red wedge crest standing a pixel
    // proud of the top, red crescents down the upper sides and a red rim below
    // the band. Traced from a straight-on 3D print. `timerFine` draws these
    // same shapes on the 64 grid, rather than doubling them.
    palette: shell(C.shell, C.shell),
    // Both halves of this ball are white, so alone in the set it has no coloured
    // dome for the shell's gloss to fall on, and so no gleam at the upper left.
    // The drawing already says which cells face the lamp — `a` is the lit side
    // of the crescents, `A` the middle and `d` the shadow — so that one tone
    // takes the shell's specular patch on top of its own shade, and the light
    // lands where the Poké Ball's does. Its table is its own: the patch is
    // harder than `PAINT_LIGHT`'s, because a tone that is already the light one
    // needs the extra to read as a gleam, and the halo round it gentler, or it
    // spreads over the whole crescent and reads as a wash instead.
    light: { H: [WHITE, 0.42], h: [WHITE, 0.16] },
    paint: paints({ a: '#EE5A52' }),
    flat: paints({ A: '#E3403A', d: '#B22A25', c: '#F7776E', k: '#1E1D1D', j: '#3B3A3A' }),
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
      '....AA........................dd....',
      '....................................',
      '....................................',
      '....AA........................dd....',
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
    // A grey rubber cage on teal, measured on the Wand Company replica rather
    // than traced cell by cell: see `netCoat`. The shell's own shaded tone is in
    // the coat's colours too, because the cage hands a cell back to it: see
    // `netCoat` again.
    palette: NET_SHELL,
    flat: { ...paints({ m: '#6F7886', n: '#4C515D', k: '#3A3E48' }), r: NET_SHELL.r },
    coat: netCoat,
  },
};

/**
 * `paint` takes the light the base drawing puts under it, but less of the
 * gloss than bare shell does, so a stripe inside the specular patch still reads
 * as its own colour; on the band, the button or outside the ball it stays flat.
 * `flat` colours are used as they are: the caps, blades and crests that are
 * shaded from their own shape rather than the ball's.
 *
 * A ball may pass its own table as `light`, and the Timer Ball does: its lit
 * tone is already shaded by the drawing, so the shell's gloss goes on top of a
 * colour rather than beside one and wants its own strengths.
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
  'KRRRRRKKKKRRRrrK',
  'KRRRRKKWWKKRrrrK',
  'KKKKKKWWWWKKKKKK',
  'KKKKKKWWwwKKKKKK',
  'KWWWWKKWwKKWWwwK',
  'KWWWWWKKKKWWWwwK',
  '.KWWWWWWWWWWWwK.',
  '.KWWWWWWWWWWwwK.',
  '..KWWWWWWWwwwK..',
  '...KKwwwwwwKK...',
  '.....KKKKKK.....',
];

// The margin round the ball, for the fins, caps, blades and rims that stand proud of
// it: an eighth of the ball's radius, so it is the same width on either grid.
const marginFor = (rows) => rows.length / 16;

// One lamp lights everything: the shell below and anything a coat stands on top
// of it, so a blade's roll reads as the same light as the ball's own curve.
const LIGHT = [-0.5, -0.62, 0.6];
const LIGHT_LEN = Math.hypot(...LIGHT);
const lambertOf = (nx, ny, nz) => (nx * LIGHT[0] + ny * LIGHT[1] + nz * LIGHT[2]) / LIGHT_LEN;

// Larger sizes get a 32-grid ball lit from the top-left. The button's white
// disc and ink ring are radii in sixteenths of the ball. `band` is the inked
// seam between the halves; the Beast Ball turns it off, because on the real
// thing the blue simply becomes violet and nothing is drawn along the join.
//
// The seam between the halves is a sixteenth of the radius either side of the
// middle: two cells at 32 and four at 64. Unlike the outline it doubles with the
// grid, because it is the one line that has to stay centred, and a centred band
// can only be an even number of rows — an even grid has no middle row to hang an
// odd one on. Everything the seam stops reserving goes back to the half above or
// below it, which is where the colour there comes from.
// How thick the inked rim round the ball is, as a fraction of its radius, on a
// grid whose cells are `cell` radii across. A marking that takes the rim's place
// over the crown has to reach this far in.
//
// The line is drawn, not measured, so it does not double with the grid: 2.1
// cells at 32, where it rasterises to two, and root two more at 64, which is
// 2.97 — three cells rather than four. A rim that doubled would make the fine
// ball a bolder drawing instead of the same one drawn at a finer pitch, and it
// is the drawing that has to stay put; the ball is the same size either way, so
// the cell the rim gives up goes to the shell.
const rimOf = (cell) => 2.1 * Math.sqrt(cell / 16);

// Half the seam, as a fraction of the radius: a cell at 32 and two at 64, so the
// seam is two rows and four, centred on the middle either way. Every marking
// that stands for the seam — the Luxury Ball's gold, the Dusk Ball's orange
// line, the Beast Ball's pale equator — is measured against this.
const SEAM = 1 / 16;

function computeBall(n, { button = 2.3, ring = 3.3, band = true } = {}) {
  const s = n / 16;
  const c = n / 2;
  const inner = c * (1 - rimOf(2 / n));
  const rim = c - inner;
  const seam = c * SEAM;
  const rows = [];
  for (let y = 0; y < n; y++) {
    let row = '';
    for (let x = 0; x < n; x++) {
      const dx = x + 0.5 - c;
      const dy = y + 0.5 - c;
      const d = Math.hypot(dx, dy);
      const nx = dx / c, ny = dy / c;
      const nz = Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny));
      const lambert = lambertOf(nx, ny, nz);
      let ch;
      if (d > c - 0.3) ch = '.';
      else if (d > inner) ch = 'K';
      else if (d <= button * s) ch = dx + dy > (button / 2.3) * 1.5 * s ? 'w' : 'W';
      else if (d <= ring * s) ch = 'K';
      else if (band && Math.abs(dy) <= seam) ch = 'K';
      else if (dy < 0) ch = lambert > 0.97 ? 'H' : lambert > 0.9 ? 'h' : lambert > 0.35 ? 'R' : 'r';
      // The shell is shaded with crescents: pixels outside a disc nudged towards the light.
      else if (Math.hypot(dx + s, dy + s) < inner) ch = 'W';
      else ch = Math.hypot(dx + 2.2 * s, dy + 2.2 * s) < inner ? 'w' : 'g';
      row += ch;
    }
    rows.push(row);
  }
  return evenRim(rows);
}

/**
 * A ring two cells wide doesn't rasterise to an even outline. Where the circle's
 * edge runs closest to vertical or horizontal — the rows either side of the band,
 * the columns either side of the crown and the base — it crosses a single cell,
 * and the shell runs out to touch that lone ink pixel while every other row has
 * two behind it. Those four points get an ink cell added *outside* them, which
 * keeps the outline two cells thick the whole way round without eating a pixel
 * of shell, and does it on all four sides so the silhouette stays symmetric.
 */
function evenRim(rows) {
  const n = rows.length;
  const grid = rows.map((row) => [...row]);
  const add = [];
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    for (let i = 0; i < n; i++) {
      // Walk in from outside the grid until the outline is met.
      let x = dx > 0 ? 0 : dx < 0 ? n - 1 : i;
      let y = dy > 0 ? 0 : dy < 0 ? n - 1 : i;
      while (grid[y]?.[x] === '.') { x += dx; y += dy; }
      if (grid[y]?.[x] !== 'K' || grid[y + dy]?.[x + dx] === 'K') continue;
      if (grid[y - dy]?.[x - dx] === '.') add.push([x - dx, y - dy]);
    }
  }
  for (const [x, y] of add) grid[y][x] = 'K';
  return grid.map((row) => row.join(''));
}

/**
 * The tone the ball's own drawing carries at a point, in the characters
 * `computeBall` writes — but asked for anywhere, the margin outside the rim
 * included, where a marking standing proud of the ball has no cell of shell
 * under it to read its light off.
 *
 * It is `computeBall`'s own light written in radii rather than cells, with the
 * button, the ring, the seam and the rim left out: what a marking wants is the
 * light of the sphere it lies on, not the black the drawing happens to have put
 * there. Inside the ball it therefore agrees cell for cell with the character
 * beneath it, which is what `PAINT_LIGHT` reads; outside it, it holds the light
 * the silhouette carries in that direction, which is what the sphere hands to
 * anything leaning on it.
 */
function shellTone(u, v, cell) {
  const r = Math.hypot(u, v);
  const [x, y] = r > 1 ? [u / r, v / r] : [u, v];
  if (y < 0) {
    const lit = lambertOf(x, y, Math.sqrt(Math.max(0, 1 - x * x - y * y)));
    return lit > 0.97 ? 'H' : lit > 0.9 ? 'h' : lit > 0.35 ? 'R' : 'r';
  }
  // The base's two crescents: discs the size of the shell nudged towards the lamp.
  const skin = 1 - rimOf(cell);
  if (Math.hypot(x + 1 / 8, y + 1 / 8) < skin) return 'W';
  return Math.hypot(x + 2.2 / 8, y + 2.2 / 8) < skin ? 'w' : 'g';
}

const BALL_32 = computeBall(32);

// The logos draw the button nearer the real thing's size, which leaves room
// round it for the markings; the favicon keeps the bold one, which is what
// still reads as a Poké Ball at 16px.
const LOGO = { button: 1.5, ring: 2.4 };
const LOGO_BALL = computeBall(32, LOGO);

// The same ball on twice the grid, for the fine set: the circle, the crescents
// and the button all land on four times as many cells, so the outline stops
// stepping and the markings can be drawn from their measurements rather than
// fitted to a 32-cell square.
const FINE_BALL = computeBall(64, LOGO);
const FINE_GRID = FINE_BALL.length + 2 * marginFor(FINE_BALL);

// A ball may ask for its own drawing — a wider housing, no inked seam — through
// `ball` in its entry; `gridFor` hands it the grid it is drawn on and keeps one
// copy of each, since most of them share the default.
const GRIDS = new Map();
function gridFor(spec, fine) {
  const options = { ...LOGO, ...spec.ball };
  const key = `${fine}:${JSON.stringify(options)}`;
  if (!GRIDS.has(key)) GRIDS.set(key, computeBall(fine ? 64 : 32, options));
  return GRIDS.get(key);
}

/**
 * Asks `paint` for every cell of a coat grid and hands it the cell's centre in
 * units of the ball's radius — `u` across, `v` down, `r` from the middle —
 * along with `base`, the character the ball itself drew there. `base` is what
 * clips a marking to the shell or the band without any of it being traced: the
 * markings stop where the ball does, at whatever size it is drawn.
 */

const TOP_SHELL = 'RhrH';

function drawCoat(ball, paint) {
  const n = ball.length;
  const margin = marginFor(ball);
  const size = n + 2 * margin;
  const c = n / 2;
  const rows = [];
  for (let y = 0; y < size; y++) {
    let row = '';
    for (let x = 0; x < size; x++) {
      const u = (x + 0.5 - margin - c) / c;
      const v = (y + 0.5 - margin - c) / c;
      const base = ball[y - margin]?.[x - margin] ?? '.';
      row += paint({ u, v, r: Math.hypot(u, v), cell: 1 / c, base }) || '.';
    }
    rows.push(row);
  }
  return rows;
}

/**
 * The Quick Ball, measured rather than drawn.
 *
 * The markings are one profile turned four times. A cell sits `s` radii along
 * the nearest of the four axes and `t` across it, and the yellow runs out to
 * `quickReach(t)` on that cross-section: the profile is long on the axis —
 * that is the spike's point — dips in the middle, which is the blue lobe
 * beside it, and climbs again to the ball's line, which is the yellow arm on
 * the diagonal. Four axes, four spikes, eight lobes and four arms out of one
 * table.
 *
 * The two spikes along the band need a longer, blunter profile than the two up
 * and down, which is why there are two tables rather than one turned a quarter
 * turn. The band's line covers the cross-section either side of the middle,
 * and that is exactly where a spike reaches furthest, so a side spike measured
 * like a pole spike shows only its stubby flanks — which is what a spike drawn
 * the same as its neighbours comes out looking like: a step, not a point.
 * `side` reaches two cells further out at the axis and gives up its width more
 * slowly, so what the band leaves either side of itself is still a wedge that
 * narrows to a point.
 */
// How far out the yellow goes, in sixteenths of the radius, on each
// cross-section. Knot k is the k-th cell out from the axis on the 32 grid, so
// the drawn ball lands exactly on these numbers and the fine one interpolates
// between them rather than doubling the drawing's steps. 16 is the ball's own
// line, which `drawCoat` clips the yellow to.
const QUICK = {
  side: [13.5, 11.5, 9.5, 8, 7.5, 8.5, 10, 12, 16, 16, 16, 16, 16, 16, 16, 16],
  pole: [10.5, 8.5, 6.5, 6.5, 7.5, 8.5, 9.5, 11.5, 11.5, 16, 16, 16, 16, 16, 16, 16],
};

const quickReach = (knots, t) => {
  const i = t * 16 - 0.5;
  if (i <= 0) return knots[0] / 16;
  const k = Math.min(Math.floor(i), knots.length - 2);
  return (knots[k] + (knots[k + 1] - knots[k]) * (i - k)) / 16;
};

function quickCoat(ball) {
  const housing = LOGO.ring / 8;
  return drawCoat(ball, ({ u, v, r, base }) => {
    // The housing is the ball's own: whatever it drew as button inside the ink
    // ring is painted white — both halves of this ball are blue, so the button
    // would otherwise take the bottom half's colour — and the ring is left as
    // it is. Painting the white to a radius of the coat's own instead matched
    // the ball on the 32 grid and swallowed a cell of the ring on the 64 one,
    // which is what made this ball's button the odd one of the ten.
    if (r <= housing) return 'Ww'.includes(base) ? 'P' : '';
    if (!'RhrHWwg'.includes(base)) return '';
    const a = Math.abs(u), b = Math.abs(v);
    const s = Math.max(a, b), t = Math.min(a, b);
    return s <= quickReach(a > b ? QUICK.side : QUICK.pole, t) ? 'Y' : '';
  });
}

/**
 * The Beast Ball, measured rather than drawn.
 *
 * Its markings are all shapes with numbers behind them — two great circles, a
 * ring of latitude, the housing, and four blades on the diagonals — so they are
 * drawn from those numbers at whatever size the grid is. That is what keeps the
 * blades whole: a blade traced cell by cell breaks into a staircase of corners
 * near its narrow end, where the shape is thinner than a cell, and doubling the
 * drawing only doubles the breaks. Here the blade is a solid band about its
 * axis, never allowed narrower than a couple of cells, so it stays in one piece
 * at 32 and grows a finer point at 64.
 *
 * The radii are read off the traced coat this replaces, so the ball keeps the
 * face it had: the button out to 0.19 of the radius, the grey housing to 0.30,
 * a pale rim a sixteenth of a radius round it, the meridian and equator that
 * far either side of the middle, and the ring of latitude half that wide at
 * 0.705. Only the blades are measured off the front render.
 */
// `button` is the ball's own button to the cell — LOGO.button in sixteenths over
// the eight of them a radius holds. A hair wider and the disc spills onto the
// ink ring under it, which carries no light for `paint` to take, and those cells
// come out flat white in the middle of the shading.
const BEAST = { button: LOGO.button / 8, housing: 0.3, ring: 0.705, line: SEAM };
// The spike, measured on the front render and pinned to this ball's own parts.
// It leaves the housing **on** the pale ring round it, so the two meet rather
// than the spike hanging off the ring's outside; it is widest on the line the
// ball draws, which `computeBall` puts at 0.928 of the radius on the diagonal
// at either size; and the far corner is rounded, not pointed — on the render
// that end is a blunt lobe, and a straight taper to a point there reads as a
// dart rather than a spike.
const LAMP = LIGHT.map((k) => k / LIGHT_LEN);

const BLADE = { from: 0.32, to: 1.12, half: 0.155 };

/**
 * Where the blade is widest: the outermost cross-section that is still on the
 * shell, one in from the line the ball draws round itself. The spike meets the
 * ball on the blue and is already narrowing by the time it crosses the line,
 * rather than being at its fattest on top of it. Walking the ball's own drawing
 * out along the diagonal finds it at whatever size the grid is — 0.84 of the
 * radius on the 32 grid, 0.86 on the 64.
 */
function bladeWaist(ball) {
  const n = ball.length, c = n / 2;
  let shell = 0;
  for (let k = 0; k < c; k++) {
    const x = Math.floor(c - 1 - k), y = Math.floor(c - 1 - k);
    if (x < 0) break;
    if (!'RhrHWwg'.includes(ball[y][x])) continue;
    shell = Math.max(shell, Math.hypot(x + 0.5 - c, y + 0.5 - c) / c);
  }
  // One cross-section further out, which puts the waist against the ball's line
  // rather than a cell short of it — 0.884 of the radius at either size.
  return shell + 1 / (c * Math.SQRT2);
}

// Half the blade's width across, at `t` radii out along its axis: straight from
// the point on the ring up to the waist, then a square root past it, which is
// the render's own far half to within a few thousandths of a radius: the sides
// run nearly straight out of the waist and converge to a point, sharp but with
// no corner in them.
const bladeHalf = (t, half, waist) => {
  const { from, to } = BLADE;
  return t <= waist
    ? (half * (t - from)) / (waist - from)
    : half * Math.sqrt(Math.max(0, (to - t) / (to - waist)));
};

/**
 * The half-width the blade is actually drawn at on a given grid.
 *
 * Cells along a 45 degree band sit root two apart across it, and the band that
 * lands on the ball's outline offers a different set of those places from the
 * two beside it. So a width measured off the render can leave the spike a cell
 * narrower exactly where it ought to be widest — pinched on the line instead of
 * bulging over it, which is what the eye reads as the spike being widest
 * somewhere else. The measured width is therefore nudged up to the first value
 * that puts the widest cross-section on the outline, which is a fraction of a
 * It has to be widest in one cross-section alone, at the waist or next to it. A width that ties
 * with the cross-section next to it draws a flat top, and the side of the spike
 * then climbs, runs level and drops — which is not what the side is meant to do.
 * It is meant to be a mountain: up one side, a peak, and down the other, the
 * peak a point of change rather than a plateau.
 */
function bladeWidth(ball, waist) {
  const n = ball.length, c = n / 2, margin = marginFor(ball), size = n + 2 * margin;
  const band = (t) => Math.round(t * c * Math.SQRT2);
  const want = band(waist);
  for (let half = BLADE.half; half <= BLADE.half * 1.3; half += 0.001) {
    // The mask as it will actually be drawn, the smoothing pass included: that
    // pass fills notches, and a notch filled beside the peak ties two
    // cross-sections together and flattens the top.
    const on = [];
    for (let y = 0; y < size; y++) {
      on.push([...Array(size)].map((_, x) =>
        blade((x + 0.5 - margin - c) / c, (y + 0.5 - margin - c) / c, 1 / c, half, waist) !== ''));
    }
    const filled = on.map((row, y) => row.map((here, x) =>
      here || [[1, 0], [-1, 0], [0, 1], [0, -1]].filter(([dx, dy]) => on[y + dy]?.[x + dx]).length >= 3));
    // How far out from its axis the spike reaches in each cross-section: the
    // side of it, which is the line that has to be a mountain.
    const reach = new Map();
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const u = (x + 0.5 - margin - c) / c, v = (y + 0.5 - margin - c) / c;
        if (u > 0 || v > 0 || !filled[y][x]) continue;
        const k = band(-(u + v) * Math.SQRT1_2);
        reach.set(k, Math.max(reach.get(k) ?? 0, Math.abs(u - v) * Math.SQRT1_2 * c));
      }
    }
    const most = Math.max(...reach.values());
    if (reach.get(want) > most - 0.01) return half;
  }
  return BLADE.half;
}


// The four diagonals a blade runs along, in the order the level table below is
// read in: up-left, up-right, down-left, down-right.
const AXES = [[-1, -1], [1, -1], [-1, 1], [1, 1]];

/**
 * Which gold a point of a blade takes, or nothing where no blade reaches.
 *
 * All four blades are the same blade under the same lamp, which is up and to the
 * left, so all four are shaded the same way: the flank that faces up takes the
 * light and the flank that faces down is in shadow. Measured across the render's
 * own spikes, at the middle of one of them, that reads
 *
 *      95 95 95 96 96 95 95 | 89 | 69 67 70 72 76 78
 *      ------- lit --------   ^^   ---- shaded -----
 *
 * — a lit side, the crease, and then a shaded side that is **deepest right
 * beside the crease** and lifts again towards the edge, which is light coming
 * back into it off the ball. That last part is what gives a blade its roundness;
 * a shaded side that simply got darker outwards reads as a flat wedge.
 *
 * The lit side is not flat either. Its own outer fifth turns away from the lamp
 * as the blade rounds off — 97 95 95 95 94 92 86 out from the crease — and at
 * the width these blades are drawn at, leaving that out means four cells of five
 * in one tone, which is half of every blade saying nothing.
 *
 * The line on the crease itself is laid on afterwards by `creaseGold`, which is
 * the only place that can know which cell is nearest the axis.
 */
function bladeTone(u, v, cell, half, waist, reach = 1) {
  for (const [ax, ay] of AXES) {
    const dx = ax * Math.SQRT1_2, dy = ay * Math.SQRT1_2;
    const t = u * dx + v * dy;
    if (t < BLADE.from || t > BLADE.to) continue;
    // Never thinner than a couple of cells across, so the points hold together.
    const wide = Math.max(bladeHalf(t, half, waist), 0.8 * cell);
    const s = -u * dy + v * dx;
    // `reach` lets a caller ask about a cell just outside the blade — the cells
    // the smoothing pass fills.
    if (Math.abs(s) > wide * reach) continue;
    // Which way across the blade is up. A blade's two flanks face along
    // (-dy, dx) and back; the one that faces up is the one whose own v is
    // negative, which is the `+s` side of the two blades leaning left and the
    // `-s` side of the two leaning right.
    const m = (s / wide) * (dx < 0 ? -1 : 1);
    if (m <= 0) return m < BLADE_TURN ? TURN : NORMAL;
    if (cell > 1 / 24) return m < BLADE_CORE ? CORE : BOUNCE;
    const [a, b, d] = BLADE_ROLL;
    return m < a ? TURN : m < b ? ROLL : m < d ? BOUNCE : CORE;
  }
  return null;
}

/**
 * A cell of a blade, by how much of the cell the blade actually covers.
 *
 * Asking whether the middle of a cell is on the spike puts the pixels wrong
 * wherever the spike is a couple of cells across, which on the 32 grid is most
 * of its length: an edge running at any angle but 45 degrees lands a cell early
 * or a cell late, and the spike comes out lumpy and off its own line. Sixteen
 * samples to the cell, a cell taken when it is half covered, and the tone
 * averaged over the part that is covered, puts them where the shape is.
 */
function blade(u, v, cell, half, waist) {
  const step = cell / 4;
  let hits = 0, cu = 0, cv = 0;
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 4; j++) {
      const pu = u + (i - 1.5) * step, pv = v + (j - 1.5) * step;
      if (bladeTone(pu, pv, cell, half, waist) === null) continue;
      hits++; cu += pu; cv += pv;
    }
  }
  if (hits < 8) return '';
  // How much of the cell the spike covers says whether the cell belongs to it;
  // the middle of the covered part says how that cell is shaded. Averaging the
  // tone over the samples instead averages a curve, which leans pale wherever a
  // cell is more out of the spike than in it — which is at both ends, and is
  // what made the shading drift along the spike's length.
  return bladeTone(cu / hits, cv / hits, cell, half, waist);
}

// The characters the ball itself draws its two halves with, and the golds a
// blade is drawn in one at a time. `GOLD` is the six of them in a string,
// hoisted up with this ball's shell so its entry can name them there.
const SHELL = 'RhrHWwg';
const CREASE = 'y';
const NORMAL = 'Y';
const TURN = 'f';
const ROLL = 'n';
const BOUNCE = 'e';
const CORE = 'E';

// Where a blade stops being flat, measured across the render's own spikes.
// Half a blade lies on the lit side of its crease and the render does not draw
// that half flat: from the crease outwards it reads
//
//      97 95 95 95 94 92 86  |  and the shaded side  67 70 72 76 78
//
// so the lit side holds its tone and then turns away over the last fifth of
// itself, while the shaded side is deepest against the crease and lifts to its
// edge. Both are the blade rounding off, and without the first of them the lit
// half — four cells of five at the widest — is one flat tone, which is most of
// a blade saying nothing.
const BLADE_TURN = -0.65;
const BLADE_CORE = 0.55;

// And what the shaded side does, averaged over all four of the render's spikes
// rather than read off one of them. As a share of the lit gold, out from the
// crease to the edge:
//
//     0.93  0.91  0.87  0.83  0.79  0.79  0.81  0.80  0.70
//
// it falls **gently** from the crease and only reaches the core at the very
// edge. Four bands cannot say that, and the one they do say — the core against
// the crease — puts the deepest gold next to the lightest, which is the hard
// stripe down the middle of a blade. The 64 grid has nine to eleven cells across
// a blade against the 32 grid's four or five, so it draws the roll and the 32
// keeps the four bands it has room for.
const BLADE_ROLL = [0.25, 0.5, 0.78];

function beastCoat(ball) {
  const waist = bladeWaist(ball);
  const half = bladeWidth(ball, waist);
  const coat = drawCoat(ball, ({ u, v, r, cell, base }) => {
    const { button, housing, ring, line } = BEAST;
    // The meridian and the equator are this ball's divider, so `line` is the
    // seam: two cells at 32 and four at 64, like the band every other ball inks.
    // A blade covers whatever is under it, the ball's own rim included; the
    // outline it carries outside the ball is laid on afterwards by `inkProud`.
    const gold = blade(u, v, cell, half, waist);
    if (gold) return gold;
    if (r <= button) return 'P';
    if (r <= housing) return 'k';
    if (!SHELL.includes(base)) return '';
    if (r <= housing + line) return 'L';
    // The equator is the divider between the two halves and is kept under a key
    // of its own, so `sheen` can hold the shadow off it; the meridian is grid
    // like the ring of latitude and takes the light with the rest.
    if (Math.abs(v) <= line) return 'D';
    if (Math.abs(u) <= line) return 'L';
    return Math.abs(r - ring) <= line / 2 ? 'L' : '';
  });
  const gold = creaseGold(smoothGold(coat, ball, half, waist), ball);
  return mendLine(closeNotches(inkProud(gold, ball, GOLD, marginFor(ball) / 2), ball), ball);
}

/**
 * The Net Ball's cage, measured rather than drawn.
 *
 * Two bars, mirrored down the middle. The *rib* is one moulded arch: it comes
 * over the crown, crosses the strut at the knob and carries on down the side to
 * rest its blunt end on the band. It is the ground between two ellipses about the
 * ball's middle — over the crown the outer runs 1.035 of a radius out and the
 * inner 0.995, at the band 0.655 and 0.514. The crown pair is the photograph's;
 * the band pair is pulled in from its 0.835 and 0.699, because the drawn ball
 * carries a two-cell inked rim the replica has not got and the traced bar leans
 * on that rim with barely a cell of teal outside it. Pulled in, the side bar
 * stands in the middle of the teal with the same gap either side of it — four
 * cells out to the ball's line and four in to the button's ring, on the drawn
 * grid — and, still being the ellipse's own curve, it keeps the outward lean
 * the replica's bars have rather than dropping square to the band.

 *
 * The *strut* is a straight bar rising 35 degrees from under the button's ring,
 * out through the knob to a blunt tip; it is a fifth of a radius across for its
 * whole length, which is what the knob's lump is made of where the two cross.
 *
 * Over the crown it is the cage, not the ball, that makes the silhouette, so
 * the rib carries the outline out with it the way the Beast Ball's blades do,
 * and where it reaches the rim it carries on through it to the shell: the crown
 * reads bar, then teal, not bar, outline, teal. On the replica the strut's tip
 * pokes out too, but only by 0.035 of a radius — half a cell on the drawn grid.
 * Drawn there it falls inside the cell the outline already fills and the ink it
 * carries squares the shoulder off into a shelf, so it stops at 0.975 instead,
 * inside the rim, where the ball's own line is the line round it. The crown's
 * own bump is the same 0.035, which the fine grid carries and the drawn one
 * cannot, so there the arch stops on the edge and the drawn ball's outline
 * comes out the circle it would be without a cage on it. The shape is one shape
 * at both sizes; it is only what each grid can hold of it that differs.
 *
 * The rib thins as it climbs, because near the crown the ball's own horizon
 * hides all but a sliver of the bar. It is never drawn narrower than 0.08 of a
 * radius, which is what keeps the arch whole where the photograph leaves only a
 * fortieth showing.
 */
const NET = {
  // The last three are the drawn grid's only: how far up the bar stands straight
  // before the cage starts drawing in towards the middle, how fast it draws in
  // after that, and how far in it goes before it stops.
  rib: { outA: 0.6546, outB: 1.035, inA: 0.5141, inB: 0.995, least: 0.08, hold: 0.125, lean: 0.2 },
  // Axis, rise off the band, half-width, how far the bar runs along its axis
  // and how blunt its end is rounded.
  strut: { u: 0.236, v: -0.259, rise: 0.607, half: 0.098, tip: 0.6275, nose: 0.085 },
  // How far round its own curve a bar's lit edge sits, and the two thresholds
  // that share the bar out between the photograph's three greys.
  roll: 1.2, lit: 0.86, mid: 0.3,
};

/**
 * How far a cell lies outside a bar, in radii — negative inside it — with the
 * tilt of the bar's normal there, which is what shades it: `m` runs from -1 at
 * one edge through 0 on the axis to +1 at the other, and (`nx`, `ny`) is the
 * way the rubber turns as it goes.
 */
/**
 * How far in towards the middle the drawn grid's cage is pulled at a height.
 *
 * The bar stands straight out of the band and then turns in. On the fine grid
 * the ellipse says that by itself; the drawn grid has two cells across the bar,
 * so the turn falls between them and the bar reads as a stub that rises and
 * never comes in. `hold` is how much of the climb keeps its ellipse exactly —
 * the whole lower bar, so it stands dead vertical and the teal either side of
 * its foot does not move — and above that the cage draws in at `lean` until it
 * has moved `cap` and stops. Two cells of `cap` is what takes the crown in far
 * enough that the line it carries sits over the ball's top row instead of
 * shelving out past it, and what turns the arch's drop from two-cell steps into
 * single ones.
 *
 * Both bars take it. Pulling the rib in on its own slides it a cell across the
 * strut where they cross, which opens a single teal cell at every step of the
 * join and reads as a net coming to pieces rather than as a curve.
 */
function netShear(v, cell) {
  const { outB, hold, lean } = NET.rib;
  if (v > 0 || cell <= outB - 1) return 0;
  return lean * Math.max(0, -v - hold) * (1 - (v / outB) ** 2);
}

function ribAt(u, v, cell) {
  if (v > 0) return null;
  const { outA, outB, inA, inB, least } = NET.rib;
  const side = u < 0 ? -1 : 1;
  const x = side * (Math.abs(u) + netShear(v, cell));
  const r = Math.hypot(x, v);
  if (r < 1e-6) return null;
  const nx = x / r, ny = v / r;
  const edge = (a, b) => 1 / Math.hypot(nx / a, ny / b);
  const out = edge(outA, outB);
  // Where the rib reaches the rim it carries on through it to the shell, so the
  // crown is bar and then teal rather than bar, outline, teal.
  const rim = rimOf(cell);
  const inner = Math.min(edge(inA, inB), out > 1 - rim ? 1 - rim : out - least);
  const half = (out - inner) / 2;
  const m = (r - (out + inner) / 2) / half;
  return { d: (Math.abs(m) - 1) * half, m, nx, ny };
}

function strutAt(u, v, cell) {
  const { u: su, v: sv, rise, half, tip, nose } = NET.strut;
  const side = u < 0 ? -1 : 1;
  const dx = Math.cos(rise), dy = -Math.sin(rise);
  // The strut draws in with the rib, so the knob they make stays one lump.
  const au = side * u - su, av = v - sv;
  const t = au * dx + av * dy, s = -au * dy + av * dx;
  // The bar as a rounded box along its axis, running back under the button's
  // ring — where the ball's own drawing cuts it — and out to its blunt tip.
  const back = -0.25;
  const qt = Math.abs(t - (back + tip) / 2) - ((tip - back) / 2 - nose);
  const qs = Math.abs(s) - (half - nose);
  const d = Math.hypot(Math.max(qt, 0), Math.max(qs, 0)) + Math.min(Math.max(qt, qs), 0) - nose;
  return { d, m: s / half, nx: side * -dy, ny: dx };
}

/**
 * The cage at a cell: the grey it is shaded, `K` for the cell of outline a bar
 * carries with it, or nothing. Where the bars cross, the one the cell sits
 * deeper inside says which way the rubber turns, so the knob is one lump rather
 * than two bars with a seam. The grey is the ball's own light rolled across the
 * bar: dark rubber, light along the edge that faces up and to the left.
 */
function netCage(u, v, cell) {
  let pick = null;
  for (const bar of [ribAt(u, v, cell), strutAt(u, v, cell)]) {
    if (!bar || bar.d > 0) continue;
    if (!pick || bar.d < pick.d) pick = bar;
  }
  if (!pick) return '';
  const m = Math.max(-1, Math.min(1, pick.m));
  // A bar is a half tube lying on the ball, so the light on it starts from the
  // ball's own normal there and is rolled across the bar from that. Lighting
  // the tube on its own is what left the cage's left-hand side flat: a bar
  // running up and to the left is edge-on to a lamp up and to the left, so no
  // part of its curve faces the lamp any more than any other and the whole side
  // comes out one tone. Rolled on to the ball it picks up the shell's own light
  // underneath it, and the left of the cage lifts while the right falls away.
  const r = Math.min(1, Math.hypot(u, v));
  const nz = Math.sqrt(Math.max(0, 1 - r * r));
  // The way across the bar, taken in the ball's tangent plane rather than flat.
  const lean = pick.nx * u + pick.ny * v;
  const tx = pick.nx - lean * u, ty = pick.ny - lean * v, tz = -lean * nz;
  const turn = m * NET.roll;
  const c = Math.cos(turn), s = Math.sin(turn) / (Math.hypot(tx, ty, tz) || 1);
  const lit = lambertOf(c * u + s * tx, c * v + s * ty, c * nz + s * tz);
  // The three greys are the photograph's cage at its twelfth, its forty-fifth
  // and its eightieth percentile, and the thresholds share the bars out in
  // about the proportions the photograph does — a fifth light, three fifths the
  // mid body, a fifth dark — so the cage reads as dark rubber with a lit edge
  // along the side facing up and to the left, not as a silver hoop.
  return lit > NET.lit ? 'm' : lit > NET.mid ? 'n' : 'k';
}

const NET_GREY = 'mnk';

/**
 * Settles a tone that has nothing of its own kind beside it.
 *
 * The greys come off a lamp on a curved bar, so along a run they sometimes
 * alternate. On the fine grid that reads as the roll of the rubber; on the
 * drawn grid a cell is a twelfth of the ball across, so a tone alone reads as a
 * speck of dirt instead, and the bar looks dithered rather than moulded. Any
 * such cell takes whichever tone most of its neighbours carry. No marking
 * moves: the greys stay exactly where they were and only which of the three
 * they are changes.
 */
function settleTones(coat) {
  const at = (x, y) => coat[y]?.[x] ?? '.';
  return coat.map((row, y) =>
    [...row]
      .map((key, x) => {
        if (!NET_GREY.includes(key)) return key;
        const near = [[1, 0], [-1, 0], [0, 1], [0, -1]]
          .map(([dx, dy]) => at(x + dx, y + dy))
          .filter((k) => NET_GREY.includes(k));
        if (near.length < 2 || near.includes(key)) return key;
        let best = key;
        let most = 0;
        for (const tone of NET_GREY) {
          const n = near.filter((k) => k === tone).length;
          if (n > most) {
            most = n;
            best = tone;
          }
        }
        return best;
      })
      .join(''),
  );
}

/**
 * Cells taken off the cage by hand, on the drawn grid only.
 *
 * Where the leg leaves the knob, the rounding carries a cell of the knob's grey
 * a row down the bar's inner column, which stops the leg reading as one
 * straight bar; handing it back to the shell squares it off. And the line the
 * crown carries comes out a cell longer at each end than the arch under it, so
 * the top reads as a shelf rather than as the cage breaking through — the two
 * end cells come off it. At each wing the same line stands three cells outside
 * the ball where the strut's tip pushes at it, and two of those are a staircase
 * — each one set diagonally off the grey below it, stepping out and up — which
 * come off too, leaving the cell that carries on the silhouette. Each is given
 * as how far out from the middle of the coat it sits, so it is taken off both
 * sides.
 *
 * The cell diagonally opposite the first — a cell of shell at the top of the
 * bar's outer column — was filled in to match and the pair compared side by
 * side; the shell was kept.
 */
const NET_TRIM = [
  { out: 7.5, row: 13 },
  { out: 3.5, row: 1 },
  { out: 11.5, row: 6 },
  { out: 12.5, row: 7 },
];

function trimCage(coat, ball) {
  // The fine grid resolves the corner itself; this is the drawn one's alone.
  if (ball.length !== 32) return coat;
  const middle = ball.length / 2 + marginFor(ball) - 0.5;
  const grid = coat.map((row) => [...row]);
  for (const { out, row } of NET_TRIM) {
    for (const side of [-1, 1]) grid[row][middle + side * out] = '.';
  }
  return grid.map((row) => row.join(''));
}

function netCoat(ball) {
  const coat = drawCoat(ball, ({ u, v, r, cell, base }) => {
    const bar = netCage(u, v, cell);
    if (!bar) return '';
    // The crown stands 0.035 of a radius outside the ball. A grid whose cells
    // are wider than that cannot carry the bump — it half fills the cell the
    // outline already owns, and the line it brings squares the crown off into a
    // two-cell spike — so there the arch stops on the ball's edge instead, the
    // same rule the strut's tip follows. Either way the cage lies on the teal
    // and over the crown takes the rim's place, but never the band's or the
    // button's.
    const carries = NET.rib.outB - 1 >= cell;
    return TOP_SHELL.includes(base) || (carries && base === '.') || (base === 'K' && r >= 0.85) ? bar : '';
  });
  return shadeStranded(trimCage(inkProud(coat, ball, NET_GREY), ball), ball);
}

/**
 * Hands back a cell of shell the cage has marooned.
 *
 * Where a bar runs along the line the shell's own shading follows, it can cut a
 * single cell of the lit tone off from the rest of it with the shaded tone on
 * the other side. One bright cell alone in the shadow reads as a speck of dirt
 * rather than as shell, so it joins the shading its neighbours already have.
 * Only a cell the shading has actually reached is turned: one cut off against
 * the ball's own line is simply lit shell in a tight corner, and stays.
 */
function shadeStranded(coat, ball) {
  const margin = marginFor(ball);
  const at = (x, y) => {
    const key = coat[y]?.[x] ?? '.';
    return key !== '.' ? key : ball[y - margin]?.[x - margin] ?? '.';
  };
  const lit = 'RhH';
  return coat.map((row, y) =>
    [...row]
      .map((key, x) => {
        if (key !== '.' || !lit.includes(at(x, y))) return key;
        const near = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([dx, dy]) => at(x + dx, y + dy));
        return near.some((ch) => lit.includes(ch)) || !near.includes('r') ? key : 'r';
      })
      .join(''),
  );
}

/**
 * Fills the one-cell notches a spike leaves in the ball's line.
 *
 * Where a spike crosses the outline the line steps round it, and the step can
 * leave a single bare cell with the drawing on three sides of it — a nick in the
 * silhouette. Inking it turns the nick into a corner, which is what the eye
 * expects of a line going round a shape.
 *
 * Only where the ball draws that line two cells thick. In a line one cell thick
 * a single cell in or out is how the line steps, not a nick in it, and filling
 * those changes the shape of the drawing rather than tidying it.
 */
function closeNotches(coat, ball) {
  const margin = marginFor(ball);
  if (margin < 4) return coat;
  const grid = coat.map((row) => [...row]);
  const bare = (x, y) =>
    (grid[y]?.[x] ?? '.') === '.' && (ball[y - margin]?.[x - margin] ?? '.') === '.';
  const add = [];
  for (let y = 0; y < grid.length; y++) {
    for (let x = 0; x < grid.length; x++) {
      if (!bare(x, y)) continue;
      if ([[1, 0], [-1, 0], [0, 1], [0, -1]].filter(([dx, dy]) => !bare(x + dx, y + dy)).length >= 3) {
        add.push([x, y]);
      }
    }
  }
  for (const [x, y] of add) grid[y][x] = 'K';
  return grid.map((row) => row.join(''));
}

/**
 * Evens the spikes' long edges.
 *
 * A straight edge running at a shallow angle to the diagonal lands on the cells
 * as a staircase, and half-covered cells decide which step they fall on one at a
 * time: the steps come out uneven, one of two cells and then one of none, which
 * is what reads as a ragged side rather than a smooth one. Filling any bare cell
 * the spike already surrounds on three sides takes the notches out of that
 * staircase without moving the edge, and cannot break the shape in two or reach
 * past where the spike goes. It tells on the 32 grid, where a step is a fifth of
 * the spike's width.
 */
function smoothGold(coat, ball, half, waist) {
  const margin = marginFor(ball), c = ball.length / 2;
  const grid = coat.map((row) => [...row]);
  const gold = (x, y) => GOLD.includes(grid[y]?.[x] ?? '.');
  const add = [];
  for (let y = 0; y < grid.length; y++) {
    for (let x = 0; x < grid.length; x++) {
      if (gold(x, y)) continue;
      const round = [[1, 0], [-1, 0], [0, 1], [0, -1]].filter(([dx, dy]) => gold(x + dx, y + dy)).length;
      if (round < 3) continue;
      const u = (x + 0.5 - margin - c) / c, v = (y + 0.5 - margin - c) / c;
      const tone = bladeTone(u, v, 1 / c, half, waist, 1.35);
      if (tone !== null) add.push([x, y, tone]);
    }
  }
  for (const [x, y, ch] of add) grid[y][x] = ch;
  return grid.map((row) => row.join(''));
}

/**
 * The line down the middle of every blade: the cells whose middles sit **on** the
 * blade's axis, taken in the lighter gold.
 *
 * A blade runs at 45 degrees, and cells along a 45 degree band sit root two
 * apart across it. Consecutive cross-sections therefore offer two interleaved
 * sets of places: one has a cell centred on the axis, the next straddles it with
 * a pair 0.707 of a cell either side and nothing in the middle. Taking one cell
 * from *every* cross-section means choosing one of that pair on every other one,
 * and whichever way the choice is made the line ends up leaning to that side —
 * a two-cell zig-zag sitting a third of a cell off centre rather than a line
 * down the middle.
 *
 * Taking only the cells actually on the axis leaves the staircase a 45 degree
 * line is drawn as everywhere else in this sprite, the ball's own outline
 * included: one cell thick, corner to corner, centred, and the same on all four
 * blades because it is not a choice at all.
 */
function creaseGold(coat, ball) {
  const margin = marginFor(ball), c = ball.length / 2, cell = 1 / c;
  const grid = coat.map((row) => [...row]);
  for (const [ax, ay] of AXES) {
    const dx = ax * Math.SQRT1_2, dy = ay * Math.SQRT1_2;
    for (let y = 0; y < grid.length; y++) {
      for (let x = 0; x < grid.length; x++) {
        if (!GOLD.includes(grid[y][x])) continue;
        const u = (x + 0.5 - margin - c) / c, v = (y + 0.5 - margin - c) / c;
        const t = u * dx + v * dy;
        // A cell belongs to the blade it is furthest along, so the four cannot
        // claim each other's cells where they meet at the hub.
        if (t <= 0 || !AXES.every(([bx, by]) => (bx === ax && by === ay)
          || t >= (u * bx + v * by) * Math.SQRT1_2)) continue;
        if (Math.abs(-u * dy + v * dx) < cell / 2) grid[y][x] = CREASE;
      }
    }
  }
  return grid.map((row) => row.join(''));
}

/**
 * Mends the one-cell nicks the ball's own line leaves against a blade.
 *
 * Where a blade crosses the line, the line stops at one edge of it and starts
 * again at the other, and the two ends do not always meet the blade square on. A
 * cell of line is left hanging off the end of its run with the blade against one
 * side of it and bare shell against the other, and it draws as a dark notch
 * bitten out of the gold. There are eight of them on the 64 grid, one at each
 * side of each blade, and none on the 32, where the line is thicker than the
 * step it has to take.
 *
 * A cell of line with only **one** inked neighbour is not the line going
 * anywhere; it is what is left of it. It is given back to the shell, in the tone
 * of the shell beside it — which up and to the left is the ball's own shine.
 * Giving it to the blade instead would fatten the blade by a cell at eight
 * places, which is a change to a shape that is settled.
 *
 * It runs last, over the finished drawing, because what counts is how many
 * inked neighbours a cell ends up with — and the outline round anything standing
 * proud is laid on after the coat, so asked any earlier the answer is a
 * different one and the pass mends cells the line still needs.
 */
function mendLine(coat, ball) {
  const margin = marginFor(ball);
  const grid = coat.map((row) => [...row]);
  const gold = (x, y) => GOLD.includes(grid[y]?.[x] ?? '.');
  const skin = (x, y) => (grid[y]?.[x] === '.' ? SKIN[ball[y - margin]?.[x - margin]] : undefined);
  const inked = (x, y) => grid[y]?.[x] === 'K'
    || (grid[y]?.[x] === '.' && ball[y - margin]?.[x - margin] === 'K');
  const N4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  const mend = [];
  for (let y = 0; y < grid.length; y++) {
    for (let x = 0; x < grid.length; x++) {
      // The ball's own line only. Ink the coat laid itself is the outline round
      // something standing proud, and taking a cell of that would open the
      // silhouette rather than close a notch in it.
      if (grid[y][x] !== '.' || !inked(x, y)) continue;
      if (!N4.some(([dx, dy]) => gold(x + dx, y + dy))) continue;
      if (N4.filter(([dx, dy]) => inked(x + dx, y + dy)).length !== 1) continue;
      const near = N4.map(([dx, dy]) => skin(x + dx, y + dy)).find(Boolean);
      if (near) mend.push([x, y, near]);
    }
  }
  for (const [x, y, key] of mend) grid[y][x] = key;
  return grid.map((row) => row.join(''));
}

/**
 * Closes the outline round anything that stands proud of the ball. A painter
 * inks the cell either side of its shape, which is the outline everywhere it
 * runs straight, but a curved or diagonal edge also touches the background at
 * its corners, where neither the shape nor its ink reaches. Those corners are
 * inked here, so nothing a coat paints — the Beast Ball's blades, the Timer
 * Ball's crest — meets the background without the ball's own line between them.
 *
 * `weight` is how many cells thick that line is. One is enough to close it; a
 * shape wanting the same weight as the ball's own rim at either size asks for
 * half the margin, which is one cell on the 32 grid and two on the 64.
 */
function inkProud(coat, ball, keys, weight = 1) {
  const margin = marginFor(ball);
  const grid = coat.map((row) => [...row]);
  const at = (x, y) => grid[y]?.[x] ?? '.';
  const bare = (x, y) => at(x, y) === '.' && (ball[y - margin]?.[x - margin] ?? '.') === '.';
  for (let pass = 0; pass < weight; pass++) {
    const near = pass ? `${keys}K` : keys;
    const add = [];
    for (let y = 0; y < grid.length; y++) {
      for (let x = 0; x < grid.length; x++) {
        if (!bare(x, y)) continue;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) if (near.includes(at(x + dx, y + dy))) add.push([x, y]);
        }
      }
    }
    for (const [x, y] of add) grid[y][x] = 'K';
  }
  return grid.map((row) => row.join(''));
}

/**
 * The Timer Ball's coat on the 64 grid, measured rather than doubled.
 *
 * Every number here is read off the 32-grid drawing above, and drawing them
 * instead of doubling them is what closes the gaps: `scale2x` puts an edge
 * where the 64-grid ball no longer is, so a crescent came out a cell short of
 * the shell on one row — white slivers against the rim — and a cell over the
 * outline on the next. Asked for at this grid's own size and clipped to the
 * shell, every edge is flush.
 *
 *   cap       the shell above five eighths of a radius up, one flat grey; drawn
 *             in two tones the darker one reads as an outline inked round the
 *             crest rather than as a cap the crest stands in
 *   crescent  one ribbon `band` wide, hung off the shell's own line rather than
 *             measured from the middle of the ball: its inner edge is the outer
 *             edge moved in six cells, so the red keeps six on every row and
 *             its staircase is the outline's own. That is what stops the strip
 *             pinching and swelling a cell at a time down the side, which no
 *             amount of rounding off the corner could fix — the two edges were
 *             simply stepping on different rows. Down the shoulder a straight
 *             edge leaning in a cell a row — the drawing's own edge — cuts the
 *             ribbon back to a wedge, and below the seam the ribbon narrows
 *             steadily to nothing three quarters of the way down, the way the
 *             drawing's tail does.
 *   crest     a stem a quarter of a radius across from the crown, necking away
 *             over the lower quarter of the cap to a point at 0.5625; a head
 *             bulging to three eighths over the middle of the cap; a cell of
 *             its own outline beside its top, and above the crown a tip
 *             rounded off rather than cut square
 */
const TIMER = { cap: -0.625, band: 0.1875, lean: [0.984375, 1], foot: 0.75, edge: 1 / 16 };
const CREST = { stem: 0.125, neck: 0.03125, from: -0.75, head: 0.1875, at: -0.875, rise: 0.12, top: -1, tip: -0.5625 };

/**
 * Half the crest's width at `v` radii down: the stem, which necks away over the
 * lower quarter of the cap, and over the middle of the cap the head swelling
 * out of it. The drawing steps both of those in one row, which on this grid
 * would be two cells at a stroke; taken as a ramp and an arc they climb a cell
 * a row here and still rasterise to the drawing at 32. The ramp runs the whole
 * way to the tip rather than levelling off part way, so the point loses a cell
 * either side on its last row instead of ending as a flat stub — at 32 that is
 * still the drawing's own two cells, row for row.
 */
const crestHalf = (v) => {
  const { stem, neck, from, head, at, rise, top, tip } = CREST;
  if (v < top || v > tip) return 0;
  const t = Math.min(1, Math.max(0, (v - from) / (tip - from)));
  return Math.max(stem + (neck - stem) * t, head * Math.sqrt(Math.max(0, 1 - ((v - at) / rise) ** 2)));
};

function timerFine(ball) {
  const { cap, band, lean, foot, edge } = TIMER;
  return drawCoat(ball, ({ u, v, r, cell, base }) => {
    const a = Math.abs(u), half = crestHalf(v);
    // The crest, which paints over the ball's own rim where it crosses the
    // crown, and the cell of outline it carries above it. Its top row, which
    // the rim would otherwise swallow, catches the light whole.
    if (half > 0 && a <= half) {
      return v <= -0.9375 ? 'c' : half - a <= edge ? (u < 0 ? 'c' : 'd') : 'A';
    }
    // and the cell of outline it carries: above the crown, where the tip is
    // taken round on an arc rather than left square, so the crest reads as
    // something standing on the ball rather than a chimney set on top of it;
    // and down either side of the two rows the crown's own rim would swallow.
    if (v < CREST.top) {
      const up = (CREST.top - v) / edge;
      if (up <= 1 && a <= CREST.stem * Math.sqrt(1 - up * up)) return 'K';
    } else if (v <= -0.9375 && a <= CREST.stem + edge) return 'K';
    if (!SHELL.includes(base)) return '';
    // The cap is one tone: split in two it reads as a dark outline drawn round
    // the crest rather than as a cap the crest stands in.
    if (v <= cap) return 'j';
    // The ribbon is measured in from the shell's own line rather than out from
    // the middle of the ball, so both its edges step on the same rows and it
    // holds its six cells the whole way down instead of pinching and swelling
    // wherever the outline's staircase and the marking's disagree. The leaning
    // edge, which falls a cell a row, cuts it back to a wedge down the
    // shoulder; where the two meet the wedge simply runs out and the ribbon
    // carries on, and because the line is set half a cell off this grid's own
    // centres it never lands on a boundary and drops a step.
    const skin = 1 - rimOf(cell);
    const shell = Math.sqrt(Math.max(0, skin * skin - v * v)), ribbon = shell - band;
    const hem = v <= 0
      ? Math.min(lean[0] + lean[1] * v, ribbon)
      : shell - band * Math.max(0, 1 - v / foot);
    if (a < hem) return '';
    // The crescents take the ball's own lamp, so they darken as they turn away.
    const lit = lambertOf(u, v, Math.sqrt(Math.max(0, 1 - r * r)));
    return lit > 0.898 ? 'a' : lit > 0.3225 ? 'A' : 'd';
  });
}


/**
 * The Luxury Ball is the ball's own drawing in gold: everything the Poké Ball
 * inks between its halves — the seam, four rows of it, and the ring round the
 * button — is gold here, and the silver is the line the halves meet that gold
 * along, a cell out on the black.
 *
 * So the divider is as wide as any other ball's, the gold runs unbroken from
 * the band into the housing (on the replica there is no chrome between them,
 * and none at the housing's sides), and the chrome is that one shape's outline:
 * straight along the band, round the housing where it stands out of it, and a
 * cell past the ball at the tips, capped in ink, as the replica's lip is. Only
 * the ball's own line is left dark, and only a cell of it — the gold covers the
 * inner cell of the rim the way the band it stands for does.
 *
 * Above it the crown's ring, a sixteenth of gold, an eighth of red and a
 * sixteenth of gold, painted on the shell like any other marking: it stops at
 * the ball's line rather than covering it.
 */
function luxuryCoat(ball) {
  // The ball's own drawing, in radii: the ring from `LOGO.button` out to
  // `LOGO.ring`, and `SEAM`, so the gold covers the seam's cells exactly.
  const button = LOGO.button / 8;
  const ring = LOGO.ring / 8;
  // How far the silver lies outside the gold and how far the gold runs into the
  // ball's line: a sixteenth of a radius, a cell at 32 and two at 64. The trims
  // run out to the ball's own edge and stand proud of it there, `inkProud`
  // carrying the line round them.
  const trim = 1 / 16;
  const edge = 1 - trim;
  const coat = drawCoat(ball, ({ u, v, r, cell, base }) => {
    const a = Math.abs(u), b = Math.abs(v);
    // The gold: the button, the flat ring round it, and the seam, which the ring
    // runs into without a seam of its own. The button is one colour, laid over
    // the button the ball itself draws, so `PAINT_LIGHT` gives it that button's
    // shadow — the same diagonal every other ball's button carries.
    if (r <= button) return 'Y';
    if (r <= ring) return 'G';
    // Gold out to the inner cell of the rim. Past it the fine grid keeps two
    // ink columns; the outer one's middle two cells are cleared on both tips.
    if (b <= SEAM) {
      if (a <= edge) return 'G';
      if (ball.length > 32 && b <= cell / 2 && a > edge + cell && a <= edge + 2 * cell) return ' ';
      return '';
    }
    // The silver: that gold's outline, on the halves.
    if (r <= ring + trim) return 'T';
    if (b <= SEAM + trim) return a <= 1 ? 'T' : a <= 1 + cell ? 'K' : '';
    if (!TOP_SHELL.includes(base) || v < -0.8125 || v >= -0.5625) return '';
    return v < -0.75 || v >= -0.625 ? 'G' : 'R';
  });
  // The ball's line caps the chrome's ends and carries on round them: at 64 the
  // cap is a cell where the rim is three, so over and under it the line has
  // stepped away and the silver is left against the background, on its edge and
  // on its corner alike. `inkProud` inks both — twelve cells, six a side. At 32
  // the rim already fills that corner and the user asked for it to be left be.
  const closed = closeGold(coat, ball);
  return ball.length > 32 ? inkProud(closed, ball, 'T') : closed;
}

/**
 * The silver closes the gold's diagonal corners.
 *
 * Round the housing the silver rim climbs in steps, and a step leaves a black
 * cell with gold across its diagonal and silver on both sides of it — the gold
 * touching the shell at a point, which reads as a nick in the rim rather than a
 * corner. Those cells become silver: eight of them at 32, four either side of
 * the housing, and the finer staircase's own at 64. Only cells the coat left
 * alone and the ball drew shell under are taken, so nothing outside the ball and
 * nothing the crown painted is touched.
 */
function closeGold(coat, ball) {
  const margin = marginFor(ball);
  const grid = coat.map((row) => [...row]);
  const at = (x, y) => coat[y]?.[x] ?? '.';
  const gold = (x, y) => 'GY'.includes(at(x, y));
  const add = [];
  for (let y = 0; y < grid.length; y++) {
    for (let x = 0; x < grid.length; x++) {
      if (at(x, y) !== '.' || !SHELL.includes(ball[y - margin]?.[x - margin] ?? '.')) continue;
      for (const [dx, dy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
        // Silver on both sides is what says this is the rim's staircase and not,
        // say, the crown's ring, which has no silver and keeps its corners.
        if (gold(x + dx, y + dy) && at(x + dx, y) === 'T' && at(x, y + dy) === 'T') add.push([x, y]);
      }
    }
  }
  for (const [x, y] of add) grid[y][x] = 'T';
  return grid.map((row) => row.join(''));
}

/**
 * The Dusk Ball: the Poké Ball's own drawing, in orange and green.
 *
 * Both halves are black. The divider is the ball's own — every cell it inks
 * between the halves, the seam and the ring round the button, is orange here,
 * the way the Luxury Ball's is gold — and the button inside that ring is the
 * same orange a shade lighter, so it tells against the ring while keeping the
 * button's own shadow on the Poké Ball's diagonal. Nothing is drawn outside
 * that: the housing is the ring, not a flange painted over the shell.
 *
 * Then the green, which is six discs on the sphere, one out along each axis.
 * The one facing us is a ring round the divider, out to `DUSK.ring`. The four
 * on the sides sit on the ball's own line, half of each round the back, and
 * the line cuts them: everything stays inside the ball.
 *
 * Drawn true they would have no curve to cut. A cap seen exactly edge-on has
 * its rim circle standing square to us, so it projects to a *straight* chord,
 * and the black would meet the green along four straight lines — on this ball
 * the only straight line is the divider. So each of the four is drawn as the
 * ellipse a disc makes a little short of edge-on: `wide` along the ball's line
 * and `deep` into it, its middle reaching in to `1 - deep` and its ends running
 * past the line, where the line cuts them. The black is then four curved wedges
 * on the diagonals, which is what the replica shows.
 *
 * The measurements are in sixteenths of the radius, the grid's own unit — a
 * cell at 32 and two at 64 — so every edge lands where a cell ends on either
 * grid: the green ring nine, the discs eight along the line and five into it,
 * which leaves two cells of black between the ring and the discs.
 */
const DUSK = { ring: 9 / 16, wide: 8 / 16, deep: 5 / 16 };

function duskCoat(ball) {
  // The ball's own button and the ring round it, in radii, as the Luxury Ball
  // takes them.
  const button = LOGO.button / 8;
  const ring = LOGO.ring / 8;
  return drawCoat(ball, ({ u, v, r, cell, base }) => {
    if (base === '.') return '';
    // The divider in orange: the button, the ring, and the seam out to the
    // inner edge of the ball's line — never over it.
    if (r <= button) return 'D';
    if (r <= ring) return 'O';
    if (Math.abs(v) <= SEAM) return Math.abs(u) <= 1 - rimOf(cell) ? 'O' : '';
    // Whatever else the ball inked is its outline, which no marking covers.
    if (base === 'K') return '';
    // The disc facing us, then the four the outline cuts.
    if (r <= DUSK.ring) return 'G';
    for (const [cu, cv] of [[0, -1], [0, 1], [-1, 0], [1, 0]]) {
      const deep = (cu ? u - cu : v - cv) / DUSK.deep;
      const wide = (cu ? v - cv : u - cu) / DUSK.wide;
      if (deep * deep + wide * wide <= 1) return 'G';
    }
    return '';
  });
}

/**
 * The balls whose 32-grid coat is a picture and whose 64-grid one is not that
 * picture doubled: the same shapes drawn again at this grid's own pitch, so
 * each edge lands on cells of its own rather than on pairs of them. The balls
 * whose coats are measurements — the Beast, Luxury, Net and Dusk Balls — draw
 * themselves at either size and never come through here, and the rest, whose
 * coats are drawings, are carried up by `scale2x` instead.
 */
const FINE = {
  // The same drawing at this grid's own size rather than doubled: see
  // `timerFine`, which is what keeps the crescents flush with the rim.
  'timer-ball': timerFine,

  // The same drawing on the 64 grid, at that grid's own resolution. **The
  // letter here is the approved one and is not to be redrawn to match the
  // drawn ball's.** It is the photograph's own, rows 14 to 25: strokes two
  // cells wide at the drawn pitch, columns five and seven rows deep, peaks
  // falling five rows before the notch shuts, a band on row 19 where it runs
  // solid across, and the middle closing eight, six, four, two to its point.
  // The drawn letter has since been cut thin and dropped a row, twice, and
  // both times carrying that across here was wrong; the two are meant to be a
  // heavy letter and a light one, not one letter at two sizes. The cap is the same ellipse at twice the
  // pitch, with its line two cells where the drawn ball's is one. It runs a row
  // lower at both ends than the doubled place, rows 6 to 29: its tail has to
  // cover the row of line that otherwise shows against the purple there, and
  // the extra row at the head keeps the lens symmetric about the same shoulder.
  // The line then carries one row past the paint, to row 31, because the ball's
  // own silhouette steps in a column there while the cap's stands proud either
  // side of it, and without that row the outline shows a one-cell notch.
  'master-ball': () => [
    '........................................................................',
    '........................................................................',
    '........................................................................',
    '........................................................................',
    '.......................KKKKKKKK.        .KKKKKKKK.......................',
    '.....................KKKKKK..................KKKKKK.....................',
    '....................KKKK.PPPP..............PPPP.KKKK....................',
    '..................KKKK.Ppppppp............PPPPPPP.KKKK..................',
    '.................KKK..pppppppp............PPPPPPPP..KKK.................',
    '................KKK.pppppppppp............PPPPPPPPPP.KKK................',
    '..............KKK..pppppppppp..............PPPPPPPPPP..KKK..............',
    '.............KKK..ppssssssppp..............PPPPPPPPPPP..KKK.............',
    '............KKK.ppssssssssspp..............PPPPPPPPPPPPq.KKK............',
    '...........KKK.ppssssssssssp................PPPPPPPPPPPPq.KKK...........',
    '..........KKK.ppsssssssssss...m..........m...PPPPPPPPPPPqq.KKK..........',
    '..........KK.ppssssssssssss..mmm........mmm..PPPPPPPPPPPqqq.KK..........',
    '.........KK.pppsssssssssssh..mmmm......mmmm...PPPPPPPPPPqqqq.KK.........',
    '........KK..ppsssssssssssh..mmmmmm....mmmmmm...PPPPPPPPPqqqq..KK........',
    '.......KKK.pppssssssssssh...mmmmmmm..mmmmmmm....PPPPPPPPqqqqq.KKK.......',
    '.......KK.ppppssssssssss...mmmmmmmmmmmmmmmmmm...PPPPPPPPqqqqqq.KK.......',
    '......KK.Pppppsssssssss....mmmm.mmmmmmmm.mmmm....PPPPPPPqqqqqqq.KK......',
    '.....KKK.Pppppssssssss....mmmm...mmmmmm...mmmm....PPPPPPqqqqqqq.KKK.....',
    '.....KK.PPppppppssspp.....mmmm....mmmm....mmmm.....PPPPPqqqqqqqq.KK.....',
    '.....KK.PPpppppppppp.....mmmm......mm......mmmm.....PPPPqqqqqqqq.KK.....',
    '....KK.PPPpppppppp.......mmmm..............mmmm.......Pqqqqqqqqqq.KK....',
    '....KK.PPPppppppp.......mmmm................mmmm.......qqqqqqqqqq.KK....',
    '....KK.PPPpppppp........................................qqqqqqqqq.KK....',
    '....K..PPPPppp............................................qqqqqqq..K....',
    '....K..PPPPPP..............................................qqqqqq..K....',
    '....K..PPP....................................................qqq..K....',
    '....K..............................................................K....',
    '....K..............................................................K....',
  ],
};

/**
 * A ball's markings on the grid it is drawn on: a coat that is a painter draws
 * itself at either size, one that is a picture is used as it stands at 32 and
 * either repainted by `FINE` or doubled by `scale2x` at 64.
 */
const logoCoat = (spec, grid) => (typeof spec.coat === 'function' ? spec.coat(grid) : spec.coat ?? []);
const fineCoat = (ball, spec, grid) =>
  FINE[ball] ? FINE[ball](grid, spec)
  : typeof spec.coat === 'function' ? spec.coat(grid)
  : scale2x(spec.coat ?? [], FINE_GRID / 2);

function ballCanvas(rows, palette = BALLS['poke-ball'].palette) {
  const canvas = new Canvas(rows.length, rows.length);
  canvas.sprite(rows, palette, 0, 0, 1);
  return canvas;
}

/**
 * A logo: the ball in its palette, inset by the margin, with its coat painted
 * over it.
 *
 * `sheen` is the third way a coat's cell can be lit, after `paint`, which takes
 * the light of the character under it, and `flat`, which takes none. A key
 * named there is given the ball's own lamp at its own place on the sphere — a
 * share of the gloss and a share of the shadow, written `[gloss, shade]` — so
 * that:
 *
 * - a marking may go easy on one end of the lamp or step out of it entirely.
 *   `[1, 0]` is a marking the shadow never reaches, `[0, 0]` one the lamp does
 *   not touch at all, and a share of nothing leaves the colour as it was;
 * - a marking standing proud of the rim carries the sweep on out past the ball,
 *   which the character under it cannot say, there being no cell of shell
 *   there — see `shellTone`;
 * - a marking laid over the button's ink ring is lit like the sphere it sits
 *   on rather than left flat, the ring carrying no light of its own.
 *
 * It works for a `flat` colour and a `paint` one alike: the share replaces
 * whichever of the two would otherwise have decided the cell.
 */
function coatedBall(rows, { palette, paint = {}, flat = {}, light = PAINT_LIGHT, sheen = {} }, coat = []) {
  const margin = marginFor(rows);
  const size = rows.length + 2 * margin;
  const c = rows.length / 2;
  const canvas = new Canvas(size, size);
  canvas.sprite(rows, palette, margin, margin, 1);
  coat.forEach((row, y) => {
    [...row].forEach((key, x) => {
      if (key === '.') return;
      if (key === ' ') return canvas.rect(x, y, 1, 1, [0, 0, 0, 0]);
      if (key === 'K') return canvas.rect(x, y, 1, 1, palette.K);
      const share = sheen[key];
      if (share) {
        const tone = shellTone((x + 0.5 - margin - c) / c, (y + 0.5 - margin - c) / c, 1 / c);
        const lamp = light[tone], part = share['Hh'.includes(tone) ? 0 : 1];
        const color = paint[key] ?? flat[key];
        return canvas.rect(x, y, 1, 1, lamp && part ? mix(color, lamp[0], lamp[1] * part) : color);
      }
      if (key in flat) return canvas.rect(x, y, 1, 1, flat[key]);
      const lit = light[rows[y - margin]?.[x - margin]];
      canvas.rect(x, y, 1, 1, lit ? mix(paint[key], ...lit) : paint[key]);
    });
  });
  return canvas;
}

/**
 * Doubles a coat the way Scale2x does: every cell becomes four, and a corner is
 * taken from a neighbour only where two neighbours agree and the two opposite
 * them do not — which rounds a staircase instead of squaring it. It is what the
 * coats that are drawings rather than measurements (the Great Ball's blocks, the
 * Beast Ball's spikes, the Timer Ball's crest) are carried up to the 64 grid
 * with: they keep every traced proportion and lose the jagged diagonals.
 */
function scale2x(coat, size) {
  const grid = Array.from({ length: size }, (_, y) => (coat[y] ?? '').padEnd(size, '.'));
  const at = (x, y) => (x >= 0 && y >= 0 && x < size && y < size ? grid[y][x] : '.');
  const out = [];
  for (let y = 0; y < size; y++) {
    let top = '', bottom = '';
    for (let x = 0; x < size; x++) {
      const P = at(x, y), A = at(x, y - 1), B = at(x + 1, y), C = at(x - 1, y), D = at(x, y + 1);
      top += (C === A && C !== D && A !== B ? A : P) + (A === B && A !== C && B !== D ? B : P);
      bottom += (D === C && D !== B && C !== A ? C : P) + (B === D && B !== A && D !== C ? D : P);
    }
    out.push(top, bottom);
  }
  return out;
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

// Every file this can draw, against the path it is written to, each behind a
// thunk so nothing is drawn until it is asked for.
const outputs = {};

// One logo per colourway, in public/ rather than favicon/: these are picked at
// runtime from the stored preference, so they need stable unhashed URLs. The
// header, the spinner and the Settings tiles all read them, which is what
// makes the ball a site theme rather than a spinner skin. The browser tab is
// not one of them: favicon.ico is the app's own mark, whatever ball is chosen.
// Settings can swap the drawings for the game's own icons, which sit beside
// them for the same reason.
// The fine set is the same ten on the 64 grid, drawn four pixels to a cell, so
// it is twice the drawn set's size as well as twice its resolution: the header
// and the tiles ask for the same box and get a sprite with pixels to spare.
for (const [ball, spec] of Object.entries(BALLS)) {
  outputs[`public/logo/${ball}.png`] = () => {
    const grid = gridFor(spec, false);
    return encodePng(coatedBall(grid, spec, logoCoat(spec, grid)).scaled(4));
  };
  outputs[`public/logo/fine/${ball}.png`] = () => {
    const grid = gridFor(spec, true);
    return encodePng(coatedBall(grid, spec, fineCoat(ball, spec, grid)).scaled(4));
  };
  outputs[`public/logo/original/${ball}.png`] = () => encodePng(originalIcon(ball));
}

// The tab icon is the Poké Ball and only ever the Poké Ball, so index.html can
// resolve it before any preference is known. This .ico is the app's icon and
// the only one, and it holds one drawing: BALL_16, at 16, 32 and 48. It used
// to carry BALL_32 as its middle frame, which is a second drawing of the same
// ball with a ringed button and a softer shell, so a 2x display picked that
// one and the tab showed a ball nobody had chosen. Whichever frame a platform
// takes now, it gets the ball you see when you open the file.
//
// It sits in public/ so it is served at /MasterPokedex/favicon.ico, the path a
// browser already expects an icon at, with no build step in between: Vite
// copies public/ verbatim, so the same URL works in the dev server, in the
// Docker image and on Pages. index.html versions the URL instead of hashing
// it, since Chrome keeps favicons in a store that clearing the cache does not
// empty, and a URL it has not seen is the only reliable way to refresh one.
outputs['public/favicon.ico'] = () => {
  const icon = ballCanvas(BALL_16);
  return encodeIco([icon, icon.scaled(2), icon.scaled(3)]);
};

outputs['public/og-image.png'] = () => encodePng(ogImage());

/**
 * Draws the files named on the command line, or all of them when nothing is
 * named. A name is any part of an output's path, so `beast-ball` redraws that
 * ball's three files, `fine/beast-ball` just the fine one, `logo/beast` the
 * drawn one and its fine twin, and `favicon` the tab icons.
 *
 * It writes those files and nothing else — it does not clear the directories
 * first. A run that swept them would take everyone else's work with it, and
 * this script is usually one of several hands on the same drawing; a name that
 * falls out of the set above leaves its file behind instead, which `git status`
 * shows. `--list` prints the names without drawing anything.
 */
const args = process.argv.slice(2);
const list = args.includes('--list');
const picks = args.filter((arg) => !arg.startsWith('--'));
const chosen = Object.keys(outputs).filter((file) => !picks.length || picks.some((pick) => file.includes(pick)));

if (list) {
  for (const file of Object.keys(outputs)) console.log(file);
} else if (!chosen.length) {
  console.error(`nothing matches ${picks.join(' ')}; --list prints what there is`);
  process.exit(1);
} else {
  let total = 0;
  for (const file of chosen) {
    const bytes = outputs[file]();
    mkdirSync(dirname(join(webRoot, file)), { recursive: true });
    writeFileSync(join(webRoot, file), bytes);
    total += bytes.length;
    console.log(`  ${file}`);
  }
  console.log(`${chosen.length} file${chosen.length === 1 ? '' : 's'}, ${(total / 1024).toFixed(1)} KB`);
}
