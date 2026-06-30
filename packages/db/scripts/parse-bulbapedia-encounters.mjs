/**
 * Parses wild-encounter tables out of the committed Bulbapedia checkpoint.
 *
 *   node scripts/parse-bulbapedia-encounters.mjs            (from packages/db)
 *   node scripts/parse-bulbapedia-encounters.mjs --stats    (report, write nothing)
 *
 * PokeAPI ships no encounter rows at all for Legends: Arceus, Scarlet/Violet
 * or Brilliant Diamond/Shining Pearl, so every Hisui and Paldea page — and
 * every Sinnoh page's BDSP era — reads "no wild encounters" while the games
 * plainly have them. The crawl checkpoint `.cache/bulbapedia-locations.json`
 * already holds each location's full wikitext, and the wiki's catch tables
 * are structured data in disguise:
 *
 *   {{Catch/entryla|041|Zubat|13-16|28-31||||✔|✔|type1=poison|nearby=yes}}
 *   {{Catch/entry9|0187|Hoppip|yes|yes|land=yes|2-8|60|all=60}}
 *   {{Catch/entrybdsp|041|Zubat|yes|yes|Cave|14|0%|10%|10%|type1=Poison}}
 *
 * One template family per game, and each region parses ONLY its own: the
 * Hisui lake pages share articles with their Sinnoh namesakes, so "all rows
 * on the page" would hand Legends: Arceus the Diamond-era tables and vice
 * versa. Output is `data/encounters.generated.ts`, appended by seed-dex.ts
 * after the PokeAPI rows: generated areas for Paldea (PokeAPI has none),
 * generated methods PokeAPI lacks, and the encounter rows themselves in the
 * seed's own aggregated shape. No network — everything reads the checkpoint
 * and the cached CSVs.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const CACHE_DIR = join(HERE, '..', '.cache');
const CHECKPOINT = join(CACHE_DIR, 'bulbapedia-locations.json');
const OUT_FILE = join(HERE, 'data', 'encounters.generated.ts');

const STATS_ONLY = process.argv.includes('--stats');

// ─────────────────────────────────────────────────────────────── csv input ──

/** Minimal RFC-4180 reader — same shape as fetch-location-data.mjs's. */
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

// ──────────────────────────────────────────────────── wikitext scanning ──

/**
 * Every {{Catch/...}} template on the page, in order, with positional and
 * named params split at depth 0 (rows nest {{tt|…}} and [[links]]) and the
 * section-heading chain in force where the template sits. The div/header
 * templates ride along as context markers for the entries that follow them.
 */
function scanTemplates(wikitext) {
  // Heading positions first: level (== count) and text, document order.
  const headings = [];
  const headingRe = /^(={2,6})([^=\n]+)\1\s*$/gm;
  let hm;
  while ((hm = headingRe.exec(wikitext)) !== null) {
    headings.push({ pos: hm.index, level: hm[1].length, text: hm[2].trim() });
  }
  const sectionAt = (pos) => {
    const chain = [];
    for (const h of headings) {
      if (h.pos > pos) break;
      while (chain.length && chain[chain.length - 1].level >= h.level) chain.pop();
      chain.push(h);
    }
    return chain.map((h) => h.text);
  };

  const out = [];
  const openRe = /\{\{\s*[Cc]atch\//g;
  let m;
  while ((m = openRe.exec(wikitext)) !== null) {
    const start = m.index;
    let depth = 0;
    let end = -1;
    for (let i = start; i < wikitext.length - 1; i++) {
      if (wikitext[i] === '{' && wikitext[i + 1] === '{') { depth++; i++; }
      else if (wikitext[i] === '}' && wikitext[i + 1] === '}') { depth--; i++; if (depth === 0) { end = i + 1; break; } }
    }
    if (end === -1) break;
    const body = wikitext.slice(start + 2, end - 2);
    openRe.lastIndex = end;

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
    const name = parts.shift().trim().toLowerCase();
    const positional = [];
    const named = {};
    for (const part of parts) {
      const eq = part.indexOf('=');
      // "13-16<br>24-27" is positional; "type1=poison" is named. A "=" inside
      // nested braces was kept whole above, so a plain indexOf is enough as
      // long as the key looks like a key.
      const key = eq === -1 ? null : part.slice(0, eq).trim().toLowerCase();
      if (key && /^[a-z][a-z0-9]*$/.test(key)) named[key] = part.slice(eq + 1).trim();
      else positional.push(part.trim());
    }
    out.push({ name, positional, named, sections: sectionAt(start) });
  }
  return out;
}

/** "{{color2|000|Alpha Pokémon|Fixed Alpha}}" → "Fixed Alpha"; plain text passes through. */
function plainLabel(value) {
  if (!value) return '';
  let v = value;
  const inner = /\{\{[^{}]*\}\}/;
  while (inner.test(v)) v = v.replace(inner, (t) => t.slice(2, -2).split('|').pop());
  return v.replace(/\[\[(?:[^\]|]*\|)?([^\]]*)\]\]/g, '$1').trim();
}

