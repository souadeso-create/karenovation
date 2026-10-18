-- Mise à jour n° 8 : dépenses hors chantier (essence de la semaine, assurance, outillage…), sans client.
-- À coller une seule fois dans Supabase > SQL Editor > Run.

alter table carnet alter column client_id drop not null;
