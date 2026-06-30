import React, { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  DAMAGE_CLASSES,
  ENTITY_FILTER_META,
  ENTITY_LABELS,
  FILTER_ENTITIES,
  GROWTH_RATES,
  POKEMON_TYPES,
  type FilterEntity,
} from '@masterpokedex/shared';
import { usePokemonList } from '@/hooks/api/pokemon';
import { useAbilities, useItemSearch, useLocationSearch, useMoves } from '@/hooks/api/dex';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { PlusCircle, MinusCircle, Filter } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { capitalize } from '../utils/helpers';
import LoadingSpinner from '../components/LoadingSpinner';
import HelpTip from '../components/HelpTip';
import { ENTITY_COLUMNS } from './advanced/columns';

/**
 * Advanced search over the dex's reference entities — Pokémon, moves and
 * items so far. One condition-builder, parameterized by the shared
 * ENTITY_FILTER_META registry (the same whitelists the server validates
 * against), and one generic results table driven by ENTITY_COLUMNS.
 */

type DraftCondition = {
  id: string;
  field: string;
  op: string;
  value: string;
};

type AppliedFilter = { match: 'all' | 'any'; conditions: Array<Record<string, unknown>> };

const OP_LABELS: Record<string, string> = {
  eq: 'equals',
  neq: 'does not equal',
  contains: 'contains',
  startsWith: 'starts with',
  endsWith: 'ends with',
  gt: '>',
  gte: '≥',
  lt: '<',
  lte: '≤',
  in: 'is one of',
};

let conditionSeq = 0;
const newCondition = (entity: FilterEntity): DraftCondition => ({
  id: `c${++conditionSeq}`,
  field: ENTITY_FILTER_META[entity][0]!.field,
  op: ENTITY_FILTER_META[entity][0]!.ops[0] as string,
  value: '',
});

function metaFor(entity: FilterEntity, field: string) {
  const metas = ENTITY_FILTER_META[entity];
  return metas.find((m) => m.field === field) ?? metas[0]!;
}

/** Draft rows → the shared filter shape; incomplete rows are simply skipped. */
function buildFilter(entity: FilterEntity, drafts: DraftCondition[], match: 'all' | 'any'): AppliedFilter {
  const conditions: Array<Record<string, unknown>> = [];
  for (const draft of drafts) {
    const meta = metaFor(entity, draft.field);
    if (draft.value === '' && meta.kind !== 'boolean') continue;
    if (meta.kind === 'number') {
      const value = Number(draft.value);
      if (!Number.isFinite(value)) continue;
      conditions.push({ field: draft.field, op: draft.op, value });
    } else if (meta.kind === 'boolean') {
      conditions.push({ field: draft.field, op: 'eq', value: draft.value !== 'false' });
    } else {
      conditions.push({ field: draft.field, op: draft.op, value: draft.value });
    }
  }
  return { match, conditions };
}

function defaultColumns(entity: FilterEntity): string[] {
  return ENTITY_COLUMNS[entity].filter((c) => c.defaultOn).map((c) => c.key);
}

const ENUM_OPTIONS: Record<string, readonly string[]> = {
  type: POKEMON_TYPES,
  growthRate: GROWTH_RATES,
  damageClass: DAMAGE_CLASSES,
};

