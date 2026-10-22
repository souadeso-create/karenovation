// Visite guidée, par client : la pièce et ses mesures, ce qu'il y a aujourd'hui, l'état de ce qu'on trouve,
// les autres mesures, puis ce que veut le client. Une visite = une entrée datée, rangée dans la table du carnet
// (type « mesures »), retirable avec « Annuler » pendant 8 secondes.

const CHAMPS = [["l", "Longueur de la pièce (m)"], ["p", "Largeur de la pièce (m)"]];
const PIECES = ["Salle de bain", "Salle d'eau", "WC", "Cuisine", "Chambre", "Séjour", "Entrée", "Couloir", "Buanderie", "Combles"];
// ce qu'il y a dans la pièce aujourd'hui (souvent à déposer)
const EXISTANT = ["Baignoire", "Cabine de douche", "Receveur", "Douche maçonnée", "WC posé", "WC suspendu", "Lavabo", "Meuble vasque", "Bidet",
  "Radiateur", "Sèche-serviettes", "Faïence murale", "Carrelage au sol", "Sol PVC", "Lambris", "Faux plafond", "Miroir / armoire"];
// ce qu'on regarde à la visite, et ce qu'on peut y trouver
const ETAT = [
  ["sol", "Sol", ["Bon état", "Carrelage fissuré", "Pas de niveau", "Humide", "Plancher bois"]],
  ["murs", "Murs", ["Sains", "Humides / moisissures", "Carrelage décollé", "Placo abîmé", "Mur porteur"]],
  ["plomberie", "Plomberie", ["Cuivre", "PER / multicouche", "Plomb, à remplacer", "Fuite visible", "Vannes d'arrêt absentes"]],
  ["evacuations", "Évacuations", ["Bonne pente", "Pente faible", "Diamètre trop petit", "Lentes / bouchées"]],
  ["electricite", "Électricité", ["Aux normes", "À reprendre", "Pas de terre", "Tableau à changer"]],
  ["ventilation", "Ventilation", ["VMC", "Fenêtre seulement", "Aucune"]],
  ["eau_chaude", "Eau chaude", ["Chaudière", "Ballon électrique", "Chauffe-eau instantané"]],
  ["acces", "Accès au chantier", ["Rez-de-chaussée", "Étage avec ascenseur", "Étage sans ascenseur", "Stationnement difficile"]]
];
// ce qu'on mesure le plus souvent, en plus de la pièce
const RACCOURCIS = ["Douche", "Baignoire", "Receveur", "Mur de douche", "Meuble vasque", "WC", "Niche", "Porte", "Fenêtre",
  "Radiateur / sèche-serviettes", "Évacuation", "Arrivée d'eau", "Tableau électrique", "Hauteur sous rampant", "Velux", "Couloir / accès"];
const ETAPES = ["La pièce", "Ce qu'il y a", "Ce que vous trouvez", "Les autres mesures", "Le projet du client"];

const lire = l => { try { const m = JSON.parse(l.texte || "{}"); return m && typeof m === "object" ? m : {}; } catch { return { notes: l.texte }; } };
const nb = v => Number(String(v ?? "").replace(",", ".")) || 0;
const n2 = n => (Number(n) || 0).toLocaleString("fr-FR", { maximumFractionDigits: 2 });
// pièce qui n'est pas un rectangle : les murs un par un, et le sol en plusieurs parties (ou sa surface si on la connaît)
function sol(m) {
  if (m.forme !== "autre") return nb(m.l) * nb(m.p);
  if (nb(m.sol)) return nb(m.sol);
  return (m.parties || []).reduce((a, [x, y]) => a + nb(x) * nb(y), 0);
}
const perimetre = m => m.forme === "autre" ? (m.murs || []).reduce((a, x) => a + nb(x), 0) : 2 * (nb(m.l) + nb(m.p));

