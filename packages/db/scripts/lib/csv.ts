import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
export const CACHE_DIR = join(here, '..', '..', '.cache');

const SOURCE_BASE = 'https://raw.githubusercontent.com/PokeAPI/pokeapi/master/data/v2/csv';

/**
 * RFC 4180 parser. Written out rather than pulled in as a dependency because
 * the failure mode matters: PokeAPI's flavour-text files contain fields with
 * embedded commas, doubled quotes and literal newlines, and a naive
 * `line.split(',')` silently produces garbage rows instead of erroring.
 */
export function parseCsv(input: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;
  let i = 0;

  // Strip a UTF-8 BOM if present, or the first header cell gets a stray prefix.
  if (input.charCodeAt(0) === 0xfeff) i = 1;

  while (i < input.length) {
    const char = input[i];

    if (inQuotes) {
      if (char === '"') {
        if (input[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i += 1;
        continue;
      }
      field += char;
      i += 1;
      continue;
    }

    if (char === '"') {
      inQuotes = true;
      i += 1;
      continue;
    }

    if (char === ',') {
      row.push(field);
      field = '';
      i += 1;
      continue;
    }

    if (char === '\r') {
      i += 1;
      continue;
    }

    if (char === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
      i += 1;
      continue;
    }

    field += char;
    i += 1;
  }

  // Trailing record with no final newline.
  if (field !== '' || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows;
}

export type CsvRow = Record<string, string>;

function toObjects(rows: string[][]): CsvRow[] {
  if (rows.length === 0) return [];
  const header = rows[0]!;
  const out: CsvRow[] = [];
  for (let r = 1; r < rows.length; r += 1) {
    const values = rows[r]!;
    // PokeAPI ships a few short rows; pad rather than drop them.
    const obj: CsvRow = {};
    for (let c = 0; c < header.length; c += 1) {
      obj[header[c]!] = values[c] ?? '';
    }
    out.push(obj);
  }
  return out;
}

const memo = new Map<string, CsvRow[]>();

/**
 * Downloads a PokeAPI CSV once and caches it under packages/db/.cache so
 * re-running the seed (which you will, a lot, while tuning filters) does not
 * re-fetch 40 MB from GitHub each time.
 */
export async function loadCsv(name: string): Promise<CsvRow[]> {
  const cached = memo.get(name);
  if (cached) return cached;

  const file = join(CACHE_DIR, `${name}.csv`);
  let text: string;

  if (existsSync(file)) {
    text = await readFile(file, 'utf8');
  } else {
    const url = `${SOURCE_BASE}/${name}.csv`;
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Failed to download ${name}.csv: ${res.status} ${res.statusText}`);
    }
    text = await res.text();
    await mkdir(dirname(file), { recursive: true });
    await writeFile(file, text, 'utf8');
  }

  const parsed = toObjects(parseCsv(text));
  memo.set(name, parsed);
  return parsed;
}

export function num(value: string | undefined): number | null {
  if (value === undefined || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export function int(value: string | undefined, fallback = 0): number {
  const n = num(value);
  return n === null ? fallback : Math.trunc(n);
}

export function bool(value: string | undefined): boolean {
  return value === '1' || value === 'true';
}

export function text(value: string | undefined): string | null {
  if (value === undefined) return null;
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
}

/** `master-ball` → `Master Ball`, `hp` → `HP`. Used wherever PokeAPI has no localized name. */
const ALL_CAPS = new Set(['hp', 'pp', 'tm', 'hm', 'iv', 'ev']);
export function prettify(identifier: string): string {
  return identifier
    .split('-')
    .map((part) => (ALL_CAPS.has(part) ? part.toUpperCase() : part.charAt(0).toUpperCase() + part.slice(1)))
    .join(' ');
}

/** Flavour text uses form feeds and hard line breaks for in-game text boxes. */
export function cleanFlavorText(value: string): string {
  return value.replace(/[\f\n\r]/g, ' ').replace(/­/g, '').replace(/\s+/g, ' ').trim();
}

export const ENGLISH_LANGUAGE_ID = 9;
