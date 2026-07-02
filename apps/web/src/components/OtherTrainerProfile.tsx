import React from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Activity as ActivityIcon,
  Backpack,
  Check,
  Clock,
  Heart,
  Medal,
  Sparkles,
  UserCheck,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import HelpTip, { HoverTip } from './HelpTip';
import { MemberCard } from './TeamsPanel';
import ActivityFeed from './ActivityFeed';
import ItemSprite from './ItemSprite';
import PokemonCard from './PokemonCard';
import LoadingSpinner from './LoadingSpinner';
import { resolveAsset } from '@/lib/assets';
import {
  useMyFriends,
  useRemoveFriend,
  useRequestFriend,
  useRespondToFriend,
  useTrainerActivity,
  useTrainerFavorites,
  useTrainerFriends,
  useTrainerItems,
  useTrainerProfile,
  useTrainerTeams,
} from '@/hooks/api/trainer';
import { useAuth } from '@/auth/AuthProvider';
import { useToast } from '@/hooks/use-toast';
import { isApiError } from '@/lib/api';

interface OtherTrainerProfileProps {
  username: string;
  /** Opens another trainer's profile (friend rows); browsing is page state, not a route. */
  onOpenTrainer?: (username: string) => void;
}

/**
 * A trainer's public page. What you see is what the API's visibility rules
 * allow: public profiles for everyone, private ones only for friends, and
 * each extra section only when its owner left the matching toggle on. The
 * friend button is driven entirely by `friendshipStatus` from the server.
 */
