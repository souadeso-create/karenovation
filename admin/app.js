// Espace admin KA Rénovation : devis, factures, clients, prestations, simulation 3D.
import * as db from "./store.js";
import { UNITES } from "./donnees.js";
import { telechargerPDF, totaux, eur } from "./pdf.js";
import { CATEGORIES } from "./carnet.js";

const vue = document.getElementById("vue");
const nav = document.getElementById("nav");
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const aujourdhui = () => new Date().toISOString().slice(0, 10);
const dateFr = d => d ? new Date(d + "T12:00:00").toLocaleDateString("fr-FR") : "";
const nomClient = c => c ? [c.civilite, c.nom, c.prenom].filter(Boolean).join(" ") + (c.societe ? ` · ${c.societe}` : "") : "Sans client";
const ICO = {
  plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 5v14M5 12h14"/></svg>',
  poubelle: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/></svg>',
  pdf: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M12 4v11M7 10l5 5 5-5M5 20h14"/></svg>',
  partage: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><circle cx="18" cy="5" r="2.5"/><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="19" r="2.5"/><path d="m8.2 10.8 7.6-4.4M8.2 13.2l7.6 4.4"/></svg>',
  liste: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M4 6h16M4 12h16M4 18h10"/></svg>',
  haut: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="m6 15 6-6 6 6"/></svg>',
  bas: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="m6 9 6 6 6-6"/></svg>',
  devis: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M7 3h7l5 5v13H7z"/><path d="M14 3v5h5M10 13h6M10 17h6"/></svg>',
  client: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>',
  boite: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M3 13h5l1.5 3h5l1.5-3h5"/><path d="M5.5 5h13L21 13v6H3v-6z"/></svg>',
  cube: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="m12 3 8 4.5v9L12 21l-8-4.5v-9z"/><path d="m4 7.5 8 4.5 8-4.5M12 12v9"/></svg>'
};
const STATUTS = {
  devis: [["brouillon", "Brouillon"], ["envoye", "Envoyé"], ["signe", "Signé"], ["refuse", "Refusé"]],
  facture: [["brouillon", "Brouillon"], ["envoye", "Envoyée"], ["paye", "Payée"], ["annule", "Annulée"]]
};
const libelleStatut = (type, s) => (STATUTS[type].find(x => x[0] === s) || [s, s])[1];

let P = null; // paramètres de l'entreprise
const lienSignature = d => d.jeton ? location.origin + location.pathname.replace(/admin\/.*$/, "") + "devis/?d=" + d.jeton : "";
const numeroWa = t => { const n = String(t || "").replace(/\D/g, ""); return n.startsWith("0") ? "33" + n.slice(1) : n; };
const politesse = c => c ? [c.civilite, c.nom].filter(Boolean).join(" ") : "";
const msgSignature = d => `Bonjour ${politesse(d.client)},\n\nVoici votre devis ${d.numero} de KA Rénovation. Vous pouvez le lire, le télécharger et le signer en ligne ici :\n${lienSignature(d)}\n\nBonne journée,\nKA Rénovation`;
const msgRelance = d => `Bonjour ${politesse(d.client)},\n\nJe reviens vers vous au sujet du devis ${d.numero}. Il est toujours consultable et à signer en ligne ici :\n${lienSignature(d)}\n\nN'hésitez pas si vous avez des questions.\nKA Rénovation`;
const SEPT_JOURS = 7 * 864e5;
const aRelancer = d => d.type === "devis" && d.statut === "envoye" && !d.signe_le && d.jeton && Date.now() - new Date(d.updated_at || d.created_at) > SEPT_JOURS;
async function listerDemandes() { try { return await db.lister("demandes"); } catch { return null; } }

/* Envoie un message : on choisit WhatsApp, SMS ou une autre application (mail…). */
async function envoyerMessage(d, texte) {
  const tel = numeroWa(d.client?.tel), brut = String(d.client?.tel || "").replace(/\s/g, "");
  const autre = async () => {
    if (navigator.share) { try { await navigator.share({ text: texte }); return; } catch (e) { if (e.name === "AbortError") return; } }
    await navigator.clipboard.writeText(texte); toast("Message copié ✓");
  };
  if (tel.length < 10) return autre();
  const f = fenetre("Envoyer par", `<div class="actions-doc" style="margin:0">
    <button class="btn" data-par="wa">WhatsApp</button><button class="btn clair" data-par="sms">SMS</button><button class="btn discret" data-par="autre">Autre (mail…)</button></div>`);
  f.el.addEventListener("click", e => {
    const b = e.target.closest("[data-par]"); if (!b) return; f.fermer();
    if (b.dataset.par === "wa") window.open(`https://wa.me/${tel}?text=${encodeURIComponent(texte)}`, "_blank");
    else if (b.dataset.par === "sms") location.href = `sms:${brut}?&body=${encodeURIComponent(texte)}`;
    else autre();
  });
}

function toast(msg) {
  const t = document.createElement("div"); t.className = "toast"; t.textContent = msg;
  document.body.appendChild(t); setTimeout(() => t.remove(), 2600);
}
function erreur(e) { console.error(e); toast("Erreur : " + (e.message || e)); }

function fenetre(titre, html) {
  const v = document.createElement("div"); v.className = "voile";
  v.innerHTML = `<div class="fenetre" role="dialog" aria-modal="true"><div class="tete"><h2>${esc(titre)}</h2><button class="icone" data-fermer aria-label="Fermer">✕</button></div>${html}</div>`;
  document.body.appendChild(v);
  const fermer = () => v.remove();
  v.addEventListener("click", e => { if (e.target === v || e.target.closest("[data-fermer]")) fermer(); });
  return { el: v.querySelector(".fenetre"), fermer };
}
function confirmer(message, oui = "Confirmer") {
  return new Promise(ok => {
    const f = fenetre("Confirmation", `<p style="margin-bottom:18px">${esc(message)}</p><div class="actions-doc"><button class="btn" data-oui>${esc(oui)}</button><button class="btn discret" data-fermer>Annuler</button></div>`);
    f.el.querySelector("[data-oui]").onclick = () => { f.fermer(); ok(true); };
    f.el.querySelectorAll("[data-fermer]").forEach(b => b.addEventListener("click", () => ok(false)));
  });
}

/* =================== Accueil =================== */
async function vueAccueil() {
  const [docs, clients, demandes, depenses] = await Promise.all([db.lister("documents"), db.lister("clients"), listerDemandes(), db.listerDepenses().catch(() => [])]);
  const nouvelles = (demandes || []).filter(x => x.statut === "nouvelle");
  const relances = docs.filter(aRelancer);
  const devisAttente = docs.filter(d => d.type === "devis" && ["brouillon", "envoye"].includes(d.statut));
  const aEncaisser = docs.filter(d => d.type === "facture" && d.statut === "envoye");
  const mois = aujourdhui().slice(0, 7);
  const encaisse = docs.filter(d => d.type === "facture" && d.statut === "paye" && String(d.date).slice(0, 7) === mois);
  const somme = l => l.reduce((a, d) => a + totaux(d).ht, 0);
  vue.innerHTML = `
    <div class="entete"><div><div class="petit">Bonjour</div><h1>Tableau de bord</h1></div></div>
    <div class="stats">
      <div class="stat"><span class="petit">Devis en attente</span><b>${devisAttente.length}</b><small class="gris">${eur(somme(devisAttente))} €</small></div>
      <div class="stat"><span class="petit">À encaisser</span><b>${eur(aEncaisser.reduce((a, d) => a + totaux(d).reste, 0))} €</b><small class="gris">${aEncaisser.length} facture(s)</small></div>
      <div class="stat"><span class="petit">Encaissé ce mois</span><b>${eur(somme(encaisse))} €</b></div>
      <div class="stat"><span class="petit">Clients</span><b>${clients.length}</b></div>
    </div>
    ${blocChantiers(docs, clients, depenses)}
    ${blocDepenses(depenses, clients, mois)}
    ${nouvelles.length ? `<a class="alerte" href="#/demandes">${ICO.boite}<span><b>${nouvelles.length} nouvelle${nouvelles.length > 1 ? "s" : ""} demande${nouvelles.length > 1 ? "s" : ""} de devis</b><small>${esc(nouvelles.slice(0, 3).map(x => x.nom).join(", "))}</small></span><span>›</span></a>` : ""}
    ${relances.length ? `<h2 style="margin-bottom:12px">À relancer</h2>
    <p class="gris" style="font-size:14px;margin:-6px 0 12px">Devis envoyés il y a plus de 7 jours, toujours sans réponse.</p>
    <div class="liste" id="relances" style="margin-bottom:26px">${relances.map(d => `<div class="ligne-liste"><a href="#/document/${d.id}" style="text-decoration:none;flex:1"><b>${esc(d.numero)}</b><small>${esc(nomClient(d.client))} · envoyé le ${dateFr(String(d.updated_at || d.created_at).slice(0, 10))}</small></a><button class="btn clair" data-relance="${d.id}">Relancer</button></div>`).join("")}</div>` : ""}
    <div class="raccourcis">
      <a href="#/document/nouveau/devis">${ICO.devis}Nouveau devis</a>
      <a href="#/document/nouveau/facture">${ICO.devis}Nouvelle facture</a>
      <a href="#/client/nouveau">${ICO.client}Nouveau client</a>
      <a href="#/3d">${ICO.cube}Simulation 3D</a>
    </div>
    <h2 style="margin-bottom:12px">Derniers documents</h2>
    <div class="liste">${docs.slice(0, 6).map(ligneDoc).join("") || '<p class="vide">Aucun document pour l\'instant.</p>'}</div>`;
  const r = document.getElementById("relances");
  if (r) r.onclick = async e => {
    const b = e.target.closest("[data-relance]"); if (!b) return;
    const d = relances.find(x => x.id === b.dataset.relance);
    await envoyerMessage(d, msgRelance(d));
    try { await db.enregistrer("documents", { ...d }); } catch (er) { erreur(er); } // repart pour 7 jours
    b.closest(".ligne-liste").remove(); toast("Relance envoyée ✓");
  };
}

