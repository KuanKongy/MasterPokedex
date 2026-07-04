import React, { useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import TrainerProfile from '../components/TrainerProfile';
import OtherTrainerProfile from '../components/OtherTrainerProfile';
import ClaimUsername from '../components/ClaimUsername';
import LoadingSpinner from '../components/LoadingSpinner';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { HoverTip } from '@/components/HelpTip';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import SearchField from '../components/SearchField';
import { User, Medal, LogIn } from 'lucide-react';
import { useAuth } from '@/auth/AuthProvider';
import { useMe, useMyFriends, useTrainers } from '@/hooks/api/trainer';
import { resolveAsset } from '@/lib/assets';

/**
 * The trainer hub, open to everyone: the directory and other trainers'
 * profiles are public reading (the API already serves them without auth),
 * while "My Profile" asks for a sign-in instead of gating the whole page.
 * Another trainer's profile is a real URL, /trainer/:username, so it can be
 * shared and survives reloads; navigating between the routes remounts the
 * page, so the intended tab rides along as location state.
 */
const Trainer = () => {
  const { username } = useParams<{ username: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { session } = useAuth();

  const [activeTab, setActiveTab] = useState(() =>
    username || (location.state as { tab?: string } | null)?.tab === 'other-trainers'
      ? 'other-trainers'
      : 'my-profile',
  );
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');

  const { data: me, isLoading: meLoading } = useMe();
  const { data: friendships } = useMyFriends();
  const {
    data: trainerPages,
    isLoading: trainersLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useTrainers(search);

  const trainers = trainerPages?.pages.flatMap((page) => page.items) ?? [];
  const pendingIncoming = (friendships ?? []).filter(
    (f) => f.status === 'pending' && f.direction === 'incoming',
  ).length;

  const openTrainer = (nextUsername: string) => {
    navigate(`/trainer/${nextUsername}`);
  };

  const handleTabChange = (tab: string) => {
    if (username) {
      // Leaving a profile URL: go back to the hub with the chosen tab.
      navigate('/trainer', { state: { tab } });
      return;
    }
    setActiveTab(tab);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl md:text-4xl font-extrabold mb-2">Trainer Hub</h1>
      <p className="text-muted-foreground mb-8">Your profile, teams, friends and fellow trainers</p>

      <Tabs value={username ? 'other-trainers' : activeTab} onValueChange={handleTabChange} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="my-profile">My Profile</TabsTrigger>
          <TabsTrigger value="other-trainers" className="gap-2">
            Trainers
            {pendingIncoming > 0 && (
              <Badge className="h-5 min-w-5 justify-center px-1">{pendingIncoming}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="my-profile">
          {!session ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="mb-1 font-medium">Sign in to see your profile</p>
                <p className="mb-4 text-sm text-muted-foreground">
                  Teams, caught Pokémon, your bag and friendships live on your trainer account.
                </p>
                <Button onClick={() => navigate('/login', { state: { from: '/trainer' } })}>
                  <LogIn className="mr-2 h-4 w-4" /> Sign in
                </Button>
              </CardContent>
            </Card>
          ) : meLoading ? (
            <div className="flex justify-center p-8">
              <LoadingSpinner />
            </div>
          ) : me ? (
            <TrainerProfile profile={me} onOpenTrainer={openTrainer} />
          ) : (
            <ClaimUsername />
          )}
        </TabsContent>

        <TabsContent value="other-trainers">
          {username ? (
            <div>
              <button
                onClick={() => navigate('/trainer', { state: { tab: 'other-trainers' } })}
                className="mb-6 text-sm flex items-center text-muted-foreground hover:text-foreground transition-colors"
              >
                ← Back to trainer list
              </button>
              <OtherTrainerProfile username={username} onOpenTrainer={openTrainer} />
            </div>
          ) : (
            <div>
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-6">
                <h2 className="text-2xl font-bold">Trainers</h2>
                <SearchField
                  value={searchInput}
                  onChange={(value) => {
                    setSearchInput(value);
                    if (value === '') setSearch('');
                  }}
                  onSubmit={() => setSearch(searchInput.trim())}
                  placeholder="Search by name or username…"
                  className="w-full sm:w-80"
                />
              </div>

              {trainersLoading ? (
                <div className="flex justify-center p-8">
                  <LoadingSpinner />
                </div>
              ) : trainers.length === 0 ? (
                <p className="text-center text-muted-foreground py-12">No trainers found.</p>
              ) : (
                <>
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 pb-4">
                    {trainers.map((trainer) => (
                      <Card
                        key={trainer.id}
                        className="overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
                        onClick={() => openTrainer(trainer.username)}
                      >
                        <CardContent className="p-6">
                          <div className="flex items-start gap-4">
                            <Avatar className="w-16 h-16 rounded-md border-2 border-pokebrand-red">
                              <AvatarImage src={trainer.avatarUrl ? resolveAsset(trainer.avatarUrl) : undefined} alt={trainer.displayName} />
                              <AvatarFallback className="rounded-md text-xl">
                                {trainer.displayName.charAt(0)}
                              </AvatarFallback>
                            </Avatar>

                            <div className="space-y-2">
                              <div>
                                <h3 className="font-semibold text-lg flex items-center gap-1">
                                  <User className="h-4 w-4" /> {trainer.displayName}
                                  {trainer.isGuest && (
                                    <HoverTip
                                      title="Resident"
                                      faq="residents"
                                      trigger={
                                        <Badge variant="outline" className="ml-1 text-xs">
                                          Resident
                                        </Badge>
                                      }
                                    >
                                      A seeded character from the games and the show. Nobody
                                      signs in as them, and their teams don't change.
                                    </HoverTip>
                                  )}
                                </h3>
                                <p className="text-muted-foreground text-sm">
                                  @{trainer.username}
                                  {trainer.regionName ? ` · ${trainer.regionName}` : ''}
                                </p>
                              </div>

                              <div className="flex items-center gap-3 text-sm">
                                <HoverTip
                                  title="Gym badges"
                                  faq="ranks"
                                  trigger={
                                    <span className="flex items-center gap-1">
                                      <Medal className="h-4 w-4 text-yellow-500" />
                                      {trainer.badges}
                                    </span>
                                  }
                                >
                                  The gym badges this trainer has earned, up to the games' 64.
                                </HoverTip>
                                <HoverTip
                                  title="Trainer rank"
                                  faq="ranks"
                                  trigger={
                                    <Badge variant="secondary" className="capitalize">
                                      {trainer.rank}
                                    </Badge>
                                  }
                                >
                                  The ladder runs Rookie to Champion; the higher ranks are worn
                                  by the resident cast for now.
                                </HoverTip>
                              </div>

                              <div className="text-sm">
                                <span className="text-muted-foreground">Caught:</span>{' '}
                                <span>{trainer.caughtCount}</span>
                                {trainer.favoriteType && (
                                  <>
                                    {' · '}
                                    <span className="text-muted-foreground">Loves</span>{' '}
                                    <span className="capitalize">{trainer.favoriteType}</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>

                  {hasNextPage && (
                    <div className="flex justify-center">
                      <Button variant="outline" onClick={() => fetchNextPage()} disabled={isFetchingNextPage}>
                        {isFetchingNextPage ? 'Loading…' : 'More trainers'}
                      </Button>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Trainer;
