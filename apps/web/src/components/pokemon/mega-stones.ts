/**
 * Which Mega Stone unlocks which Mega, keyed by the form's identifier. The
 * names are irregular enough (Blastoisinite, Sablenite, Glalitite) that a
 * suffix rule invents items that don't exist, so the 46 real stones are
 * written out. A Mega without an entry (Rayquaza needs no stone; Legends
 * Z-A additions have no confirmed item yet) falls back to "Mega Stone".
 */
const MEGA_STONES: Record<string, string> = {
  'venusaur-mega': 'Venusaurite',
  'charizard-mega-x': 'Charizardite X',
  'charizard-mega-y': 'Charizardite Y',
  'blastoise-mega': 'Blastoisinite',
  'beedrill-mega': 'Beedrillite',
  'pidgeot-mega': 'Pidgeotite',
  'alakazam-mega': 'Alakazite',
  'slowbro-mega': 'Slowbronite',
  'gengar-mega': 'Gengarite',
  'kangaskhan-mega': 'Kangaskhanite',
  'pinsir-mega': 'Pinsirite',
  'gyarados-mega': 'Gyaradosite',
  'aerodactyl-mega': 'Aerodactylite',
  'mewtwo-mega-x': 'Mewtwonite X',
  'mewtwo-mega-y': 'Mewtwonite Y',
  'ampharos-mega': 'Ampharosite',
  'steelix-mega': 'Steelixite',
  'scizor-mega': 'Scizorite',
  'heracross-mega': 'Heracronite',
  'houndoom-mega': 'Houndoominite',
  'tyranitar-mega': 'Tyranitarite',
  'sceptile-mega': 'Sceptilite',
  'blaziken-mega': 'Blazikenite',
  'swampert-mega': 'Swampertite',
  'gardevoir-mega': 'Gardevoirite',
  'sableye-mega': 'Sablenite',
  'mawile-mega': 'Mawilite',
  'aggron-mega': 'Aggronite',
  'medicham-mega': 'Medichamite',
  'manectric-mega': 'Manectite',
  'sharpedo-mega': 'Sharpedonite',
  'camerupt-mega': 'Cameruptite',
  'altaria-mega': 'Altarianite',
  'banette-mega': 'Banettite',
  'absol-mega': 'Absolite',
  'glalie-mega': 'Glalitite',
  'salamence-mega': 'Salamencite',
  'metagross-mega': 'Metagrossite',
  'latias-mega': 'Latiasite',
  'latios-mega': 'Latiosite',
  'lopunny-mega': 'Lopunnite',
  'garchomp-mega': 'Garchompite',
  'lucario-mega': 'Lucarionite',
  'abomasnow-mega': 'Abomasite',
  'gallade-mega': 'Galladite',
  'audino-mega': 'Audinite',
  'diancie-mega': 'Diancite',
};

export function megaStoneOf(formName: string): string | null {
  return MEGA_STONES[formName] ?? null;
}

/** The stone's dex item identifier ("Charizardite X" → charizardite-x). */
export function megaStoneSlug(stone: string): string {
  return stone.toLowerCase().replace(/ /g, '-');
}

/**
 * The reverse road, for an item's page: which Mega form a stone slug
 * unlocks ("charizardite-x" → charizard-mega-x), or null for any item that
 * is not one of the 46 stones.
 */
export function megaFormOfStoneSlug(slug: string): string | null {
  for (const [form, stone] of Object.entries(MEGA_STONES)) {
    if (megaStoneSlug(stone) === slug) return form;
  }
  return null;
}

/** The chain caption for a Mega node: the stone by name where one exists. */
export function megaCaption(formName: string): string {
  if (formName === 'rayquaza-mega') return 'Knows Dragon Ascent';
  return megaStoneOf(formName) ?? 'Mega Stone';
}