// Chantiers en cours : un devis signé dont le PV n'est pas encore signé ; un toucher ouvre la fiche du client (carnet)
function blocChantiers(docs, clients, depenses) {
  const signes = docs.filter(d => d.type === "devis" && d.statut === "signe" && d.client_id);
  if (!signes.length) return "";
  const parClient = {};
  signes.forEach(d => { (parClient[d.client_id] = parClient[d.client_id] || []).push(d); });
  setTimeout(() => {
    signes.forEach(async d => {
      try {
        const r = await db.chercher("receptions", "document_id", d.id);
        if (r?.data?.signe_le) document.querySelector(`[data-pv-fini="${d.id}"]`)?.setAttribute("data-fini", "1");
      } catch { /* on garde le chantier affiché */ }
      const z = document.getElementById("chantiers"); if (!z) return;
      z.querySelectorAll(".ligne-chantier").forEach(l => { l.hidden = [...l.querySelectorAll("[data-pv-fini]")].every(x => x.dataset.fini === "1"); });
      const vide = document.getElementById("chantiersVide"); if (vide) vide.hidden = [...z.querySelectorAll(".ligne-chantier")].some(l => !l.hidden);
    });
  });
  return `<div class="carte" style="margin-bottom:22px"><h2 style="margin-bottom:6px">Chantiers en cours</h2>
    <div id="chantiers">${Object.entries(parClient).map(([id, ds]) => {
      const c = clients.find(x => x.id === id), total = ds.reduce((a, d) => a + totaux(d).ht, 0);
      const dep = depenses.filter(x => x.client_id === id).reduce((a, x) => a + (Number(x.montant) || 0), 0);
      return `<a class="ligne-chantier" href="#/client/${id}?carnet=1">${ds.map(d => `<i data-pv-fini="${d.id}"></i>`).join("")}
        <span><b>${esc(c ? nomClient(c) : nomClient(ds[0].client))}</b><small>Devis ${eur(total)} € · dépenses ${eur(dep)} €</small></span>
        <span class="reste"><small>Reste</small>${eur(total - dep)} €</span></a>`;
    }).join("")}</div>
    <p class="gris" id="chantiersVide" hidden style="font-size:14px">Tous les chantiers signés ont leur PV : rien en cours.</p>
    <p class="gris" style="font-size:12px;margin-top:8px">Reste = devis signés moins les dépenses notées dans le carnet. Un toucher ouvre le chantier.</p></div>`;
}

// Dépenses du mois : celles des carnets de chantier et celles hors chantier, par catégorie et par chantier
function blocDepenses(depenses, clients, moisChoisi) {
  const moisDispo = [...new Set([moisChoisi, ...depenses.map(x => String(x.created_at).slice(0, 7))])].sort().reverse();
  const nomMois = m => new Date(m + "-15").toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
  const dessiner = m => {
    const l = depenses.filter(x => String(x.created_at).slice(0, 7) === m), total = l.reduce((a, x) => a + (Number(x.montant) || 0), 0);
    const grouper = cle => { const g = {}; l.forEach(x => { const k = cle(x); g[k] = g[k] || { v: 0, n: 0 }; g[k].v += Number(x.montant) || 0; g[k].n++; }); return Object.entries(g).sort((a, b) => b[1].v - a[1].v); };
    const parCat = grouper(x => x.categorie || "autre"), parChantier = grouper(x => x.client_id || "");
    const barre = (nom, { v, n }, lien) => `<div class="ligne-bilan"><span>${lien ? `<a href="${lien}">${esc(nom)}</a>` : esc(nom)} <small class="gris">· ${n} dépense${n > 1 ? "s" : ""}</small><i class="barre-dep" style="width:${total ? Math.max(4, v / total * 100) : 0}%"></i></span><span>${eur(v)} €</span></div>`;
    const hors = l.filter(x => !x.client_id).sort((a, b) => a.created_at < b.created_at ? 1 : -1);
    const ligneDep = x => { const c = clients.find(y => y.id === x.client_id);
      return `<div class="ligne-bilan sous"><span>${new Date(x.created_at).toLocaleDateString("fr-FR")} · ${esc(x.client_id ? (c ? nomClient(c) : "Client archivé") : "Hors chantier")}${x.texte ? " · " + esc(x.texte) : ""}</span><span>${eur(x.montant)} €</span></div>`; };
    return l.length ? `<div class="petit" style="margin:10px 0 4px">Par catégorie · touchez pour le détail</div>${parCat.map(([k, g]) => `<details class="cat-dep"><summary>${barre(CATEGORIES[k] || "Autre", g)}</summary>${l.filter(x => (x.categorie || "autre") === k).sort((a, b) => a.created_at < b.created_at ? 1 : -1).map(ligneDep).join("")}</details>`).join("")}
      <div class="ligne-bilan total"><span>Total du mois</span><span>${eur(total)} €</span></div>
      <div class="petit" style="margin:16px 0 4px">Par chantier</div>${parChantier.map(([id, g]) => { const c = clients.find(x => x.id === id); return barre(id ? (c ? nomClient(c) : "Client archivé") : "Hors chantier", g, c ? `#/client/${id}` : ""); }).join("")}
      ${hors.length ? `<div class="petit" style="margin:16px 0 4px">Détail hors chantier</div>${hors.map(x => `<div class="ligne-bilan"><span>${new Date(x.created_at).toLocaleDateString("fr-FR")} · ${esc(CATEGORIES[x.categorie] || "Autre")}${x.texte ? " · " + esc(x.texte) : ""}</span><span>${eur(x.montant)} € <button type="button" class="icone" data-retirer-dep="${x.id}" aria-label="Retirer" style="width:28px;height:28px">✕</button></span></div>`).join("")}` : ""}`
      : '<p class="gris" style="font-size:14px;margin-top:8px">Aucune dépense ce mois-ci.</p>';
  };
  setTimeout(() => {
    const s = document.getElementById("moisDep"), z = document.getElementById("zoneDep"); if (!s) return;
    s.onchange = () => { z.innerHTML = dessiner(s.value); };
    document.getElementById("depHors").onclick = () => ajouterDepenseHors();
    z.onclick = e => {
      const b = e.target.closest("[data-retirer-dep]"); if (!b) return;
      const x = depenses.find(d => d.id === b.dataset.retirerDep); if (!x) return;
      const i = depenses.indexOf(x); depenses.splice(i, 1); z.innerHTML = dessiner(s.value);
      const t = document.createElement("div"); t.className = "toast";
      t.innerHTML = 'Dépense retirée <button type="button" style="margin-left:10px;background:none;border:0;color:#fff;text-decoration:underline;font:inherit;cursor:pointer">Annuler</button>';
      document.body.appendChild(t);
      const minuteur = setTimeout(async () => { t.remove(); try { await db.supprimerCarnet(x); } catch (er) { depenses.splice(i, 0, x); erreur(er); } }, 8000);
      t.querySelector("button").onclick = () => { clearTimeout(minuteur); t.remove(); depenses.splice(i, 0, x); z.innerHTML = dessiner(s.value); };
    };
  });
  return `<div class="carte" style="margin-bottom:22px">
    <div class="entete" style="margin-bottom:6px"><h2>Dépenses</h2>
      <select id="moisDep" style="width:auto">${moisDispo.map(m => `<option value="${m}">${nomMois(m)}</option>`).join("")}</select></div>
    <button type="button" class="btn clair petit-btn" id="depHors">+ Dépense hors chantier</button>
    <div id="zoneDep">${dessiner(moisChoisi)}</div>
    <p class="gris" style="font-size:12px;margin-top:8px">Les dépenses d'un chantier se notent dans le carnet du client (+ Dépense).</p></div>`;
}

// essence de la semaine, assurance, outillage… : une dépense sans client
function ajouterDepenseHors() {
  const f = fenetre("Dépense hors chantier", `
    <div class="champ"><label for="hCat">Catégorie</label><select id="hCat">${Object.entries(CATEGORIES).map(([k, n]) => `<option value="${k}" ${k === "carburant" ? "selected" : ""}>${n}</option>`).join("")}</select></div>
    <div class="deux"><div class="champ"><label for="hMontant">Montant €</label><input type="number" id="hMontant" step="0.01" min="0" inputmode="decimal"></div>
      <div class="champ"><label for="hDate">Date</label><input type="date" id="hDate" value="${aujourdhui()}"></div></div>
    <div class="champ"><label for="hTexte">Détail (facultatif)</label><input type="text" id="hTexte" placeholder="Plein du camion, assurance du mois…" maxlength="200"></div>
    <label class="btn discret petit-btn" style="display:inline-flex">Photo du ticket (facultatif)<input type="file" id="hTicket" accept="image/*" hidden></label>
    <div class="actions-doc"><button class="btn" id="hOk">Ajouter</button><button class="btn discret" data-fermer>Annuler</button></div>`);
  let ticket = null;
  f.el.querySelector("#hTicket").onchange = async e => {
    const fi = e.target.files[0]; if (!fi) return;
    const img = await createImageBitmap(fi, { imageOrientation: "from-image" }), k = Math.min(1, 1600 / Math.max(img.width, img.height));
    const c = document.createElement("canvas"); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k); c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
    ticket = await new Promise(ok => c.toBlob(ok, "image/jpeg", .8)); toast("Ticket prêt ✓");
  };
  f.el.querySelector("#hOk").onclick = async () => {
    const montant = Number(f.el.querySelector("#hMontant").value || 0); if (!montant) return toast("Indiquez le montant.");
    const date = f.el.querySelector("#hDate").value || aujourdhui();
    const quand = date === aujourdhui() ? new Date().toISOString() : new Date(date + "T12:00:00").toISOString();
    try {
      await db.ajouterCarnet({ client_id: null, type: "depense", etape: "pendant", montant, created_at: quand,
        categorie: f.el.querySelector("#hCat").value, texte: f.el.querySelector("#hTexte").value.trim() || null }, ticket);
      f.fermer(); toast("Dépense ajoutée ✓"); vueAccueil();
    } catch (e) { erreur(e); }
  };
}

