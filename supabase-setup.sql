-- ============================================================
-- SpendWise — Supabase Database Setup
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- 1. Create expenses table
create table public.expenses (
  id           text primary key,
  user_id      uuid references auth.users(id) on delete cascade not null,
  amount       numeric(10, 2) not null,
  category_id  text not null,
  description  text not null,
  date         text not null,
  notes        text,
  custom_category text,
  created_at   timestamptz not null,
  updated_at   timestamptz not null
);

-- 2. Create budgets table
create table public.budgets (
  user_id      uuid references auth.users(id) on delete cascade not null,
  category_id  text not null,
  amount       numeric(10, 2) not null,
  period       text not null default 'monthly',
  primary key (user_id, category_id)
);

-- 3. Enable Row Level Security (users can only see their own data)
alter table public.expenses enable row level security;
alter table public.budgets  enable row level security;

-- 4. RLS policies for expenses
create policy "Users can manage their own expenses"
  on public.expenses
  for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 5. RLS policies for budgets
create policy "Users can manage their own budgets"
  on public.budgets
  for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 6. Index for faster queries
create index on public.expenses (user_id, date);