const OtherTrainerProfile: React.FC<OtherTrainerProfileProps> = ({ username, onOpenTrainer }) => {
  const { session } = useAuth();
  const { toast } = useToast();
  const { data: trainer, isLoading, error } = useTrainerProfile(username);
  const { data: teams } = useTrainerTeams(username, trainer?.showTeams ?? false);
  const { data: friendships } = useMyFriends();
  // Each section fetches only once the profile says its toggle is on.
  const { data: bag } = useTrainerItems(username, trainer?.showBag ?? false);
  const { data: favorites } = useTrainerFavorites(username, trainer?.showFavorites ?? false);
  const { data: friends } = useTrainerFriends(username, trainer?.showFriends ?? false);
  const activityQuery = useTrainerActivity(username, trainer?.showActivity ?? false);
  const requestFriend = useRequestFriend();
  const respondToFriend = useRespondToFriend();
  const removeFriend = useRemoveFriend();

  if (isLoading) {
    return (
      <div className="flex justify-center p-8">
        <LoadingSpinner />
      </div>
    );
  }

  if (error || !trainer) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          This trainer doesn't exist — or their profile is private.
        </CardContent>
      </Card>
    );
  }

  // The friendship row (for accept/decline/cancel) lives in my friends list.
  const pairRow = friendships?.find((f) => f.trainer.username === trainer.username);

  const friendButton = () => {
    if (!session || trainer.friendshipStatus === undefined) return null;
    switch (trainer.friendshipStatus) {
      case 'none':
        return (
          <Button
            size="sm"
            disabled={requestFriend.isPending}
            onClick={() =>
              requestFriend.mutate(trainer.username, {
                onSuccess: () => toast({ title: 'Friend request sent' }),
                onError: (err) =>
                  toast({
                    title: 'Could not send request',
                    description: isApiError(err) ? err.message : undefined,
                    variant: 'destructive',
                  }),
              })
            }
          >
            <UserPlus className="mr-1 h-4 w-4" /> Add friend
          </Button>
        );
      case 'pending_outgoing':
        return (
          <Button
            size="sm"
            variant="outline"
            disabled={!pairRow || removeFriend.isPending}
            onClick={() => pairRow && removeFriend.mutate(pairRow.id)}
          >
            <Clock className="mr-1 h-4 w-4" /> Request sent — cancel
          </Button>
        );
      case 'pending_incoming':
        return (
          <div className="flex gap-2">
            <Button
              size="sm"
              disabled={!pairRow || respondToFriend.isPending}
              onClick={() =>
                pairRow &&
                respondToFriend.mutate(
                  { id: pairRow.id, status: 'accepted' },
                  { onSuccess: () => toast({ title: `You are now friends with ${trainer.displayName}` }) },
                )
              }
            >
              <Check className="mr-1 h-4 w-4" /> Accept
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={!pairRow || removeFriend.isPending}
              onClick={() => pairRow && removeFriend.mutate(pairRow.id)}
            >
              <X className="mr-1 h-4 w-4" /> Decline
            </Button>
          </div>
        );
      case 'accepted':
        return (
          <Button
            size="sm"
            variant="outline"
            disabled={!pairRow || removeFriend.isPending}
            onClick={() =>
              pairRow && removeFriend.mutate(pairRow.id, { onSuccess: () => toast({ title: 'Unfriended' }) })
            }
          >
            <UserCheck className="mr-1 h-4 w-4" /> Friends
          </Button>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      <Card className="shadow-md">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row items-start gap-6">
            <Avatar className="w-24 h-24 border-2 border-pokebrand-red rounded-md">
              <AvatarImage src={trainer.avatarUrl ? resolveAsset(trainer.avatarUrl) : undefined} alt={trainer.displayName} />
              <AvatarFallback className="text-2xl rounded-md">
                {trainer.displayName.charAt(0)}
              </AvatarFallback>
            </Avatar>

            <div className="space-y-4 flex-1">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h3 className="flex items-center gap-2 text-xl font-semibold">
                    {trainer.displayName}
                    <HoverTip
                      title="Trainer rank"
                      faq="ranks"
                      trigger={
                        <Badge variant="secondary" className="capitalize">
                          {trainer.rank}
                        </Badge>
                      }
                    >
                      The ladder runs Rookie to Champion. Everyone starts as a Rookie; the
                      higher ranks are worn by the resident cast for now.
                    </HoverTip>
                    {trainer.isGuest && (
                      <HoverTip
                        title="Resident"
                        faq="residents"
                        trigger={<Badge variant="outline">Resident trainer</Badge>}
                      >
                        A seeded character from the games and the show. Nobody signs in as
                        them, and their teams don't change.
                      </HoverTip>
                    )}
                  </h3>
                  <p className="text-muted-foreground">
                    @{trainer.username}
                    {trainer.regionName ? ` · ${trainer.regionName} Region` : ''}
                  </p>
                  {trainer.bio && <p className="text-sm mt-2">{trainer.bio}</p>}
                </div>
                {friendButton()}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
                <div className="bg-muted/50 p-3 rounded-md">
                  <div className="text-muted-foreground text-sm">
                    Badges
                    <HelpTip title="Gym badges" faq="ranks" className="ml-1">
                      The gym badges this trainer has earned, up to the games' 64. Residents
                      came with theirs.
                    </HelpTip>
                  </div>
                  <div className="flex items-center gap-1 font-semibold">
                    <Medal className="h-4 w-4 text-yellow-500" />
                    {trainer.badges}
                  </div>
                </div>
                <div className="bg-muted/50 p-3 rounded-md">
                  <div className="text-muted-foreground text-sm">
                    Caught
                    <HelpTip title="Caught" className="ml-1">
                      Every Pokémon on their teams, duplicates included.
                    </HelpTip>
                  </div>
                  <div className="font-semibold">{trainer.caughtCount}</div>
                </div>
                <div className="bg-muted/50 p-3 rounded-md">
                  <div className="text-muted-foreground text-sm">
                    Species
                    <HelpTip title="Species" className="ml-1">
                      How many distinct Pokémon are among their catches; six Pikachu count once.
                    </HelpTip>
                  </div>
                  <div className="font-semibold">{trainer.uniqueSpeciesCount}</div>
                </div>
                <div className="bg-muted/50 p-3 rounded-md">
                  <div className="text-muted-foreground text-sm">
                    Shinies
                    <HelpTip title="Shinies" faq="shiny" className="ml-1">
                      Pokémon caught in their rare alternate colouring.
                    </HelpTip>
                  </div>
                  <div className="flex items-center gap-1 font-semibold">
                    <Sparkles className="h-4 w-4 text-yellow-500" />
                    {trainer.shinyCount}
                  </div>
                </div>
                <div className="bg-muted/50 p-3 rounded-md">
                  <div className="text-muted-foreground text-sm">Favorite Type</div>
                  <div className="font-semibold capitalize">{trainer.favoriteType ?? '—'}</div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {trainer.showTeams &&
      (teams && teams.length > 0 ? (
        teams.map((team) => (
          <Card key={team.id}>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                {team.name}
                <Badge variant="secondary" className="text-xs">
                  {team.members.length}/{team.capacity}
                </Badge>
                <span className="text-sm font-normal text-muted-foreground capitalize">
                  {team.category}
                </span>
              </CardTitle>
              {team.description && (
                <p className="text-sm text-muted-foreground">{team.description}</p>
              )}
            </CardHeader>
            <CardContent>
              {team.members.length === 0 ? (
                <p className="text-sm text-muted-foreground">Empty team.</p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                  {team.members.map((member) => (
                    <MemberCard key={member.id} member={member} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        ))
      ) : (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground text-sm">
            No teams to show.
          </CardContent>
        </Card>
      ))}

      {trainer.showBag && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Backpack className="h-5 w-5" /> Bag
              {bag && bag.length > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {bag.length}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!bag || bag.length === 0 ? (
              <p className="text-sm text-muted-foreground">Their bag is empty.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {bag.map((item) => (
                  <div key={item.id} className="flex items-center gap-3 rounded-md border p-3">
                    <Link
                      to={`/items/${item.name}`}
                      className="group flex flex-1 min-w-0 items-center gap-3"
                    >
                      <ItemSprite
                        src={item.sprite}
                        itemName={item.name}
                        alt={item.displayName}
                        className="h-8 w-8"
                      />
                      <span className="truncate font-medium group-hover:underline">
                        {item.displayName}
                      </span>
                    </Link>
                    <Badge variant="secondary" className="shrink-0 tabular-nums">
                      ×{item.quantity}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {trainer.showFavorites && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Heart className="h-5 w-5" /> Favorites
              {favorites && favorites.length > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {favorites.length}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!favorites || favorites.length === 0 ? (
              <p className="text-sm text-muted-foreground">No favorites yet.</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                {favorites.map((pokemon) => (
                  <PokemonCard key={pokemon.id} pokemon={pokemon} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {trainer.showActivity && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <ActivityIcon className="h-5 w-5" /> Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ActivityFeed
              query={activityQuery}
              emptyTitle="No activity yet"
              emptyText="Nothing public from this trainer so far."
            />
          </CardContent>
        </Card>
      )}

      {trainer.showFriends && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="h-5 w-5" /> Friends
              {friends && friends.length > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {friends.length}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!friends || friends.length === 0 ? (
              <p className="text-sm text-muted-foreground">No friends to show.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {friends.map((friend) => (
                  <button
                    key={friend.id}
                    type="button"
                    onClick={() => onOpenTrainer?.(friend.username)}
                    className="flex items-center gap-3 rounded-md border p-3 text-left transition-colors hover:bg-muted/50"
                  >
                    <Avatar className="h-10 w-10">
                      <AvatarImage
                        src={friend.avatarUrl ? resolveAsset(friend.avatarUrl) : undefined}
                        alt={friend.displayName}
                      />
                      <AvatarFallback>{friend.displayName.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <span className="min-w-0">
                      <span className="block truncate font-medium">{friend.displayName}</span>
                      <span className="block truncate text-sm text-muted-foreground">
                        @{friend.username}
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default OtherTrainerProfile;
