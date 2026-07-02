/**
 * Backfills the curated location layer from Bulbapedia.
 *
 *   node scripts/fetch-location-data.mjs            (from packages/db)
 *   node scripts/fetch-location-data.mjs --verify   (resolve only, no downloads)
 *   node scripts/fetch-location-data.mjs --only kanto,johto
 *
 * PokeAPI models the games' mechanics exhaustively but carries no cartography:
 * no descriptions of places, no adjacency, no artwork. `data/curated.ts` filled
 * that in by hand for fifteen locations, which left 1,088 of them with a bare
 * title. Bulbapedia has a page for ~93% of them, and its infoboxes are
 * structured data in disguise:
 *
 *   {{Town infobox |image=Viridian City PE.png |mapdesc=... |north=Route 2
 *                  |south=Route 1 |west=Route 22 |gym=Viridian Gym |leader=Giovanni }}
 *   {{Route infobox|image=Kanto Route 1 PE.png |mapdesc=... |north=Viridian City
 *                  |south=Pallet Town }}
 *
 * So one pass over the wikitext yields image, description, neighbours, notable
 * trainers and kind for the whole world.
 *
 * Output is `data/locations.generated.ts`, which `seed-dex.ts` merges UNDER the
 * hand-written `LOCATION_META` — curated values always win, so corrections and
 * the hand-placed map pins survive a re-run.
 *
 * Images land in the web app's public/ directory as WebP, self-hosted for the
 * same reason `apps/web/scripts/fetch-static-assets.mjs` self-hosts the maps:
 * Bulbagarden's Cloudflare serves a challenge page to real browsers loading
 * cross-site, so hotlinks silently break.
 *
 * Politeness and resumability are not optional at this size. One request per
 * second, exponential backoff on 429/5xx, and every resolved page is written to
 * a checkpoint the moment it lands — an interrupted run picks up where it
 * stopped instead of asking the wiki for a thousand pages again.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, renameSync, statSync, unlinkSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const CACHE_DIR = join(HERE, '..', '.cache');
const PUBLIC_DIR = join(HERE, '..', '..', '..', 'apps', 'web', 'public');
const OUT_FILE = join(HERE, 'data', 'locations.generated.ts');
const CHECKPOINT = join(CACHE_DIR, 'bulbapedia-locations.json');

const API = 'https://bulbapedia.bulbagarden.net/w/api.php';
const UA = 'MasterPokedex/1.0 (https://github.com/KuanKongy/MasterPokedex; khanhpronam@gmail.com)';
const THUMB_WIDTH = 480;

const args = process.argv.slice(2);
const VERIFY_ONLY = args.includes('--verify');
const ONLY = (() => {
  const i = args.indexOf('--only');
  return i === -1 ? null : new Set(args[i + 1].split(','));
})();

// ─────────────────────────────────────────────────────────────── csv input ──

/** Minimal RFC-4180 reader — the same shape `lib/csv.ts` parses, without the download. */
function readCsv(name) {
  const text = readFileSync(join(CACHE_DIR, `${name}.csv`), 'utf8');
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; } else quoted = false;
      } else field += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ',') { row.push(field); field = ''; }
    else if (ch === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
    else if (ch !== '\r') field += ch;
  }
  if (field !== '' || row.length) { row.push(field); rows.push(row); }
  const header = rows.shift();
  return rows.filter((r) => r.length === header.length).map((r) => Object.fromEntries(header.map((h, i) => [h, r[i]])));
}

// ────────────────────────────────────────────────────────── title mapping ──

const REGION_TITLE = {
  kanto: 'Kanto', johto: 'Johto', hoenn: 'Hoenn', sinnoh: 'Sinnoh', unova: 'Unova',
  kalos: 'Kalos', alola: 'Alola', galar: 'Galar', hisui: 'Hisui', paldea: 'Paldea', orre: 'Orre',
};

/**
 * Bulbapedia disambiguates routes by region ("Kanto Route 1") but names
 * everything else plainly. Where that rule is wrong, the alias wins.
 */
