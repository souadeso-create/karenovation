// PV de fin de chantier (réception des travaux) : réserves, photos après travaux, signature du client au doigt, PDF.

const ENCRE = [27, 26, 24], GRIS = [109, 103, 95], PIERRE = [239, 235, 229], SABLE = [217, 208, 195];
const aujourdhui = () => new Date().toISOString().slice(0, 10);
const dateFr = d => d ? new Date(d + (String(d).length === 10 ? "T12:00:00" : "")).toLocaleDateString("fr-FR") : "";
const propre = s => String(s ?? "").replace(/[  ]/g, " ").replace(/[’‘]/g, "'").replace(/[“”]/g, '"').replace(/…/g, "...").replace(/[–—]/g, "-");
const nomDe = c => c ? [c.civilite, c.nom, c.prenom].filter(Boolean).join(" ") : "";

// photo du téléphone → JPEG de 1280 px au plus
async function reduire(fichier) {
  const img = await createImageBitmap(fichier, { imageOrientation: "from-image" });
  const k = Math.min(1, 1280 / Math.max(img.width, img.height));
  const c = document.createElement("canvas"); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
  c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
  return c.toDataURL("image/jpeg", .75);
}

export async function vueReception(vue, { db, docId, P, toast, esc, erreur, envoyerMessage }) {
  const doc = await db.lire("documents", docId);
  if (!doc) { vue.innerHTML = '<p class="vide">Document introuvable.</p>'; return; }
  let ligne = await db.chercher("receptions", "document_id", docId);
  const r = { date: aujourdhui(), sans_reserve: true, reserves: "", delai: "30 jours", photos: [], client_nom: nomDe(doc.client), signature: null, signe_le: null, ...(ligne?.data || {}) };
  const c = doc.client || {};

  const enregistrer = async () => {
    ligne = await db.enregistrer("receptions", { ...(ligne?.id ? { id: ligne.id } : {}), document_id: docId, data: r });
  };

  const dessiner = () => {
    const signe = !!r.signe_le;
    vue.innerHTML = `
      <div class="entete"><div><div class="petit">PV de fin de chantier · ${esc(doc.numero)}</div><h1>${esc(doc.objet || "Réception des travaux")}</h1></div>
        <a class="btn discret" href="#/document/${docId}">‹ Retour</a></div>
      <div class="deux-col">
        <div>
          <div class="carte" style="margin-bottom:12px">
            <label>Chantier</label>
            <p><b>${esc(nomDe(c))}</b><br><span class="gris">${esc([c.adresse, [c.cp, c.ville].filter(Boolean).join(" ")].filter(Boolean).join(", "))}</span></p>
            <div class="champ" style="margin-top:12px"><label for="dateR">Date de réception</label><input type="date" id="dateR" value="${esc(r.date)}" ${signe ? "disabled" : ""}></div>
          </div>
          <div class="carte" style="margin-bottom:12px">
            <label>Réception</label>
            <div class="palette" style="margin:6px 0 10px">
              <button type="button" class="btn ${r.sans_reserve ? "" : "discret"} petit-btn" data-reserve="0" ${signe ? "disabled" : ""}>Sans réserve</button>
              <button type="button" class="btn ${r.sans_reserve ? "discret" : ""} petit-btn" data-reserve="1" ${signe ? "disabled" : ""}>Avec réserves</button>
            </div>
            ${r.sans_reserve ? "" : `
              <div class="champ"><label for="reserves">Réserves (une par ligne)</label><textarea id="reserves" rows="4" placeholder="Joint silicone à reprendre derrière le WC" ${signe ? "disabled" : ""}>${esc(r.reserves)}</textarea></div>
              <div class="champ"><label for="delai">Levée des réserves sous</label><input type="text" id="delai" value="${esc(r.delai)}" ${signe ? "disabled" : ""}></div>`}
          </div>
          <div class="carte" style="margin-bottom:12px">
            <label>Photos après travaux</label>
            <div class="photos-pv">${r.photos.map((p, i) => `<div><img src="${p}" alt="Photo ${i + 1}">${signe ? "" : `<button type="button" class="icone" data-retirer="${i}" aria-label="Retirer la photo">✕</button>`}</div>`).join("")}</div>
            ${signe ? "" : `<label class="btn clair petit-btn" style="margin-top:10px;display:inline-flex">+ Ajouter des photos<input type="file" id="photos" accept="image/*" multiple hidden></label>`}
          </div>
        </div>
        <div>
          <div class="carte" style="margin-bottom:12px">
            <label>Signature du client</label>
            ${signe
              ? `<img src="${r.signature}" alt="Signature" style="width:100%;max-width:420px;background:#fff;border-radius:12px;border:1px solid var(--sable)">
                 <p class="gris" style="font-size:14px;margin-top:6px">Signé par <b style="color:var(--encre)">${esc(r.client_nom)}</b> le ${new Date(r.signe_le).toLocaleString("fr-FR", { dateStyle: "long", timeStyle: "short" })}.</p>`
              : `<div class="champ"><label for="nomSigne">Nom du client</label><input type="text" id="nomSigne" value="${esc(r.client_nom)}" autocomplete="off"></div>
                 <p class="gris" style="font-size:13px;margin-bottom:6px">Le client signe avec le doigt dans le cadre :</p>
                 <canvas id="pad" class="pad-signature"></canvas>
                 <div class="actions-doc" style="margin:8px 0 0"><button type="button" class="btn discret petit-btn" data-effacer="pad">Effacer</button></div>`}
          </div>
          <div class="carte" style="margin-bottom:12px">
            <label>Signature de l'entreprise</label>
            ${signe
              ? (r.signature_ent ? `<img src="${r.signature_ent}" alt="Signature de l'entreprise" style="width:100%;max-width:420px;background:#fff;border-radius:12px;border:1px solid var(--sable)">` : '<p class="gris" style="font-size:14px">Non signée.</p>')
              : `<canvas id="padEnt" class="pad-signature"></canvas>
                 <div class="actions-doc" style="margin:8px 0 0"><button type="button" class="btn discret petit-btn" data-effacer="padEnt">Effacer</button></div>`}
          </div>
          <div class="actions-doc">
            ${signe
              ? `<button class="btn" id="pdfR">PDF du PV</button><button class="btn clair" id="partageR">Envoyer au client</button>
                 <button class="btn clair" id="avisR">Demander un avis Google</button>
                 <button class="btn discret" id="annulerSig">Annuler la signature</button>`
              : `<button class="btn" id="signerR">Faire signer et enregistrer</button><button class="btn discret" id="enregR">Enregistrer sans signature</button>`}
          </div>
          <p class="gris" style="font-size:13px">La réception est le point de départ des garanties de parfait achèvement (1 an), biennale (2 ans) et décennale (10 ans).</p>
        </div>
      </div>`;
    lier();
  };

  const traces = {}, pinceaux = {};
  function lier() {
    const champ = id => document.getElementById(id);
    const lire = () => {
      if (champ("dateR")) r.date = champ("dateR").value || r.date;
      if (champ("reserves")) r.reserves = champ("reserves").value;
      if (champ("delai")) r.delai = champ("delai").value;
      if (champ("nomSigne")) r.client_nom = champ("nomSigne").value.trim();
    };
    vue.querySelectorAll("[data-reserve]").forEach(b => b.onclick = () => { lire(); r.sans_reserve = b.dataset.reserve === "0"; dessiner(); });
    vue.querySelectorAll("[data-retirer]").forEach(b => b.onclick = () => { lire(); r.photos.splice(Number(b.dataset.retirer), 1); dessiner(); });
    const ph = champ("photos");
    if (ph) ph.onchange = async () => {
      lire();
      try { for (const f of ph.files) r.photos.push(await reduire(f)); } catch (e) { erreur(e); }
      dessiner();
    };
    // signature au doigt
    ["pad", "padEnt"].forEach(id => {
      const pad = champ(id); if (!pad) return;
      const box = pad.getBoundingClientRect(), k = window.devicePixelRatio || 1;
      pad.width = box.width * k; pad.height = box.height * k;
      const g = pad.getContext("2d"); g.scale(k, k); g.lineWidth = 2.4; g.lineCap = g.lineJoin = "round"; g.strokeStyle = "#1b1a18";
      const vider = () => { g.fillStyle = "#fff"; g.fillRect(0, 0, box.width, box.height); traces[id] = false; };
      vider(); pinceaux[id] = vider;
      let actif = false;
      const pt = e => { const b = pad.getBoundingClientRect(); return [e.clientX - b.left, e.clientY - b.top]; };
      pad.onpointerdown = e => { actif = true; pad.setPointerCapture(e.pointerId); const [x, y] = pt(e); g.beginPath(); g.moveTo(x, y); };
      pad.onpointermove = e => { if (!actif) return; const [x, y] = pt(e); g.lineTo(x, y); g.stroke(); traces[id] = true; };
      pad.onpointerup = pad.onpointercancel = () => { actif = false; };
    });
    vue.querySelectorAll("[data-effacer]").forEach(b => b.onclick = () => pinceaux[b.dataset.effacer]?.());
    const en = champ("enregR");
    if (en) en.onclick = async () => { lire(); try { await enregistrer(); toast("PV enregistré ✓"); } catch (e) { erreur(e); } };
    const si = champ("signerR");
    if (si) si.onclick = async () => {
      lire();
      if (r.client_nom.length < 2) return toast("Indiquez le nom du client.");
      if (!traces.pad) return toast("Le client doit signer dans le cadre.");
      if (!r.sans_reserve && !r.reserves.trim()) return toast("Écrivez les réserves, ou choisissez « Sans réserve ».");
      r.signature = champ("pad").toDataURL("image/png"); r.signature_ent = traces.padEnt ? champ("padEnt").toDataURL("image/png") : null;
      r.signe_le = new Date().toISOString();
      try { await enregistrer(); toast("PV signé ✓"); dessiner(); } catch (e) { r.signe_le = null; erreur(e); }
    };
    const av = champ("avisR");
    if (av) av.onclick = async () => {
      if (!P.lien_avis) return toast("Ajoutez d'abord le lien de votre fiche Google dans Réglages > Chantiers.");
      const nom = [c.civilite, c.nom].filter(Boolean).join(" ");
      await envoyerMessage(doc, `Bonjour ${nom},

Merci pour votre confiance ! Si vous êtes content(e) de votre nouvelle salle de bain, un petit avis nous aiderait beaucoup :
${P.lien_avis}

Bonne journée,
KA Rénovation`);
    };
    const an = champ("annulerSig");
    if (an) an.onclick = async () => { r.signe_le = null; r.signature = null; r.signature_ent = null; try { await enregistrer(); toast("Signature retirée"); dessiner(); } catch (e) { erreur(e); } };
    const pdfB = champ("pdfR");
    if (pdfB) pdfB.onclick = async () => {
      try { const f = await fichierPDF(); const a = document.createElement("a"); a.href = URL.createObjectURL(f); a.download = f.name; a.click(); } catch (e) { erreur(e); }
    };
    const pa = champ("partageR");
    if (pa) pa.onclick = async () => {
      try {
        const f = await fichierPDF();
        if (navigator.canShare && navigator.canShare({ files: [f] })) { try { await navigator.share({ files: [f], title: f.name }); return; } catch (er) { if (er.name === "AbortError") return; } }
        const a = document.createElement("a"); a.href = URL.createObjectURL(f); a.download = f.name; a.click();
      } catch (e) { erreur(e); }
    };
  }

  async function fichierPDF() {
    const blob = await creerPDFReception(doc, r, P);
    return new File([blob], `PV-reception-${(doc.numero || "chantier").replace(/[^\w-]/g, "")}.pdf`, { type: "application/pdf" });
  }

  dessiner();
}

