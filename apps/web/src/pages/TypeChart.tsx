import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { POKEMON_TYPES } from '@masterpokedex/shared';
import { useTypeChart } from '@/hooks/api/dex';
import LoadingSpinner from '../components/LoadingSpinner';
import { TypeIcon } from '../components/ui/type-icon';
import { capitalize } from '../utils/helpers';
import { cn } from '@/lib/utils';

const TYPE_BG: Record<string, string> = {
  normal: 'bg-poketype-normal',
  fire: 'bg-poketype-fire',
  water: 'bg-poketype-water',
  electric: 'bg-poketype-electric',
  grass: 'bg-poketype-grass',
  ice: 'bg-poketype-ice',
  fighting: 'bg-poketype-fighting',
  poison: 'bg-poketype-poison',
  ground: 'bg-poketype-ground',
  flying: 'bg-poketype-flying',
  psychic: 'bg-poketype-psychic',
  bug: 'bg-poketype-bug',
  rock: 'bg-poketype-rock',
  ghost: 'bg-poketype-ghost',
  dragon: 'bg-poketype-dragon',
  dark: 'bg-poketype-dark',
  steel: 'bg-poketype-steel',
  fairy: 'bg-poketype-fairy',
};

function cellStyle(factor: number): { className: string; label: string } {
  switch (factor) {
    case 0:
      return { className: 'bg-zinc-800 text-white dark:bg-zinc-950', label: '0' };
    case 50:
      return { className: 'bg-red-200 text-red-900 dark:bg-red-900/60 dark:text-red-200', label: '½' };
    case 200:
      return { className: 'bg-green-300 text-green-950 dark:bg-green-800 dark:text-green-100', label: '2' };
    default:
      return { className: 'bg-muted/40 text-transparent', label: '·' };
  }
}

/**
 * The classic 18×18 chart: attacking type down the side, defending type
 * across the top, from the same 324-row efficacy table the matchup panels
 * use. Headers link to each type's own page.
 */
const TypeChart: React.FC = () => {
  const { data, isLoading } = useTypeChart();

  const factorLookup = useMemo(() => {
    const map = new Map<string, number>();
    for (const cell of data?.items ?? []) {
      map.set(`${cell.attack}:${cell.defend}`, cell.factor);
    }
    return map;
  }, [data]);

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl md:text-4xl font-extrabold mb-2">Type chart</h1>
      <p className="text-muted-foreground mb-3">
        Attacking type on the left, defending type along the top. 2 is super effective, ½ not very
        effective, 0 no effect, and a blank cell is plain ×1.
      </p>
      <div className="mb-8 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
        {[
          { factor: 200, text: 'Super effective (×2)' },
          { factor: 50, text: 'Not very effective (×½)' },
          { factor: 0, text: 'No effect (×0)' },
          { factor: 100, text: 'Normal damage (×1)' },
        ].map(({ factor, text }) => {
          const { className, label } = cellStyle(factor);
          return (
            <span key={factor} className="inline-flex items-center gap-1.5">
              <span className={cn('flex h-5 w-5 items-center justify-center rounded text-sm font-bold', className)}>
                {label}
              </span>
              {text}
            </span>
          );
        })}
      </div>

      {isLoading ? (
        <LoadingSpinner />
      ) : (
        <div className="overflow-x-auto pb-4">
          <table className="mx-auto border-separate border-spacing-0.5">
            <thead>
              <tr>
                <th className="sticky left-0 z-10 bg-background p-1 text-right text-xs text-muted-foreground">
                  Atk ↓ / Def →
                </th>
                {POKEMON_TYPES.map((defend) => (
                  <th key={defend} className="p-0">
                    <Link
                      to={`/types/${defend}`}
                      title={capitalize(defend)}
                      className={cn(
                        'flex h-8 w-8 items-center justify-center rounded text-white transition-[filter] hover:brightness-110',
                        TYPE_BG[defend],
                      )}
                    >
                      <TypeIcon type={defend} className="h-4 w-4" />
                    </Link>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {POKEMON_TYPES.map((attack) => (
                <tr key={attack}>
                  <th className="sticky left-0 z-10 bg-background p-0 pr-1">
                    <Link
                      to={`/types/${attack}`}
                      className={cn(
                        'flex h-8 min-w-24 items-center gap-1.5 rounded px-2 text-xs font-semibold capitalize text-white transition-[filter] hover:brightness-110',
                        TYPE_BG[attack],
                      )}
                    >
                      <TypeIcon type={attack} className="h-3.5 w-3.5" />
                      {attack}
                    </Link>
                  </th>
                  {POKEMON_TYPES.map((defend) => {
                    const factor = factorLookup.get(`${attack}:${defend}`) ?? 100;
                    const { className, label } = cellStyle(factor);
                    return (
                      <td key={defend} className="p-0">
                        <div
                          title={`${capitalize(attack)} → ${capitalize(defend)}: ×${factor / 100}`}
                          className={cn(
                            'flex h-8 w-8 items-center justify-center rounded text-sm font-bold',
                            className,
                          )}
                        >
                          {label}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default TypeChart;
