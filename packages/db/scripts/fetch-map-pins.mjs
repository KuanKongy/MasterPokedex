/**
 * Derives map pin coordinates for every location, from Bulbapedia's in-game
 * Town Map images.
 *
 *   node scripts/fetch-map-pins.mjs            (from packages/db)
 *   node scripts/fetch-map-pins.mjs --only kanto
 *
 * The map page needs an (x, y) per location and PokeAPI has no cartography at
 * all, so `curated.ts` carried fifteen hand-placed pins and seven regions had
 * none. Placing a thousand more by eye is neither accurate nor checkable.
 *
 * Bulbapedia has one image per location — "Kanto Route 1 Map.png",
 * "Sinnoh Jubilife City Map.png" — and within a region every one of them is
 * the same Town Map at the same size, differing only in which cell is
 * highlighted. So:
 *
 *   1. download a region's images,
 *   2. take the per-pixel median as the un-highlighted base,
 *   3. the pixels where an image differs from that base ARE its marker,
 *   4. the marker's centroid, as a fraction of the image, is the location.
 *
 * That yields exact, reproducible positions on the Town Map's own projection.
 * Turning those into positions on the illustrated region art in public/maps is
 * the second half of the job: `MAP_ANCHORS` names a handful of places whose
 * position on the artwork was read off by eye, and a least-squares affine fit
 * carries every other marker across. Output is data/map-pins.generated.ts,
 * which `seed-dex.ts` merges UNDER curated.ts — a hand-placed pin always wins.
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { inflateSync } from 'node:zlib';

const HERE = dirname(fileURLToPath(import.meta.url));
const CACHE = join(HERE, '..', '.cache');
const MARKER_DIR = join(CACHE, 'map-markers');
const OUT_FILE = join(HERE, 'data', 'map-pins.generated.ts');
const API = 'https://bulbapedia.bulbagarden.net/w/api.php';
const UA = 'MasterPokedex/1.0 (https://github.com/KuanKongy/MasterPokedex; khanhpronam@gmail.com)';

const args = process.argv.slice(2);
const ONLY = (() => {
  const i = args.indexOf('--only');
  return i === -1 ? null : new Set(args[i + 1].split(','));
})();

/**
 * Places whose position on the *illustrated* map art was read off by eye,
 * against a percentage grid. Three or more per region fixes the affine
 * transform from Town Map space to artwork space; more makes it steadier.
 * These are the only hand-entered numbers in this file.
 */
const MAP_ANCHORS = {
  kanto: {
    'pallet-town': [19, 62],
    'pewter-city': [21, 19],
    'cerulean-city': [65, 17],
    'saffron-city': [64, 35],
    'vermilion-city': [64, 55],
    'fuchsia-city': [46, 77],
    'lavender-town': [85, 44],
    'cinnabar-island': [18, 90],
  },
  johto: {
    'ecruteak-city': [40, 33],
    'olivine-city': [28, 47],
    'goldenrod-city': [36, 62],
    'mahogany-town': [53, 35],
    'blackthorn-city': [67, 32],
  },
  hoenn: {
    // The town in the far south-west corner is Dewford, on its island —
    // Littleroot is on the mainland coast above it.
    'littleroot-town': [8, 68],
    'dewford-town': [10, 88],
    'rustboro-city': [6, 42],
    'mauville-city': [29, 36],
    'slateport-city': [30, 70],
    'lilycove-city': [63, 22],
    'sootopolis-city': [76, 37],
    'mossdeep-city': [88, 20],
  },
  sinnoh: {
    'jubilife-city': [20, 70],
    'canalave-city': [9, 65],
    'oreburgh-city': [34, 68],
    'veilstone-city': [76, 50],
    'sunyshore-city': [91, 68],
  },
  unova: {
    'castelia-city': [52, 83],
    'nimbasa-city': [52, 52],
    'driftveil-city': [27, 68],
    'mistralton-city': [10, 37],
  },
  kalos: {
    'lumiose-city': [54, 35],
    'shalour-city': [17, 36],
    'laverre-city': [52, 8],
    'kiloude-city': [76, 88],
    'ambrette-town': [25, 70],
    'snowbelle-city': [85, 52],
  },
};

// ───────────────────────────────────────────────────────────── plumbing ──