function ligneDoc(d) {
  return `<a class="ligne-liste" href="#/document/${d.id}">
    <div><b>${esc(d.numero)}</b><small>${esc(nomClient(d.client))} · ${dateFr(d.date)}</small></div>
    <div class="droite"><div class="montant">${eur(totaux(d).ht)} €</div><span class="badge ${esc(d.statut)}">${esc(libelleStatut(d.type, d.statut))}</span></div></a>`;
}

/* =================== Liste des documents =================== */
async function vueDocuments(type) {
  const docs = (await db.lister("documents")).filter(d => d.type === type);
  vue.innerHTML = `
    <div class="entete"><h1>${type === "devis" ? "Devis" : "Factures"}</h1>
      <a class="btn" href="#/document/nouveau/${type}">${ICO.plus}${type === "devis" ? "Nouveau devis" : "Nouvelle facture"}</a></div>
    <div class="onglets"><a href="#/documents/devis" class="${type === "devis" ? "actif" : ""}">Devis</a><a href="#/documents/facture" class="${type === "facture" ? "actif" : ""}">Factures</a></div>
    <input class="recherche" type="search" placeholder="Rechercher un client, un numéro…" id="rech">
    <div class="liste" id="res"></div>`;
  const afficher = q => {
    const f = q.toLowerCase();
    const l = docs.filter(d => !f || `${d.numero} ${nomClient(d.client)} ${d.objet}`.toLowerCase().includes(f));
    document.getElementById("res").innerHTML = l.map(ligneDoc).join("") || `<p class="vide">Aucun ${type === "devis" ? "devis" : "facture"}.</p>`;
  };
  afficher("");
  document.getElementById("rech").oninput = e => afficher(e.target.value);
}

/* =================== Éditeur de devis / facture =================== */
function numeroSuivant(type) {
  const d = new Date(), aa = String(d.getFullYear()).slice(2), mm = String(d.getMonth() + 1).padStart(2, "0");
  return type === "devis"
    ? `DE-${aa}${mm}-${String(P.prochain_devis).padStart(2, "0")}`
    : `FA-${aa}-${mm}-${String(P.prochain_facture).padStart(2, "0")}`;
}

