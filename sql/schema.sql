-- Supabase schema
create table if not exists public.subscriptions (
  endpoint text primary key,
  p256dh text,
  auth text,
  created_at timestamp with time zone default now()
);

create table if not exists public.state (
  key text primary key,
  value jsonb
);
