// Rendez-vous : objets, agenda du téléphone (Google Agenda sur Android, fichier .ics sur iPhone), messages au client.

export const OBJETS_RDV = ["Visite", "Début des travaux", "Passage sur le chantier", "Livraison", "Réception des travaux", "Autre"];
const DUREES = { "Visite": 60, "Début des travaux": 480, "Passage sur le chantier": 60, "Livraison": 60, "Réception des travaux": 60, "Autre": 60 };

const politesse = c => c ? [c.civilite, c.nom].filter(Boolean).join(" ") : "";
const adresse = c => c ? [c.adresse, [c.cp, c.ville].filter(Boolean).join(" ")].filter(Boolean).join(", ") : "";
export const jourRdv = iso => new Date(iso).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
export const heureRdv = iso => { const d = new Date(iso); return `${d.getHours()} h ${String(d.getMinutes()).padStart(2, "0")}`; };
const majuscule = t => t.charAt(0).toUpperCase() + t.slice(1);
const lieuDe = c => !c ? "" : c.adresse ? `au ${adresse(c)}` : c.ville ? `à ${c.ville}` : "";
const estDemain = iso => { const d = new Date(iso), t = new Date(); t.setDate(t.getDate() + 1); return d.toDateString() === t.toDateString(); };
const estAujourdhui = iso => new Date(iso).toDateString() === new Date().toDateString();

export function messageRdv(genre, rdv, client) {
  const quand = estAujourdhui(rdv.created_at) ? "aujourd'hui" : estDemain(rdv.created_at) ? "demain" : `le ${jourRdv(rdv.created_at)}`;
  const objet = (rdv.texte || "Rendez-vous").toLowerCase(), lieu = lieuDe(client);
  if (genre === "rappel")
    return `Bonjour ${politesse(client)},\n\nPetit rappel : ${objet} ${quand} à ${heureRdv(rdv.created_at)}${lieu ? `, ${lieu}` : ""}.\n\nÀ ${quand === "demain" ? "demain" : "bientôt"} !\nKA Rénovation — 07 63 14 76 27`;
  return `Bonjour ${politesse(client)},\n\nJe vous confirme notre rendez-vous (${objet}) ${quand} à ${heureRdv(rdv.created_at)}${lieu ? `, ${lieu}` : ""}.\n\nÀ bientôt,\nKA Rénovation — 07 63 14 76 27`;
}

// ajoute le rendez-vous à l'agenda du téléphone
export function versAgenda(rdv, client) {
  const debut = new Date(rdv.created_at), fin = new Date(debut.getTime() + (DUREES[rdv.texte] || 60) * 60000);
  const z = d => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const titre = `${rdv.texte || "Rendez-vous"} – ${politesse(client) || "client"}`, lieu = adresse(client), notes = client?.tel ? `Tél. ${client.tel}` : "";
  if (/android/i.test(navigator.userAgent)) {
    const u = new URL("https://calendar.google.com/calendar/render");
    u.searchParams.set("action", "TEMPLATE"); u.searchParams.set("text", titre); u.searchParams.set("dates", `${z(debut)}/${z(fin)}`);
    if (lieu) u.searchParams.set("location", lieu); if (notes) u.searchParams.set("details", notes);
    window.open(u.toString(), "_blank"); return;
  }
  const esc = t => String(t).replace(/([,;\\])/g, "\\$1").replace(/\n/g, "\\n");
  const ics = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//KA Renovation//Admin//FR", "BEGIN:VEVENT", `UID:${rdv.id}@karenovation.fr`, `DTSTAMP:${z(new Date())}`,
    `DTSTART:${z(debut)}`, `DTEND:${z(fin)}`, `SUMMARY:${esc(titre)}`, lieu ? `LOCATION:${esc(lieu)}` : "", notes ? `DESCRIPTION:${esc(notes)}` : "",
    "BEGIN:VALARM", "TRIGGER:-PT1H", "ACTION:DISPLAY", `DESCRIPTION:${esc(titre)}`, "END:VALARM", "END:VEVENT", "END:VCALENDAR"].filter(Boolean).join("\r\n");
  const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([ics], { type: "text/calendar" })); a.download = "rendez-vous.ics"; a.click();
}

// carte d'un rendez-vous, avec ses trois boutons (le nom du client seulement sur le tableau de bord)
export function carteRdv(rdv, esc, { client = null, retirer = false } = {}) {
  const passe = new Date(rdv.created_at) < Date.now() - 3600000;
  return `<div class="note-carnet rdv ${passe ? "passe" : ""}">
    <small>Rendez-vous${client ? " · " + esc(politesse(client)) : ""}</small>
    <p><b>${esc(majuscule(jourRdv(rdv.created_at)))} · ${heureRdv(rdv.created_at)}</b><br>${esc(rdv.texte || "")}</p>
    ${passe ? "" : `<div class="actions-doc" style="margin:8px 0 0">
      <button type="button" class="btn petit-btn" data-rdv-agenda="${rdv.id}">Mon agenda</button>
      <button type="button" class="btn clair petit-btn" data-rdv-confirmer="${rdv.id}">Prévenir le client</button>
      <button type="button" class="btn clair petit-btn" data-rdv-rappel="${rdv.id}">Rappel</button></div>`}
    ${retirer ? `<button type="button" class="icone" data-retirer="${rdv.id}" aria-label="Retirer">✕</button>` : ""}</div>`;
}

// branche les boutons des cartes de rendez-vous d'un bloc
export function lierRdv(zone, rdvs, clientDe, envoyerMessage) {
  zone.querySelectorAll("[data-rdv-agenda]").forEach(b => b.onclick = () => { const r = rdvs.find(x => x.id === b.dataset.rdvAgenda); versAgenda(r, clientDe(r)); });
  zone.querySelectorAll("[data-rdv-confirmer]").forEach(b => b.onclick = () => { const r = rdvs.find(x => x.id === b.dataset.rdvConfirmer); envoyerMessage({ client: clientDe(r) }, messageRdv("confirmation", r, clientDe(r))); });
  zone.querySelectorAll("[data-rdv-rappel]").forEach(b => b.onclick = () => { const r = rdvs.find(x => x.id === b.dataset.rdvRappel); envoyerMessage({ client: clientDe(r) }, messageRdv("rappel", r, clientDe(r))); });
}
