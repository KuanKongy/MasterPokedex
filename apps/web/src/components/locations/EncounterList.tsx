import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown } from 'lucide-react';
import type { AreaEncounter, LocationArea } from '@masterpokedex/shared';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { TypeBadge } from '../ui/type-badge';
import HelpTip, { HoverTip } from '../HelpTip';
import { RARITY_STYLE } from './rarity';
import { capitalize } from '../../utils/helpers';
import { pokemonImage, spriteFallback, useSpritePref } from '@/prefs/SpritePrefContext';
import { cn } from '@/lib/utils';

const prettifyIdent = (value: string) => value.split('-').map(capitalize).join(' ');

/** Plain-words explanations for the encounter methods that need one. */
/** Exported so PokemonDetail's location chips can explain the same methods. */
export const METHOD_HELP: Record<string, string> = {
  walk: 'Walking in tall grass or on a cave floor: the ordinary random encounter.',
  surf: 'Met while riding a Pokémon across water.',
  'old-rod': 'Fishing with the weakest rod; mostly Magikarp country.',
  'good-rod': 'Fishing with the mid-tier rod.',
  'super-rod': 'Fishing with the best rod, for the rarest catches.',
  headbutt: 'Headbutting a tree shakes a Pokémon out of it.',
  'rock-smash': 'Smashing cracked rocks with the field move.',
  gift: 'Handed to you by a character, not a wild encounter.',
  'honey-tree': 'Slather a tree with Honey and come back later.',
  overworld: 'Roams visibly in the open world; walk up to it.',
  'space-time-distortion': 'Appears only inside Hisui’s space-time distortions.',
  'grand-underground': 'Found in the Grand Underground’s caverns beneath Sinnoh.',
};

const MethodHeading: React.FC<{ method: string; compact?: boolean }> = ({ method, compact }) => {
  const label = method.replace(/-/g, ' ');
  const heading = (
    <h4
      className={
        compact
          ? 'mb-1 text-xs font-semibold capitalize text-muted-foreground'
          : 'mb-2 text-sm font-semibold capitalize text-muted-foreground'
      }
    >
      {label}
    </h4>
  );
  if (!METHOD_HELP[method]) return heading;
  return (
    <HoverTip title={label} className="capitalize" trigger={heading}>
      {METHOD_HELP[method]}
    </HoverTip>
  );
};

/** area encounters, grouped by method, each method sorted by rarity desc. */
function groupByMethod(encounters: AreaEncounter[]): Array<{ method: string; rows: AreaEncounter[] }> {
  const buckets = new Map<string, AreaEncounter[]>();
  for (const encounter of encounters) {
    const bucket = buckets.get(encounter.method) ?? [];
    bucket.push(encounter);
    buckets.set(encounter.method, bucket);
  }
  return [...buckets.entries()].map(([method, rows]) => ({
    method,
    rows: rows.sort((a, b) => b.chance - a.chance || a.pokemonName.localeCompare(b.pokemonName)),
  }));
}

type PokemonAggregate = {
  pokemonId: number;
  pokemonName: string;
  types: AreaEncounter['types'];
  minLevel: number;
  maxLevel: number;
  methods: string[];
  bestRarity: AreaEncounter['rarity'];
  bestChance: number;
  versions: string[];
  conditions: string[];
};

/**
 * Every distinct Pokémon in an area, with its rows folded into one summary
 * (level range, methods, best odds) so the chip has something to say on hover.
 */
function aggregatePokemon(rows: AreaEncounter[]): PokemonAggregate[] {
  type Working = PokemonAggregate & {
    methodSet: Set<string>;
    versionSet: Set<string>;
    conditionSet: Set<string>;
  };
  const seen = new Map<number, Working>();
  for (const row of rows) {
    let entry = seen.get(row.pokemonId);
    if (!entry) {
      entry = {
        pokemonId: row.pokemonId,
        pokemonName: row.pokemonName,
        types: row.types,
        minLevel: row.minLevel,
        maxLevel: row.maxLevel,
        methods: [],
        bestRarity: row.rarity,
        bestChance: row.chance,
        versions: [],
        conditions: [],
        methodSet: new Set(),
        versionSet: new Set(),
        conditionSet: new Set(),
      };
      seen.set(row.pokemonId, entry);
    }
    entry.minLevel = Math.min(entry.minLevel, row.minLevel);
    entry.maxLevel = Math.max(entry.maxLevel, row.maxLevel);
    entry.methodSet.add(row.method);
    for (const version of row.versions) entry.versionSet.add(version);
    for (const condition of row.conditions) entry.conditionSet.add(condition);
    if (row.rarity !== 'unknown' && (entry.bestRarity === 'unknown' || row.chance > entry.bestChance)) {
      entry.bestRarity = row.rarity;
      entry.bestChance = row.chance;
    }
  }
  return [...seen.values()]
    .map(({ methodSet, versionSet, conditionSet, ...entry }) => ({
      ...entry,
      methods: [...methodSet],
      versions: [...versionSet],
      conditions: [...conditionSet],
    }))
    .sort((a, b) => a.pokemonId - b.pokemonId);
}

