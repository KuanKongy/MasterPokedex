import React from 'react';
import type { Friendship } from '@masterpokedex/shared';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Check, UserMinus, X } from 'lucide-react';
import { useMyFriends, useRemoveFriend, useRespondToFriend } from '@/hooks/api/trainer';
import { useToast } from '@/hooks/use-toast';
import LoadingSpinner from './LoadingSpinner';

interface FriendsPanelProps {
  onOpenTrainer: (username: string) => void;
}

const FriendRow: React.FC<{ friendship: Friendship; onOpenTrainer: (username: string) => void }> = ({
  friendship,
  onOpenTrainer,
}) => {
  const { toast } = useToast();
  const respond = useRespondToFriend();
  const remove = useRemoveFriend();
  const { trainer } = friendship;
  const isIncomingRequest = friendship.status === 'pending' && friendship.direction === 'incoming';
  const isOutgoingRequest = friendship.status === 'pending' && friendship.direction === 'outgoing';

  return (
    <div className="flex items-center gap-3 p-3 border rounded-md">
      <button className="flex items-center gap-3 flex-1 text-left" onClick={() => onOpenTrainer(trainer.username)}>
        <Avatar className="h-10 w-10">
          <AvatarImage src={trainer.avatarUrl ?? undefined} alt={trainer.displayName} />
          <AvatarFallback>{trainer.displayName.charAt(0)}</AvatarFallback>
        </Avatar>
        <div>
          <div className="font-medium">
            {trainer.displayName}{' '}
            <span className="text-muted-foreground text-sm">@{trainer.username}</span>
          </div>
          <div className="text-xs text-muted-foreground">
            {trainer.caughtCount} caught{trainer.regionName ? ` · ${trainer.regionName}` : ''}
          </div>
        </div>
      </button>

      {isIncomingRequest && (
        <div className="flex items-center gap-1">
          <Badge variant="secondary">wants to be friends</Badge>
          <Button
            size="icon"
            variant="outline"
            className="h-8 w-8"
            aria-label="Accept"
            disabled={respond.isPending}
            onClick={() =>
              respond.mutate(
                { id: friendship.id, status: 'accepted' },
                { onSuccess: () => toast({ title: `You are now friends with ${trainer.displayName}` }) },
              )
            }
          >
            <Check className="h-4 w-4 text-green-600" />
          </Button>
          <Button
            size="icon"
            variant="outline"
            className="h-8 w-8"
            aria-label="Decline"
            disabled={remove.isPending}
            onClick={() => remove.mutate(friendship.id)}
          >
            <X className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      )}

      {isOutgoingRequest && (
        <div className="flex items-center gap-2">
          <Badge variant="outline">request sent</Badge>
          <Button size="sm" variant="ghost" onClick={() => remove.mutate(friendship.id)}>
            Cancel
          </Button>
        </div>
      )}

      {friendship.status === 'accepted' && (
        <Button
          size="sm"
          variant="ghost"
          className="text-muted-foreground"
          disabled={remove.isPending}
          onClick={() => remove.mutate(friendship.id, { onSuccess: () => toast({ title: 'Unfriended' }) })}
        >
          <UserMinus className="mr-1 h-4 w-4" /> Unfriend
        </Button>
      )}
    </div>
  );
};

const FriendsPanel: React.FC<FriendsPanelProps> = ({ onOpenTrainer }) => {
  const { data: friendships, isLoading } = useMyFriends();

  if (isLoading) {
    return (
      <div className="flex justify-center p-8">
        <LoadingSpinner />
      </div>
    );
  }

  const list = friendships ?? [];
  if (list.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          <p className="mb-2 font-medium text-foreground">No friends yet</p>
          <p className="text-sm">Find trainers in the directory and send them a request.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-2">
      {list.map((friendship) => (
        <FriendRow key={friendship.id} friendship={friendship} onOpenTrainer={onOpenTrainer} />
      ))}
    </div>
  );
};

export default FriendsPanel;
