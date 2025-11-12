import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';

export default function AddEvent() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    title: '',
    slug: '',
    type: 'Hackathon',
    format: 'In-Person',
    start_at: '',
    end_at: '',
    location: '',
    short_blurb: '',
    overview: '',
    tags: '',
    registration_link: ''
  });
  const [scheduleText, setScheduleText] = useState('');
  const [teamsText, setTeamsText] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);

  const onChange = (k: string, v: string) => setForm((s) => ({ ...s, [k]: v }));

  const handleImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    setImageFile(f);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) {
        toast({ title: 'Sign in required', description: 'Please sign in to create events.' });
        setLoading(false);
        return;
      }

      let imageUrl: string | null = null;
      if (imageFile) {
        const ext = imageFile.name.split('.').pop() || 'jpg';
        const fileName = `events/${form.slug || form.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}-${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage.from('events').upload(fileName, imageFile, { upsert: true });
        if (upErr) throw upErr;
        imageUrl = fileName; // store path; eventImages helper will resolve
      }

      const tags = form.tags ? form.tags.split(',').map(t => t.trim()) : [];

      // Set default values for required fields
      const endAt = form.end_at || new Date(new Date(form.start_at).getTime() + 2 * 60 * 60 * 1000).toISOString();
      const registrationDeadline = new Date(new Date(form.start_at).getTime() - 24 * 60 * 60 * 1000).toISOString();

      const { data, error } = await supabase.from('events').insert({
        title: form.title,
        slug: form.slug || form.title.replace(/[^a-z0-9]/gi, '-').toLowerCase(),
        type: form.type as 'Hackathon' | 'Workshop' | 'MUN' | 'Gaming',
        format: form.format as 'Online' | 'Offline' | 'Hybrid',
        start_at: form.start_at,
        end_at: endAt,
        location: form.location,
        short_blurb: form.short_blurb || form.title,
        overview: form.overview || null,
        image_url: imageUrl,
        registration_deadline: registrationDeadline,
        tags,
        is_active: true
      }).select('*').single();

      if (error) throw error;

      // Insert schedule items (simple parser: each line is "YYYY-MM-DDTHH:MM | Title | Description(optional)")
      if (scheduleText.trim()) {
        const scheduleLines = scheduleText.split('\n').map(l => l.trim()).filter(Boolean);
        const scheduleInserts = scheduleLines.map(line => {
          const parts = line.split('|').map(p => p.trim());
          return {
            event_id: data.id,
            start_at: parts[0] || null,
            title: parts[1] || parts[0] || 'Schedule item',
            description: parts[2] || null
          };
        });
        const { error: schedErr } = await supabase.from('event_schedules').insert(scheduleInserts);
        if (schedErr) throw schedErr;
      }

      // Insert teams (one team name per line, optional description separated by | )
      if (teamsText.trim()) {
        const teamLines = teamsText.split('\n').map(l => l.trim()).filter(Boolean);
        const teamInserts = teamLines.map(line => {
          const parts = line.split('|').map(p => p.trim());
          return {
            event_id: data.id,
            name: parts[0],
            description: parts[1] || null,
            contact_email: parts[2] || null
          };
        });
        const { error: teamErr } = await supabase.from('event_teams').insert(teamInserts);
        if (teamErr) throw teamErr;
      }

      toast({ title: 'Event created', description: 'Your event was created successfully.' });
      navigate(`/events/${data.slug}`);
    } catch (err: unknown) {
      const msg =
        typeof err === 'object' && err !== null && 'message' in err && typeof (err as Record<string, unknown>).message === 'string'
          ? ((err as Record<string, unknown>).message as string)
          : String(err);
      toast({ title: 'Error', description: msg });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background py-12 px-6">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Create Event</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="title">Title</Label>
            <Input id="title" value={form.title} onChange={(e) => onChange('title', e.target.value)} required />
          </div>
          <div>
            <Label htmlFor="slug">Slug (optional)</Label>
            <Input id="slug" value={form.slug} onChange={(e) => onChange('slug', e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Type</Label>
              <Input value={form.type} onChange={(e) => onChange('type', e.target.value)} />
            </div>
            <div>
              <Label>Format</Label>
              <Input value={form.format} onChange={(e) => onChange('format', e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Start At</Label>
              <Input type="datetime-local" value={form.start_at} onChange={(e) => onChange('start_at', e.target.value)} required />
            </div>
            <div>
              <Label>End At</Label>
              <Input type="datetime-local" value={form.end_at} onChange={(e) => onChange('end_at', e.target.value)} />
            </div>
          </div>

          <div>
            <Label>Location</Label>
            <Input value={form.location} onChange={(e) => onChange('location', e.target.value)} required />
          </div>

          <div>
            <Label>Short blurb</Label>
            <Input value={form.short_blurb} onChange={(e) => onChange('short_blurb', e.target.value)} />
          </div>

          <div>
            <Label>Overview / Description</Label>
            <Textarea value={form.overview} onChange={(e) => onChange('overview', e.target.value)} rows={6} />
          </div>

          <div>
            <Label>Schedule (one item per line). Format: ISO_DATETIME | Title | Description(optional)</Label>
            <Textarea value={scheduleText} onChange={(e) => setScheduleText(e.target.value)} rows={4} />
          </div>

          <div>
            <Label>Teams (one per line). Format: Name | Description(optional) | contact_email(optional)</Label>
            <Textarea value={teamsText} onChange={(e) => setTeamsText(e.target.value)} rows={3} />
          </div>

          <div>
            <Label>Tags (comma separated)</Label>
            <Input value={form.tags} onChange={(e) => onChange('tags', e.target.value)} />
          </div>

          <div>
            <Label>Registration link (optional)</Label>
            <Input value={form.registration_link} onChange={(e) => onChange('registration_link', e.target.value)} />
          </div>

          <div>
            <Label>Image</Label>
            <input type="file" accept="image/*" onChange={handleImage} />
          </div>

          <div>
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? 'Creating...' : 'Create Event'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
