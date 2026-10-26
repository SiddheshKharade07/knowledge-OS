import * as React from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/auth';
import { isAdmin } from '../../lib/permissions';

export function ProtectedRoute({ children }: { children: React.ReactElement }) {
  const token = useAuthStore((s) => s.token);
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

export function PublicOnlyRoute({ children }: { children: React.ReactElement }) {
  const token = useAuthStore((s) => s.token);
  const navigate = useNavigate();
  React.useEffect(() => {
    if (token) {
      navigate('/chat', { replace: true });
    }
  }, [token, navigate]);
  if (token) {
    return <Navigate to="/chat" replace />;
  }
  return children;
}

export function AdminRoute({ children }: { children: React.ReactElement }) {
  const { token, user } = useAuthStore();
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  if (!isAdmin(user)) {
    return <Navigate to="/chat" replace />;
  }
  return children;
}
