import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { TrainerProfile as TrainerProfileType } from '@masterpokedex/shared';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Medal, Calendar, Edit, Sparkles, Users, Heart, Activity as ActivityIcon, Backpack, Layers } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import HelpTip, { HoverTip } from './HelpTip';
import UpdateTrainerForm from './UpdateTrainerForm';
import TeamsPanel from './TeamsPanel';
import FriendsPanel from './FriendsPanel';
import PokemonCard from './PokemonCard';
import ActivityFeed from './ActivityFeed';
import ItemInventory from './ItemInventory';
import { useActivityFeed, useMyFavorites, useSetFavorite } from '@/hooks/api/trainer';
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

/** Wrapper so the feed query only starts once the Activity tab mounts. */
const MyActivityFeed: React.FC = () => <ActivityFeed query={useActivityFeed()} />;

const FavoritesGrid: React.FC = () => {
  const { data: favorites, isLoading } = useMyFavorites();
  const setFavorite = useSetFavorite();
  if (isLoading) return <p className="text-sm text-muted-foreground p-4">Loading favorites…</p>;
  if (!favorites || favorites.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          <p className="mb-2 font-medium text-foreground">No favorites yet</p>
          <p className="text-sm">Tap the heart on any Pokémon's page.</p>
        </CardContent>
      </Card>
    );
  }
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
      {favorites.map((pokemon) => (
        <PokemonCard
          key={pokemon.id}
          pokemon={pokemon}
          onUnfavorite={() => setFavorite.mutate({ pokemonId: pokemon.id, favorite: false })}
        />
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
  // The header's "My bag" deep-links the Bag tab as /trainer?tab=bag.
  const [params] = useSearchParams();
  const initialTab = params.get('tab') === 'bag' ? 'items' : 'teams';

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
                  <HoverTip
                    title="Trainer rank"
                    faq="ranks"
                    trigger={<Badge variant="secondary">{RANK_LABELS[profile.rank]}</Badge>}
                  >
                    Your title on the ladder from Rookie to Champion. Everyone starts as a
                    Rookie; the higher ranks are worn by the resident cast for now.
                  </HoverTip>
                  {!profile.isPublic && (
                    <HoverTip title="Private profile" faq="privacy" trigger={<Badge variant="outline">Private</Badge>}>
                      Only you and your friends can see this profile; it does not appear in
                      the trainer directory. Change this under Edit Profile.
                    </HoverTip>
                  )}
                </h3>
                <p className="text-muted-foreground">
                  @{profile.username}
                  {profile.regionName ? ` · ${profile.regionName} Region` : ''}
                </p>
                {profile.bio && <p className="text-sm mt-2">{profile.bio}</p>}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                <div className="bg-muted/50 p-3 rounded-md">
                  <div className="text-muted-foreground text-sm">
                    Badges
                    <HelpTip title="Gym badges" faq="ranks" className="ml-1">
                      The gym badges a trainer has earned, up to the games' 64. Residents came
                      with theirs; earning them isn't wired up yet.
                    </HelpTip>
                  </div>
                  <div className="flex items-center gap-1 font-semibold">
                    <Medal className="h-4 w-4 text-yellow-500" />
                    {profile.badges}
                  </div>
                </div>
                <div className="bg-muted/50 p-3 rounded-md">
                  <div className="text-muted-foreground text-sm">
                    Caught
                    <HelpTip title="Caught" className="ml-1">
                      Every Pokémon on your teams, duplicates included.
                    </HelpTip>
                  </div>
                  <div className="font-semibold">{profile.caughtCount}</div>
                </div>
                <div className="bg-muted/50 p-3 rounded-md">
                  <div className="text-muted-foreground text-sm">
                    Species
                    <HelpTip title="Species" className="ml-1">
                      How many distinct Pokémon are among your catches; six Pikachu count once.
                    </HelpTip>
                  </div>
                  <div className="font-semibold">{profile.uniqueSpeciesCount}</div>
                </div>
                <div className="bg-muted/50 p-3 rounded-md">
                  <div className="text-muted-foreground text-sm">
                    Shinies
                    <HelpTip title="Shinies" faq="shiny" className="ml-1">
                      Pokémon caught in their rare alternate colouring; flip the ✨ switch when
                      catching.
                    </HelpTip>
                  </div>
                  <div className="flex items-center gap-1 font-semibold">
                    <Sparkles className="h-4 w-4 text-yellow-500" />
                    {profile.shinyCount}
                  </div>
                </div>
                <div className="bg-muted/50 p-3 rounded-md">
                  <div className="text-muted-foreground text-sm">
                    Favorite Type
                    <HelpTip title="Favorite type" className="ml-1">
                      Your pick under Edit Profile; pure colours, no mechanics.
                    </HelpTip>
                  </div>
                  <div className="font-semibold capitalize">{profile.favoriteType ?? '—'}</div>
                </div>
                <div className="bg-muted/50 p-3 rounded-md">
                  <div className="text-muted-foreground text-sm">
                    Joined
                    <HelpTip title="Joined" className="ml-1">
                      When your trainer account was created.
                    </HelpTip>
                  </div>
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
        <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Your Profile</DialogTitle>
          </DialogHeader>
          <UpdateTrainerForm trainer={profile} onClose={() => setIsEditFormOpen(false)} />
        </DialogContent>
      </Dialog>

      <Tabs defaultValue={initialTab} className="space-y-4">
        {/* Labels hide below sm so five icon tabs still fit a phone. */}
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="teams" className="gap-1" aria-label="Teams">
            <Layers className="h-4 w-4" /> <span className="hidden sm:inline">Teams</span>
          </TabsTrigger>
          <TabsTrigger value="friends" className="gap-1" aria-label="Friends">
            <Users className="h-4 w-4" /> <span className="hidden sm:inline">Friends</span>
          </TabsTrigger>
          <TabsTrigger value="favorites" className="gap-1" aria-label="Favorites">
            <Heart className="h-4 w-4" /> <span className="hidden sm:inline">Favorites</span>
          </TabsTrigger>
          <TabsTrigger value="activity" className="gap-1" aria-label="Activity">
            <ActivityIcon className="h-4 w-4" /> <span className="hidden sm:inline">Activity</span>
          </TabsTrigger>
          <TabsTrigger value="items" className="gap-1" aria-label="Bag">
            <Backpack className="h-4 w-4" /> <span className="hidden sm:inline">Bag</span>
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
          <MyActivityFeed />
        </TabsContent>
        {/* The same bag others see on your profile, editable in place; the
            full catalogue stays on the Items page. */}
        <TabsContent value="items">
          <ItemInventory />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default TrainerProfile;
