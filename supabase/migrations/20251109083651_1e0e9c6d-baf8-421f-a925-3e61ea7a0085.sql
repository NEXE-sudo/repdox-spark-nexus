-- Create enum for event types
CREATE TYPE public.event_type AS ENUM ('Hackathon', 'Workshop', 'MUN', 'Gaming');

-- Create enum for event format
CREATE TYPE public.event_format AS ENUM ('Online', 'Offline', 'Hybrid');

-- Create events table
CREATE TABLE public.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  type public.event_type NOT NULL,
  start_at TIMESTAMPTZ NOT NULL,
  end_at TIMESTAMPTZ NOT NULL,
  registration_deadline TIMESTAMPTZ NOT NULL,
  location TEXT NOT NULL,
  format public.event_format NOT NULL,
  short_blurb TEXT NOT NULL,
  long_description TEXT,
  overview TEXT,
  schedule JSONB,
  rules TEXT,
  prizes JSONB,
  faqs JSONB,
  organisers JSONB,
  sponsors JSONB,
  image_url TEXT,
  tags TEXT[],
  registration_link TEXT,
  discord_invite TEXT,
  instagram_handle TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can read active events
CREATE POLICY "Anyone can read active events"
  ON public.events
  FOR SELECT
  USING (is_active = true);

-- Policy: Authenticated users with admin role can do everything (we'll add role system later)
CREATE POLICY "Admins can manage all events"
  ON public.events
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.events
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Insert seed data
INSERT INTO public.events (
  title, slug, type, start_at, end_at, registration_deadline, location, format,
  short_blurb, long_description, overview, image_url, tags, discord_invite, instagram_handle, is_active
) VALUES 
(
  'CodeCraft Hackathon 2025',
  'codecraft-hackathon-2025',
  'Hackathon',
  '2025-03-15 09:00:00+05:30',
  '2025-03-17 18:00:00+05:30',
  '2025-03-10 23:59:00+05:30',
  'Tech Hub, Mumbai',
  'Offline',
  '48-hour coding marathon building solutions for social impact. Form teams, ideate, and ship innovative projects.',
  'Join us for an intense 48-hour hackathon where teams of passionate developers, designers, and innovators come together to build solutions for real-world social challenges. Work alongside mentors from top tech companies, win amazing prizes, and make lasting connections.',
  'CodeCraft is Repdox''s flagship hackathon event bringing together 200+ participants from across the country. This year''s theme focuses on technology for social good - build solutions that make a real difference.',
  '/assets/event-hackathon.jpg',
  ARRAY['Tech', 'Innovation', 'Prizes'],
  'https://discord.gg/repdox',
  '@repdox',
  true
),
(
  'Global Youth MUN',
  'global-youth-mun',
  'MUN',
  '2025-04-08 10:00:00+05:30',
  '2025-04-10 17:00:00+05:30',
  '2025-04-03 23:59:00+05:30',
  'Convention Center, Delhi',
  'Offline',
  'Debate international policies, represent nations, and develop diplomatic skills in this prestigious Model UN conference.',
  'Experience high-level diplomatic simulation across multiple committees including UNSC, UNGA, and crisis committees. Sharpen your public speaking, negotiation, and critical thinking skills while engaging with pressing global issues.',
  'Our annual MUN conference brings together 300+ delegates for three days of intense debate and diplomacy.',
  '/assets/event-mun.jpg',
  ARRAY['Debate', 'Leadership', 'Diplomacy'],
  'https://discord.gg/repdox',
  '@repdox',
  true
),
(
  'Esports Championship',
  'esports-championship',
  'Gaming',
  '2025-05-20 14:00:00+05:30',
  '2025-05-21 22:00:00+05:30',
  '2025-05-15 23:59:00+05:30',
  'Gaming Arena, Bangalore',
  'Offline',
  'Compete in popular games, showcase your skills, and win amazing prizes in our multi-game tournament.',
  'Battle it out across multiple esports titles including Valorant, CS2, and League of Legends. Professional casting, live audience, and substantial prize pools await the champions.',
  'Our biggest gaming event featuring tournaments across multiple titles with professional production quality.',
  '/assets/event-gaming.jpg',
  ARRAY['Gaming', 'Competition', 'Esports'],
  'https://discord.gg/repdox',
  '@repdox',
  true
),
(
  'AI & ML Workshop',
  'ai-ml-workshop',
  'Workshop',
  '2025-06-05 10:00:00+05:30',
  '2025-06-05 17:00:00+05:30',
  '2025-06-01 23:59:00+05:30',
  'Online',
  'Online',
  'Learn cutting-edge machine learning techniques from industry experts. Hands-on projects included.',
  'Deep dive into modern AI/ML techniques with hands-on coding sessions. Cover neural networks, computer vision, NLP, and deploy your first ML model. Perfect for beginners and intermediate learners.',
  'A comprehensive one-day workshop covering the fundamentals and practical applications of AI and Machine Learning.',
  '/assets/event-workshop.jpg',
  ARRAY['AI', 'Learning', 'Career'],
  'https://discord.gg/repdox',
  '@repdox',
  true
);