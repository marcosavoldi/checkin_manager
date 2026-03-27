import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Center, Loader } from '@mantine/core';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
  adminOnly?: boolean;
}

export default function ProtectedRoute({ children, requireAdmin = false, adminOnly = false }: ProtectedRouteProps) {
  const { user, loading } = useAuth();
  const isAdminRequired = requireAdmin || adminOnly;

  if (loading) {
    return (
      <Center h="100vh">
        <Loader size="xl" />
      </Center>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (isAdminRequired && user.appRole !== 'admin') {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
