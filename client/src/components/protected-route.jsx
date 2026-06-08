import { Navigate } from 'react-router-dom';

import { useAuthStore } from '../store/auth-store.js';

/** Gate routes behind authentication. Shows nothing while the session resolves. */
export function ProtectedRoute({ children }) {
  const status = useAuthStore((s) => s.status);

  if (status === 'idle' || status === 'loading') {
    return <div className="route-loading">Loading…</div>;
  }
  if (status !== 'authenticated') {
    return <Navigate to="/login" replace />;
  }
  return children;
}
