import React from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { TrainerProfile } from '@masterpokedex/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useDeleteAccount, useUpdateProfile } from '@/hooks/api/trainer';
import { useRegions } from '@/hooks/api/world';
import { useTypes } from '@/hooks/api/pokemon';
import HelpTip from './HelpTip';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/auth/AuthProvider';
import { isApiError } from '@/lib/api';
import { capitalize } from '../utils/helpers';

/** Form-side schema; "none" sentinels become nulls in the PATCH payload. */
const FormSchema = z.object({
  displayName: z.string().min(1, 'Display name is required').max(40),
  bio: z.string().max(500).optional(),
  avatarUrl: z
    .string()
    .url('Must be a valid URL')
    .refine((u) => /^https?:\/\//i.test(u), 'Must be an http or https URL')
    .or(z.literal('')),
  regionId: z.string(),
  favoriteTypeId: z.string(),
  isPublic: z.boolean(),
  showBag: z.boolean(),
  showFavorites: z.boolean(),
  showActivity: z.boolean(),
  showFriends: z.boolean(),
  showTeams: z.boolean(),
});
type FormValues = z.infer<typeof FormSchema>;

/** The per-section switches, rendered as one compact block. */
const SECTION_TOGGLES = [
  { name: 'showTeams', label: 'Show my teams' },
  { name: 'showBag', label: 'Show my bag' },
  { name: 'showFavorites', label: 'Show my favorites' },
  { name: 'showActivity', label: 'Show my activity' },
  { name: 'showFriends', label: 'Show my friends' },
] as const;

interface UpdateTrainerFormProps {
  trainer: TrainerProfile;
  onClose: () => void;
}

const NONE = 'none';

const UpdateTrainerForm: React.FC<UpdateTrainerFormProps> = ({ trainer, onClose }) => {
  const { toast } = useToast();
  const update = useUpdateProfile();
  const deleteAccount = useDeleteAccount();
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: regions } = useRegions();
  const { data: types } = useTypes();

  const handleDeleteAccount = () => {
    deleteAccount.mutate(undefined, {
      onSuccess: async () => {
        toast({ title: 'Account deleted', description: 'Your trainer data is gone. Safe travels.' });
        queryClient.clear();
        await signOut();
        navigate('/');
      },
      onError: (err) => {
        toast({
          title: 'Could not delete account',
          description: isApiError(err) ? err.message : 'Please try again.',
          variant: 'destructive',
        });
      },
    });
  };

  const form = useForm<FormValues>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      displayName: trainer.displayName,
      bio: trainer.bio ?? '',
      avatarUrl: trainer.avatarUrl ?? '',
      regionId: trainer.regionId ? String(trainer.regionId) : NONE,
      favoriteTypeId: NONE,
      isPublic: trainer.isPublic,
      showBag: trainer.showBag,
      showFavorites: trainer.showFavorites,
      showActivity: trainer.showActivity,
      showFriends: trainer.showFriends,
      showTeams: trainer.showTeams,
    },
  });

  // favoriteType comes back as a name; resolve it to an id once types load.
  React.useEffect(() => {
    if (types && trainer.favoriteType) {
      const match = types.find((t) => t.name === trainer.favoriteType);
      if (match) form.setValue('favoriteTypeId', String(match.id));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [types]);

  const onSubmit = (values: FormValues) => {
    update.mutate(
      {
        displayName: values.displayName,
        bio: values.bio?.trim() ? values.bio.trim() : null,
        avatarUrl: values.avatarUrl ? values.avatarUrl : null,
        regionId: values.regionId === NONE ? null : Number(values.regionId),
        favoriteTypeId: values.favoriteTypeId === NONE ? null : Number(values.favoriteTypeId),
        isPublic: values.isPublic,
        showBag: values.showBag,
        showFavorites: values.showFavorites,
        showActivity: values.showActivity,
        showFriends: values.showFriends,
        showTeams: values.showTeams,
      },
      {
        onSuccess: () => {
          toast({ title: 'Profile updated' });
          onClose();
        },
        onError: (err) => {
          toast({
            title: 'Could not update profile',
            description: isApiError(err) ? err.message : 'Please try again.',
            variant: 'destructive',
          });
        },
      },
    );
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="displayName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Display name</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="bio"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Bio</FormLabel>
              <FormControl>
                <Textarea rows={3} placeholder="Tell other trainers about yourself…" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="avatarUrl"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Avatar URL</FormLabel>
              <FormControl>
                <Input placeholder="https://…" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="regionId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Home region</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value={NONE}>No region</SelectItem>
                    {regions?.map((region) => (
                      <SelectItem key={region.id} value={String(region.id)}>
                        {region.displayName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="favoriteTypeId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Favorite type</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value={NONE}>No favorite</SelectItem>
                    {types?.map((type) => (
                      <SelectItem key={type.id} value={String(type.id)}>
                        {capitalize(type.name)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="isPublic"
          render={({ field }) => (
            <FormItem className="flex items-center justify-between rounded-md border p-3">
              <div>
                <FormLabel>Public profile</FormLabel>
                <FormDescription>
                  Public profiles appear in the trainer directory. Private ones are visible only to
                  friends.
                </FormDescription>
              </div>
              <FormControl>
                <Switch checked={field.value} onCheckedChange={field.onChange} />
              </FormControl>
            </FormItem>
          )}
        />

        <div className="space-y-2 rounded-md border p-3">
          <p className="text-sm font-medium">
            Profile sections
            <HelpTip title="Profile sections" faq="privacy" className="ml-1">
              Five switches, one per section of your public profile; a section that is off is
              hidden from everyone but you, friends included.
            </HelpTip>
          </p>
          <FormDescription>
            What a permitted viewer sees on your profile. These only matter while your profile is
            public or shared with friends.
          </FormDescription>
          {SECTION_TOGGLES.map((toggle) => (
            <FormField
              key={toggle.name}
              control={form.control}
              name={toggle.name}
              render={({ field }) => (
                <FormItem className="flex items-center justify-between">
                  <FormLabel className="font-normal">{toggle.label}</FormLabel>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />
          ))}
        </div>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={update.isPending}>
            {update.isPending ? 'Saving…' : 'Save changes'}
          </Button>
        </div>

        <div className="space-y-2 rounded-md border border-destructive/50 p-3">
          <p className="text-sm font-medium text-destructive">Danger zone</p>
          <div className="flex items-center justify-between gap-4">
            <FormDescription>
              Deleting your account removes everything attached to it: profile, teams, caught
              Pokémon, bag, friendships, favorites and activity. There is no undo.
            </FormDescription>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button type="button" variant="destructive" size="sm" className="shrink-0">
                  Delete account
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete @{trainer.username} forever?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Your trainer profile and everything on it, teams, caught Pokémon, bag,
                    friendships, favorites and activity, will be permanently removed, and your
                    sign-in with it. This cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Keep my account</AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    disabled={deleteAccount.isPending}
                    onClick={handleDeleteAccount}
                  >
                    {deleteAccount.isPending ? 'Deleting…' : 'Delete everything'}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </form>
    </Form>
  );
};

export default UpdateTrainerForm;
