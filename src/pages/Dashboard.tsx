import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Calendar, Bookmark, FileText, Users, 
  GripVertical, Eye, EyeOff, Plus
} from 'lucide-react';

interface DashboardSection {
  id: string;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  visible: boolean;
  order: number;
  component: React.ReactNode;
}

interface DashboardProps {
  embeddedUser?: User | null;
}

export default function Dashboard({ embeddedUser }: DashboardProps) {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(embeddedUser ?? null);
  const [sections, setSections] = useState<DashboardSection[]>([]);
  const [draggedSection, setDraggedSection] = useState<string | null>(null);

  useEffect(() => {
    const init = async () => {
      if (embeddedUser) {
        // embedded in profile, user already passed in
        loadDashboardPreferences();
        return;
      }

      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) {
        navigate('/signin');
        return;
      }
      setUser(currentUser);
      loadDashboardPreferences();
    };
    init();
  }, [navigate, embeddedUser]);

  const loadDashboardPreferences = () => {
    try {
      const stored = localStorage.getItem('dashboardPreferences');
      const prefs = stored ? JSON.parse(stored) : null;
      
      const defaultSections: DashboardSection[] = [
        { id: 'upcoming', title: 'Upcoming Events', icon: Calendar, visible: true, order: 0, component: <UpcomingEvents /> },
        { id: 'joined', title: 'Events Joined', icon: Users, visible: true, order: 1, component: <JoinedEvents /> },
        { id: 'saved', title: 'Saved Events', icon: Bookmark, visible: true, order: 2, component: <SavedEvents /> },
        { id: 'drafts', title: 'Draft Events', icon: FileText, visible: true, order: 3, component: <DraftEvents /> }
      ];

      if (prefs) {
        type Pref = { id: string; visible: boolean; order: number };
        const merged = defaultSections.map(section => {
          const pref = (prefs as Pref[]).find((p) => p.id === section.id);
          return pref ? { ...section, visible: pref.visible, order: pref.order } : section;
        });
        setSections(merged.sort((a, b) => a.order - b.order));
      } else {
        setSections(defaultSections);
      }
    } catch (err) {
      console.error('Error loading dashboard preferences:', err);
    }
  };

  const saveDashboardPreferences = (newSections: DashboardSection[]) => {
    try {
      const prefs = newSections.map(s => ({ id: s.id, visible: s.visible, order: s.order }));
      localStorage.setItem('dashboardPreferences', JSON.stringify(prefs));
    } catch (err) {
      console.error('Error saving dashboard preferences:', err);
    }
  };

  const toggleVisibility = (id: string) => {
    const updated = sections.map(s => 
      s.id === id ? { ...s, visible: !s.visible } : s
    );
    setSections(updated);
    saveDashboardPreferences(updated);
  };

  const handleDragStart = (id: string) => {
    setDraggedSection(id);
  };

  const handleDragOver = (e: React.DragEvent, id: string) => {
    e.preventDefault();
    if (!draggedSection || draggedSection === id) return;

    const draggedIndex = sections.findIndex(s => s.id === draggedSection);
    const targetIndex = sections.findIndex(s => s.id === id);

    const newSections = [...sections];
    const [removed] = newSections.splice(draggedIndex, 1);
    newSections.splice(targetIndex, 0, removed);
    
    const reordered = newSections.map((s, i) => ({ ...s, order: i }));
    setSections(reordered);
    saveDashboardPreferences(reordered);
  };

  const visibleSections = sections.filter(s => s.visible);

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold">Dashboard</h1>
            <p className="text-muted-foreground mt-2">Your personal control center</p>
          </div>
          <Button onClick={() => navigate('/events/new')}>
            <Plus className="w-4 h-4 mr-2" />
            Create Event
          </Button>
        </div>

        {/* Section Controls */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-sm">Customize Sections</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {sections.map(section => {
                const Icon = section.icon;
                return (
                  <button
                    key={section.id}
                    onClick={() => toggleVisibility(section.id)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition ${
                      section.visible 
                        ? 'bg-accent/10 border-accent/30' 
                        : 'bg-muted border-border opacity-60'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="text-sm">{section.title}</span>
                    {section.visible ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Dashboard Sections */}
        <div className="space-y-6">
          {visibleSections.map(section => (
            <div
              key={section.id}
              draggable
              onDragStart={() => handleDragStart(section.id)}
              onDragOver={(e) => handleDragOver(e, section.id)}
              onDragEnd={() => setDraggedSection(null)}
              className={`transition ${draggedSection === section.id ? 'opacity-50' : ''}`}
            >
              <Card>
                <CardHeader className="flex flex-row items-center gap-3">
                  <GripVertical className="w-5 h-5 text-muted-foreground cursor-grab" />
                  <CardTitle>{section.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  {section.component}
                </CardContent>
              </Card>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Placeholder components - implement these based on your needs
function UpcomingEvents() {
  return <div className="text-sm text-muted-foreground">No upcoming events</div>;
}

function JoinedEvents() {
  return <div className="text-sm text-muted-foreground">No joined events</div>;
}

function SavedEvents() {
  return <div className="text-sm text-muted-foreground">No saved events</div>;
}

function DraftEvents() {
  return <div className="text-sm text-muted-foreground">No draft events</div>;
}