const readCsv = (name) => {
  const text = readFileSync(join(CACHE, `${name}.csv`), 'utf8');
  const rows = [];
  let row = [], field = '', quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"') { if (text[i + 1] === '"') { field += '"'; i++; } else quoted = false; }
      else field += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ',') { row.push(field); field = ''; }
    else if (ch === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
    else if (ch !== '\r') field += ch;
  }
  if (field !== '' || row.length) { row.push(field); rows.push(row); }
  const header = rows.shift();
  return rows.filter((r) => r.length === header.length).map((r) => Object.fromEntries(header.map((h, i) => [h, r[i]])));
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let last = 0;
async function api(params) {
  const url = `${API}?${new URLSearchParams({ format: 'json', formatversion: '2', ...params })}`;
  for (let attempt = 0; ; attempt++) {
    const wait = Math.max(0, 1000 - (Date.now() - last));
    if (wait) await sleep(wait);
    last = Date.now();
    const res = await fetch(url, { headers: { 'User-Agent': UA } });
    if (res.ok) return res.json();
    if ((res.status === 429 || res.status >= 500) && attempt < 5) { await sleep(2000 * 2 ** attempt); continue; }
    throw new Error(`${res.status} ${res.statusText}`);
  }
}

const REGION_TITLE = {
  kanto: 'Kanto', johto: 'Johto', hoenn: 'Hoenn', sinnoh: 'Sinnoh', unova: 'Unova',
  kalos: 'Kalos', alola: 'Alola', galar: 'Galar', hisui: 'Hisui', paldea: 'Paldea', orre: 'Orre',
};

/** "Route 4" in Kanto is "Kanto Route 4 Map.png"; everything else is itself. */
function mapTitle(region, displayName) {
  const name = displayName.replace(/’/g, "'").trim();
  const prefix = REGION_TITLE[region];
  const base = /^(Sea )?Route \d+$/.test(name) ? `${prefix} ${name.replace(/^Sea /, '')}` : `${prefix} ${name}`;
  return `File:${base} Map.png`;
}

// ───────────────────────────────────────────────────────────── PNG read ──

/** Decodes a PNG to {w, h, rgba}. Enough of the spec for MediaWiki's output. */
function decodePng(buf) {
  let i = 8, w = 0, h = 0, bitDepth = 8, colorType = 6, idat = [], palette = null, trns = null;
  while (i < buf.length) {
    const len = buf.readUInt32BE(i);
    const type = buf.toString('ascii', i + 4, i + 8);
    const data = buf.subarray(i + 8, i + 8 + len);
    if (type === 'IHDR') {
      w = data.readUInt32BE(0); h = data.readUInt32BE(4);
      bitDepth = data[8]; colorType = data[9];
      if (data[12] !== 0) throw new Error('interlaced PNG');
    } else if (type === 'PLTE') palette = data;
    else if (type === 'tRNS') trns = data;
    else if (type === 'IDAT') idat.push(data);
    else if (type === 'IEND') break;
    i += 12 + len;
  }
  if (bitDepth !== 8) throw new Error(`bit depth ${bitDepth}`);
  const channels = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 }[colorType];
  const raw = inflateSync(Buffer.concat(idat));
  const stride = w * channels;
  const out = Buffer.alloc(h * stride);
  let prev = Buffer.alloc(stride);
  for (let y = 0, p = 0; y < h; y++) {
    const filter = raw[p++];
    const line = Buffer.from(raw.subarray(p, p + stride));
    p += stride;
    for (let x = 0; x < stride; x++) {
      const a = x >= channels ? line[x - channels] : 0;
      const b = prev[x];
      const c = x >= channels ? prev[x - channels] : 0;
      let add = 0;
      if (filter === 1) add = a;
      else if (filter === 2) add = b;
      else if (filter === 3) add = (a + b) >> 1;
      else if (filter === 4) {
        const pp = a + b - c, pa = Math.abs(pp - a), pb = Math.abs(pp - b), pc = Math.abs(pp - c);
        add = pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
      }
      line[x] = (line[x] + add) & 255;
    }
    line.copy(out, y * stride);
    prev = line;
  }
  // Normalise to RGBA so the diff below never has to care about the encoding.
  const rgba = Buffer.alloc(w * h * 4);
  for (let px = 0; px < w * h; px++) {
    const s = px * channels;
    let r, g, b, a = 255;
    if (colorType === 3) {
      const idx = out[s]; r = palette[idx * 3]; g = palette[idx * 3 + 1]; b = palette[idx * 3 + 2];
      if (trns && idx < trns.length) a = trns[idx];
    } else if (colorType === 0) { r = g = b = out[s]; }
    else if (colorType === 4) { r = g = b = out[s]; a = out[s + 1]; }
    else if (colorType === 2) { r = out[s]; g = out[s + 1]; b = out[s + 2]; }
    else { r = out[s]; g = out[s + 1]; b = out[s + 2]; a = out[s + 3]; }
    rgba.set([r, g, b, a], px * 4);
  }
  return { w, h, rgba };
}

/**
 * The marker is whatever this image has that the region's base does not.
 * Taking the median across every image of a region gives that base without
 * needing an un-highlighted copy to exist.
 */
