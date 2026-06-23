import React, { useMemo, useState } from 'react';
import {
  FILTER_FIELD_META,
  GROWTH_RATES,
  POKEMON_TYPES,
  type PokemonFilter as PokemonFilterType,
  type PokemonFilterCondition,
} from '@masterpokedex/shared';
import { usePokemonList } from '@/hooks/api/pokemon';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { PlusCircle, MinusCircle, Filter } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { capitalize } from '../utils/helpers';
import { TypeBadge } from '@/components/ui/type-badge';
import { Link } from 'react-router-dom';
import LoadingSpinner from '../components/LoadingSpinner';

/**
 * The advanced filter, rebuilt on the shared whitelist grammar. The field and
 * operator lists come from FILTER_FIELD_META — the same source the server
 * validates against — so the UI can never build a condition the API rejects.
 * Filtering happens server-side over the whole dex, not on 151 rows in memory.
 */

type DraftCondition = {
  id: string;
  field: string;
  op: string;
  value: string;
};

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

type ColumnKey =
  | 'image'
  | 'id'
  | 'name'
  | 'types'
  | 'total'
  | 'hp'
  | 'attack'
  | 'defense'
  | 'specialAttack'
  | 'specialDefense'
  | 'speed'
  | 'height'
  | 'weight'
  | 'baseExperience';

const ALL_COLUMNS: { key: ColumnKey; label: string }[] = [
  { key: 'image', label: 'Image' },
  { key: 'id', label: 'ID' },
  { key: 'name', label: 'Name' },
  { key: 'types', label: 'Types' },
  { key: 'total', label: 'Total' },
  { key: 'hp', label: 'HP' },
  { key: 'attack', label: 'Attack' },
  { key: 'defense', label: 'Defense' },
  { key: 'specialAttack', label: 'Sp. Atk' },
  { key: 'specialDefense', label: 'Sp. Def' },
  { key: 'speed', label: 'Speed' },
  { key: 'height', label: 'Height' },
  { key: 'weight', label: 'Weight' },
  { key: 'baseExperience', label: 'Base Exp.' },
];

const DEFAULT_COLUMNS: ColumnKey[] = ['image', 'id', 'name', 'types', 'total', 'hp', 'attack', 'defense', 'speed'];

let conditionSeq = 0;
const newCondition = (): DraftCondition => ({
  id: `c${++conditionSeq}`,
  field: 'name',
  op: 'contains',
  value: '',
});

function metaFor(field: string) {
  return FILTER_FIELD_META.find((m) => m.field === field) ?? FILTER_FIELD_META[0];
}

/** Draft rows → the shared filter shape; incomplete rows are simply skipped. */
function buildFilter(drafts: DraftCondition[], match: 'all' | 'any'): PokemonFilterType {
  const conditions: PokemonFilterCondition[] = [];
  for (const draft of drafts) {
    const meta = metaFor(draft.field);
    if (draft.value === '' && meta.kind !== 'boolean') continue;
    if (meta.kind === 'number') {
      const value = Number(draft.value);
      if (!Number.isFinite(value)) continue;
      conditions.push({ field: draft.field, op: draft.op, value } as PokemonFilterCondition);
    } else if (meta.kind === 'boolean') {
      conditions.push({
        field: draft.field,
        op: 'eq',
        value: draft.value !== 'false',
      } as PokemonFilterCondition);
    } else {
      conditions.push({ field: draft.field, op: draft.op, value: draft.value } as PokemonFilterCondition);
    }
  }
  return { match, conditions };
}