const TITLE_ALIASES = {
  'kanto-sea-route-19': 'Kanto Route 19',
  'kanto-sea-route-20': 'Kanto Route 20',
  'kanto-sea-route-21': 'Kanto Route 21',
  'sinnoh-pokemon-league': 'Pokémon League (Sinnoh)',
  'kanto-pokemon-league': 'Indigo Plateau',
  'johto-pokemon-league': 'Indigo Plateau',
  'hoenn-pokemon-league': 'Pokémon League (Hoenn)',
  'unova-pokemon-league': 'Pokémon League (Unova)',
  'kalos-pokemon-league': 'Pokémon League (Kalos)',
  'sinnoh-victory-road': 'Victory Road (Sinnoh)',
  'kanto-victory-road-1': 'Victory Road (Kanto)',
  'kanto-victory-road-2': 'Victory Road (Kanto)',
  'kanto-victory-road-3': 'Victory Road (Kanto)',
  'johto-victory-road': 'Victory Road (Johto)',
  'hoenn-victory-road': 'Victory Road (Hoenn)',
  'unova-victory-road': 'Victory Road (Unova)',
  'kalos-victory-road': 'Victory Road (Kalos)',
  'hoenn-safari-zone': 'Safari Zone (Hoenn)',
  'kanto-safari-zone': 'Safari Zone (Kanto)',
  'johto-safari-zone': 'Safari Zone (Johto)',
  'hoenn-battle-frontier': 'Battle Frontier (Generation III)',
  'sinnoh-battle-zone': 'Battle Zone',
  'pokemon-mansion': 'Pokémon Mansion (Kanto)',
  'ss-anne': 'S.S. Anne',
  'ss-aqua': 'S.S. Aqua',
  'ss-tidal': 'S.S. Tidal',
  'mt-moon': 'Mt. Moon',
  'mt-silver': 'Mt. Silver',
  'mt-coronet': 'Mt. Coronet',
  'mt-pyre': 'Mt. Pyre',
  'mt-chimney': 'Mt. Chimney',
  'mt-ember': 'Mt. Ember',
};

/** `Route 4` in Kanto is `Kanto Route 4` on the wiki; everything else is itself. */
/**
 * The 91 region-less locations are PokeAPI's "met at" strings for things that
 * aren't places on a map: link trades, real-world distributions, gift NPCs.
 * A handful have a real article worth crawling; the rest synthesize a one-line
 * entry locally (below) and never cost a request.
 */
const REGIONLESS_TITLES = {
  'day-care-couple': 'Pokémon Day Care',
  'distant-land': 'Distant Land',
  'mystery-zone': 'Mystery Zone',
  'pokemon-ranger': 'Pokémon Ranger',
  'space-world': 'Nintendo Space World',
  'pokemon-festa': 'Pokémon Festa',
  pokepark: 'PokéPark',
  'nintendo-world': 'Nintendo World Store',
  'pokemon-fan-club': 'Pokémon Fan Club',
  'mr-pokemon': 'Mr. Pokémon',
  riley: 'Riley',
  cynthia: 'Cynthia',
  primo: 'Primo',
};

/** Year-suffixed met strings share their family's article and entry. */
const REGIONLESS_FAMILY = /^(pokemon-movie|space-world|pokemon-festa|pokepark|pokemon-event)-\d+$/;

/** Everything else gets a synthesized entry — kind "event", one plain line. */
const SYNTHESIZED = [
  [/^link-trade-arrive$/, 'A Pokémon that arrived through a link trade.'],
  [/^link-trade-met$/, 'A Pokémon met in a link trade — the games record the trade, not a place.'],
  [/^(kanto|johto|hoenn|sinnoh)$/, (slug) => `Met somewhere in ${slug[0].toUpperCase()}${slug.slice(1)} — the games record only the region.`],
  [/^lovely-place$/, 'The "lovely place" certain event Pokémon name as where they were met.'],
  [/^faraway-place$/, 'The "faraway place" certain event Pokémon name as where they were met.'],
  [/^traveling-man$/, 'A gift from the traveling man, an in-game giveaway character.'],
  [/^pokemon-movie(-\d+)?$/, 'A movie theater distribution — Pokémon handed out at showings of the Pokémon films.'],
  [/^pokemon-cartoon$/, 'A distribution tied to the animated series.'],
  [/^space-world(-\d+)?$/, 'Nintendo Space World, the trade show where early event Pokémon were distributed.'],
  [/^pokemon-festa(-\d+)?$/, 'Pokémon Festa, a Japanese fan event that distributed Pokémon.'],
  [/^pokepark(-\d+)?$/, 'The PokéPark theme park events in Japan and Taiwan.'],
  [/^pokemon-center$/, 'A Pokémon Center store — the real-world shops that distribute event Pokémon.'],
  [/^pc-([a-z]+)$/, (slug, m) => `The Pokémon Center ${m[1][0].toUpperCase()}${m[1].slice(1)} store — a real-world distribution site.`],
  [/^nintendo-world$/, 'The Nintendo World store in New York, a real-world distribution site.'],
  [/^wi-fi-event$/, 'A Pokémon distributed over Wi-Fi.'],
  [/^wi-fi-gift$/, 'A gift delivered over Wi-Fi.'],
  [/^pokemon-event(-\d+)?$/, 'A Pokémon event distribution.'],
  [/^event-site$/, 'An event distribution site.'],
  [/^concert-event$/, 'A concert event distribution.'],
  [/^pokemon-fan-club$/, 'The Pokémon Fan Club.'],
  [/^(day-care-couple)$/, 'An Egg from the Day Care Couple.'],
  [/^(mr-pokemon)$/, 'A gift from Mr. Pokémon, the collector on Route 30.'],
  [/^(riley)$/, 'An Egg from Riley, the Aura user of Iron Island.'],
  [/^(cynthia)$/, 'A gift from Cynthia, Champion of Sinnoh.'],
  [/^(primo)$/, 'A gift from Primo in the Violet City Pokémon Center.'],
];

