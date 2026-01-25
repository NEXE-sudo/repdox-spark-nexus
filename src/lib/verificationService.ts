import { supabase } from '@/integrations/supabase/client';

interface SendVerificationParams {
  userId: string;
  type: 'email' | 'phone';
  contact: string;
  ttlSeconds?: number;
}

interface VerifyTokenParams {
  userId: string;
  type: 'email' | 'phone';
  contact: string;
  token: string;
}

/**
 * Send verification token via Edge Function
 * This calls your deployed send-verification function
 */
export async function sendVerificationToken(params: SendVerificationParams) {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    
    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-verification`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token || ''}`,
        },
        body: JSON.stringify(params),
      }
    );

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || 'Failed to send verification');
    }

    return { success: true, data: result };
  } catch (error) {
    console.error('Send verification error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * Verify token by checking profile_verifications table
 */
export async function verifyToken(params: VerifyTokenParams) {
  try {
    const { data, error } = await supabase
      .from('profile_verifications')
      .select('*')
      .eq('user_id', params.userId)
      .eq('type', params.type)
      .eq('contact', params.contact)
      .eq('token', params.token)
      .single();

    if (error) throw error;
    if (!data) throw new Error('Invalid verification token');

    // Check if token is expired
    if (new Date(data.expires_at) < new Date()) {
      throw new Error('Verification token has expired');
    }

    // Check if already verified
    if (data.verified) {
      return { success: true, message: 'Already verified' };
    }

    // Mark as verified
    const { error: updateError } = await supabase
      .from('profile_verifications')
      .update({ verified: true })
      .eq('id', data.id);

    if (updateError) throw updateError;

    return { success: true, message: 'Verification successful' };
  } catch (error) {
    console.error('Verify token error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Verification failed' 
    };
  }
}

/**
 * Check if user's email is verified
 */
export async function isEmailVerified(userId: string, email: string): Promise<boolean> {
  try {
    const { data } = await supabase
      .from('profile_verifications')
      .select('verified')
      .eq('user_id', userId)
      .eq('type', 'email')
      .eq('contact', email)
      .eq('verified', true)
      .single();

    return !!data;
  } catch {
    return false;
  }
}

/**
 * Get user's verification status
 */
export async function getVerificationStatus(userId: string) {
  try {
    const { data: user } = await supabase.auth.getUser();
    
    if (!user.user) {
      return { verified: false, method: null };
    }

    // Check Supabase Auth's built-in email confirmation
    if (user.user.email_confirmed_at) {
      return { verified: true, method: 'supabase_auth' };
    }

    // Check custom verification table
    const { data } = await supabase
      .from('profile_verifications')
      .select('verified, type, contact')
      .eq('user_id', userId)
      .eq('verified', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (data) {
      return { verified: true, method: 'custom', type: data.type };
    }

    return { verified: false, method: null };
  } catch {
    return { verified: false, method: null };
  }
}