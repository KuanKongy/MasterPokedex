import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './AuthProvider';

/** Where Login stashes the page a Google sign-in should come back to. */
export const RETURN_TO_KEY = 'masterpokedex.postLoginReturnTo';

/**
 * Finishes the Google round trip. The OAuth redirect has to land on the app
 * root (that exact URL is on the Supabase allowlist), so Login stashes where
 * the user came from in sessionStorage and this component, mounted once
 * inside the router, carries them back the moment the session appears.
 * Email sign-ins never set the key, and Login clears any stale one on mount.
 */
const OAuthReturn: React.FC = () => {
  const { session } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!session) return;
    let to: string | null = null;
    try {
      to = window.sessionStorage.getItem(RETURN_TO_KEY);
      if (to) window.sessionStorage.removeItem(RETURN_TO_KEY);
    } catch {
      return;
    }
    // Only ever an in-app path; anything else is ignored.
    if (to && to.startsWith('/')) navigate(to, { replace: true });
  }, [session, navigate]);

  return null;
};

export default OAuthReturn;
