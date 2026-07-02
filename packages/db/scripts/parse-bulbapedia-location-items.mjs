/**
 * Parses field items out of the committed Bulbapedia checkpoint.
 *
 *   node scripts/parse-bulbapedia-location-items.mjs            (from packages/db)
 *   node scripts/parse-bulbapedia-location-items.mjs --stats    (report, write nothing)
 *
 * Bulbapedia lists every pickup on a location page as
 *   {{Itemlist|Antidote|On the southwesternmost square … ''(hidden)''|R=yes|B=yes}}
 * which is exactly the "in this location you can find a secret item" fact the
 * site wants to surface. One pass over the checkpoint's wikitext yields, per
 * location: the distinct items, how many spots hold one, whether any of them
 * is hidden, and a first where-note for a tooltip. No network; the item
 * label is resolved to a dex item id at seed time, not here.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const CACHE_DIR = join(HERE, '..', '.cache');
const CHECKPOINT = join(CACHE_DIR, 'bulbapedia-locations.json');
const OUT_FILE = join(HERE, 'data', 'location-items.generated.ts');

const STATS_ONLY = process.argv.includes('--stats');

/** Every {{Itemlist|…}} on the page, params split at brace/bracket depth 0. */
function scanItemlists(wikitext) {
  const out = [];
  const openRe = /\{\{\s*[Ii]temlist\s*\|/g;
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
    parts.shift(); // the template name
    const positional = [];
    const named = {};
    for (const part of parts) {
      const eq = part.indexOf('=');
      const key = eq === -1 ? null : part.slice(0, eq).trim().toLowerCase();
      if (key && /^[a-z][a-z0-9]*$/.test(key)) named[key] = part.slice(eq + 1).trim();
      else positional.push(part.trim());
    }
    out.push({ positional, named });
  }
  return out;
}

/** Wiki markup down to a plain sentence fragment. */
function plainNote(value) {
  if (!value) return null;
  let s = value;
  // Multi-line bullet notes: the first bullet is the tooltip, the rest is noise.
  const lines = s.split('\n').map((l) => l.replace(/^\s*\*+\s*/, '').trim()).filter(Boolean);
  s = lines[0] ?? '';
  s = s.replace(/\{\{tt\|([^|}]*)\|[^}]*\}\}/g, '$1');
  s = s.replace(/\{\{tc\|([^|}]*)\}\}/g, '$1');
  s = s.replace(/\{\{(?:p|m|i|DL|OBP|wp|sup\/\d+)\|(?:[^|}]*\|)?([^|}]*)\}\}/g, '$1');
  s = s.replace(/\{\{[^}]*\}\}/g, '');
  s = s.replace(/\[\[(?:[^\]|]*\|)?([^\]]*)\]\]/g, '$1');
  s = s.replace(/'{2,}/g, '');
  s = s.replace(/<[^>]+>/g, '');
  s = s.replace(/\s+/g, ' ').trim();
  if (s.length > 160) s = `${s.slice(0, 157).trimEnd()}…`;
  return s || null;
}

/** "TM Normal" rows carry the real disc in display={{TM|27}}. */
function labelOf(positional, named) {
  const display = named.display ?? '';
  const tm = display.match(/\{\{(TM|HM|TR)\|(\d+)/i);
  if (tm) return `${tm[1].toUpperCase()}${tm[2].padStart(2, '0')}`;
  const raw = (positional[0] ?? '').trim();
  return raw
    .replace(/\[\[(?:[^\]|]*\|)?([^\]]*)\]\]/g, '$1')
    .replace(/\{\{[^}]*\}\}/g, '')
    // Game superscripts survive the template strip glued onto the name
    // ("Potion SV", "Rare Candy BDSP"); the label is the item, not the game.
    .replace(/\s+(?:RBY|RGBY|GSC|RSE|FRLG|Em?|DPPt?|Pt|HGSS|BW2?|B2W2|XY|ORAS|SM|USUM|LGPE|SwSh|IoA|CT|BDSP|LA|SV|TM|DLC)$/, '')
    .trim();
}

function main() {
  const checkpoint = JSON.parse(readFileSync(CHECKPOINT, 'utf8'));
  const bySlug = {};
  let pages = 0;
  let rows = 0;
  let skippedLabel = 0;

  for (const [slug, entry] of Object.entries(checkpoint)) {
    const wikitext = entry?.wikitext;
    if (!wikitext || !/\{\{\s*[Ii]temlist\s*\|/.test(wikitext)) continue;
    const lists = scanItemlists(wikitext);
    if (lists.length === 0) continue;
    pages += 1;

    // One row per distinct item label, counting spots and remembering the
    // first note; hidden if any spot says so.
    const byLabel = new Map();
    for (const { positional, named } of lists) {
      const label = labelOf(positional, named);
      if (!label || label.length > 40 || /^none$/i.test(label)) { skippedLabel += 1; continue; }
      const rawNote = positional[1] ?? '';
      const hidden = /\(hidden\)|hidden item/i.test(rawNote);
      const existing = byLabel.get(label.toLowerCase());
      if (existing) {
        existing.spots += 1;
        existing.hidden = existing.hidden || hidden;
      } else {
        byLabel.set(label.toLowerCase(), { label, note: plainNote(rawNote), hidden, spots: 1 });
      }
      rows += 1;
    }
    if (byLabel.size > 0) {
      bySlug[slug] = [...byLabel.values()].sort((a, b) => a.label.localeCompare(b.label));
    }
  }

  const totalDistinct = Object.values(bySlug).reduce((n, list) => n + list.length, 0);
  console.log(`${pages} pages with item lists · ${rows} rows → ${totalDistinct} distinct location items`);
  if (skippedLabel) console.log(`  ${skippedLabel} rows skipped (no usable label)`);

  if (STATS_ONLY) {
    const sample = bySlug['viridian-forest'];
    if (sample) console.log('viridian-forest:', JSON.stringify(sample, null, 1).slice(0, 600));
    return;
  }

  const header = `/**
 * Generated by scripts/parse-bulbapedia-location-items.mjs — do not edit by hand.
 *
 * Field items per location, parsed from the Bulbapedia checkpoint's
 * {{Itemlist}} rows: the distinct items found there, how many spots hold
 * one, whether any spot is hidden, and a first where-note. Keys are the
 * checkpoint's location slugs; seed-dex.ts resolves labels to dex item ids
 * by display name and loads dex.location_items.
 */
export type GeneratedLocationItem = { label: string; note: string | null; hidden: boolean; spots: number };

export const GENERATED_LOCATION_ITEMS: Record<string, GeneratedLocationItem[]> = `;
  mkdirSync(dirname(OUT_FILE), { recursive: true });
  writeFileSync(OUT_FILE, `${header}${JSON.stringify(bySlug)};\n`);
  console.log(`written to data/location-items.generated.ts`);
}

main();
