/**
 * Downloads the self-hosted map, location and demo-avatar art into public/.
 *
 * These images used to be hotlinked from the Bulbagarden archives, but that
 * host's Cloudflare serves a challenge page (403) to real browsers loading
 * cross-site, so every <img> silently broke. Plain curl-style requests pass,
 * hence this one-shot script: run it once, commit the PNGs, done. It is a
 * provenance record as much as a tool — each file's source URL is listed here.
 *
 *   node scripts/fetch-static-assets.mjs        (from apps/web)
 *
 * Existing files are skipped. Every download is verified to be a real PNG
 * (magic bytes) — the failure mode to catch is Cloudflare's challenge HTML
 * saved under a .png name.
 *
 * Not a build step. The DB's curated data (packages/db/scripts/data/) stores
 * the same public/-relative paths these land at.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, statSync, unlinkSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const BULBA = 'https://archives.bulbagarden.net/media/upload';
const PUBLIC_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'public');

/**
 * target path (under public/) → source URL
 *
 * .webp targets are downloaded as PNG, downscaled to ≤1200px and re-encoded
 * with cwebp (the originals run to 9.5 MB; the whole maps/ folder lands under
 * 2 MB as WebP). Avatars stay PNG — they are small and some need alpha at
 * crisp edges.
 */
const MANIFEST = {
  // Region maps (see packages/db/scripts/data/curated.ts REGION_META)
  'maps/kanto.webp': `${BULBA}/7/7d/PE_Kanto_Map.png`,
  'maps/johto.webp': `${BULBA}/6/64/JohtoMap.png`,
  'maps/hoenn.webp': `${BULBA}/8/85/Hoenn_ORAS.png`,
  'maps/sinnoh.webp': `${BULBA}/0/08/Sinnoh_BDSP_artwork.png`,
  'maps/unova.webp': `${BULBA}/f/fc/Unova_B2W2_alt.png`,
  // The curated data used to point at thumb/8/8a/Kalos_map.png — but 8/8a is
  // the hash of Kalos_alt.png, so that hotlink was broken even pre-Cloudflare.
  'maps/kalos.webp': `${BULBA}/8/8a/Kalos_alt.png`,
  'maps/alola.webp': `${BULBA}/0/0b/Alola_USUM_artwork.png`,
  'maps/galar.webp': `${BULBA}/c/ce/Galar_artwork.png`,
  'maps/hisui.webp': `${BULBA}/5/5b/Hisui.png`,
  'maps/paldea.webp': `${BULBA}/f/fd/Paldea_artwork.png`,
  // Orre has no illustrated region artwork. The obvious candidate, Orre.png,
  // is a screenshot with the in-game UI printed over its southern third; this
  // is the clean contour map with the location diamonds on it.
  'maps/orre.webp': `${BULBA}/4/41/Orre_Map.png`,
  // Location art (LOCATION_META)
  'locations/pallet-town.webp': `${BULBA}/4/45/Pallet_Town_PE.png`,
  'locations/viridian-city.webp': `${BULBA}/f/fc/Viridian_City_PE.png`,
  'locations/pewter-city.webp': `${BULBA}/1/11/Pewter_City_PE.png`,
  'locations/new-bark-town.webp': `${BULBA}/d/dd/New_Bark_Town_HGSS.png`,
  'locations/littleroot-town.webp': `${BULBA}/a/a3/Littleroot_Town_RS.png`,
  // Demo cast avatars (packages/db/scripts/data/demo-cast.ts)
  'avatars/ash.png': `${BULBA}/c/cb/Mezastar_Trainer_Ash.png`,
  'avatars/misty.png': `${BULBA}/4/4f/Misty_OS_2.png`,
  'avatars/brock.png': `${BULBA}/0/01/Brock_Vileplume_EToP.png`,
  'avatars/prof-oak.png': `${BULBA}/a/ae/Oak_Stadium.png`,
  'avatars/abigail.png': `${BULBA}/0/0a/Spr_Masters_Lass.png`,
  'avatars/jas.png': `${BULBA}/d/df/Spr_Masters_Youngster.png`,
};

const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47]);

let fetched = 0;
let skipped = 0;
let failed = 0;

for (const [target, url] of Object.entries(MANIFEST)) {
  const dest = join(PUBLIC_DIR, target);
  if (existsSync(dest)) {
    skipped += 1;
    continue;
  }
  mkdirSync(dirname(dest), { recursive: true });
  const toWebp = target.endsWith('.webp');
  const download = toWebp ? `${dest}.download.png` : dest;
  try {
    execFileSync('curl', ['-sfL', '--max-time', '60', '-o', download, url], { stdio: 'pipe' });
    const head = readFileSync(download).subarray(0, 4);
    if (!head.equals(PNG_MAGIC) || statSync(download).size < 1024) {
      unlinkSync(download);
      throw new Error('not a PNG (Cloudflare challenge page?)');
    }
    if (toWebp) {
      execFileSync('sips', ['-Z', '1200', download], { stdio: 'pipe' });
      execFileSync('cwebp', ['-quiet', '-q', '82', download, '-o', dest], { stdio: 'pipe' });
      unlinkSync(download);
    }
    console.log(`  + ${target} (${Math.round(statSync(dest).size / 1024)} KB)`);
    fetched += 1;
  } catch (err) {
    console.error(`  ! ${target} ← ${url}: ${err.message}`);
    failed += 1;
  }
}

console.log(`\n${fetched} fetched, ${skipped} already present, ${failed} failed.`);
if (failed > 0) process.exitCode = 1;
