// src/pages/VerifyEmail.tsx
// Enhanced with resend cooldown and success animation

import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Mail, CheckCircle2, Loader2, AlertCircle, Sparkles } from 'lucide-react';

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const [email, setEmail] = useState(searchParams.get('email') || '');
  const [loading, setLoading] = useState(true);
  const [resending, setResending] = useState(false);
  const [verified, setVerified] = useState(false);
  const [message, setMessage] = useState('');
  const [isSignup, setIsSignup] = useState(searchParams.get('signup') === 'true');
  
  // Resend cooldown state
  const [cooldownSeconds, setCooldownSeconds] = useState(0);
  const [lastSentTime, setLastSentTime] = useState<number | null>(null);
  
  // Success animation state
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    checkVerificationStatus();
    
    // Load last sent time from localStorage
    const storedTime = localStorage.getItem('verification_email_sent');
    if (storedTime) {
      const timeSince = Date.now() - parseInt(storedTime);
      const remaining = Math.max(0, 60 - Math.floor(timeSince / 1000));
      if (remaining > 0) {
        setCooldownSeconds(remaining);
        setLastSentTime(parseInt(storedTime));
      }
    }
  }, []);

  //automatic refresh check
useEffect(() => {
  checkVerificationStatus();
  
  // Check verification status every 3 seconds
  const interval = setInterval(() => {
    checkVerificationStatus();
  }, 3000);
  
  return () => clearInterval(interval);
}, []);

  // Cooldown timer
  useEffect(() => {
    if (cooldownSeconds <= 0) return;

    const timer = setInterval(() => {
      setCooldownSeconds(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [cooldownSeconds]);

  // Confetti animation effect
  useEffect(() => {
    if (showConfetti) {
      const timer = setTimeout(() => setShowConfetti(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [showConfetti]);

  async function checkVerificationStatus() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        // No user logged in
        setLoading(false);
        setMessage('Please log in to verify your email.');
        return;
      }

      // Check if already verified
      if (user.email_confirmed_at) {
        setVerified(true);
        setShowConfetti(true);
        setMessage('Your email is already verified!');
        
        // Redirect to home after 2 seconds
        setTimeout(() => navigate('/'), 2000);
      } else {
        setMessage('Please check your email for a verification link.');
      }

      if (!email && user.email) {
        setEmail(user.email);
      }
    } catch (error) {
      console.error('Error checking verification:', error);
      setMessage('Error checking verification status');
    } finally {
      setLoading(false);
    }
  }

  async function handleResendVerification() {
    if (!email) {
      setMessage('Please enter your email address');
      return;
    }

    if (cooldownSeconds > 0) {
      setMessage(`Please wait ${cooldownSeconds} seconds before resending`);
      return;
    }

    setResending(true);
    setMessage('');

    try {
      // Resend confirmation email using Supabase's built-in method
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email,
      });

      if (error) throw error;

      // Set cooldown
      const now = Date.now();
      localStorage.setItem('verification_email_sent', now.toString());
      setLastSentTime(now);
      setCooldownSeconds(60);
      
      setMessage('Verification email sent! Please check your inbox and spam folder.');
    } catch (error: any) {
      console.error('Resend error:', error);
      setMessage(error.message || 'Failed to resend verification email');
    } finally {
      setResending(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 px-4">
      <div className="max-w-md w-full bg-card rounded-2xl shadow-2xl p-8">
        <div className="text-center">
          {verified ? (
            <div className="relative">
              <CheckCircle2 className="mx-auto h-16 w-16 text-green-500 mb-4" />
              {showConfetti && (
                <div className="absolute inset-0 pointer-events-none">
                  {[...Array(20)].map((_, i) => (
                    <Sparkles
                      key={i}
                      className="absolute text-yellow-400 animate-ping"
                      style={{
                        left: `${Math.random() * 100}%`,
                        top: `${Math.random() * 100}%`,
                        animationDelay: `${Math.random() * 0.5}s`,
                        animationDuration: `${1 + Math.random()}s`
                      }}
                      size={16 + Math.random() * 16}
                    />
                  ))}
                </div>
              )}
            </div>
          ) : (
            <Mail className="mx-auto h-16 w-16 text-purple-600 mb-4" />
          )}
          
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {verified ? 'Email Verified!' : 'Verify Your Email'}
          </h1>
          
          <p className="text-gray-600 mb-6">
            {verified 
              ? 'Redirecting you to the homepage...'
              : isSignup
                ? `We've sent a verification link to ${email}`
                : 'Please verify your email to access your account'
            }
          </p>

          {message && (
            <div className={`mb-6 p-4 rounded-lg flex items-start gap-3 ${
              verified 
                ? 'bg-green-50 border border-green-200'
                : message.includes('Error') || message.includes('Failed') || message.includes('wait')
                  ? 'bg-red-50 border border-red-200'
                  : 'bg-blue-50 border border-blue-200'
            }`}>
              {verified ? (
                <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
              ) : message.includes('Error') || message.includes('Failed') || message.includes('wait') ? (
                <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
              ) : (
                <Mail className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
              )}
              <p className={`text-sm ${
                verified 
                  ? 'text-green-800'
                  : message.includes('Error') || message.includes('Failed') || message.includes('wait')
                    ? 'text-red-800'
                    : 'text-blue-800'
              }`}>
                {message}
              </p>
            </div>
          )}

          {!verified && (
            <div className="space-y-4">
              <div className="bg-gray-50 rounded-lg p-4 text-left">
                <h3 className="font-semibold text-gray-900 mb-2">What to do:</h3>
                <ol className="space-y-2 text-sm text-gray-600">
                  <li className="flex gap-2">
                    <span className="font-semibold">1.</span>
                    <span>Check your email inbox for a message from Repdox</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="font-semibold">2.</span>
                    <span>Click the verification link in the email</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="font-semibold">3.</span>
                    <span>You'll be redirected back and can start using your account</span>
                  </li>
                </ol>
              </div>

              <Button
                onClick={handleResendVerification}
                disabled={resending || !email || cooldownSeconds > 0}
                className="w-full bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-700 hover:to-cyan-700 disabled:opacity-50"
              >
                {resending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : cooldownSeconds > 0 ? (
                  <>Resend in {cooldownSeconds}s</>
                ) : (
                  "Didn't receive the email? Resend"
                )}
              </Button>

              {cooldownSeconds > 0 && (
                <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  <span>Cooldown active: {cooldownSeconds} seconds remaining</span>
                </div>
              )}

              <div className="text-sm text-gray-500 space-y-1">
                <p>💡 Check your spam/junk folder</p>
                <p>💡 Make sure {email} is correct</p>
                <p>💡 You can resend after 60 seconds</p>
              </div>
            </div>
          )}

          <div className="mt-6 pt-6 border-t border-gray-200">
            <button
              onClick={() => navigate('/signin')}
              className="text-sm text-purple-600 hover:text-purple-700 font-medium"
            >
              ← Back to sign in
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}