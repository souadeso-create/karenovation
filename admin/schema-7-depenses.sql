-- Mise à jour n° 7 : catégorie des dépenses du carnet (fournitures, carburant, péage, location…).
-- À coller une seule fois dans Supabase > SQL Editor > Run.

alter table carnet add column if not exists categorie text;
