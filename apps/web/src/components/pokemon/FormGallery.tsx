import React, { useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import type { MegaSummary, PokemonSortField, SortDir } from '@masterpokedex/shared';
import LoadingSpinner from '../LoadingSpinner';
import HelpTip, { HoverTip } from '../HelpTip';
import SearchField from '../SearchField';
import SegmentedToggle from '../SegmentedToggle';
import SortPicker from '../SortPicker';
import DexSpritesGrid from '../dex/DexSpritesGrid';
import { POKEMON_SORT_OPTIONS } from '../dex/sort-options';
import GenerationFilter, { GENERATIONS, GenHeading } from '../dex/GenerationFilter';
import TypeFilter from '../TypeFilter';
import DexStatsTable from '../dex/DexStatsTable';
import { DEX_VIEWS, type DexView } from '../dex/DexViewToggle';
import { Card, CardContent } from '@/components/ui/card';
import { TypeBadge } from '../ui/type-badge';
import { pokemonImage, spriteFallback, useSpritePref } from '@/prefs/SpritePrefContext';
import { cn } from '@/lib/utils';
import { makeComparator } from '../../utils/clientSort';

const FORM_SORT_GETTERS: Record<PokemonSortField, (f: MegaSummary) => string | number | null> = {
  id: (f) => f.id,
  name: (f) => f.formLabel ?? f.name,
  generation: (f) => f.generation,
  total: (f) => f.stats.total,
  hp: (f) => f.stats.hp,
  attack: (f) => f.stats.attack,
  defense: (f) => f.stats.defense,
  specialAttack: (f) => f.stats.specialAttack,
  specialDefense: (f) => f.stats.specialDefense,
  speed: (f) => f.stats.speed,
  height: (f) => f.height,
  weight: (f) => f.weight,
  baseExperience: (f) => f.baseExperience,
};

/**
 * A gallery of one kind of alternate form — the Megas, the Gigantamax lineup —
 * each card linking to the form and back to the species it belongs to.
 * Shared because the two pages differ only in their heading and their query.
 * Search, view and sort live in the URL; everything is client-side over the
 * one cached list.
 */
const FormGallery: React.FC<{
  title: string;
  blurb: (count: number) => string;
  help?: React.ReactNode;
  forms: MegaSummary[];
  isLoading: boolean;
}> = ({ title, blurb, help, forms, isLoading }) => {
  const { spriteStyle } = useSpritePref();
  const [params, setParams] = useSearchParams();

  const q = params.get('q') ?? '';
  const rawGen = params.get('gen');
  const gen = rawGen && /^[1-9]$/.test(rawGen) ? rawGen : 'all';
  const selectedType = params.get('type') ?? 'all';
  const viewParam = params.get('view');
  const view: DexView = viewParam === 'sprites' || viewParam === 'table' ? viewParam : 'cards';
  const rawSort = params.get('sort');
  // Only the Pokédex's own sort menu; the extra form fields read as clutter.
  const sort: PokemonSortField = POKEMON_SORT_OPTIONS.some((o) => o.value === rawSort)
    ? (rawSort as PokemonSortField)
    : 'id';
  const rawDir = params.get('dir');
  const dir: SortDir =
    rawDir === 'asc' || rawDir === 'desc' ? rawDir : sort === 'id' || sort === 'name' ? 'asc' : 'desc';

  const patchParams = (patch: Record<string, string | null>) => {
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        for (const [key, value] of Object.entries(patch)) {
          if (value === null || value === '') next.delete(key);
          else next.set(key, value);
        }
        return next;
      },
      { replace: true },
    );
  };

  const handleSort = (field: PokemonSortField) => {
    const nextDir: SortDir =
      sort === field ? (dir === 'asc' ? 'desc' : 'asc') : field === 'id' || field === 'name' ? 'asc' : 'desc';
    patchParams({ sort: field === 'id' && nextDir === 'asc' ? null : field, dir: nextDir });
  };

  const filtered = useMemo(() => {
    const ql = q.trim().toLowerCase();
    return forms.filter(
      (f) =>
        (!ql ||
          (f.formLabel ?? '').toLowerCase().includes(ql) ||
          f.name.toLowerCase().includes(ql) ||
          f.baseName.toLowerCase().includes(ql)) &&
        (gen === 'all' || f.generation === Number(gen)) &&
        (selectedType === 'all' || f.types.includes(selectedType as (typeof f.types)[number])),
    );
  }, [forms, q, gen, selectedType]);

  const genMeta = gen !== 'all' ? GENERATIONS[Number(gen) - 1] : null;
  const genHeading = genMeta ? (
    <GenHeading gen={genMeta.gen} region={genMeta.region} count={filtered.length} />
  ) : null;

  // Sort applies in every view; the table also re-sorts via its headers.
  const sorted = useMemo(
    () => [...filtered].sort(makeComparator(FORM_SORT_GETTERS[sort], dir)),
    [filtered, sort, dir],
  );

  return (
    <div className="container mx-auto px-4 py-8">
      {/* The view switch rides the title row, like the Pokédex's. */}
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="mb-2 text-3xl font-extrabold md:text-4xl">{title}</h1>
          <p className="text-muted-foreground">
            {blurb(forms.length)}
            {help && (
              <HelpTip title={title} faq="mega-gigantamax" className="ml-1">
                {help}
              </HelpTip>
            )}
          </p>
        </div>
        <SegmentedToggle
          options={DEX_VIEWS}
          value={view}
          onChange={(next) => patchParams({ view: next === 'cards' ? null : next })}
          ariaLabel="Gallery style"
        />
      </div>

      {/* The same row as the Pokédex's, class for class, so the two pages
          measure identically. */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        {/* Filters as you type; the whole list is client-side. */}
        <SearchField
          value={q}
          onChange={(value) => patchParams({ q: value || null })}
          onSubmit={() => undefined}
          placeholder="Search forms…"
          className="flex-1"
        />
        <GenerationFilter
          value={gen}
          onChange={(next) => patchParams({ gen: next === 'all' ? null : next })}
          className="w-full md:w-44 flex-shrink-0"
        />
        {/* One combined control, in every view; the table's headers drive
            the same URL state, so the two always agree. */}
        <div className="w-full md:w-56 flex-shrink-0">
          <SortPicker
            options={POKEMON_SORT_OPTIONS}
            value={sort}
            dir={dir}
            onFieldChange={handleSort}
            onDirChange={(next) => patchParams({ dir: next })}
          />
        </div>
      </div>

      <div className="mb-6">
        <TypeFilter
          selectedType={selectedType}
          setSelectedType={(type) => patchParams({ type: type === 'all' ? null : type })}
        />
      </div>

      {/* The Pokédex's corner writing whenever a specific gen is chosen; in
          table view it shares the Columns row via the table's heading slot. */}
      {genHeading && view !== 'table' && !isLoading && (
        <div className="mb-3 flex min-h-[49px] items-center border-b pb-2">
          <div className="flex min-w-0 items-baseline gap-3">{genHeading}</div>
        </div>
      )}

      {isLoading ? (
        <LoadingSpinner />
      ) : view === 'sprites' ? (
        <DexSpritesGrid pokemon={sorted} />
      ) : view === 'table' ? (
        <DexStatsTable pokemon={sorted} sort={sort} dir={dir} onSort={handleSort} heading={genHeading ?? undefined} />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {sorted.map((form) => (
            <Card key={form.id} className="overflow-hidden">
              <CardContent className="p-4">
                <Link to={`/pokemon/${form.id}`} className="flex items-center gap-3">
                  <img
                    src={pokemonImage(form.id, spriteStyle)}
                    alt={form.formLabel ?? form.name}
                    loading="lazy"
                    onError={(e) => spriteFallback(e, form.id, form.basePokemonId)}
                    className={cn('h-28 w-28 shrink-0 object-contain', spriteStyle === 'sprite' && 'pixelated')}
                  />
                  <div className="min-w-0">
                    <h3 className="truncate font-bold hover:underline">{form.formLabel ?? form.name}</h3>
                    <div className="mt-1 flex gap-1">
                      {form.types.map((type) => (
                        <TypeBadge key={type} type={type} size="sm" />
                      ))}
                    </div>
                    <p className="mt-1.5 text-xs text-muted-foreground">
                      <HoverTip
                        title="BST"
                        trigger={
                          <>
                            BST <span className="font-semibold text-foreground">{form.stats.total}</span>
                          </>
                        }
                      >
                        Base Stat Total: the six base stats added up.
                      </HoverTip>
                    </p>
                  </div>
                </Link>
                <p className="mt-3 border-t pt-2 text-xs text-muted-foreground">
                  <HoverTip title="Base" trigger={<>Base:</>}>
                    The species this form transforms from.
                  </HoverTip>{' '}
                  <Link to={`/pokemon/${form.basePokemonId}`} className="font-medium text-foreground hover:underline">
                    {form.baseName}
                  </Link>
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {!isLoading && filtered.length === 0 && (
        <p className="py-12 text-center text-muted-foreground">No forms match that search.</p>
      )}
    </div>
  );
};

export default FormGallery;