async function vueDocument(id, type, params) {
  let d;
  if (id === "nouveau") {
    d = { type, numero: numeroSuivant(type), date: aujourdhui(), statut: "brouillon", objet: "", sections: [{ titre: "Travaux", lignes: [] }],
      acompte_pct: type === "devis" ? P.acompte_pct : 0, deja_regle: 0, client: null, client_id: null, notes: "" };
    if (params.get("client")) {
      const c = await db.lire("clients", params.get("client"));
      if (c) { d.client_id = c.id; d.client = instantane(c); d.objet = `Chantier - ${[c.civilite, c.nom].filter(Boolean).join(" ")}`; }
    }
  } else {
    d = await db.lire("documents", id);
    if (!d) { vue.innerHTML = '<p class="vide">Document introuvable.</p>'; return; }
    d.sections = d.sections?.length ? d.sections : [{ titre: "Travaux", lignes: [] }];
  }
  const estDevis = d.type === "devis";
  let modifie = false;

  const dessiner = () => {
    vue.innerHTML = `
      <div class="entete"><div><div class="petit">${estDevis ? "Devis" : "Facture"} ${d.id ? "" : "· nouveau"}</div><h1>${esc(d.numero)}</h1></div>
        <select id="statut" style="width:auto">${STATUTS[d.type].map(([v, l]) => `<option value="${v}" ${v === d.statut ? "selected" : ""}>${l}</option>`).join("")}</select></div>
      <div class="deux-col">
        <div>
          <div class="carte" style="margin-bottom:12px">
            <label>Client</label>
            <button class="choix" id="choixClient" style="border-color:var(--sable)"><span>${d.client ? `<b>${esc(nomClient(d.client))}</b><br><small class="gris">${esc([d.client.adresse, d.client.cp, d.client.ville].filter(Boolean).join(", "))}</small>` : '<span class="gris">Choisir ou créer un client…</span>'}</span><span>›</span></button>
            <div class="champ"><label for="objet">Objet</label><input type="text" id="objet" value="${esc(d.objet)}" placeholder="Chantier - M. Dupont"></div>
            <div class="deux">
              <div class="champ"><label for="date">Date</label><input type="date" id="date" value="${esc(d.date)}"></div>
              ${estDevis
                ? `<div class="champ"><label for="acompte">Acompte %</label><input type="number" id="acompte" value="${esc(d.acompte_pct)}" min="0" max="100"></div>`
                : `<div class="champ"><label for="regle">Déjà réglé €</label><input type="number" id="regle" value="${esc(d.deja_regle || 0)}" min="0" step="0.01"></div>`}
            </div>
            <div class="deux">
              <div class="champ"><label for="debut">Début des travaux</label><input type="date" id="debut" value="${esc(d.date_debut || "")}"></div>
              <div class="champ"><label for="duree">Durée estimée</label><input type="text" id="duree" value="${esc(d.duree || "")}" placeholder="2 semaines"></div>
            </div>
          </div>
          <div id="lots"></div>
          <button class="btn discret" id="ajoutLot" style="width:100%">${ICO.plus}Ajouter un lot</button>
          <div class="champ" style="margin-top:16px"><label for="notes">Note (apparaît sur le PDF)</label><textarea id="notes" rows="2">${esc(d.notes || "")}</textarea></div>
        </div>
        <div>
          <div class="actions-doc">
            <button class="btn" id="enreg">Enregistrer</button>
            <button class="btn clair" id="pdf">${ICO.pdf}PDF</button>
            <button class="btn clair" id="partage">${ICO.partage}Envoyer</button>
            ${estDevis && d.id ? `<button class="btn discret" id="versFacture">Transformer en facture</button>` : ""}
            ${d.id && ((estDevis && d.statut === "signe") || (!estDevis && d.devis_id)) ? `<a class="btn clair" href="#/reception/${estDevis ? d.id : d.devis_id}">PV de fin de chantier</a>` : ""}
            ${d.id ? `<button class="btn discret" id="dupliquer">Dupliquer</button>` : ""}
            ${d.id && (estDevis || d.statut === "brouillon") ? `<button class="btn danger" id="suppr">${ICO.poubelle}Supprimer</button>` : ""}
          </div>
          ${estDevis && d.id && d.jeton ? (d.signe_le
            ? `<div class="carte signe-ok"><b>✓ Signé en ligne</b><small>le ${new Date(d.signe_le).toLocaleString("fr-FR", { dateStyle: "long", timeStyle: "short" })} par ${esc(d.signe_nom)}</small></div>`
            : `<div class="carte" style="margin-bottom:12px"><b>Signature en ligne</b><p class="gris" style="font-size:14px;margin:4px 0 12px">Le client reçoit un lien pour lire, télécharger et signer ce devis sur son téléphone.</p>
              <div class="actions-doc" style="margin:0"><button class="btn" id="envoiLien">${ICO.partage}Envoyer le lien</button><button class="btn discret" id="copieLien">Copier le lien</button></div></div>`) : ""}
          ${!estDevis && d.devis_numero ? `<p class="gris" style="font-size:14px">Facture du devis ${esc(d.devis_numero)}${d.devis_date ? " du " + dateFr(d.devis_date) : ""}.</p>` : ""}
          ${d.client_id ? `<p style="margin-top:8px"><a class="gris" href="#/client/${d.client_id}">Voir la fiche client ›</a></p>` : ""}
          ${d.id && d.client_id ? `<h2 style="margin:22px 0 10px">Carnet de chantier</h2><div id="carnetDoc"><p class="gris">Chargement du carnet…</p></div>` : ""}
        </div>
      </div>
      <div class="barre-total"><div><small>${estDevis ? "Net à payer" : "Reste à payer"}</small><span class="montant" id="total"></span></div><small id="sousTotal" style="text-align:right"></small></div>`;
    dessinerLots();
    majTotal();
    lier();
    const cd = document.getElementById("carnetDoc");
    if (cd) import("./carnet.js").then(m => m.monterCarnet(cd, { db, client: { ...(d.client || {}), id: d.client_id }, P, toast, esc, erreur })).catch(erreur);
  };

  const dessinerLots = () => {
    document.getElementById("lots").innerHTML = d.sections.map((s, i) => `
      <div class="lot" data-lot="${i}">
        <div class="lot-tete">
          <input type="text" value="${esc(s.titre)}" data-titre="${i}" aria-label="Titre du lot">
          <span class="st" data-st="${i}"></span>
          <button class="icone" data-monter="${i}" aria-label="Monter">${ICO.haut}</button>
          <button class="icone" data-suppr-lot="${i}" aria-label="Supprimer le lot">${ICO.poubelle}</button>
        </div>
        ${s.lignes.map((l, j) => `
          <div class="ligne-doc">
            <textarea rows="2" data-l="${i}.${j}" data-k="designation" placeholder="Désignation">${esc(l.designation)}</textarea>
            ${l.description ? `<textarea rows="2" class="detail-ligne" data-l="${i}.${j}" data-k="description" placeholder="Détail">${esc(l.description)}</textarea>` : ""}
            <div class="chiffres">
              <div><label>Qté</label><input type="number" step="0.01" inputmode="decimal" value="${esc(l.qte)}" data-l="${i}.${j}" data-k="qte"></div>
              <div><label>Unité</label><select data-l="${i}.${j}" data-k="unite">${UNITES.map(u => `<option ${u === l.unite ? "selected" : ""}>${u}</option>`).join("")}</select></div>
              <div><label>PU HT €</label><input type="number" step="0.01" inputmode="decimal" value="${esc(l.pu)}" data-l="${i}.${j}" data-k="pu"></div>
              <button class="icone" data-suppr-ligne="${i}.${j}" aria-label="Supprimer la ligne">${ICO.poubelle}</button>
            </div>
            <div class="tot" data-tl="${i}.${j}"></div>
          </div>`).join("")}
        <div class="lot-pied">
          <button class="btn clair petit-btn" data-catalogue="${i}">${ICO.liste}Depuis mes prestations</button>
          <button class="btn discret petit-btn" data-libre="${i}">${ICO.plus}Ligne libre</button>
        </div>
      </div>`).join("");
  };

  const majTotal = () => {
    const t = totaux(d);
    d.sections.forEach((s, i) => {
      const st = s.lignes.reduce((a, l) => a + (Number(l.qte) || 0) * (Number(l.pu) || 0), 0);
      const el = vue.querySelector(`[data-st="${i}"]`); if (el) el.textContent = eur(st) + " €";
      s.lignes.forEach((l, j) => { const e = vue.querySelector(`[data-tl="${i}.${j}"]`); if (e) e.textContent = eur((Number(l.qte) || 0) * (Number(l.pu) || 0)) + " €"; });
    });
    document.getElementById("total").textContent = eur(estDevis ? t.ht : t.reste) + " €";
    document.getElementById("sousTotal").textContent = estDevis
      ? (Number(d.acompte_pct) ? `Acompte ${d.acompte_pct} % : ${eur(t.acompte)} €` : "")
      : (t.regle ? `Total ${eur(t.ht)} € · réglé ${eur(t.regle)} €` : "");
  };

  const lier = () => {
    const champ = (id, k, num) => { const e = document.getElementById(id); if (e) e.oninput = () => { d[k] = num ? Number(e.value) : e.value; modifie = true; majTotal(); }; };
    champ("objet", "objet"); champ("date", "date"); champ("debut", "date_debut"); champ("duree", "duree");
    champ("acompte", "acompte_pct", true); champ("regle", "deja_regle", true); champ("notes", "notes");
    document.getElementById("statut").onchange = e => { d.statut = e.target.value; modifie = true; };
    document.getElementById("choixClient").onclick = () => choisirClient(c => { d.client_id = c.id; d.client = instantane(c); if (!d.objet) d.objet = `Chantier - ${[c.civilite, c.nom].filter(Boolean).join(" ")}`; modifie = true; dessiner(); });
    document.getElementById("ajoutLot").onclick = () => { d.sections.push({ titre: "Nouveau lot", lignes: [] }); modifie = true; dessinerLots(); majTotal(); };
    document.getElementById("lots").oninput = e => {
      const t = e.target;
      if (t.dataset.titre !== undefined) { d.sections[t.dataset.titre].titre = t.value; }
      if (t.dataset.l) { const [i, j] = t.dataset.l.split(".").map(Number); const k = t.dataset.k; d.sections[i].lignes[j][k] = (k === "qte" || k === "pu") ? Number(t.value) : t.value; }
      modifie = true; majTotal();
    };
    document.getElementById("lots").onchange = e => { const t = e.target; if (t.dataset.k === "unite") { const [i, j] = t.dataset.l.split(".").map(Number); d.sections[i].lignes[j].unite = t.value; modifie = true; } };
    document.getElementById("lots").onclick = async e => {
      const b = e.target.closest("button"); if (!b) return;
      if (b.dataset.libre !== undefined) { d.sections[b.dataset.libre].lignes.push({ designation: "", qte: 1, unite: "presta", pu: 0 }); }
      else if (b.dataset.catalogue !== undefined) { return choisirPrestation(p => { ajouterPrestation(d, p, Number(b.dataset.catalogue)); modifie = true; dessinerLots(); majTotal(); }); }
      else if (b.dataset.supprLigne) { const [i, j] = b.dataset.supprLigne.split(".").map(Number); d.sections[i].lignes.splice(j, 1); }
      else if (b.dataset.supprLot !== undefined) { if (d.sections[b.dataset.supprLot].lignes.length && !(await confirmer("Supprimer ce lot et ses lignes ?", "Supprimer"))) return; d.sections.splice(b.dataset.supprLot, 1); }
      else if (b.dataset.monter !== undefined) { const i = Number(b.dataset.monter); if (i > 0) [d.sections[i - 1], d.sections[i]] = [d.sections[i], d.sections[i - 1]]; }
      else return;
      modifie = true; dessinerLots(); majTotal();
    };
    document.getElementById("enreg").onclick = () => enregistrer().then(() => toast("Enregistré ✓")).catch(erreur);
    document.getElementById("pdf").onclick = async () => { try { await enregistrer(); await telechargerPDF(d, P); } catch (e) { erreur(e); } };
    document.getElementById("partage").onclick = async () => { try { await enregistrer(); await telechargerPDF(d, P, { partager: true }); } catch (e) { if (e.name !== "AbortError") erreur(e); } };
    const vf = document.getElementById("versFacture");
    if (vf) vf.onclick = async () => {
      try {
        await enregistrer();
        const f = { type: "facture", numero: numeroSuivant("facture"), date: aujourdhui(), statut: "brouillon", client_id: d.client_id, client: d.client,
          objet: d.objet, sections: JSON.parse(JSON.stringify(d.sections)), acompte_pct: 0, deja_regle: 0, devis_id: d.id, devis_numero: d.numero, devis_date: d.date, notes: "" };
        f.total_ht = totaux(f).ht;
        const n = await db.enregistrer("documents", f);
        P.prochain_facture = Number(P.prochain_facture) + 1; await db.enregistrerParametres(P);
        if (d.statut !== "signe") { d.statut = "signe"; await db.enregistrer("documents", { ...d }); }
        toast("Facture créée ✓"); location.hash = "#/document/" + n.id;
      } catch (e) { erreur(e); }
    };
    const el = document.getElementById("envoiLien");
    if (el) el.onclick = async () => {
      try {
        await enregistrer();
        await envoyerMessage(d, msgSignature(d));
        if (d.statut === "brouillon") { d.statut = "envoye"; modifie = true; await enregistrer(); dessiner(); }
      } catch (e) { erreur(e); }
    };
    const cl = document.getElementById("copieLien");
    if (cl) cl.onclick = async () => { await navigator.clipboard.writeText(lienSignature(d)); toast("Lien copié ✓"); };
    const du = document.getElementById("dupliquer");
    if (du) du.onclick = async () => {
      const copie = { ...JSON.parse(JSON.stringify(d)), id: undefined, created_at: undefined, numero: numeroSuivant(d.type), date: aujourdhui(), statut: "brouillon", devis_id: null, devis_numero: null, devis_date: null };
      delete copie.id; delete copie.created_at; delete copie.jeton; delete copie.signe_le; delete copie.signe_nom;
      try { const n = await enregistrerNouveau(copie); toast("Copie créée ✓"); location.hash = "#/document/" + n.id; } catch (e) { erreur(e); }
    };
    const su = document.getElementById("suppr");
    if (su) su.onclick = async () => {
      if (!(await confirmer(`Supprimer définitivement ${d.numero} ?`, "Supprimer"))) return;
      try { await db.supprimer("documents", d.id); toast("Supprimé"); location.hash = `#/documents/${d.type}`; } catch (e) { erreur(e); }
    };
  };

  async function enregistrer() {
    d.total_ht = totaux(d).ht;
    if (!d.id) { const n = await enregistrerNouveau(d); Object.assign(d, n); history.replaceState(null, "", "#/document/" + d.id); }
    else if (modifie) await db.enregistrer("documents", d);
    modifie = false;
  }
  dessiner();
}

