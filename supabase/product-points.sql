alter table public.products add column if not exists points numeric(12,2) not null default 0 check (points >= 0);
