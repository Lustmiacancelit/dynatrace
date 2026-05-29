create table if not exists public.access_requests (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  name text,
  company text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  is_admin boolean not null default false,
  login_token_hash text,
  login_token_expires_at timestamptz,
  approved_at timestamptz,
  approved_by text,
  created_at timestamptz not null default now()
);

alter table public.access_requests enable row level security;

drop policy if exists "service role manages access requests" on public.access_requests;
create policy "service role manages access requests"
  on public.access_requests
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');
