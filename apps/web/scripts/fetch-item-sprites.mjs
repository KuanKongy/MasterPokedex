/**
 * Self-hosts item art and backfills item text from Bulbapedia and PokémonDB.
 *
 *   node scripts/fetch-item-sprites.mjs           (from apps/web)
 *   node scripts/fetch-item-sprites.mjs --verify  (report coverage, download nothing)
 *
 * `dex.items.sprite` is a GENERATED column that builds a PokeAPI sprite URL out
 * of the identifier without ever checking one exists. That repo carries 898
 * item images; the dex has 2,221 items. The vendored pokesprite map picked up
 * a few hundred more and everything else fell through to a grey package icon —
 * most of Gen 8 and 9, every Legends: Arceus crafting material, the Z-A stones.
 *
 * Two sources close it:
 *   · Bulbapedia's "List of items by name" — 1,581 rows, each with a bag icon,
 *     a generation and an effect sentence. The most complete of the two.
 *   · PokémonDB's /item/all — slugs that already match PokeAPI identifiers,
 *     used to confirm matches and as a second effect source.
 *
 * Only items PokeAPI's sprite repo is missing get downloaded, so the items that
 * already render keep the game-icon look they have today and the repo grows by
 * the minimum. Art lands in public/items/<identifier>.png and the map of what
 * resolved goes to src/data/item-sprites.json, which ItemSprite reads.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, statSync, unlinkSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const WEB_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CACHE_DIR = join(WEB_ROOT, '..', '..', 'packages', 'db', '.cache');
const PUBLIC_DIR = join(WEB_ROOT, 'public');
const SPRITE_MAP = join(WEB_ROOT, 'src', 'data', 'item-sprites.json');
const EFFECTS_OUT = join(WEB_ROOT, '..', '..', 'packages', 'db', 'scripts', 'data', 'item-effects.generated.ts');

const UA = 'MasterPokedex/1.0 (https://github.com/KuanKongy/MasterPokedex; khanhpronam@gmail.com)';
const VERIFY_ONLY = process.argv.includes('--verify');
const ICON_WIDTH = 64;
const POKEMON_SPRITES = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon';

// ───────────────────────────────────────────────────────────────── helpers ──

function readCsv(name) {
  const text = readFileSync(join(CACHE_DIR, `${name}.csv`), 'utf8');
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;
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
}

function get(url, { json = false } = {}) {
  const out = execFileSync('curl', ['-sfL', '--compressed', '--max-time', '90', '-A', UA, url], {
    maxBuffer: 64 * 1024 * 1024,
  }).toString('utf8');
  return json ? JSON.parse(out) : out;
}

const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', '#39': "'", nbsp: ' ', eacute: 'é', '#160': ' ' };
const unescape = (s) => s.replace(/&(#?\w+);/g, (m, e) => ENTITIES[e] ?? m);
const stripTags = (s) => unescape(s.replace(/<[^>]+>/g, '')).replace(/\s+/g, ' ').trim();

/**
 * Item names → PokeAPI-style identifiers. Upstream identifiers are ASCII,
 * lowercase, hyphenated, with accents folded and possessives dropped, so the
 * same transform applied to a wiki title lands on the same string ~95% of the
 * time.
 */
