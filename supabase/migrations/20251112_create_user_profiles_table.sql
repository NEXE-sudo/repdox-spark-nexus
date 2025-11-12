-- Create user_profiles table linked to auth.users
create table "public"."user_profiles" (
    "id" uuid not null default uuid_generate_v4(),
    "user_id" uuid not null,
    "full_name" text,
    "bio" text,
    "avatar_url" text,
    "phone" text,
    "location" text,
    "website" text,
    "company" text,
    "job_title" text,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now(),
    constraint "user_profiles_pkey" primary key ("id"),
    constraint "user_profiles_user_id_fkey" foreign key ("user_id") references "auth"."users" ("id") on delete cascade,
    constraint "user_profiles_user_id_key" unique ("user_id")
);

-- Enable RLS
alter table "public"."user_profiles" enable row level security;

-- Users can read their own profile
create policy "Users can read own profile"
on "public"."user_profiles"
for select
to authenticated
using (auth.uid() = user_id);

-- Users can update their own profile
create policy "Users can update own profile"
on "public"."user_profiles"
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

-- Users can insert their own profile
create policy "Users can insert own profile"
on "public"."user_profiles"
for insert
to authenticated
with check (auth.uid() = user_id);

-- Create trigger to insert profile on user signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.user_profiles (user_id, full_name)
  values (new.id, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$ language plpgsql security definer;

-- Run trigger on auth.users insert
create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Create index on user_id for faster queries
create index "user_profiles_user_id_idx" on "public"."user_profiles" ("user_id");
