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
alter publication supabase_realtime add table rooms;
alter publication supabase_realtime add table petty_cash;
alter publication supabase_realtime add table notes;
alter publication supabase_realtime add table app_settings;

-- Row Level Security (Optional: Open for demo, lock down for production)
-- For a simple hotel app with one login, we can leave RLS off or allow public access for now.
alter table rooms enable row level security;
create policy "Allow all access" on rooms for all using (true) with check (true);

alter table petty_cash enable row level security;
create policy "Allow all access" on petty_cash for all using (true) with check (true);

alter table notes enable row level security;
create policy "Allow all access" on notes for all using (true) with check (true);

alter table app_settings enable row level security;
create policy "Allow all access" on app_settings for all using (true) with check (true);
