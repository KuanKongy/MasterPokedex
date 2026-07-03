import React, { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import type { EvolutionChain, MegaSummary } from '@masterpokedex/shared';
import { useAllEvolutionChains, useGmax, useMegas } from '@/hooks/api/dex';
import LoadingSpinner from '../components/LoadingSpinner';
import EvolutionTree from '../components/pokemon/EvolutionTree';
import { evolutionCondition } from '../components/pokemon/evolution-utils';
import { megaCaption } from '../components/pokemon/mega-stones';
import SearchField from '../components/SearchField';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { TypeBadge } from '../components/ui/type-badge';
import { ALWAYS_SHOW_MEGAS, useBooleanPref } from '@/hooks/useBooleanPref';
import { capitalize } from '../utils/helpers';
import { pokemonImage, spriteFallback, useSpritePref } from '@/prefs/SpritePrefContext';
import { cn } from '@/lib/utils';

const PAGE_SIZE = 20;
const MAIN_TRIGGERS = new Set(['level-up', 'use-item', 'trade']);

/** How every non-base member of the family evolves, folded for filtering. */
function chainFacts(chain: EvolutionChain) {
  const triggers = new Set<string>();
  let friendship = false;
  for (const node of chain.nodes) {
    if (node.from == null) continue;
    const methods: Array<{ trigger?: string | null; minHappiness?: number | null }> =
      node.methods.length > 0 ? node.methods : [node];
    for (const method of methods) {
      if (method.trigger) triggers.add(method.trigger);
      if (method.minHappiness != null) friendship = true;
    }
  }
  return { triggers, friendship };
}

function baseName(chain: EvolutionChain): string {
  const base = chain.nodes.find((node) => node.from == null) ?? chain.nodes[0];
  return base?.name ?? '';
}

/**
 * Every evolution family, one card per chain: the browsable index behind the
 * per-Pokémon chain on the detail page. Branching families (Eevee) fan out
 * as a real tree via EvolutionTree, one branch per row, and the same Megas
 * and Gigantamax switches as the detail card graft each family's battle
 * forms on as parallel dashed branches. The forms come from the two global
 * lists (they carry speciesId), joined to the chains client-side.
 */
const Evolutions: React.FC = () => {
  const [params, setParams] = useSearchParams();
  const q = params.get('q') ?? '';
  const method = params.get('method') ?? 'all';
  const sortParam = params.get('sort');
  const sort = sortParam === 'name' || sortParam === 'size' ? sortParam : 'dex';
  const { spriteStyle } = useSpritePref();

  const patch = (patchObj: Record<string, string | null>) => {
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        for (const [key, value] of Object.entries(patchObj)) {
          if (value === null || value === '' || value === 'all') next.delete(key);
          else next.set(key, value);
        }
        return next;
      },
      { replace: true },
    );
  };

  const [alwaysShowForms] = useBooleanPref(ALWAYS_SHOW_MEGAS);
  const [megaOverride, setMegaOverride] = useState<boolean | null>(null);
  const [gmaxOverride, setGmaxOverride] = useState<boolean | null>(null);
  const showMegas = megaOverride ?? alwaysShowForms;
  const showGmax = gmaxOverride ?? alwaysShowForms;

  // All 541 families load once and filter/sort client-side, like Moves.
  const { data: allChains, isLoading } = useAllEvolutionChains();
  const chains = useMemo(() => {
    const ql = q.trim().toLowerCase();
    const filtered = (allChains ?? []).filter((chain) => {
      if (ql && !chain.nodes.some((node) => node.name.toLowerCase().includes(ql))) return false;
      if (method === 'all') return true;
      const facts = chainFacts(chain);
      if (method === 'friendship') return facts.friendship;
      if (method === 'other') return [...facts.triggers].some((t) => !MAIN_TRIGGERS.has(t));
      return facts.triggers.has(method);
    });
    if (sort === 'name') {
      return [...filtered].sort((a, b) => baseName(a).localeCompare(baseName(b)));
    }
    if (sort === 'size') {
      return [...filtered].sort((a, b) => b.nodes.length - a.nodes.length || a.chainId - b.chainId);
    }
    return filtered;
  }, [allChains, q, method, sort]);

  const [shown, setShown] = useState(PAGE_SIZE);
  useEffect(() => setShown(PAGE_SIZE), [q, method, sort]);

  const { data: megas } = useMegas();
  const { data: gmaxes } = useGmax();
  const formsBySpecies = useMemo(() => {
    const map = new Map<number, Array<MegaSummary & { formKind: 'mega' | 'gmax' }>>();
    const add = (forms: MegaSummary[] | undefined, formKind: 'mega' | 'gmax') => {
      for (const form of forms ?? []) {
        const list = map.get(form.speciesId) ?? [];
        list.push({ ...form, formKind });
        map.set(form.speciesId, list);
      }
    };
    if (showMegas) add(megas?.items, 'mega');
    if (showGmax) add(gmaxes?.items, 'gmax');
    return map;
  }, [megas, gmaxes, showMegas, showGmax]);

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl md:text-4xl font-extrabold mb-2">Evolution chains</h1>
      <p className="text-muted-foreground mb-8">Every family, base form to final evolution</p>

      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex w-full flex-wrap gap-2 lg:w-auto">
          {/* Filters as you type; the whole list is client-side. */}
          <SearchField
            value={q}
            onChange={(value) => patch({ q: value || null })}
            onSubmit={() => undefined}
            placeholder="Find a family (e.g. eevee)…"
            className="w-full sm:max-w-xs"
          />
          <Select value={method} onValueChange={(value) => patch({ method: value })}>
            <SelectTrigger className="w-full sm:w-44" aria-label="Filter by evolution method">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Any method</SelectItem>
              <SelectItem value="level-up">Level up</SelectItem>
              <SelectItem value="use-item">Use item</SelectItem>
              <SelectItem value="trade">Trade</SelectItem>
              <SelectItem value="friendship">Friendship</SelectItem>
              <SelectItem value="other">Something stranger</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sort} onValueChange={(value) => patch({ sort: value === 'dex' ? null : value })}>
            <SelectTrigger className="w-full sm:w-48" aria-label="Sort families">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="dex">Dex order</SelectItem>
              <SelectItem value="name">Family name A to Z</SelectItem>
              <SelectItem value="size">Biggest families first</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <div className="flex items-center gap-2">
            <Switch id="chains-show-megas" checked={showMegas} onCheckedChange={setMegaOverride} />
            <Label htmlFor="chains-show-megas" className="cursor-pointer text-sm text-muted-foreground">
              Megas
            </Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch id="chains-show-gmax" checked={showGmax} onCheckedChange={setGmaxOverride} />
            <Label htmlFor="chains-show-gmax" className="cursor-pointer text-sm text-muted-foreground">
              Gigantamax
            </Label>
          </div>
        </div>
      </div>

      {isLoading ? (
        <LoadingSpinner />
      ) : (
        <>
          <div className="space-y-4">
            {chains.slice(0, shown).map((chain) => {
              const speciesIds = new Set(chain.nodes.map((node) => node.id));
              const battleForms = chain.nodes.flatMap((node) =>
                (formsBySpecies.get(node.id) ?? []).filter((form) => speciesIds.has(form.speciesId)),
              );
              const nodes = [
                ...chain.nodes.map((node) => ({
                  id: node.id,
                  from: node.from ?? null,
                  name: capitalize(node.name),
                  types: node.types,
                  formKind: undefined as 'mega' | 'gmax' | undefined,
                  caption: node.from != null ? evolutionCondition(node) : null,
                })),
                ...battleForms.map((form) => ({
                  id: form.id,
                  from: form.speciesId,
                  name: form.formLabel ?? capitalize(form.name),
                  types: form.types,
                  formKind: form.formKind as 'mega' | 'gmax' | undefined,
                  caption: form.formKind === 'mega' ? megaCaption(form.name) : 'Gigantamax Factor',
                })),
              ];
              return (
                <Card key={chain.chainId}>
                  <CardContent className="flex flex-wrap items-center justify-center gap-3 p-4">
                    <EvolutionTree
                      dense
                      nodes={nodes}
                      renderCard={(node) => (
                        <Link
                          to={`/pokemon/${node.id}`}
                          className={cn(
                            'flex w-32 flex-col items-center rounded-lg border p-3 transition-colors hover:border-pokebrand-extra/60',
                            node.formKind && 'border-dashed',
                          )}
                        >
                          <img
                            src={pokemonImage(node.id, spriteStyle)}
                            alt={node.name}
                            loading="lazy"
                            onError={(e) => spriteFallback(e, node.id, node.formKind ? node.from ?? undefined : undefined)}
                            className={cn('h-24 w-24 object-contain', spriteStyle === 'sprite' && 'pixelated')}
                          />
                          <span className="mt-1 w-full truncate text-center text-sm font-medium">
                            {node.name}
                          </span>
                          <span className="flex gap-0.5">
                            {node.types.map((type) => (
                              <TypeBadge key={type} type={type} size="sm" />
                            ))}
                          </span>
                        </Link>
                      )}
                    />
                    {nodes.length === 1 && (
                      <span className="text-sm text-muted-foreground">does not evolve</span>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
          {chains.length === 0 && (
            <p className="py-12 text-center text-muted-foreground">No families match those filters.</p>
          )}
          {chains.length > shown && (
            <div className="mt-6 flex justify-center">
              <Button variant="outline" onClick={() => setShown((n) => n + PAGE_SIZE)}>
                Show more families ({chains.length - shown} remaining)
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Evolutions;
