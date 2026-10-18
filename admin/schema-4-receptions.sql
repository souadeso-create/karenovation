-- Mise à jour n° 4 : PV de fin de chantier (réception des travaux), signé sur le téléphone.
-- À coller une seule fois dans Supabase > SQL Editor > Run.

create table if not exists receptions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  document_id uuid not null unique references documents(id) on delete cascade,
  data jsonb not null default '{}'::jsonb
);
alter table receptions enable row level security;
drop policy if exists "proprietaire" on receptions;
create policy "proprietaire" on receptions for all to authenticated
  using ((auth.jwt() ->> 'email') = 'contact@noraeditions.com')
  with check ((auth.jwt() ->> 'email') = 'contact@noraeditions.com');
