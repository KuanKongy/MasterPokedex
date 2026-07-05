import React, { useState } from 'react';
import type { Friendship } from '@masterpokedex/shared';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Check, UserMinus, X } from 'lucide-react';
import { useMyFriends, useRemoveFriend, useRespondToFriend } from '@/hooks/api/trainer';
import { useToast } from '@/hooks/use-toast';
import { HoverTip } from './HelpTip';
import LoadingSpinner from './LoadingSpinner';
import { resolveAsset } from '@/lib/assets';

interface FriendsPanelProps {
  onOpenTrainer: (username: string) => void;
}

/** The row's destructive actions, each behind the same confirm dialog. */
type RemoveAction = 'decline' | 'cancel' | 'unfriend';

const REMOVE_COPY: Record<RemoveAction, { title: (name: string) => string; body: string; action: string }> = {
  decline: {
    title: (name) => `Decline ${name}'s request?`,
    body: 'They are not told; the request just goes away. They can send another later.',
    action: 'Decline',
  },
  cancel: {
    title: (name) => `Cancel the request to ${name}?`,
    body: 'They are not told; the pending request just goes away.',
    action: 'Cancel request',
  },
  unfriend: {
    title: (name) => `Unfriend ${name}?`,
    body: 'You will stop seeing each other’s friends-only profiles, and they would have to send a new request to be friends again.',
    action: 'Unfriend',
  },
};

const FriendRow: React.FC<{ friendship: Friendship; onOpenTrainer: (username: string) => void }> = ({
  friendship,
  onOpenTrainer,
}) => {
  const { toast } = useToast();
  const respond = useRespondToFriend();
  const remove = useRemoveFriend();
  const [confirming, setConfirming] = useState<RemoveAction | null>(null);
  const { trainer } = friendship;
  const isIncomingRequest = friendship.status === 'pending' && friendship.direction === 'incoming';
  const isOutgoingRequest = friendship.status === 'pending' && friendship.direction === 'outgoing';

  const confirmRemove = () => {
    const wasUnfriend = confirming === 'unfriend';
    remove.mutate(friendship.id, {
      onSuccess: () => {
        if (wasUnfriend) toast({ title: 'Unfriended' });
      },
    });
  };

  return (
    <div className="flex items-center gap-3 p-3 border rounded-md">
      <button className="flex items-center gap-3 flex-1 text-left" onClick={() => onOpenTrainer(trainer.username)}>
        <Avatar className="h-10 w-10">
          <AvatarImage src={trainer.avatarUrl ? resolveAsset(trainer.avatarUrl) : undefined} alt={trainer.displayName} />
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
          <HoverTip
            title="Friend request"
            faq="friends"
            trigger={<Badge variant="secondary">wants to be friends</Badge>}
          >
            They sent you a friend request. Accept with the check or decline with the cross.
          </HoverTip>
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
            onClick={() => setConfirming('decline')}
          >
            <X className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      )}

      {isOutgoingRequest && (
        <div className="flex items-center gap-2">
          <HoverTip title="Request sent" faq="friends" trigger={<Badge variant="outline">request sent</Badge>}>
            Waiting for them to accept. You can cancel while it is pending.
          </HoverTip>
          <Button size="sm" variant="ghost" disabled={remove.isPending} onClick={() => setConfirming('cancel')}>
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
          onClick={() => setConfirming('unfriend')}
        >
          <UserMinus className="mr-1 h-4 w-4" /> Unfriend
        </Button>
      )}

      <AlertDialog open={confirming !== null} onOpenChange={(open) => !open && setConfirming(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirming && REMOVE_COPY[confirming].title(trainer.displayName)}</AlertDialogTitle>
            <AlertDialogDescription>{confirming && REMOVE_COPY[confirming].body}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep it</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={confirmRemove}
            >
              {confirming && REMOVE_COPY[confirming].action}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
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
