-- Riv.AI · estado do app na nuvem
-- Rode isto uma vez no SQL Editor do projeto Supabase.

create table if not exists public.estado (
  user_id uuid primary key references auth.users on delete cascade,
  dados jsonb not null default '{}'::jsonb,
  atualizado_em timestamptz not null default now()
);

alter table public.estado enable row level security;

-- cada pessoa só enxerga e só mexe na própria linha
drop policy if exists "estado: dono lê" on public.estado;
create policy "estado: dono lê"
  on public.estado for select
  using (auth.uid() = user_id);

drop policy if exists "estado: dono cria" on public.estado;
create policy "estado: dono cria"
  on public.estado for insert
  with check (auth.uid() = user_id);

drop policy if exists "estado: dono atualiza" on public.estado;
create policy "estado: dono atualiza"
  on public.estado for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
