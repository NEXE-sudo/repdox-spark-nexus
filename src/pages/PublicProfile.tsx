import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { getAvatarSignedUrl } from '@/lib/profileService';
import PublicProfileComponent from '@/Landing_page/ProfileLandingPage';

export default function PublicProfile() {
  const { userId } = useParams();
  
  return (
    <PublicProfileComponent 
      userId={userId}
      supabase={supabase}
      getAvatarSignedUrl={getAvatarSignedUrl}
    />
  );
}