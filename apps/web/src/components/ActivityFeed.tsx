import React from 'react';
import type { Activity } from '@masterpokedex/shared';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { resolveAsset } from '@/lib/assets';

export const ACTIVITY_TEXT: Record<Activity['kind'], (a: Activity) => string> = {
  caught: (a) => `caught ${a.payload.nickname ?? `#${a.payload.pokemonId}`}`,
  shiny_caught: (a) => `caught a shiny ${a.payload.nickname ?? `#${a.payload.pokemonId}`} ✨`,
  team_created: (a) => `created the team “${a.payload.teamName}”`,
  friend_added: (a) => `became friends with @${a.payload.username}`,
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
      {events.map((event) => (
        <div key={event.id} className="flex items-center gap-3 p-3 border rounded-md text-sm">
          <Avatar className="h-8 w-8">
            <AvatarImage src={event.trainer.avatarUrl ? resolveAsset(event.trainer.avatarUrl) : undefined} alt={event.trainer.displayName} />
            <AvatarFallback>{event.trainer.displayName.charAt(0)}</AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <span className="font-medium">{event.trainer.displayName}</span>{' '}
            {ACTIVITY_TEXT[event.kind]?.(event) ?? event.kind}
          </div>
          <span className="text-xs text-muted-foreground">
            {new Date(event.createdAt).toLocaleDateString()}
          </span>
        </div>
      ))}
      {hasNextPage && (
        <div className="flex justify-center pt-2">
          <Button variant="outline" size="sm" onClick={() => fetchNextPage()} disabled={isFetchingNextPage}>
            {isFetchingNextPage ? 'Loading…' : 'Older activity'}
          </Button>
        </div>
      )}
    </div>
  );
};

export default ActivityFeed;