function markerCentroid(image, base) {
  const { w, h, rgba } = image;
  let sx = 0, sy = 0, n = 0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const p = (y * w + x) * 4;
      const d =
        Math.abs(rgba[p] - base[p]) + Math.abs(rgba[p + 1] - base[p + 1]) + Math.abs(rgba[p + 2] - base[p + 2]);
      if (d > 60) { sx += x; sy += y; n++; }
    }
  }
  if (n < 8) return null;
  return { x: (sx / n / w) * 100, y: (sy / n / h) * 100, pixels: n };
}

function medianBase(images) {
  const { w, h } = images[0];
  const base = Buffer.alloc(w * h * 4, 255);
  const scratch = new Uint8Array(images.length);
  for (let p = 0; p < w * h * 4; p += 4) {
    for (let c = 0; c < 3; c++) {
      for (let i = 0; i < images.length; i++) scratch[i] = images[i].rgba[p + c];
      const sorted = Array.from(scratch).sort((a, b) => a - b);
      base[p + c] = sorted[sorted.length >> 1];
    }
  }
  return base;
}

/** Least-squares affine fit: Town Map space → illustrated artwork space. */
function fitAffine(pairs) {
  // Solve [x y 1] · M = [X Y] for M (3×2) by normal equations.
  const A = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
  const bx = [0, 0, 0], by = [0, 0, 0];
  for (const [[x, y], [X, Y]] of pairs) {
    const v = [x, y, 1];
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) A[i][j] += v[i] * v[j];
      bx[i] += v[i] * X;
      by[i] += v[i] * Y;
    }
  }
  const solve = (b) => {
    const m = A.map((row, i) => [...row, b[i]]);
    for (let col = 0; col < 3; col++) {
      let pivot = col;
      for (let r = col + 1; r < 3; r++) if (Math.abs(m[r][col]) > Math.abs(m[pivot][col])) pivot = r;
      [m[col], m[pivot]] = [m[pivot], m[col]];
      if (Math.abs(m[col][col]) < 1e-9) return null;
      for (let r = 0; r < 3; r++) {
        if (r === col) continue;
        const f = m[r][col] / m[col][col];
        for (let k = col; k < 4; k++) m[r][k] -= f * m[col][k];
      }
    }
    return [m[0][3] / m[0][0], m[1][3] / m[1][1], m[2][3] / m[2][2]];
  };
  const cx = solve(bx), cy = solve(by);
  return cx && cy ? { cx, cy } : null;
}

// ───────────────────────────────────────────────────────────── the run ──