function synthesizedEntry(slug) {
  for (const [pattern, text] of SYNTHESIZED) {
    const m = slug.match(pattern);
    if (m) {
      return {
        image: null,
        description: typeof text === 'function' ? text(slug, m) : text,
        kind: 'event',
        neighbors: [],
        notableTrainers: [],
        notable: false,
      };
    }
  }
  return null;
}

function bulbaTitle(slug, regionName, displayName) {
  if (REGIONLESS_TITLES[slug]) return REGIONLESS_TITLES[slug];
  if (TITLE_ALIASES[slug]) return TITLE_ALIASES[slug];
  const name = displayName.replace(/’/g, "'").trim();
  const region = REGION_TITLE[regionName];
  if (region && /^(Sea )?Route \d+$/.test(name)) return `${region} ${name.replace(/^Sea /, '')}`;
  return name;
}

// ────────────────────────────────────────────────────────────── wiki fetch ──

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * One request per second, with backoff. 429 and 5xx are retried up to five
 * times at 2s, 4s, 8s, 16s, 32s; anything else fails the call so the caller can
 * record the miss and move on rather than stalling the whole run.
 */
let lastRequest = 0;
async function apiGet(params) {
  const url = `${API}?${new URLSearchParams({ format: 'json', formatversion: '2', ...params })}`;
  for (let attempt = 0; ; attempt++) {
    const wait = Math.max(0, 1000 - (Date.now() - lastRequest));
    if (wait) await sleep(wait);
    lastRequest = Date.now();
    let res;
    try {
      res = await fetch(url, { headers: { 'User-Agent': UA, 'Accept-Encoding': 'gzip' } });
    } catch (err) {
      if (attempt >= 5) throw err;
      await sleep(2000 * 2 ** attempt);
      continue;
    }
    if (res.ok) return res.json();
    if ((res.status === 429 || res.status >= 500) && attempt < 5) {
      const retryAfter = Number(res.headers.get('retry-after'));
      console.warn(`    ${res.status} — backing off ${retryAfter || 2 * 2 ** attempt}s`);
      await sleep((retryAfter || 2 * 2 ** attempt) * 1000);
      continue;
    }
    throw new Error(`${res.status} ${res.statusText}`);
  }
}

// ─────────────────────────────────────────────────────── infobox → fields ──

/** Strips wiki markup down to the prose a card can show. */
function plain(value, { firstVariant = false } = {}) {
  if (!value) return null;
  let s = value;
  // `mapdesc` stacks one line per game, separated by <br>. Concatenating them
  // reads as a stutter ("A forest filled with... A deep, shady forest..."), so
  // captions take the first variant and drop the rest.
  if (firstVariant) s = s.split(/<br\s*\/?>/i)[0];
  s = s.replace(/<br\s*\/?>/gi, ' ');
  s = s.replace(/\{\{rtn?\|(\d+)\|[^}]*\}\}/gi, 'Route $1'); // route links
  s = s.replace(/\{\{sup\/\d+\|[^}]*\}\}/g, '');       // game-superscript tags
  s = s.replace(/\{\{tt\|([^|}]*)\|[^}]*\}\}/g, '$1'); // tooltip wrappers
  // Inline word templates carry the sentence's nouns — dropping them whole
  // leaves holes like "filled with terribly tough ." Expand the common ones.
  s = s.replace(/\{\{scpkmn\}\}/gi, 'Pokémon');
  s = s.replace(/\{\{(?:p|pkmn|m|ga|gh|si|sc|OBP|DL|wp)\|([^|}]*)(?:\|([^}]*))?\}\}/g,
    (_, a, b) => (b && !b.includes('=') ? b : a));
  s = s.replace(/\{\{type\|([^|}]*)\}\}/g, '$1-type');
  s = s.replace(/\{\{player\}\}/g, 'player');
  s = s.replace(/\{\{[^}]*\}\}/g, '');
  s = s.replace(/\[\[([^\]|]*)\|([^\]]*)\]\]/g, '$2');
  s = s.replace(/\[\[([^\]]*)\]\]/g, '$1');
  s = s.replace(/<ref[^>]*>[\s\S]*?<\/ref>/gi, '').replace(/<ref[^>]*\/>/gi, '');
  s = s.replace(/<[^>]+>/g, '');
  s = s.replace(/'{2,}/g, '');
  return s.replace(/\s+/g, ' ').trim() || null;
}

