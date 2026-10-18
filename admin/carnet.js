// Carnet de chantier : photos et notes datées sur la fiche client (avant, pendant, après les travaux).

const ETAPES = { avant: "Avant", pendant: "Pendant", apres: "Après" };

// photo du téléphone → JPEG de 1600 px au plus
async function reduire(fichier) {
  const img = await createImageBitmap(fichier, { imageOrientation: "from-image" });
  const k = Math.min(1, 1600 / Math.max(img.width, img.height));
  const c = document.createElement("canvas"); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
  c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
  return new Promise(ok => c.toBlob(ok, "image/jpeg", .8));
}

export async function monterCarnet(el, { db, client, toast, esc, erreur }) {
  let etape = "pendant", filtre = "tout", lignes = [], urls = {}, enCours = 0;
  const caches = new Set(); // entrées retirées, en attente de suppression (on peut annuler)

  const charger = async () => {
    try { lignes = await db.listerCarnet(client.id); urls = await db.urlsCarnet(lignes); }
    catch (e) { el.innerHTML = '<p class="gris">Le carnet n\'est pas encore activé.</p>'; return false; }
    return true;
  };
  const jour = iso => new Date(iso).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const heure = iso => new Date(iso).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });

  const dessiner = () => {
    const visibles = lignes.filter(l => !caches.has(l.id) && (filtre === "tout" || l.etape === filtre));
    const jours = [];
    visibles.forEach(l => { const j = jour(l.created_at); let g = jours.find(x => x.j === j); if (!g) jours.push(g = { j, l: [] }); g.l.push(l); });
    const nb = e => lignes.filter(l => !caches.has(l.id) && (e === "tout" || l.etape === e)).length;
    el.innerHTML = `
      <div class="carte" style="margin-bottom:12px">
        <label>Ajouter au carnet · étape</label>
        <div class="palette" style="margin:6px 0 12px">${Object.entries(ETAPES).map(([k, n]) => `<button type="button" class="btn ${k === etape ? "" : "discret"} petit-btn" data-etape="${k}">${n}</button>`).join("")}</div>
        <div class="actions-doc" style="margin:0">
          <label class="btn petit-btn" style="display:inline-flex">+ Photos<input type="file" id="cPhotos" accept="image/*" multiple hidden></label>
          <button type="button" class="btn clair petit-btn" id="cNoteOuvrir">+ Note</button>
        </div>
        <div id="cNote" hidden style="margin-top:10px">
          <textarea id="cTexte" rows="3" placeholder="Arrivée d'eau déplacée de 20 cm vers la gauche"></textarea>
          <div class="actions-doc" style="margin:8px 0 0"><button type="button" class="btn petit-btn" id="cNoteOk">Ajouter la note</button></div>
        </div>
        ${enCours ? `<p class="gris" style="font-size:13px;margin-top:8px">Envoi de ${enCours} photo${enCours > 1 ? "s" : ""}…</p>` : ""}
      </div>
      <div class="palette" style="margin-bottom:10px">${[["tout", "Tout"], ...Object.entries(ETAPES)].map(([k, n]) => `<button type="button" class="btn ${k === filtre ? "clair" : "discret"} petit-btn" data-filtre="${k}">${n} · ${nb(k)}</button>`).join("")}</div>
      ${jours.length ? jours.map(g => `
        <div class="jour-carnet"><div class="petit" style="margin:14px 0 8px">${esc(g.j)}</div>
          ${g.l.some(l => l.chemin || l.image) ? `<div class="photos-pv">${g.l.filter(l => l.chemin || l.image).map(l => `<button type="button" class="vignette" data-voir="${l.id}"><img src="${esc(urls[l.id] || "")}" alt="Photo ${esc(ETAPES[l.etape])}" loading="lazy"><span>${esc(ETAPES[l.etape])} · ${heure(l.created_at)}</span></button>`).join("")}</div>` : ""}
          ${g.l.filter(l => !l.chemin && !l.image).map(l => `<div class="note-carnet"><small>${esc(ETAPES[l.etape])} · ${heure(l.created_at)}</small><p>${esc(l.texte).replace(/\n/g, "<br>")}</p><button type="button" class="icone" data-retirer="${l.id}" aria-label="Retirer la note">✕</button></div>`).join("")}
        </div>`).join("") : '<p class="gris">Rien dans le carnet pour l\'instant : ajoutez les photos d\'avant travaux dès la première visite.</p>'}`;
    lier();
  };

  // retrait annulable : l'entrée disparaît, et n'est vraiment supprimée qu'après 8 secondes
  const retirer = id => {
    const l = lignes.find(x => x.id === id); if (!l) return;
    caches.add(id); dessiner();
    const t = document.createElement("div"); t.className = "toast";
    t.innerHTML = `${l.chemin || l.image ? "Photo retirée" : "Note retirée"} <button type="button" style="margin-left:10px;background:none;border:0;color:#fff;text-decoration:underline;font:inherit;cursor:pointer">Annuler</button>`;
    document.body.appendChild(t);
    const minuteur = setTimeout(async () => {
      t.remove();
      try { await db.supprimerCarnet(l); lignes = lignes.filter(x => x.id !== id); } catch (e) { caches.delete(id); dessiner(); erreur(e); }
    }, 8000);
    t.querySelector("button").onclick = () => { clearTimeout(minuteur); t.remove(); caches.delete(id); dessiner(); };
  };

  const voir = id => {
    const l = lignes.find(x => x.id === id); if (!l) return;
    const v = document.createElement("div"); v.className = "voile visionneuse";
    v.innerHTML = `<div class="fenetre" style="max-width:900px"><div class="tete"><h2>${esc(ETAPES[l.etape])} · ${esc(jour(l.created_at))}</h2><button class="icone" data-fermer aria-label="Fermer">✕</button></div>
      <img src="${esc(urls[l.id] || "")}" alt="" style="width:100%;border-radius:12px;display:block">
      <div class="actions-doc"><button class="btn" data-partager>Partager</button><button class="btn danger" data-suppr>Retirer la photo</button></div></div>`;
    document.body.appendChild(v);
    v.addEventListener("click", async e => {
      if (e.target === v || e.target.closest("[data-fermer]")) v.remove();
      else if (e.target.closest("[data-suppr]")) { v.remove(); retirer(id); }
      else if (e.target.closest("[data-partager]")) {
        try {
          const b = await (await fetch(urls[l.id])).blob();
          const f = new File([b], `chantier-${client.nom || "photo"}-${l.etape}.jpg`.toLowerCase().replace(/[^\w.-]/g, "-"), { type: "image/jpeg" });
          if (navigator.canShare && navigator.canShare({ files: [f] })) { try { await navigator.share({ files: [f] }); return; } catch (er) { if (er.name === "AbortError") return; } }
          const a = document.createElement("a"); a.href = URL.createObjectURL(f); a.download = f.name; a.click();
        } catch (er) { erreur(er); }
      }
    });
  };

  function lier() {
    el.querySelectorAll("[data-etape]").forEach(b => b.onclick = () => { etape = b.dataset.etape; dessiner(); });
    el.querySelectorAll("[data-filtre]").forEach(b => b.onclick = () => { filtre = b.dataset.filtre; dessiner(); });
    el.querySelectorAll("[data-voir]").forEach(b => b.onclick = () => voir(b.dataset.voir));
    el.querySelectorAll("[data-retirer]").forEach(b => b.onclick = () => retirer(b.dataset.retirer));
    el.querySelector("#cNoteOuvrir").onclick = () => { const n = el.querySelector("#cNote"); n.hidden = !n.hidden; if (!n.hidden) el.querySelector("#cTexte").focus(); };
    el.querySelector("#cNoteOk").onclick = async () => {
      const texte = el.querySelector("#cTexte").value.trim(); if (!texte) return;
      try { const n = await db.ajouterCarnet({ client_id: client.id, etape, texte }); lignes.unshift(n); toast("Note ajoutée ✓"); dessiner(); } catch (e) { erreur(e); }
    };
    el.querySelector("#cPhotos").onchange = async e => {
      const fichiers = [...e.target.files]; if (!fichiers.length) return;
      enCours = fichiers.length; dessiner();
      for (const f of fichiers) {
        try {
          const blob = await reduire(f), n = await db.ajouterCarnet({ client_id: client.id, etape }, blob);
          lignes.unshift(n); urls[n.id] = n.image || URL.createObjectURL(blob);
        } catch (er) { erreur(er); }
        enCours--; dessiner();
      }
      toast(`${fichiers.length} photo${fichiers.length > 1 ? "s" : ""} ajoutée${fichiers.length > 1 ? "s" : ""} ✓`);
    };
  }

  if (await charger()) dessiner();
}
