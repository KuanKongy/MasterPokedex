import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  TEAM_CATEGORIES,
  type CaughtPokemon,
  type Team,
  type TeamCategory,
} from '@masterpokedex/shared';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Pencil, Plus, Sparkles, Trash2 } from 'lucide-react';
import { TypeBadge } from './ui/type-badge';
import { pokemonImage, spriteFallback, useSpritePref } from '@/prefs/SpritePrefContext';
import { useToast } from '@/hooks/use-toast';
import {
  useCreateTeam,
  useDeleteTeam,
  useMyTeams,
  useReleaseCaught,
  useUpdateCaught,
} from '@/hooks/api/trainer';
import { isApiError } from '@/lib/api';
import { capitalize } from '../utils/helpers';
import LoadingSpinner from './LoadingSpinner';

const CATEGORY_LABELS: Record<TeamCategory, string> = {
  party: 'Party',
  box: 'Box',
  showcase: 'Showcase',
};

/** One caught Pokémon; shared between my teams and public trainer profiles. */
export const MemberCard: React.FC<{ member: CaughtPokemon; actions?: React.ReactNode }> = ({
  member,
  actions,
}) => {
  const { spriteStyle } = useSpritePref();
  return (
  <div className="border rounded-lg p-3 bg-card hover:shadow-md transition-shadow relative">
    {actions && <div className="absolute top-2 right-2 flex gap-1">{actions}</div>}
    <Link to={`/pokemon/${member.pokemonId}`} className="block">
      <div className="flex justify-center mb-2">
        <img
          src={pokemonImage(member.pokemonId, spriteStyle)}
          alt={member.pokemon.name}
          loading="lazy"
          onError={(e) => spriteFallback(e, member.pokemonId)}
          className={`h-20 w-20 object-contain ${spriteStyle === 'sprite' ? 'pixelated' : ''}`}
        />
      </div>
      <div className="text-center">
        <div className="font-medium flex items-center justify-center gap-1">
          {member.isShiny && <Sparkles className="h-3.5 w-3.5 text-yellow-500" />}
          {member.nickname ?? capitalize(member.pokemon.name)}
        </div>
        {member.nickname && (
          <div className="text-xs text-muted-foreground">{capitalize(member.pokemon.name)}</div>
        )}
        <div className="text-sm text-muted-foreground">
          Lv. {member.level}
          {member.gender && member.gender !== 'genderless' && (
            <span className={member.gender === 'male' ? 'text-blue-500' : 'text-pink-500'}>
              {' '}
              {member.gender === 'male' ? '♂' : '♀'}
            </span>
          )}
        </div>
        <div className="flex gap-1 justify-center mt-1">
          {member.pokemon.types.map((type) => (
            <TypeBadge key={type} type={type} />
          ))}
        </div>
      </div>
    </Link>
  </div>
  );
};