let logoCache = null;
async function logo() {
  if (logoCache) return logoCache;
  const b = await (await fetch("../medias/logo-pdf.png")).blob();
  logoCache = await new Promise(ok => { const f = new FileReader(); f.onload = () => ok(f.result); f.readAsDataURL(b); });
  return logoCache;
}

async function creerPDFReception(doc, r, p) {
  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF({ unit: "mm", format: "a4" });
  const W = 210, M = 15, c = doc.client || {};
  pdf.setLineHeightFactor(1.3);
  try { pdf.addImage(await logo(), "PNG", M, 14, 40, 20.2, "logo", "FAST"); } catch { /* pas de logo */ }
  pdf.setTextColor(...ENCRE).setFont("helvetica", "bold").setFontSize(15).text("PROCÈS-VERBAL DE RÉCEPTION", 112, 20);
  pdf.setFontSize(11).text("DES TRAVAUX", 112, 26);
  pdf.setFont("helvetica", "normal").setFontSize(9.5).setTextColor(...GRIS).text(`Devis N° ${propre(doc.numero)}${doc.date ? " du " + dateFr(doc.date) : ""}`, 112, 32);

  let y = 46;
  pdf.setTextColor(...ENCRE).setFont("helvetica", "bold").setFontSize(10.5).text("Entreprise", M, y);
  pdf.setFont("helvetica", "normal").setFontSize(9.5);
  [p.entreprise, p.adresse, `${p.cp || ""} ${p.ville || ""}`, p.siret ? `SIRET ${p.siret}` : "", `Tél. ${p.tel || ""}`].filter(x => String(x).trim()).map(propre)
    .forEach((l, i) => pdf.text(l, M, y + 5 + i * 4.6));
  pdf.setFillColor(...PIERRE).roundedRect(112, y - 5, W - M - 112, 32, 1.5, 1.5, "F");
  pdf.setFont("helvetica", "bold").setFontSize(10.5).text("Maître d'ouvrage", 116, y);
  pdf.setFont("helvetica", "normal").setFontSize(9.5);
  [nomDe(c), c.adresse, [c.cp, c.ville].filter(Boolean).join(" "), c.tel].filter(Boolean).map(propre).forEach((l, i) => pdf.text(l, 116, y + 5 + i * 4.6));

  y = 86;
  pdf.setDrawColor(...SABLE).setLineWidth(.3).line(M, y, W - M, y);
  y += 8;
  pdf.setFont("helvetica", "bold").setFontSize(10.5).text("Objet", M, y);
  pdf.setFont("helvetica", "normal").setFontSize(10).text(pdf.splitTextToSize(propre(doc.objet || "Travaux de rénovation"), W - 2 * M - 20), M + 20, y);
  y += 10;
  const texte = `Le maître d'ouvrage soussigné, après avoir visité les travaux réalisés par l'entreprise ${propre(p.entreprise)} au titre du devis N° ${propre(doc.numero)}, déclare en présence de l'entreprise :`;
  pdf.text(pdf.splitTextToSize(texte, W - 2 * M), M, y); y += 13;
  const caseX = (on, txt) => { pdf.setDrawColor(...ENCRE).rect(M, y - 3.4, 4, 4); if (on) { pdf.setFont("helvetica", "bold").text("X", M + .9, y); pdf.setFont("helvetica", "normal"); } pdf.text(txt, M + 7, y); y += 7; };
  caseX(r.sans_reserve, "prononcer la réception des travaux SANS RÉSERVE ;");
  caseX(!r.sans_reserve, "prononcer la réception des travaux AVEC LES RÉSERVES suivantes :");
  if (!r.sans_reserve) {
    const lignes = r.reserves.split("\n").map(s => s.trim()).filter(Boolean);
    lignes.forEach(l => { const t = pdf.splitTextToSize("- " + propre(l), W - 2 * M - 10); pdf.text(t, M + 10, y); y += t.length * 5; });
    y += 2; pdf.text(propre(`L'entreprise s'engage à lever ces réserves dans un délai de ${r.delai || "30 jours"}.`), M + 7, y); y += 8;
  }
  y += 2;
  const garanties = `La réception est prononcée le ${dateFr(r.date)}. Elle constitue le point de départ des garanties de parfait achèvement (1 an), de bon fonctionnement (2 ans) et décennale (10 ans), prévues aux articles 1792 et suivants du Code civil.`;
  const tg = pdf.splitTextToSize(garanties, W - 2 * M); pdf.setTextColor(...GRIS).text(tg, M, y); y += tg.length * 5 + 6;
  if (r.photos.length) { pdf.text(`${r.photos.length} photo${r.photos.length > 1 ? "s" : ""} des travaux terminés jointe${r.photos.length > 1 ? "s" : ""} en annexe.`, M, y); y += 8; }

  // signatures
  y = Math.max(y + 4, 200);
  pdf.setTextColor(...ENCRE).setFont("helvetica", "bold").setFontSize(10);
  pdf.text("Le maître d'ouvrage", M, y); pdf.text("L'entreprise", 112, y);
  pdf.setFont("helvetica", "normal").setFontSize(9);
  pdf.text(propre(`${r.client_nom}, le ${dateFr(r.date)}`), M, y + 5); pdf.text(propre(`${p.entreprise}, le ${dateFr(r.date)}`), 112, y + 5);
  if (r.signature) pdf.addImage(r.signature, "PNG", M, y + 8, 70, 30);
  if (r.signature_ent) pdf.addImage(r.signature_ent, "PNG", 112, y + 8, 70, 30);
  pdf.setDrawColor(...SABLE).rect(M, y + 8, 70, 30); pdf.rect(112, y + 8, 70, 30);
  pdf.setFontSize(8).setTextColor(...GRIS).text(propre([p.entreprise, p.forme, p.siret ? "SIRET " + p.siret : ""].filter(Boolean).join(" · ")), W / 2, 287, { align: "center" });

  // annexe : photos, deux par page
  r.photos.forEach((ph, i) => {
    if (i % 2 === 0) { pdf.addPage(); pdf.setFont("helvetica", "bold").setFontSize(11).setTextColor(...ENCRE).text("Annexe : photos des travaux terminés", M, 18); }
    const props = pdf.getImageProperties(ph), maxW = W - 2 * M, maxH = 118;
    const k = Math.min(maxW / props.width, maxH / props.height), w = props.width * k, h = props.height * k;
    pdf.addImage(ph, "JPEG", M + (maxW - w) / 2, (i % 2 === 0 ? 26 : 152), w, h);
  });
  return pdf.output("blob");
}
