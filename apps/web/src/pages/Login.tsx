import React, { useState } from 'react';
import { Link, useLocation, useNavigate, Navigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { MailCheck } from 'lucide-react';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { useAuth } from '@/auth/AuthProvider';
import { RETURN_TO_KEY } from '@/auth/OAuthReturn';

/**
 * Safari reports a failed fetch as "Load failed", Chrome as "Failed to
 * fetch", and supabase-js passes either through verbatim. Neither tells the
 * user anything, so translate them into the two real causes.
 */
const NETWORK_ERROR = /load failed|failed to fetch|networkerror|network request failed/i;

function explainAuthError(message: string): string {
  if (NETWORK_ERROR.test(message)) {
    return 'Could not reach the sign-in service. The Supabase project may be paused or unreachable, or this stack may be running in offline mode. Check your .env and how you started docker compose.';
  }
  return message;
}

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

  // A fresh visit resets any return path a past, abandoned Google attempt
  // left behind; only this visit's handleGoogle should set it.
  React.useEffect(() => {
    try {
      window.sessionStorage.removeItem(RETURN_TO_KEY);
    } catch {
      // nothing stale to clear
    }
  }, []);

  if (!loading && session) {
    return <Navigate to={from} replace />;
  }

  const handleGoogle = async () => {
    if (!isSupabaseConfigured) return;
    setError(null);
    // Supabase redirects through Google and back; detectSessionInUrl picks
    // the session up on landing. BASE_URL keeps the GitHub Pages path intact,
    // and OAuthReturn restores `from` once the session lands, since the
    // allowlisted redirect itself must stay the app root.
    try {
      window.sessionStorage.setItem(RETURN_TO_KEY, from);
    } catch {
      // worst case the user lands on the root
    }
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin + import.meta.env.BASE_URL },
    });
    if (oauthError) setError(explainAuthError(oauthError.message));
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSupabaseConfigured) return;
    setError(null);
    setSubmitting(true);
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    setSubmitting(false);
    if (signInError) {
      setError(explainAuthError(signInError.message));
      return;
    }
    navigate(from, { replace: true });
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSupabaseConfigured) return;
    setError(null);
    setSubmitting(true);
    const { data, error: signUpError } = await supabase.auth.signUp({ email, password });
    setSubmitting(false);
    if (signUpError) {
      setError(explainAuthError(signUpError.message));
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
          {!isSupabaseConfigured && (
            <Alert className="mb-4">
              <AlertTitle>Sign-in is off in this build</AlertTitle>
              <AlertDescription>
                This stack is running in offline mode without a Supabase project, so accounts
                are unavailable. Browsing the dex works normally. To enable sign-in, stop the
                offline stack and run <code>docker compose up --build</code> with a filled .env.
              </AlertDescription>
            </Alert>
          )}
          <Button
            type="button"
            variant="outline"
            className="mb-4 w-full"
            disabled={!isSupabaseConfigured}
            onClick={handleGoogle}
          >
            <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
              <path
                fill="#4285F4"
                d="M23.52 12.27c0-.85-.08-1.67-.22-2.46H12v4.65h6.46a5.52 5.52 0 0 1-2.4 3.62v3h3.88c2.27-2.09 3.58-5.17 3.58-8.81Z"
              />
              <path
                fill="#34A853"
                d="M12 24c3.24 0 5.96-1.07 7.94-2.91l-3.88-3.01c-1.07.72-2.45 1.15-4.06 1.15-3.13 0-5.78-2.11-6.72-4.95H1.27v3.11A12 12 0 0 0 12 24Z"
              />
              <path
                fill="#FBBC05"
                d="M5.28 14.28a7.21 7.21 0 0 1 0-4.56V6.61H1.27a12 12 0 0 0 0 10.78l4.01-3.11Z"
              />
              <path
                fill="#EA4335"
                d="M12 4.77c1.76 0 3.34.61 4.59 1.8l3.44-3.44A11.98 11.98 0 0 0 1.27 6.61l4.01 3.11C6.22 6.88 8.87 4.77 12 4.77Z"
              />
            </svg>
            Continue with Google
          </Button>
          <div className="mb-4 flex items-center gap-3 text-xs text-muted-foreground">
            <span className="h-px flex-1 bg-border" />
            or with email
            <span className="h-px flex-1 bg-border" />
          </div>
          <Tabs defaultValue="signin" onValueChange={() => setError(null)}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Sign in</TabsTrigger>
              <TabsTrigger value="signup">Create account</TabsTrigger>
            </TabsList>
            <TabsContent value="signin">
              <form onSubmit={handleSignIn} className="space-y-4 pt-4">
                {fields('current-password')}
                <Button type="submit" className="w-full" disabled={submitting || !isSupabaseConfigured}>
                  {submitting ? 'Signing in…' : 'Sign in'}
                </Button>
              </form>
            </TabsContent>
            <TabsContent value="signup">
              <form onSubmit={handleSignUp} className="space-y-4 pt-4">
                {fields('new-password')}
                <Button type="submit" className="w-full" disabled={submitting || !isSupabaseConfigured}>
                  {submitting ? 'Creating account…' : 'Create account'}
                </Button>
                <p className="text-xs text-muted-foreground">
                  By creating an account you agree to our{' '}
                  <Link to="/terms" className="underline">
                    Terms of Service
                  </Link>{' '}
                  and{' '}
                  <Link to="/privacy" className="underline">
                    Privacy Policy
                  </Link>
                  .
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