const EditMemberPopover: React.FC<{ member: CaughtPokemon; teams: Team[] }> = ({ member, teams }) => {
  const { toast } = useToast();
  const update = useUpdateCaught();
  const [open, setOpen] = useState(false);
  const [nickname, setNickname] = useState(member.nickname ?? '');
  const [experience, setExperience] = useState(String(member.experience));
  const [teamId, setTeamId] = useState(member.teamId);
  const [notes, setNotes] = useState(member.notes ?? '');

  const save = () => {
    update.mutate(
      {
        id: member.id,
        nickname: nickname.trim() ? nickname.trim() : null,
        experience: Math.max(0, Number(experience) || 0),
        teamId: teamId !== member.teamId ? teamId : undefined,
        notes: notes.trim() ? notes.trim() : null,
      },
      {
        onSuccess: () => setOpen(false),
        onError: (err) => {
          toast({
            title: isApiError(err, 'team_full') ? 'That team is full' : 'Could not save',
            description: isApiError(err) ? err.message : 'Please try again.',
            variant: 'destructive',
          });
        },
      },
    );
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button size="icon" variant="ghost" className="h-7 w-7" aria-label="Edit">
          <Pencil className="h-3.5 w-3.5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 space-y-3" align="end">
        <div className="space-y-1">
          <Label className="text-xs">Nickname</Label>
          <Input value={nickname} maxLength={24} onChange={(e) => setNickname(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Experience (level follows automatically)</Label>
          <Input type="number" min={0} value={experience} onChange={(e) => setExperience(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Team</Label>
          <Select value={teamId} onValueChange={setTeamId}>
            <SelectTrigger className="h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {teams.map((team) => (
                <SelectItem key={team.id} value={team.id}>
                  {team.name} ({team.members.length}/{team.capacity})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Notes</Label>
          <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
        <Button size="sm" className="w-full" onClick={save} disabled={update.isPending}>
          {update.isPending ? 'Saving…' : 'Save'}
        </Button>
      </PopoverContent>
    </Popover>
  );
};

/**
 * Replaces the mock "Pokémon Collections": real teams with category-driven
 * capacities (party 6 / box 30 / showcase 12), enforced by the server.
 */
const TeamsPanel: React.FC = () => {
  const { toast } = useToast();
  const { data: teams, isLoading } = useMyTeams();
  const createTeam = useCreateTeam();
  const deleteTeam = useDeleteTeam();
  const releaseCaught = useReleaseCaught();

  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newCategory, setNewCategory] = useState<TeamCategory>('party');
  const [newDescription, setNewDescription] = useState('');
  const [teamToDelete, setTeamToDelete] = useState<Team | null>(null);
  const [memberToRelease, setMemberToRelease] = useState<CaughtPokemon | null>(null);

  if (isLoading) {
    return (
      <div className="flex justify-center p-8">
        <LoadingSpinner />
      </div>
    );
  }

  const teamList = teams ?? [];

  const handleCreate = () => {
    if (!newName.trim()) return;
    createTeam.mutate(
      {
        name: newName.trim(),
        category: newCategory,
        description: newDescription.trim() ? newDescription.trim() : null,
      },
      {
        onSuccess: () => {
          setCreateOpen(false);
          setNewName('');
          setNewDescription('');
          toast({ title: 'Team created' });
        },
        onError: (err) => {
          toast({
            title: 'Could not create team',
            description: isApiError(err) ? err.message : 'Please try again.',
            variant: 'destructive',
          });
        },
      },
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">
          {teamList.length} team{teamList.length === 1 ? '' : 's'} · catch Pokémon from the dex to
          fill them
        </p>
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <Plus className="mr-1 h-4 w-4" /> New team
        </Button>
      </div>

      {teamList.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <p className="mb-2 font-medium text-foreground">No teams yet</p>
            <p className="text-sm">
              Create a team, then hit the + button on any Pokémon in the dex to catch it.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue={teamList[0].id}>
          <TabsList className="flex flex-wrap h-auto justify-start">
            {teamList.map((team) => (
              <TabsTrigger key={team.id} value={team.id} className="gap-2">
                {team.name}
                <Badge variant="secondary" className="text-xs">
                  {team.members.length}/{team.capacity}
                </Badge>
              </TabsTrigger>
            ))}
          </TabsList>

          {teamList.map((team) => (
            <TabsContent key={team.id} value={team.id} className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-sm font-medium">{CATEGORY_LABELS[team.category]}</span>
                  {team.description && (
                    <span className="text-sm text-muted-foreground"> — {team.description}</span>
                  )}
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-destructive hover:text-destructive"
                  onClick={() => setTeamToDelete(team)}
                >
                  <Trash2 className="mr-1 h-4 w-4" /> Delete team
                </Button>
              </div>

              {team.members.length === 0 ? (
                <p className="text-sm text-muted-foreground py-6 text-center">
                  Empty — catch something from the <Link to="/" className="underline">Pokédex</Link>.
                </p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                  {team.members.map((member) => (
                    <MemberCard
                      key={member.id}
                      member={member}
                      actions={
                        <>
                          <EditMemberPopover member={member} teams={teamList} />
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-destructive hover:text-destructive"
                            aria-label="Release"
                            onClick={() => setMemberToRelease(member)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </>
                      }
                    />
                  ))}
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>
      )}

      {/* Create team */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>New team</DialogTitle>
            <DialogDescription>
              The category sets the size limit: Party holds 6, Box holds 30, Showcase holds 12.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="team-name">Name</Label>
              <Input
                id="team-name"
                value={newName}
                maxLength={40}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. Elite Four Prep"
              />
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={newCategory} onValueChange={(v) => setNewCategory(v as TeamCategory)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TEAM_CATEGORIES.map((category) => (
                    <SelectItem key={category} value={category}>
                      {CATEGORY_LABELS[category]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="team-description">Description (optional)</Label>
              <Textarea
                id="team-description"
                rows={2}
                value={newDescription}
                maxLength={300}
                onChange={(e) => setNewDescription(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={!newName.trim() || createTeam.isPending}>
              {createTeam.isPending ? 'Creating…' : 'Create team'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete team confirm */}
      <AlertDialog open={teamToDelete !== null} onOpenChange={(open) => !open && setTeamToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete “{teamToDelete?.name}”?</AlertDialogTitle>
            <AlertDialogDescription>
              {teamToDelete?.members.length
                ? `The ${teamToDelete.members.length} Pokémon in it will be released too. `
                : ''}
              This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (teamToDelete) {
                  deleteTeam.mutate(teamToDelete.id, {
                    onSuccess: () => toast({ title: 'Team deleted' }),
                  });
                  setTeamToDelete(null);
                }
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Release confirm */}
      <AlertDialog
        open={memberToRelease !== null}
        onOpenChange={(open) => !open && setMemberToRelease(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Release {memberToRelease?.nickname ?? capitalize(memberToRelease?.pokemon.name ?? '')}?
            </AlertDialogTitle>
            <AlertDialogDescription>Bye bye, {memberToRelease?.nickname ?? 'friend'}!</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep it</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (memberToRelease) {
                  releaseCaught.mutate(memberToRelease.id, {
                    onSuccess: () => toast({ title: 'Released' }),
                  });
                  setMemberToRelease(null);
                }
              }}
            >
              Release
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default TeamsPanel;