const PokemonChip: React.FC<PokemonAggregate> = ({
  pokemonId,
  pokemonName,
  types,
  minLevel,
  maxLevel,
  methods,
  bestRarity,
  bestChance,
  versions,
  conditions,
}) => {
  const { spriteStyle } = useSpritePref();
  return (
    <HoverTip
      clickThrough
      title={capitalize(pokemonName)}
      trigger={
        <Link
          to={`/pokemon/${pokemonId}`}
          className="inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-sm transition-colors hover:border-pokebrand-extra/60"
        >
          <img
            src={pokemonImage(pokemonId, spriteStyle)}
            alt=""
            loading="lazy"
            onError={(e) => spriteFallback(e, pokemonId)}
            className={cn('h-10 w-10 object-contain', spriteStyle === 'sprite' && 'pixelated')}
          />
          {capitalize(pokemonName)}
        </Link>
      }
    >
      <div className="space-y-1.5 text-xs">
        <div className="flex gap-1">
          {types.map((type) => (
            <TypeBadge key={type} type={type} size="sm" link />
          ))}
        </div>
        <p>Levels {minLevel === maxLevel ? minLevel : `${minLevel}–${maxLevel}`}</p>
        <p className="capitalize">{methods.map((method) => method.replace(/-/g, ' ')).join(', ')}</p>
        <p className="capitalize">
          {bestRarity === 'unknown'
            ? 'Rarity unknown'
            : `Up to ${bestChance}% (${bestRarity.replace('-', ' ')})`}
        </p>
        {versions.length > 0 && (
          <div className="flex max-w-56 flex-wrap gap-1">
            {versions.map((version) => (
              <span key={version} className="rounded bg-muted px-1.5 py-0.5 text-[0.6875rem]">
                {prettifyIdent(version)}
              </span>
            ))}
          </div>
        )}
        {conditions.length > 0 && (
          <p className="capitalize text-muted-foreground">
            {conditions.map((condition) => condition.replace(/-/g, ' ')).join(', ')}
          </p>
        )}
      </div>
    </HoverTip>
  );
};

