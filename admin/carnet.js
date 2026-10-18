// Carnet de chantier : photos, notes, choses à faire, imprévus et dépenses, datés et rangés par étape
// (avant, pendant, après les travaux) ; image « avant / après » pour les réseaux.

const ETAPES = { avant: "Avant", pendant: "Pendant", apres: "Après" };
const TYPES = {
  note: { nom: "Note", bouton: "+ Note", aide: "Arrivée d'eau déplacée de 20 cm vers la gauche" },
  tache: { nom: "À faire", bouton: "+ À faire", aide: "Commander le receveur 120 × 90" },
  imprevu: { nom: "Imprévu", bouton: "+ Imprévu", aide: "Tuyau en plomb derrière le carrelage, à remplacer" },
  depense: { nom: "Dépense", bouton: "+ Dépense", aide: "Colle et joints chez le fournisseur" }
};
const CATEGORIES = { fournitures: "Fournitures et consommables", carburant: "Carburant", peage: "Péage et parking", location: "Location de matériel",
  decharge: "Déchetterie", outillage: "Outillage", soustraitance: "Sous-traitance", repas: "Repas", autre: "Autre" };
const eur = n => (Number(n) || 0).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const estPhoto = l => (l.chemin || l.image) && l.type !== "depense";

// photo du téléphone → JPEG de 1600 px au plus
async function reduire(fichier) {
  const img = await createImageBitmap(fichier, { imageOrientation: "from-image" });
  const k = Math.min(1, 1600 / Math.max(img.width, img.height));
  const c = document.createElement("canvas"); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
  c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
  return new Promise(ok => c.toBlob(ok, "image/jpeg", .8));
}
const chargerImage = src => new Promise((ok, ko) => { const i = new Image(); i.crossOrigin = "anonymous"; i.onload = () => ok(i); i.onerror = ko; i.src = src; });

// image verticale 1080 × 1920 : la photo d'avant en haut, celle d'après en bas, le logo au milieu
async function montageAvantApres(srcAvant, srcApres) {
  const [a, b, logo] = await Promise.all([chargerImage(srcAvant), chargerImage(srcApres), chargerImage("../medias/logo.png").catch(() => null)]);
  const W = 1080, H = 1920, c = document.createElement("canvas"); c.width = W; c.height = H;
  const g = c.getContext("2d"); g.fillStyle = "#f7f4ef"; g.fillRect(0, 0, W, H);
  const couvrir = (img, y, h) => { const k = Math.max(W / img.width, h / img.height), w2 = img.width * k, h2 = img.height * k;
    g.save(); g.beginPath(); g.rect(0, y, W, h); g.clip(); g.drawImage(img, (W - w2) / 2, y + (h - h2) / 2, w2, h2); g.restore(); };
  couvrir(a, 0, H / 2 - 6); couvrir(b, H / 2 + 6, H / 2 - 6);
  const etiquette = (txt, y) => { g.font = "600 46px Inter, Arial, sans-serif"; const w = g.measureText(txt).width + 64;
    g.fillStyle = "rgba(27,26,24,.82)"; g.beginPath(); g.roundRect(40, y, w, 84, 42); g.fill(); g.fillStyle = "#fff"; g.fillText(txt, 72, y + 58); };
  etiquette("AVANT", 40); etiquette("APRÈS", H / 2 + 46);
  if (logo) { const lw = 220, lh = lw * logo.height / logo.width; g.fillStyle = "#fff"; g.beginPath(); g.roundRect(W - lw - 70, H / 2 - lh / 2 - 24, lw + 40, lh + 48, 24); g.fill(); g.drawImage(logo, W - lw - 50, H / 2 - lh / 2, lw, lh); }
  return new Promise(ok => c.toBlob(ok, "image/jpeg", .9));
}

async function partagerFichier(blob, nom) {
  const f = new File([blob], nom, { type: blob.type || "image/jpeg" });
  if (navigator.canShare && navigator.canShare({ files: [f] })) { try { await navigator.share({ files: [f] }); return; } catch (er) { if (er.name === "AbortError") return; } }
  const a = document.createElement("a"); a.href = URL.createObjectURL(f); a.download = f.name; a.click();
}