async function main() {
  const names = new Map();
  for (const r of readCsv('location_names')) if (r.local_language_id === '9') names.set(r.location_id, r.name);
  const regions = new Map(readCsv('regions').map((r) => [r.id, r.identifier]));
  const locations = readCsv('locations')
    .map((r) => ({ slug: r.identifier, region: regions.get(r.region_id), displayName: names.get(r.id) ?? r.identifier }))
    .filter((l) => l.region && (!ONLY || ONLY.has(l.region)));

  // ── which images exist, and where ────────────────────────────────────────
  const urlFor = new Map();
  const todo = locations.filter((l) => !existsSync(join(MARKER_DIR, l.region, `${l.slug}.png`)));
  console.log(`${locations.length} locations, ${locations.length - todo.length} markers already cached.`);
  for (let i = 0; i < todo.length; i += 50) {
    const batch = todo.slice(i, i + 50);
    const titles = batch.map((l) => mapTitle(l.region, l.displayName));
    let data;
    try {
      data = await api({ action: 'query', prop: 'imageinfo', iiprop: 'url', titles: titles.join('|') });
    } catch (err) {
      console.error(`  ! batch ${i}: ${err.message}`);
      continue;
    }
    const byTitle = new Map((data.query?.pages ?? []).map((p) => [p.title, p]));
    for (const [k, loc] of batch.entries()) {
      const page = byTitle.get(titles[k].replace(/^File:/, 'File:'));
      const info = page?.imageinfo?.[0];
      if (info?.url) urlFor.set(loc.slug, info.url);
    }
    console.log(`  ${Math.min(i + 50, todo.length)}/${todo.length} probed, ${urlFor.size} found`);
  }

  for (const loc of todo) {
    const url = urlFor.get(loc.slug);
    if (!url) continue;
    const dir = join(MARKER_DIR, loc.region);
    mkdirSync(dir, { recursive: true });
    try {
      execFileSync('curl', ['-sfL', '--max-time', '45', '-A', UA, '-o', join(dir, `${loc.slug}.png`), url], { stdio: 'pipe' });
    } catch {
      /* a missing marker is just a location without a pin */
    }
  }

  // ── markers → Town Map fractions ─────────────────────────────────────────
  const schematic = {};
  for (const region of new Set(locations.map((l) => l.region))) {
    const dir = join(MARKER_DIR, region);
    if (!existsSync(dir)) continue;
    const files = readdirSync(dir).filter((f) => f.endsWith('.png'));
    const decoded = [];
    for (const file of files) {
      try {
        const img = decodePng(readFileSync(join(dir, file)));
        decoded.push({ slug: file.slice(0, -4), img });
      } catch {
        /* screenshots and oddities — skipped rather than guessed at */
      }
    }
    // Only images sharing the region's dominant size are the same Town Map.
    const sizes = new Map();
    for (const d of decoded) {
      const k = `${d.img.w}x${d.img.h}`;
      sizes.set(k, (sizes.get(k) ?? 0) + 1);
    }
    const [dominant, count] = [...sizes.entries()].sort((a, b) => b[1] - a[1])[0] ?? [];
    const usable = decoded.filter((d) => `${d.img.w}x${d.img.h}` === dominant);
    if (usable.length < 4) {
      console.log(`  ${region}: ${decoded.length} markers, none usable (sizes differ)`);
      continue;
    }
    // Some regions' "Map.png" files are not one Town Map with a moving
    // highlight at all — Alola ships a page per island, Hisui and Galar ship
    // screenshots. There the diff is the whole frame and every centroid lands
    // in the middle, so the give-away is markers that barely spread. Better no
    // pins than a pile of them stacked on the centre of the map.
    const base = medianBase(usable.map((d) => d.img));
    let placed = 0;
    for (const { slug, img } of usable) {
      const c = markerCentroid(img, base);
      // A marker covering most of the frame is a different map, not a cell.
      if (!c || c.pixels > img.w * img.h * 0.25) continue;
      (schematic[region] ??= {})[slug] = [Number(c.x.toFixed(2)), Number(c.y.toFixed(2))];
      placed++;
    }
    const xs = Object.values(schematic[region] ?? {}).map((p) => p[0]);
    const ys = Object.values(schematic[region] ?? {}).map((p) => p[1]);
    const spread = Math.min(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys));
    if (!xs.length || spread < 25) {
      delete schematic[region];
      console.log(`  ${region}: markers do not spread (${spread.toFixed(0)}%) — not one shared town map, skipped`);
      continue;
    }
    console.log(`  ${region}: ${placed}/${count} markers located on the ${dominant} town map`);
  }

  // ── Town Map → artwork ───────────────────────────────────────────────────
  const pins = {};
  for (const [region, marks] of Object.entries(schematic)) {
    const anchors = MAP_ANCHORS[region];
    if (!anchors) {
      console.log(`  ${region}: no artwork anchors — ${Object.keys(marks).length} markers left unplaced`);
      continue;
    }
    const pairs = Object.entries(anchors)
      .filter(([slug]) => marks[slug])
      .map(([slug, target]) => [marks[slug], target]);
    if (pairs.length < 3) {
      console.log(`  ${region}: only ${pairs.length} usable anchors, need 3`);
      continue;
    }
    const fit = fitAffine(pairs);
    if (!fit) { console.log(`  ${region}: anchors are collinear`); continue; }
    let worst = 0;
    for (const [[x, y], [X, Y]] of pairs) {
      const px = fit.cx[0] * x + fit.cx[1] * y + fit.cx[2];
      const py = fit.cy[0] * x + fit.cy[1] * y + fit.cy[2];
      worst = Math.max(worst, Math.hypot(px - X, py - Y));
    }
    for (const [slug, [x, y]] of Object.entries(marks)) {
      const px = fit.cx[0] * x + fit.cx[1] * y + fit.cx[2];
      const py = fit.cy[0] * x + fit.cy[1] * y + fit.cy[2];
      // Off the canvas means the fit does not cover this corner; no pin beats
      // a pin in the clouds.
      if (px < 2 || px > 98 || py < 2 || py > 98) continue;
      pins[slug] = [Number(px.toFixed(1)), Number(py.toFixed(1))];
    }
    console.log(`  ${region}: fitted on ${pairs.length} anchors, worst anchor error ${worst.toFixed(1)}%`);
  }

  writeFileSync(
    join(CACHE, 'map-markers-schematic.json'),
    JSON.stringify(schematic, null, 1),
  );
  const header = `/**
 * Generated by scripts/fetch-map-pins.mjs — do not edit by hand.
 *
 * Percentage positions on each region's illustrated map art, derived from
 * Bulbapedia's per-location Town Map images and carried across by an affine
 * fit on a handful of hand-read anchors. \`seed-dex.ts\` merges curated.ts on
 * top, so any pin placed by hand wins.
 *
 * ${Object.keys(pins).length} pins
 */
export const GENERATED_MAP_PINS: Record<string, [number, number]> = `;
  writeFileSync(OUT_FILE, `${header}${JSON.stringify(pins, null, 2)};\n`);
  console.log(`\n${Object.keys(pins).length} pins written to data/map-pins.generated.ts`);
}

main().catch((err) => { console.error(err); process.exitCode = 1; });
