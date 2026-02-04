-- Run this in your Supabase SQL Editor

-- 1. Table for Rooms (Stores full room object as JSON)
create table if not exists rooms (
  id text primary key,
  data jsonb not null,
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

-- 2. Table for Petty Cash Transactions
create table if not exists petty_cash (
  id text primary key,
  data jsonb not null,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- 3. Table for Daily Notes
create table if not exists notes (
  date_key text primary key, -- Format YYYY-MM-DD
  content text,
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

-- 4. Table for App Settings (Hotel Name, Widget Order, etc.)
create table if not exists app_settings (
  key text primary key,
  value jsonb
);

-- Enable Realtime for these tables so all devices sync instantly
-- We use a DO block to prevent errors if the tables are already in the publication
do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'rooms') then
    alter publication supabase_realtime add table rooms;
  end if;
  
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'petty_cash') then
    alter publication supabase_realtime add table petty_cash;
  end if;

  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'notes') then
    alter publication supabase_realtime add table notes;
  end if;

  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'app_settings') then
    alter publication supabase_realtime add table app_settings;
  end if;
end;
$$;

-- Row Level Security (Optional: Open for demo, lock down for production)
alter table rooms enable row level security;
do $$
begin
  if not exists (select 1 from pg_policies where tablename = 'rooms' and policyname = 'Allow all access') then
    create policy "Allow all access" on rooms for all using (true) with check (true);
  end if;
end $$;

alter table petty_cash enable row level security;
do $$
begin
  if not exists (select 1 from pg_policies where tablename = 'petty_cash' and policyname = 'Allow all access') then
    create policy "Allow all access" on petty_cash for all using (true) with check (true);
  end if;
end $$;

alter table notes enable row level security;
do $$
begin
  if not exists (select 1 from pg_policies where tablename = 'notes' and policyname = 'Allow all access') then
    create policy "Allow all access" on notes for all using (true) with check (true);
  end if;
end $$;

alter table app_settings enable row level security;
do $$
begin
  if not exists (select 1 from pg_policies where tablename = 'app_settings' and policyname = 'Allow all access') then
    create policy "Allow all access" on app_settings for all using (true) with check (true);
  end if;
end $$;