async function enregistrerNouveau(doc) {
  doc.total_ht = totaux(doc).ht;
  const n = await db.enregistrer("documents", doc);
  if (doc.type === "devis") P.prochain_devis = Number(P.prochain_devis) + 1; else P.prochain_facture = Number(P.prochain_facture) + 1;
  await db.enregistrerParametres(P);
  return n;
}

function instantane(c) {
  const { id, civilite, nom, prenom, societe, adresse, cp, ville, tel, email } = c;
  return { id, civilite, nom, prenom, societe, adresse, cp, ville, tel, email };
}

function ajouterPrestation(d, p, indexLot) {
  let i = d.sections.findIndex(s => s.titre === p.categorie);
  if (i < 0) {
    const lot = d.sections[indexLot];
    if (lot && !lot.lignes.length && ["Travaux", "Nouveau lot"].includes(lot.titre)) { lot.titre = p.categorie || lot.titre; i = indexLot; }
    else { d.sections.push({ titre: p.categorie || "Travaux", lignes: [] }); i = d.sections.length - 1; }
  }
  d.sections[i].lignes.push({ designation: p.designation, description: p.description || "", qte: 1, unite: p.unite, pu: Number(p.prix_ht) });
}

/* =================== Sélecteurs =================== */
async function choisirClient(rappel) {
  const clients = (await db.lister("clients", { ordre: "nom", desc: false })).filter(c => !c.archive);
  const f = fenetre("Choisir un client", `
    <input class="recherche" type="search" placeholder="Rechercher…" id="rc">
    <button class="btn discret" id="nvClient" style="width:100%;margin-bottom:12px">${ICO.plus}Nouveau client</button>
    <div id="lc"></div>`);
  const aff = q => {
    f.el.querySelector("#lc").innerHTML = clients.filter(c => !q || `${nomClient(c)} ${c.ville} ${c.tel} ${c.email}`.toLowerCase().includes(q.toLowerCase()))
      .map(c => `<button class="choix" data-id="${c.id}"><span><b>${esc(nomClient(c))}</b><br><small class="gris">${esc([c.ville, c.tel].filter(Boolean).join(" · "))}</small></span><span>›</span></button>`).join("")
      || '<p class="vide">Aucun client.</p>';
  };
  aff("");
  f.el.querySelector("#rc").oninput = e => aff(e.target.value);
  f.el.querySelector("#lc").onclick = e => { const b = e.target.closest("[data-id]"); if (b) { f.fermer(); rappel(clients.find(c => c.id === b.dataset.id)); } };
  f.el.querySelector("#nvClient").onclick = () => { f.fermer(); formulaireClient({}, c => rappel(c)); };
}

async function choisirPrestation(rappel) {
  const ps = (await db.lister("prestations", { ordre: "created_at", desc: false })).filter(p => !p.archive);
  const f = fenetre("Mes prestations", `<input class="recherche" type="search" placeholder="Rechercher…" id="rp"><div id="lp"></div>`);
  const aff = q => {
    const l = ps.filter(p => !q || `${p.designation} ${p.categorie}`.toLowerCase().includes(q.toLowerCase()));
    const cats = [...new Set(l.map(p => p.categorie || "Autres"))];
    f.el.querySelector("#lp").innerHTML = cats.map(cat => `<div class="cat-titre">${esc(cat)}</div>` +
      l.filter(p => (p.categorie || "Autres") === cat).map(p => `<button class="choix" data-id="${p.id}"><span>${esc(p.designation)}</span><span class="gris" style="white-space:nowrap">${eur(p.prix_ht)} € / ${esc(p.unite)}</span></button>`).join("")).join("")
      || '<p class="vide">Aucune prestation.</p>';
  };
  aff("");
  f.el.querySelector("#rp").oninput = e => aff(e.target.value);
  f.el.querySelector("#lp").onclick = e => { const b = e.target.closest("[data-id]"); if (b) { f.fermer(); rappel(ps.find(p => p.id === b.dataset.id)); } };
}

/* =================== Demandes de devis (formulaire du site) =================== */
async function vueDemandes() {
  const demandes = await listerDemandes();
  if (!demandes) { vue.innerHTML = `<div class="entete"><h1>Demandes</h1></div><p class="vide">Les demandes du site arriveront ici dès que la mise à jour de la base sera faite.</p>`; return; }
  let filtre = "nouvelle";
  const ligne = x => `<a class="ligne-liste" href="#/demande/${x.id}"><div><b>${esc(x.nom)}</b><small>${esc([x.ville || x.cp, String(x.message || "").split("\n")[0]].filter(Boolean).join(" · "))}</small></div>
    <div class="droite"><small class="gris">${new Date(x.created_at).toLocaleDateString("fr-FR")}</small>${x.photos?.length ? `<span class="badge">${x.photos.length} photo${x.photos.length > 1 ? "s" : ""}</span>` : ""}</div></a>`;
  const aff = () => {
    vue.innerHTML = `
      <div class="entete"><h1>Demandes</h1></div>
      <div class="onglets"><a href="" data-f="nouvelle" class="${filtre === "nouvelle" ? "actif" : ""}">Nouvelles (${demandes.filter(x => x.statut === "nouvelle").length})</a><a href="" data-f="traitee" class="${filtre === "traitee" ? "actif" : ""}">Traitées</a></div>
      <div class="liste">${demandes.filter(x => x.statut === filtre).map(ligne).join("") || `<p class="vide">${filtre === "nouvelle" ? "Aucune nouvelle demande." : "Aucune demande traitée."}</p>`}</div>`;
    vue.querySelectorAll("[data-f]").forEach(a => a.onclick = e => { e.preventDefault(); filtre = a.dataset.f; aff(); });
  };
  aff();
}

