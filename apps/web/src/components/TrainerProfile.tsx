import React, { useState } from 'react';
import type { Activity, TrainerProfile as TrainerProfileType } from '@masterpokedex/shared';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Medal, Calendar, Edit, Sparkles, Users, Heart, Activity as ActivityIcon } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import UpdateTrainerForm from './UpdateTrainerForm';
import TeamsPanel from './TeamsPanel';
import FriendsPanel from './FriendsPanel';
import PokemonCard from './PokemonCard';
import { useActivityFeed, useMyFavorites } from '@/hooks/api/trainer';
import { capitalize } from '../utils/helpers';
import { resolveAsset } from '@/lib/assets';

const RANK_LABELS: Record<TrainerProfileType['rank'], string> = {
  rookie: 'Rookie',
  trainer: 'Trainer',
  ace: 'Ace Trainer',
  veteran: 'Veteran',
  elite: 'Elite',
  champion: 'Champion',
};

const ACTIVITY_TEXT: Record<Activity['kind'], (a: Activity) => string> = {
  caught: (a) => `caught ${a.payload.nickname ?? `#${a.payload.pokemonId}`}`,
  shiny_caught: (a) => `caught a shiny ${a.payload.nickname ?? `#${a.payload.pokemonId}`} ✨`,
  team_created: (a) => `created the team “${a.payload.teamName}”`,
  friend_added: (a) => `became friends with @${a.payload.username}`,
  badge_earned: () => 'earned a badge',
};

const ActivityFeed: React.FC = () => {
  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useActivityFeed();
  const events = data?.pages.flatMap((page) => page.items) ?? [];

  if (isLoading) return <p className="text-sm text-muted-foreground p-4">Loading activity…</p>;
  if (events.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground text-sm">
          Nothing yet — catch a Pokémon or make a friend and it shows up here.
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

const FavoritesGrid: React.FC = () => {
  const { data: favorites, isLoading } = useMyFavorites();
  if (isLoading) return <p className="text-sm text-muted-foreground p-4">Loading favorites…</p>;
  if (!favorites || favorites.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground text-sm">
          No favorites yet — tap the heart on any Pokémon's page.
        </CardContent>
      </Card>
    );
  }
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
      {favorites.map((pokemon) => (
        <PokemonCard key={pokemon.id} pokemon={pokemon} />
      ))}
    </div>
  );
};

interface TrainerProfileProps {
  profile: TrainerProfileType;
  onOpenTrainer: (username: string) => void;
}

/**
 * The signed-in trainer's hub — the screen the reference project built as
 * `TrainerProfile.tsx` and never routed. Profile card with live counts, then
 * teams, friends, favorites and the activity feed.
 */
const TrainerProfile: React.FC<TrainerProfileProps> = ({ profile, onOpenTrainer }) => {
  const [isEditFormOpen, setIsEditFormOpen] = useState(false);

  return (
    <div className="space-y-6">
      <Card className="shadow-md">
        <CardHeader className="pb-2">
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-2xl">Trainer Profile</CardTitle>
              <CardDescription>View and manage your Pokémon journey</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={() => setIsEditFormOpen(true)} className="flex gap-1">
              <Edit className="h-4 w-4" /> Edit Profile
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row items-start gap-6">
            <Avatar className="w-24 h-24 border-2 border-pokebrand-red rounded-md">
              <AvatarImage src={profile.avatarUrl ? resolveAsset(profile.avatarUrl) : undefined} alt={profile.displayName} />
              <AvatarFallback className="text-2xl rounded-md">
                {profile.displayName.charAt(0)}
              </AvatarFallback>
            </Avatar>

            <div className="space-y-4 flex-1">
              <div>
                <h3 className="flex items-center gap-2 text-xl font-semibold">
                  {profile.displayName}
                  <Badge variant="secondary">{RANK_LABELS[profile.rank]}</Badge>
                  {!profile.isPublic && <Badge variant="outline">Private</Badge>}
                </h3>
                <p className="text-muted-foreground">
                  @{profile.username}
                  {profile.regionName ? ` · ${profile.regionName} Region` : ''}
                </p>
                {profile.bio && <p className="text-sm mt-2">{profile.bio}</p>}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                <div className="bg-muted/50 p-3 rounded-md">
                  <div className="text-muted-foreground text-sm">Badges</div>
                  <div className="flex items-center gap-1 font-semibold">
                    <Medal className="h-4 w-4 text-yellow-500" />
                    {profile.badges}
                  </div>
                </div>
                <div className="bg-muted/50 p-3 rounded-md">
                  <div className="text-muted-foreground text-sm">Caught</div>
                  <div className="font-semibold">{profile.caughtCount}</div>
                </div>
                <div className="bg-muted/50 p-3 rounded-md">
                  <div className="text-muted-foreground text-sm">Species</div>
                  <div className="font-semibold">{profile.uniqueSpeciesCount}</div>
                </div>
                <div className="bg-muted/50 p-3 rounded-md">
                  <div className="text-muted-foreground text-sm">Shinies</div>
                  <div className="flex items-center gap-1 font-semibold">
                    <Sparkles className="h-4 w-4 text-yellow-500" />
                    {profile.shinyCount}
                  </div>
                </div>
                <div className="bg-muted/50 p-3 rounded-md">
                  <div className="text-muted-foreground text-sm">Favorite Type</div>
                  <div className="font-semibold capitalize">{profile.favoriteType ?? '—'}</div>
                </div>
                <div className="bg-muted/50 p-3 rounded-md">
                  <div className="text-muted-foreground text-sm">Joined</div>
                  <div className="flex items-center gap-1 font-semibold">
                    <Calendar className="h-4 w-4" />
                    {new Date(profile.createdAt).toLocaleDateString()}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isEditFormOpen} onOpenChange={setIsEditFormOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Your Profile</DialogTitle>
          </DialogHeader>
          <UpdateTrainerForm trainer={profile} onClose={() => setIsEditFormOpen(false)} />
        </DialogContent>
      </Dialog>

      <Tabs defaultValue="teams" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="teams">Teams</TabsTrigger>
          <TabsTrigger value="friends" className="gap-1">
            <Users className="h-4 w-4" /> Friends
          </TabsTrigger>
          <TabsTrigger value="favorites" className="gap-1">
            <Heart className="h-4 w-4" /> Favorites
          </TabsTrigger>
          <TabsTrigger value="activity" className="gap-1">
            <ActivityIcon className="h-4 w-4" /> Activity
          </TabsTrigger>
        </TabsList>
        <TabsContent value="teams">
          <TeamsPanel />
        </TabsContent>
        <TabsContent value="friends">
          <FriendsPanel onOpenTrainer={onOpenTrainer} />
        </TabsContent>
        <TabsContent value="favorites">
          <FavoritesGrid />
        </TabsContent>
        <TabsContent value="activity">
          <ActivityFeed />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default TrainerProfile;
