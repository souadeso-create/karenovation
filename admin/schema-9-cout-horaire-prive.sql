-- Mise à jour n° 9 : le coût horaire de l'artisan (Réglages > Chantiers) ne part jamais vers la page « devis » du client.
-- À coller une seule fois dans Supabase > SQL Editor > Run.

create or replace function devis_public(j uuid) returns json
language sql security definer set search_path = public as $$
  select json_build_object(
    'doc', (select json_build_object('type', type, 'numero', numero, 'date', date, 'client', client, 'objet', objet,
                   'date_debut', date_debut, 'duree', duree, 'sections', sections, 'acompte_pct', acompte_pct,
                   'notes', notes, 'statut', statut, 'signe_le', signe_le, 'signe_nom', signe_nom)
            from documents where jeton = j and type = 'devis'),
    'p', (select data - 'iban' - 'bic' - 'titulaire' - 'prochain_devis' - 'prochain_facture' - 'taux_horaire' from parametres where id = 1));
$$;
