import { ReactNode } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { Navigate, useLocation } from 'react-router-dom';
import Layout from './Layout';
import AuthLoading from './AuthLoading';

interface ProtectedRouteProps {
  children: ReactNode;
}

const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { isLoaded, isSignedIn } = useAuth();
  const location = useLocation();

  // Show loading state while Clerk is initializing
  if (!isLoaded) {
    return <AuthLoading />;
  }

  // Redirect to landing page if not signed in
  if (!isSignedIn) {
    // Store the current location so we can redirect back after login
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  // Wrap authenticated content in Layout
  return <Layout>{children}</Layout>;
};

export default ProtectedRoute; 