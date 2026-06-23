import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ClaimUsernameInputSchema, type ClaimUsernameInput } from '@masterpokedex/shared';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { UserPlus } from 'lucide-react';
import { useClaimUsername } from '@/hooks/api/trainer';
import { isApiError } from '@/lib/api';

/**
 * First-login onboarding. A Supabase account exists but has no trainer row
 * yet (GET /v1/me → 404); claiming a username creates it. The username race
 * is decided by the database's unique index and surfaces as a field error.
 */
const ClaimUsername: React.FC = () => {
  const claim = useClaimUsername();

  const form = useForm<ClaimUsernameInput>({
    resolver: zodResolver(ClaimUsernameInputSchema),
    defaultValues: { username: '', displayName: '' },
  });

  const onSubmit = (input: ClaimUsernameInput) => {
    claim.mutate(input, {
      onError: (err) => {
        if (isApiError(err, 'username_taken')) {
          form.setError('username', { message: 'That username is already taken' });
        } else {
          form.setError('root', {
            message: isApiError(err) ? err.message : 'Something went wrong — please try again',
          });
        }
      },
    });
  };

  return (
    <div className="flex justify-center py-8">
      <Card className="w-full max-w-lg shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-pokebrand-red" />
            Choose your trainer name
          </CardTitle>
          <CardDescription>
            One last step: pick the username other trainers will find you by. You can change your
            display name any time, but usernames are forever.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Username</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. red_from_pallet" autoComplete="off" {...field} />
                    </FormControl>
                    <FormDescription>
                      3–20 characters; lowercase letters, numbers and underscores.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="displayName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Display name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Red" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {form.formState.errors.root && (
                <p className="text-sm text-destructive">{form.formState.errors.root.message}</p>
              )}

              <Button type="submit" className="w-full" disabled={claim.isPending}>
                {claim.isPending ? 'Claiming…' : 'Start your journey'}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
};

export default ClaimUsername;
