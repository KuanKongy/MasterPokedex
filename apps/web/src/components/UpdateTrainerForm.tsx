import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { TrainerProfile } from '@masterpokedex/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
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
import { useUpdateProfile } from '@/hooks/api/trainer';
import { useRegions } from '@/hooks/api/world';
import { useTypes } from '@/hooks/api/pokemon';
import { useToast } from '@/hooks/use-toast';
import { isApiError } from '@/lib/api';
import { capitalize } from '../utils/helpers';

/** Form-side schema; "none" sentinels become nulls in the PATCH payload. */
const FormSchema = z.object({
  displayName: z.string().min(1, 'Display name is required').max(40),
  bio: z.string().max(500).optional(),
  avatarUrl: z.string().url('Must be a valid URL').or(z.literal('')),
  regionId: z.string(),
  favoriteTypeId: z.string(),
  isPublic: z.boolean(),
});
type FormValues = z.infer<typeof FormSchema>;

interface UpdateTrainerFormProps {
  trainer: TrainerProfile;
  onClose: () => void;
}

const NONE = 'none';

const UpdateTrainerForm: React.FC<UpdateTrainerFormProps> = ({ trainer, onClose }) => {
  const { toast } = useToast();
  const update = useUpdateProfile();
  const { data: regions } = useRegions();
  const { data: types } = useTypes();

  const form = useForm<FormValues>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      displayName: trainer.displayName,
      bio: trainer.bio ?? '',
      avatarUrl: trainer.avatarUrl ?? '',
      regionId: trainer.regionId ? String(trainer.regionId) : NONE,
      favoriteTypeId: NONE,
      isPublic: trainer.isPublic,
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

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={update.isPending}>
            {update.isPending ? 'Saving…' : 'Save changes'}
          </Button>
        </div>
      </form>
    </Form>
  );
};

export default UpdateTrainerForm;
