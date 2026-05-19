-- Lucent – initial schema
-- Run this in the Supabase SQL editor (Dashboard → SQL Editor → New query)

-- ── User data (offline-first: entire store synced as JSONB) ───────────
create table if not exists public.user_data (
  id               uuid        primary key references auth.users(id) on delete cascade,
  profile          jsonb       not null default '{}'::jsonb,
  expenses         jsonb       not null default '[]'::jsonb,
  incomes          jsonb       not null default '[]'::jsonb,
  recurring        jsonb       not null default '[]'::jsonb,
  goals            jsonb       not null default '[]'::jsonb,
  monthly_salaries jsonb       not null default '[]'::jsonb,
  category_budgets jsonb       not null default '{}'::jsonb,
  custom_categories jsonb      not null default '[]'::jsonb,
  settings         jsonb       not null default '{}'::jsonb,
  updated_at       timestamptz not null default now()
);

-- Row-Level Security: each user can only read/write their own row
alter table public.user_data enable row level security;

create policy "select_own" on public.user_data
  for select using (auth.uid() = id);

create policy "insert_own" on public.user_data
  for insert with check (auth.uid() = id);

create policy "update_own" on public.user_data
  for update using (auth.uid() = id);

create policy "delete_own" on public.user_data
  for delete using (auth.uid() = id);

-- Auto-update updated_at on every write
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger touch_user_data_updated_at
  before update on public.user_data
  for each row execute function public.touch_updated_at();
