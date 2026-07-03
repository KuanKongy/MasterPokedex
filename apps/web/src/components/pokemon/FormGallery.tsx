import React, { useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  POKEMON_SORT_FIELDS,
  type MegaSummary,
  type PokemonSortField,
  type SortDir,
} from '@masterpokedex/shared';
import LoadingSpinner from '../LoadingSpinner';
import HelpTip, { HoverTip } from '../HelpTip';
import SearchField from '../SearchField';
import SegmentedToggle from '../SegmentedToggle';
import DexSpritesGrid from '../dex/DexSpritesGrid';
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
  const viewParam = params.get('view');
  const view: DexView = viewParam === 'sprites' || viewParam === 'table' ? viewParam : 'cards';
  const rawSort = params.get('sort');
  const sort: PokemonSortField = (POKEMON_SORT_FIELDS as readonly string[]).includes(rawSort ?? '')
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
    if (!ql) return forms;
    return forms.filter(
      (f) =>
        (f.formLabel ?? '').toLowerCase().includes(ql) ||
        f.name.toLowerCase().includes(ql) ||
        f.baseName.toLowerCase().includes(ql),
    );
  }, [forms, q]);

  const sorted = useMemo(
    () => (view === 'table' ? [...filtered].sort(makeComparator(FORM_SORT_GETTERS[sort], dir)) : filtered),
    [filtered, view, sort, dir],
  );

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="mb-2 text-3xl font-extrabold md:text-4xl">{title}</h1>
      <p className="mb-6 text-muted-foreground">
        {blurb(forms.length)}
        {help && (
          <HelpTip title={title} faq="mega-gigantamax" className="ml-1">
            {help}
          </HelpTip>
        )}
      </p>

      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        {/* Filters as you type; the whole list is client-side. */}
        <SearchField
          value={q}
          onChange={(value) => patchParams({ q: value || null })}
          onSubmit={() => undefined}
          placeholder="Search forms…"
          className="w-full max-w-md"
        />
        <div className="sm:ml-auto">
          <SegmentedToggle
            options={DEX_VIEWS}
            value={view}
            onChange={(next) => patchParams({ view: next === 'cards' ? null : next })}
            ariaLabel="Gallery style"
          />
        </div>
      </div>

      {isLoading ? (
        <LoadingSpinner />
      ) : view === 'sprites' ? (
        <DexSpritesGrid pokemon={filtered} />
      ) : view === 'table' ? (
        <DexStatsTable pokemon={sorted} sort={sort} dir={dir} onSort={handleSort} />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((form) => (
            <Card key={form.id} className="overflow-hidden">
              <CardContent className="p-4">
                <Link to={`/pokemon/${form.id}`} className="flex items-center gap-3">
                  <img
                    src={pokemonImage(form.id, spriteStyle)}
                    alt={form.formLabel ?? form.name}
                    loading="lazy"
                    onError={(e) => spriteFallback(e, form.id, form.basePokemonId)}
                    className={cn('h-20 w-20 shrink-0 object-contain', spriteStyle === 'sprite' && 'pixelated')}
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