/** "13-16<br>24-27" → [13, 27]; "14" → [14, 14]; garbage → null. */
function levelRange(value) {
  if (!value) return null;
  const nums = plainLabel(value).split(/<br\s*\/?\s*>/i).flatMap((part) => {
    const m = part.match(/(\d+)\s*[-–]\s*(\d+)|(\d+)/);
    if (!m) return [];
    return m[3] ? [Number(m[3])] : [Number(m[1]), Number(m[2])];
  });
  if (nums.length === 0) return null;
  return [Math.min(...nums), Math.max(...nums)];
}

const yes = (v) => /^(yes|✔)/i.test((v ?? '').trim());

// ─────────────────────────────────────────────────────── form resolution ──

/**
 * Bulbapedia's form= values, normalized, onto PokeAPI identifier suffixes.
 * Cosmetic-only values (colours, seasons, patterns) resolve to the default
 * form by falling through; anything else unmapped is counted and reported.
 */
const FORM_SUFFIX = new Map(Object.entries({
  'hisuian form': '-hisui',
  'alolan form': '-alola',
  'galarian form': '-galar',
  'paldean form': '-paldea',
  'combat breed': '-paldea-combat-breed',
  'blaze breed': '-paldea-blaze-breed',
  'aqua breed': '-paldea-aqua-breed',
  'plant cloak': '-plant',
  'sandy cloak': '-sandy',
  'trash cloak': '-trash',
  'red-striped form': '-red-striped',
  'blue-striped form': '-blue-striped',
  'white-striped form': '-white-striped',
  'midday form': '-midday',
  'midnight form': '-midnight',
  'dusk form': '-dusk',
  male: '-male',
  female: '-female',
  'roaming form': '-roaming',
  'east sea': '-east',
  'west sea': '-west',
  'altered forme': '',
  'origin forme': '-origin',
  'incarnate forme': '-incarnate',
  'chest form': '',
  'standard mode': '',
  'family of three': '-family-of-three',
  'family of four': '',
  'red-striped': '-red-striped',
  'blue-striped': '-blue-striped',
  'white-striped': '-white-striped',
  'own tempo': '-own-tempo',
  'pom-pom style': '-pom-pom',
  'baile style': '',
  'blue plumage': '-blue-plumage',
  'yellow plumage': '-yellow-plumage',
  'white plumage': '-white-plumage',
  'green plumage': '',
  johtonian: '',
  kantonian: '',
  'former titan': '',
  'phony form': '',
  'antique form': '-antique',
  standard: '',
  'low key form': '-low-key',
  'amped form': '',
  'sensu style': '-sensu',
  "pa'u style": '-pau',
  'red core': '-red',
  'orange core': '-orange',
  'yellow core': '-yellow',
  'green core': '-green',
  'blue core': '-blue',
  'indigo core': '-indigo',
  'violet core': '-violet',
  'curly form': '',
  'droopy form': '',
  'stretchy form': '',
  'two-segment form': '',
  'counterfeit form': '',
  'artisan form': '',
}));
const COSMETIC_FORM = /spring|summer|autumn|winter|red flower|orange flower|yellow flower|blue flower|white flower|.* pattern|.* trim|shiny|spiky-eared|normal form/;

// ───────────────────────────────────────────────────────────────── main ──

