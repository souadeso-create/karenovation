-- Mise à jour n° 3 : le client valide ses choix (carrelage, peinture, robinetterie, meubles) par un lien secret.
-- À coller une seule fois dans Supabase > SQL Editor > Run.

alter table simulations add column if not exists jeton uuid not null default gen_random_uuid();
alter table simulations add column if not exists valide_le timestamptz;
alter table simulations add column if not exists valide_nom text;
create unique index if not exists simulations_jeton on simulations (jeton);

-- Lecture d'une simulation par son lien secret : l'image, la liste des choix, l'état de la validation
create or replace function choix_public(j uuid) returns json
language sql security definer set search_path = public as $$
  select json_build_object('nom', s.nom, 'image', s.image, 'choix', s.data -> 'choix', 'achats', s.data -> 'achats',
                           'valide_le', s.valide_le, 'valide_nom', s.valide_nom,
                           'client', (select concat_ws(' ', c.civilite, c.nom) from clients c where c.id = s.client_id))
  from simulations s where s.jeton = j;
$$;

-- Validation : une seule fois (l'artisan la remet à zéro s'il renvoie la simulation après un changement)
create or replace function valider_choix(j uuid, nom text) returns json
language plpgsql security definer set search_path = public as $$
#variable_conflict use_variable
declare n text;
begin
  if char_length(coalesce(trim(nom), '')) < 2 then raise exception 'Nom obligatoire'; end if;
  update simulations set valide_le = now(), valide_nom = left(trim(nom), 120)
   where jeton = j and valide_le is null and data ? 'choix'
   returning simulations.nom into n;
  return json_build_object('ok', n is not null);
end $$;

revoke all on function choix_public(uuid) from public;
revoke all on function valider_choix(uuid, text) from public;
grant execute on function choix_public(uuid) to anon, authenticated;
grant execute on function valider_choix(uuid, text) to anon, authenticated;
