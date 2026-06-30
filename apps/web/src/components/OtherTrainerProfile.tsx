import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Medal, Sparkles, UserCheck, UserMinus, UserPlus, Clock, Check, X } from 'lucide-react';
import HelpTip from './HelpTip';
import { MemberCard } from './TeamsPanel';
import LoadingSpinner from './LoadingSpinner';
import { resolveAsset } from '@/lib/assets';
import {
  useMyFriends,
  useRemoveFriend,
  useRequestFriend,
  useRespondToFriend,
  useTrainerProfile,
  useTrainerTeams,
} from '@/hooks/api/trainer';
import { useAuth } from '@/auth/AuthProvider';
import { useToast } from '@/hooks/use-toast';
import { isApiError } from '@/lib/api';

interface OtherTrainerProfileProps {
  username: string;
}

/**
 * A trainer's public page. What you see is what the API's visibility rules
 * allow: public profiles for everyone, private ones only for friends. The
 * friend button is driven entirely by `friendshipStatus` from the server.
 */
const OtherTrainerProfile: React.FC<OtherTrainerProfileProps> = ({ username }) => {
  const { session } = useAuth();
  const { toast } = useToast();
  const { data: trainer, isLoading, error } = useTrainerProfile(username);
  const { data: teams } = useTrainerTeams(username);
  const { data: friendships } = useMyFriends();
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
                    <Badge variant="secondary" className="capitalize">
                      {trainer.rank}
                    </Badge>
                    <HelpTip title="Trainer rank" faq="ranks">
                      The ladder runs Rookie to Champion. Everyone starts as a Rookie; the
                      higher ranks are worn by the resident cast for now.
                    </HelpTip>
                    {trainer.isGuest && (
                      <>
                        <Badge variant="outline">Resident trainer</Badge>
                        <HelpTip title="Resident" faq="residents">
                          A seeded character from the games and the show — nobody signs in as
                          them, and their teams don't change.
                        </HelpTip>
                      </>
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
                  <div className="text-muted-foreground text-sm">Badges</div>
                  <div className="flex items-center gap-1 font-semibold">
                    <Medal className="h-4 w-4 text-yellow-500" />
                    {trainer.badges}
                  </div>
                </div>
                <div className="bg-muted/50 p-3 rounded-md">
                  <div className="text-muted-foreground text-sm">Caught</div>
                  <div className="font-semibold">{trainer.caughtCount}</div>
                </div>
                <div className="bg-muted/50 p-3 rounded-md">
                  <div className="text-muted-foreground text-sm">Species</div>
                  <div className="font-semibold">{trainer.uniqueSpeciesCount}</div>
                </div>
                <div className="bg-muted/50 p-3 rounded-md">
                  <div className="text-muted-foreground text-sm">Shinies</div>
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

      {teams && teams.length > 0 ? (
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
      )}
    </div>
  );
};

export default OtherTrainerProfile;