export async function monterMesures(el, { db, client, toast, esc, erreur, compteur }) {
  let lignes = [], ouvert = false, etape = 0;
  const caches = new Set();
  const jour = iso => new Date(iso).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  try { lignes = (await db.listerCarnet(client.id)).filter(l => l.type === "mesures"); }
  catch { el.innerHTML = '<p class="gris">Les mesures ne sont pas encore activées.</p>'; return; }

  const carte = l => {
    const m = lire(l), L = nb(m.l), P = nb(m.p), H = nb(m.h), S = sol(m), T = perimetre(m);
    const piece = m.forme === "autre"
      ? [(m.murs || []).length ? `<b>${(m.murs || []).length} murs</b> : ${(m.murs || []).map(n2).join(" + ")} m` : "", S ? `${n2(S)} m² au sol` : "", T && H ? `${n2(T * H)} m² de murs` : ""].filter(Boolean).join(" · ")
      : L && P ? `<b>${n2(L)} × ${n2(P)} m</b> · ${n2(S)} m² au sol${H ? ` · ${n2(T * H)} m² de murs` : ""}` : "";
    const autres = [H ? `hauteur ${n2(H)} m` : "", m.porte ? `porte ${n2(m.porte)} m` : "", m.fenetre ? `fenêtre ${esc(m.fenetre)} m` : ""].filter(Boolean).join(" · ");
    const ligne = (titre, txt) => `<div><span>${esc(titre)}</span><b>${esc(txt)}</b></div>`;
    const existant = Array.isArray(m.existant) && m.existant.length ? `<p class="titre-mesures">Aujourd'hui dans la pièce</p><p>${esc(m.existant.join(", "))}</p>` : "";
    const etat = m.etat && Object.keys(m.etat).length ? `<p class="titre-mesures">Ce qui a été trouvé</p><div class="liste-mesures">${ETAT.filter(([k]) => m.etat[k]?.length).map(([k, n]) => ligne(n, m.etat[k].join(", "))).join("")}</div>` : "";
    const liste = Array.isArray(m.autres) && m.autres.length ? `<p class="titre-mesures">Mesures</p><div class="liste-mesures">${m.autres.map(([n, v]) => ligne(n, v)).join("")}</div>` : "";
    const texte = (titre, t) => t ? `<p class="titre-mesures">${titre}</p><p>${esc(t).replace(/\n/g, "<br>")}</p>` : "";
    return `<div class="note-carnet mesures">${m.piece ? `<b class="piece-mesures">${esc(m.piece)}</b>` : ""}<small>Visite du ${esc(jour(l.created_at))}</small>${piece ? `<p>${piece}</p>` : ""}${autres ? `<p>${autres}</p>` : ""}${existant}${etat}${liste}${texte("Ce que veut le client", m.souhaits)}${texte("Remarques", m.notes)}<button type="button" class="icone" data-retirer="${l.id}" aria-label="Retirer">✕</button></div>`;
  };

  const puces = (groupe, choix) => `<div class="palette puces-visite" data-groupe="${groupe}">${choix.map(n => `<button type="button" class="btn discret petit-btn" data-choix="${esc(n)}">${esc(n)}</button>`).join("")}</div>`;
  const nombre = (id, label) => `<div class="champ"><label for="${id}">${label}</label><input type="number" id="${id}" step="0.01" min="0" inputmode="decimal"></div>`;

  const formulaire = () => `<div class="carte visite" style="margin-bottom:12px">
    <div class="etapes-visite">${ETAPES.map((n, i) => `<span class="${i === etape ? "actif" : i < etape ? "fait" : ""}">${i + 1}</span>`).join("")}</div>
    <h3 id="vTitre" style="margin:8px 0 12px">${ETAPES[etape]}</h3>

    <div class="etape-visite" data-n="0">
      <div class="champ"><label for="mM_piece">Pièce</label><input type="text" id="mM_piece" placeholder="Salle de bain, WC, cuisine…"></div>
      <div class="palette" style="margin:-4px 0 12px">${PIECES.map(n => `<button type="button" class="btn discret petit-btn" data-piece="${esc(n)}">${esc(n)}</button>`).join("")}</div>
      <label style="display:block">Forme de la pièce</label>
      <div class="palette" style="margin:6px 0 10px"><button type="button" class="btn petit-btn" data-forme="rect">Rectangle</button><button type="button" class="btn discret petit-btn" data-forme="autre">Autre forme (en L, biais…)</button></div>
      <div id="mRect"><div class="deux">${CHAMPS.map(([k, n]) => nombre(`mM_${k}`, n)).join("")}</div></div>
      <div id="mAutre" hidden>
        <label style="display:block">Les murs, un par un, en faisant le tour (m)</label>
        <div id="mMurs" class="murs-mesures">${[1, 2, 3, 4, 5, 6].map(i => `<input type="number" step="0.01" min="0" inputmode="decimal" placeholder="Mur ${i}">`).join("")}</div>
        <button type="button" class="btn clair petit-btn" id="mPlusMur" style="margin:6px 0 12px">+ Mur</button>
        <label style="display:block">Le sol, en parties rectangulaires (longueur × largeur, m)</label>
        <div id="mParties">${[1, 2].map(i => `<div class="partie-mesure"><input type="number" step="0.01" min="0" inputmode="decimal" placeholder="Partie ${i} : longueur"><span>×</span><input type="number" step="0.01" min="0" inputmode="decimal" placeholder="largeur"></div>`).join("")}</div>
        <button type="button" class="btn clair petit-btn" id="mPlusPartie" style="margin:6px 0 10px">+ Partie</button>
        ${nombre("mM_sol", "Ou la surface au sol, si vous la connaissez (m²)")}
      </div>
      ${nombre("mM_h", "Hauteur sous plafond (m)")}
    </div>

    <div class="etape-visite" data-n="1" hidden>
      <p class="gris" style="font-size:13px;margin-bottom:8px">Touchez tout ce qui est dans la pièce aujourd'hui.</p>
      ${puces("existant", EXISTANT)}
      <div class="champ" style="margin-top:10px"><label for="mM_existant">Autre chose ?</label><input type="text" id="mM_existant" placeholder="Colonne de douche, placard…"></div>
    </div>

    <div class="etape-visite" data-n="2" hidden>
      <p class="gris" style="font-size:13px;margin-bottom:8px">Pour chaque point, touchez ce que vous constatez. Plusieurs choix possibles.</p>
      ${ETAT.map(([k, n, choix]) => `<label style="display:block;margin-top:10px">${n}</label>${puces("etat_" + k, choix)}`).join("")}
      <p class="gris" style="font-size:13px;margin-top:12px">Pensez aux photos d'avant travaux, dans le carnet de chantier.</p>
    </div>

    <div class="etape-visite" data-n="3" hidden>
      <p class="gris" style="font-size:13px;margin-bottom:8px">Touchez ce que vous mesurez, puis notez la valeur.</p>
      <div class="palette" style="margin:0 0 8px">${RACCOURCIS.map(n => `<button type="button" class="btn discret petit-btn" data-mesure="${esc(n)}">${esc(n)}</button>`).join("")}</div>
      <div id="mM_lignes"></div>
      <button type="button" class="btn clair petit-btn" data-mesure="">+ Autre mesure</button>
    </div>

    <div class="etape-visite" data-n="4" hidden>
      <div class="champ"><label for="mM_souhaits">Ce que veut le client</label><textarea id="mM_souhaits" rows="4" placeholder="Douche à l'italienne à la place de la baignoire, meuble double vasque, WC suspendu…"></textarea></div>
      <div class="champ"><label for="mM_notes">Vos remarques</label><textarea id="mM_notes" rows="3" placeholder="Évacuation à 40 cm du mur, arrivée d'eau à droite…"></textarea></div>
    </div>

    <div class="actions-doc" style="margin:14px 0 0">
      <button type="button" class="btn discret petit-btn" id="vPrec">${etape ? "Précédent" : "Annuler"}</button>
      <button type="button" class="btn petit-btn" id="vSuiv" ${etape < ETAPES.length - 1 ? "" : "hidden"}>Suivant</button>
      <button type="button" class="btn ${etape < ETAPES.length - 1 ? "clair" : ""} petit-btn" id="mOk">Enregistrer la visite</button>
    </div>
  </div>`;

  const dessiner = () => {
    const vivantes = lignes.filter(l => !caches.has(l.id));
    if (compteur) compteur.textContent = vivantes.length || "";
    el.innerHTML = `
      ${ouvert ? formulaire() : `<div class="actions-doc" style="margin:0 0 10px"><button type="button" class="btn petit-btn" id="mNouv">${vivantes.length ? "+ Nouvelle visite" : "Commencer la première visite"}</button></div>`}
      ${vivantes.map(carte).join("") || (ouvert ? "" : '<p class="gris">Aucune visite notée. La visite guidée vous fait passer en revue la pièce, ce qu\'il y a, ce que vous trouvez, les mesures et le projet du client.</p>')}`;
    lier();
  };

  // on change d'étape sans redessiner : rien de ce qui est déjà saisi ne se perd
  const allerA = n => {
    etape = Math.max(0, Math.min(ETAPES.length - 1, n));
    el.querySelectorAll(".etape-visite").forEach(d => { d.hidden = Number(d.dataset.n) !== etape; });
    el.querySelectorAll(".etapes-visite span").forEach((s, i) => { s.className = i === etape ? "actif" : i < etape ? "fait" : ""; });
    el.querySelector("#vTitre").textContent = ETAPES[etape];
    el.querySelector("#vPrec").textContent = etape ? "Précédent" : "Annuler";
    el.querySelector("#vSuiv").hidden = etape === ETAPES.length - 1;
    el.querySelector("#mOk").classList.toggle("clair", etape < ETAPES.length - 1);
    el.querySelector(".visite").scrollIntoView({ block: "start", behavior: "smooth" });
  };

  const retirer = id => {
    const l = lignes.find(x => x.id === id); if (!l) return;
    caches.add(id); dessiner();
    const t = document.createElement("div"); t.className = "toast";
    t.innerHTML = `Visite retirée <button type="button" style="margin-left:10px;background:none;border:0;color:#fff;text-decoration:underline;font:inherit;cursor:pointer">Annuler</button>`;
    document.body.appendChild(t);
    const minuteur = setTimeout(async () => {
      t.remove();
      try { await db.supprimerCarnet(l); lignes = lignes.filter(x => x.id !== id); } catch (e) { caches.delete(id); dessiner(); erreur(e); }
    }, 8000);
    t.querySelector("button").onclick = () => { clearTimeout(minuteur); t.remove(); caches.delete(id); dessiner(); };
  };

  function lier() {
    el.querySelectorAll("[data-retirer]").forEach(b => b.onclick = () => retirer(b.dataset.retirer));
    const nv = el.querySelector("#mNouv"); if (nv) nv.onclick = () => { ouvert = true; etape = 0; dessiner(); el.querySelector("#mM_piece")?.focus(); };
    if (!ouvert) return;
    el.querySelector("#vPrec").onclick = () => { if (etape) allerA(etape - 1); else { ouvert = false; dessiner(); } };
    el.querySelector("#vSuiv").onclick = () => allerA(etape + 1);
    el.querySelectorAll("[data-piece]").forEach(b => b.onclick = () => { el.querySelector("#mM_piece").value = b.dataset.piece; });
    el.querySelectorAll("[data-choix]").forEach(b => b.onclick = () => b.classList.toggle("discret"));
    el.querySelectorAll("[data-forme]").forEach(b => b.onclick = () => {
      el.querySelectorAll("[data-forme]").forEach(x => x.classList.toggle("discret", x !== b));
      el.querySelector("#mRect").hidden = b.dataset.forme !== "rect"; el.querySelector("#mAutre").hidden = b.dataset.forme === "rect";
    });
    el.querySelector("#mPlusMur").onclick = () => { const z = el.querySelector("#mMurs"), i = document.createElement("input"); Object.assign(i, { type: "number", step: "0.01", min: "0", inputMode: "decimal", placeholder: `Mur ${z.children.length + 1}` }); z.appendChild(i); i.focus(); };
    el.querySelector("#mPlusPartie").onclick = () => { const z = el.querySelector("#mParties"), d = document.createElement("div"); d.className = "partie-mesure";
      d.innerHTML = `<input type="number" step="0.01" min="0" inputmode="decimal" placeholder="Partie ${z.children.length + 1} : longueur"><span>×</span><input type="number" step="0.01" min="0" inputmode="decimal" placeholder="largeur">`; z.appendChild(d); d.querySelector("input").focus(); };
    el.querySelectorAll("[data-mesure]").forEach(b => b.onclick = () => {
      const zone = el.querySelector("#mM_lignes");
      const d = document.createElement("div"); d.className = "ligne-mesure";
      d.innerHTML = `<input type="text" class="m-nom" placeholder="Quoi ? (ex. douche)" value="${esc(b.dataset.mesure)}"><input type="text" class="m-val" placeholder="120 × 90 cm"><button type="button" class="icone" aria-label="Retirer">✕</button>`;
      d.querySelector("button").onclick = () => d.remove();
      zone.appendChild(d); (b.dataset.mesure ? d.querySelector(".m-val") : d.querySelector(".m-nom")).focus();
    });
    el.querySelector("#mOk").onclick = async () => {
      const m = {}, val = id => el.querySelector(id).value.trim();
      if (val("#mM_piece")) m.piece = val("#mM_piece");
      if (!el.querySelector("#mAutre").hidden) {
        m.forme = "autre";
        const murs = [...el.querySelectorAll("#mMurs input")].map(i => nb(i.value)).filter(Boolean); if (murs.length) m.murs = murs;
        const parties = [...el.querySelectorAll("#mParties .partie-mesure")].map(d => [...d.querySelectorAll("input")].map(i => nb(i.value))).filter(([x, y]) => x && y); if (parties.length) m.parties = parties;
        if (nb(val("#mM_sol"))) m.sol = nb(val("#mM_sol"));
      } else CHAMPS.forEach(([k]) => { const v = nb(val(`#mM_${k}`)); if (v) m[k] = v; });
      if (nb(val("#mM_h"))) m.h = nb(val("#mM_h"));
      const choisis = g => [...el.querySelectorAll(`[data-groupe="${g}"] [data-choix]:not(.discret)`)].map(b => b.dataset.choix);
      const existant = choisis("existant"); if (val("#mM_existant")) existant.push(val("#mM_existant"));
      if (existant.length) m.existant = existant;
      const etat = {}; ETAT.forEach(([k]) => { const c = choisis("etat_" + k); if (c.length) etat[k] = c; });
      if (Object.keys(etat).length) m.etat = etat;
      const autres = [...el.querySelectorAll("#mM_lignes .ligne-mesure")].map(d => [d.querySelector(".m-nom").value.trim(), d.querySelector(".m-val").value.trim()]).filter(([, v]) => v);
      if (autres.length) m.autres = autres.map(([n, v]) => [n || "Mesure", v]);
      if (val("#mM_souhaits")) m.souhaits = val("#mM_souhaits");
      if (val("#mM_notes")) m.notes = val("#mM_notes");
      if (!Object.keys(m).filter(k => k !== "piece" && k !== "forme").length) return toast("Notez au moins une chose sur la visite.");
      try {
        const n = await db.ajouterCarnet({ client_id: client.id, etape: "avant", type: "mesures", texte: JSON.stringify(m) });
        lignes.unshift(n); ouvert = false; etape = 0; toast("Visite enregistrée ✓"); dessiner();
      } catch (e) { erreur(e); }
    };
  }
  dessiner();
}
