import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import type { PokemonSummary } from '@masterpokedex/shared';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import HelpTip from './HelpTip';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Sparkles } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useCatchPokemon, useMyTeams } from '@/hooks/api/trainer';
import { isApiError } from '@/lib/api';
import { capitalize } from '../utils/helpers';

interface CatchPokemonDialogProps {
  pokemon: PokemonSummary | null;
  onClose: () => void;
}

/**
 * "Catch" = add this species to one of my teams. Replaces the old mock
 * "add to collection" button; the server enforces team capacity and derives
 * the level from experience.
 */
const CatchPokemonDialog: React.FC<CatchPokemonDialogProps> = ({ pokemon, onClose }) => {
  const { toast } = useToast();
  const { data: teams } = useMyTeams();
  const catchMutation = useCatchPokemon();
  const [teamId, setTeamId] = useState<string>('');
  const [nickname, setNickname] = useState('');
  const [isShiny, setIsShiny] = useState(false);

  const open = pokemon !== null;
  const selectableTeams = teams ?? [];
  const chosenTeam = selectableTeams.find((t) => t.id === teamId) ?? null;
  const effectiveTeamId = teamId || selectableTeams[0]?.id || '';

  const reset = () => {
    setTeamId('');
    setNickname('');
    setIsShiny(false);
  };

  const handleCatch = () => {
    if (!pokemon || !effectiveTeamId) return;
    catchMutation.mutate(
      {
        teamId: effectiveTeamId,
        pokemonId: pokemon.id,
        nickname: nickname.trim() ? nickname.trim() : null,
        experience: 0,
        isShiny,
      },
      {
        onSuccess: () => {
          toast({
            title: `${capitalize(pokemon.name)} caught!`,
            description: 'It has been added to your team.',
          });
          reset();
          onClose();
        },
        onError: (err) => {
          toast({
            title: isApiError(err, 'team_full') ? 'That team is full' : 'Could not catch',
            description: isApiError(err)
              ? err.message
              : 'Something went wrong — please try again.',
            variant: 'destructive',
          });
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) { reset(); onClose(); } }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Catch {pokemon ? capitalize(pokemon.name) : ''}</DialogTitle>
          <DialogDescription>Choose which team it joins. You can move it later.</DialogDescription>
        </DialogHeader>

        {selectableTeams.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            You don't have any teams yet — create one on your{' '}
            <Link to="/trainer" className="underline" onClick={onClose}>
              trainer page
            </Link>{' '}
            first.
          </p>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Team</Label>
              <Select value={effectiveTeamId} onValueChange={setTeamId}>
                <SelectTrigger>
                  <SelectValue placeholder="Pick a team" />
                </SelectTrigger>
                <SelectContent>
                  {selectableTeams.map((team) => (
                    <SelectItem key={team.id} value={team.id}>
                      {team.name} ({team.members.length}/{team.capacity})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {chosenTeam && chosenTeam.members.length >= chosenTeam.capacity && (
                <p className="text-xs text-destructive">This team is already full.</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="nickname">Nickname (optional)</Label>
              <Input
                id="nickname"
                value={nickname}
                maxLength={24}
                onChange={(e) => setNickname(e.target.value)}
                placeholder={pokemon ? capitalize(pokemon.name) : ''}
              />
            </div>

            <div className="flex items-center justify-between rounded-md border p-3">
              <Label htmlFor="shiny" className="flex items-center gap-2 cursor-pointer">
                <Sparkles className="h-4 w-4 text-yellow-500" />
                Shiny
                <HelpTip title="Shiny" faq="shiny">
                  The rare alternate colouring. Shinies wear a ✨ on their card and count toward
                  the shiny tally on your profile.
                </HelpTip>
              </Label>
              <Switch id="shiny" checked={isShiny} onCheckedChange={setIsShiny} />
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => { reset(); onClose(); }}>
            Cancel
          </Button>
          <Button
            onClick={handleCatch}
            disabled={!effectiveTeamId || catchMutation.isPending || selectableTeams.length === 0}
          >
            {catchMutation.isPending ? 'Catching…' : 'Catch'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CatchPokemonDialog;
