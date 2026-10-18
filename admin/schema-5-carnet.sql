-- Mise à jour n° 5 : carnet de chantier (photos et notes datées, par client), photos dans un dossier privé.
-- À coller une seule fois dans Supabase > SQL Editor > Run.

create table if not exists carnet (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  client_id uuid not null references clients(id) on delete cascade,
  etape text not null default 'pendant' check (etape in ('avant', 'pendant', 'apres')),
  texte text check (char_length(texte) <= 4000),
  chemin text
);
create index if not exists carnet_client on carnet (client_id, created_at desc);
alter table carnet enable row level security;
drop policy if exists "proprietaire" on carnet;
create policy "proprietaire" on carnet for all to authenticated
  using ((auth.jwt() ->> 'email') = 'contact@noraeditions.com')
  with check ((auth.jwt() ->> 'email') = 'contact@noraeditions.com');

-- Photos des chantiers : dossier privé, réservé à l'admin
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('chantiers', 'chantiers', false, 15728640, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;
drop policy if exists "chantiers admin lecture" on storage.objects;
create policy "chantiers admin lecture" on storage.objects for select to authenticated
  using (bucket_id = 'chantiers' and (auth.jwt() ->> 'email') = 'contact@noraeditions.com');
drop policy if exists "chantiers admin depot" on storage.objects;
create policy "chantiers admin depot" on storage.objects for insert to authenticated
  with check (bucket_id = 'chantiers' and (auth.jwt() ->> 'email') = 'contact@noraeditions.com');
drop policy if exists "chantiers admin suppression" on storage.objects;
create policy "chantiers admin suppression" on storage.objects for delete to authenticated
  using (bucket_id = 'chantiers' and (auth.jwt() ->> 'email') = 'contact@noraeditions.com');
