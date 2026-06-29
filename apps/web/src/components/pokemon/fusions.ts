/**
 * The reversible item fusions. These look like evolutions on a form list but
 * aren't: a base legendary absorbs a partner through a key item and can split
 * back apart at any time, with the partner stored while fused. PokeAPI has no
 * relation for them — the fused results are plain alternate forms — so the
 * six of them are kept by hand here for How to get one.
 */
export type Fusion = {
  /** The fused form's pokemon identifier and id (what its page is keyed by). */
  formName: string;
  formId: number;
  formLabel: string;
  /** The species out front, which the form belongs to. */
  baseId: number;
  baseName: string;
  /** The species absorbed by the fusion. */
  partnerId: number;
  partnerName: string;
  item: string;
};

export const FUSIONS: Fusion[] = [
  { formName: 'kyurem-black', formId: 10022, formLabel: 'Black Kyurem', baseId: 646, baseName: 'Kyurem', partnerId: 644, partnerName: 'Zekrom', item: 'DNA Splicers' },
  { formName: 'kyurem-white', formId: 10023, formLabel: 'White Kyurem', baseId: 646, baseName: 'Kyurem', partnerId: 643, partnerName: 'Reshiram', item: 'DNA Splicers' },
  { formName: 'necrozma-dusk', formId: 10155, formLabel: 'Dusk Mane Necrozma', baseId: 800, baseName: 'Necrozma', partnerId: 791, partnerName: 'Solgaleo', item: 'N-Solarizer' },
  { formName: 'necrozma-dawn', formId: 10156, formLabel: 'Dawn Wings Necrozma', baseId: 800, baseName: 'Necrozma', partnerId: 792, partnerName: 'Lunala', item: 'N-Lunarizer' },
  { formName: 'calyrex-ice', formId: 10193, formLabel: 'Ice Rider Calyrex', baseId: 898, baseName: 'Calyrex', partnerId: 896, partnerName: 'Glastrier', item: 'Reins of Unity' },
  { formName: 'calyrex-shadow', formId: 10194, formLabel: 'Shadow Rider Calyrex', baseId: 898, baseName: 'Calyrex', partnerId: 897, partnerName: 'Spectrier', item: 'Reins of Unity' },
];

export const FUSION_BY_FORM = new Map(FUSIONS.map((fusion) => [fusion.formName, fusion]));

/** The fusions a base species can enter, for its own page. */
export function fusionsOf(speciesId: number): Fusion[] {
  return FUSIONS.filter((fusion) => fusion.baseId === speciesId);
}
