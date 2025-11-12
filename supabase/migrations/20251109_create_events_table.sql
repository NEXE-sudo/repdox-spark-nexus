-- Create the events table
create table "public"."events" (
    "id" uuid not null default uuid_generate_v4(),
    "created_at" timestamp with time zone default now(),
    "title" text not null,
    "slug" text not null,
    "type" text not null,
    "format" text not null,
    "start_at" timestamp with time zone not null,
    "location" text not null,
    "short_blurb" text,
    "image_url" text,
    "tags" text[] default '{}',
    "is_active" boolean default true,
    constraint "events_pkey" primary key ("id"),
    constraint "events_slug_key" unique ("slug")
);

-- Add some sample events
insert into "public"."events" ("title", "slug", "type", "format", "start_at", "location", "short_blurb", "image_url", "tags", "is_active") 
values 
(
    'Hackathon 2025: AI Revolution',
    'hackathon-2025-ai-revolution',
    'Hackathon',
    'In-Person',
    '2025-12-01 09:00:00+00',
    'Tech Hub, Silicon Valley',
    'Join us for a 48-hour hackathon focused on AI and machine learning innovations. Build the future!',
    'hackathon-2025.jpg',
    ARRAY['AI', 'Machine Learning', 'Innovation'],
    true
),
(
    'Model UN Conference: Climate Action',
    'mun-climate-action-2025',
    'Model UN',
    'Hybrid',
    '2025-11-15 10:00:00+00',
    'Global Conference Center',
    'Tackle climate change challenges in this Model UN conference. Represent nations, debate solutions.',
    'mun-climate.jpg',
    ARRAY['Climate', 'Diplomacy', 'Policy'],
    true
),
(
    'Gaming Tournament: Esports Championship',
    'esports-championship-2025',
    'Gaming',
    'Online',
    '2025-11-30 15:00:00+00',
    'Virtual Arena',
    'Compete in our annual esports championship. Multiple games, amazing prizes!',
    'esports-tournament.jpg',
    ARRAY['Gaming', 'Esports', 'Competition'],
    true
),
(
    'Tech Workshop: Web3 Development',
    'web3-workshop-2025',
    'Workshop',
    'In-Person',
    '2025-12-10 13:00:00+00',
    'Innovation Center',
    'Learn blockchain development and Web3 technologies in this hands-on workshop.',
    'web3-workshop.jpg',
    ARRAY['Blockchain', 'Web3', 'Development'],
    true
),
(
    'Startup Pitch Competition',
    'startup-pitch-2025',
    'Competition',
    'Hybrid',
    '2025-12-15 14:00:00+00',
    'Entrepreneurship Hub',
    'Present your startup idea to investors and win funding opportunities!',
    'startup-pitch.jpg',
    ARRAY['Startup', 'Business', 'Pitch'],
    true
),
(
    'Design Thinking Workshop',
    'design-thinking-2025',
    'Workshop',
    'In-Person',
    '2025-12-05 11:00:00+00',
    'Design Studio',
    'Master the design thinking process in this interactive workshop.',
    'design-workshop.jpg',
    ARRAY['Design', 'Innovation', 'Creativity'],
    true
);

-- Enable RLS (Row Level Security)
alter table "public"."events" enable row level security;

-- Create policy to allow anyone to read active events
create policy "Anyone can read active events"
on "public"."events"
for select
to public
using (is_active = true);