async function vueDemande(id) {
  const x = await db.lire("demandes", id);
  if (!x) { vue.innerHTML = '<p class="vide">Demande introuvable.</p>'; return; }
  const tel = String(x.tel || "").replace(/\s/g, "");
  vue.innerHTML = `
    <div class="entete"><div><div class="petit">Demande du ${new Date(x.created_at).toLocaleDateString("fr-FR", { dateStyle: "long" })}</div><h1>${esc(x.nom)}</h1></div>
      <span class="badge ${x.statut === "traitee" ? "signe" : "envoye"}">${x.statut === "traitee" ? "Traitée" : "Nouvelle"}</span></div>
    <div class="deux-col">
      <div>
        <div class="carte" style="margin-bottom:12px">
          ${x.tel ? `<p><span class="petit">Téléphone</span><br><a href="tel:${esc(tel)}">${esc(x.tel)}</a></p>` : ""}
          ${x.email ? `<p style="margin-top:10px"><span class="petit">E-mail</span><br><a href="mailto:${esc(x.email)}">${esc(x.email)}</a></p>` : ""}
          ${x.ville || x.cp ? `<p style="margin-top:10px"><span class="petit">Ville</span><br>${esc([x.cp, x.ville].filter(Boolean).join(" "))}</p>` : ""}
          <p style="margin-top:10px"><span class="petit">Projet</span><br><span style="white-space:pre-line">${esc(x.message || "")}</span></p>
        </div>
        <div class="photos-demande" id="photos">${x.photos?.length ? '<p class="gris">Chargement des photos…</p>' : '<p class="gris">Pas de photo jointe.</p>'}</div>
      </div>
      <div>
        <div class="actions-doc">
          ${x.tel ? `<a class="btn" href="tel:${esc(tel)}">Appeler</a><a class="btn clair" href="https://wa.me/${numeroWa(x.tel)}" target="_blank" rel="noopener">WhatsApp</a><a class="btn clair" href="sms:${esc(tel)}">SMS</a>` : ""}
          ${x.client_id ? `<a class="btn clair" href="#/client/${x.client_id}">${ICO.client}Fiche client</a><a class="btn clair" href="#/document/nouveau/devis?client=${x.client_id}">${ICO.plus}Devis</a>`
            : `<button class="btn clair" id="versClient">${ICO.client}Créer la fiche client</button>`}
          <button class="btn discret" id="traitee">${x.statut === "traitee" ? "Remettre en nouvelle" : "Marquer comme traitée"}</button>
          <button class="btn danger" id="suppr">${ICO.poubelle}Supprimer</button>
        </div>
      </div>
    </div>`;
  if (x.photos?.length) db.photosDemande(x.photos).then(urls => {
    document.getElementById("photos").innerHTML = urls.map(u => `<a href="${esc(u)}" target="_blank" rel="noopener"><img src="${esc(u)}" alt="Photo de la pièce"></a>`).join("");
  }).catch(e => { document.getElementById("photos").innerHTML = '<p class="gris">Photos indisponibles.</p>'; console.error(e); });
  document.getElementById("traitee").onclick = async () => {
    try { await db.enregistrer("demandes", { ...x, statut: x.statut === "traitee" ? "nouvelle" : "traitee" }); vueDemande(id); } catch (e) { erreur(e); }
  };
  const vc = document.getElementById("versClient");
  if (vc) vc.onclick = async () => {
    try {
      const c = await db.enregistrer("clients", { nom: x.nom, tel: x.tel, email: x.email, cp: x.cp, ville: x.ville, notes: x.message, archive: false });
      await db.enregistrer("demandes", { ...x, client_id: c.id, statut: "traitee" });
      toast("Fiche client créée ✓"); vueDemande(id);
    } catch (e) { erreur(e); }
  };
  document.getElementById("suppr").onclick = async () => {
    if (!(await confirmer(`Supprimer la demande de ${x.nom} et ses photos ?`, "Supprimer"))) return;
    try { await db.supprimerPhotosDemande(x.photos); await db.supprimer("demandes", x.id); toast("Demande supprimée"); location.hash = "#/demandes"; } catch (e) { erreur(e); }
  };
}

/* =================== Clients =================== */
async function vueClients() {
  const clients = (await db.lister("clients", { ordre: "nom", desc: false })).filter(c => !c.archive);
  vue.innerHTML = `
    <div class="entete"><h1>Clients</h1><a class="btn" href="#/client/nouveau">${ICO.plus}Nouveau client</a></div>
    <input class="recherche" type="search" placeholder="Rechercher un nom, une ville, un téléphone…" id="rech">
    <div class="liste" id="res"></div>`;
  const aff = q => {
    document.getElementById("res").innerHTML = clients.filter(c => !q || `${nomClient(c)} ${c.ville} ${c.tel} ${c.email}`.toLowerCase().includes(q.toLowerCase()))
      .map(c => `<a class="ligne-liste" href="#/client/${c.id}"><div><b>${esc(nomClient(c))}</b><small>${esc([c.ville, c.tel].filter(Boolean).join(" · "))}</small></div><span class="gris">›</span></a>`).join("")
      || '<p class="vide">Aucun client pour l\'instant.</p>';
  };
  aff("");
  document.getElementById("rech").oninput = e => aff(e.target.value);
}

const CHAMPS_CLIENT = [["civilite", "Civilité", "text", "M. / Mme"], ["nom", "Nom", "text"], ["prenom", "Prénom", "text"], ["societe", "Société", "text"],
  ["adresse", "Adresse du chantier", "text"], ["cp", "Code postal", "text"], ["ville", "Ville", "text"], ["tel", "Téléphone", "tel"], ["email", "E-mail", "email"]];

function champsClient(c) {
  return `<div class="deux">${CHAMPS_CLIENT.slice(0, 4).map(([k, l, t, ph]) => `<div class="champ"><label>${l}</label><input type="${t}" name="${k}" value="${esc(c[k])}" placeholder="${ph || ""}"></div>`).join("")}</div>
    ${CHAMPS_CLIENT.slice(4, 5).map(([k, l, t]) => `<div class="champ"><label>${l}</label><input type="${t}" name="${k}" value="${esc(c[k])}"></div>`).join("")}
    <div class="deux">${CHAMPS_CLIENT.slice(5).map(([k, l, t]) => `<div class="champ"><label>${l}</label><input type="${t}" name="${k}" value="${esc(c[k])}"></div>`).join("")}</div>
    <div class="champ"><label>Notes</label><textarea name="notes" rows="3">${esc(c.notes)}</textarea></div>`;
}
function lireForm(el, obj) { el.querySelectorAll("[name]").forEach(i => { obj[i.name] = i.value.trim(); }); return obj; }

function formulaireClient(c, rappel) {
  const f = fenetre(c.id ? "Modifier le client" : "Nouveau client", `<form id="fc">${champsClient(c)}<button class="btn" style="width:100%">Enregistrer</button></form>`);
  f.el.querySelector("#fc").onsubmit = async e => {
    e.preventDefault();
    const o = lireForm(e.target, { ...c });
    if (!o.nom) return toast("Le nom est obligatoire.");
    try { const n = await db.enregistrer("clients", o); f.fermer(); toast("Client enregistré ✓"); rappel(n); } catch (er) { erreur(er); }
  };
}

