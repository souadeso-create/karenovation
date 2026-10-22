// Mesures relevées aux visites, par client : la pièce, puis tout le reste (douche, niche, évacuation…).
// Rangées dans la table du carnet (type « mesures »), datées, et retirables avec « Annuler » pendant 8 secondes.

const CHAMPS = [["l", "Longueur de la pièce (m)"], ["p", "Largeur de la pièce (m)"]];
// ce qu'on mesure le plus souvent à une visite, en plus de la pièce
const RACCOURCIS = ["Douche", "Baignoire", "Receveur", "Mur de douche", "Meuble vasque", "WC", "Niche", "Porte", "Fenêtre",
  "Radiateur / sèche-serviettes", "Évacuation", "Arrivée d'eau", "Tableau électrique", "Hauteur sous rampant", "Velux", "Couloir / accès"];
const PIECES = ["Salle de bain", "Salle d'eau", "WC", "Cuisine", "Chambre", "Séjour", "Entrée", "Couloir", "Buanderie", "Combles"];
const lire = l => { try { const m = JSON.parse(l.texte || "{}"); return m && typeof m === "object" ? m : {}; } catch { return { notes: l.texte }; } };
const nb = v => Number(String(v ?? "").replace(",", ".")) || 0;
// pièce qui n'est pas un rectangle : les murs un par un, et le sol en plusieurs parties (ou sa surface si on la connaît)
function sol(m) {
  if (m.forme !== "autre") return nb(m.l) * nb(m.p);
  if (nb(m.sol)) return nb(m.sol);
  return (m.parties || []).reduce((a, [x, y]) => a + nb(x) * nb(y), 0);
}
const perimetre = m => m.forme === "autre" ? (m.murs || []).reduce((a, x) => a + nb(x), 0) : 2 * (nb(m.l) + nb(m.p));
const n2 = n => (Number(n) || 0).toLocaleString("fr-FR", { maximumFractionDigits: 2 });