function main() {
  const checkpoint = JSON.parse(readFileSync(CHECKPOINT, 'utf8'));
  const csvRegions = readCsv('regions');
  const csvLocations = readCsv('locations');
  const csvAreas = readCsv('location_areas');
  const csvMethods = readCsv('encounter_methods');
  const csvPokemon = readCsv('pokemon');

  const regionIdByName = new Map(csvRegions.map((r) => [r.identifier, Number(r.id)]));
  const locationsByRegion = (name) =>
    csvLocations.filter((l) => Number(l.region_id) === regionIdByName.get(name));
  const areasByLocation = new Map();
  for (const a of csvAreas) {
    const list = areasByLocation.get(Number(a.location_id)) ?? [];
    list.push({ id: Number(a.id), identifier: a.identifier ?? '' });
    areasByLocation.set(Number(a.location_id), list);
  }
  const methodIdByName = new Map(csvMethods.map((m) => [m.identifier, Number(m.id)]));

  // ndex → candidate pokemon rows, default first.
  const bySpecies = new Map();
  for (const p of csvPokemon) {
    const sid = Number(p.species_id);
    const list = bySpecies.get(sid) ?? [];
    list.push({ id: Number(p.id), identifier: p.identifier, isDefault: p.is_default === '1' });
    bySpecies.set(sid, list);
  }
  const stats = {
    pages: {}, rows: {}, skipped: {},
    unknownForms: new Map(), unknownMethods: new Map(), areaFallbacks: 0,
  };
  const skip = (game, reason) => {
    stats.skipped[game] = stats.skipped[game] ?? new Map();
    stats.skipped[game].set(reason, (stats.skipped[game].get(reason) ?? 0) + 1);
  };

  function resolvePokemon(game, ndex, formValue) {
    const speciesId = Number.parseInt(ndex, 10);
    const candidates = bySpecies.get(speciesId);
    if (!candidates) return null;
    const fallback = candidates.find((c) => c.isDefault) ?? candidates[0];
    const form = plainLabel(formValue ?? '')
      .replace(/&#8209;|\u2011/g, '-')
      .replace(/[\u00a0]|&nbsp;/g, ' ')
      .replace(/\s*\([^)]*\)\s*/g, ' ')
      .toLowerCase()
      .trim();
    if (!form) return fallback;
    for (const [label, suffix] of FORM_SUFFIX) {
      if (form.includes(label)) {
        if (suffix === '') return fallback;
        const hit = candidates.find((c) => c.identifier === fallback.identifier.replace(/-normal$/, '') + suffix)
          ?? candidates.find((c) => c.identifier.endsWith(suffix));
        // A label we know whose variety PokeAPI doesn't split (Shellos seas)
        // is cosmetic upstream — the default form is the right row.
        return hit ?? fallback;
      }
    }
    if (COSMETIC_FORM.test(form)) return fallback;
    stats.unknownForms.set(form, (stats.unknownForms.get(form) ?? 0) + 1);
    return fallback;
  }

  // Methods PokeAPI lacks, allocated above its range only when actually used.
  const generatedMethods = new Map(); // identifier → {id, name, sortOrder}
  let nextMethodId = 101;
  function methodId(identifier) {
    const known = methodIdByName.get(identifier);
    if (known !== undefined) return known;
    let gen = generatedMethods.get(identifier);
    if (!gen) {
      gen = { id: nextMethodId, name: identifier, sortOrder: nextMethodId };
      nextMethodId += 1;
      generatedMethods.set(identifier, gen);
    }
    return gen.id;
  }

  const encounters = []; // {locationAreaId, pokemonId, methodId, rarity, minLevel, maxLevel, conditions, versions}
  const generatedAreas = [];
  const perRegionCounts = {};

  function addRow(game, areaId, pokemon, method, rarity, levels, conditions, versions) {
    encounters.push({
      locationAreaId: areaId,
      pokemonId: pokemon.id,
      methodId: methodId(method),
      rarity,
      minLevel: levels[0],
      maxLevel: levels[1],
      conditions: [...new Set(conditions)].sort(),
      versions,
    });
    perRegionCounts[game] = (perRegionCounts[game] ?? 0) + 1;
  }

  // ── Hisui: {{Catch/entryla}} — cols 5-8 are morning/day/evening/night
  //    ticks (all= spans them), col 9 spans every weather; catch/div labels
  //    ("Water", "Shaking trees", "Mass Outbreak"…) qualify what follows. ──
  for (const loc of locationsByRegion('hisui')) {
    const entry = checkpoint[loc.identifier];
    const wikitext = entry?.wikitext;
    if (!wikitext) { skip('hisui', 'no page'); continue; }
    const templates = scanTemplates(wikitext).filter((t) => t.name !== 'catch/footer' && t.name !== 'catch/footer/la');
    const rows = templates.filter((t) => t.name === 'catch/entryla');
    stats.pages.hisui = (stats.pages.hisui ?? 0) + 1;
    if (rows.length === 0) { skip('hisui', 'no entryla table'); continue; }
    const areas = areasByLocation.get(Number(loc.id)) ?? [];
    if (areas.length === 0) { skip('hisui', 'no PokeAPI area'); continue; }
    const areaId = areas[0].id;

    let divLabel = '';
    for (const t of templates) {
      if (t.name === 'catch/div') { divLabel = plainLabel(t.positional[1] ?? '').toLowerCase(); continue; }
      if (t.name !== 'catch/entryla') continue;
      const [ndex, name, levelsRaw, alphaLevelsRaw] = t.positional;
      // Fixed Alpha rows leave the normal-level column empty and put the
      // level in the alpha column.
      let levels = levelRange(levelsRaw);
      let fixedAlpha = false;
      if (!levels) {
        levels = levelRange(alphaLevelsRaw);
        fixedAlpha = levels !== null;
      }
      if (!levels) { skip('hisui', 'bad levels'); continue; }
      const pokemon = resolvePokemon('hisui', ndex, t.named.form);
      if (!pokemon) { skip('hisui', `unknown ndex ${ndex} (${name})`); continue; }

      const conditions = [];
      let method = 'overworld';
      if (divLabel.includes('water')) method = 'surf';
      else if (divLabel.includes('tree') || divLabel.includes('ore')) conditions.push('shaking-trees');
      else if (divLabel.includes('air') || divLabel.includes('flying')) conditions.push('in-the-air');
      else if (divLabel.includes('outbreak')) conditions.push('mass-outbreak');
      else if (divLabel.includes('alpha')) conditions.push('alpha');
      else if (divLabel.includes('unown')) conditions.push('unown-notes');

      if (!yes(t.named.all)) {
        const ticks = [4, 5, 6, 7].map((i) => yes(t.positional[i]));
        const labels = ['time-morning', 'time-day', 'time-evening', 'time-night'];
        const named = ['morning', 'day', 'evening', 'night'].map((k) => yes(t.named[k]));
        const active = labels.filter((_, i) => ticks[i] || named[i]);
        if (active.length > 0 && active.length < 4) conditions.push(...active);
      }
      for (const weather of ['sun', 'cloudy', 'rain', 'thunderstorm', 'snow', 'blizzard', 'fog']) {
        if (yes(t.named[weather])) conditions.push(`weather-${weather}`);
      }
      if (yes(t.named.nearby)) conditions.push('nearby');
      if (yes(t.named.alpha) || fixedAlpha) conditions.push('alpha');

      addRow('hisui', areaId, pokemon, method, 0, levels, conditions, ['legends-arceus']);
    }
  }

  // ── Paldea: {{Catch/entry9}} — |ndex|name|Sc|V|levels|rate| plus habitat
  //    flags; {{Catch/div/9|CODE}} biome headers become conditions. PokeAPI
  //    has no Paldea areas at all, so each location gets one generated. ──
  const DIV9 = {
    P: 'prairie', Fo: 'forest', T: 'town', D: 'desert', Mo: 'mountain', Sn: 'snowfield',
    Sw: 'swamp', L: 'lake', Ri: 'riverside', Oc: 'ocean', U: 'underground', Ro: 'rocky-area',
    Ca: 'cave', Be: 'beach', Fl: 'flowers', Ba: 'bamboo-forest', W: 'wasteland', V: 'volcano',
    Mi: 'mine', Ol: 'olive-grove', Ru: 'ruins', Cw: 'cave-water', Cs: 'chargestone',
  };
  for (const loc of locationsByRegion('paldea')) {
    const entry = checkpoint[loc.identifier];
    const wikitext = entry?.wikitext;
    if (!wikitext) { skip('paldea', 'no page'); continue; }
    const templates = scanTemplates(wikitext);
    const rows = templates.filter((t) => t.name === 'catch/entry9' || t.name === 'catch/entry9/special');
    stats.pages.paldea = (stats.pages.paldea ?? 0) + 1;
    if (rows.length === 0) { skip('paldea', 'no entry9 table'); continue; }

    const areaId = 20000 + Number(loc.id);
    generatedAreas.push({
      id: areaId,
      locationId: Number(loc.id),
      name: `${loc.identifier}-main`,
      displayName: entry.title ?? loc.identifier,
    });

    let biome = '';
    for (const t of templates) {
      if (t.name === 'catch/div/9') { biome = DIV9[t.positional[0]] ?? (t.positional[0] ?? '').toLowerCase(); continue; }
      if (t.name === 'catch/entry9') {
        const [ndex, name, scFlag, vFlag, levelsRaw, rateRaw] = t.positional;
        const levels = levelRange(levelsRaw);
        if (!levels) { skip('paldea', 'bad levels'); continue; }
        const pokemon = resolvePokemon('paldea', ndex, t.named.form);
        if (!pokemon) { skip('paldea', `unknown ndex ${ndex} (${name})`); continue; }
        const versions = [scFlag, vFlag].map((f, i) => (yes(f) ? ['scarlet', 'violet'][i] : null)).filter(Boolean);
        if (versions.length === 0) { skip('paldea', 'in neither version'); continue; }

        const conditions = [];
        if (biome) conditions.push(`biome-${biome}`);
        let method = 'overworld';
        if (yes(t.named.watersurface) || yes(t.named.underwater)) method = 'surf';
        if (yes(t.named.sky)) conditions.push('in-the-air');
        const times = ['morning', 'day', 'evening', 'night'].filter((k) => yes(t.named[k]));
        if (times.length > 0 && times.length < 4) conditions.push(...times.map((k) => `time-${k}`));
        if (yes(t.named.levelscaled)) conditions.push('level-scaled');

        const rarity = Number.parseInt(plainLabel(t.named.all ?? rateRaw ?? ''), 10) || 0;
        addRow('paldea', areaId, pokemon, method, rarity, levels, conditions, versions);
      } else if (t.name === 'catch/entry9/special') {
        // |ndex|name|Sc|V|where in the world|level|note — fixed overworld
        // spawns (Gimmighoul chests, tree Pachirisu). form= rides along.
        const [ndex, name, scFlag, vFlag, , levelRaw] = t.positional;
        const levels = levelRange(levelRaw);
        if (!levels) { skip('paldea', 'special: bad level'); continue; }
        const pokemon = resolvePokemon('paldea', ndex, t.named.form);
        if (!pokemon) { skip('paldea', `unknown ndex ${ndex} (${name})`); continue; }
        const versions = [scFlag, vFlag].map((f, i) => (yes(f) ? ['scarlet', 'violet'][i] : null)).filter(Boolean);
        if (versions.length === 0) { skip('paldea', 'in neither version'); continue; }
        addRow('paldea', areaId, pokemon, 'overworld', 0, levels, ['static'], versions);
      }
    }
  }

  // ── BDSP: {{Catch/entrybdsp}} on the Sinnoh pages' Generation VIII
  //    sections — |ndex|name|BD|SP|Method|levels| then all=NN% or three
  //    positional morning/day/night rates. Floor headings pick the area. ──
  const BDSP_METHODS = new Map(Object.entries({
    grass: { method: 'walk' },
    cave: { method: 'walk' },
    surfing: { method: 'surf' },
    'old rod': { method: 'old-rod' },
    'good rod': { method: 'good-rod' },
    'super rod': { method: 'super-rod' },
    'honey tree': { method: 'honey-tree' },
    'sweet honey tree': { method: 'honey-tree' },
    swarm: { method: 'walk', condition: 'swarm' },
    'poké radar': { method: 'walk', condition: 'poke-radar' },
    'poke radar': { method: 'walk', condition: 'poke-radar' },
    radar: { method: 'walk', condition: 'poke-radar' },
    'grand underground': { method: 'grand-underground' },
    underground: { method: 'grand-underground' },
    'trophy garden': { method: 'walk', condition: 'daily' },
    surf: { method: 'surf' },
    'fish old': { method: 'old-rod' },
    'fish good': { method: 'good-rod' },
    'fish super': { method: 'super-rod' },
    backlot: { method: 'walk', condition: 'daily' },
  }));
  // Some pages put the place in the method column instead — tower floors,
  // "Building" — which is just walking; the label doubles as the area hint.
  const FLOOR_METHOD = /^(b?\d+f|building|summit|top|entrance)$/i;
  const NON_WILD = new Set(['egg', 'gift', 'trade', 'fossil', 'starter']);
  const STOP_TOKENS = new Set(['the', 'of', 'and', 'a', 'to', 'from', 'side', 'room', 'city', 'town']);
  const tokens = (s) => plainLabel(s).toLowerCase().replace(/[^a-z0-9]+/g, ' ').split(' ').filter((t) => t && !STOP_TOKENS.has(t));

  for (const loc of locationsByRegion('sinnoh')) {
    const entry = checkpoint[loc.identifier];
    const wikitext = entry?.wikitext;
    if (!wikitext) continue;
    const rows = scanTemplates(wikitext).filter((t) => t.name === 'catch/entrybdsp');
    if (rows.length === 0) continue;
    stats.pages.bdsp = (stats.pages.bdsp ?? 0) + 1;
    const areas = areasByLocation.get(Number(loc.id)) ?? [];
    if (areas.length === 0) { skip('bdsp', 'no PokeAPI area'); continue; }
    const areaTokens = areas.map((a) => ({ id: a.id, tokens: new Set(tokens(a.identifier.replace(loc.identifier, ''))) }));

    for (const t of rows) {
      const [ndex, name, bdFlag, spFlag, methodRaw, levelsRaw, r1, r2, r3] = t.positional;
      const levels = levelRange(levelsRaw);
      if (!levels) { skip('bdsp', 'bad levels'); continue; }
      const pokemon = resolvePokemon('bdsp', ndex, t.named.form);
      if (!pokemon) { skip('bdsp', `unknown ndex ${ndex} (${name})`); continue; }
      const versions = [bdFlag, spFlag]
        .map((f, i) => (yes(f) ? ['brilliant-diamond', 'shining-pearl'][i] : null))
        .filter(Boolean);
      if (versions.length === 0) { skip('bdsp', 'in neither version'); continue; }

      const methodLabel = plainLabel(methodRaw ?? '').toLowerCase().trim();
      if (NON_WILD.has(methodLabel)) { skip('bdsp', 'non-wild row'); continue; }
      const isFloor = FLOOR_METHOD.test(methodLabel);
      const mapped = isFloor ? { method: 'walk' } : BDSP_METHODS.get(methodLabel);
      if (!mapped) {
        stats.unknownMethods.set(methodLabel || '(empty)', (stats.unknownMethods.get(methodLabel || '(empty)') ?? 0) + 1);
        continue;
      }

      // Pick the area by the deepest floor heading (or the floor sitting in
      // the method column), or fall back to the first.
      let areaId = areas[0].id;
      if (areas.length > 1) {
        const heading = isFloor ? methodLabel : (t.sections[t.sections.length - 1] ?? '');
        const headingTokens = tokens(heading);
        let best = null;
        for (const a of areaTokens) {
          const score = headingTokens.filter((tok) => a.tokens.has(tok)).length;
          if (score > 0 && (!best || score > best.score)) best = { id: a.id, score };
        }
        if (best) areaId = best.id;
        else stats.areaFallbacks += 1;
      }

      const pct = (v) => Number.parseInt(plainLabel(v ?? ''), 10) || 0;
      const baseConditions = mapped.condition ? [mapped.condition] : [];
      if (t.named.all !== undefined || (r2 === undefined && r3 === undefined)) {
        const rarity = pct(t.named.all ?? r1);
        addRow('bdsp', areaId, pokemon, mapped.method, rarity, levels, baseConditions, versions);
      } else {
        // Distinct per-time rates: one row per time that actually occurs.
        const byTime = [['time-morning', pct(r1)], ['time-day', pct(r2)], ['time-night', pct(r3)]];
        const rates = new Set(byTime.map(([, r]) => r));
        if (rates.size === 1) {
          if (pct(r1) > 0) addRow('bdsp', areaId, pokemon, mapped.method, pct(r1), levels, baseConditions, versions);
          else skip('bdsp', 'all-zero rates');
        } else {
          for (const [condition, rarity] of byTime) {
            if (rarity > 0) addRow('bdsp', areaId, pokemon, mapped.method, rarity, levels, [...baseConditions, condition], versions);
          }
        }
      }
    }
  }

  // ── dedupe/merge on the seed's own aggregation key, merging versions ──
  const merged = new Map();
  for (const e of encounters) {
    const key = [e.locationAreaId, e.pokemonId, e.methodId, e.rarity, e.minLevel, e.maxLevel, e.conditions.join('|')].join(':');
    const existing = merged.get(key);
    if (existing) for (const v of e.versions) { if (!existing.versions.includes(v)) existing.versions.push(v); }
    else merged.set(key, e);
  }
  const finalRows = [...merged.values()].map((e) => ({ ...e, versions: e.versions.sort() }));

  // ── report ──
  console.log('pages parsed:', stats.pages);
  console.log('rows emitted:', perRegionCounts, `→ ${finalRows.length} after merging versions`);
  console.log('generated areas (paldea):', generatedAreas.length);
  console.log('generated methods:', [...generatedMethods.keys()].join(', ') || '(none)');
  for (const [game, reasons] of Object.entries(stats.skipped)) {
    console.log(`skipped in ${game}:`, Object.fromEntries(reasons));
  }
  if (stats.unknownForms.size) console.log('forms resolved to default:', Object.fromEntries(stats.unknownForms));
  if (stats.unknownMethods.size) console.log('UNKNOWN BDSP methods (rows dropped):', Object.fromEntries(stats.unknownMethods));
  if (stats.areaFallbacks) console.log(`bdsp floor headings unmatched (first area used): ${stats.areaFallbacks}`);

  if (STATS_ONLY) return;

  const header = `/**
 * Generated by scripts/parse-bulbapedia-encounters.mjs — do not edit by hand.
 *
 * Wild encounters for the games PokeAPI has none for, parsed from the
 * Bulbapedia checkpoint's catch tables: Legends: Arceus (Hisui),
 * Scarlet/Violet (Paldea, incl. Kitakami and Blueberry), and Brilliant
 * Diamond/Shining Pearl on the Sinnoh pages. \`seed-dex.ts\` appends these
 * after the PokeAPI rows. Paldea has no upstream location_areas, so each of
 * its locations gets one generated area at id 20000 + locationId; methods
 * PokeAPI lacks are allocated from id 101. A rarity of 0 means the wiki
 * publishes no rate (all of Legends: Arceus) and renders as "unknown".
 */
`;
  const body =
    `export const GENERATED_LOCATION_AREAS: Array<{ id: number; locationId: number; name: string; displayName: string }> = ${JSON.stringify(generatedAreas, null, 2)};\n\n` +
    `export const GENERATED_ENCOUNTER_METHODS: Array<{ id: number; name: string; sortOrder: number | null }> = ${JSON.stringify([...generatedMethods.values()], null, 2)};\n\n` +
    `export const GENERATED_ENCOUNTERS: Array<{ locationAreaId: number; pokemonId: number; methodId: number; rarity: number; minLevel: number; maxLevel: number; conditions: string[]; versions: string[] }> = ${JSON.stringify(finalRows)};\n`;
  mkdirSync(dirname(OUT_FILE), { recursive: true });
  writeFileSync(OUT_FILE, header + body);
  console.log(`\nwritten to data/encounters.generated.ts`);
}

main();
