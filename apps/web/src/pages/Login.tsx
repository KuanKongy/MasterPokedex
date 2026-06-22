import React, { useState } from 'react';
import { useLocation, useNavigate, Navigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { MailCheck } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/auth/AuthProvider';

/**
 * Email/password auth. Sign-up intentionally treats "check your email" as the
 * happy path — Supabase requires email confirmation by default, so a null
 * session after signUp is normal, not an error.
 */
const Login: React.FC = () => {
  const { session, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? '/trainer';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [awaitingConfirmation, setAwaitingConfirmation] = useState(false);

  if (!loading && session) {
    return <Navigate to={from} replace />;
  }

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    setSubmitting(false);
    if (signInError) {
      setError(signInError.message);
      return;
    }
    navigate(from, { replace: true });
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const { data, error: signUpError } = await supabase.auth.signUp({ email, password });
    setSubmitting(false);
    if (signUpError) {
      setError(signUpError.message);
      return;
    }
    if (data.session) {
      // Email confirmation disabled on this project — signed in immediately.
      navigate(from, { replace: true });
      return;
    }
    setAwaitingConfirmation(true);
  };

  if (awaitingConfirmation) {
    return (
      <div className="container mx-auto flex justify-center px-4 py-16">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MailCheck className="h-5 w-5 text-green-600" />
              Check your email
            </CardTitle>
            <CardDescription>
              We sent a confirmation link to <span className="font-medium">{email}</span>.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground">
            <p>
              Click the link in that email to activate your account, then come back here and sign
              in. It can take a minute to arrive — check your spam folder too.
            </p>
            <Button variant="outline" className="w-full" onClick={() => setAwaitingConfirmation(false)}>
              Back to sign in
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const fields = (autoCompletePassword: string) => (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="trainer@example.com"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          type="password"
          autoComplete={autoCompletePassword}
          required
          minLength={6}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
        />
      </div>
      {error && (
        <Alert variant="destructive">
          <AlertTitle>That didn't work</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </div>
  );

  return (
    <div className="container mx-auto flex justify-center px-4 py-16">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Welcome, trainer</CardTitle>
          <CardDescription>
            Sign in to manage your teams, bag and friends. Browsing the dex needs no account.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="signin" onValueChange={() => setError(null)}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Sign in</TabsTrigger>
              <TabsTrigger value="signup">Create account</TabsTrigger>
            </TabsList>
            <TabsContent value="signin">
              <form onSubmit={handleSignIn} className="space-y-4 pt-4">
                {fields('current-password')}
                <Button type="submit" className="w-full" disabled={submitting}>
                  {submitting ? 'Signing in…' : 'Sign in'}
                </Button>
              </form>
            </TabsContent>
            <TabsContent value="signup">
              <form onSubmit={handleSignUp} className="space-y-4 pt-4">
                {fields('new-password')}
                <Button type="submit" className="w-full" disabled={submitting}>
                  {submitting ? 'Creating account…' : 'Create account'}
                </Button>
                <p className="text-xs text-muted-foreground">
                  By creating an account you agree to our Terms of Service and Privacy Policy.
                </p>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;