const PokemonFilter: React.FC = () => {
  const [drafts, setDrafts] = useState<DraftCondition[]>([newCondition()]);
  const [match, setMatch] = useState<'all' | 'any'>('all');
  const [applied, setApplied] = useState<PokemonFilterType | null>(null);
  const [columns, setColumns] = useState<ColumnKey[]>(DEFAULT_COLUMNS);

  const { data, isLoading, isFetching, fetchNextPage, hasNextPage, isFetchingNextPage } =
    usePokemonList({ filter: applied ?? undefined, limit: 50 }, { enabled: applied !== null });

  const results = applied !== null ? (data?.pages.flatMap((p) => p.items) ?? []) : [];
  const appliedSummary = useMemo(() => {
    if (!applied || applied.conditions.length === 0) return null;
    return applied.conditions
      .map((c) => `${metaFor(c.field).label} ${OP_LABELS[c.op] ?? c.op} ${String(c.value)}`)
      .join(applied.match === 'all' ? ' AND ' : ' OR ');
  }, [applied]);

  const updateDraft = (id: string, patch: Partial<DraftCondition>) => {
    setDrafts((current) =>
      current.map((draft) => {
        if (draft.id !== id) return draft;
        const next = { ...draft, ...patch };
        if (patch.field) {
          // Changing the field resets operator and value to something valid.
          const meta = metaFor(patch.field);
          next.op = meta.ops.includes(next.op) && next.op !== 'in' ? next.op : (meta.ops[0] as string);
          next.value = meta.kind === 'boolean' ? 'true' : '';
        }
        return next;
      }),
    );
  };

  const renderValueInput = (draft: DraftCondition) => {
    const meta = metaFor(draft.field);
    switch (meta.kind) {
      case 'type':
        return (
          <Select value={draft.value} onValueChange={(value) => updateDraft(draft.id, { value })}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Pick a type" />
            </SelectTrigger>
            <SelectContent>
              {POKEMON_TYPES.map((type) => (
                <SelectItem key={type} value={type} className="capitalize">
                  {capitalize(type)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      case 'growthRate':
        return (
          <Select value={draft.value} onValueChange={(value) => updateDraft(draft.id, { value })}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Pick a growth rate" />
            </SelectTrigger>
            <SelectContent>
              {GROWTH_RATES.map((rate) => (
                <SelectItem key={rate} value={rate}>
                  {capitalize(rate.replace(/-/g, ' '))}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
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
      <h1 className="text-3xl md:text-4xl font-extrabold mb-2">Pokémon Filter</h1>
      <p className="text-muted-foreground mb-8">
        Build multi-condition queries over every Pokémon in the dex
      </p>

      <Card className="mb-6">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Conditions
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
            const meta = metaFor(draft.field);
            return (
              <div key={draft.id} className="grid grid-cols-1 md:grid-cols-[1fr_1fr_1fr_auto] gap-2 items-center">
                <Select value={draft.field} onValueChange={(field) => updateDraft(draft.id, { field })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FILTER_FIELD_META.map((m) => (
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
            <Button variant="outline" size="sm" onClick={() => setDrafts((c) => [...c, newCondition()])}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Add condition
            </Button>
            <Button size="sm" onClick={() => setApplied(buildFilter(drafts, match))}>
              Apply filter
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setDrafts([newCondition()]);
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
          {ALL_COLUMNS.map((column) => (
            <label key={column.key} className="flex items-center gap-2 text-sm cursor-pointer">
              <Checkbox
                checked={columns.includes(column.key)}
                onCheckedChange={(checked) =>
                  setColumns((current) =>
                    checked
                      ? [...ALL_COLUMNS.map((c) => c.key).filter((k) => current.includes(k) || k === column.key)]
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
      ) : isLoading || (isFetching && results.length === 0) ? (
        <LoadingSpinner />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {results.length} result{results.length === 1 ? '' : 's'}
              {hasNextPage ? '+' : ''}
            </CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  {ALL_COLUMNS.filter((c) => columns.includes(c.key)).map((column) => (
                    <TableHead key={column.key}>{column.label}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {results.map((pokemon) => (
                  <TableRow key={pokemon.id}>
                    {columns.includes('image') && (
                      <TableCell>
                        <Link to={`/pokemon/${pokemon.id}`}>
                          {pokemon.sprite && (
                            <img src={pokemon.sprite} alt={pokemon.name} className="w-10 h-10 pixelated" />
                          )}
                        </Link>
                      </TableCell>
                    )}
                    {columns.includes('id') && <TableCell>#{pokemon.id}</TableCell>}
                    {columns.includes('name') && (
                      <TableCell>
                        <Link to={`/pokemon/${pokemon.id}`} className="font-medium hover:underline">
                          {capitalize(pokemon.name)}
                        </Link>
                      </TableCell>
                    )}
                    {columns.includes('types') && (
                      <TableCell>
                        <div className="flex gap-1">
                          {pokemon.types.map((type) => (
                            <TypeBadge key={type} type={type} />
                          ))}
                        </div>
                      </TableCell>
                    )}
                    {columns.includes('total') && (
                      <TableCell>
                        <Badge variant="secondary">{pokemon.stats.total}</Badge>
                      </TableCell>
                    )}
                    {columns.includes('hp') && <TableCell>{pokemon.stats.hp}</TableCell>}
                    {columns.includes('attack') && <TableCell>{pokemon.stats.attack}</TableCell>}
                    {columns.includes('defense') && <TableCell>{pokemon.stats.defense}</TableCell>}
                    {columns.includes('specialAttack') && <TableCell>{pokemon.stats.specialAttack}</TableCell>}
                    {columns.includes('specialDefense') && <TableCell>{pokemon.stats.specialDefense}</TableCell>}
                    {columns.includes('speed') && <TableCell>{pokemon.stats.speed}</TableCell>}
                    {columns.includes('height') && <TableCell>{pokemon.height}</TableCell>}
                    {columns.includes('weight') && <TableCell>{pokemon.weight}</TableCell>}
                    {columns.includes('baseExperience') && <TableCell>{pokemon.baseExperience ?? '—'}</TableCell>}
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {results.length === 0 && (
              <p className="text-center text-muted-foreground py-8">No Pokémon match this filter.</p>
            )}

            {hasNextPage && (
              <div className="flex justify-center mt-4">
                <Button variant="outline" onClick={() => fetchNextPage()} disabled={isFetchingNextPage}>
                  {isFetchingNextPage ? 'Loading…' : 'Load more'}
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
