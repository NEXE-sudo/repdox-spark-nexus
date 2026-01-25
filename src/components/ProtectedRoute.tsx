// src/components/ProtectedRoute.tsx
// Wrapper component to protect routes that require authentication and email verification

import { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const location = useLocation();

  useEffect(() => {
    checkAuth();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setIsAuthenticated(true);
        setIsVerified(!!session.user.email_confirmed_at);
        setUserEmail(session.user.email || '');
      } else {
        setIsAuthenticated(false);
        setIsVerified(false);
        setUserEmail('');
      }
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  async function checkAuth() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setIsAuthenticated(false);
        setIsVerified(false);
        setLoading(false);
        return;
      }

      setIsAuthenticated(true);
      setIsVerified(!!user.email_confirmed_at);
      setUserEmail(user.email || '');
    } catch (error) {
      console.error('Auth check error:', error);
      setIsAuthenticated(false);
      setIsVerified(false);
    } finally {
      setLoading(false);
    }
  }

  // Show loading spinner while checking auth
  if (loading) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="text-center">
        <Loader2 className="h-12 w-12 animate-spin text-purple-400 mx-auto mb-4" />
        <p className="text-white/80 text-sm">Verifying your access...</p>
        <p className="text-white/60 text-xs mt-2">This should only take a moment</p>
      </div>
    </div>
  );
}

  // Redirect to signin if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/signin" state={{ from: location }} replace />;
  }

  // Redirect to verify-email if not verified
  if (!isVerified) {
    return <Navigate to={`/verify-email?email=${encodeURIComponent(userEmail)}`} replace />;
  }

  // User is authenticated and verified - render the protected content
  return <>{children}</>;
}