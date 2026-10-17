// Espace admin KA Rénovation : devis, factures, clients, prestations, simulation 3D.
import * as db from "./store.js";
import { UNITES } from "./donnees.js";
import { telechargerPDF, totaux, eur } from "./pdf.js";

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
  cube: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="m12 3 8 4.5v9L12 21l-8-4.5v-9z"/><path d="m4 7.5 8 4.5 8-4.5M12 12v9"/></svg>'
};
const STATUTS = {
  devis: [["brouillon", "Brouillon"], ["envoye", "Envoyé"], ["signe", "Signé"], ["refuse", "Refusé"]],
  facture: [["brouillon", "Brouillon"], ["envoye", "Envoyée"], ["paye", "Payée"], ["annule", "Annulée"]]
};
const libelleStatut = (type, s) => (STATUTS[type].find(x => x[0] === s) || [s, s])[1];

let P = null; // paramètres de l'entreprise

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
  const [docs, clients] = await Promise.all([db.lister("documents"), db.lister("clients")]);
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
    <div class="raccourcis">
      <a href="#/document/nouveau/devis">${ICO.devis}Nouveau devis</a>
      <a href="#/document/nouveau/facture">${ICO.devis}Nouvelle facture</a>
      <a href="#/client/nouveau">${ICO.client}Nouveau client</a>
      <a href="#/3d">${ICO.cube}Simulation 3D</a>
    </div>
    <h2 style="margin-bottom:12px">Derniers documents</h2>
    <div class="liste">${docs.slice(0, 6).map(ligneDoc).join("") || '<p class="vide">Aucun document pour l\'instant.</p>'}</div>`;
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
            ${d.id ? `<button class="btn discret" id="dupliquer">Dupliquer</button>` : ""}
            ${d.id && (estDevis || d.statut === "brouillon") ? `<button class="btn danger" id="suppr">${ICO.poubelle}Supprimer</button>` : ""}
          </div>
          ${!estDevis && d.devis_numero ? `<p class="gris" style="font-size:14px">Facture du devis ${esc(d.devis_numero)}${d.devis_date ? " du " + dateFr(d.devis_date) : ""}.</p>` : ""}
          ${d.client_id ? `<p style="margin-top:8px"><a class="gris" href="#/client/${d.client_id}">Voir la fiche client ›</a></p>` : ""}
        </div>
      </div>
      <div class="barre-total"><div><small>${estDevis ? "Net à payer" : "Reste à payer"}</small><span class="montant" id="total"></span></div><small id="sousTotal" style="text-align:right"></small></div>`;
    dessinerLots();
    majTotal();
    lier();
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
    const du = document.getElementById("dupliquer");
    if (du) du.onclick = async () => {
      const copie = { ...JSON.parse(JSON.stringify(d)), id: undefined, created_at: undefined, numero: numeroSuivant(d.type), date: aujourdhui(), statut: "brouillon", devis_id: null, devis_numero: null, devis_date: null };
      delete copie.id; delete copie.created_at;
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

async function vueClient(id) {
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
        <h2 style="margin:8px 0 10px">Documents</h2>
        <div class="liste">${docs.map(ligneDoc).join("") || '<p class="gris">Aucun devis ni facture.</p>'}</div>
        <h2 style="margin:22px 0 10px">Simulations 3D</h2>
        <div class="liste">${sims.map(s => `<a class="ligne-liste" href="#/3d?sim=${s.id}"><div><b>${esc(s.nom || "Simulation")}</b><small>${dateFr(String(s.created_at).slice(0, 10))}</small></div>${s.image ? `<img src="${s.image}" alt="" style="width:64px;height:48px;object-fit:cover;border-radius:8px">` : ""}</a>`).join("") || '<p class="gris">Aucune simulation.</p>'}</div>` : ""}
      </div>
    </div>`;
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
function vuePlus() {
  vue.innerHTML = `
    <div class="entete"><h1>Plus</h1></div>
    <div class="liste">
      <a class="ligne-liste" href="#/3d"><div><b>Simulation 3D</b><small>Montrer au client sa future salle de bain</small></div><span class="gris">›</span></a>
      <a class="ligne-liste" href="#/reglages"><div><b>Réglages</b><small>Entreprise, IBAN, numérotation, conditions</small></div><span class="gris">›</span></a>
      <button class="ligne-liste" id="sauve" style="border:0;text-align:left;width:100%;cursor:pointer"><div><b>Sauvegarde</b><small>Télécharger toutes les données (fichier)</small></div><span class="gris">›</span></button>
      <a class="ligne-liste" href="../" target="_blank"><div><b>Voir le site</b><small>karenovation.fr</small></div><span class="gris">›</span></a>
      ${db.MODE_ESSAI ? "" : `<button class="ligne-liste" id="deco" style="border:0;text-align:left;width:100%;cursor:pointer"><div><b>Se déconnecter</b></div><span class="gris">›</span></button>`}
    </div>`;
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
  ["Numérotation", [["prochain_devis", "Prochain n° de devis", "number"], ["prochain_facture", "Prochain n° de facture", "number"]]]
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
    ["acompte_pct", "validite_jours", "echeance_jours", "prochain_devis", "prochain_facture"].forEach(k => { o[k] = Number(o[k]) || 0; });
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
  nav.querySelectorAll("a").forEach(x => x.classList.toggle("actif", x.dataset.r === r || (r === "document" && x.dataset.r === "documents") || (r === "client" && x.dataset.r === "clients") || (["3d", "reglages"].includes(r) && x.dataset.r === "plus")));
  window.scrollTo(0, 0);
  try {
    if (r === "accueil") await vueAccueil();
    else if (r === "documents") await vueDocuments(a === "facture" ? "facture" : "devis");
    else if (r === "document") await vueDocument(a, b || "devis", params);
    else if (r === "clients") await vueClients();
    else if (r === "client") await vueClient(a);
    else if (r === "prestations") await vuePrestations();
    else if (r === "plus") vuePlus();
    else if (r === "reglages") vueReglages();
    else if (r === "3d") await vue3D(params);
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
}
demarrer().catch(erreur);