export async function monterCarnet(el, { db, client, toast, esc, erreur }) {
  let devisSignes = 0;
  try { devisSignes = (await db.lister("documents")).filter(d => d.client_id === client.id && d.type === "devis" && d.statut === "signe").reduce((a, d) => a + (Number(d.total_ht) || 0), 0); } catch { /* pas grave */ }
  let etape = "pendant", filtre = "tout", saisie = null, lignes = [], urls = {}, enCours = 0, choixMontage = null;
  const caches = new Set(); // entrées retirées, en attente de suppression (on peut annuler)

  const charger = async () => {
    try { lignes = await db.listerCarnet(client.id); urls = await db.urlsCarnet(lignes); }
    catch (e) { el.innerHTML = '<p class="gris">Le carnet n\'est pas encore activé.</p>'; return false; }
    lignes.forEach(l => { if (!l.type || (l.type === "note" && (l.chemin || l.image))) l.type = estPhoto(l) ? "photo" : "note"; });
    return true;
  };
  const jour = iso => new Date(iso).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const heure = iso => new Date(iso).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  const vivantes = () => lignes.filter(l => !caches.has(l.id));
  const garde = l => filtre === "tout" ? true : ETAPES[filtre] ? l.etape === filtre : filtre === "tache" ? l.type === "tache" && !l.fait : l.type === filtre;

  const carteEntree = l => {
    const tete = `<small>${esc(TYPES[l.type]?.nom || "Note")} · ${esc(ETAPES[l.etape])} · ${heure(l.created_at)}</small>`;
    const croix = `<button type="button" class="icone" data-retirer="${l.id}" aria-label="Retirer">✕</button>`;
    if (l.type === "tache") return `<div class="note-carnet tache ${l.fait ? "faite" : ""}"><label><input type="checkbox" data-fait="${l.id}" ${l.fait ? "checked" : ""}><span>${esc(l.texte)}</span></label>${croix}</div>`;
    if (l.type === "depense") return `<div class="note-carnet depense">${tete}<p><b>${eur(l.montant)} €</b> · ${esc(CATEGORIES[l.categorie] || "Dépense")}${l.texte ? " · " + esc(l.texte) : ""}</p>${urls[l.id] ? `<button type="button" class="lien-ticket" data-voir="${l.id}">Voir le ticket</button>` : ""}${croix}</div>`;
    return `<div class="note-carnet ${l.type === "imprevu" ? "imprevu" : ""}">${tete}<p>${esc(l.texte).replace(/\n/g, "<br>")}</p>${croix}</div>`;
  };

  const dessiner = () => {
    const tout = vivantes(), visibles = tout.filter(garde);
    const jours = [];
    visibles.forEach(l => { const j = jour(l.created_at); let g = jours.find(x => x.j === j); if (!g) jours.push(g = { j, l: [] }); g.l.push(l); });
    const resteAFaire = tout.filter(l => l.type === "tache" && !l.fait).length, imprevus = tout.filter(l => l.type === "imprevu").length;
    const depenses = tout.filter(l => l.type === "depense").reduce((a, l) => a + (Number(l.montant) || 0), 0);
    const avants = tout.filter(l => l.type === "photo" && l.etape === "avant"), apres = tout.filter(l => l.type === "photo" && l.etape === "apres");
    const puce = (k, n) => `<button type="button" class="btn ${k === filtre ? "clair" : "discret"} petit-btn" data-filtre="${k}">${n}</button>`;
    const T = saisie && TYPES[saisie];
    el.innerHTML = `
      <div class="carte" style="margin-bottom:12px">
        <label>Ajouter au carnet · étape</label>
        <div class="palette" style="margin:6px 0 12px">${Object.entries(ETAPES).map(([k, n]) => `<button type="button" class="btn ${k === etape ? "" : "discret"} petit-btn" data-etape="${k}">${n}</button>`).join("")}</div>
        <div class="actions-doc" style="margin:0">
          <label class="btn petit-btn" style="display:inline-flex">+ Photos<input type="file" id="cPhotos" accept="image/*" multiple hidden></label>
          ${Object.entries(TYPES).map(([k, t]) => `<button type="button" class="btn ${saisie === k ? "" : "clair"} petit-btn" data-saisie="${k}">${t.bouton}</button>`).join("")}
        </div>
        ${T ? `<div style="margin-top:10px">
          ${saisie === "depense" ? `<div class="champ"><label for="cCategorie">Catégorie</label><select id="cCategorie">${Object.entries(CATEGORIES).map(([k, n]) => `<option value="${k}">${n}</option>`).join("")}</select></div>
            <div class="deux"><div class="champ"><label for="cMontant">Montant €</label><input type="number" id="cMontant" step="0.01" min="0" inputmode="decimal"></div>
            <div class="champ"><label>Ticket (facultatif)</label><label class="btn discret petit-btn" style="display:inline-flex">${"Photo du ticket"}<input type="file" id="cTicket" accept="image/*" hidden></label></div></div>` : ""}
          <textarea id="cTexte" rows="${saisie === "tache" ? 1 : 3}" placeholder="${esc(saisie === "depense" ? "Détail (facultatif) : plein du camion, sacs de colle…" : T.aide)}"></textarea>
          <div class="actions-doc" style="margin:8px 0 0"><button type="button" class="btn petit-btn" id="cOk">Ajouter</button><button type="button" class="btn discret petit-btn" data-saisie="">Annuler</button></div>
        </div>` : ""}
        ${enCours ? `<p class="gris" style="font-size:13px;margin-top:8px">Envoi de ${enCours} photo${enCours > 1 ? "s" : ""}…</p>` : ""}
      </div>
      <div class="resume-carnet">
        <button type="button" data-filtre="tache"><b>${resteAFaire}</b>à faire</button>
        <button type="button" data-filtre="imprevu"><b>${imprevus}</b>imprévu${imprevus > 1 ? "s" : ""}</button>
        <button type="button" data-filtre="depense"><b>${eur(depenses)} €</b>dépenses</button>
      </div>
      ${filtre === "depense" ? bilan(tout) : ""}
      ${avants.length && apres.length ? `<button type="button" class="btn clair petit-btn" id="cMontage" style="margin-bottom:10px">Créer une image avant / après</button>` : ""}
      ${choixMontage ? `<div class="carte" style="margin-bottom:12px"><b>${choixMontage.avant ? "Touchez la photo d'après" : "Touchez la photo d'avant"}</b>
        <p class="gris" style="font-size:13px">L'image se fait au format vertical, pour TikTok, Instagram ou Facebook.</p>
        <div class="photos-pv" style="margin-top:8px">${(choixMontage.avant ? apres : avants).map(l => `<button type="button" class="vignette" data-montage="${l.id}"><img src="${esc(urls[l.id] || "")}" alt=""></button>`).join("")}</div>
        <div class="actions-doc" style="margin:8px 0 0"><button type="button" class="btn discret petit-btn" id="cMontageNon">Annuler</button></div></div>` : ""}
      <div class="palette" style="margin-bottom:10px">${puce("tout", "Tout")}${Object.entries(ETAPES).map(([k, n]) => puce(k, n)).join("")}</div>
      ${jours.length ? jours.map(g => `
        <div class="jour-carnet"><div class="petit" style="margin:14px 0 8px">${esc(g.j)}</div>
          ${g.l.some(l => l.type === "photo") ? `<div class="photos-pv">${g.l.filter(l => l.type === "photo").map(l => `<button type="button" class="vignette" data-voir="${l.id}"><img src="${esc(urls[l.id] || "")}" alt="${esc(l.texte || "Photo " + ETAPES[l.etape])}" loading="lazy"><span>${esc(ETAPES[l.etape])} · ${heure(l.created_at)}</span>${l.texte ? `<em>${esc(l.texte)}</em>` : ""}</button>`).join("")}</div>` : ""}
          ${g.l.filter(l => l.type !== "photo").map(carteEntree).join("")}
        </div>`).join("") : `<p class="gris">${filtre === "tout" ? "Rien dans le carnet pour l'instant : ajoutez les photos d'avant travaux dès la première visite." : "Rien ici."}</p>`}`;
    lier();
  };

  // ce que coûte le chantier à l'artisan, par catégorie, et ce qu'il reste sur les devis signés
  const bilan = tout => {
    const deps = tout.filter(l => l.type === "depense"), parCat = {};
    deps.forEach(l => { const k = l.categorie || "autre"; parCat[k] = (parCat[k] || 0) + (Number(l.montant) || 0); });
    const total = Object.values(parCat).reduce((a, b) => a + b, 0);
    return `<div class="carte" style="margin-bottom:12px"><b>Ce que coûte le chantier</b>
      ${Object.entries(parCat).sort((a, b) => b[1] - a[1]).map(([k, v]) => `<div class="ligne-bilan"><span>${esc(CATEGORIES[k] || k)}</span><span>${eur(v)} €</span></div>`).join("") || '<p class="gris" style="font-size:13px">Aucune dépense notée.</p>'}
      <div class="ligne-bilan total"><span>Total des dépenses</span><span>${eur(total)} €</span></div>
      ${devisSignes ? `<div class="ligne-bilan"><span>Devis signés</span><span>${eur(devisSignes)} €</span></div>
      <div class="ligne-bilan total"><span>Reste après dépenses</span><span>${eur(devisSignes - total)} €</span></div>
      <p class="gris" style="font-size:12px;margin-top:6px">Avant votre temps de travail et vos charges.</p>` : ""}</div>`;
  };

  // retrait annulable : l'entrée disparaît, et n'est vraiment supprimée qu'après 8 secondes
  const retirer = id => {
    const l = lignes.find(x => x.id === id); if (!l) return;
    caches.add(id); dessiner();
    const t = document.createElement("div"); t.className = "toast";
    t.innerHTML = `${esc(l.type === "photo" ? "Photo" : TYPES[l.type]?.nom || "Note")} retiré${l.type === "photo" || l.type === "note" ? "e" : ""} <button type="button" style="margin-left:10px;background:none;border:0;color:#fff;text-decoration:underline;font:inherit;cursor:pointer">Annuler</button>`;
    document.body.appendChild(t);
    const minuteur = setTimeout(async () => {
      t.remove();
      try { await db.supprimerCarnet(l); lignes = lignes.filter(x => x.id !== id); } catch (e) { caches.delete(id); dessiner(); erreur(e); }
    }, 8000);
    t.querySelector("button").onclick = () => { clearTimeout(minuteur); t.remove(); caches.delete(id); dessiner(); };
  };
  const majLigne = async l => { const { image, ...sansImage } = l; await db.enregistrer("carnet", sansImage); };

  const voir = id => {
    const l = lignes.find(x => x.id === id); if (!l) return;
    const v = document.createElement("div"); v.className = "voile visionneuse";
    v.innerHTML = `<div class="fenetre" style="max-width:900px"><div class="tete"><h2>${esc(l.type === "depense" ? "Ticket" : ETAPES[l.etape])} · ${esc(jour(l.created_at))}</h2><button class="icone" data-fermer aria-label="Fermer">✕</button></div>
      <img src="${esc(urls[l.id] || "")}" alt="" style="width:100%;border-radius:12px;display:block">
      ${l.type === "photo" ? `<div class="champ" style="margin-top:12px"><label for="cLegende">Légende</label><input type="text" id="cLegende" value="${esc(l.texte || "")}" placeholder="Pose du receveur" maxlength="200"></div>` : ""}
      <div class="actions-doc"><button class="btn" data-partager>Partager</button>${l.type === "photo" ? '<button class="btn clair" data-legende>Enregistrer la légende</button>' : ""}<button class="btn danger" data-suppr>Retirer</button></div></div>`;
    document.body.appendChild(v);
    v.addEventListener("click", async e => {
      if (e.target === v || e.target.closest("[data-fermer]")) v.remove();
      else if (e.target.closest("[data-suppr]")) { v.remove(); retirer(id); }
      else if (e.target.closest("[data-legende]")) {
        l.texte = v.querySelector("#cLegende").value.trim() || null;
        try { await majLigne(l); toast("Légende enregistrée ✓"); v.remove(); dessiner(); } catch (er) { erreur(er); }
      } else if (e.target.closest("[data-partager]")) {
        try { await partagerFichier(await (await fetch(urls[l.id])).blob(), `chantier-${client.nom || "photo"}-${l.etape}.jpg`.toLowerCase().replace(/[^\w.-]/g, "-")); } catch (er) { erreur(er); }
      }
    });
  };

  let ticket = null;
  function lier() {
    el.querySelectorAll("[data-etape]").forEach(b => b.onclick = () => { etape = b.dataset.etape; dessiner(); });
    el.querySelectorAll("[data-filtre]").forEach(b => b.onclick = () => { filtre = filtre === b.dataset.filtre ? "tout" : b.dataset.filtre; dessiner(); });
    el.querySelectorAll("[data-voir]").forEach(b => b.onclick = () => voir(b.dataset.voir));
    el.querySelectorAll("[data-retirer]").forEach(b => b.onclick = () => retirer(b.dataset.retirer));
    el.querySelectorAll("[data-saisie]").forEach(b => b.onclick = () => { saisie = b.dataset.saisie || null; ticket = null; dessiner(); el.querySelector("#cTexte")?.focus(); });
    el.querySelectorAll("[data-fait]").forEach(c => c.onchange = async () => {
      const l = lignes.find(x => x.id === c.dataset.fait); l.fait = c.checked;
      try { await majLigne(l); dessiner(); } catch (e) { l.fait = !c.checked; erreur(e); }
    });
    const tk = el.querySelector("#cTicket");
    if (tk) tk.onchange = async () => { ticket = tk.files[0] ? await reduire(tk.files[0]) : null; if (ticket) toast("Ticket prêt ✓"); };
    const ok = el.querySelector("#cOk");
    if (ok) ok.onclick = async () => {
      const texte = el.querySelector("#cTexte").value.trim(), montant = Number(el.querySelector("#cMontant")?.value || 0);
      if (saisie === "depense" ? !montant : !texte) return toast(saisie === "depense" ? "Indiquez le montant." : "Écrivez quelque chose.");
      try {
        const n = await db.ajouterCarnet({ client_id: client.id, etape, type: saisie, texte: texte || null, ...(saisie === "depense" ? { montant, categorie: el.querySelector("#cCategorie").value } : {}) }, saisie === "depense" ? ticket : null);
        if (n.image || (ticket && n.chemin)) urls[n.id] = n.image || URL.createObjectURL(ticket);
        lignes.unshift(n); toast(`${TYPES[saisie].nom} ajouté${saisie === "note" || saisie === "depense" ? "e" : ""} ✓`); saisie = null; ticket = null; dessiner();
      } catch (e) { erreur(e); }
    };
    el.querySelector("#cPhotos").onchange = async e => {
      const fichiers = [...e.target.files]; if (!fichiers.length) return;
      enCours = fichiers.length; dessiner();
      for (const f of fichiers) {
        try {
          const blob = await reduire(f), n = await db.ajouterCarnet({ client_id: client.id, etape, type: "photo" }, blob);
          lignes.unshift(n); urls[n.id] = n.image || URL.createObjectURL(blob);
        } catch (er) { erreur(er); }
        enCours--; dessiner();
      }
      toast(`${fichiers.length} photo${fichiers.length > 1 ? "s" : ""} ajoutée${fichiers.length > 1 ? "s" : ""} ✓`);
    };
    // image avant / après : on touche une photo d'avant, puis une d'après
    const mo = el.querySelector("#cMontage");
    if (mo) mo.onclick = () => { choixMontage = {}; dessiner(); };
    const mn = el.querySelector("#cMontageNon");
    if (mn) mn.onclick = () => { choixMontage = null; dessiner(); };
    el.querySelectorAll("[data-montage]").forEach(b => b.onclick = async () => {
      if (!choixMontage.avant) { choixMontage.avant = b.dataset.montage; dessiner(); return; }
      const idAvant = choixMontage.avant; choixMontage = null; dessiner();
      try {
        toast("Création de l'image…");
        const blob = await montageAvantApres(urls[idAvant], urls[b.dataset.montage]);
        await partagerFichier(blob, `avant-apres-${(client.nom || "chantier").toLowerCase().replace(/[^\w-]/g, "-")}.jpg`);
      } catch (e) { erreur(e); }
    });
  }

  if (await charger()) dessiner();
}
