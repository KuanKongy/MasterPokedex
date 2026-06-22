import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from './AuthProvider';
import LoadingSpinner from '@/components/LoadingSpinner';

/**
 * Route guard for user-specific pages. Public pages never sit behind this —
 * the dex, map and filter work signed out; only "my" pages require a session.
 * The original location rides along so login can bounce straight back.
 */
const RequireAuth: React.FC = () => {
  const { session, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <LoadingSpinner />
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  }

  return <Outlet />;
};

export default RequireAuth;