export async function monterMesures(el, { db, client, toast, esc, erreur, compteur }) {
  let lignes = [], ouvert = false;
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
    const liste = Array.isArray(m.autres) && m.autres.length ? `<div class="liste-mesures">${m.autres.map(([n, v]) => `<div><span>${esc(n)}</span><b>${esc(v)}</b></div>`).join("")}</div>` : "";
    return `<div class="note-carnet mesures">${m.piece ? `<b class="piece-mesures">${esc(m.piece)}</b>` : ""}<small>Visite du ${esc(jour(l.created_at))}</small>${piece ? `<p>${piece}</p>` : ""}${autres ? `<p>${autres}</p>` : ""}${liste}${m.notes ? `<p>${esc(m.notes).replace(/\n/g, "<br>")}</p>` : ""}<button type="button" class="icone" data-retirer="${l.id}" aria-label="Retirer">✕</button></div>`;
  };

  const dessiner = () => {
    const vivantes = lignes.filter(l => !caches.has(l.id));
    if (compteur) compteur.textContent = vivantes.length || "";
    el.innerHTML = `
      ${ouvert ? `<div class="carte" style="margin-bottom:12px">
        <div class="champ"><label for="mM_piece">Pièce</label><input type="text" id="mM_piece" placeholder="Salle de bain, WC, cuisine…"></div>
        <div class="palette" style="margin:-4px 0 10px">${PIECES.map(n => `<button type="button" class="btn discret petit-btn" data-piece="${esc(n)}">${esc(n)}</button>`).join("")}</div>
        <label style="display:block">Forme de la pièce</label>
        <div class="palette" style="margin:6px 0 10px"><button type="button" class="btn petit-btn" data-forme="rect">Rectangle</button><button type="button" class="btn discret petit-btn" data-forme="autre">Autre forme (en L, biais…)</button></div>
        <div id="mRect"><div class="deux">${CHAMPS.map(([k, n]) => `<div class="champ"><label for="mM_${k}">${n}</label><input type="number" id="mM_${k}" step="0.01" min="0" inputmode="decimal"></div>`).join("")}</div></div>
        <div id="mAutre" hidden>
          <label style="display:block">Les murs, un par un, en faisant le tour (m)</label>
          <div id="mMurs" class="murs-mesures">${[1, 2, 3, 4, 5, 6].map(i => `<input type="number" step="0.01" min="0" inputmode="decimal" placeholder="Mur ${i}">`).join("")}</div>
          <button type="button" class="btn clair petit-btn" id="mPlusMur" style="margin:6px 0 12px">+ Mur</button>
          <label style="display:block">Le sol, en parties rectangulaires (longueur × largeur, m)</label>
          <div id="mParties">${[1, 2].map(i => `<div class="partie-mesure"><input type="number" step="0.01" min="0" inputmode="decimal" placeholder="Partie ${i} : longueur"><span>×</span><input type="number" step="0.01" min="0" inputmode="decimal" placeholder="largeur"></div>`).join("")}</div>
          <button type="button" class="btn clair petit-btn" id="mPlusPartie" style="margin:6px 0 10px">+ Partie</button>
          <div class="champ"><label for="mM_sol">Ou la surface au sol, si vous la connaissez (m²)</label><input type="number" id="mM_sol" step="0.01" min="0" inputmode="decimal"></div>
        </div>
        <div class="champ"><label for="mM_h">Hauteur sous plafond (m)</label><input type="number" id="mM_h" step="0.01" min="0" inputmode="decimal"></div>
        <label style="display:block;margin-top:6px">Autres mesures</label>
        <div class="palette" style="margin:6px 0 8px">${RACCOURCIS.map(n => `<button type="button" class="btn discret petit-btn" data-mesure="${esc(n)}">${esc(n)}</button>`).join("")}</div>
        <div id="mM_lignes"></div>
        <button type="button" class="btn clair petit-btn" data-mesure="">+ Autre mesure</button>
        <textarea id="mM_notes" rows="3" style="margin-top:10px" placeholder="Remarques (facultatif) : évacuation à 40 cm du mur, arrivée d'eau à droite…"></textarea>
        <div class="actions-doc" style="margin:8px 0 0"><button type="button" class="btn petit-btn" id="mOk">Enregistrer les mesures</button><button type="button" class="btn discret petit-btn" id="mNon">Annuler</button></div>
      </div>` : `<div class="actions-doc" style="margin:0 0 10px"><button type="button" class="btn petit-btn" id="mNouv">+ Nouvelles mesures</button></div>`}
      ${vivantes.map(carte).join("") || (ouvert ? "" : '<p class="gris">Aucune mesure. Notez-les à la première visite.</p>')}`;
    lier();
  };

  const retirer = id => {
    const l = lignes.find(x => x.id === id); if (!l) return;
    caches.add(id); dessiner();
    const t = document.createElement("div"); t.className = "toast";
    t.innerHTML = `Mesures retirées <button type="button" style="margin-left:10px;background:none;border:0;color:#fff;text-decoration:underline;font:inherit;cursor:pointer">Annuler</button>`;
    document.body.appendChild(t);
    const minuteur = setTimeout(async () => {
      t.remove();
      try { await db.supprimerCarnet(l); lignes = lignes.filter(x => x.id !== id); } catch (e) { caches.delete(id); dessiner(); erreur(e); }
    }, 8000);
    t.querySelector("button").onclick = () => { clearTimeout(minuteur); t.remove(); caches.delete(id); dessiner(); };
  };

  function lier() {
    el.querySelectorAll("[data-retirer]").forEach(b => b.onclick = () => retirer(b.dataset.retirer));
    const nv = el.querySelector("#mNouv"); if (nv) nv.onclick = () => { ouvert = true; dessiner(); el.querySelector("#mM_piece")?.focus(); };
    el.querySelectorAll("[data-piece]").forEach(b => b.onclick = () => { el.querySelector("#mM_piece").value = b.dataset.piece; el.querySelector("#mM_l")?.focus(); });
    el.querySelectorAll("[data-forme]").forEach(b => b.onclick = () => {
      el.querySelectorAll("[data-forme]").forEach(x => x.classList.toggle("discret", x !== b));
      el.querySelector("#mRect").hidden = b.dataset.forme !== "rect"; el.querySelector("#mAutre").hidden = b.dataset.forme === "rect";
    });
    const pm = el.querySelector("#mPlusMur");
    if (pm) pm.onclick = () => { const z = el.querySelector("#mMurs"), i = document.createElement("input"); Object.assign(i, { type: "number", step: "0.01", min: "0", inputMode: "decimal", placeholder: `Mur ${z.children.length + 1}` }); z.appendChild(i); i.focus(); };
    const pp = el.querySelector("#mPlusPartie");
    if (pp) pp.onclick = () => { const z = el.querySelector("#mParties"), d = document.createElement("div"); d.className = "partie-mesure";
      d.innerHTML = `<input type="number" step="0.01" min="0" inputmode="decimal" placeholder="Partie ${z.children.length + 1} : longueur"><span>×</span><input type="number" step="0.01" min="0" inputmode="decimal" placeholder="largeur">`; z.appendChild(d); d.querySelector("input").focus(); };
    const non = el.querySelector("#mNon"); if (non) non.onclick = () => { ouvert = false; dessiner(); };
    // une ligne « quoi / combien » de plus, sans redessiner (rien de ce qui est tapé ne se perd)
    el.querySelectorAll("[data-mesure]").forEach(b => b.onclick = () => {
      const zone = el.querySelector("#mM_lignes"); if (!zone) return;
      const d = document.createElement("div"); d.className = "ligne-mesure";
      d.innerHTML = `<input type="text" class="m-nom" placeholder="Quoi ? (ex. douche)" value="${esc(b.dataset.mesure)}"><input type="text" class="m-val" placeholder="120 × 90 cm"><button type="button" class="icone" aria-label="Retirer">✕</button>`;
      d.querySelector("button").onclick = () => d.remove();
      zone.appendChild(d); (b.dataset.mesure ? d.querySelector(".m-val") : d.querySelector(".m-nom")).focus();
    });
    const ok = el.querySelector("#mOk");
    if (ok) ok.onclick = async () => {
      const m = {}, piece = el.querySelector("#mM_piece").value.trim();
      if (piece) m.piece = piece;
      if (!el.querySelector("#mAutre").hidden) {
        m.forme = "autre";
        const murs = [...el.querySelectorAll("#mMurs input")].map(i => nb(i.value)).filter(Boolean); if (murs.length) m.murs = murs;
        const parties = [...el.querySelectorAll("#mParties .partie-mesure")].map(d => [...d.querySelectorAll("input")].map(i => nb(i.value))).filter(([x, y]) => x && y); if (parties.length) m.parties = parties;
        if (nb(el.querySelector("#mM_sol").value)) m.sol = nb(el.querySelector("#mM_sol").value);
      } else CHAMPS.forEach(([k]) => { const v = nb(el.querySelector(`#mM_${k}`).value); if (v) m[k] = v; });
      if (nb(el.querySelector("#mM_h").value)) m.h = nb(el.querySelector("#mM_h").value);
      const autres = [...el.querySelectorAll("#mM_lignes .ligne-mesure")].map(d => [d.querySelector(".m-nom").value.trim(), d.querySelector(".m-val").value.trim()]).filter(([, v]) => v);
      if (autres.length) m.autres = autres.map(([n, v]) => [n || "Mesure", v]);
      const notes = el.querySelector("#mM_notes").value.trim(); if (notes) m.notes = notes;
      if (!Object.keys(m).filter(k => k !== "piece" && k !== "forme").length) return toast("Notez au moins une mesure.");
      try {
        const n = await db.ajouterCarnet({ client_id: client.id, etape: "avant", type: "mesures", texte: JSON.stringify(m) });
        lignes.unshift(n); ouvert = false; toast("Mesures enregistrées ✓"); dessiner();
      } catch (e) { erreur(e); }
    };
  }
  dessiner();
}
