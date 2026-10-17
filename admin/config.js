// Connexion à la base Supabase (projet « ka-renovation »).
// La clé « publishable » est faite pour être visible dans un navigateur : les données restent
// protégées par la connexion et les règles d'accès de la base (seul contact@noraeditions.com y accède).
// Sans ces deux valeurs, l'admin tourne en « mode essai » : les données restent dans ce navigateur.
window.KA_CONFIG = {
  supabaseUrl: "https://bafrmnkorenfavwnvsyh.supabase.co",
  supabaseKey: "sb_publishable_FBsYL_tD0y-F-2Bt-7KZzg_Z4UIpXpK"
};