/**
 * Splits the first `{{... infobox ...}}` into its named parameters. Brace and
 * bracket depth are tracked so a `{{sup/7|PE}}` inside `mapdesc` or a
 * `[[link|text]]` inside `leader` does not end the parameter early.
 */
function parseInfobox(wikitext) {
  // Two template families in the wild: "{{Town infobox}}" / "{{Route infobox}}"
  // and "{{Infobox location}}". The empty-match branch covers the second.
  const start = wikitext.search(/\{\{\s*[^|}\n]*infobox/i);
  if (start === -1) return null;
  let depth = 0;
  let end = -1;
  for (let i = start; i < wikitext.length - 1; i++) {
    if (wikitext[i] === '{' && wikitext[i + 1] === '{') { depth++; i++; }
    else if (wikitext[i] === '}' && wikitext[i + 1] === '}') { depth--; i++; if (depth === 0) { end = i + 1; break; } }
  }
  if (end === -1) return null;
  const body = wikitext.slice(start + 2, end - 2);
  const parts = [];
  let buf = '';
  let brace = 0;
  let bracket = 0;
  for (let i = 0; i < body.length; i++) {
    const ch = body[i];
    if (ch === '{' && body[i + 1] === '{') { brace++; buf += '{{'; i++; continue; }
    if (ch === '}' && body[i + 1] === '}') { brace--; buf += '}}'; i++; continue; }
    if (ch === '[' && body[i + 1] === '[') { bracket++; buf += '[['; i++; continue; }
    if (ch === ']' && body[i + 1] === ']') { bracket--; buf += ']]'; i++; continue; }
    if (ch === '|' && brace === 0 && bracket === 0) { parts.push(buf); buf = ''; continue; }
    buf += ch;
  }
  parts.push(buf);
  const template = parts.shift().trim();
  const fields = {};
  for (const part of parts) {
    const eq = part.indexOf('=');
    if (eq === -1) continue;
    fields[part.slice(0, eq).trim().toLowerCase()] = part.slice(eq + 1).trim();
  }
  return { template, fields };
}

/**
 * The infobox template name is the most reliable statement of what a place is;
 * the title is the tiebreaker for the generic ones.
 */
const TYPE_KIND = {
  forest: 'forest', mountain: 'mountain', cave: 'cave', ocean: 'water', sea: 'water',
  lake: 'water', river: 'water', island: 'island', town: 'town', city: 'city',
  route: 'route', building: 'building', park: 'landmark', desert: 'landmark',
};

function inferKind(template, title, fields) {
  const declared = TYPE_KIND[(fields.type ?? '').trim().toLowerCase()];
  if (declared) return declared;
  const t = template.toLowerCase();
  if (t.startsWith('route infobox')) return 'route';
  if (t.startsWith('town infobox')) return /\bcity\b/i.test(title) ? 'city' : 'town';
  if (t.startsWith('cave infobox')) return 'cave';
  if (t.startsWith('forest infobox')) return 'forest';
  if (t.startsWith('island infobox')) return 'island';
  if (t.startsWith('building infobox') || t.startsWith('gym infobox')) return 'building';
  if (/\bcity\b/i.test(title)) return 'city';
  if (/\btown\b/i.test(title)) return 'town';
  if (/^(Sea )?Route \d|Route \d/i.test(title)) return 'route';
  if (/\b(cave|cavern|tunnel|mine|chamber)\b/i.test(title)) return 'cave';
  if (/\b(forest|woods|grove|jungle)\b/i.test(title)) return 'forest';
  if (/\b(island|isle|atoll|archipelago)\b/i.test(title)) return 'island';
  if (/\b(mt\.?|mount|peak|summit|highlands?)\b/i.test(title)) return 'mountain';
  if (/\b(lake|sea|bay|ocean|river|falls|lagoon|shore|beach|coast)\b/i.test(title)) return 'water';
  if (fields.gym) return 'city';
  return 'landmark';
}

// Numbered variants included: Mesagoza's infobox says `north2`/`west2` for its
// second neighbour on a side. `west2alt` and friends are display strings, and
// the \d*$ anchor keeps them out.
const NEIGHBOR_FIELD = /^(north|south|east|west|northeast|northwest|southeast|southwest)\d*$/;
const LEADER_FIELDS = ['leader', 'leader2', 'leader3', 'leader4', 'kahuna', 'captain', 'warden', 'professor'];

/** Adjacency words that make a lead sentence worth mining for [[links]]. */
const DIRECTION_PROSE = /\b(north|south|east|west|northeast|northwest|southeast|southwest|borders?|adjacent|connects?|next to|between)\b/i;

const REGION_NAMES = new Set(Object.values(REGION_TITLE));

/**
 * Hisui's `{{Infobox location}}` pages (and Paldea's provinces and paths)
 * carry no direction fields at all — their adjacency lives in the lead prose:
 * "located just to the east of the Beachside Camp and to the west of
 * [[Ginkgo Landing]]". Mine the lead's direction-flavoured sentences for link
 * targets; resolution at emit time drops anything that isn't a location.
 */
function proseNeighbors(wikitext, title) {
  const lead = wikitext.split(/\n==/, 1)[0];
  const out = [];
  for (const sentence of lead.split(/(?<=[.!?])\s+/)) {
    if (!DIRECTION_PROSE.test(sentence)) continue;
    for (const match of sentence.matchAll(/\[\[([^\]|#]+)/g)) {
      const target = match[1].trim();
      if (!target || target === title || REGION_NAMES.has(target)) continue;
      if (/^(File|Image|Category|Bulbapedia|wp):/i.test(target)) continue;
      if (!out.includes(target)) out.push(target);
      if (out.length >= 8) return out;
    }
  }
  return out;
}

function extractFields(title, wikitext, extract) {
  const box = parseInfobox(wikitext);
  const fields = box?.fields ?? {};
  const junk = (v) => (v && !/^(no|none|yes|tba)$/i.test(v) ? v : null);
  const description =
    junk(plain(fields.mapdesc, { firstVariant: true })) ??
    junk(plain(fields.slogan, { firstVariant: true })) ??
    firstSentences(extract);
  const neighbors = [];
  let hasDirectionFields = false;
  for (const [key, raw] of Object.entries(fields)) {
    const isDirection = NEIGHBOR_FIELD.test(key);
    if (!isDirection && key !== 'location') continue;
    if (isDirection) hasDirectionFields = true;
    // Link targets first: `location=West [[Cobalt Coastlands]]` must candidate
    // the link, because the plain text "West Cobalt Coastlands" resolves to
    // nothing. The plain split stays as a second set of candidates; emit-time
    // resolution drops whichever of the two doesn't name a location.
    for (const match of raw.matchAll(/\[\[([^\]|#]+)/g)) {
      const target = match[1].trim();
      if (target) neighbors.push(target);
    }
    const value = plain(raw);
    if (value) for (const part of value.split(/\s+and\s+|,\s*/)) if (part.trim()) neighbors.push(part.trim());
  }
  const notableTrainers = [];
  for (const key of LEADER_FIELDS) {
    const value = plain(fields[key]);
    if (value && !/^(none|n\/a|tba)$/i.test(value)) notableTrainers.push(value);
  }
  return {
    image: fields.image?.split('|')[0].trim() || null,
    description,
    kind: inferKind(box?.template ?? '', title, fields),
    neighbors: [...new Set(neighbors)],
    // Only pages without direction fields fall back to prose; on everything
    // else the infobox is both more precise and already complete.
    proseNeighbors: hasDirectionFields ? [] : proseNeighbors(wikitext, title),
    notableTrainers: [...new Set(notableTrainers)],
    // Worth surfacing beside the map rather than buried in the long list: a
    // Gym, or a resident worth naming. Settlements are added at emit time —
    // routes and caves outnumber them four to one, so without that the panel
    // would read Route 3, Route 4, Route 5.
    notable: Boolean(fields.gym) || notableTrainers.length > 0,
  };
}

/** Two sentences of the lead is a caption; the whole lead is an essay. */
function firstSentences(extract) {
  if (!extract) return null;
  const body = extract
    .replace(/^[^\n]*redirects here[^\n]*\n+/i, '')
    // Hatnotes survive extraction as the lead's first sentence — "If you were
    // looking for the area in Pokémon Picross, see…" opened Area Zero's blurb.
    .replace(/^\s*(?:(?:If you were looking for|For the|This article is about)[^.]*\.\s*)+/i, '')
    // Every wiki lead opens with the Japanese name in parentheses. It belongs
    // on the wiki, not in a one-line caption under a photograph.
    .replace(/\s*\((?:Japanese|Korean|Chinese):(?:[^()]|\([^)]*\))*\)/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  const sentences = body.match(/[^.!?]+[.!?]+/g);
  if (!sentences) return body.slice(0, 220) || null;
  let out = '';
  for (const s of sentences) {
    if (out && (out + s).length > 260) break;
    out += s;
    if (out.length > 120) break;
  }
  return out.trim() || null;
}

// ──────────────────────────────────────────────────────────────── the run ──

function loadCheckpoint() {
  if (!existsSync(CHECKPOINT)) return {};
  try { return JSON.parse(readFileSync(CHECKPOINT, 'utf8')); } catch { return {}; }
}
function saveCheckpoint(state) {
  mkdirSync(CACHE_DIR, { recursive: true });
  writeFileSync(`${CHECKPOINT}.tmp`, JSON.stringify(state, null, 0));
  renameSync(`${CHECKPOINT}.tmp`, CHECKPOINT);
}

const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47]);
const JPEG_MAGIC = Buffer.from([0xff, 0xd8, 0xff]);

/** Downloads a thumbnail and re-encodes it to WebP; returns the public/ path. */
function downloadImage(slug, url) {
  const target = `locations/${slug}.webp`;
  const dest = join(PUBLIC_DIR, target);
  if (existsSync(dest)) return target;
  mkdirSync(dirname(dest), { recursive: true });
  const download = `${dest}.download`;
  try {
    execFileSync('curl', ['-sfL', '--max-time', '60', '-A', UA, '-o', download, url], { stdio: 'pipe' });
    const head = readFileSync(download).subarray(0, 4);
    if (!(head.subarray(0, 4).equals(PNG_MAGIC) || head.subarray(0, 3).equals(JPEG_MAGIC)) || statSync(download).size < 512) {
      unlinkSync(download);
      throw new Error('not an image (Cloudflare challenge page?)');
    }
    execFileSync('cwebp', ['-quiet', '-q', '82', download, '-o', dest], { stdio: 'pipe' });
    unlinkSync(download);
    return target;
  } catch (err) {
    if (existsSync(download)) unlinkSync(download);
    console.error(`  ! image ${slug}: ${err.message}`);
    return null;
  }
}

async function main() {
  const names = new Map();
  for (const r of readCsv('location_names')) if (r.local_language_id === '9') names.set(r.location_id, r.name);
  const regions = new Map(readCsv('regions').map((r) => [r.id, r.identifier]));

  const locations = readCsv('locations')
    .map((r) => ({
      slug: r.identifier,
      regionName: regions.get(r.region_id) ?? null,
      displayName: names.get(r.id) ?? r.identifier,
    }))
    .filter((l) => (l.regionName || REGIONLESS_TITLES[l.slug]) && (!ONLY || (l.regionName && ONLY.has(l.regionName))));
  const regionless = readCsv('locations')
    .filter((r) => !r.region_id)
    .map((r) => ({ slug: r.identifier }));

  console.log(`${locations.length} locations to resolve (incl. ${Object.keys(REGIONLESS_TITLES).length} region-less articles).`);

  const state = loadCheckpoint();
  const pending = locations.filter((l) => !state[l.slug]);
  console.log(`${locations.length - pending.length} already in the checkpoint, ${pending.length} to fetch.\n`);

  // Wikitext in batches of 50 (the anonymous API cap), lead extracts in batches
  // of 20 (the cap when `exintro` is set). Titles collide across regions — two
  // slugs can share one page — so the response is keyed by title, not by slug.
  for (let i = 0; i < pending.length; i += 20) {
    const batch = pending.slice(i, i + 20);
    const byTitle = new Map();
    for (const loc of batch) {
      const title = bulbaTitle(loc.slug, loc.regionName, loc.displayName);
      if (!byTitle.has(title)) byTitle.set(title, []);
      byTitle.get(title).push(loc);
    }
    const titles = [...byTitle.keys()];
    let data;
    try {
      data = await apiGet({
        action: 'query',
        redirects: '1',
        prop: 'revisions|extracts',
        rvprop: 'content',
        rvslots: 'main',
        exintro: '1',
        explaintext: '1',
        titles: titles.join('|'),
      });
    } catch (err) {
      console.error(`  ! batch ${i}: ${err.message} — recorded as unresolved`);
      for (const loc of batch) state[loc.slug] = { title: bulbaTitle(loc.slug, loc.regionName, loc.displayName), missing: true };
      saveCheckpoint(state);
      continue;
    }

    // `redirects` and `normalized` rewrite titles on the way out; follow both
    // back so the response can be matched to the slug that asked for it.
    const rename = new Map();
    for (const n of data.query?.normalized ?? []) rename.set(n.from, n.to);
    for (const r of data.query?.redirects ?? []) rename.set(r.from, r.to);
    const resolve = (title) => { let t = title; for (let n = 0; n < 4 && rename.has(t); n++) t = rename.get(t); return t; };
    const pages = new Map((data.query?.pages ?? []).map((p) => [p.title, p]));

    for (const [title, locs] of byTitle) {
      const page = pages.get(resolve(title));
      for (const loc of locs) {
        if (!page || page.missing) {
          state[loc.slug] = { title, missing: true };
          continue;
        }
        state[loc.slug] = {
          title: page.title,
          wikitext: page.revisions?.[0]?.slots?.main?.content ?? '',
          extract: page.extract ?? null,
        };
      }
    }
    saveCheckpoint(state);
    const done = Math.min(i + 20, pending.length);
    console.log(`  ${done}/${pending.length} resolved`);
  }

  // ── image URLs ────────────────────────────────────────────────────────────
  // The infobox names a file; the archives API turns it into a sized thumbnail.
  // Parse every cached page now — cheap, and it means the emit below and the
  // image pass read one consistent view.
  const parsed = new Map();
  for (const loc of locations) {
    const entry = state[loc.slug];
    if (!entry || entry.missing) continue;
    parsed.set(loc.slug, extractFields(entry.title, entry.wikitext ?? '', entry.extract));
  }

  const wantFiles = [...new Set(
    locations
      .filter((l) => parsed.get(l.slug)?.image && !state[l.slug].imageUrl)
      .map((l) => parsed.get(l.slug).image),
  )];
  if (!VERIFY_ONLY && wantFiles.length) {
    console.log(`\nResolving ${wantFiles.length} image files.`);
    for (let i = 0; i < wantFiles.length; i += 40) {
      const batch = wantFiles.slice(i, i + 40);
      let data;
      try {
        data = await apiGet({
          action: 'query',
          prop: 'imageinfo',
          iiprop: 'url',
          iiurlwidth: String(THUMB_WIDTH),
          titles: batch.map((f) => `File:${f}`).join('|'),
        });
      } catch (err) {
        console.error(`  ! imageinfo batch ${i}: ${err.message}`);
        continue;
      }
      const url = new Map();
      for (const p of data.query?.pages ?? []) {
        const info = p.imageinfo?.[0];
        if (info) url.set(p.title.replace(/^File:/, ''), info.thumburl || info.url);
      }
      for (const loc of locations) {
        const file = parsed.get(loc.slug)?.image;
        if (file && url.has(file)) state[loc.slug].imageUrl = url.get(file);
      }
      saveCheckpoint(state);
      console.log(`  ${Math.min(i + 40, wantFiles.length)}/${wantFiles.length} image URLs`);
    }
  }

  // ── downloads ─────────────────────────────────────────────────────────────
  let downloaded = 0;
  if (!VERIFY_ONLY) {
    const toDownload = locations.filter((l) => state[l.slug]?.imageUrl && !state[l.slug]?.imagePath);
    console.log(`\nDownloading ${toDownload.length} images.`);
    for (const loc of toDownload) {
      const path = downloadImage(loc.slug, state[loc.slug].imageUrl);
      state[loc.slug].imagePath = path;
      if (path) downloaded++;
      if (downloaded % 25 === 0) saveCheckpoint(state);
    }
    saveCheckpoint(state);
  }

  // ── emit ──────────────────────────────────────────────────────────────────
  // Two indexes, because "Route 14" is a different place in eight regions.
  // The region-scoped one is consulted first; the global one only catches
  // genuine cross-region neighbours, like Kanto's Route 26 meeting Johto.
  const slugByTitle = new Map();
  const slugByRegionTitle = new Map();
  const key = (region, title) => `${region}\u0000${title}`;
  for (const loc of locations) {
    const entry = state[loc.slug];
    const display = loc.displayName.replace(/’/g, "'");
    for (const title of [entry?.title, display]) {
      if (!title) continue;
      if (!slugByTitle.has(title)) slugByTitle.set(title, loc.slug);
      if (!slugByRegionTitle.has(key(loc.regionName, title))) {
        slugByRegionTitle.set(key(loc.regionName, title), loc.slug);
      }
    }
  }

  const out = {};
  let withImage = 0;
  let withDescription = 0;
  const unresolved = [];
  for (const loc of locations) {
    const entry = parsed.get(loc.slug);
    if (!entry) { unresolved.push(loc.slug); continue; }
    const neighbors = [];
    // Infoboxes say "Route 3"; the page — and therefore the title — is
    // "Kanto Route 3". Look inside this location's own region before
    // falling back to the global index, or Lumiose City ends up bordering
    // Alola's Route 14.
    const resolveNeighbor = (name, regionOnly) => {
      const region = REGION_TITLE[loc.regionName];
      const slug =
        slugByRegionTitle.get(key(loc.regionName, name)) ??
        (region ? slugByRegionTitle.get(key(loc.regionName, `${region} ${name}`)) : undefined) ??
        (regionOnly
          ? undefined
          : (region ? slugByTitle.get(`${region} ${name}`) : undefined) ?? slugByTitle.get(name));
      if (slug && slug !== loc.slug && !neighbors.includes(slug)) neighbors.push(slug);
    };
    for (const name of entry.neighbors ?? []) resolveNeighbor(name, false);
    // Prose-derived candidates resolve region-scoped only, so a lead that
    // name-drops another region's landmark cannot cross the map.
    for (const name of entry.proseNeighbors ?? []) resolveNeighbor(name, true);
    const imagePath = state[loc.slug].imagePath ?? null;
    if (imagePath) withImage++;
    if (entry.description) withDescription++;
    out[loc.slug] = {
      image: imagePath,
      description: entry.description ?? null,
      // A region-less slug is a met-string (a trade, a giveaway, a person),
      // not a place — whatever infobox its article wears, it files as event,
      // and adjacency is meaningless for it (Cynthia's article has a
      // `location` field, but she borders nothing).
      kind: loc.regionName ? (entry.kind ?? null) : 'event',
      neighbors: loc.regionName ? neighbors : [],
      notableTrainers: entry.notableTrainers ?? [],
      notable: Boolean(entry.notable) || entry.kind === 'city' || entry.kind === 'town',
    };
  }

  // ── region-less met-strings ───────────────────────────────────────────────
  // Whatever the crawl didn't cover: year-suffixed families reuse their base
  // article's entry; everything else synthesizes a one-liner. No requests.
  let synthesized = 0;
  for (const { slug } of regionless) {
    if (out[slug]?.description) continue;
    const family = slug.match(REGIONLESS_FAMILY);
    const base = family ? out[slug.replace(/-\d+$/, '')] : null;
    const entry = base
      ? { ...base, neighbors: [], notableTrainers: [], notable: false }
      : synthesizedEntry(slug);
    if (!entry) continue;
    if (entry.image) withImage++;
    if (entry.description) withDescription++;
    out[slug] = entry;
    synthesized++;
  }
  if (synthesized) console.log(`  ${synthesized} region-less entries filled (family reuse + synthesized)`);

  const header = `/**
 * Generated by scripts/fetch-location-data.mjs — do not edit by hand.
 *
 * Bulbapedia's location infoboxes, flattened: artwork (self-hosted under the
 * web app's public/locations/), the map description, adjacency and the canon
 * residents worth a chip. \`seed-dex.ts\` merges \`LOCATION_META\` from
 * curated.ts ON TOP of this, so hand corrections and the map pins win.
 *
 * ${Object.keys(out).length} locations · ${withImage} with art · ${withDescription} with a description
 */
import type { LocationMetaSeed } from './curated';

export const GENERATED_LOCATION_META: Record<string, LocationMetaSeed> = `;
  mkdirSync(dirname(OUT_FILE), { recursive: true });
  writeFileSync(OUT_FILE, `${header}${JSON.stringify(out, null, 2)};\n`);

  console.log(`\n${Object.keys(out).length} locations written to data/locations.generated.ts`);
  console.log(`  ${withImage} with art, ${withDescription} with a description`);
  console.log(`  ${unresolved.length} unresolved on the wiki`);
  if (unresolved.length) console.log(`  ${unresolved.slice(0, 40).join(', ')}${unresolved.length > 40 ? ' …' : ''}`);
  const noImage = locations.filter((l) => state[l.slug] && !state[l.slug].missing && !state[l.slug].imagePath);
  if (noImage.length) {
    console.log(`  ${noImage.length} resolved but image-less: ${noImage.slice(0, 25).map((l) => l.slug).join(', ')}${noImage.length > 25 ? ' …' : ''}`);
  }
}

main().catch((err) => { console.error(err); process.exitCode = 1; });