const DetailTables: React.FC<{ rows: AreaEncounter[] }> = ({ rows }) => {
  const { spriteStyle } = useSpritePref();
  return (
    <div className="space-y-5">
      {groupByMethod(rows).map(({ method, rows: methodRows }) => (
        <div key={method}>
          <MethodHeading method={method} />
          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Pokémon</TableHead>
                  <TableHead>Types</TableHead>
                  <TableHead className="text-right">Levels</TableHead>
                  <TableHead className="text-right">Rarity</TableHead>
                  <TableHead>
                    Games
                    <HelpTip title="Games" className="ml-1">
                      The game versions this row applies to; some encounters are
                      version-exclusive.
                    </HelpTip>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {methodRows.map((encounter, index) => (
                  <TableRow key={`${encounter.pokemonId}-${index}`}>
                    <TableCell>
                      <Link
                        to={`/pokemon/${encounter.pokemonId}`}
                        className="flex items-center gap-2 font-medium hover:underline"
                      >
                        <img
                          src={pokemonImage(encounter.pokemonId, spriteStyle)}
                          alt=""
                          loading="lazy"
                          onError={(e) => spriteFallback(e, encounter.pokemonId)}
                          className={cn('h-10 w-10 object-contain', spriteStyle === 'sprite' && 'pixelated')}
                        />
                        {capitalize(encounter.pokemonName)}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {encounter.types.map((type) => (
                          <TypeBadge key={type} type={type} size="sm" link />
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-right">
                      {encounter.minLevel === encounter.maxLevel
                        ? encounter.minLevel
                        : `${encounter.minLevel}–${encounter.maxLevel}`}
                    </TableCell>
                    <TableCell className="text-right">
                      <HoverTip
                        title="Rarity"
                        trigger={
                          <span
                            className={cn(
                              'inline-block whitespace-nowrap rounded-full px-2 py-0.5 text-xs capitalize',
                              RARITY_STYLE[encounter.rarity],
                            )}
                          >
                            {encounter.rarity === 'unknown'
                              ? 'unknown'
                              : `${encounter.rarity.replace('-', ' ')} · ${encounter.chance}%`}
                          </span>
                        }
                      >
                        {encounter.rarity === 'unknown'
                          ? 'This game publishes no encounter rates, so there is no % to show.'
                          : 'The chance of this encounter slot per encounter rolled, bucketed from common down to legendary.'}
                      </HoverTip>
                    </TableCell>
                    <TableCell>
                      <div className="flex max-w-64 flex-wrap gap-1">
                        {encounter.versions.map((version) => (
                          <span
                            key={version}
                            className="rounded bg-muted px-1.5 py-0.5 text-[0.6875rem] text-muted-foreground"
                          >
                            {prettifyIdent(version)}
                          </span>
                        ))}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      ))}
    </div>
  );
};

/** The condensed expansion used inside the map's surface panel. */
const DetailCompact: React.FC<{ rows: AreaEncounter[] }> = ({ rows }) => {
  const { spriteStyle } = useSpritePref();
  return (
    <div className="space-y-3">
      {groupByMethod(rows).map(({ method, rows: methodRows }) => (
        <div key={method}>
          <MethodHeading method={method} compact />
          <ul className="space-y-1">
            {methodRows.map((encounter, index) => (
              <li key={`${encounter.pokemonId}-${index}`} className="flex items-center gap-2 text-sm">
                <img
                  src={pokemonImage(encounter.pokemonId, spriteStyle)}
                  alt=""
                  loading="lazy"
                  onError={(e) => spriteFallback(e, encounter.pokemonId)}
                  className={cn('h-8 w-8 object-contain', spriteStyle === 'sprite' && 'pixelated')}
                />
                <Link to={`/pokemon/${encounter.pokemonId}`} className="min-w-0 truncate hover:underline">
                  {capitalize(encounter.pokemonName)}
                </Link>
                <span className="whitespace-nowrap text-xs text-muted-foreground">
                  Lv. {encounter.minLevel}
                  {encounter.maxLevel !== encounter.minLevel && `–${encounter.maxLevel}`}
                </span>
                <HoverTip
                  className="ml-auto"
                  title="Rarity"
                  trigger={
                    <span
                      className={cn(
                        'whitespace-nowrap rounded-full px-1.5 py-0.5 text-[0.6875rem] capitalize',
                        RARITY_STYLE[encounter.rarity],
                      )}
                    >
                      {encounter.rarity.replace('-', ' ')}
                    </span>
                  }
                >
                  {encounter.rarity === 'unknown'
                    ? 'This game publishes no encounter rates.'
                    : 'How likely this encounter slot is, bucketed from common down to legendary.'}
                </HoverTip>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
};

/** One area: Pokémon chips first, the full picture behind "Show details". */
const AreaSection: React.FC<{ area: LocationArea; variant: 'full' | 'compact'; showHeading: boolean }> = ({
  area,
  variant,
  showHeading,
}) => {
  const [open, setOpen] = useState(false);
  const pokemon = aggregatePokemon(area.encounters);

  const body = (
    <Collapsible open={open} onOpenChange={setOpen}>
      <div className="flex flex-wrap gap-2">
        {pokemon.map((p) => (
          <PokemonChip key={p.pokemonId} {...p} />
        ))}
      </div>
      <CollapsibleTrigger asChild>
        <Button variant="ghost" size="sm" className="mt-2 text-muted-foreground">
          {open ? 'Hide details' : 'Show details'}
          <ChevronDown className={cn('ml-1 h-4 w-4 transition-transform', open && 'rotate-180')} />
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="pt-2">
        {variant === 'full' ? <DetailTables rows={area.encounters} /> : <DetailCompact rows={area.encounters} />}
      </CollapsibleContent>
    </Collapsible>
  );

  if (variant === 'compact') {
    return (
      <section>
        {showHeading && <h3 className="mb-1.5 text-sm font-semibold">{area.displayName}</h3>}
        {body}
      </section>
    );
  }

  return (
    <Card>
      {showHeading && (
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">{area.displayName}</CardTitle>
        </CardHeader>
      )}
      <CardContent className={cn(!showHeading && 'pt-6')}>{body}</CardContent>
    </Card>
  );
};

type EncounterListProps = {
  areas: LocationArea[];
  /** 'full' on the location page, 'compact' inside the map's surface panel. */
  variant?: 'full' | 'compact';
};

/**
 * Encounters, simple first: who lives here as deduped chips, with the
 * method/level/rarity/version detail an expander away — most visitors just
 * want to know the Pokémon.
 */
const EncounterList: React.FC<EncounterListProps> = ({ areas, variant = 'full' }) => {
  const withEncounters = areas.filter((area) => area.encounters.length > 0);

  if (withEncounters.length === 0) {
    return (
      <p
        className={cn(
          'text-muted-foreground',
          variant === 'full' ? 'rounded-md border p-6 text-center' : 'text-sm',
        )}
      >
        No wild encounters are recorded for this location.
      </p>
    );
  }

  return (
    <div className={variant === 'full' ? 'space-y-6' : 'space-y-4'}>
      {withEncounters.map((area) => (
        <AreaSection key={area.id} area={area} variant={variant} showHeading={withEncounters.length > 1} />
      ))}
    </div>
  );
};

export default EncounterList;
