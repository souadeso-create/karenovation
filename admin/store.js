// Accès aux données : Supabase quand il est configuré, sinon le navigateur (mode essai).
import { PARAMETRES_DEFAUT, PRESTATIONS_DEFAUT } from "./donnees.js";

const cfg = window.KA_CONFIG || {};
export const MODE_ESSAI = !(cfg.supabaseUrl && cfg.supabaseKey);
const sb = MODE_ESSAI ? null : window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseKey);

const uuid = () => (crypto.randomUUID ? crypto.randomUUID()
  : "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, c => {
      const r = Math.random() * 16 | 0; return (c === "x" ? r : (r & 3 | 8)).toString(16);
    }));

/* ---------- Mode essai : localStorage ---------- */
const CLE = t => "ka_admin_" + t;
function lireLocal(t) {
  try { return JSON.parse(localStorage.getItem(CLE(t))) || []; } catch { return []; }
}
function ecrireLocal(t, lignes) { localStorage.setItem(CLE(t), JSON.stringify(lignes)); }

function amorcerLocal() {
  if (localStorage.getItem(CLE("amorce"))) return;
  ecrireLocal("prestations", PRESTATIONS_DEFAUT.map(([categorie, designation, unite, prix_ht]) =>
    ({ id: uuid(), created_at: new Date().toISOString(), categorie, designation, unite, prix_ht, archive: false })));
  ecrireLocal("parametres", [{ id: 1, data: PARAMETRES_DEFAUT }]);
  localStorage.setItem(CLE("amorce"), "1");
}

/* ---------- Connexion ---------- */
export async function session() {
  if (MODE_ESSAI) { amorcerLocal(); return { user: { email: "mode essai" } }; }
  const { data } = await sb.auth.getSession();
  return data.session;
}
export async function connexion(email, motdepasse) {
  const { error } = await sb.auth.signInWithPassword({ email, password: motdepasse });
  if (error) throw new Error(error.message === "Invalid login credentials" ? "E-mail ou mot de passe incorrect." : error.message);
}
export async function deconnexion() { if (sb) await sb.auth.signOut(); }
export async function motDePasseOublie(email) {
  const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: location.origin + location.pathname });
  if (error) throw error;
}
export function surRecuperation(rappel) {
  if (sb) sb.auth.onAuthStateChange(ev => { if (ev === "PASSWORD_RECOVERY") rappel(); });
}
export async function changerMotDePasse(mdp) {
  const { error } = await sb.auth.updateUser({ password: mdp });
  if (error) throw error;
}

/* ---------- Lecture / écriture ---------- */
export async function lister(table, { ordre = "created_at", desc = true } = {}) {
  if (MODE_ESSAI) {
    const l = lireLocal(table);
    return l.sort((a, b) => (String(a[ordre] ?? "") < String(b[ordre] ?? "") ? -1 : 1) * (desc ? -1 : 1));
  }
  const { data, error } = await sb.from(table).select("*").order(ordre, { ascending: !desc });
  if (error) throw error;
  return data;
}

export async function lire(table, id) {
  if (MODE_ESSAI) return lireLocal(table).find(x => x.id === id) || null;
  const { data, error } = await sb.from(table).select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data;
}

export async function enregistrer(table, obj) {
  const ligne = { ...obj };
  if (table === "documents") ligne.updated_at = new Date().toISOString();
  if (MODE_ESSAI) {
    const l = lireLocal(table);
    if (!ligne.id) { ligne.id = uuid(); ligne.created_at = new Date().toISOString(); l.push(ligne); }
    else { const i = l.findIndex(x => x.id === ligne.id); if (i >= 0) l[i] = { ...l[i], ...ligne }; else l.push(ligne); }
    ecrireLocal(table, l);
    return ligne;
  }
  const { data, error } = await sb.from(table).upsert(ligne).select().single();
  if (error) throw error;
  return data;
}

export async function supprimer(table, id) {
  if (MODE_ESSAI) { ecrireLocal(table, lireLocal(table).filter(x => x.id !== id)); return; }
  const { error } = await sb.from(table).delete().eq("id", id);
  if (error) throw error;
}

/* ---------- Photos des demandes (dossier privé) ---------- */
export async function photosDemande(chemins) {
  if (MODE_ESSAI || !chemins?.length) return [];
  const { data, error } = await sb.storage.from("demandes").createSignedUrls(chemins, 3600);
  if (error) throw error;
  return data.map(x => x.signedUrl).filter(Boolean);
}
export async function supprimerPhotosDemande(chemins) {
  if (MODE_ESSAI || !chemins?.length) return;
  const { error } = await sb.storage.from("demandes").remove(chemins);
  if (error) throw error;
}

/* ---------- Paramètres de l'entreprise ---------- */
export async function parametres() {
  let p;
  if (MODE_ESSAI) p = lireLocal("parametres")[0];
  else {
    const { data } = await sb.from("parametres").select("*").eq("id", 1).maybeSingle();
    p = data;
    if (!p) { p = { id: 1, data: PARAMETRES_DEFAUT }; await sb.from("parametres").upsert(p); }
  }
  return { ...PARAMETRES_DEFAUT, ...(p?.data || {}) };
}
export async function enregistrerParametres(data) {
  if (MODE_ESSAI) { ecrireLocal("parametres", [{ id: 1, data }]); return; }
  const { error } = await sb.from("parametres").upsert({ id: 1, data });
  if (error) throw error;
}

/* Remplit la base des prestations la première fois (base Supabase vide). */
export async function amorcerPrestations() {
  if (MODE_ESSAI) return;
  const { count } = await sb.from("prestations").select("id", { count: "exact", head: true });
  if (count) return;
  await sb.from("prestations").insert(PRESTATIONS_DEFAUT.map(([categorie, designation, unite, prix_ht]) =>
    ({ categorie, designation, unite, prix_ht })));
}

/* ---------- Sauvegarde complète (fichier) ---------- */
export async function exporterTout() {
  const tables = ["clients", "prestations", "documents", "simulations"];
  const out = { exporte_le: new Date().toISOString(), parametres: await parametres() };
  for (const t of tables) out[t] = await lister(t);
  try { out.demandes = await lister("demandes"); } catch { /* table pas encore créée */ }
  return out;
}