async function vueClient(id, params) {
  const c = id === "nouveau" ? {} : await db.lire("clients", id);
  if (!c) { vue.innerHTML = '<p class="vide">Client introuvable.</p>'; return; }
  const docs = c.id ? (await db.lister("documents")).filter(d => d.client_id === c.id) : [];
  const sims = c.id ? (await db.lister("simulations")).filter(s => s.client_id === c.id) : [];
  vue.innerHTML = `
    <div class="entete"><div><div class="petit">Client</div><h1>${c.id ? esc(nomClient(c)) : "Nouveau client"}</h1></div></div>
    <div class="deux-col">
      <form class="carte" id="fc">${champsClient(c)}
        <div class="actions-doc"><button class="btn">Enregistrer</button>
        ${c.id ? `<button type="button" class="btn danger" id="archiver">Archiver</button>` : ""}</div>
      </form>
      <div>
        ${c.id ? `
        <div class="actions-doc">
          <a class="btn" href="#/document/nouveau/devis?client=${c.id}">${ICO.plus}Devis</a>
          <a class="btn clair" href="#/document/nouveau/facture?client=${c.id}">${ICO.plus}Facture</a>
          <a class="btn clair" href="#/3d?client=${c.id}">${ICO.cube}Simulation 3D</a>
          ${c.tel ? `<a class="btn discret" href="tel:${esc(c.tel.replace(/\s/g, ""))}">Appeler</a>` : ""}
        </div>
        ${docs.some(d => d.type === "devis" && d.statut === "signe") ? `<h2 style="margin:8px 0 10px">PV de fin de chantier</h2>
        <div class="liste" id="listePV" style="margin-bottom:22px">${docs.filter(d => d.type === "devis" && d.statut === "signe").map(d => `<a class="ligne-liste" href="#/reception/${d.id}"><div><b>PV · devis ${esc(d.numero)}</b><small data-pv="${d.id}">${esc(d.objet || "")}</small></div><span class="gris">›</span></a>`).join("")}</div>` : ""}
        <h2 style="margin:8px 0 10px">Carnet de chantier</h2>
        <div id="carnet"><p class="gris">Chargement du carnet…</p></div>
        <h2 style="margin:22px 0 10px">Documents</h2>
        <div class="liste">${docs.map(ligneDoc).join("") || '<p class="gris">Aucun devis ni facture.</p>'}</div>
        <h2 style="margin:22px 0 10px">Simulations 3D</h2>
        <div class="liste">${sims.map(s => `<a class="ligne-liste" href="#/3d?sim=${s.id}"><div><b>${esc(s.nom || "Simulation")}</b><small>${dateFr(String(s.created_at).slice(0, 10))}</small></div>${s.image ? `<img src="${s.image}" alt="" style="width:64px;height:48px;object-fit:cover;border-radius:8px">` : ""}</a>`).join("") || '<p class="gris">Aucune simulation.</p>'}</div>` : ""}
      </div>
    </div>`;
  // état de chaque PV : à faire, enregistré, ou signé
  document.querySelectorAll("[data-pv]").forEach(async el => {
    try {
      const r = await db.chercher("receptions", "document_id", el.dataset.pv);
      el.textContent = r?.data?.signe_le ? `✓ Signé le ${new Date(r.data.signe_le).toLocaleDateString("fr-FR")}` : r ? "Commencé, pas encore signé" : "À faire en fin de chantier";
    } catch { /* l'objet du devis reste affiché */ }
  });
  if (c.id) import("./carnet.js").then(async m => {
    await m.monterCarnet(document.getElementById("carnet"), { db, client: c, P, toast, esc, erreur });
    if (params?.get("carnet")) document.getElementById("carnet").previousElementSibling?.scrollIntoView({ block: "start" });
  }).catch(erreur);
  document.getElementById("fc").onsubmit = async e => {
    e.preventDefault();
    const o = lireForm(e.target, { ...c });
    if (!o.nom) return toast("Le nom est obligatoire.");
    try { const n = await db.enregistrer("clients", o); toast("Client enregistré ✓"); if (!c.id) location.hash = "#/client/" + n.id; } catch (er) { erreur(er); }
  };
  const ar = document.getElementById("archiver");
  if (ar) ar.onclick = async () => {
    if (!(await confirmer("Archiver ce client ? Il n'apparaîtra plus dans la liste, ses devis et factures sont conservés.", "Archiver"))) return;
    await db.enregistrer("clients", { ...c, archive: true }); toast("Client archivé"); location.hash = "#/clients";
  };
}

/* =================== Prestations =================== */
async function vuePrestations() {
  const ps = (await db.lister("prestations", { ordre: "created_at", desc: false })).filter(p => !p.archive);
  const cats = [...new Set(ps.map(p => p.categorie || "Autres"))];
  vue.innerHTML = `
    <div class="entete"><div><h1>Prestations</h1><p class="gris">Votre catalogue de prix, utilisable dans chaque devis.</p></div><button class="btn" id="nv">${ICO.plus}Nouvelle prestation</button></div>
    <input class="recherche" type="search" placeholder="Rechercher…" id="rech">
    <div id="res"></div>`;
  const aff = q => {
    const l = ps.filter(p => !q || `${p.designation} ${p.categorie}`.toLowerCase().includes(q.toLowerCase()));
    document.getElementById("res").innerHTML = cats.map(cat => {
      const lc = l.filter(p => (p.categorie || "Autres") === cat);
      return lc.length ? `<div class="cat-titre">${esc(cat)}</div>` + lc.map(p => `<button class="choix" data-id="${p.id}"><span>${esc(p.designation)}</span><span class="gris" style="white-space:nowrap">${eur(p.prix_ht)} € / ${esc(p.unite)}</span></button>`).join("") : "";
    }).join("") || '<p class="vide">Aucune prestation.</p>';
  };
  aff("");
  document.getElementById("rech").oninput = e => aff(e.target.value);
  document.getElementById("nv").onclick = () => formulairePrestation({ unite: "presta", prix_ht: 0 }, cats);
  document.getElementById("res").onclick = e => { const b = e.target.closest("[data-id]"); if (b) formulairePrestation(ps.find(p => p.id === b.dataset.id), cats); };
}

function formulairePrestation(p, cats) {
  const f = fenetre(p.id ? "Modifier la prestation" : "Nouvelle prestation", `
    <form id="fp">
      <div class="champ"><label>Catégorie (lot)</label><input type="text" name="categorie" list="cats" value="${esc(p.categorie)}"><datalist id="cats">${cats.map(c => `<option value="${esc(c)}">`).join("")}</datalist></div>
      <div class="champ"><label>Désignation</label><textarea name="designation" rows="3">${esc(p.designation)}</textarea></div>
      <div class="champ"><label>Détail (facultatif)</label><textarea name="description" rows="2">${esc(p.description)}</textarea></div>
      <div class="deux">
        <div class="champ"><label>Unité</label><select name="unite">${UNITES.map(u => `<option ${u === p.unite ? "selected" : ""}>${u}</option>`).join("")}</select></div>
        <div class="champ"><label>Prix HT €</label><input type="number" step="0.01" inputmode="decimal" name="prix_ht" value="${esc(p.prix_ht)}"></div>
      </div>
      <div class="actions-doc"><button class="btn">Enregistrer</button>${p.id ? `<button type="button" class="btn danger" id="arch">${ICO.poubelle}Retirer</button>` : ""}</div>
    </form>`);
  f.el.querySelector("#fp").onsubmit = async e => {
    e.preventDefault();
    const o = lireForm(e.target, { ...p }); o.prix_ht = Number(o.prix_ht) || 0;
    if (!o.designation) return toast("La désignation est obligatoire.");
    try { await db.enregistrer("prestations", o); f.fermer(); toast("Prestation enregistrée ✓"); vuePrestations(); } catch (er) { erreur(er); }
  };
  const a = f.el.querySelector("#arch");
  if (a) a.onclick = async () => { await db.enregistrer("prestations", { ...p, archive: true }); f.fermer(); toast("Prestation retirée"); vuePrestations(); };
}

/* =================== Plus / Réglages =================== */
// installer l'admin comme une appli : Android propose l'installation, l'iPhone passe par Safari
let invitationInstall = null;
window.addEventListener("beforeinstallprompt", e => { e.preventDefault(); invitationInstall = e; });
const dejaInstallee = () => matchMedia("(display-mode: standalone)").matches || navigator.standalone;
function installerAppli() {
  if (invitationInstall) { invitationInstall.prompt(); invitationInstall.userChoice.finally(() => { invitationInstall = null; }); return; }
  const iphone = /iphone|ipad|ipod/i.test(navigator.userAgent);
  fenetre("Mettre l'appli sur le téléphone", iphone
    ? `<ol class="etapes-install"><li>Ouvrez cette page dans <b>Safari</b>.</li><li>Touchez le bouton <b>Partager</b> (le carré avec une flèche vers le haut).</li><li>Choisissez <b>Sur l'écran d'accueil</b>, puis <b>Ajouter</b>.</li></ol><p class="gris" style="font-size:14px">L'icône KA apparaît à côté de vos applis : un toucher, et l'admin s'ouvre en plein écran.</p>`
    : `<ol class="etapes-install"><li>Ouvrez cette page dans <b>Chrome</b>.</li><li>Touchez les <b>trois points</b> en haut à droite.</li><li>Choisissez <b>Ajouter à l'écran d'accueil</b> (ou <b>Installer l'application</b>), puis <b>Installer</b>.</li></ol><p class="gris" style="font-size:14px">L'icône KA apparaît à côté de vos applis : un toucher, et l'admin s'ouvre en plein écran.</p>`);
}

function vuePlus() {
  vue.innerHTML = `
    <div class="entete"><h1>Plus</h1></div>
    <div class="liste">
      ${dejaInstallee() ? "" : `<button class="ligne-liste" id="installer" style="border:0;text-align:left;width:100%;cursor:pointer"><div><b>Mettre l'appli sur le téléphone</b><small>Une icône KA sur l'écran d'accueil, pour ouvrir l'admin en un toucher</small></div><span class="gris">›</span></button>`}
      <a class="ligne-liste" href="#/3d"><div><b>Simulation 3D</b><small>Montrer au client sa future salle de bain</small></div><span class="gris">›</span></a>
      <a class="ligne-liste" href="#/reglages"><div><b>Réglages</b><small>Entreprise, IBAN, numérotation, conditions</small></div><span class="gris">›</span></a>
      <button class="ligne-liste" id="sauve" style="border:0;text-align:left;width:100%;cursor:pointer"><div><b>Sauvegarde</b><small>Télécharger toutes les données (fichier)</small></div><span class="gris">›</span></button>
      <a class="ligne-liste" href="../" target="_blank"><div><b>Voir le site</b><small>karenovation.fr</small></div><span class="gris">›</span></a>
      ${db.MODE_ESSAI ? "" : `<button class="ligne-liste" id="deco" style="border:0;text-align:left;width:100%;cursor:pointer"><div><b>Se déconnecter</b></div><span class="gris">›</span></button>`}
    </div>`;
  const ins = document.getElementById("installer");
  if (ins) ins.onclick = installerAppli;
  document.getElementById("sauve").onclick = async () => {
    const data = await db.exporterTout();
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
    a.download = `sauvegarde-ka-renovation-${aujourdhui()}.json`; a.click();
  };
  const d = document.getElementById("deco");
  if (d) d.onclick = async () => { await db.deconnexion(); location.reload(); };
}

