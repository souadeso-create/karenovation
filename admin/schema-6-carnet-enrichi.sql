-- Mise à jour n° 6 : carnet de chantier enrichi (à faire, imprévus, dépenses, légendes des photos).
-- À coller une seule fois dans Supabase > SQL Editor > Run.

alter table carnet add column if not exists type text not null default 'note';
alter table carnet add column if not exists fait boolean not null default false;
alter table carnet add column if not exists montant numeric(10, 2);
update carnet set type = 'photo' where chemin is not null and type = 'note';