function slugify(name) {
  return name
    .toLowerCase()
    .replace(/é/g, 'e')
    .replace(/[’'’]/g, '')
    .replace(/[.,:]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Identifier variants worth trying against a source's keys. The `--suffix`
 * forms are upstream's way of separating a key item's per-game copies
 * (`basement-key--goldenrod`) and its bag/held Z-Crystal pairs; both point at
 * one real object with one icon.
 */
function variants(identifier) {
  const out = new Set([identifier]);
  const base = identifier.replace(/--.*$/, '');
  out.add(base);
  out.add(base.replace(/^(bike|bicycle)-.*/, 'bicycle'));
  return [...out];
}

/**
 * Rows that are 300 copies of one object. `dynamax-crystal-aql7235` and its
 * 299 siblings are Max Lair encounter tokens; the games draw one crystal.
 * Resolving the family once and pointing every member at that file is the
 * difference between 300 identical PNGs and one.
 */
const FAMILIES = [
  { test: /^dynamax-crystal-/, key: 'dynamax-crystal', lookup: 'dynamax-crystal' },
  { test: /^data-card-\d+$/, key: 'data-card', lookup: 'data-card' },
];

function familyOf(identifier) {
  return FAMILIES.find((f) => f.test.test(identifier)) ?? null;
}

/**
 * Numbered machines. Neither source lists them individually — both draw one
 * disc per type — and ItemSprite already routes them to pokesprite's generic
 * TM/HM art, so self-hosting 200 identical discs would buy nothing.
 */
const MACHINE = /^(tm|tr|hm)\d+$/;

/**
 * Legends: Arceus crafting materials — "Aipom Hair", "Magnemite Screw",
 * "Klefki Key". No free sprite repository has art for any of them, but each is
 * named after the Pokémon it came off, and *that* art exists. Showing the
 * species reads correctly and is what the reference dexes do.
 *
 * Detected by the name rather than by a list of nouns — the suffixes run from
 * "fur" to "eyelash" to "bauble" and enumerating them is a losing game. The
 * longest matching species prefix wins so two-word species survive.
 */
function materialSpecies(identifier, speciesId) {
  const parts = identifier.split('-');
  for (let k = parts.length - 1; k >= 1; k--) {
    const id = speciesId.get(parts.slice(0, k).join('-'));
    if (id) return id;
  }
  return null;
}

// ─────────────────────────────────────────────────────────────── sources ───

/** Bulbapedia's list: one row per item, `<td>icon</td><td>name</td><td>gen</td><td>effect</td>`. */
function bulbapediaItems() {
  const html = get('https://bulbapedia.bulbagarden.net/wiki/List_of_items_by_name');
  const rows = [...html.matchAll(/<tr style="background:#fff">\s*<td>([\s\S]*?)<\/td>\s*<td>([\s\S]*?)<\/td>\s*<td[^>]*>([\s\S]*?)<\/td>\s*<td>([\s\S]*?)<\/td>/g)];
  const out = new Map();
  for (const [, iconCell, nameCell, , effectCell] of rows) {
    const name = stripTags(nameCell);
    const src = /src="([^"]+)"/.exec(iconCell)?.[1];
    if (!name || !src) continue;
    // Thumbnails carry their width in the path, so asking for a bigger one is
    // a string edit — but MediaWiki refuses to upscale, and most bag icons are
    // 32px originals. Above the source width, take the original file instead.
    const native = Number(/data-file-width="(\d+)"/.exec(iconCell)?.[1] ?? 0);
    const icon =
      native && native <= ICON_WIDTH
        ? src.replace('/media/upload/thumb/', '/media/upload/').replace(/\/\d+px-[^/]+$/, '')
        : src.replace(/\/(\d+)px-/, `/${ICON_WIDTH}px-`);
    const effect = stripTags(effectCell).replace(/\*$/, '');
    const entry = { name, icon, effect: effect || null };
    // Index under the visible text *and* the linked page, because some rows
    // are pluralised ("Dynamax Crystals" → Dynamax_Crystal) or point at a
    // section of a shared article ("Abra Candy" → Candy#Abra_Candy).
    const link = /href="\/wiki\/([^"#]+)(?:#([^"]+))?"/.exec(nameCell);
    const keys = [slugify(name)];
    if (link) {
      keys.push(slugify(decodeURIComponent(link[2] ?? link[1]).replace(/_/g, ' ')));
      keys.push(slugify(decodeURIComponent(link[1]).replace(/_/g, ' ')));
    }
    for (const key of keys) if (key && !out.has(key)) out.set(key, entry);
  }
  return out;
}

/** PokémonDB's catalogue: slugs that already match PokeAPI's, plus effect text. */
function pokemondbItems() {
  const html = get('https://pokemondb.net/item/all');
  const rows = [...html.matchAll(
    /<img class="img-fixed icon-item-img" src="([^"]+)"[^>]*>\s*<a class="ent-name" href="\/item\/([^"]+)">([^<]+)<\/a>[\s\S]*?<td class="cell-long-text">([\s\S]*?)<\/td>/g,
  )];
  const out = new Map();
  for (const [, src, slug, , effectCell] of rows) {
    const effect = stripTags(effectCell);
    // `/s.png` is their blank placeholder, not art.
    out.set(slug, { icon: src.endsWith('/s.png') ? null : src, effect: effect || null });
  }
  return out;
}

/** What PokeAPI's sprite repo actually has, so nothing already working is re-hosted. */
function pokeapiItemSprites() {
  const tree = get('https://api.github.com/repos/PokeAPI/sprites/git/trees/master%3Asprites%2Fitems', { json: true });
  return new Set(tree.tree.filter((n) => n.path.endsWith('.png')).map((n) => n.path.slice(0, -4)));
}

// ───────────────────────────────────────────────────────────────── the run ──

const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47]);

function download(identifier, url) {
  const target = `items/${identifier}.png`;
  const dest = join(PUBLIC_DIR, target);
  if (existsSync(dest)) return target;
  mkdirSync(dirname(dest), { recursive: true });
  try {
    execFileSync('curl', ['-sfL', '--max-time', '45', '-A', UA, '-o', dest, url], { stdio: 'pipe' });
    if (!readFileSync(dest).subarray(0, 4).equals(PNG_MAGIC) || statSync(dest).size < 100) {
      unlinkSync(dest);
      return null;
    }
    return target;
  } catch {
    if (existsSync(dest)) unlinkSync(dest);
    return null;
  }
}

