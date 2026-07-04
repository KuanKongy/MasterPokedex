import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import type { Activity } from '@masterpokedex/shared';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { resolveAsset } from '@/lib/assets';
import { cn } from '@/lib/utils';

/** Feeds longer than this start out height-capped with their own scroller. */
const COLLAPSE_AT = 6;

const pokemonLink = (a: Activity) => (
  <Link to={`/pokemon/${a.payload.pokemonId}`} className="font-medium hover:underline">
    {String(a.payload.nickname ?? `#${a.payload.pokemonId}`)}
  </Link>
);

/** What each event reads as; names link to the thing they name. */
export const ACTIVITY_TEXT: Record<Activity['kind'], (a: Activity) => React.ReactNode> = {
  caught: (a) => <>caught {pokemonLink(a)}</>,
  shiny_caught: (a) => <>caught a shiny {pokemonLink(a)} ✨</>,
  team_created: (a) => <>created the team “{String(a.payload.teamName ?? '')}”</>,
  friend_added: (a) =>
    a.payload.username ? (
      <>
        became friends with{' '}
        <Link to={`/trainer/${a.payload.username}`} className="font-medium hover:underline">
          @{String(a.payload.username)}
        </Link>
      </>
    ) : (
      <>made a new friend</>
    ),
  badge_earned: () => 'earned a badge',
};

/**
 * Structural subset of an infinite query over activity pages, so the feed
 * renders your own feed (useActivityFeed) and another trainer's
 * (useTrainerActivity) without caring which hook produced it.
 */
type FeedQuery = {
  data?: { pages: Array<{ items: Activity[] }> };
  isLoading: boolean;
  fetchNextPage: () => void;
  hasNextPage?: boolean;
  isFetchingNextPage: boolean;
};

const ActivityFeed: React.FC<{ query: FeedQuery; emptyTitle?: string; emptyText?: string }> = ({
  query,
  emptyTitle = 'No activity yet',
  emptyText = 'Catch a Pokémon or make a friend and it shows up here.',
}) => {
  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = query;
  const events = data?.pages.flatMap((page) => page.items) ?? [];
  const [expanded, setExpanded] = useState(false);
  const collapsible = events.length > COLLAPSE_AT;

  if (isLoading) return <p className="text-sm text-muted-foreground p-4">Loading activity…</p>;
  if (events.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          <p className="mb-2 font-medium text-foreground">{emptyTitle}</p>
          <p className="text-sm">{emptyText}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-2">
      {/* A long feed stays a window, not a wall: height-capped with its own
          scroller until expanded. */}
      <div className={cn('space-y-2', collapsible && !expanded && 'max-h-96 overflow-y-auto pr-1')}>
        {events.map((event) => (
          <div key={event.id} className="flex items-center gap-3 p-3 border rounded-md text-sm">
            <Link to={`/trainer/${event.trainer.username}`} className="shrink-0">
              <Avatar className="h-8 w-8">
                <AvatarImage src={event.trainer.avatarUrl ? resolveAsset(event.trainer.avatarUrl) : undefined} alt={event.trainer.displayName} />
                <AvatarFallback>{event.trainer.displayName.charAt(0)}</AvatarFallback>
              </Avatar>
            </Link>
            <div className="flex-1">
              <Link to={`/trainer/${event.trainer.username}`} className="font-medium hover:underline">
                {event.trainer.displayName}
              </Link>{' '}
              {ACTIVITY_TEXT[event.kind]?.(event) ?? event.kind}
            </div>
            <span className="text-xs text-muted-foreground">
              {new Date(event.createdAt).toLocaleDateString()}
            </span>
          </div>
        ))}
      </div>
      {(collapsible || hasNextPage) && (
        <div className="flex justify-center gap-2 pt-2">
          {collapsible && (
            <Button variant="ghost" size="sm" onClick={() => setExpanded((value) => !value)}>
              {expanded ? (
                <>
                  Collapse <ChevronUp className="ml-1 h-4 w-4" />
                </>
              ) : (
                <>
                  Expand <ChevronDown className="ml-1 h-4 w-4" />
                </>
              )}
            </Button>
          )}
          {hasNextPage && (
            <Button variant="outline" size="sm" onClick={() => fetchNextPage()} disabled={isFetchingNextPage}>
              {isFetchingNextPage ? 'Loading…' : 'Older activity'}
            </Button>
          )}
        </div>
      )}
    </div>
  );
};

export default ActivityFeed;