const PokemonFilter: React.FC = () => {
  const [params, setParams] = useSearchParams();
  const rawEntity = params.get('entity');
  const entity: FilterEntity = (FILTER_ENTITIES as readonly string[]).includes(rawEntity ?? '')
    ? (rawEntity as FilterEntity)
    : 'pokemon';

  const [drafts, setDrafts] = useState<DraftCondition[]>([newCondition(entity)]);
  const [match, setMatch] = useState<'all' | 'any'>('all');
  const [applied, setApplied] = useState<AppliedFilter | null>(null);
  const [columns, setColumns] = useState<string[]>(defaultColumns(entity));

  const switchEntity = (next: FilterEntity) => {
    setParams(next === 'pokemon' ? {} : { entity: next }, { replace: true });
    setDrafts([newCondition(next)]);
    setApplied(null);
    setColumns(defaultColumns(next));
    setMatch('all');
  };

  const enabled = applied !== null;
  const pokemonQuery = usePokemonList(
    { filter: (applied as never) ?? undefined, limit: 50 },
    { enabled: enabled && entity === 'pokemon' },
  );
  const moveQuery = useMoves(
    { filter: (applied as never) ?? undefined, limit: 50 },
    { enabled: enabled && entity === 'move' },
  );
  const abilityQuery = useAbilities(
    { filter: (applied as never) ?? undefined, limit: 50 },
    { enabled: enabled && entity === 'ability' },
  );
  const itemQuery = useItemSearch(
    { filter: (applied as never) ?? undefined, sort: 'name', limit: 50 },
    { enabled: enabled && entity === 'item' },
  );
  const locationQuery = useLocationSearch(
    { filter: (applied as never) ?? undefined, limit: 50 },
    { enabled: enabled && entity === 'location' },
  );
  const query =
    entity === 'pokemon'
      ? pokemonQuery
      : entity === 'move'
        ? moveQuery
        : entity === 'ability'
          ? abilityQuery
          : entity === 'location'
            ? locationQuery
            : itemQuery;

  const results = enabled ? (query.data?.pages.flatMap((p) => p.items as never[]) ?? []) : [];
  const activeColumns = ENTITY_COLUMNS[entity].filter((c) => columns.includes(c.key));

  const appliedSummary = useMemo(() => {
    if (!applied || applied.conditions.length === 0) return null;
    return applied.conditions
      .map((c) => `${metaFor(entity, c.field as string).label} ${OP_LABELS[c.op as string] ?? c.op} ${String(c.value)}`)
      .join(applied.match === 'all' ? ' AND ' : ' OR ');
  }, [applied, entity]);

  const updateDraft = (id: string, patch: Partial<DraftCondition>) => {
    setDrafts((current) =>
      current.map((draft) => {
        if (draft.id !== id) return draft;
        const next = { ...draft, ...patch };
        if (patch.field) {
          // Changing the field resets operator and value to something valid.
          const meta = metaFor(entity, patch.field);
          next.op = meta.ops.includes(next.op) && next.op !== 'in' ? next.op : (meta.ops[0] as string);
          next.value = meta.kind === 'boolean' ? 'true' : '';
        }
        return next;
      }),
    );
  };

  const renderValueInput = (draft: DraftCondition) => {
    const meta = metaFor(entity, draft.field);
    const enumValues = ENUM_OPTIONS[meta.kind];
    if (enumValues) {
      return (
        <Select value={draft.value} onValueChange={(value) => updateDraft(draft.id, { value })}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder={`Pick a ${meta.label.toLowerCase()}`} />
          </SelectTrigger>
          <SelectContent>
            {enumValues.map((option) => (
              <SelectItem key={option} value={option}>
                {capitalize(option.replace(/-/g, ' '))}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    }
    switch (meta.kind) {
      case 'boolean':
        return (
          <Select value={draft.value || 'true'} onValueChange={(value) => updateDraft(draft.id, { value })}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="true">Yes</SelectItem>
              <SelectItem value="false">No</SelectItem>
            </SelectContent>
          </Select>
        );
      case 'number':
        return (
          <Input
            type="number"
            value={draft.value}
            onChange={(e) => updateDraft(draft.id, { value: e.target.value })}
            placeholder="Value"
          />
        );
      default:
        return (
          <Input
            value={draft.value}
            onChange={(e) => updateDraft(draft.id, { value: e.target.value })}
            placeholder="Value"
          />
        );
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-extrabold mb-2">Advanced search</h1>
          <p className="text-muted-foreground">Build multi-condition queries over the whole dex</p>
        </div>
        <Tabs value={entity} onValueChange={(value) => switchEntity(value as FilterEntity)}>
          <TabsList>
            {FILTER_ENTITIES.map((option) => (
              <TabsTrigger key={option} value={option}>
                {ENTITY_LABELS[option]}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      <Card className="mb-6">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Conditions
            <HelpTip title="Conditions">
              Each row is one requirement. “Match all” needs every row to hold (AND),
              “match any” needs one (OR). The fields are the games' own numbers —
              Base stat total, Base experience, Capture rate, Fling power, Priority and the
              rest are explained on the pages they come from.
            </HelpTip>
          </CardTitle>
          <Tabs value={match} onValueChange={(value) => setMatch(value as 'all' | 'any')}>
            <TabsList>
              <TabsTrigger value="all">Match all</TabsTrigger>
              <TabsTrigger value="any">Match any</TabsTrigger>
            </TabsList>
          </Tabs>
        </CardHeader>
        <CardContent className="space-y-3">
          {drafts.map((draft) => {
            const meta = metaFor(entity, draft.field);
            return (
              <div key={draft.id} className="grid grid-cols-1 md:grid-cols-[1fr_1fr_1fr_auto] gap-2 items-center">
                <Select value={draft.field} onValueChange={(field) => updateDraft(draft.id, { field })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ENTITY_FILTER_META[entity].map((m) => (
                      <SelectItem key={m.field} value={m.field}>
                        {m.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={draft.op} onValueChange={(op) => updateDraft(draft.id, { op })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {meta.ops
                      .filter((op) => op !== 'in')
                      .map((op) => (
                        <SelectItem key={op} value={op}>
                          {OP_LABELS[op] ?? op}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>

                {renderValueInput(draft)}

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setDrafts((c) => (c.length > 1 ? c.filter((d) => d.id !== draft.id) : c))}
                  disabled={drafts.length <= 1}
                  aria-label="Remove condition"
                >
                  <MinusCircle className="h-4 w-4" />
                </Button>
              </div>
            );
          })}

          <div className="flex flex-wrap gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={() => setDrafts((c) => [...c, newCondition(entity)])}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Add condition
            </Button>
            <Button size="sm" onClick={() => setApplied(buildFilter(entity, drafts, match))}>
              Apply filter
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setDrafts([newCondition(entity)]);
                setApplied(null);
              }}
            >
              Reset
            </Button>
          </div>

          {appliedSummary && (
            <div className="text-sm text-muted-foreground border-t pt-3">
              <span className="font-medium">Applied:</span> {appliedSummary}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base">Columns</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-4">
          {ENTITY_COLUMNS[entity].map((column) => (
            <label key={column.key} className="flex items-center gap-2 text-sm cursor-pointer">
              <Checkbox
                checked={columns.includes(column.key)}
                onCheckedChange={(checked) =>
                  setColumns((current) =>
                    checked
                      ? ENTITY_COLUMNS[entity].map((c) => c.key).filter((k) => current.includes(k) || k === column.key)
                      : current.filter((k) => k !== column.key),
                  )
                }
              />
              {column.label}
            </label>
          ))}
        </CardContent>
      </Card>

      {applied === null ? (
        <div className="text-center py-12 text-muted-foreground">
          Build a query above and press <span className="font-medium">Apply filter</span>.
        </div>
      ) : query.isLoading || (query.isFetching && results.length === 0) ? (
        <LoadingSpinner />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {results.length} result{results.length === 1 ? '' : 's'}
              {query.hasNextPage ? '+' : ''}
            </CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  {activeColumns.map((column) => (
                    <TableHead key={column.key}>
                      {column.label}
                      {column.help && (
                        <HelpTip title={column.label} className="ml-1">
                          {column.help}
                        </HelpTip>
                      )}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {results.map((row, index) => (
                  <TableRow key={(row as { id?: number }).id ?? index}>
                    {activeColumns.map((column) => (
                      <TableCell key={column.key}>{column.render(row as never)}</TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {results.length === 0 && (
              <p className="text-center text-muted-foreground py-8">
                No {ENTITY_LABELS[entity].toLowerCase()} match this filter.
              </p>
            )}

            {query.hasNextPage && (
              <div className="flex justify-center mt-4">
                <Button variant="outline" onClick={() => query.fetchNextPage()} disabled={query.isFetchingNextPage}>
                  {query.isFetchingNextPage ? 'Loading…' : 'Load more'}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default PokemonFilter;