function main() {
  const displayName = new Map();
  for (const r of readCsv('item_names')) if (r.local_language_id === '9') displayName.set(r.item_id, r.name);
  const items = readCsv('items').map((r) => ({
    id: r.id,
    identifier: r.identifier,
    name: displayName.get(r.id) ?? r.identifier,
  }));
  // Upstream ships duplicate identifiers; the seed keeps the lowest id, so match it.
  const seen = new Set();
  const dex = items.filter((i) => (seen.has(i.identifier) ? false : seen.add(i.identifier)));

  const existingEffect = new Set();
  for (const r of readCsv('item_prose')) {
    if (r.local_language_id === '9' && (r.short_effect ?? '').trim()) existingEffect.add(r.item_id);
  }

  console.log('Fetching sources…');
  const bulba = bulbapediaItems();
  const pdb = pokemondbItems();
  const pokeapi = pokeapiItemSprites();
  console.log(`  bulbapedia ${bulba.size} · pokemondb ${pdb.size} · pokeapi sprites ${pokeapi.size}\n`);

  // Species name → dex number, for the crafting materials.
  const speciesId = new Map(readCsv('pokemon_species').map((r) => [r.identifier, Number(r.id)]));

  /** Looks an item up in a source under every spelling worth trying. */
  const lookup = (source, item) => {
    const family = familyOf(item.identifier);
    const keys = family
      ? [family.lookup]
      : [...variants(item.identifier), slugify(item.name), slugify(item.name.replace(/\s*\(.*\)$/, ''))];
    for (const key of keys) {
      const hit = source.get(key);
      if (hit) return hit;
    }
    return null;
  };

  const sprites = {};
  const effects = {};
  const stats = { pokeapi: 0, downloaded: 0, shared: 0, machine: 0, material: 0, failed: 0, none: [] };
  // Family members share one file rather than 300 copies of the same icon.
  const familyPath = new Map();

  for (const item of dex) {
    const b = lookup(bulba, item);
    const p = lookup(pdb, item);

    const effect = b?.effect ?? p?.effect ?? null;
    if (effect && !existingEffect.has(item.id)) effects[item.identifier] = effect;

    if (pokeapi.has(item.identifier)) { stats.pokeapi++; continue; }
    // Machines already resolve downstream through pokesprite's generic discs.
    if (MACHINE.test(item.identifier)) { stats.machine++; continue; }

    const family = familyOf(item.identifier);
    if (family && familyPath.has(family.key)) {
      sprites[item.identifier] = familyPath.get(family.key);
      stats.shared++;
      continue;
    }

    const url = b?.icon ?? p?.icon ?? null;
    if (!url) {
      // Last resort before the package icon: a crafting material wears the
      // face of the Pokémon it came from.
      const id = materialSpecies(item.identifier, speciesId);
      if (id) {
        sprites[item.identifier] = `${POKEMON_SPRITES}/${id}.png`;
        stats.material++;
        continue;
      }
      stats.none.push(item.identifier);
      continue;
    }
    if (VERIFY_ONLY) { stats.downloaded++; continue; }

    const path = download(family ? family.key : item.identifier, url);
    if (!path) { stats.failed++; stats.none.push(item.identifier); continue; }
    sprites[item.identifier] = path;
    if (family) familyPath.set(family.key, path);
    stats.downloaded++;
    if (stats.downloaded % 100 === 0) console.log(`  ${stats.downloaded} downloaded`);
  }

  if (!VERIFY_ONLY) {
    mkdirSync(dirname(SPRITE_MAP), { recursive: true });
    writeFileSync(SPRITE_MAP, `${JSON.stringify(sprites, null, 0)}\n`);

    const header = `/**
 * Generated by apps/web/scripts/fetch-item-sprites.mjs — do not edit by hand.
 *
 * Effect text for the items PokeAPI's item_prose.csv leaves blank, taken from
 * Bulbapedia's item list and PokémonDB. The seed only reads this where the
 * upstream prose is missing, so corrections upstream always win.
 *
 * ${Object.keys(effects).length} items
 */
export const GENERATED_ITEM_EFFECTS: Record<string, string> = `;
    writeFileSync(EFFECTS_OUT, `${header}${JSON.stringify(effects, null, 2)};\n`);
  }

  const covered = stats.pokeapi + stats.downloaded + stats.shared + stats.machine + stats.material;
  console.log(`\n${dex.length} items`);
  console.log(`  ${stats.pokeapi} already on PokeAPI sprites`);
  console.log(`  ${stats.downloaded} self-hosted${stats.shared ? `, ${stats.shared} sharing a family icon` : ''}`);
  console.log(`  ${stats.machine} numbered machines on pokesprite's generic discs`);
  console.log(`  ${stats.material} crafting materials wearing their Pokémon`);
  console.log(`  ${covered} with art (${((covered / dex.length) * 100).toFixed(1)}%)`);
  if (stats.failed) console.log(`  ${stats.failed} downloads failed`);
  console.log(`  ${Object.keys(effects).length} effect texts backfilled`);
  if (stats.none.length) {
    console.log(`  ${stats.none.length} with no art in any source:`);
    console.log(`    ${stats.none.slice(0, 40).join(', ')}${stats.none.length > 40 ? ' …' : ''}`);
  }
}

main();
