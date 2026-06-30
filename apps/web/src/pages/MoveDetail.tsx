import React, { useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import type { MoveLearner } from '@masterpokedex/shared';
import { useMove } from '@/hooks/api/dex';
import LoadingSpinner from '../components/LoadingSpinner';
import HelpTip from '../components/HelpTip';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { TypeBadge } from '../components/ui/type-badge';
import { ChevronLeft } from 'lucide-react';
import { capitalize } from '../utils/helpers';
import { pokemonImage, spriteFallback, useSpritePref } from '@/prefs/SpritePrefContext';
import { cn } from '@/lib/utils';

const METHOD_TITLES: Record<string, string> = {
  'level-up': 'By level up',
  machine: 'By TM',
  egg: 'As an egg move',
  tutor: 'From a Move Tutor',
};

const LearnerRow: React.FC<{ learner: MoveLearner; showLevel: boolean }> = ({ learner, showLevel }) => {
  const { spriteStyle } = useSpritePref();
  return (
    <TableRow>
      {showLevel && <TableCell className="w-12 text-muted-foreground">{learner.level ?? '—'}</TableCell>}
      <TableCell>
        <Link to={`/pokemon/${learner.pokemonId}`} className="flex items-center gap-2 font-medium hover:underline">
          <img
            src={pokemonImage(learner.pokemonId, spriteStyle)}
            alt=""
            loading="lazy"
            onError={(e) => spriteFallback(e, learner.pokemonId)}
            className={cn('h-8 w-8 object-contain', spriteStyle === 'sprite' && 'pixelated')}
          />
          {learner.formLabel ?? learner.displayName}
        </Link>
      </TableCell>
      <TableCell>
        <div className="flex gap-1">
          {learner.types.map((type) => (
            <TypeBadge key={type} type={type} size="sm" />
          ))}
        </div>
      </TableCell>
    </TableRow>
  );
};

/** One move: its numbers, its effect, and every Pokémon that can learn it. */
const MoveDetail: React.FC = () => {
  const { idOrName } = useParams();
  const { data: move, isLoading, error } = useMove(idOrName);

  const byMethod = useMemo(() => {
    const buckets = new Map<string, MoveLearner[]>();
    for (const learner of move?.learners ?? []) {
      const bucket = buckets.get(learner.learnMethod) ?? [];
      bucket.push(learner);
      buckets.set(learner.learnMethod, bucket);
    }
    return buckets;
  }, [move]);

  if (isLoading) return <LoadingSpinner />;
  if (error || !move) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <h2 className="mb-2 text-2xl font-bold">Move not found</h2>
        <Link to="/moves" className="text-pokebrand-red hover:underline">
          Back to all moves
        </Link>
      </div>
    );
  }

  const facts: Array<{ label: string; value: React.ReactNode; help?: string }> = [
    { label: 'Type', value: <TypeBadge type={move.type} icon /> },
    {
      label: 'Class',
      value: capitalize(move.damageClass),
      help: 'Physical moves use Attack, special moves use Sp. Attack, and status moves deal no direct damage.',
    },
    { label: 'Power', value: move.power ?? '—', help: 'Base damage — "—" means variable or no direct damage.' },
    { label: 'Accuracy', value: move.accuracy ?? '—', help: 'Chance to hit, in percent — "—" never misses.' },
    { label: 'PP', value: move.pp ?? '—', help: 'Power Points — how many uses before resting.' },
    {
      label: 'Priority',
      value: move.priority,
      help: 'Turn order jumper: higher priority acts first regardless of Speed; 0 is normal, negatives go last.',
    },
    { label: 'Introduced', value: move.generation ? `Generation ${move.generation}` : '—' },
  ];

  return (
    <div className="container mx-auto px-4 py-8">
      <Link to="/moves" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeft className="h-4 w-4" />
        All moves
      </Link>

      <h1 className="mb-6 text-3xl font-extrabold md:text-4xl">{move.displayName}</h1>

      <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Move data</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
              {facts.map((fact) => (
                <React.Fragment key={fact.label}>
                  <dt className="text-sm text-muted-foreground">
                    {fact.label}
                    {fact.help && (
                      <HelpTip title={fact.label} className="ml-1">
                        {fact.help}
                      </HelpTip>
                    )}
                  </dt>
                  <dd className="text-sm font-medium">{fact.value}</dd>
                </React.Fragment>
              ))}
            </dl>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Effect</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              {move.shortEffect ?? 'No effect text is recorded for this move.'}
            </p>
          </CardContent>
        </Card>
      </div>

      <h2 className="mb-4 text-2xl font-bold">Learned by {move.learners.length} Pokémon</h2>
      <div className="space-y-6">
        {[...byMethod.entries()].map(([method, learners]) => (
          <div key={method}>
            <h3 className="mb-2 text-sm font-semibold capitalize text-muted-foreground">
              {METHOD_TITLES[method] ?? method.replace(/-/g, ' ')} · {learners.length}
            </h3>
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    {method === 'level-up' && <TableHead>Lv.</TableHead>}
                    <TableHead>Pokémon</TableHead>
                    <TableHead>Types</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {learners.map((learner) => (
                    <LearnerRow
                      key={`${learner.pokemonId}-${learner.level ?? ''}`}
                      learner={learner}
                      showLevel={method === 'level-up'}
                    />
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MoveDetail;
