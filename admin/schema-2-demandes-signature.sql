-- Mise à jour n° 2 : demandes de devis (avec photos) et signature des devis en ligne.
-- À coller une seule fois dans Supabase > SQL Editor > Run.

-- 1. Demandes de devis envoyées depuis le site
create table if not exists demandes (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  nom text not null check (char_length(nom) between 1 and 120),
  tel text check (char_length(tel) <= 40),
  email text check (char_length(email) <= 160),
  cp text check (char_length(cp) <= 10),
  ville text check (char_length(ville) <= 80),
  message text check (char_length(message) <= 4000),
  photos text[] not null default '{}',
  statut text not null default 'nouvelle',
  client_id uuid references clients(id)
);
alter table demandes enable row level security;
drop policy if exists "depot depuis le site" on demandes;
create policy "depot depuis le site" on demandes for insert to anon, authenticated
  with check (statut = 'nouvelle' and client_id is null and cardinality(photos) <= 8);
drop policy if exists "proprietaire" on demandes;
create policy "proprietaire" on demandes for all to authenticated
  using ((auth.jwt() ->> 'email') = 'contact@noraeditions.com')
  with check ((auth.jwt() ->> 'email') = 'contact@noraeditions.com');

-- 2. Photos des demandes : dossier privé, dépôt possible depuis le site, lecture réservée à l'admin
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('demandes', 'demandes', false, 10485760, array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'])
on conflict (id) do nothing;
drop policy if exists "depot photos demandes" on storage.objects;
create policy "depot photos demandes" on storage.objects for insert to anon, authenticated
  with check (bucket_id = 'demandes');
drop policy if exists "lecture photos demandes" on storage.objects;
create policy "lecture photos demandes" on storage.objects for select to authenticated
  using (bucket_id = 'demandes' and (auth.jwt() ->> 'email') = 'contact@noraeditions.com');
drop policy if exists "suppression photos demandes" on storage.objects;
create policy "suppression photos demandes" on storage.objects for delete to authenticated
  using (bucket_id = 'demandes' and (auth.jwt() ->> 'email') = 'contact@noraeditions.com');

-- 3. Signature des devis en ligne : un lien secret par devis
alter table documents add column if not exists jeton uuid not null default gen_random_uuid();
alter table documents add column if not exists signe_le timestamptz;
alter table documents add column if not exists signe_nom text;
create unique index if not exists documents_jeton on documents (jeton);

-- Lecture d'un devis par son lien secret (sans IBAN ni données internes)
create or replace function devis_public(j uuid) returns json
language sql security definer set search_path = public as $$
  select json_build_object(
    'doc', (select json_build_object('type', type, 'numero', numero, 'date', date, 'client', client, 'objet', objet,
                   'date_debut', date_debut, 'duree', duree, 'sections', sections, 'acompte_pct', acompte_pct,
                   'notes', notes, 'statut', statut, 'signe_le', signe_le, 'signe_nom', signe_nom)
            from documents where jeton = j and type = 'devis'),
    'p', (select data - 'iban' - 'bic' - 'titulaire' - 'prochain_devis' - 'prochain_facture' from parametres where id = 1));
$$;

-- Signature : passe le devis en « signé », une seule fois
create or replace function signer_devis(j uuid, nom text) returns json
language plpgsql security definer set search_path = public as $$
declare n text;
begin
  if char_length(coalesce(trim(nom), '')) < 2 then raise exception 'Nom obligatoire'; end if;
  update documents set statut = 'signe', signe_le = now(), signe_nom = left(trim(nom), 120), updated_at = now()
   where jeton = j and type = 'devis' and statut in ('brouillon', 'envoye') and signe_le is null
   returning numero into n;
  return json_build_object('ok', n is not null, 'numero', n);
end $$;

revoke all on function devis_public(uuid) from public;
revoke all on function signer_devis(uuid, text) from public;
grant execute on function devis_public(uuid) to anon, authenticated;
grant execute on function signer_devis(uuid, text) to anon, authenticated;