const CHAMPS_P = [
  ["Entreprise", [["entreprise", "Nom"], ["forme", "Forme juridique"], ["adresse", "Adresse"], ["cp", "Code postal"], ["ville", "Ville"], ["tel", "Téléphone"], ["email", "E-mail"], ["site", "Site"]]],
  ["Mentions légales", [["siret", "SIRET"], ["ape", "Code APE"], ["tva_intra", "N° TVA"], ["mention_tva", "Mention TVA"]]],
  ["Paiement", [["iban", "IBAN"], ["bic", "BIC"], ["titulaire", "Titulaire du compte"], ["moyen_paiement", "Moyen de paiement"], ["acompte_pct", "Acompte par défaut (%)", "number"], ["validite_jours", "Validité des devis (jours)", "number"], ["echeance_jours", "Échéance (jours)", "number"]]],
  ["Numérotation", [["prochain_devis", "Prochain n° de devis", "number"], ["prochain_facture", "Prochain n° de facture", "number"]]],
  ["Chantiers", [["taux_horaire", "Coût d'une heure de travail (€)", "number"], ["lien_avis", "Lien pour laisser un avis Google"]]]
];
function vueReglages() {
  vue.innerHTML = `
    <div class="entete"><h1>Réglages</h1></div>
    <form id="fr" class="carte">
      ${CHAMPS_P.map(([titre, champs]) => `<fieldset><legend>${titre}</legend>${champs.map(([k, l, t]) => `<div class="champ"><label>${l}</label><input type="${t || "text"}" name="${k}" value="${esc(P[k])}"></div>`).join("")}</fieldset>`).join("")}
      <fieldset><legend>Textes des documents</legend>
        <div class="champ"><label>Conditions générales (devis)</label><textarea name="conditions" rows="8">${esc(P.conditions)}</textarea></div>
        <div class="champ"><label>Conditions de paiement (factures)</label><textarea name="penalites" rows="4">${esc(P.penalites)}</textarea></div>
      </fieldset>
      <button class="btn" style="width:100%">Enregistrer les réglages</button>
    </form>`;
  document.getElementById("fr").onsubmit = async e => {
    e.preventDefault();
    const o = lireForm(e.target, { ...P });
    ["acompte_pct", "validite_jours", "echeance_jours", "prochain_devis", "prochain_facture", "taux_horaire"].forEach(k => { o[k] = Number(o[k]) || 0; });
    try { await db.enregistrerParametres(o); P = o; toast("Réglages enregistrés ✓"); } catch (er) { erreur(er); }
  };
}

/* =================== 3D =================== */
async function vue3D(params) {
  vue.innerHTML = '<p class="gris">Chargement du simulateur 3D…</p>';
  const { monterSimulateur } = await import("./sim3d.js");
  await monterSimulateur(vue, { db, params, toast, esc, choisirClient, nomClient, creerDevis: creerDevisDepuisSimulation });
}

// Crée un devis brouillon à partir du métré de la simulation, puis l'ouvre pour le compléter.
async function creerDevisDepuisSimulation(sections, client, nom) {
  const d = { type: "devis", numero: numeroSuivant("devis"), date: aujourdhui(), statut: "brouillon", sections,
    objet: client ? `Chantier - ${[client.civilite, client.nom].filter(Boolean).join(" ")}` : (nom || "Rénovation salle de bain"),
    acompte_pct: P.acompte_pct, deja_regle: 0, client_id: client?.id || null, client: client ? instantane(client) : null,
    notes: "Devis établi à partir de la simulation 3D, à confirmer après visite sur place." };
  const n = await enregistrerNouveau(d);
  toast("Devis créé à partir de la simulation ✓");
  location.hash = "#/document/" + n.id;
}

/* =================== Connexion & routeur =================== */
function vueConnexion() {
  nav.hidden = true;
  vue.innerHTML = `
    <form class="connexion" id="fl">
      <img src="../medias/logo.png" alt="KA Rénovation">
      <h1 style="margin-bottom:6px">Espace admin</h1>
      <p class="gris" style="margin-bottom:22px">Devis, factures et clients.</p>
      <div class="champ"><label>E-mail</label><input type="email" name="email" autocomplete="username" value="contact@noraeditions.com"></div>
      <div class="champ"><label>Mot de passe</label><input type="password" name="mdp" autocomplete="current-password"></div>
      <button class="btn" style="width:100%">Se connecter</button>
      <p style="text-align:center;margin-top:16px"><a href="#" id="oubli" class="gris">Mot de passe oublié ?</a></p>
    </form>`;
  document.getElementById("fl").onsubmit = async e => {
    e.preventDefault();
    try { await db.connexion(e.target.email.value, e.target.mdp.value); demarrer(); } catch (er) { toast(er.message); }
  };
  document.getElementById("oubli").onclick = async e => {
    e.preventDefault();
    const email = document.querySelector("#fl [name=email]").value.trim();
    try { await db.motDePasseOublie(email); toast("Un lien vous a été envoyé par e-mail."); } catch (er) { toast(er.message); }
  };
}

function vueNouveauMotDePasse() {
  nav.hidden = true;
  vue.innerHTML = `
    <form class="connexion" id="fm">
      <img src="../medias/logo.png" alt="KA Rénovation">
      <h1 style="margin-bottom:18px">Nouveau mot de passe</h1>
      <div class="champ"><label>Mot de passe</label><input type="password" name="mdp" autocomplete="new-password" minlength="8" required></div>
      <button class="btn" style="width:100%">Enregistrer</button>
    </form>`;
  document.getElementById("fm").onsubmit = async e => {
    e.preventDefault();
    try { await db.changerMotDePasse(e.target.mdp.value); toast("Mot de passe changé ✓"); location.hash = "#/accueil"; demarrer(); } catch (er) { toast(er.message); }
  };
}
db.surRecuperation(vueNouveauMotDePasse);

async function routeur() {
  const [chemin, requete] = (location.hash.slice(2) || "accueil").split("?");
  const params = new URLSearchParams(requete || "");
  const [r, a, b] = chemin.split("/");
  nav.querySelectorAll("a").forEach(x => x.classList.toggle("actif", x.dataset.r === r || (r === "document" && x.dataset.r === "documents") || (r === "client" && x.dataset.r === "clients") || (r === "demande" && x.dataset.r === "demandes") || (r === "reception" && x.dataset.r === "documents") || (["3d", "reglages"].includes(r) && x.dataset.r === "plus")));
  window.scrollTo(0, 0);
  try {
    if (r === "accueil") await vueAccueil();
    else if (r === "documents") await vueDocuments(a === "facture" ? "facture" : "devis");
    else if (r === "document") await vueDocument(a, b || "devis", params);
    else if (r === "clients") await vueClients();
    else if (r === "demandes") await vueDemandes();
    else if (r === "demande") await vueDemande(a);
    else if (r === "client") await vueClient(a, params);
    else if (r === "prestations") await vuePrestations();
    else if (r === "plus") vuePlus();
    else if (r === "reglages") vueReglages();
    else if (r === "3d") await vue3D(params);
    else if (r === "reception") { const { vueReception } = await import("./reception.js"); await vueReception(vue, { db, docId: a, P, toast, esc, erreur, envoyerMessage }); }
    else await vueAccueil();
  } catch (e) { erreur(e); }
}

async function demarrer() {
  const s = await db.session();
  if (!s) return vueConnexion();
  nav.hidden = false;
  document.getElementById("etat").innerHTML = db.MODE_ESSAI ? '<span class="mode" title="Les données restent dans ce navigateur">Mode essai</span>' : "";
  await db.amorcerPrestations();
  P = await db.parametres();
  window.onhashchange = routeur;
  routeur();
  listerDemandes().then(l => {
    const n = (l || []).filter(x => x.statut === "nouvelle").length;
    const a = nav.querySelector('[data-r="demandes"]');
    if (a && n) a.insertAdjacentHTML("beforeend", `<span class="compte-nav">${n}</span>`);
  });
}
demarrer().catch(erreur);
