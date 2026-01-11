// src/pages/AuthCallback.tsx
// Handles OAuth redirects and email verification confirmations

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';

export default function AuthCallback() {
  const navigate = useNavigate();
  const [message, setMessage] = useState('Processing...');

  useEffect(() => {
    handleAuthCallback();
  }, []);

  async function handleAuthCallback() {
  try {
    // Get the session from the URL
    const { data: { session }, error } = await supabase.auth.getSession();

    if (error) {
      console.error('Auth callback error:', error);
      setMessage('Verification failed. Please try again.');
      setTimeout(() => navigate('/signin'), 2000);
      return;
    }

    if (!session) {
      setMessage('No session found. Redirecting to sign in...');
      setTimeout(() => navigate('/signin'), 2000);
      return;
    }

    const user = session.user;
    
    // Check email verification
    if (user.email_confirmed_at) {
      // Email verified successfully!
      setMessage('Email verified! Setting up your account...');
      
      // Check if profile exists
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('id, full_name, "Date of Birth"')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!profile || !profile.full_name || !profile['Date of Birth']) {
        // New user - go to onboarding
        setTimeout(() => navigate('/profile?onboard=true'), 1000);
      } else {
        // Existing user - go to home
        setTimeout(() => navigate('/'), 1000);
      }
    } else {
      // Still not verified
      setMessage('Email not yet verified. Please check your email...');
      setTimeout(() => navigate(`/verify-email?email=${encodeURIComponent(user.email || '')}`), 1500);
    }
  } catch (error) {
    console.error('Callback processing error:', error);
    setMessage('An error occurred. Redirecting...');
    setTimeout(() => navigate('/signin'), 2000);
  }
}


  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4 text-center">
        <Loader2 className="h-12 w-12 animate-spin text-purple-600 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          {message}
        </h2>
        <p className="text-gray-600">
          Please wait while we complete the process.
        </p>
      </div>
    </div>
  );
}