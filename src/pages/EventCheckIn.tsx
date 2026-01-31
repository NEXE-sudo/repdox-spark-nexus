import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import EnhancedAdminScanner from '@/Admin_Scanner/AdminScanner';

export default function EventCheckIn() {
  const { eventId } = useParams();
  
  return (
    <div className="min-h-screen bg-background p-4">
      <EnhancedAdminScanner
        eventId={eventId}
        supabaseClient={supabase}
        onCheckIn={(registration) => {
        }}
      />
    </div>
  );
}