-- Base de données de l'espace admin KA Rénovation (Supabase).
-- À coller une seule fois dans Supabase > SQL Editor > New query > Run.

create table if not exists parametres (
  id int primary key default 1,
  data jsonb not null default '{}'::jsonb,
  constraint une_seule_ligne check (id = 1)
);

create table if not exists clients (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  civilite text, nom text not null, prenom text, societe text,
  adresse text, cp text, ville text, tel text, email text, notes text,
  archive boolean not null default false
);

create table if not exists prestations (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  categorie text, designation text not null, description text,
  unite text not null default 'presta', prix_ht numeric not null default 0,
  archive boolean not null default false
);

create table if not exists documents (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  type text not null check (type in ('devis', 'facture')),
  numero text not null,
  date date not null default current_date,
  client_id uuid references clients(id),
  client jsonb,
  objet text, date_debut date, duree text,
  sections jsonb not null default '[]'::jsonb,
  total_ht numeric not null default 0,
  acompte_pct numeric default 30,
  deja_regle numeric default 0,
  statut text not null default 'brouillon',
  devis_id uuid references documents(id),
  devis_numero text, devis_date date,
  notes text,
  unique (type, numero)
);

create table if not exists simulations (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  client_id uuid references clients(id),
  nom text, data jsonb not null default '{}'::jsonb, image text
);

-- Seul le compte contact@noraeditions.com peut lire et écrire
-- (et les inscriptions doivent être désactivées dans Authentication > Sign In / Providers).
alter table parametres enable row level security;
alter table clients enable row level security;
alter table prestations enable row level security;
alter table documents enable row level security;
alter table simulations enable row level security;

do $$
declare t text;
begin
  foreach t in array array['parametres', 'clients', 'prestations', 'documents', 'simulations'] loop
    execute format('drop policy if exists "proprietaire" on %I', t);
    execute format('create policy "proprietaire" on %I for all to authenticated '
      'using ((auth.jwt() ->> ''email'') = ''contact@noraeditions.com'') '
      'with check ((auth.jwt() ->> ''email'') = ''contact@noraeditions.com'')', t);
  end loop;
end $$;
