// Simulateur 3D de chantier de salle de bain : pièce, revêtements, équipements, ouvertures,
// réseaux (eau, évacuations, électricité), métré et création du devis.
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";

const TAU = Math.PI * 2;
const cm = v => Math.round(v * 100);

/* =================== Revêtements =================== */
// matières : dessin d'UN carreau (g = contexte, w/h = taille en px), avec une petite variation d'un carreau à l'autre
const MATIERES = {
  blanc: { nom: "Blanc brillant", couleur: "#f4f3f0", dessin: (g, w, h) => uni(g, w, h, 40, 2, 97, .02) },
  grisClair: { nom: "Gris clair", couleur: "#cfccc6", dessin: (g, w, h) => uni(g, w, h, 40, 4, 80, .04) },
  creme: { nom: "Crème", couleur: "#e9dfcf", dessin: (g, w, h) => uni(g, w, h, 38, 30, 88, .03) },
  rose: { nom: "Rose poudré", couleur: "#e8cfc6", dessin: (g, w, h) => uni(g, w, h, 12, 35, 85, .03) },
  marbre: { nom: "Marbre blanc", couleur: "#ece8e2", dessin: (g, w, h) => { uni(g, w, h, 35, 12, 92, .02); veines(g, w, h, "rgba(130,118,104,.5)", 4); veines(g, w, h, "rgba(186,160,120,.3)", 3); } },
  marbreNoir: { nom: "Marbre noir", couleur: "#262628", dessin: (g, w, h) => { uni(g, w, h, 240, 3, 15, .02); veines(g, w, h, "rgba(220,220,220,.35)", 4); } },
  travertin: { nom: "Travertin", couleur: "#d8c6a8", dessin: (g, w, h) => { uni(g, w, h, 36, 32, 76, .05);
    g.strokeStyle = "rgba(150,120,80,.25)"; for (let i = 0; i < 18; i++) { g.lineWidth = 1 + Math.random() * 2; const y = Math.random() * h; g.beginPath(); g.moveTo(0, y); g.lineTo(w, y + (Math.random() - .5) * 8); g.stroke(); } } },
  pierre: { nom: "Pierre beige", couleur: "#d6c9b5", dessin: (g, w, h) => uni(g, w, h, 36, 22, 79, .07) },
  beton: { nom: "Béton gris", couleur: "#a2a19e", dessin: (g, w, h) => uni(g, w, h, 40, 3, 63, .1) },
  anthracite: { nom: "Anthracite", couleur: "#36373a", dessin: (g, w, h) => uni(g, w, h, 220, 4, 22, .05) },
  ardoise: { nom: "Ardoise", couleur: "#3c4148", dessin: (g, w, h) => { uni(g, w, h, 215, 8, 27, .12); veines(g, w, h, "rgba(255,255,255,.06)", 6); } },
  bleu: { nom: "Bleu-vert", couleur: "#5f8a87", dessin: (g, w, h) => uni(g, w, h, 176, 20, 45, .05) },
  bleuNuit: { nom: "Bleu nuit", couleur: "#253447", dessin: (g, w, h) => uni(g, w, h, 214, 32, 21 + Math.random() * 4, .05) },
  vert: { nom: "Vert sauge", couleur: "#a8b59c", dessin: (g, w, h) => uni(g, w, h, 92, 14, 66, .04) },
  zelligeBlanc: { nom: "Zellige blanc", couleur: "#efece4", dessin: (g, w, h) => uni(g, w, h, 45, 20, 88 + Math.random() * 7, .08) },
  zelligeVert: { nom: "Zellige vert", couleur: "#3f7a62", dessin: (g, w, h) => uni(g, w, h, 152, 32, 30 + Math.random() * 14, .08) },
  terracotta: { nom: "Terracotta", couleur: "#b8684a", dessin: (g, w, h) => uni(g, w, h, 16, 45, 51, .06) },
  terrazzo: { nom: "Terrazzo", couleur: "#e5e1da", dessin: (g, w, h) => { uni(g, w, h, 40, 10, 89, .02);
    for (let i = 0; i < w * h / 600; i++) { g.fillStyle = ["#2d2d2d", "#8a8580", "#c9a98a", "#bcb6ad"][i % 4]; g.beginPath(); g.ellipse(Math.random() * w, Math.random() * h, 1.5 + Math.random() * 4, 1.5 + Math.random() * 3, Math.random() * 3, 0, TAU); g.fill(); } } },
  ciment: { nom: "Carreau de ciment", couleur: "#2f4a6b", dessin: (g, w, h) => {
    g.fillStyle = "#efebe3"; g.fillRect(0, 0, w, h); g.fillStyle = "#2f4a6b";
    g.beginPath(); g.moveTo(w / 2, 0); g.lineTo(w, h / 2); g.lineTo(w / 2, h); g.lineTo(0, h / 2); g.closePath(); g.fill();
    g.fillStyle = "#efebe3"; g.beginPath(); g.arc(w / 2, h / 2, w * .22, 0, TAU); g.fill();
    g.fillStyle = "#2f4a6b"; [[0, 0], [w, 0], [0, h], [w, h]].forEach(([x, y]) => { g.beginPath(); g.arc(x, y, w * .16, 0, TAU); g.fill(); }); } },
  blancMat: { nom: "Blanc mat", couleur: "#eeede9", dessin: (g, w, h) => uni(g, w, h, 40, 3, 93, .015) },
  sable: { nom: "Beige sable", couleur: "#d9ccb4", dessin: (g, w, h) => uni(g, w, h, 38, 28, 80, .04) },
  taupe: { nom: "Taupe", couleur: "#8f8174", dessin: (g, w, h) => uni(g, w, h, 30, 12, 52, .04) },
  noirMat: { nom: "Noir mat", couleur: "#1f1f21", dessin: (g, w, h) => uni(g, w, h, 240, 3, 12, .03) },
  kaki: { nom: "Vert kaki", couleur: "#6f6e4c", dessin: (g, w, h) => uni(g, w, h, 58, 18, 37, .05) },
  bleuCiel: { nom: "Bleu ciel", couleur: "#b8d3df", dessin: (g, w, h) => uni(g, w, h, 200, 35, 79, .03) },
  moutarde: { nom: "Jaune moutarde", couleur: "#c99a3c", dessin: (g, w, h) => uni(g, w, h, 40, 55, 51, .05) },
  calacatta: { nom: "Marbre veiné or", couleur: "#f0ece4", dessin: (g, w, h) => { uni(g, w, h, 40, 10, 94, .02); veines(g, w, h, "rgba(120,110,100,.4)", 3); veines(g, w, h, "rgba(190,150,80,.5)", 3); } },
  marbreVert: { nom: "Marbre vert", couleur: "#24463a", dessin: (g, w, h) => { uni(g, w, h, 155, 32, 21, .03); veines(g, w, h, "rgba(220,230,220,.35)", 4); } },
  zelligeRose: { nom: "Zellige rose", couleur: "#dcaea0", dessin: (g, w, h) => uni(g, w, h, 12, 42, 72 + Math.random() * 10, .08) },
  zelligeBleu: { nom: "Zellige bleu", couleur: "#2f5d86", dessin: (g, w, h) => uni(g, w, h, 208, 45, 30 + Math.random() * 14, .08) },
  zelligeNoir: { nom: "Zellige noir", couleur: "#232425", dessin: (g, w, h) => uni(g, w, h, 220, 5, 12 + Math.random() * 8, .08) },
  terrazzoNoir: { nom: "Terrazzo noir", couleur: "#2b2b2c", dessin: (g, w, h) => { uni(g, w, h, 220, 4, 16, .02);
    for (let i = 0; i < w * h / 600; i++) { g.fillStyle = ["#f1eee8", "#a39d94", "#c9a98a", "#6f6a64"][i % 4]; g.beginPath(); g.ellipse(Math.random() * w, Math.random() * h, 1.5 + Math.random() * 4, 1.5 + Math.random() * 3, Math.random() * 3, 0, TAU); g.fill(); } } },
  cimentNoir: { nom: "Ciment noir et blanc", couleur: "#1f1f21", dessin: (g, w, h) => motifCiment(g, w, h, "#efebe3", "#1f1f21") },
  cimentTerracotta: { nom: "Ciment terracotta", couleur: "#b8684a", dessin: (g, w, h) => motifCiment(g, w, h, "#efe6da", "#b8684a") },
  marbreGris: { nom: "Marbre gris", couleur: "#c9c9cb", dessin: (g, w, h) => { uni(g, w, h, 220, 4, 78, .02); veines(g, w, h, "rgba(90,90,95,.45)", 4); } },
  onyx: { nom: "Onyx miel", couleur: "#d9a865", dessin: (g, w, h) => { uni(g, w, h, 36, 55, 66, .03); veines(g, w, h, "rgba(255,240,210,.5)", 5); } },
  travertinGris: { nom: "Travertin gris", couleur: "#9e9890", dessin: (g, w, h) => { uni(g, w, h, 30, 6, 60, .07); veines(g, w, h, "rgba(70,65,60,.18)", 3); } },
  pierreBleue: { nom: "Pierre bleue", couleur: "#525a63", dessin: (g, w, h) => uni(g, w, h, 210, 10, 36, .1) },
  pierreNoire: { nom: "Pierre noire", couleur: "#2a2a2a", dessin: (g, w, h) => uni(g, w, h, 30, 3, 17, .12) },
  grisPerle: { nom: "Gris perle", couleur: "#dadcdf", dessin: (g, w, h) => uni(g, w, h, 220, 6, 86, .02) },
  grisCiment: { nom: "Gris ciment", couleur: "#b2afa9", dessin: (g, w, h) => uni(g, w, h, 40, 4, 70, .08) },
  betonCire: { nom: "Effet béton ciré", couleur: "#bdb7ae", dessin: (g, w, h) => uni(g, w, h, 35, 6, 72, .14) },
  lin: { nom: "Lin", couleur: "#e2d8c6", dessin: (g, w, h) => uni(g, w, h, 36, 25, 84, .03) },
  lavande: { nom: "Lavande", couleur: "#c6c0d8", dessin: (g, w, h) => uni(g, w, h, 255, 20, 80, .03) },
  corail: { nom: "Corail", couleur: "#e39a87", dessin: (g, w, h) => uni(g, w, h, 10, 60, 71, .04) },
  ocre: { nom: "Ocre", couleur: "#c9883e", dessin: (g, w, h) => uni(g, w, h, 32, 56, 52, .05) },
  bordeaux: { nom: "Bordeaux", couleur: "#6b2a35", dessin: (g, w, h) => uni(g, w, h, 350, 44, 29, .05) },
  emeraude: { nom: "Vert émeraude", couleur: "#1f6b52", dessin: (g, w, h) => uni(g, w, h, 158, 55, 27, .05) },
  bleuCanard: { nom: "Bleu canard", couleur: "#1e5f6b", dessin: (g, w, h) => uni(g, w, h, 189, 56, 27, .05) },
  bleuKlein: { nom: "Bleu roi", couleur: "#27408b", dessin: (g, w, h) => uni(g, w, h, 225, 56, 35, .04) },
  zelligeMoutarde: { nom: "Zellige moutarde", couleur: "#c99a3c", dessin: (g, w, h) => uni(g, w, h, 42, 58, 46 + Math.random() * 10, .08) },
  zelligeTerracotta: { nom: "Zellige terracotta", couleur: "#b8684a", dessin: (g, w, h) => uni(g, w, h, 16, 48, 46 + Math.random() * 8, .08) },
  zelligeGris: { nom: "Zellige gris", couleur: "#9a9894", dessin: (g, w, h) => uni(g, w, h, 40, 4, 58 + Math.random() * 10, .08) },
  zelligeBeige: { nom: "Zellige beige", couleur: "#d8c6a8", dessin: (g, w, h) => uni(g, w, h, 36, 32, 74 + Math.random() * 8, .08) },
  cimentVert: { nom: "Ciment vert", couleur: "#3f6b55", dessin: (g, w, h) => motifCiment(g, w, h, "#efebe3", "#3f6b55") },
  cimentGris: { nom: "Ciment gris", couleur: "#8a8a88", dessin: (g, w, h) => motifCiment(g, w, h, "#efebe3", "#8a8a88") },
  cimentRose: { nom: "Ciment rose", couleur: "#d9a3a0", dessin: (g, w, h) => motifCiment(g, w, h, "#f3ece4", "#d9a3a0") },
  boisGris: { nom: "Bois grisé", couleur: "#a39a8f", dessin: (g, w, h) => bois(g, w, h, 30, 8, 60) },
  boisMiel: { nom: "Chêne miel", couleur: "#c4914f", dessin: (g, w, h) => bois(g, w, h, 32, 55, 55) },
  boisClair: { nom: "Bois clair", couleur: "#d9c3a0", dessin: (g, w, h) => bois(g, w, h, 34, 36, 70) },
  bois: { nom: "Chêne", couleur: "#b58a5c", dessin: (g, w, h) => bois(g, w, h, 30, 45, 50) },
  noyer: { nom: "Noyer", couleur: "#5b4636", dessin: (g, w, h) => bois(g, w, h, 25, 30, 28) }
};
function motifCiment(g, w, h, fond, motif) {
  g.fillStyle = fond; g.fillRect(0, 0, w, h); g.fillStyle = motif;
  for (let i = 0; i < 4; i++) { g.save(); g.translate(w / 2, h / 2); g.rotate(i * Math.PI / 2); g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(w * .25, -h * .05, w * .5, -h * .5); g.quadraticCurveTo(w * .05, -h * .25, 0, 0); g.fill(); g.restore(); }
  g.beginPath(); g.arc(w / 2, h / 2, w * .1, 0, TAU); g.fill();
}
function uni(g, w, h, teinte, sat, lum, ampl) {
  const l = lum + (Math.random() - .5) * 4;
  g.fillStyle = `hsl(${teinte},${sat}%,${l}%)`; g.fillRect(0, 0, w, h);
  for (let i = 0; i < w * h / 40; i++) { const v = (Math.random() - .5) * ampl; g.fillStyle = `rgba(${v > 0 ? "255,255,255" : "0,0,0"},${Math.abs(v)})`; g.fillRect(Math.random() * w, Math.random() * h, 2, 2); }
}
function bois(g, w, h, teinte, sat, lum) {
  uni(g, w, h, teinte, sat + Math.random() * 6, lum + Math.random() * 8, .03);
  g.strokeStyle = "rgba(60,40,20,.18)";
  for (let i = 0; i < 14; i++) { g.lineWidth = 1 + Math.random(); g.beginPath(); const y = Math.random() * h; g.moveTo(0, y); g.bezierCurveTo(w / 3, y + 6, 2 * w / 3, y - 6, w, y + 2); g.stroke(); }
}
function veines(g, w, h, c, n) {
  g.strokeStyle = c;
  for (let i = 0; i < n; i++) { g.lineWidth = .5 + Math.random() * 1.6; g.beginPath(); let x = Math.random() * w, y = 0; g.moveTo(x, y); while (y < h) { x += (Math.random() - .5) * w * .15; y += h * .06; g.lineTo(x, y); } g.stroke(); }
}
// formats de carreaux (m) ; « décalé » pour la pose en quinconce
const FORMATS = {
  "5x5": { nom: "Mosaïque 5×5", t: [.05, .05] },
  "7.5x15": { nom: "Métro 7,5×15", t: [.15, .075], decale: true },
  "10x10": { nom: "Zellige 10×10", t: [.1, .1] },
  "15x15": { nom: "15×15", t: [.15, .15] },
  "7.5x30v": { nom: "Baguette verticale 7,5×30", t: [.075, .3] },
  "7.5x30": { nom: "Métro long 7,5×30", t: [.3, .075], decale: true },
  "45x90": { nom: "45×90", t: [.9, .45] },
  "20x20": { nom: "20×20", t: [.2, .2] },
  "30x30": { nom: "30×30", t: [.3, .3] },
  "30x60": { nom: "30×60", t: [.6, .3] },
  "30x60d": { nom: "30×60 décalé", t: [.6, .3], decale: true },
  "60x60": { nom: "60×60", t: [.6, .6] },
  "60x120": { nom: "60×120", t: [.6, 1.2] },
  "80x80": { nom: "80×80", t: [.8, .8] },
  "120x120": { nom: "120×120", t: [1.2, 1.2] },
  "2.5x2.5": { nom: "Mosaïque 2,5×2,5", t: [.025, .025] },
  "10x20": { nom: "10×20", t: [.2, .1] },
  "6.5x20v": { nom: "Baguette verticale 6,5×20", t: [.065, .2] },
  "20x40": { nom: "20×40", t: [.4, .2] },
  "25x75": { nom: "25×75", t: [.75, .25] },
  "30x90": { nom: "30×90", t: [.9, .3] },
  "100x100": { nom: "100×100", t: [1, 1] },
  "60x120v": { nom: "60×120 vertical", t: [.6, 1.2] },
  "15x90": { nom: "Lames 15×90", t: [.9, .15], decale: true },
  "20x180": { nom: "Lames 20×180", t: [1.8, .2], decale: true },
  "parquet": { nom: "Lames 20×120", t: [1.2, .2], decale: true },
  "uni": { nom: "Sans joint (béton ciré, résine)", t: [2, 2], sansJoint: true }
};
const JOINTS = { blanc: "#f1efea", gris: "#9c9790", noir: "#2b2b2b" };

const cacheTex = new Map();
function textureCarrelage(matiere, format, joint) {
  const cle = `${matiere}|${format}|${joint}`;
  if (cacheTex.has(cle)) return cacheTex.get(cle);
  const F = FORMATS[format] || FORMATS["60x60"], M = MATIERES[matiere] || MATIERES.blanc;
  const [tw, th] = F.t, nx = F.sansJoint ? 1 : 4, ny = F.sansJoint ? 1 : 4;
  const ppm = Math.min(400, 1024 / (tw * nx), 1024 / (th * ny));
  const W = Math.round(tw * nx * ppm), H = Math.round(th * ny * ppm);
  const c = document.createElement("canvas"); c.width = W; c.height = H;
  const g = c.getContext("2d"), pw = tw * ppm, ph = th * ppm;
  const tuile = document.createElement("canvas");
  for (let j = 0; j < ny; j++) for (let i = -1; i < nx; i++) {
    const x = (i + (F.decale && j % 2 ? .5 : 0)) * pw, y = j * ph;
    if (x >= W || x + pw <= 0) continue;
    tuile.width = Math.max(1, Math.round(pw)); tuile.height = Math.max(1, Math.round(ph));
    M.dessin(tuile.getContext("2d"), tuile.width, tuile.height);
    g.drawImage(tuile, x, y);
    if (x + pw > W) g.drawImage(tuile, x - W, y);
    if (x < 0) g.drawImage(tuile, x + W, y);
  }
  if (!F.sansJoint) {
    g.strokeStyle = JOINTS[joint] || JOINTS.gris; g.lineWidth = Math.max(1.5, .003 * ppm);
    for (let j = 0; j <= ny; j++) { g.beginPath(); g.moveTo(0, j * ph); g.lineTo(W, j * ph); g.stroke(); }
    for (let j = 0; j < ny; j++) for (let i = 0; i <= nx; i++) {
      const x = ((i + (F.decale && j % 2 ? .5 : 0)) * pw) % W;
      g.beginPath(); g.moveTo(x, j * ph); g.lineTo(x, (j + 1) * ph); g.stroke();
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8;
  t.userData = { motif: [tw * nx, th * ny] };
  cacheTex.set(cle, t);
  return t;
}
function materiauCarrelage(rev, largeur, hauteur, sol = false) {
  const base = textureCarrelage(rev.matiere, rev.format, rev.joint);
  const t = base.clone(); t.needsUpdate = true;
  t.repeat.set(largeur / base.userData.motif[0], hauteur / base.userData.motif[1]);
  const brillant = ["blanc", "marbre", "marbreNoir", "calacatta", "marbreVert", "bleu", "bleuNuit", "bleuCiel", "creme", "zelligeBlanc", "zelligeVert", "zelligeRose", "zelligeBleu", "zelligeNoir", "rose"].includes(rev.matiere);
  return new THREE.MeshStandardMaterial({ map: t, bumpMap: t, bumpScale: sol ? 1.2 : .9, roughness: sol ? .5 : (brillant ? .14 : .42), envMapIntensity: brillant ? .45 : .2 });
}
const ROBINETTERIE = {
  noir: { nom: "Noir mat", couleur: "#1d1d1f", c: 0x1d1d1f, m: .3, r: .5 },
  chrome: { nom: "Chrome", couleur: "#d4d7da", c: 0xd4d7da, m: .95, r: .1 },
  inox: { nom: "Inox brossé", couleur: "#b9bcbf", c: 0xb9bcbf, m: .9, r: .35 },
  dore: { nom: "Doré brossé", couleur: "#c9a35a", c: 0xc9a35a, m: .95, r: .3 },
  cuivre: { nom: "Cuivre rosé", couleur: "#b87352", c: 0xb87352, m: .95, r: .3 },
  gun: { nom: "Gris métal", couleur: "#4a4d52", c: 0x4a4d52, m: .9, r: .3 },
  blanc: { nom: "Blanc mat", couleur: "#f2f2f0", c: 0xf2f2f0, m: .1, r: .5 }
};
function appliquerRobinetterie(cle) { const r = ROBINETTERIE[cle] || ROBINETTERIE.noir; MAT.robinet.color.setHex(r.c); MAT.robinet.metalness = r.m; MAT.robinet.roughness = r.r; MAT.robinet.envMapIntensity = r.m > .5 ? 1 : .3; }
const PEINTURES = { "#ffffff": "Blanc pur", "#f3f1ec": "Blanc cassé", "#ece4d6": "Ivoire", "#e6ddd0": "Lin", "#d8cbb8": "Beige sable", "#bfb2a3": "Grège", "#9c8f80": "Taupe",
  "#dcdcd8": "Gris perle", "#b9bab6": "Gris clair", "#8a8f93": "Gris orage", "#4d5257": "Anthracite", "#232427": "Noir",
  "#cfd6cf": "Vert d'eau", "#b4bfa6": "Vert sauge", "#7d8a6a": "Vert olive", "#4a5a52": "Vert forêt", "#285a4b": "Vert émeraude",
  "#c9d3db": "Bleu brume", "#9fb8c8": "Bleu ciel", "#4f7c8a": "Bleu canard", "#2c3440": "Bleu nuit",
  "#efd9d2": "Rose pâle", "#d9c3b5": "Rose poudré", "#c98f7a": "Terracotta", "#a4553f": "Rouge brique", "#6b2a35": "Bordeaux",
  "#e9d8b0": "Jaune paille", "#d6aa4f": "Jaune moutarde", "#c9b9d6": "Lavande" };

/* =================== Matériaux des objets =================== */
const MAT = {
  blanc: new THREE.MeshStandardMaterial({ color: 0xf6f5f2, roughness: .3 }),
  ceramique: new THREE.MeshStandardMaterial({ color: 0xfbfbfa, roughness: .12 }),
  noir: new THREE.MeshStandardMaterial({ color: 0x1d1d1f, roughness: .45, metalness: .3 }),
  chrome: new THREE.MeshStandardMaterial({ color: 0xc9cccf, roughness: .15, metalness: .9 }),
  robinet: new THREE.MeshStandardMaterial({ color: 0x1d1d1f, roughness: .45, metalness: .3 }),
  verre: new THREE.MeshPhysicalMaterial({ color: 0xcfe6ea, roughness: .04, metalness: .1, transparent: true, opacity: .32, envMapIntensity: 1.2, side: THREE.DoubleSide }),
  vitre: new THREE.MeshStandardMaterial({ color: 0xbfe0f0, emissive: 0xa6d4ec, emissiveIntensity: .6, transparent: true, opacity: .75 }),
  miroir: new THREE.MeshStandardMaterial({ color: 0xd7dfe2, roughness: .08, metalness: .15, emissive: 0x2a3033, emissiveIntensity: .25 }),
  led: new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xfff4dc, emissiveIntensity: 1.6 }),
  receveurNoir: new THREE.MeshStandardMaterial({ color: 0x2b2b2d, roughness: .7 }),
  receveurBlanc: new THREE.MeshStandardMaterial({ color: 0xf1f0ec, roughness: .5 }),
  eauChaude: new THREE.MeshStandardMaterial({ color: 0xd03a2e, roughness: .4 }),
  eauFroide: new THREE.MeshStandardMaterial({ color: 0x2f6fd0, roughness: .4 }),
  pvc: new THREE.MeshStandardMaterial({ color: 0x8d9196, roughness: .6 }),
  gaine: new THREE.MeshStandardMaterial({ color: 0xf08a24, roughness: .6 }),
  plastique: new THREE.MeshStandardMaterial({ color: 0xf8f8f6, roughness: .4 }),
  lingeFace: new THREE.MeshStandardMaterial({ color: 0x404448, roughness: .2, metalness: .5 }),
  fond: new THREE.MeshStandardMaterial({ color: 0xe6ecef, roughness: .15 })
};
const BOIS = { "#a97c52": "Chêne", "#d9c3a0": "Bois clair", "#7a5634": "Chêne foncé", "#5b4636": "Noyer", "#f2f0ec": "Blanc", "#c9c6c0": "Gris clair", "#d8cbb6": "Beige", "#55606a": "Gris bleu", "#2c3a4f": "Bleu nuit", "#7b8a74": "Vert sauge", "#3f5446": "Vert forêt", "#77744f": "Kaki", "#d9b7ab": "Rose", "#b5654a": "Terracotta", "#1f1f21": "Noir" };
const matBois = c => new THREE.MeshStandardMaterial({ color: new THREE.Color(c), roughness: .55 });
const boite = (w, h, d, m) => { const x = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); x.castShadow = x.receiveShadow = true; return x; };
const cyl = (r, h, m, s = 16) => { const x = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, s), m); x.castShadow = true; return x; };
const pose = (o, x, y, z) => { o.position.set(x, y, z); return o; };
function tube(a, b, r, m) {
  const v = new THREE.Vector3().subVectors(b, a), l = v.length();
  const t = cyl(r, l, m, 10); t.position.copy(a).addScaledVector(v, .5);
  t.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), v.normalize()); return t;
}

/* =================== Catalogue des éléments ===================
   Chaque modèle est dessiné centré en x, dos vers z- , posé au sol (y = 0).
   pose : "sol", "mur" (contre le mur le plus proche), "dansMur" (porte, fenêtre, réseaux : caché avec son mur), "plafond". */
const CAT = {
  decroche: { nom: "Décroché (gaine, coffrage)", groupe: "Structure", pose: "sol", dims: [40, 30, 250], tailles: [[30, 30], [40, 30], [60, 20], [100, 60], [120, 90]], options: { travaux: ["Existant", "À créer (coffrage)"] },
    faire(w, d) { // du sol au plafond, habillé comme les murs (gaine, poteau, coffrage, retour de mur pour une pièce en L)
      const g = new THREE.Group(), h = AMBIANCE.h, hf = AMBIANCE.faience === "plafond" ? h : AMBIANCE.faience === "120" ? 1.2 : 0;
      const peint = new THREE.MeshStandardMaterial({ color: new THREE.Color(AMBIANCE.peinture), roughness: .9 });
      const face = (larg, haut) => AMBIANCE.murs && haut > 0 ? materiauCarrelage(AMBIANCE.murs, larg, haut) : peint;
      if (hf > 0) { const b = new THREE.Mesh(new THREE.BoxGeometry(w, hf, d), [face(d, hf), face(d, hf), peint, peint, face(w, hf), face(w, hf)]); b.position.y = hf / 2; b.castShadow = b.receiveShadow = true; g.add(b); }
      if (hf < h) { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h - hf, d), peint); b.position.y = hf + (h - hf) / 2; b.castShadow = b.receiveShadow = true; g.add(b); }
      return g; } },
  cloison: { nom: "Cloison placo", groupe: "Structure", pose: "sol", dims: [200, 7, 250], tailles: [[100, 7], [150, 7], [200, 7], [250, 7], [300, 10]],
    options: { travaux: ["À créer (placo)", "Existante"] },
    faire(w, d, h, o) { return CAT.decroche.faire(w, d, h, o); } }, // dessinée comme un mur : carrelée ou peinte
  demolition: { nom: "Mur à démolir", groupe: "Structure", pose: "sol", dims: [200, 10, 250], tailles: [[100, 10], [200, 10], [300, 10], [200, 20]],
    faire(w, d) { // en transparent, avec ses arêtes : ce mur disparaîtra
      const g = new THREE.Group(), h = AMBIANCE.h;
      const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshStandardMaterial({ color: 0x8a8580, transparent: true, opacity: .22, depthWrite: false }));
      b.position.y = h / 2; g.add(b);
      const a = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(w, h, d)), new THREE.LineBasicMaterial({ color: 0x1b1a18 }));
      a.position.y = h / 2; g.add(a);
      const croix = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-w / 2, 0, d / 2 + .002), new THREE.Vector3(w / 2, h, d / 2 + .002), new THREE.Vector3(w / 2, 0, d / 2 + .002), new THREE.Vector3(-w / 2, h, d / 2 + .002)]);
      g.add(new THREE.LineSegments(croix, new THREE.LineBasicMaterial({ color: 0x1b1a18 }))); return g; } },
  douche: { nom: "Douche à l'italienne", groupe: "Sanitaires", pose: "sol", dims: [120, 90, 200], tailles: [[90, 90], [120, 80], [120, 90], [140, 90], [160, 90]], options: { receveur: ["Noir", "Blanc", "Carrelé"] },
    faire(w, d, h, o) {
      const g = new THREE.Group();
      const m = o.receveur === "Blanc" ? MAT.receveurBlanc : o.receveur === "Carrelé" ? null : MAT.receveurNoir;
      if (m) g.add(pose(boite(w, .03, d, m), 0, .015, 0));
      g.add(pose(boite(w * .6, .005, .05, MAT.chrome), 0, .033, -d / 2 + .1));
      // paroi vitrée fixe : sur un côté (droite ou gauche) ou devant ; « placer » montre celle qui donne sur la pièce
      [["droite", w / 2, 0, .01, d], ["gauche", -w / 2, 0, .01, d], ["devant", -w * .2, d / 2, w * .6, .01]].forEach(([nom, x, z, lx, lz]) => {
        const p2 = new THREE.Group(); p2.userData.paroi = nom;
        p2.add(pose(new THREE.Mesh(new THREE.BoxGeometry(lx, h, lz), MAT.verre), x, h / 2, z));
        p2.add(pose(boite(Math.max(lx, .02), .02, Math.max(lz, .02), MAT.noir), x, h, z));
        g.add(p2);
      });
      g.add(pose(cyl(.012, 1.1, MAT.robinet), -w * .1, 1.45, -d / 2 + .03));
      const bras = cyl(.01, .3, MAT.robinet); bras.rotation.x = Math.PI / 2; g.add(pose(bras, -w * .1, 2, -d / 2 + .16));
      g.add(pose(boite(.25, .012, .25, MAT.robinet), -w * .1, 1.99, -d / 2 + .28));
      g.add(pose(boite(.18, .06, .05, MAT.robinet), -w * .1, 1.05, -d / 2 + .03));
      return g; } },
  baignoire: { nom: "Baignoire", groupe: "Sanitaires", pose: "mur", dims: [170, 75, 55], tailles: [[160, 70], [170, 70], [170, 75], [180, 80]],
    faire(w, d, h) {
      const g = new THREE.Group();
      g.add(pose(boite(w, h, d, MAT.ceramique), 0, h / 2, 0));
      g.add(pose(new THREE.Mesh(new THREE.BoxGeometry(w - .14, .02, d - .14), MAT.fond), 0, h + .001, 0));
      g.add(pose(boite(.05, .12, .05, MAT.robinet), -w / 2 + .1, h + .06, -d / 2 + .05));
      return g; } },
  ilot: { nom: "Baignoire îlot", groupe: "Sanitaires", pose: "sol", dims: [170, 80, 60], tailles: [[160, 75], [170, 80], [180, 85]],
    faire(w, d, h) {
      const g = new THREE.Group();
      const corps = new THREE.Mesh(new THREE.CapsuleGeometry(d / 2, Math.max(.01, w - d), 8, 24), MAT.ceramique);
      corps.rotation.z = Math.PI / 2; corps.scale.set(h / d, 1, 1); corps.position.y = h / 2; corps.castShadow = true; g.add(corps);
      const fond = new THREE.Mesh(new THREE.CapsuleGeometry(d / 2 - .06, Math.max(.01, w - d), 8, 24), MAT.fond);
      fond.rotation.z = Math.PI / 2; fond.scale.set(.04, 1, 1); fond.position.y = h - .005; g.add(fond);
      g.add(pose(cyl(.015, 1, MAT.robinet), w / 2 + .12, .5, 0));
      return g; } },
  laveMains: { nom: "Lave-mains", groupe: "Sanitaires", pose: "mur", dims: [40, 25, 15], tailles: [[35, 22], [40, 25], [45, 25]],
    faire(w, d) { const g = new THREE.Group(); g.add(pose(boite(w, .12, d, MAT.ceramique), 0, .8, 0)); g.add(pose(cyl(.01, .15, MAT.robinet), 0, .92, -d / 2 + .04)); return g; } },
  wc: { nom: "WC suspendu", groupe: "Sanitaires", pose: "mur", dims: [37, 55, 40],
    faire(w, d) {
      const g = new THREE.Group();
      g.add(pose(boite(.5, 1.1, .2, MAT.blanc), 0, .55, -d / 2 + .1));
      g.add(pose(boite(.22, .15, .01, MAT.noir), 0, 1, -d / 2 + .205));
      const cuv = new THREE.Mesh(new THREE.CapsuleGeometry(w / 2 - .02, Math.max(.01, d - .45), 6, 16), MAT.ceramique);
      cuv.rotation.x = Math.PI / 2; cuv.scale.set(1, 1, .7); cuv.position.set(0, .37, d / 2 - .26); cuv.castShadow = true; g.add(cuv);
      g.add(pose(boite(w, .025, d - .1, MAT.blanc), 0, .46, .05));
      return g; } },
  wcSol: { nom: "WC au sol", groupe: "Sanitaires", pose: "mur", dims: [37, 65, 80],
    faire(w, d) {
      const g = new THREE.Group();
      g.add(pose(boite(.4, .38, .17, MAT.ceramique), 0, .6, -d / 2 + .09));
      g.add(pose(cyl(.1, .38, MAT.ceramique, 20), 0, .19, .02));
      const cuv = new THREE.Mesh(new THREE.CapsuleGeometry(w / 2 - .02, Math.max(.01, d - .55), 6, 16), MAT.ceramique);
      cuv.rotation.x = Math.PI / 2; cuv.scale.set(1, 1, .6); cuv.position.set(0, .36, .05); g.add(cuv);
      return g; } },
  vasque: { nom: "Meuble vasque", groupe: "Meubles", pose: "mur", dims: [80, 46, 55], tailles: [[60, 46], [80, 46], [100, 46]], options: { finition: Object.keys(BOIS), style: ["Suspendu", "Sur pieds"], facade: ["2 tiroirs", "1 tiroir", "Portes", "Sans poignée"] }, faire: (w, d, h, o) => meuble(w, d, h, 1, o) },
  double: { nom: "Double vasque", groupe: "Meubles", pose: "mur", dims: [120, 46, 55], tailles: [[120, 46], [140, 46], [160, 46]], options: { finition: Object.keys(BOIS), style: ["Suspendu", "Sur pieds"], facade: ["2 tiroirs", "1 tiroir", "Portes", "Sans poignée"] }, faire: (w, d, h, o) => meuble(w, d, h, 2, o) },
  vasquePoser: { nom: "Plan + vasque à poser", groupe: "Meubles", pose: "mur", dims: [100, 46, 4], tailles: [[80, 46], [100, 46], [120, 46]], options: { finition: Object.keys(BOIS) },
    faire(w, d, h, o) {
      const g = new THREE.Group();
      g.add(pose(boite(w, .04, d, matBois(o.finition || "#a97c52")), 0, .86, 0));
      g.add(pose(cyl(.19, .14, MAT.noir, 32), 0, .95, .02));
      g.add(pose(cyl(.16, .02, MAT.receveurNoir, 32), 0, 1.015, .02));
      g.add(pose(cyl(.012, .3, MAT.robinet), 0, 1.03, -d / 2 + .04));
      return g; } },
  colonne: { nom: "Colonne de rangement", groupe: "Meubles", pose: "mur", dims: [40, 33, 170], tailles: [[30, 30], [40, 33], [50, 35]], options: { finition: Object.keys(BOIS) },
    faire(w, d, h, o) { const g = new THREE.Group(); g.add(pose(boite(w, h, d, matBois(o.finition || "#a97c52")), 0, h / 2 + .15, 0));
      g.add(pose(boite(.015, .2, .01, MAT.robinet), w / 2 - .05, h / 2 + .15, d / 2 + .005)); return g; } },
  armoire: { nom: "Armoire de toilette", groupe: "Meubles", pose: "mur", dims: [80, 15, 70], tailles: [[60, 15], [80, 15], [100, 15], [120, 15]], hauteur: 115,
    faire(w, d, h) { const g = new THREE.Group(); g.add(pose(boite(w, h, d, MAT.blanc), 0, h / 2, 0));
      g.add(pose(new THREE.Mesh(new THREE.PlaneGeometry(w - .02, h - .02), MAT.miroir), 0, h / 2, d / 2 + .002)); g.add(pose(boite(w, .02, d, MAT.led), 0, -.01, 0)); return g; } },
  meubleHaut: { nom: "Meuble haut", groupe: "Meubles", pose: "mur", dims: [40, 30, 70], tailles: [[30, 30], [40, 30], [60, 30]], hauteur: 130, options: { finition: Object.keys(BOIS) },
    faire(w, d, h, o) { const g = new THREE.Group(); g.add(pose(boite(w, h, d, matBois(o.finition || "#a97c52")), 0, h / 2, 0)); return g; } },
  etagere: { nom: "Étagère / niche", groupe: "Meubles", pose: "mur", dims: [60, 20, 30], hauteur: 120, options: { finition: Object.keys(BOIS) },
    faire(w, d, h, o) { const g = new THREE.Group(), m = matBois(o.finition || "#a97c52");
      g.add(pose(boite(w, .03, d, m), 0, 0, 0)); g.add(pose(boite(w, .03, d, m), 0, h, 0)); g.add(pose(boite(.03, h, d, m), -w / 2, h / 2, 0)); g.add(pose(boite(.03, h, d, m), w / 2, h / 2, 0)); return g; } },
  banc: { nom: "Banc / tabouret", groupe: "Meubles", pose: "sol", dims: [40, 30, 45], options: { finition: Object.keys(BOIS) },
    faire(w, d, h, o) { const g = new THREE.Group(), m = matBois(o.finition || "#a97c52"); g.add(pose(boite(w, .04, d, m), 0, h, 0));
      [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) => g.add(pose(cyl(.015, h, m), a * (w / 2 - .03), h / 2, b * (d / 2 - .03)))); return g; } },
  laveLinge: { nom: "Lave-linge", groupe: "Équipements", pose: "mur", dims: [60, 60, 85],
    faire(w, d, h) { const g = new THREE.Group(); g.add(pose(boite(w, h, d, MAT.plastique), 0, h / 2, 0));
      g.add(pose(new THREE.Mesh(new THREE.CircleGeometry(.19, 32), MAT.lingeFace), 0, h * .45, d / 2 + .002)); return g; } },
  radiateur: { nom: "Sèche-serviettes", groupe: "Équipements", pose: "mur", dims: [50, 8, 120], tailles: [[50, 8], [60, 8]], hauteur: 40, options: { couleur: ["Blanc", "Comme la robinetterie"] },
    faire(w, d, h, o) { const g = new THREE.Group(), m = o?.couleur === "Blanc" ? MAT.blanc : MAT.robinet;
      [-w / 2 + .02, w / 2 - .02].forEach(x => g.add(pose(cyl(.015, h, m), x, h / 2, 0)));
      for (let y = .05; y < h; y += .085) { const b = cyl(.01, w - .04, m); b.rotation.z = Math.PI / 2; g.add(pose(b, 0, y, 0)); }
      return g; } },
  radiateurEau: { nom: "Radiateur", groupe: "Équipements", pose: "mur", dims: [80, 10, 60], hauteur: 15,
    faire(w, d, h) { const g = new THREE.Group(); for (let x = -w / 2 + .03; x < w / 2; x += .06) g.add(pose(boite(.045, h, d, MAT.blanc), x + .02, h / 2, 0)); return g; } },
  miroir: { nom: "Miroir rond lumineux", groupe: "Équipements", pose: "mur", dims: [60, 3, 60], tailles: [[50, 3], [60, 3], [80, 3]], hauteur: 130,
    faire(w) { const g = new THREE.Group(), r = w / 2;
      g.add(pose(new THREE.Mesh(new THREE.TorusGeometry(r, .012, 8, 48), MAT.led), 0, r, 0));
      g.add(pose(new THREE.Mesh(new THREE.CircleGeometry(r - .01, 48), MAT.miroir), 0, r, .005));
      g.add(pose(new THREE.PointLight(0xfff1d6, .5, 1.5), 0, r, .2)); return g; } },
  miroirRect: { nom: "Miroir rectangulaire", groupe: "Équipements", pose: "mur", dims: [100, 3, 70], tailles: [[80, 3], [100, 3], [120, 3], [140, 3]], hauteur: 115,
    faire(w, d, h) { const g = new THREE.Group(); g.add(pose(new THREE.Mesh(new THREE.PlaneGeometry(w, h), MAT.miroir), 0, h / 2, .005)); g.add(pose(boite(w, .015, .02, MAT.led), 0, h + .01, 0)); return g; } },
  porte: { nom: "Porte", groupe: "Ouvertures", pose: "dansMur", dims: [83, 4, 204], tailles: [[73, 4], [83, 4], [93, 4]], options: { travaux: ["Existante", "Nouvelle (à poser)"], ouverture: ["Battante", "Coulissante"] },
    faire(w, d, h, o) { const g = new THREE.Group(), cadre = MAT.blanc, coul = o.ouverture === "Coulissante";
      g.add(pose(boite(.05, h + .05, .04, cadre), -w / 2 - .025, (h + .05) / 2, .01)); g.add(pose(boite(.05, h + .05, .04, cadre), w / 2 + .025, (h + .05) / 2, .01));
      g.add(pose(boite(w + .1, .05, .04, cadre), 0, h + .025, .01));
      g.add(pose(boite(w - .01, h - .01, .035, new THREE.MeshStandardMaterial({ color: 0xeeebe5, roughness: .5 })), coul ? w * .25 : 0, h / 2, coul ? .05 : .015));
      g.add(pose(boite(.02, .02, .08, MAT.noir), (coul ? w * .25 : 0) + w / 2 - .08, 1.02, .05));
      return g; } },
  fenetre: { nom: "Fenêtre", groupe: "Ouvertures", pose: "dansMur", dims: [60, 4, 75], tailles: [[45, 4], [60, 4], [80, 4], [100, 4]], hauteur: 120,
    options: { travaux: ["Existante", "Nouvelle (à poser)"], modele: ["Battante", "Oscillo-battante", "Fixe", "Pavés de verre"] },
    faire(w, d, h, o) { const g = new THREE.Group(), m = o?.modele || "Battante";
      if (m === "Pavés de verre") { // briques de verre de 19 cm
        const n = Math.max(1, Math.round(w / .19)), r = Math.max(1, Math.round(h / .19)), pw = w / n, ph = h / r;
        for (let i = 0; i < n; i++) for (let j = 0; j < r; j++) g.add(pose(boite(pw - .012, ph - .012, .05, MAT.vitre), -w / 2 + pw * (i + .5), ph * (j + .5), .02));
        return g;
      }
      g.add(pose(new THREE.Mesh(new THREE.PlaneGeometry(w, h), MAT.vitre), 0, h / 2, .01));
      [0, h].forEach(y => g.add(pose(boite(w + .06, .05, .05, MAT.blanc), 0, y, .015)));
      [-w / 2, w / 2].concat(m === "Fixe" || w < .55 ? [] : [0]).forEach(x => g.add(pose(boite(.05, h, .05, MAT.blanc), x, h / 2, .015)));
      if (m !== "Fixe") g.add(pose(boite(.02, .12, .03, MAT.robinet), m === "Oscillo-battante" || w < .55 ? w / 2 - .06 : .05, h / 2, .05));
      g.add(pose(boite(w + .1, .03, .12, MAT.blanc), 0, -.02, .05));
      return g; } },
  arrivees: { nom: "Arrivées eau chaude / froide", groupe: "Réseaux", pose: "dansMur", dims: [20, 2, 100], hauteur: 0,
    faire(w, d, h) { const g = new THREE.Group();
      g.add(tube(new THREE.Vector3(-w / 2, .05, 0), new THREE.Vector3(-w / 2, h, 0), .009, MAT.eauChaude));
      g.add(tube(new THREE.Vector3(w / 2, .08, 0), new THREE.Vector3(w / 2, h, 0), .009, MAT.eauFroide));
      g.add(tube(new THREE.Vector3(-w / 2, .05, 0), new THREE.Vector3(-w / 2 - .6, .05, 0), .009, MAT.eauChaude));
      g.add(tube(new THREE.Vector3(w / 2, .08, 0), new THREE.Vector3(w / 2 - .6 - w, .08, 0), .009, MAT.eauFroide));
      [-w / 2, w / 2].forEach((x, i) => g.add(pose(cyl(.02, .04, i ? MAT.eauFroide : MAT.eauChaude), x, h, .015)));
      return g; } },
  evacuation: { nom: "Évacuation PVC", groupe: "Réseaux", pose: "dansMur", dims: [60, 4, 40], options: { diametre: ["Ø 40 (lavabo, douche)", "Ø 100 (WC)"] }, hauteur: 0,
    faire(w, d, h, o) { const r = (o.diametre || "").includes("100") ? .05 : .02, g = new THREE.Group();
      g.add(tube(new THREE.Vector3(-w / 2, r, 0), new THREE.Vector3(w / 2, r + .02, 0), r, MAT.pvc));
      g.add(tube(new THREE.Vector3(w / 2, r + .02, 0), new THREE.Vector3(w / 2, h, 0), r, MAT.pvc)); return g; } },
  prise: { nom: "Prise électrique", groupe: "Réseaux", pose: "dansMur", dims: [8, 2, 8], hauteur: 105,
    faire() { const g = new THREE.Group(); g.add(pose(boite(.08, .08, .015, MAT.plastique), 0, .04, .008));
      const t = cyl(.022, .005, new THREE.MeshStandardMaterial({ color: 0xdedcd6 }), 20); t.rotation.x = Math.PI / 2; g.add(pose(t, 0, .04, .017));
      const gn = tube(new THREE.Vector3(0, .08, -.005), new THREE.Vector3(0, 1.6, -.005), .006, MAT.gaine); gn.userData.chantierSeul = true; g.add(gn); return g; } },
  interrupteur: { nom: "Interrupteur", groupe: "Réseaux", pose: "dansMur", dims: [8, 2, 8], hauteur: 110,
    faire() { const g = new THREE.Group(); g.add(pose(boite(.08, .08, .015, MAT.plastique), 0, .04, .008)); g.add(pose(boite(.04, .05, .01, MAT.blanc), 0, .04, .018));
      const gn = tube(new THREE.Vector3(0, .08, -.005), new THREE.Vector3(0, 1.3, -.005), .006, MAT.gaine); gn.userData.chantierSeul = true; g.add(gn); return g; } },
  vmc: { nom: "Bouche VMC", groupe: "Réseaux", pose: "dansMur", dims: [15, 2, 15], hauteur: 220,
    faire() { const g = new THREE.Group(), b = cyl(.075, .02, MAT.plastique, 24); b.rotation.x = Math.PI / 2; g.add(pose(b, 0, .075, .01)); return g; } },
  spot: { nom: "Spot LED (plafond)", groupe: "Réseaux", pose: "plafond", dims: [8, 8, 2],
    faire() { const g = new THREE.Group(); g.add(pose(cyl(.04, .01, MAT.led, 20), 0, 0, 0)); g.add(pose(new THREE.PointLight(0xfff4e0, .35, 3), 0, -.1, 0)); return g; } }
};
function meuble(w, d, h, n, o) {
  const g = new THREE.Group(), m = matBois(o.finition || "#a97c52"), haut = .9;
  g.add(pose(boite(w, h - .04, d, m), 0, haut - h / 2 - .02, 0));
  g.add(pose(boite(w + .01, .04, d + .01, MAT.ceramique), 0, haut - .02, 0));
  for (let i = 0; i < n; i++) {
    const x = n === 1 ? 0 : (i ? w / 4 : -w / 4);
    g.add(pose(new THREE.Mesh(new THREE.CylinderGeometry(.16, .13, .005, 32), MAT.fond), x, haut + .003, .02));
    g.add(pose(cyl(.012, .22, MAT.robinet), x, haut + .11, -d / 2 + .05));
    const bec = cyl(.008, .12, MAT.robinet); bec.rotation.x = Math.PI / 2; g.add(pose(bec, x, haut + .2, -d / 2 + .1));
  }
  const bas = haut - h, avant = d / 2 + .006, fa = o.facade || "2 tiroirs";
  if (fa === "2 tiroirs") [-.1, .08].forEach(y => g.add(pose(boite(w * .3, .015, .01, MAT.robinet), 0, haut - h / 2 + y, avant)));
  if (fa === "1 tiroir") g.add(pose(boite(w * .35, .015, .01, MAT.robinet), 0, haut - .1, avant));
  if (fa === "Portes") { g.add(pose(boite(.004, h - .08, .006, MAT.noir), 0, haut - h / 2 - .02, avant)); [-.06, .06].forEach(x => g.add(pose(boite(.012, .14, .01, MAT.robinet), x, haut - .14, avant))); }
  if (fa === "Sans poignée" || fa === "2 tiroirs") g.add(pose(boite(w - .02, .004, .006, MAT.noir), 0, haut - h / 2 - .01, avant)); // joint entre tiroirs
  if (o.style === "Sur pieds") [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz]) => g.add(pose(cyl(.012, bas - .02, MAT.robinet), sx * (w / 2 - .04), (bas - .02) / 2, sz * (d / 2 - .04))));
  return g;
}
const GROUPES = ["Structure", "Sanitaires", "Meubles", "Équipements", "Ouvertures", "Réseaux"];
// revêtements des murs en cours, pour habiller les décrochés comme les murs
const AMBIANCE = { murs: null, peinture: "#f3f1ec", faience: "plafond", h: 2.5 };

/* =================== Métré → lignes de devis (mots cherchés dans les prestations) =================== */
const POUR_DEVIS = {
  douche: ["Création douche à l'italienne", "Plomberie"],
  baignoire: ["Dépose et pose d'une nouvelle baignoire", "Plomberie"],
  ilot: ["Dépose et pose d'une nouvelle baignoire", "Plomberie"],
  wc: ["Installation WC suspendu", "Plomberie"],
  wcSol: ["Pose de la cuvette", "Plomberie"],
  vasque: ["Pose du meuble vasque", "Menuiserie / Installations"],
  double: ["Pose meuble double vasque suspendu", "Menuiserie / Installations"],
  vasquePoser: ["Pose du meuble vasque", "Menuiserie / Installations"],
  laveMains: ["Installation d'un lavabo", "Plomberie"],
  colonne: ["Pose et fixation du meuble sous vasque et de rangement", "Menuiserie / Installations"],
  meubleHaut: ["Pose et fixation du meuble sous vasque et de rangement", "Menuiserie / Installations"],
  armoire: ["Installation et fixation du miroir avec raccordement", "Électricité"],
  miroir: ["Installation miroir éclairé", "Électricité"],
  miroirRect: ["Installation miroir éclairé", "Électricité"],
  porte: ["Pose bloc-porte coulissant", "Menuiserie / Installations"],
  radiateurEau: ["Déplacement radiateur à eau", "Plomberie"],
  arrivees: ["Modification alimentations / évacuations", "Plomberie"],
  evacuation: ["Modification alimentations / évacuations", "Plomberie"],
  prise: ["Pose d'une prise électrique", "Électricité"],
  interrupteur: ["Déplacement prise + interrupteur", "Électricité"],
  vmc: ["Installation VMC simple flux", "Électricité"],
  spot: ["Pose de spot LED", "Électricité"]
};

/* =================================================================== */
export async function monterSimulateur(vue, { db, params, toast, esc, choisirClient, nomClient, creerDevis }) {
  const defaut = () => ({
    nom: "Salle de bain", dims: { l: 2.6, p: 2.0, h: 2.5 },
    murs: { matiere: "blanc", format: "60x120", joint: "gris" }, accent: { matiere: "bleu", format: "7.5x15", joint: "blanc", actif: false },
    sol: { matiere: "beton", format: "60x60", joint: "gris" }, faience: "plafond", peinture: "#f3f1ec", depose: true,
    objets: [
      { type: "douche", x: .7, z: -.55, rot: 0 }, { type: "double", x: -.55, z: -.8, rot: 0 }, { type: "miroir", x: -.55, z: -.98, rot: 0 },
      { type: "wc", x: -1.1, z: .35, rot: Math.PI / 2 }, { type: "porte", x: 1.3, z: .45, rot: -Math.PI / 2 }, { type: "radiateur", x: -1.3, z: .8, rot: Math.PI / 2 }, { type: "prise", x: -.1, z: -1, rot: 0 }
    ]
  });
  let validation = {}, etat = defaut(), simId = null, client = null, selection = null, chantier = false;
  etat.robinetterie = "noir";
  if (params.get("sim")) {
    const s = await db.lire("simulations", params.get("sim"));
    if (s) { etat = migrer({ ...defaut(), ...s.data }); simId = s.id; validation = { jeton: s.jeton, valide_le: s.valide_le, valide_nom: s.valide_nom }; etat.nom = s.nom || etat.nom; if (s.client_id) client = await db.lire("clients", s.client_id); }
  } else if (params.get("client")) client = await db.lire("clients", params.get("client"));
  etat.objets = etat.objets.filter(o => CAT[o.type]); etat.objets.forEach(completer);

  function migrer(e) { // simulations enregistrées avant la refonte
    ["murs", "sol"].forEach(k => { if (typeof e[k] === "string") e[k] = { matiere: MATIERES[e[k]] ? e[k] : "blanc", format: k === "sol" ? "60x60" : "60x120", joint: "gris" }; });
    if (typeof e.accent === "string") e.accent = { matiere: MATIERES[e.accent] ? e.accent : "bleu", format: "7.5x15", joint: "blanc", actif: true };
    (e.objets || []).forEach(o => { if (o.type === "Battante" || o.type === "Coulissante") { o.ouverture = o.type; o.type = "porte"; } });
    if (!e.robinetterie) e.robinetterie = "noir";
    if (!e.pente) e.pente = { mur: "aucun", basse: 1, largeur: 1.2 };
    return e;
  }
  function completer(o) {
    const c = CAT[o.type];
    if (o.w === undefined) [o.w, o.d, o.h] = c.dims.map(v => v / 100);
    if (o.y === undefined) o.y = (c.hauteur || 0) / 100;
    for (const [k, vals] of Object.entries(c.options || {})) if (o[k] === undefined) o[k] = vals[0];
  }

  const pal = (liste, choisi, attr) => Object.entries(liste).map(([k, v]) => `<button type="button" class="pastille ${k === choisi ? "actif" : ""}" data-${attr}="${k}" title="${esc(v.nom)}" aria-label="${esc(v.nom)}" style="background:${v.couleur}"></button>`).join("");
  const opts = (liste, choisi) => Object.entries(liste).map(([k, v]) => `<option value="${k}" ${k === choisi ? "selected" : ""}>${esc(v.nom || v)}</option>`).join("");
  const TITRES = { murs: "Carrelage des murs", accent: "Murs de la douche", sol: "Sol" };
  vue.innerHTML = `
    <div class="entete"><div><div class="petit">Simulation 3D · chantier</div><h1 id="titreSim" title="Renommer">${esc(etat.nom)}</h1></div>
      <button class="btn clair" id="clientSim">${client ? esc(nomClient(client)) : "Associer un client"}</button></div>
    <div class="deux-col">
      <div>
        <div class="sim" id="scene"><div class="aide3d">Glissez pour tourner · pincez pour zoomer · touchez un élément pour le déplacer</div><div class="tournage" id="tournage" hidden>Vidéo en cours… <b id="tournageS">10</b> s</div></div>
        <div class="carte" id="selPanneau" hidden style="margin-top:12px"></div>
        <div class="actions-doc">
          <button class="btn" id="enregSim">Enregistrer</button>
          <button class="btn clair" id="devisSim">Créer le devis</button>
          <button class="btn clair" id="imageSim">Image</button>
          <button class="btn clair" id="videoSim">Vidéo</button>
          <button class="btn discret" id="gptSim">Image réaliste (Gemini, ChatGPT)</button>
          <button class="btn clair" id="plan2d">Plan 2D</button>
          <button class="btn discret" id="vueDessus">Vue de dessus</button>
          <button class="btn discret" id="modeChantier">Mode chantier</button>
          <button class="btn discret" id="aZero">Vider la salle de bain</button>
          <button class="btn clair" id="validerClient">Faire valider les choix au client</button>
        </div>
        <p class="gris" id="etatValidation" style="font-size:13px;margin:-8px 0 14px"></p>
        <details class="carte section-piece" id="piece3d" style="margin-bottom:12px"><summary>Pièce (cm)<span>${cm(etat.dims.l)} × ${cm(etat.dims.p)} × ${cm(etat.dims.h)}</span></summary>
          <div style="margin-top:10px">
          <div class="trois">
            <div class="champ"><label>Longueur</label><input type="number" data-dim="l" value="${cm(etat.dims.l)}" min="100" max="900" inputmode="numeric"></div>
            <div class="champ"><label>Largeur</label><input type="number" data-dim="p" value="${cm(etat.dims.p)}" min="100" max="900" inputmode="numeric"></div>
            <div class="champ"><label>Hauteur</label><input type="number" data-dim="h" value="${cm(etat.dims.h)}" min="200" max="400" inputmode="numeric"></div>
          </div>
          <div class="deux">
            <div class="champ"><label>Faïence</label><select id="faience"><option value="plafond" ${etat.faience === "plafond" ? "selected" : ""}>Jusqu'au plafond</option><option value="120" ${etat.faience === "120" ? "selected" : ""}>Hauteur 1,20 m</option><option value="douche" ${etat.faience === "douche" ? "selected" : ""}>Zone douche seulement</option></select></div>
            <div class="champ"><label>Plafond</label><select id="penteMur">${["aucun", "gauche", "droite", "fond", "devant"].map(m => `<option value="${m}" ${(etat.pente?.mur || "aucun") === m ? "selected" : ""}>${m === "aucun" ? "Plat" : "Sous pente, côté " + m}</option>`).join("")}</select></div>
            <div class="champ"><label>Pente : hauteur basse cm</label><input type="number" id="penteBasse" value="${cm(etat.pente?.basse || 1)}" inputmode="numeric"></div>
            <div class="champ"><label>Largeur de la pente cm</label><input type="number" id="penteLarg" value="${cm(etat.pente?.largeur || 1.2)}" inputmode="numeric"></div>
            <div class="champ"><label>Faux plafond</label><select id="fauxPlafond"><option value="0" ${!etat.fauxPlafond ? "selected" : ""}>Non</option><option value="1" ${etat.fauxPlafond ? "selected" : ""}>Oui, plaques hydrofuges</option></select></div>
            <div class="champ"><label>Dépose de l'existant</label><select id="depose"><option value="1" ${etat.depose ? "selected" : ""}>Oui</option><option value="0" ${!etat.depose ? "selected" : ""}>Non</option></select></div>
          </div>
          </div>
        </details>
        <div class="carte" id="metre"></div>
      </div>
      <div class="carte" id="reglages3d">
        <details class="groupe-ajout deroule-couleur"><summary>Peinture des murs<span><i class="mini" id="miniPeinture" style="background:${etat.peinture}"></i><b id="nomPeinture">${esc(PEINTURES[etat.peinture] || "")}</b></span></summary>
          <p class="gris" style="font-size:13px;margin-bottom:8px">Visible au-dessus de la faïence et sur les murs non carrelés.</p>
          <div class="palette">${Object.entries(PEINTURES).map(([c, n]) => `<button type="button" class="pastille ${c === etat.peinture ? "actif" : ""}" data-peinture="${c}" title="${n}" aria-label="${n}" style="background:${c}"></button>`).join("")}</div>
        </details>
        ${["murs", "accent", "sol"].map(k => `
        <details class="groupe-ajout deroule-couleur"><summary>${TITRES[k]}<span><i class="mini" data-mini="${k}" style="background:${MATIERES[etat[k].matiere].couleur}"></i><b data-nommat="${k}">${esc(MATIERES[etat[k].matiere].nom)}</b></span></summary>
          ${k === "accent" ? `<label style="display:flex;gap:8px;align-items:center;text-transform:none;letter-spacing:0;font-weight:500;color:var(--encre)"><input type="checkbox" id="accentActif" ${etat.accent.actif ? "checked" : ""} style="width:auto"> Carrelage différent dans la douche (les murs de l'angle)</label>` : ""}
          <div class="palette" style="margin:6px 0 4px">${pal(MATIERES, etat[k].matiere, "mat-" + k)}</div>
          <div class="deux">
            <div class="champ"><label>Format</label><select data-format="${k}">${opts(FORMATS, etat[k].format)}</select></div>
            <div class="champ"><label>Joints</label><select data-joint="${k}">${opts({ blanc: "Blancs", gris: "Gris", noir: "Noirs" }, etat[k].joint)}</select></div>
          </div>
        </details>`).join("")}
        <details class="groupe-ajout deroule-couleur"><summary>Robinetterie et poignées<span><i class="mini" id="miniRobinet" style="background:${ROBINETTERIE[etat.robinetterie]?.couleur}"></i><b id="nomRobinet">${esc(ROBINETTERIE[etat.robinetterie]?.nom || "")}</b></span></summary>
          <div class="palette">${Object.entries(ROBINETTERIE).map(([k, r]) => `<button type="button" class="pastille ${k === etat.robinetterie ? "actif" : ""}" data-robinet="${k}" title="${r.nom}" aria-label="${r.nom}" style="background:${r.couleur}"></button>`).join("")}</div>
        </details>
        <fieldset><legend>Ajouter</legend>
          ${GROUPES.map(gp => { const items = Object.entries(CAT).filter(([, c]) => c.groupe === gp);
            return `<details class="groupe-ajout"><summary>${gp}<span>${items.length}</span></summary><div class="objets">${items.map(([k, c]) => `<button type="button" data-ajout="${k}">${esc(c.nom)}</button>`).join("")}</div></details>`; }).join("")}
        </fieldset>
      </div>
    </div>`;

  /* --- Scène --- */
  const hote = document.getElementById("scene");
  const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = .9;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  hote.appendChild(renderer.domElement);
  const scene = new THREE.Scene(); scene.background = new THREE.Color(0xe9e4dc);
  const camera = new THREE.PerspectiveCamera(50, 1, .05, 60); camera.position.set(2.6, 2.3, 3.2);
  const controles = new OrbitControls(camera, renderer.domElement);
  controles.target.set(0, .9, 0); controles.enableDamping = true; controles.maxPolarAngle = Math.PI / 2 - .03; controles.minDistance = 1; controles.maxDistance = 12;
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(renderer), .04).texture; pmrem.dispose();
  scene.add(new THREE.HemisphereLight(0xfffaf2, 0xcfc4b4, .55));
  const soleil = new THREE.DirectionalLight(0xfff6ea, 1.7); soleil.position.set(2.2, 5, 3.2); soleil.castShadow = true;
  const fin = Math.min(innerWidth, innerHeight) > 600 ? 2048 : 1024;
  soleil.shadow.mapSize.set(fin, fin); soleil.shadow.bias = -.0004; soleil.shadow.normalBias = .02; soleil.shadow.radius = 4;
  Object.assign(soleil.shadow.camera, { left: -5, right: 5, top: 5, bottom: -5 }); scene.add(soleil);
  const plafonnier = new THREE.PointLight(0xfff0d8, 1.2, 9, 1.6); scene.add(plafonnier);
  const piece = new THREE.Group(), meubles = new THREE.Group(); scene.add(piece, meubles);
  let rampant = null; // plafond en pente (combles) : le plan coupe murs et meubles au-dessus
  let murs = []; const objetsMesh = new Map();

  // murs : 0 fond (z-), 1 droite (x+), 2 avant (z+), 3 gauche (x-)
  const norm = a => ((a % TAU) + TAU) % TAU;
  const murDe = rot => [0, -Math.PI / 2, Math.PI, Math.PI / 2].findIndex(r => Math.abs(norm(rot) - norm(r)) < .01);
  const MURS = () => { const { l, p } = etat.dims; return [
    { w: l, c: [0, -p / 2], rot: 0, n: [0, 0, 1] }, { w: p, c: [l / 2, 0], rot: -Math.PI / 2, n: [-1, 0, 0] },
    { w: l, c: [0, p / 2], rot: Math.PI, n: [0, 0, -1] }, { w: p, c: [-l / 2, 0], rot: Math.PI / 2, n: [1, 0, 0] }]; };

  // Zone de douche sur chaque mur qu'elle touche (les deux murs si elle est dans un angle) :
  // { indice du mur: [début, fin] } en mètres, le long du mur, dans le repère du mur.
  function zonesDouche() {
    const o = etat.objets.find(x => x.type === "douche"); if (!o) return {};
    const { l, p } = etat.dims, travers = murDe(o.rot) % 2 === 1;
    const [ex, ez] = travers ? [o.d, o.w] : [o.w, o.d];
    const x0 = o.x - ex / 2, x1 = o.x + ex / 2, z0 = o.z - ez / 2, z1 = o.z + ez / 2;
    const ecarts = [z0 + p / 2, l / 2 - x1, p / 2 - z1, x0 + l / 2];
    const bornes = [[x0, x1, l], [z0, z1, p], [-x1, -x0, l], [-z1, -z0, p]];
    const proche = ecarts.map(e => e < .15);
    if (!proche.some(Boolean)) proche[ecarts.indexOf(Math.min(...ecarts))] = true;
    const z = {};
    proche.forEach((ok, i) => { if (!ok) return;
      let [a, b, w] = bornes[i]; a = Math.max(-w / 2, a); b = Math.min(w / 2, b);
      if (a + w / 2 < .15) a = -w / 2; if (w / 2 - b < .15) b = w / 2; // on va jusqu'à l'angle
      if (b - a > .05) z[i] = [a, b]; });
    return z;
  }
  // Coffrages (décrochés) : longueur des faces visibles et des faces collées à un mur
  function coffrages() {
    const { l, p } = etat.dims;
    return etat.objets.filter(o => o.type === "decroche" || o.type === "cloison").map(o => {
      const travers = murDe(o.rot) % 2 === 1, [ex, ez] = travers ? [o.d, o.w] : [o.w, o.d];
      const x0 = o.x - ex / 2, x1 = o.x + ex / 2, z0 = o.z - ez / 2, z1 = o.z + ez / 2;
      const faces = [[ex, z0 + p / 2], [ez, l / 2 - x1], [ex, p / 2 - z1], [ez, x0 + l / 2]];
      const visible = faces.filter(([, e]) => e > .05).reduce((a, [w]) => a + w, 0);
      const cache = faces.filter(([, e]) => e <= .05).reduce((a, [w]) => a + w, 0);
      if (o.type === "cloison") return { creer: o.travaux === "À créer (placo)", cloison: true, longueur: o.w, visible, cache, angles: 0 };
      return { creer: o.travaux === "À créer (coffrage)", visible, cache, angles: Math.max(0, faces.filter(([, e]) => e > .05).length - 1) };
    });
  }
  const hauteurFaience = h => etat.faience === "plafond" ? h : etat.faience === "120" ? 1.2 : 0;

  function construirePiece() {
    piece.clear(); murs = [];
    const { l, p, h } = etat.dims;
    Object.assign(AMBIANCE, { murs: etat.murs, peinture: etat.peinture, faience: etat.faience, h });
    const sol = new THREE.Mesh(new THREE.PlaneGeometry(l, p), materiauCarrelage(etat.sol, l, p, true));
    sol.rotation.x = -Math.PI / 2; sol.receiveShadow = true; piece.add(sol);
    const zones = zonesDouche(), hf = hauteurFaience(h);
    MURS().forEach((d, i) => {
      const g = new THREE.Group(); g.position.set(d.c[0], 0, d.c[1]); g.rotation.y = d.rot;
      g.userData.normale = new THREE.Vector3(...d.n); g.userData.centre = new THREE.Vector3(d.c[0], h / 2, d.c[1]);
      if (hf > 0) { const m = new THREE.Mesh(new THREE.PlaneGeometry(d.w, hf), materiauCarrelage(etat.murs, d.w, hf)); m.position.y = hf / 2; m.receiveShadow = true; g.add(m); }
      if (hf < h) { const m = new THREE.Mesh(new THREE.PlaneGeometry(d.w, h - hf), new THREE.MeshStandardMaterial({ color: new THREE.Color(etat.peinture), roughness: .9 })); m.position.y = hf + (h - hf) / 2; m.receiveShadow = true; g.add(m); }
      const zd = zones[i];
      if (zd && (etat.accent.actif || hf < h)) { // la zone de douche, carrelée jusqu'au plafond
        const zw = zd[1] - zd[0], m = new THREE.Mesh(new THREE.PlaneGeometry(zw, h), materiauCarrelage(etat.accent.actif ? etat.accent : etat.murs, zw, h));
        m.position.set((zd[0] + zd[1]) / 2, h / 2, .002); m.receiveShadow = true; g.add(m);
      }
      if (hf > 0 && hf < h) (zd ? [[-d.w / 2, zd[0]], [zd[1], d.w / 2]] : [[-d.w / 2, d.w / 2]]).forEach(([a, b]) => {
        if (b - a > .01) g.add(pose(boite(b - a, .015, .012, MAT.chrome), (a + b) / 2, hf, .006)); });
      g.children.forEach(m => { m.material.transparent = chantier; m.material.opacity = chantier ? .28 : 1; m.material.depthWrite = !chantier; });
      piece.add(g); murs.push(g);
    });
    plafonnier.position.set(0, h - .1, 0);
    construirePente();
    if (meubles.children.length) etat.objets.forEach((o, i) => { if (o.type === "decroche" || o.type === "cloison") { selection === i ? (refaireIndex(i)) : refaireIndex(i); } });
    majMetre(); doser();
  }
  // pente : depuis le mur choisi, de la hauteur basse jusqu'à la pleine hauteur sur la largeur donnée
  function construirePente() {
    if (rampant) { scene.remove(rampant); rampant = null; }
    const pe = etat.pente || {}; renderer.clippingPlanes = [];
    if (!pe.mur || pe.mur === "aucun") return;
    const { l, p, h } = etat.dims, basse = Math.min(pe.basse || 1, h - .1), larg = Math.max(.3, pe.largeur || 1.2), k = (h - basse) / larg;
    // repère : u = distance au mur choisi (vers la pièce), le long du mur = autre axe
    const cfg = { gauche: [1, 0, -l / 2, p], droite: [-1, 0, l / 2, p], fond: [0, 1, -p / 2, l], devant: [0, -1, p / 2, l] }[pe.mur];
    const [ax, az, origine, longueur] = cfg;
    // plan gardé : y <= basse + k * u, avec u = ax * (x - origine) + az * (z - origine)
    const n = new THREE.Vector3(k * ax, -1, k * az), c = basse - k * (ax * (ax ? origine : 0) + az * (az ? origine : 0)) + .004;
    const lg = n.length(); renderer.clippingPlanes = [new THREE.Plane(n.divideScalar(lg), c / lg)];
    // le rampant lui-même
    const a = [], pt = (u, t) => { const x = ax ? origine + ax * u : t, z = az ? origine + az * u : t; return [x, basse + k * u, z]; };
    [[0, -longueur / 2], [0, longueur / 2], [larg, longueur / 2], [larg, -longueur / 2]].forEach(([u, t]) => a.push(...pt(u, t)));
    const geo = new THREE.BufferGeometry(); geo.setAttribute("position", new THREE.Float32BufferAttribute(a, 3)); geo.setIndex([0, 1, 2, 0, 2, 3]); geo.computeVertexNormals();
    rampant = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: 0xf4f2ee, roughness: .9, side: THREE.DoubleSide }));
    rampant.userData.centre = new THREE.Vector3(...pt(larg / 2, 0)); rampant.userData.normale = new THREE.Vector3(-k * ax, 1, -k * az).normalize().negate();
    scene.add(rampant);
  }
  function construireObjets() {
    meubles.clear(); objetsMesh.clear();
    etat.objets.forEach((o, i) => { const g = CAT[o.type].faire(o.w, o.d, o.h, o); g.userData.index = i; meubles.add(g); objetsMesh.set(i, g); placer(i); });
    doser();
  }
  function encombrement(o) { const t = Math.round(norm(o.rot) / (Math.PI / 2)) % 2 === 1; return [(t ? o.d : o.w) / 2, (t ? o.w : o.d) / 2]; }
  function collerAuMur(o) {
    const { l, p } = etat.dims;
    const dist = [{ v: o.z + p / 2, rot: 0 }, { v: l / 2 - o.x, rot: -Math.PI / 2 }, { v: p / 2 - o.z, rot: Math.PI }, { v: o.x + l / 2, rot: Math.PI / 2 }];
    o.rot = dist.reduce((a, b) => (b.v < a.v ? b : a)).rot;
  }
  function placer(i) {
    const o = etat.objets[i], c = CAT[o.type], g = objetsMesh.get(i); if (!g) return;
    const { l, p, h } = etat.dims, auMur = c.pose === "mur" || c.pose === "dansMur";
    // un élément « au mur » peut aussi s'accrocher à une face de décroché (WC devant un coffrage…)
    let surDecroche = false;
    if (c.pose === "mur") {
      const mur = Math.min(o.z + p / 2, l / 2 - o.x, p / 2 - o.z, o.x + l / 2);
      etat.objets.forEach(d2 => {
        if ((d2.type !== "decroche" && d2.type !== "cloison") || d2 === o) return;
        const [dx, dz] = encombrement(d2), demi = Math.max(o.w, o.d) / 2;
        [[0, d2.z + dz, 0, "z"], [Math.PI, d2.z - dz, 0, "z"], [Math.PI / 2, d2.x + dx, 0, "x"], [-Math.PI / 2, d2.x - dx, 0, "x"]].forEach(([rot, plan, , axe]) => {
          const ecart = axe === "z" ? Math.abs(o.z - plan) : Math.abs(o.x - plan), long = axe === "z" ? Math.abs(o.x - d2.x) <= dx : Math.abs(o.z - d2.z) <= dz;
          if (long && ecart < Math.min(mur, .6) && !surDecroche) {
            surDecroche = true; o.rot = rot;
            if (axe === "z") { o.z = plan + Math.sign(Math.cos(rot)) * o.d / 2; o.x = Math.min(d2.x + dx - o.w / 2, Math.max(d2.x - dx + o.w / 2, o.x)); }
            else { o.x = plan + Math.sign(Math.sin(rot)) * o.d / 2; o.z = Math.min(d2.z + dz - o.w / 2, Math.max(d2.z - dz + o.w / 2, o.z)); }
            void demi;
          }
        });
      });
    }
    if (auMur && !surDecroche) collerAuMur(o);
    const [ex, ez] = encombrement(o);
    o.x = Math.min(l / 2 - ex, Math.max(-l / 2 + ex, o.x)); o.z = Math.min(p / 2 - ez, Math.max(-p / 2 + ez, o.z));
    if (auMur && !surDecroche) {
      const k = murDe(o.rot), prof = c.pose === "dansMur" ? 0 : o.d / 2;
      if (k === 0) o.z = -p / 2 + prof; if (k === 2) o.z = p / 2 - prof; if (k === 1) o.x = l / 2 - prof; if (k === 3) o.x = -l / 2 + prof;
    }
    g.position.set(o.x, c.pose === "plafond" ? h - .01 : (o.y || 0), o.z);
    g.rotation.y = o.rot;
    g.userData.mur = c.pose === "dansMur" || (c.pose === "mur" && !surDecroche) ? murDe(o.rot) : -1;
    if (o.type === "douche") { // la paroi va du côté ouvert de la douche
      // un côté est « libre » s'il ne touche ni un mur ni un décroché (coffrage)
      const contreDecroche = (x, z) => etat.objets.some(d2 => (d2.type === "decroche" || d2.type === "cloison") && Math.abs(x - d2.x) < (encombrement(d2)[0] + .08) && Math.abs(z - d2.z) < (encombrement(d2)[1] + .08));
      const cs = Math.cos(o.rot), sn = Math.sin(o.rot), libre = (a, b) => { const x = o.x + cs * a + sn * b, z = o.z - sn * a + cs * b; return Math.min(l / 2 - Math.abs(x), p / 2 - Math.abs(z)) > .08 && !contreDecroche(x, z); };
      const cote = libre(o.w / 2, 0) && !libre(-o.w / 2, 0) ? "droite" : libre(-o.w / 2, 0) && !libre(o.w / 2, 0) ? "gauche" : libre(o.w / 2, 0) ? "droite" : "devant";
      o.paroi = cote; g.children.forEach(ch => { if (ch.userData.paroi) ch.visible = ch.userData.paroi === cote; });
    }
  }
  // reflets dosés : forts sur le métal et le verre, discrets ailleurs
  function doser() { scene.traverse(m => { [].concat(m.material || []).forEach(mt => { if (!mt || mt.userData.dose) return; mt.userData.dose = true;
    if (mt.envMapIntensity === 1) mt.envMapIntensity = mt.metalness > .5 ? .9 : mt.roughness < .2 ? .5 : .25; }); }); }
  // quand la pièce change de taille, chaque élément fixé au mur reste sur son mur
  function changerDims(k, valeur) {
    const ancien = { ...etat.dims }; etat.dims[k] = valeur;
    etat.objets.forEach(o => {
      const c = CAT[o.type]; if (!c || !(c.pose === "mur" || c.pose === "dansMur")) return;
      const m = murDe(o.rot), { l, p } = etat.dims;
      if (m === 1) o.x += (l - ancien.l) / 2; if (m === 3) o.x -= (l - ancien.l) / 2;
      if (m === 2) o.z += (p - ancien.p) / 2; if (m === 0) o.z -= (p - ancien.p) / 2;
    });
    reconstruire();
  }
  function tournerObjet(i) {
    const o = etat.objets[i], c = CAT[o.type];
    if (c.pose === "mur" || c.pose === "dansMur") { const { l, p } = etat.dims; const k = (murDe(o.rot) + 1) % 4; [o.x, o.z] = [[0, -p / 2], [l / 2, 0], [0, p / 2], [-l / 2, 0]][k]; }
    else o.rot = norm(o.rot + Math.PI / 2);
    placer(i); if (o.type === "douche") construirePiece(); else majMetre();
  }
  function ajouterObjet(t) {
    const o = { type: t, x: 0, z: 0, rot: 0 }; completer(o);
    if (CAT[t].pose === "mur" || CAT[t].pose === "dansMur") o.z = -etat.dims.p / 2;
    etat.objets.push(o); selection = etat.objets.length - 1; reconstruire();
    return selection;
  }
  // Ajout : une fenêtre s'ouvre là où l'on est ; on choisit, on valide, et la page ne bouge pas.
  function choisirAvantAjout(t) {
    const c = CAT[t], o = { type: t, x: 0, z: 0, rot: 0 }; completer(o);
    const v = document.createElement("div"); v.className = "voile";
    v.innerHTML = `<div class="fenetre" role="dialog" aria-modal="true"><div class="tete"><h2>${esc(c.nom)}</h2><button class="icone" data-fermer aria-label="Fermer">✕</button></div>
      <div data-champs>${champsObjet(o, c)}</div>
      <div class="actions-doc" style="margin-bottom:0"><button type="button" class="btn" data-valider>Ajouter</button><button type="button" class="btn discret" data-fermer>Annuler</button></div></div>`;
    document.body.appendChild(v);
    const champs = v.querySelector("[data-champs]");
    v.addEventListener("change", e => {
      const x = e.target;
      if (x.dataset.od) { const n = Number(x.value) || 0; o[x.dataset.od] = x.dataset.od === "y" ? Math.max(0, n) / 100 : Math.max(1, n) / 100; }
      else if (x.dataset.opt) o[x.dataset.opt] = x.value;
    });
    v.addEventListener("click", e => {
      if (e.target === v || e.target.closest("[data-fermer]")) { v.remove(); return; }
      const b = e.target.closest("button"); if (!b) return;
      if (b.dataset.taille) { [o.w, o.d] = b.dataset.taille.split("x").map(n => Number(n) / 100); champs.innerHTML = champsObjet(o, c); }
      else if (b.dataset.opt) { o[b.dataset.opt] = b.dataset.val; champs.innerHTML = champsObjet(o, c); }
      else if (b.hasAttribute("data-valider")) {
        v.remove();
        if (c.pose === "mur" || c.pose === "dansMur") o.z = -etat.dims.p / 2;
        etat.objets.push(o); construirePiece(); construireObjets(); doser();
        toast(`${c.nom} ajouté : faites-le glisser dans la 3D`);
      }
    });
  }
  function reconstruire() { construirePiece(); construireObjets(); afficherSelection(); doser(); }

  /* --- Rendu --- */
  const redim = () => { const r = hote.getBoundingClientRect(); if (!r.width) return; renderer.setSize(r.width, r.height, false); camera.aspect = r.width / r.height; camera.updateProjectionMatrix(); };
  new ResizeObserver(redim).observe(hote); redim();
  const dir = new THREE.Vector3();
  let tournage = null;
  function boucle() {
    if (!document.body.contains(hote)) { renderer.dispose(); return; }
    if (tournage) {
      const t = Math.min(1, (performance.now() - tournage.debut) / tournage.duree);
      const a = tournage.angle + TAU * t;
      camera.position.set(controles.target.x + Math.sin(a) * tournage.rayon, tournage.hauteur, controles.target.z + Math.cos(a) * tournage.rayon);
      camera.lookAt(controles.target);
    } else controles.update();
    const vis = murs.map(m => { dir.copy(camera.position).sub(m.userData.centre); return chantier || dir.dot(m.userData.normale) > 0; });
    murs.forEach((m, i) => { m.visible = vis[i]; });
    if (rampant) { dir.copy(camera.position).sub(rampant.userData.centre); rampant.visible = !chantier && dir.dot(rampant.userData.normale) > 0; }
    meubles.children.forEach(g => { if (g.userData.mur >= 0) g.visible = vis[g.userData.mur]; g.children.forEach(m => { if (m.userData.chantierSeul) m.visible = chantier; }); });
    renderer.render(scene, camera);
    if (tournage) tournage.image();
    requestAnimationFrame(boucle);
  }
  appliquerRobinetterie(etat.robinetterie); reconstruire(); boucle();
  majValidation();

  /* --- Métré --- */
  function metre() {
    const { l, p, h } = etat.dims, hf = hauteurFaience(h);
    const largeurs = [l, p, l, p];
    let murm2 = 0;
    largeurs.forEach(w => { murm2 += w * hf; });
    Object.values(zonesDouche()).forEach(([a, b]) => { murm2 += (b - a) * (h - hf); });
    const net = coffrages().reduce((a, c) => a + c.visible - c.cache, 0); // un coffrage ajoute des faces à carreler / peindre
    murm2 += net * hf;
    etat.objets.filter(o => o.type === "porte" || o.type === "fenetre").forEach(o => {
      murm2 -= o.w * Math.max(0, Math.min(o.y + o.h, hf) - o.y);
    });
    const peint = (2 * (l + p) + net) * h - murm2 - etat.objets.filter(o => o.type === "porte").reduce((a, o) => a + o.w * o.h, 0);
    return { sol: l * p, murs: Math.max(0, murm2), peinture: Math.max(0, peint), plafond: l * p };
  }
  // Carrelage à commander : surface posée + chutes (10 %, 15 % en pose décalée ou grand format), et nombre de carreaux.
  function carrelageACommander() {
    const m = metre(), { h } = etat.dims, hf = hauteurFaience(h), lignes = [];
    const douche = etat.objets.find(o => o.type === "douche");
    const zoneAccent = etat.accent.actif ? Object.values(zonesDouche()).reduce((a, [x, y]) => a + (y - x) * h, 0) : 0;
    const sol = m.sol - (douche && douche.receveur !== "Carrelé" ? douche.w * douche.d : 0);
    const calcule = (titre, rev, surf) => {
      if (surf <= .01) return;
      const f = FORMATS[rev.format], [a, b] = f.t, grand = Math.max(a, b) >= .8;
      const chute = f.sansJoint ? 0 : f.decale || grand ? .15 : .10, total = surf * (1 + chute);
      const plaque = rev.format === "5x5" || rev.format === "2.5x2.5"; // la mosaïque se vend en plaques de 30 × 30
      const n = f.sansJoint ? 0 : Math.ceil(total / (plaque ? .09 : a * b));
      lignes.push({ titre, cle: rev.format, joint: rev.joint, matiere: MATIERES[rev.matiere]?.nom || "", format: f.nom, surf, chute, total, n, unite: plaque ? "plaques 30×30" : rev.format === "parquet" ? "lames" : "carreaux" });
    };
    calcule("Sol", etat.sol, Math.max(0, sol));
    calcule("Murs", etat.murs, Math.max(0, m.murs - zoneAccent));
    if (etat.accent.actif) calcule("Murs de la douche", etat.accent, zoneAccent);
    return lignes;
  }
  // Fournitures autour du carrelage, avec les ratios courants de pose (à ajuster selon la fiche du produit).
  function fournitures() {
    const { l, p, h } = etat.dims, hf = hauteurFaience(h), liste = [], zones = zonesDouche();
    const sacs = (kg, sac) => Math.max(1, Math.ceil(kg / sac));
    const n = v => (Math.ceil(v * 10) / 10).toLocaleString("fr-FR"), pl = (k, mot) => `${k} ${mot}${k > 1 ? "s" : ""}`;
    const ajoute = (nom, qte, detail) => liste.push({ nom, qte, detail });
    const carreaux = carrelageACommander().filter(c => c.cle !== "uni" && c.cle !== "parquet");
    // colle : 3,5 kg/m² petits carreaux, 5 kg/m² moyens, 7 kg/m² grands formats (double encollage)
    const colle = carreaux.reduce((a, c) => { const m = Math.max(...FORMATS[c.cle].t); return a + c.surf * (m <= .2 ? 3.5 : m <= .45 ? 5 : 7); }, 0);
    if (colle) ajoute("Colle carrelage C2", `${pl(sacs(colle, 25), "sac")} de 25 kg`, `≈ ${Math.ceil(colle)} kg`);
    // joint : (L + l) / (L × l) × largeur × épaisseur × 1,6, en mm
    const joints = {};
    carreaux.forEach(c => {
      const [a, b] = FORMATS[c.cle].t.map(v => v * 1000), m = Math.max(a, b);
      const larg = c.titre === "Sol" ? 3 : 2, ep = m <= 100 ? 6 : m >= 600 ? 10 : 8;
      const kg = (a + b) / (a * b) * larg * ep * 1.6 * c.surf * 1.1;
      joints[c.joint] = (joints[c.joint] || 0) + kg;
    });
    Object.entries(joints).forEach(([coul, kg]) => ajoute(`Joint ${({ blanc: "blanc", gris: "gris", noir: "noir" })[coul] || coul}`, `${pl(sacs(kg, 5), "sac")} de 5 kg`, `≈ ${n(kg)} kg`));
    // sol : primaire puis ragréage 3 mm (1,5 kg/m²/mm)
    const sol = l * p;
    ajoute("Primaire d'accrochage", `${pl(Math.max(1, Math.ceil(sol * .15 / 5)), "bidon")} de 5 L`, `≈ ${n(sol * .15)} L pour le sol`);
    ajoute("Ragréage autolissant", `${pl(sacs(sol * 4.5, 25), "sac")} de 25 kg`, "3 mm d'épaisseur");
    if (etat.sol.format === "parquet") ajoute("Sous-couche parquet", `${Math.ceil(sol * 1.05)} m²`, "");
    // douche : étanchéité au sol de la douche et sur ses murs jusqu'à 2 m, bande dans les angles
    const douche = etat.objets.find(o => o.type === "douche");
    if (douche) {
      const lgZones = Object.values(zones).reduce((a, [x, y]) => a + (y - x), 0);
      const spec = douche.w * douche.d + lgZones * 2;
      ajoute("Kit d'étanchéité (SPEC)", `${n(spec)} m²`, "sol de la douche + murs sur 2 m");
      ajoute("Bande d'angle d'étanchéité", `${Math.ceil((lgZones + Object.keys(zones).length * 2) * 1.1)} m`, "jonctions sol / murs et angles");
    }
    // profilés de finition : en haut de la faïence à 1,20 m, et sur les bords de la zone de douche
    const portes = etat.objets.filter(o => o.type === "porte").reduce((a, o) => a + o.w, 0);
    let profil = hf > 0 && hf < h ? 2 * (l + p) - portes : 0;
    if (hf < h) Object.entries(zones).forEach(([i, [a, b]]) => { const w = i % 2 ? p : l; profil += (a > -w / 2 ? h - hf : 0) + (b < w / 2 ? h - hf : 0); });
    if (profil > .05) ajoute("Profilés de finition", `${pl(Math.ceil(profil / 2.5), "barre")} de 2,50 m`, `${n(profil)} m`);
    // plinthes : seulement là où le bas des murs n'est pas carrelé
    if (hf === 0) {
      const ml = 2 * (l + p) - portes - Object.values(zones).reduce((a, [x, y]) => a + (y - x), 0);
      if (ml > .05) ajoute("Plinthes", `${n(ml * 1.1)} m`, "10 % de chutes compris");
    }
    // coffrages et faux plafond : plaques BA13 hydrofuges 120 × 250 (3 m²), ossature 48 mm en barres de 3 m
    const cof = coffrages().filter(c => c.creer), dev = cof.reduce((a, c) => a + c.visible, 0);
    const surfCof = dev * h, surfFP = etat.fauxPlafond ? l * p : 0, placo = surfCof + surfFP;
    if (dev > .05) {
      const rails = cof.reduce((a, c) => a + 2 * (c.cloison ? c.longueur : c.visible), 0);
      ajoute("Rails R48", `${pl(Math.ceil(rails * 1.1 / 3), "barre")} de 3 m`, `sol + plafond, ${n(rails)} m`);
      const mont = cof.reduce((a, c) => a + Math.ceil((c.cloison ? c.longueur : c.visible) / .6) + 1, 0) * Math.ceil(h / 3);
      ajoute("Montants M48", `${pl(mont, "barre")} de 3 m`, "un tous les 60 cm");
      const ang = cof.reduce((a, c) => a + c.angles, 0);
      if (ang) ajoute("Cornières d'angle", `${pl(ang * Math.ceil(h / 3), "barre")} de 3 m`, "angles saillants du coffrage");
      const laine = cof.reduce((a, c) => a + (c.cloison ? c.longueur : c.visible) * h, 0);
      ajoute("Laine minérale 45 mm", `${n(laine)} m²`, "isolation phonique");
    }
    if (surfFP) {
      const rangs = Math.ceil(p / .6) + 1, ml = rangs * l;
      ajoute("Fourrures F530 (faux plafond)", `${pl(Math.ceil(ml * 1.1 / 3), "barre")} de 3 m`, `entraxe 60 cm, ${n(ml)} m`);
      ajoute("Suspentes", `${Math.ceil(ml / 1.2)}`, "une tous les 1,20 m de fourrure");
      ajoute("Cornières de rive", `${pl(Math.ceil(2 * (l + p) * 1.1 / 3), "barre")} de 3 m`, `pourtour, ${n(2 * (l + p))} m`);
    }
    if (placo > .05) {
      ajoute("Plaques BA13 hydrofuges (H1)", `${pl(Math.ceil(placo * 1.1 / 3), "plaque")} de 120 × 250`, `${n(placo)} m² + 10 %`);
      ajoute("Vis TTPC 25", `${Math.ceil(placo * 25 / 100) * 100} vis`, "≈ 25 par m²");
      ajoute("Bande à joint", `${n(placo * 1.5)} m`, "");
      ajoute("Enduit à joint", `${pl(Math.max(1, Math.ceil(placo * .35 / 5)), "sac")} de 5 kg`, `≈ ${n(placo * .35)} kg`);
    }
    // électricité : pour chaque point, une boîte, du fil sous gaine et des connecteurs
    const nb = t => etat.objets.filter(o => t.includes(o.type)).length;
    const pPrise = nb(["prise"]), pEclairage = nb(["interrupteur", "spot", "miroir", "miroirRect", "armoire"]), pRad = nb(["radiateur"]), pVmc = nb(["vmc"]);
    const points = pPrise + pEclairage + pRad + pVmc;
    if (points) {
      ajoute("Boîtes d'encastrement", pl(nb(["prise", "interrupteur"]) + pRad + nb(["miroir", "miroirRect", "armoire"]), "boîte"), "prises, interrupteurs, sorties de câble");
      if (nb(["spot"])) ajoute("Boîtes pour spots (cloches)", pl(nb(["spot"]), "boîte"), "faux plafond ou plafond");
      const m25 = (pPrise + pRad) * 8, m15 = (pEclairage + pVmc) * 6;
      if (m25) ajoute("Fil 2,5 mm² (H07V-U)", `${m25 * 3} m`, "phase, neutre, terre ; prises et sèche-serviettes");
      if (m15) ajoute("Fil 1,5 mm² (H07V-U)", `${m15 * 3} m`, "phase, neutre, terre ; éclairage et VMC");
      ajoute("Gaine ICTA Ø 20", `${m25 + m15} m`, "");
      ajoute("Connecteurs rapides (type Wago)", pl(points * 3, "connecteur"), "");
    }
    // démolition : sacs à gravats (≈ 35 L) et bâche de protection
    const demol = etat.objets.filter(o => o.type === "demolition");
    if (demol.length) {
      const vol = demol.reduce((a, o) => a + o.w * o.d * h, 0);
      ajoute("Sacs à gravats", `${Math.ceil(vol * 1.4 / .035)} sacs`, `≈ ${n(vol)} m³ de mur, foisonnement compris`);
      ajoute("Bâche de protection", "1 rouleau", "sol et passages");
    }
    ajoute("Silicone sanitaire", pl(douche ? 2 : 1, "cartouche"), "joints autour des sanitaires");
    return liste;
  }
  // Texte de commande prêt à envoyer (WhatsApp, SMS, mail) au fournisseur
  function texteCommande() {
    const f = v => (Math.ceil(v * 10) / 10).toLocaleString("fr-FR");
    return ["Bonjour,", "", "Voici ma commande pour un chantier de salle de bain :", "",
      ...fournitures().map(x => `- ${x.nom} : ${x.qte}`),
      "", "Merci de me confirmer la disponibilité et le délai.", "KA Rénovation — 07 63 14 76 27"].join("\n");
  }
  document.getElementById("metre").addEventListener("click", async e => {
    const b = e.target.closest("[data-commande]"); if (!b) return;
    const texte = texteCommande();
    if (b.dataset.commande === "envoyer" && navigator.share) { try { await navigator.share({ text: texte }); return; } catch (er) { if (er.name === "AbortError") return; } }
    try { await navigator.clipboard.writeText(texte); } catch { const t = document.createElement("textarea"); t.value = texte; document.body.appendChild(t); t.select(); document.execCommand("copy"); t.remove(); }
    toast("Commande copiée ✓ : collez-la dans WhatsApp ou un mail");
  });
  function majMetre() {
    const m = metre(), f = n => n.toLocaleString("fr-FR", { maximumFractionDigits: 1 });
    const ouvert = document.querySelector("#metre .deroule-carrelage")?.open, cmd = carrelageACommander();
    const ouvertF = document.querySelector("#metre .deroule-fournitures")?.open, fourn = fournitures();
    const bloc = (v, t) => `<div><b style="font-family:var(--serif);font-size:20px;font-weight:400">${f(v)} m²</b><br><span class="gris" style="font-size:13px">${t}</span></div>`;
    document.getElementById("metre").innerHTML = `<div class="petit" style="margin-bottom:8px">Métré</div>
      <div class="deux" style="gap:12px">${bloc(m.sol, `sol · ${FORMATS[etat.sol.format].nom}`)}${bloc(m.murs, "faïence murale")}${bloc(m.peinture, "peinture murs")}${bloc(m.plafond, "plafond")}</div>
      <details class="groupe-ajout deroule-carrelage" style="margin-top:10px;border-bottom:0;border-top:1px solid var(--sable)" ${ouvert ? "open" : ""}><summary>Carrelage à acheter (client)<span>${f(cmd.reduce((a, c) => a + Math.ceil(c.total * 10) / 10, 0))} m² en tout</span></summary>
      ${cmd.map(c => `<div style="display:flex;justify-content:space-between;gap:12px;padding:8px 0;border-top:1px solid var(--sable)">
        <div><b style="font-weight:600">${c.titre}</b><br><span class="gris" style="font-size:13px">${esc(c.matiere)} · ${esc(c.format)}<br>${f(c.surf)} m² posés + ${Math.round(c.chute * 100)} % de chutes</span></div>
        <div style="text-align:right;white-space:nowrap"><b style="font-family:var(--serif);font-size:20px;font-weight:400">${f(Math.ceil(c.total * 10) / 10)} m²</b>${c.n ? `<br><span class="gris" style="font-size:13px">≈ ${c.n.toLocaleString("fr-FR")} ${c.unite}</span>` : ""}</div></div>`).join("")}
      <p class="gris" style="font-size:12px;margin-top:6px">Arrondissez au nombre de boîtes du fournisseur.</p></details>
      <details class="groupe-ajout deroule-fournitures" style="border-bottom:0;border-top:1px solid var(--sable)" ${ouvertF ? "open" : ""}><summary>Mes consommables<span>${fourn.length} articles</span></summary>
      ${fourn.map(x => `<div style="display:flex;justify-content:space-between;gap:12px;padding:8px 0;border-top:1px solid var(--sable)">
        <div><b style="font-weight:600">${esc(x.nom)}</b>${x.detail ? `<br><span class="gris" style="font-size:13px">${esc(x.detail)}</span>` : ""}</div>
        <div style="text-align:right;white-space:nowrap;font-weight:600">${esc(x.qte)}</div></div>`).join("")}
      <p class="gris" style="font-size:12px;margin-top:6px">Quantités courantes de pose : vérifiez la fiche du produit choisi.</p></details>
      <div class="actions-doc" style="margin:12px 0 0"><button type="button" class="btn clair petit-btn" data-commande="envoyer">Commander mes consommables</button><button type="button" class="btn discret petit-btn" data-commande="copier">Copier</button></div>`;
  }

  /* --- Sélection, déplacement au doigt --- */
  const ray = new THREE.Raycaster(), ptr = new THREE.Vector2(), planSol = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), point = new THREE.Vector3();
  let glisse = false, depart = null; const decal = new THREE.Vector3();
  const versPtr = e => { const r = renderer.domElement.getBoundingClientRect(); ptr.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1); };
  function objetSous(e) {
    versPtr(e); ray.setFromCamera(ptr, camera);
    const hit = ray.intersectObjects(meubles.children.filter(g => g.visible), true)[0];
    if (!hit) return null; let o = hit.object; while (o.parent && o.parent !== meubles) o = o.parent; return o.userData.index;
  }
  renderer.domElement.addEventListener("pointerdown", e => {
    depart = { x: e.clientX, y: e.clientY };
    const i = objetSous(e); if (i === null || i === undefined) return;
    selection = i; afficherSelection(); glisse = true; controles.enabled = false;
    ray.ray.intersectPlane(planSol, point); const o = etat.objets[i]; decal.set(o.x - point.x, 0, o.z - point.z);
    renderer.domElement.setPointerCapture(e.pointerId);
  });
  renderer.domElement.addEventListener("pointermove", e => {
    if (!glisse || selection === null) return;
    versPtr(e); ray.setFromCamera(ptr, camera); if (!ray.ray.intersectPlane(planSol, point)) return;
    const o = etat.objets[selection]; o.x = point.x + decal.x; o.z = point.z + decal.z; placer(selection);
  });
  renderer.domElement.addEventListener("pointerup", e => {
    if (!glisse && depart && Math.hypot(e.clientX - depart.x, e.clientY - depart.y) < 5) { selection = null; afficherSelection(); }
    if (glisse && selection !== null) { const t = etat.objets[selection]?.type; if (t === "douche") construirePiece(); else if (t === "porte" || t === "fenetre") majMetre(); }
    glisse = false; controles.enabled = true;
  });

  const LIBELLES = { travaux: "Travaux", receveur: "Receveur", diametre: "Diamètre", ouverture: "Ouverture", couleur: "Couleur", modele: "Modèle", style: "Pose", facade: "Façade" };
  const champsObjet = (o, c) => `
      ${c.tailles ? `<label>Tailles courantes</label><div class="palette" style="margin-bottom:12px">${c.tailles.map(([w, d]) => `<button type="button" class="btn ${cm(o.w) === w && cm(o.d) === d ? "" : "discret"} petit-btn" data-taille="${w}x${d}">${w} × ${d}</button>`).join("")}</div>` : ""}
      <div class="trois">
        <div class="champ"><label>Largeur cm</label><input type="number" data-od="w" value="${cm(o.w)}" inputmode="numeric"></div>
        <div class="champ"><label>${c.pose === "dansMur" ? "Épaisseur" : "Profondeur"} cm</label><input type="number" data-od="d" value="${cm(o.d)}" inputmode="numeric"></div>
        <div class="champ"><label>Hauteur cm</label><input type="number" data-od="h" value="${cm(o.h)}" inputmode="numeric"></div>
      </div>
      ${c.pose === "mur" || c.pose === "dansMur" ? `<div class="champ"><label>Hauteur de pose (cm depuis le sol)</label><input type="number" data-od="y" value="${cm(o.y || 0)}" inputmode="numeric"></div>` : ""}
      ${Object.entries(c.options || {}).map(([k, vals]) => k === "finition"
        ? `<label>Finition</label><div class="palette" style="margin-bottom:12px">${vals.map(v => `<button type="button" class="pastille ${o[k] === v ? "actif" : ""}" data-opt="${k}" data-val="${v}" title="${BOIS[v]}" aria-label="${BOIS[v]}" style="background:${v}"></button>`).join("")}</div>`
        : `<div class="champ"><label>${LIBELLES[k] || k}</label><select data-opt="${k}">${vals.map(v => `<option ${o[k] === v ? "selected" : ""}>${esc(v)}</option>`).join("")}</select></div>`).join("")}`;
  function afficherSelection() {
    const p = document.getElementById("selPanneau");
    if (selection === null || !etat.objets[selection]) { selection = null; p.hidden = true; return; }
    const o = etat.objets[selection], c = CAT[o.type];
    p.hidden = false;
    p.innerHTML = `<div class="entete" style="margin-bottom:10px"><h2>${esc(c.nom)}</h2><button type="button" class="icone" data-sel="fermer" aria-label="Fermer">✕</button></div>
      ${champsObjet(o, c)}
      <div class="actions-doc" style="margin:6px 0 0">
        <button type="button" class="btn clair petit-btn" data-sel="tourner">↻ ${c.pose === "mur" || c.pose === "dansMur" ? "Mur suivant" : "Tourner"}</button>
        <button type="button" class="btn discret petit-btn" data-sel="dupliquer">Dupliquer</button>
        <button type="button" class="btn danger petit-btn" data-sel="retirer">Retirer</button>
      </div>`;
  }
  const panneauSel = document.getElementById("selPanneau");
  function refaireIndex(i) {
    const o = etat.objets[i], g = CAT[o.type].faire(o.w, o.d, o.h, o);
    g.userData.index = i; meubles.remove(objetsMesh.get(i)); meubles.add(g); objetsMesh.set(i, g); placer(i);
  }
  const refaire = () => {
    const i = selection, o = etat.objets[i]; refaireIndex(i);
    if (o.type === "douche") construirePiece(); else majMetre();
  };
  panneauSel.addEventListener("change", e => {
    const t = e.target, o = etat.objets[selection]; if (!o) return;
    if (t.dataset.od) { const v = Number(t.value) || 0; o[t.dataset.od] = t.dataset.od === "y" ? Math.max(0, v) / 100 : Math.max(1, v) / 100; refaire(); }
    else if (t.dataset.opt) { o[t.dataset.opt] = t.value; refaire(); }
  });
  panneauSel.addEventListener("click", e => {
    const b = e.target.closest("button"); if (!b || selection === null) return;
    const o = etat.objets[selection];
    if (b.dataset.taille) { [o.w, o.d] = b.dataset.taille.split("x").map(v => Number(v) / 100); refaire(); afficherSelection(); }
    else if (b.dataset.opt) { o[b.dataset.opt] = b.dataset.val; refaire(); afficherSelection(); }
    else if (b.dataset.sel === "fermer") { selection = null; afficherSelection(); }
    else if (b.dataset.sel === "retirer") { etat.objets.splice(selection, 1); selection = null; reconstruire(); }
    else if (b.dataset.sel === "dupliquer") { etat.objets.push({ ...o, x: o.x + .15, z: o.z + .15 }); selection = etat.objets.length - 1; reconstruire(); }
    else if (b.dataset.sel === "tourner") tournerObjet(selection);
  });

  /* --- Réglages de la pièce et des revêtements --- */
  const panneau = document.getElementById("reglages3d");
  panneau.addEventListener("click", e => {
    const b = e.target.closest("button"); if (!b) return;
    const cle = Object.keys(b.dataset).find(k => k.startsWith("mat"));
    if (cle) {
      const k = cle.slice(3).toLowerCase(); etat[k].matiere = b.dataset[cle];
      if (k === "sol" && ["bois", "boisClair", "noyer"].includes(b.dataset[cle])) etat.sol.format = "parquet";
      panneau.querySelector(`[data-nommat="${k}"]`).textContent = MATIERES[b.dataset[cle]].nom;
      panneau.querySelector(`[data-mini="${k}"]`).style.background = MATIERES[b.dataset[cle]].couleur;
    } else if (b.dataset.peinture) {
      etat.peinture = b.dataset.peinture;
      document.getElementById("nomPeinture").textContent = PEINTURES[etat.peinture] || "";
      document.getElementById("miniPeinture").style.background = etat.peinture;
    }
    else if (b.dataset.robinet) {
      etat.robinetterie = b.dataset.robinet; appliquerRobinetterie(etat.robinetterie);
      panneau.querySelectorAll("[data-robinet]").forEach(x => x.classList.toggle("actif", x === b));
      document.getElementById("nomRobinet").textContent = ROBINETTERIE[etat.robinetterie].nom;
      document.getElementById("miniRobinet").style.background = ROBINETTERIE[etat.robinetterie].couleur; return;
    }
    else if (b.dataset.ajout) {
      choisirAvantAjout(b.dataset.ajout); return;
    } else return;
    b.parentElement.querySelectorAll(".pastille").forEach(x => x.classList.toggle("actif", x === b));
    panneau.querySelectorAll("[data-format]").forEach(s => { s.value = etat[s.dataset.format].format; });
    construirePiece();
  });
  const surReglage = e => {
    const t = e.target;
    if (t.dataset.dim) {
      changerDims(t.dataset.dim, Math.max(1, Math.min(9, (Number(t.value) || 0) / 100)));
      const r = document.querySelector("#piece3d summary span"); if (r) r.textContent = `${cm(etat.dims.l)} × ${cm(etat.dims.p)} × ${cm(etat.dims.h)}`; return;
    }
    if (t.dataset.format) etat[t.dataset.format].format = t.value;
    else if (t.dataset.joint) etat[t.dataset.joint].joint = t.value;
    else if (t.id === "faience") etat.faience = t.value;
    else if (t.id === "depose") etat.depose = t.value === "1";
    else if (t.id === "fauxPlafond") { etat.fauxPlafond = t.value === "1"; majMetre(); return; }
    else if (t.id === "accentActif") etat.accent.actif = t.checked;
    else if (t.id === "penteMur" || t.id === "penteBasse" || t.id === "penteLarg") {
      etat.pente = { mur: document.getElementById("penteMur").value, basse: Math.max(.5, (Number(document.getElementById("penteBasse").value) || 100) / 100),
        largeur: Math.max(.3, (Number(document.getElementById("penteLarg").value) || 120) / 100) };
    }
    else return;
    construirePiece();
  };
  panneau.addEventListener("change", surReglage);
  document.getElementById("piece3d").addEventListener("change", surReglage);

  /* --- Barre d'actions --- */
  let dessus = false;
  document.getElementById("vueDessus").onclick = e => {
    dessus = !dessus;
    if (dessus) { camera.position.set(0, Math.max(etat.dims.l, etat.dims.p) * 2.2, .01); controles.target.set(0, 0, 0); e.target.textContent = "Vue 3D"; }
    else { camera.position.set(2.6, 2.3, 3.2); controles.target.set(0, .9, 0); e.target.textContent = "Vue de dessus"; }
  };
  let avantZero = null, minuteurZero = null;
  document.getElementById("aZero").onclick = e => {
    const b = e.target;
    if (avantZero) { // annuler : on remet la pièce comme avant
      etat.objets = JSON.parse(avantZero); avantZero = null; clearTimeout(minuteurZero);
      b.textContent = "Vider la salle de bain"; reconstruire(); toast("Pièce remise comme avant ✓"); return;
    }
    avantZero = JSON.stringify(etat.objets);
    etat.objets = []; selection = null; reconstruire();
    b.textContent = "Annuler (remettre comme avant)";
    toast("Salle de bain vidée : ajoutez vos éléments");
    minuteurZero = setTimeout(() => { avantZero = null; b.textContent = "Vider la salle de bain"; }, 15000);
  };
  document.getElementById("modeChantier").onclick = e => { chantier = !chantier; e.target.textContent = chantier ? "Vue finie" : "Mode chantier"; construirePiece(); };
  const image = (largeur = 1400) => {
    renderer.render(scene, camera);
    const src = renderer.domElement, c = document.createElement("canvas");
    c.width = largeur; c.height = Math.round(largeur * src.height / src.width); c.getContext("2d").drawImage(src, 0, 0, c.width, c.height);
    return c.toDataURL("image/jpeg", .85);
  };
  document.getElementById("imageSim").onclick = () => { const a = document.createElement("a"); a.href = image(); a.download = `simulation-${(client?.nom || "salle-de-bain").toLowerCase()}.jpg`; a.click(); };
  const logo = new Image(); logo.src = "../medias/logo.png";
  document.getElementById("videoSim").onclick = async e => {
    if (tournage) return;
    const formats = ["video/mp4;codecs=avc1", "video/mp4", "video/webm;codecs=vp9", "video/webm"];
    const type = window.MediaRecorder && formats.find(f => MediaRecorder.isTypeSupported(f));
    if (!type) { toast("Ce téléphone ne sait pas enregistrer de vidéo ici : utilisez le bouton Image."); return; }
    const L = 720, H = 1280, sortie = document.createElement("canvas"); sortie.width = L; sortie.height = H;
    const g = sortie.getContext("2d");
    const rapport = renderer.getPixelRatio(), taille = new THREE.Vector2(); renderer.getSize(taille);
    renderer.setPixelRatio(1); renderer.setSize(L, H, false); camera.aspect = L / H; camera.updateProjectionMatrix();
    const flux = sortie.captureStream(30), rec = new MediaRecorder(flux, { mimeType: type, videoBitsPerSecond: 6e6 }), morceaux = [];
    rec.ondataavailable = ev => ev.data.size && morceaux.push(ev.data);
    const d = new THREE.Vector3().subVectors(camera.position, controles.target);
    const diag = Math.hypot(etat.dims.l, etat.dims.p), rayon = Math.max(Math.hypot(d.x, d.z), diag * 1.45 + 1.2), duree = 10000;
    const bouton = e.target, compteur = document.getElementById("tournageS"), bandeau = document.getElementById("tournage");
    bouton.disabled = true; bandeau.hidden = false; controles.enabled = false;
    tournage = {
      debut: performance.now(), duree, rayon, hauteur: etat.dims.h + .9, angle: Math.atan2(d.x, d.z),
      image() {
        g.drawImage(renderer.domElement, 0, 0, L, H);
        if (logo.complete && logo.naturalWidth) { const lh = 46, lw = lh * logo.naturalWidth / logo.naturalHeight; g.fillStyle = "#fff"; g.fillRect(28, 40, lw + 28, lh + 20); g.drawImage(logo, 42, 50, lw, lh); }
        g.font = "600 30px Inter, Arial, sans-serif"; g.textAlign = "center"; g.fillStyle = "rgba(20,19,18,.55)"; g.fillRect(L / 2 - 170, H - 104, 340, 52);
        g.fillStyle = "#fff"; g.fillText("karenovation.fr", L / 2, H - 67);
        compteur.textContent = Math.max(0, Math.ceil((duree - (performance.now() - this.debut)) / 1000));
        if (performance.now() - this.debut >= duree && rec.state === "recording") rec.stop();
      }
    };
    rec.start(250);
    await new Promise(ok => { rec.onstop = ok; });
    tournage = null; controles.enabled = true; bouton.disabled = false; bandeau.hidden = true;
    renderer.setPixelRatio(rapport); renderer.setSize(taille.x, taille.y, false); camera.aspect = taille.x / taille.y; camera.updateProjectionMatrix();
    const ext = type.startsWith("video/mp4") ? "mp4" : "webm";
    const fichier = new File([new Blob(morceaux, { type: type.split(";")[0] })], `simulation-${(client?.nom || "salle-de-bain").toLowerCase()}.${ext}`, { type: type.split(";")[0] });
    if (navigator.canShare && navigator.canShare({ files: [fichier] })) { try { await navigator.share({ files: [fichier], title: "Simulation KA Rénovation" }); return; } catch (er) { if (er.name === "AbortError") return; } }
    const a = document.createElement("a"); a.href = URL.createObjectURL(fichier); a.download = fichier.name; a.click();
    toast("Vidéo enregistrée ✓");
  };
  /* --- Plan 2D coté (vu de dessus, à l'échelle) --- */
  const COURT = { douche: "Douche", baignoire: "Baignoire", ilot: "Baignoire îlot", laveMains: "Lave-mains", wc: "WC", wcSol: "WC", vasque: "Meuble vasque",
    double: "Double vasque", vasquePoser: "Vasque à poser", colonne: "Colonne", armoire: "Armoire", meubleHaut: "Meuble haut", etagere: "Étagère", banc: "Banc",
    laveLinge: "Lave-linge", radiateur: "Sèche-serv.", radiateurEau: "Radiateur", miroir: "Miroir", miroirRect: "Miroir" };
  const EN_HAUTEUR = ["armoire", "meubleHaut", "etagere", "miroir", "miroirRect"];
  function dessinerPlan(cv, choisi = null) {
    const W = 1600, Hc = 1200; cv.width = W; cv.height = Hc;
    const g = cv.getContext("2d"), { l, p } = etat.dims;
    const marge = 170, ech = Math.min((W - 2 * marge) / l, (Hc - 2 * marge - 90) / p);
    const ox = (W - l * ech) / 2, oy = marge + ((Hc - 2 * marge - 90) - p * ech) / 2;
    const X = x => ox + (x + l / 2) * ech, Y = z => oy + (z + p / 2) * ech;
    const ENCRE = "#1b1a18", GRIS = "#6d675f";
    g.fillStyle = "#fff"; g.fillRect(0, 0, W, Hc);
    // sol
    g.fillStyle = "#f4f1ec"; g.fillRect(X(-l / 2), Y(-p / 2), l * ech, p * ech);
    // murs (10 cm)
    const ep = .1 * ech; g.fillStyle = ENCRE;
    g.fillRect(X(-l / 2) - ep, Y(-p / 2) - ep, l * ech + 2 * ep, ep); g.fillRect(X(-l / 2) - ep, Y(p / 2), l * ech + 2 * ep, ep);
    g.fillRect(X(-l / 2) - ep, Y(-p / 2), ep, p * ech); g.fillRect(X(l / 2), Y(-p / 2), ep, p * ech);
    // repère d'un objet : centre, axes (u le long du mur, v vers la pièce)
    const axes = o => { const c = Math.cos(o.rot), s2 = Math.sin(o.rot); return { u: [c, -s2], v: [s2, c] }; };
    const coin = (o, a, b) => { const { u, v } = axes(o); return [X(o.x + u[0] * a + v[0] * b), Y(o.z + u[1] * a + v[1] * b)]; };
    const rect = (o, w, d, remplir, trait, tirets) => {
      const pts = [coin(o, -w / 2, -d / 2), coin(o, w / 2, -d / 2), coin(o, w / 2, d / 2), coin(o, -w / 2, d / 2)];
      g.beginPath(); pts.forEach(([a, b], i) => i ? g.lineTo(a, b) : g.moveTo(a, b)); g.closePath();
      if (remplir) { g.fillStyle = remplir; g.fill(); }
      g.setLineDash(tirets ? [10, 8] : []); g.lineWidth = 3; g.strokeStyle = trait; g.stroke(); g.setLineDash([]);
      return pts;
    };
    const texte = (t, x, y, taille = 26, coul = ENCRE, poids = 600) => { g.font = `${poids} ${taille}px Inter, Arial, sans-serif`; g.fillStyle = coul; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(t, x, y); };
    const ordre = [...etat.objets].sort((a, b) => (EN_HAUTEUR.includes(a.type) ? 1 : 0) - (EN_HAUTEUR.includes(b.type) ? 1 : 0));
    ordre.forEach(o => {
      const c = CAT[o.type]; if (!c) return;
      const cx = X(o.x), cy = Y(o.z);
      if (o.type === "porte" || o.type === "fenetre") {
        const k = murDe(o.rot), le = o.w * ech, horiz = k === 0 || k === 2;
        // ouverture dans le mur
        g.fillStyle = "#fff";
        if (horiz) g.fillRect(cx - le / 2, (k === 0 ? Y(-p / 2) - ep : Y(p / 2)) - 1, le, ep + 2); else g.fillRect((k === 3 ? X(-l / 2) - ep : X(l / 2)) - 1, cy - le / 2, ep + 2, le);
        g.strokeStyle = ENCRE; g.lineWidth = 3;
        if (o.type === "fenetre") {
          g.beginPath();
          if (horiz) { const y0 = k === 0 ? Y(-p / 2) - ep : Y(p / 2); [y0 + ep * .35, y0 + ep * .65].forEach(y => { g.moveTo(cx - le / 2, y); g.lineTo(cx + le / 2, y); }); }
          else { const x0 = k === 3 ? X(-l / 2) - ep : X(l / 2); [x0 + ep * .35, x0 + ep * .65].forEach(x => { g.moveTo(x, cy - le / 2); g.lineTo(x, cy + le / 2); }); }
          g.stroke();
          const [tx, ty] = coin(o, 0, .22); texte(`Fenêtre ${Math.round(o.w * 100)}`, tx, ty, 22, GRIS, 500);
        } else if (o.ouverture === "Coulissante") {
          const [a1, b1] = coin(o, -o.w / 2, .06), [a2, b2] = coin(o, o.w / 2 * .9, .06);
          g.lineWidth = 6; g.beginPath(); g.moveTo(a1, b1); g.lineTo(a2, b2); g.stroke();
          const [tx, ty] = coin(o, 0, .25); texte(`Porte coulissante ${Math.round(o.w * 100)}`, tx, ty, 22, GRIS, 500);
        } else {
          const [hx, hy] = coin(o, -o.w / 2, 0), [fx, fy] = coin(o, -o.w / 2, o.w), [ex, ey] = coin(o, o.w / 2, 0);
          g.lineWidth = 3; g.beginPath(); g.moveTo(hx, hy); g.lineTo(fx, fy); g.stroke();
          const a0 = Math.atan2(fy - hy, fx - hx), a1 = Math.atan2(ey - hy, ex - hx);
          g.setLineDash([8, 6]); g.lineWidth = 2; g.beginPath(); g.arc(hx, hy, o.w * ech, Math.min(a0, a1), Math.max(a0, a1)); if (Math.abs(a0 - a1) > Math.PI) { g.beginPath(); g.arc(hx, hy, o.w * ech, Math.max(a0, a1), Math.min(a0, a1) + TAU); } g.stroke(); g.setLineDash([]);
          const [tx, ty] = coin(o, 0, o.w * .55); texte(`Porte ${Math.round(o.w * 100)}`, tx, ty, 22, GRIS, 500);
        }
        return;
      }
      if (c.groupe === "Réseaux") {
        const [mx, my] = coin(o, 0, .07), sym = { arrivees: ["EC/EF", "#c0392b"], evacuation: ["EV", "#7f8c8d"], prise: ["PC", "#d68910"], interrupteur: ["I", "#d68910"], vmc: ["VMC", "#5d6d7e"], spot: ["", "#d4ac0d"] }[o.type] || ["", GRIS];
        g.beginPath(); g.arc(c.pose === "plafond" ? cx : mx, c.pose === "plafond" ? cy : my, o.type === "spot" ? 12 : 16, 0, TAU); g.fillStyle = sym[1]; g.fill();
        if (sym[0]) texte(sym[0], (c.pose === "plafond" ? cx : mx), (c.pose === "plafond" ? cy : my) + 30, 18, sym[1], 700);
        return;
      }
      if (o.type === "decroche" || o.type === "cloison") { // dessiné comme un morceau de mur
        rect(o, o.w, o.d, ENCRE, ENCRE, false);
        const [tx, ty] = coin(o, 0, o.d / 2 + .16); texte(`${o.type === "cloison" ? "Cloison" : "Décroché"} ${Math.round(o.w * 100)} × ${Math.round(o.d * 100)}`, tx, ty, 18, GRIS, 600);
        return;
      }
      if (o.type === "demolition") { // mur qui disparaît : en pointillés
        rect(o, o.w, o.d, null, ENCRE, true);
        const [tx, ty] = coin(o, 0, o.d / 2 + .16); texte(`À démolir ${Math.round(o.w * 100)} cm`, tx, ty, 18, GRIS, 600);
        return;
      }
      const haut = EN_HAUTEUR.includes(o.type);
      rect(o, o.w, o.d, haut ? null : (o.type === "douche" ? "#e3edf0" : "#ffffff"), haut ? GRIS : ENCRE, haut);
      if (o.type === "douche") { // pente vers l'évacuation
        g.strokeStyle = "#9fb7bf"; g.lineWidth = 2; const pts = [coin(o, -o.w / 2, -o.d / 2), coin(o, o.w / 2, -o.d / 2), coin(o, o.w / 2, o.d / 2), coin(o, -o.w / 2, o.d / 2)];
        g.beginPath(); g.moveTo(...pts[0]); g.lineTo(...pts[2]); g.moveTo(...pts[1]); g.lineTo(...pts[3]); g.stroke();
      }
      if (Math.min(o.w, o.d) < .25) { // élément fin : étiquette posée devant, dans la pièce
        const [tx, ty] = haut ? coin(o, 0, -o.d / 2 - .15) : coin(o, 0, o.d / 2 + .14); // en hauteur : écrit derrière le mur
        texte(`${COURT[o.type] || c.nom} ${Math.round(o.w * 100)}`, tx, ty, 18, GRIS, 600);
      } else {
        const taille = Math.max(15, Math.min(26, Math.min(o.w, o.d) * ech / 3.2));
        texte(COURT[o.type] || c.nom, cx, cy - taille * .6, taille, haut ? GRIS : ENCRE);
        texte(`${Math.round(o.w * 100)} × ${Math.round(o.d * 100)}`, cx, cy + taille * .7, taille * .8, GRIS, 500);
      }
    });
    // plafond sous pente : limite de la pleine hauteur en pointillés
    const pe = etat.pente;
    if (pe && pe.mur && pe.mur !== "aucun") {
      const L = pe.largeur; g.setLineDash([14, 10]); g.lineWidth = 2; g.strokeStyle = GRIS; g.beginPath();
      if (pe.mur === "gauche") { g.moveTo(X(-l / 2 + L), Y(-p / 2)); g.lineTo(X(-l / 2 + L), Y(p / 2)); }
      if (pe.mur === "droite") { g.moveTo(X(l / 2 - L), Y(-p / 2)); g.lineTo(X(l / 2 - L), Y(p / 2)); }
      if (pe.mur === "fond") { g.moveTo(X(-l / 2), Y(-p / 2 + L)); g.lineTo(X(l / 2), Y(-p / 2 + L)); }
      if (pe.mur === "devant") { g.moveTo(X(-l / 2), Y(p / 2 - L)); g.lineTo(X(l / 2), Y(p / 2 - L)); }
      g.stroke(); g.setLineDash([]);
      const mx = pe.mur === "gauche" ? X(-l / 2 + L / 2) : pe.mur === "droite" ? X(l / 2 - L / 2) : X(0), my = pe.mur === "fond" ? Y(-p / 2 + L / 2) : pe.mur === "devant" ? Y(p / 2 - L / 2) : Y(p / 2) - 40;
      texte(`Sous pente ${Math.round(pe.basse * 100)} → ${Math.round(etat.dims.h * 100)} cm`, mx, my, 20, GRIS, 600);
    }
    // élément choisi : liseré fin
    const oc = choisi !== null && etat.objets[choisi];
    if (oc && CAT[oc.type]) {
      const r = CAT[oc.type].groupe === "Réseaux" || ["porte", "fenetre"].includes(oc.type);
      if (r) { const [mx, my] = CAT[oc.type].pose === "plafond" ? [X(oc.x), Y(oc.z)] : coin(oc, 0, .07); g.beginPath(); g.arc(mx, my, 30, 0, TAU); g.lineWidth = 3; g.strokeStyle = "#c8141a"; g.stroke(); }
      else rect(oc, oc.w + .06, oc.d + .06, null, "#c8141a", false);
    }
    // cotes générales
    g.strokeStyle = ENCRE; g.fillStyle = ENCRE; g.lineWidth = 2;
    const fleche = (x1, y1, x2, y2) => { g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke(); [[x1, y1, x2, y2], [x2, y2, x1, y1]].forEach(([a, b, c2, d]) => { const an = Math.atan2(d - b, c2 - a); g.beginPath(); g.moveTo(a, b); g.lineTo(a + 16 * Math.cos(an + .35), b + 16 * Math.sin(an + .35)); g.lineTo(a + 16 * Math.cos(an - .35), b + 16 * Math.sin(an - .35)); g.closePath(); g.fill(); }); };
    const yh = Y(-p / 2) - ep - 50; fleche(X(-l / 2), yh, X(l / 2), yh); texte(`${Math.round(l * 100)} cm`, (X(-l / 2) + X(l / 2)) / 2, yh - 24, 30);
    const xg = X(-l / 2) - ep - 50; fleche(xg, Y(-p / 2), xg, Y(p / 2));
    g.save(); g.translate(xg - 26, (Y(-p / 2) + Y(p / 2)) / 2); g.rotate(-Math.PI / 2); texte(`${Math.round(p * 100)} cm`, 0, 0, 30); g.restore();
    // cartouche
    const yb = Hc - 70; g.fillStyle = "#c8141a"; g.fillRect(marge, yb - 34, 60, 3);
    g.textAlign = "left"; g.textBaseline = "middle"; g.fillStyle = ENCRE; g.font = "600 28px Inter, Arial, sans-serif";
    g.fillText(`KA Rénovation · ${etat.nom}${client ? " · " + nomClient(client) : ""}`, marge, yb);
    g.font = "500 22px Inter, Arial, sans-serif"; g.fillStyle = GRIS;
    g.fillText(`Surface ${String(Math.round(l * p * 100) / 100).replace(".", ",")} m² · hauteur ${Math.round(etat.dims.h * 100)} cm · ${new Date().toLocaleDateString("fr-FR")} · cotes en cm, plan indicatif`, marge, yb + 34);
    return { versPiece: (px, py) => [(px - ox) / ech - l / 2, (py - oy) / ech - p / 2], ech };
  }
  // élément sous le doigt, en mètres dans la pièce (les éléments en hauteur passent après ceux au sol)
  function objetSousPlan(x, z) {
    let trouve = null, meilleur = Infinity;
    etat.objets.forEach((o, i) => {
      const c = CAT[o.type]; if (!c) return;
      const dx = x - o.x, dz = z - o.z, ponctuel = c.groupe === "Réseaux" || ["porte", "fenetre"].includes(o.type);
      if (ponctuel) { const d = Math.hypot(dx, dz); if (d < Math.max(.25, (o.w || 0) / 2) && d < meilleur) { meilleur = d; trouve = i; } return; }
      const cs = Math.cos(o.rot), sn = Math.sin(o.rot), u = dx * cs - dz * sn, v = dx * sn + dz * cs;
      if (Math.abs(u) <= o.w / 2 + .04 && Math.abs(v) <= o.d / 2 + .04) {
        const score = (EN_HAUTEUR.includes(o.type) ? 1 : 0) + Math.hypot(u, v) / 10;
        if (score < meilleur) { meilleur = score; trouve = i; }
      }
    });
    return trouve;
  }
  document.getElementById("plan2d").onclick = () => {
    const v = document.createElement("div"); v.className = "voile";
    const listeAjout = GROUPES.map(gp => `<optgroup label="${gp}">${Object.entries(CAT).filter(([, c]) => c.groupe === gp).map(([k, c]) => `<option value="${k}">${esc(c.nom)}</option>`).join("")}</optgroup>`).join("");
    v.innerHTML = `<div class="fenetre" role="dialog" aria-modal="true" style="max-width:900px"><div class="tete"><h2>Plan 2D</h2><button class="icone" data-fermer aria-label="Fermer">✕</button></div>
      <div class="trois" id="planPiece" style="margin-bottom:6px">
        <div class="champ"><label>Pièce : longueur cm</label><input type="number" data-pdim="l" value="${cm(etat.dims.l)}" inputmode="numeric"></div>
        <div class="champ"><label>Largeur cm</label><input type="number" data-pdim="p" value="${cm(etat.dims.p)}" inputmode="numeric"></div>
        <div class="champ"><label>Hauteur cm</label><input type="number" data-pdim="h" value="${cm(etat.dims.h)}" inputmode="numeric"></div>
      </div>
      <div class="actions-doc" style="margin:0 0 10px;align-items:center">
        <select id="planAjout" style="width:auto;flex:1;min-width:180px"><option value="">+ Ajouter un élément…</option>${listeAjout}</select>
        <button class="btn clair" id="planTourner" disabled>Tourner</button>
        <button class="btn danger" id="planRetirer" disabled>Retirer</button>
      </div>
      <div class="trois" id="planElement" hidden style="margin-bottom:6px"></div>
      <canvas id="planCanvas" style="width:100%;height:auto;border:1px solid var(--sable);border-radius:12px;display:block;touch-action:none;cursor:grab"></canvas>
      <p class="gris" style="font-size:13px;margin:10px 0 14px" id="planAide">Touchez un élément pour le choisir, faites-le glisser pour le déplacer. Traits pleins : au sol · pointillés : en hauteur · EC/EF arrivées d'eau, EV évacuation, PC prise.</p>
      <div class="actions-doc" style="margin:0"><button class="btn" id="planTelecharger">Télécharger le plan</button></div></div>`;
    document.body.appendChild(v);
    const cv = v.querySelector("#planCanvas"), bT = v.querySelector("#planTourner"), bR = v.querySelector("#planRetirer"), aide = v.querySelector("#planAide");
    let choisi = null, repere = null, glisse = null;
    const zoneEl = v.querySelector("#planElement");
    const champsElement = () => { // dimensions de l'élément choisi
      const o = choisi !== null && etat.objets[choisi], c = o && CAT[o.type];
      if (!c || c.groupe === "Réseaux") { zoneEl.hidden = true; zoneEl.dataset.pour = ""; return; }
      if (zoneEl.dataset.pour === String(choisi) + o.type) return;
      zoneEl.dataset.pour = String(choisi) + o.type; zoneEl.hidden = false;
      zoneEl.innerHTML = `${c.tailles ? `<div class="champ"><label>${esc(COURT[o.type] || c.nom)} : taille</label><select data-ptaille><option value="">Sur mesure</option>${c.tailles.map(([w, d]) => `<option value="${w}x${d}" ${cm(o.w) === w && cm(o.d) === d ? "selected" : ""}>${w} × ${d}</option>`).join("")}</select></div>` : ""}
        <div class="champ"><label>Largeur cm</label><input type="number" data-pod="w" value="${cm(o.w)}" inputmode="numeric"></div>
        <div class="champ"><label>${c.pose === "dansMur" ? "Épaisseur" : "Profondeur"} cm</label><input type="number" data-pod="d" value="${cm(o.d)}" inputmode="numeric"></div>`;
    };
    const redessiner = () => {
      repere = dessinerPlan(cv, choisi);
      champsElement();
      bT.disabled = bR.disabled = choisi === null;
      if (choisi !== null) aide.textContent = `${CAT[etat.objets[choisi].type].nom} : faites glisser pour déplacer, ou utilisez Tourner / Retirer.`;
    };
    redessiner();
    const pointPiece = e => { const r = cv.getBoundingClientRect(); return repere.versPiece((e.clientX - r.left) * cv.width / r.width, (e.clientY - r.top) * cv.height / r.height); };
    cv.addEventListener("pointerdown", e => {
      const [x, z] = pointPiece(e); choisi = objetSousPlan(x, z);
      if (choisi !== null) { const o = etat.objets[choisi]; glisse = { dx: x - o.x, dz: z - o.z }; cv.setPointerCapture(e.pointerId); cv.style.cursor = "grabbing"; }
      selection = choisi; afficherSelection(); redessiner();
    });
    cv.addEventListener("pointermove", e => {
      if (!glisse || choisi === null) return;
      const [x, z] = pointPiece(e), o = etat.objets[choisi];
      o.x = x - glisse.dx; o.z = z - glisse.dz; placer(choisi); redessiner();
    });
    const lacher = () => { if (!glisse) return; glisse = null; cv.style.cursor = "grab"; if (etat.objets[choisi]?.type === "douche") construirePiece(); else majMetre(); };
    cv.addEventListener("pointerup", lacher); cv.addEventListener("pointercancel", lacher);
    // pièce : longueur, largeur, hauteur
    v.querySelector("#planPiece").addEventListener("change", e => {
      const k = e.target.dataset.pdim; if (!k) return;
      const max = k === "h" ? 4 : 9, min = k === "h" ? 2 : 1;
      changerDims(k, Math.max(min, Math.min(max, (Number(e.target.value) || 0) / 100))); e.target.value = cm(etat.dims[k]);
      const champ3d = document.querySelector(`#piece3d [data-dim="${k}"]`); if (champ3d) champ3d.value = cm(etat.dims[k]);
      redessiner();
    });
    // élément : taille courante ou sur mesure
    zoneEl.addEventListener("change", e => {
      const o = etat.objets[choisi]; if (!o) return; const t = e.target;
      if (t.dataset.ptaille !== undefined) { if (!t.value) return; [o.w, o.d] = t.value.split("x").map(x => Number(x) / 100); }
      else if (t.dataset.pod) o[t.dataset.pod] = Math.max(1, Number(t.value) || 0) / 100;
      else return;
      selection = choisi; refaire(); if (o.type === "douche") construirePiece(); afficherSelection();
      zoneEl.dataset.pour = ""; redessiner();
    });
    v.querySelector("#planAjout").onchange = e => { if (!e.target.value) return; choisi = ajouterObjet(e.target.value); e.target.value = ""; redessiner(); };
    bT.onclick = () => { if (choisi === null) return; tournerObjet(choisi); redessiner(); };
    bR.onclick = () => { if (choisi === null) return; etat.objets.splice(choisi, 1); choisi = null; selection = null; reconstruire(); aide.textContent = "Élément retiré."; redessiner(); };
    v.addEventListener("click", e => { if (e.target === v || e.target.closest("[data-fermer]")) v.remove(); });
    v.querySelector("#planTelecharger").onclick = async () => {
      dessinerPlan(cv, null); // le plan envoyé ne montre pas l'élément choisi
      const blob = await new Promise(ok => cv.toBlob(ok, "image/png")); redessiner();
      const fichier = new File([blob], `plan-${(client?.nom || "salle-de-bain").toLowerCase()}.png`, { type: "image/png" });
      if (navigator.canShare && navigator.canShare({ files: [fichier] })) { try { await navigator.share({ files: [fichier] }); return; } catch (er) { if (er.name === "AbortError") return; } }
      const a = document.createElement("a"); a.href = URL.createObjectURL(fichier); a.download = fichier.name; a.click();
    };
  };

  /* --- Gemini (en option, avec le compte de l'artisan) : on prépare le texte et l'image, il colle et envoie --- */
  const metres = v => String(Math.round(v * 100) / 100).replace(".", ",") + " m";
  const revetement = r => `${MATIERES[r.matiere].nom.toLowerCase()}, format ${FORMATS[r.format].nom}, joints ${({ blanc: "blancs", gris: "gris", noir: "noirs" })[r.joint]}`;
  // place de chaque élément, telle qu'on la voit sur l'image 3D (vue de face : mur du fond et mur de gauche visibles)
  const NOMS_MURS = ["sur le mur du fond", "sur le mur de droite", "sur le mur de devant", "sur le mur de gauche"];
  function emplacement(o) {
    const c = CAT[o.type], { l, p } = etat.dims, tx = (o.x + l / 2) / l, tz = (o.z + p / 2) / p;
    const long = t => t < .34 ? "à gauche" : t > .66 ? "à droite" : "au milieu", prof = t => t < .34 ? "côté fond" : t > .66 ? "côté devant" : "au milieu";
    if (c.pose === "mur" && etat.objets.some(d2 => (d2.type === "decroche" || d2.type === "cloison") && Math.hypot(o.x - d2.x, o.z - d2.z) < Math.max(d2.w, d2.d) / 2 + o.d / 2 + .1)) return "contre le coffrage (gaine technique)";
    if (c.pose === "mur" || c.pose === "dansMur") {
      const k = murDe(o.rot), derriere = (k === 2 && camera.position.z > 0) || (k === 0 && camera.position.z < 0);
      return `${NOMS_MURS[k]}, ${k === 0 || k === 2 ? long(tx) : prof(tz)}${derriere ? " (derrière le photographe : hors du cadre, ne pas le montrer)" : ""}`;
    }
    const [ex, ez] = encombrement(o), marge = .12;
    const murs = [o.z - ez < -p / 2 + marge && "fond", o.x + ex > l / 2 - marge && "droite", o.z + ez > p / 2 - marge && "devant", o.x - ex < -l / 2 + marge && "gauche"].filter(Boolean);
    if (murs.length >= 2) return `dans l'angle ${murs.slice(0, 2).join("-")}`;
    if (murs.length === 1) return `contre le mur ${murs[0] === "fond" ? "du fond" : "de " + murs[0]}`;
    return "au centre de la pièce";
  }
  function descriptionIA(source, format = "image") {
    const { l, p, h } = etat.dims;
    const equipements = etat.objets.filter(o => CAT[o.type].groupe !== "Réseaux" && o.type !== "demolition").map(o => {
      const c = CAT[o.type], w = o.w ?? c.dims[0] / 100, d = o.d ?? c.dims[1] / 100;
      const opts = Object.keys(c.options || {}).filter(k => k !== "travaux").map(k => k === "finition" ? (BOIS[o[k]] || "").toLowerCase()
        : o[k] === "Comme la robinetterie" ? (ROBINETTERIE[etat.robinetterie]?.nom || "").toLowerCase()
        : o[k] ? (k === "receveur" ? "receveur " : "") + o[k].toLowerCase() : "").filter(Boolean);
      const taille = c.tailles && ["Sanitaires", "Meubles"].includes(c.groupe) ? ` (${Math.round(w * 100)} × ${Math.round(d * 100)} cm)` : "";
      const paroi = o.type === "douche" ? ", paroi vitrée fixe avec profilé noir" : o.type === "wc" ? ", plaque de chasse d'eau noire"
        : o.type === "decroche" ? ", du sol au plafond, habillé comme les murs" : o.type === "cloison" ? ", cloison du sol au plafond, habillée comme les murs" : "";
      return `- ${c.nom}${taille}${opts.length ? ", " + opts.join(", ") : ""}${paroi}${source === "photo" ? "" : " : " + emplacement(o)}`;
    });
    const faience = { plafond: "jusqu'au plafond", "120": "à 1,20 m de haut (jusqu'au plafond dans la douche)", douche: "seulement dans la douche" }[etat.faience];
    const FORMATS_IMG = { image: "le même cadrage que l'image jointe", vertical: "vertical 9:16 (pour les réseaux sociaux)", paysage: "horizontal 3:2" };
    const photo = source === "photo";
    // murs visibles selon l'angle de la 3D au moment où l'on prépare le texte
    const cote = camera.position.x > 0 ? "gauche" : "droite", face = camera.position.z > 0 ? "du fond" : "de devant";
    // angle de la 3D au moment où l'on prépare le texte : de face ou de trois quarts
    const cx = camera.position.x - controles.target.x, cz = camera.position.z - controles.target.z;
    const vue = Math.abs(cx) < Math.abs(cz) * .18 ? `de face, face au mur ${cz > 0 ? "du fond" : "de devant"}`
      : Math.abs(cz) < Math.abs(cx) * .18 ? `de face, face au mur de ${cx > 0 ? "gauche" : "droite"}`
      : `de trois quarts, en diagonale, depuis l'angle ${cz > 0 ? "devant" : "fond"}-${cx > 0 ? "droite" : "gauche"} de la pièce vers l'angle ${cz > 0 ? "fond" : "devant"}-${cx > 0 ? "gauche" : "droite"}`;
    return [
      photo
        ? "Rénovation de salle de bain : à partir de la photo jointe (la pièce actuelle de mon client), crée la photo de cette même pièce une fois rénovée."
        : "Rénovation de salle de bain : transforme l'image 3D jointe en vraie photo de la salle de bain une fois les travaux finis. Garde exactement sa composition, son angle et la place de chaque élément ; remplace seulement l'aspect maquette 3D par un rendu photo réaliste.",
      "",
      "STYLE PHOTO",
      "- Photographie d'architecture d'intérieur professionnelle, qualité magazine de décoration.",
      photo ? "- Même cadrage que la photo jointe, appareil à hauteur d'œil, lignes verticales bien droites, aucune déformation." : "- Objectif grand-angle 24 mm, lignes verticales bien droites, aucune déformation.",
      "- Lumière naturelle douce et diffuse, ombres légères, miroir lumineux allumé, balance des blancs neutre.",
      "- Rendu 100 % photoréaliste : vraies matières (céramique, verre, bois, métal), reflets justes, joints de carrelage nets et réguliers, légère profondeur de champ. Aucun aspect 3D, dessin ou image de synthèse.",
      `- Format : ${FORMATS_IMG[format] || FORMATS_IMG.image}.`,
      "",
      "À RESPECTER STRICTEMENT",
      photo
        ? "- Même point de vue que la photo : mêmes murs, même fenêtre, même porte, mêmes proportions."
        : `- POINT DE VUE : reprends EXACTEMENT l'angle et le cadrage de l'image 3D jointe (ici, vue ${vue}). Ne change pas d'angle, ne recadre pas, garde les mêmes éléments dans le champ ; la seule différence est que la pièce est vraie, fermée, avec son plafond.`,
      photo ? null : "- Chaque élément reste exactement à sa place et sur son mur, comme sur l'image 3D : ne déplace rien.",
      photo ? null : "- N'ajoute RIEN qui n'est pas sur l'image 3D : pas de porte, pas de fenêtre, pas de mur ou de cloison en plus, pas de niche, pas de radiateur, pas de meuble, pas de miroir en plus. Les murs coupés de la maquette ne doivent pas apparaître.",
      `- Pièce de ${metres(l)} × ${metres(p)}, hauteur ${metres(h)}.`,
      `- Carrelage mural ${faience} : ${revetement(etat.murs)}.`,
      etat.accent.actif ? `- Murs de la douche (seulement la zone de douche, ${Object.keys(zonesDouche()).length > 1 ? "sur les deux murs de l'angle" : "sur le mur du fond de la douche"}, jusqu'au plafond) : ${revetement(etat.accent)}.` : null,
      `- Sol : ${revetement(etat.sol)}.`,
      etat.fauxPlafond ? "- Plafond : faux plafond lisse, peint en blanc mat." : null,
      etat.faience !== "plafond" ? `- Peinture au-dessus du carrelage : ${(PEINTURES[etat.peinture] || "").toLowerCase()}, finition mate.` : null,
      `- Robinetterie et poignées : ${(ROBINETTERIE[etat.robinetterie]?.nom || "").toLowerCase()}. Les autres éléments gardent leur couleur indiquée ci-dessous.`,
      etat.pente && etat.pente.mur !== "aucun" ? `- Plafond sous pente (combles) côté mur ${etat.pente.mur === "fond" ? "du fond" : etat.pente.mur === "devant" ? "de devant" : "de " + etat.pente.mur} : ${Math.round(etat.pente.basse * 100)} cm de haut contre ce mur, pleine hauteur à ${Math.round(etat.pente.largeur * 100)} cm.` : null,
      "",
      photo ? "ÉQUIPEMENTS" : `ÉQUIPEMENTS ET LEUR PLACE (le mur ${face} et le mur de ${cote} sont ceux visibles sur l'image)`,
      ...equipements,
      "",
      "À ÉVITER",
      "- Texte, logo, filigrane, personne, animal.",
      "- Objets en plus (plantes, décoration chargée) : au plus une serviette blanche et un flacon de savon.",
      "- Tout changement de couleur, de matière ou d'emplacement par rapport à cette description."
    ].filter(x => x !== null).join("\n");
  }
  document.getElementById("gptSim").onclick = () => {
    const v = document.createElement("div"); v.className = "voile";
    v.innerHTML = `<div class="fenetre" role="dialog" aria-modal="true"><div class="tete"><h2>Image réaliste</h2><button class="icone" data-fermer aria-label="Fermer">✕</button></div>
      <p class="gris" style="font-size:14px;margin-bottom:12px">Avec le compte de l'artisan : copiez le texte, ouvrez l'outil, collez-le et joignez l'image. Le résultat est une image d'illustration : les dimensions et les détails ne sont pas exacts.</p>
      <div class="trois">
        <div class="champ"><label>Outil</label><select id="gptOutil"><option value="gemini">Gemini</option><option value="chatgpt">ChatGPT</option></select></div>
        <div class="champ"><label>À partir de</label><select id="gptSource"><option value="3d">L'image 3D</option><option value="photo">La photo du client</option></select></div>
        <div class="champ"><label>Format</label><select id="gptFormat"><option value="image">Comme l'image</option><option value="vertical">Vertical (réseaux)</option><option value="paysage">Horizontal</option></select></div>
      </div>
      <textarea id="gptTexte" rows="12" style="font-size:13px;margin:8px 0 12px"></textarea>
      <div class="actions-doc" style="margin:0">
        <button class="btn" id="gptCopier">1. Copier le texte</button>
        <button class="btn clair" id="gptImage">2. Enregistrer l'image 3D</button>
        <a class="btn clair" id="gptOuvrir" href="https://gemini.google.com/" target="_blank" rel="noopener">3. Ouvrir Gemini</a>
      </div></div>`;
    document.body.appendChild(v);
    const texte = v.querySelector("#gptTexte"), source = v.querySelector("#gptSource"), btnImage = v.querySelector("#gptImage");
    const outil = v.querySelector("#gptOutil"), format = v.querySelector("#gptFormat"), ouvrir = v.querySelector("#gptOuvrir");
    const OUTILS = { gemini: ["Gemini", "https://gemini.google.com/"], chatgpt: ["ChatGPT", "https://chatgpt.com/"] };
    try { const o = localStorage.getItem("ka_outil_ia"); if (OUTILS[o]) outil.value = o; } catch { /* rien */ }
    const remplir = () => {
      texte.value = descriptionIA(source.value, format.value); btnImage.hidden = source.value === "photo";
      const [nom, url] = OUTILS[outil.value]; ouvrir.href = url; ouvrir.textContent = `3. Ouvrir ${nom}`;
      try { localStorage.setItem("ka_outil_ia", outil.value); } catch { /* rien */ }
    };
    remplir(); source.onchange = format.onchange = outil.onchange = remplir;
    v.addEventListener("click", e => { if (e.target === v || e.target.closest("[data-fermer]")) v.remove(); });
    v.querySelector("#gptCopier").onclick = async () => {
      try { await navigator.clipboard.writeText(texte.value); } catch { texte.select(); document.execCommand("copy"); }
      toast(`Texte copié ✓ : collez-le dans ${OUTILS[outil.value][0]}`);
    };
    btnImage.onclick = async () => {
      const blob = await (await fetch(image(1600))).blob();
      const fichier = new File([blob], `simulation-${(client?.nom || "salle-de-bain").toLowerCase()}.jpg`, { type: "image/jpeg" });
      if (navigator.canShare && navigator.canShare({ files: [fichier] })) { try { await navigator.share({ files: [fichier] }); return; } catch (er) { if (er.name === "AbortError") return; } }
      const a = document.createElement("a"); a.href = URL.createObjectURL(fichier); a.download = fichier.name; a.click();
    };
  };
  document.getElementById("clientSim").onclick = () => choisirClient(c => { client = c; document.getElementById("clientSim").textContent = nomClient(c); });
  document.getElementById("titreSim").onclick = () => { const n = prompt("Nom de la simulation", etat.nom); if (n) { etat.nom = n; document.getElementById("titreSim").textContent = n; } };
  const enregistrer = async (extra = {}) => {
    const s = await db.enregistrer("simulations", { ...(simId ? { id: simId } : {}), client_id: client?.id || null, nom: etat.nom, data: etat, image: image(900), ...extra });
    simId = s.id; validation = { jeton: s.jeton, valide_le: s.valide_le, valide_nom: s.valide_nom }; majValidation(); return s;
  };

  /* --- Le client valide ses choix par un lien secret --- */
  function choixClient() {
    const rev = r => `${MATIERES[r.matiere]?.nom || ""}, ${FORMATS[r.format]?.nom || ""}, joints ${({ blanc: "blancs", gris: "gris", noir: "noirs" })[r.joint] || ""}`;
    const l = [{ titre: "Carrelage des murs", valeur: rev(etat.murs), couleur: MATIERES[etat.murs.matiere]?.couleur }];
    if (etat.accent.actif && Object.keys(zonesDouche()).length) l.push({ titre: "Murs de la douche", valeur: rev(etat.accent), couleur: MATIERES[etat.accent.matiere]?.couleur });
    l.push({ titre: "Sol", valeur: rev(etat.sol), couleur: MATIERES[etat.sol.matiere]?.couleur });
    if (metre().peinture > .5) l.push({ titre: "Peinture des murs", valeur: PEINTURES[etat.peinture] || "", couleur: etat.peinture });
    if (etat.fauxPlafond) l.push({ titre: "Plafond", valeur: "Faux plafond lisse, peint en blanc mat", couleur: "#ffffff" });
    const rob = ROBINETTERIE[etat.robinetterie];
    l.push({ titre: "Robinetterie et poignées", valeur: rob?.nom || "", couleur: rob?.couleur });
    // tous les éléments ajoutés, les identiques regroupés (« × 2 »)
    const vus = new Map();
    etat.objets.filter(o => !/^Exist/.test(o.travaux || "")).forEach(o => {
      const c = CAT[o.type], grand = ["Sanitaires", "Meubles"].includes(c.groupe);
      const opts = Object.keys(c.options || {}).filter(k => k !== "finition").map(k => k === "receveur" ? "receveur " + String(o[k]).toLowerCase() : o[k]).filter(Boolean);
      const valeur = [grand || c.groupe === "Ouvertures" ? `${cm(o.w)} × ${cm(c.groupe === "Ouvertures" ? o.h : o.d)} cm` : "", o.finition ? BOIS[o.finition] : "", ...opts].filter(Boolean).join(", ");
      const cle = c.nom + "|" + valeur;
      if (vus.has(cle)) vus.get(cle).n++; else vus.set(cle, { n: 1, titre: c.nom, valeur, couleur: o.finition || null });
    });
    vus.forEach(v => { const nom = v.n > 1 ? `${v.titre} × ${v.n}` : v.titre;
      l.push(v.valeur ? { titre: nom, valeur: v.valeur, couleur: v.couleur } : { titre: "Équipement", valeur: nom, couleur: null }); });
    return l;
  }
  // ce que le client achète lui-même, avec les quantités
  function achatsClient() {
    const m = metre(), { l, p } = etat.dims, f = v => (Math.ceil(v * 10) / 10).toLocaleString("fr-FR"), a = [];
    carrelageACommander().forEach(c => a.push({ titre: `Carrelage ${c.titre.toLowerCase()}`, valeur: `${c.matiere}, ${c.format}`,
      quantite: `${f(c.total)} m²`, detail: `${c.n ? `≈ ${c.n.toLocaleString("fr-FR")} ${c.unite}, ` : ""}${Math.round(c.chute * 100)} % de chutes compris, à arrondir au nombre de boîtes` }));
    const litres = s => Math.max(1, Math.ceil(s * 2 / 10)); // 2 couches, 10 m² par litre
    if (m.peinture > .5) a.push({ titre: "Peinture des murs", valeur: `${PEINTURES[etat.peinture] || ""}, pièce humide`, quantite: `${litres(m.peinture)} L`, detail: `${f(m.peinture)} m², 2 couches` });
    a.push({ titre: "Peinture du plafond", valeur: "Blanc mat, pièce humide", quantite: `${litres(l * p)} L`, detail: `${f(l * p)} m², 2 couches` });
    const vus = new Map();
    etat.objets.filter(o => ["Sanitaires", "Meubles", "Équipements"].includes(CAT[o.type].groupe)).forEach(o => vus.set(o.type, (vus.get(o.type) || 0) + 1));
    vus.forEach((n, t) => a.push({ titre: CAT[t].nom, valeur: "Voir le détail dans vos choix", quantite: String(n) }));
    a.push({ titre: "Robinetterie", valeur: ROBINETTERIE[etat.robinetterie]?.nom || "", quantite: "" });
    const elec = { prise: "Prises électriques", interrupteur: "Interrupteurs", spot: "Spots LED (IP65 en salle de bain)", vmc: "Bouche VMC" };
    Object.entries(elec).forEach(([t, nom]) => { const n = etat.objets.filter(o => o.type === t).length; if (n) a.push({ titre: nom, valeur: "Électricité", quantite: String(n) }); });
    return a;
  }
  const lienChoix = j => location.origin + location.pathname.replace(/admin\/.*$/, "") + "choix/?c=" + j;
  function majValidation() {
    const p = document.getElementById("etatValidation"); if (!p) return;
    const q = validation.valide_le ? new Date(validation.valide_le) : null;
    p.innerHTML = q ? `<b style="color:#2f6f4f">✓ Choix validés par ${esc(validation.valide_nom)} le ${q.toLocaleDateString("fr-FR")}</b>`
      : etat.choix && validation.jeton ? "Lien envoyé : en attente de la validation du client." : "";
  }
  document.getElementById("validerClient").onclick = async () => {
    try {
      if (!client && !confirm("Aucun client n'est associé à cette simulation. Continuer quand même ?")) return;
      etat.choix = choixClient(); etat.achats = achatsClient();
      const s = await enregistrer({ valide_le: null, valide_nom: null, ...(simId && validation.jeton ? {} : { jeton: crypto.randomUUID() }) });
      const lien = lienChoix(s.jeton);
      const texte = `Bonjour,

Voici la simulation de votre future salle de bain avec les choix dont nous avons parlé. Vous pouvez les revoir et les valider ici :
${lien}

Un détail ne vous convient pas ? Appelez-moi avant de valider.
KA Rénovation — 07 63 14 76 27`;
      if (navigator.share) { try { await navigator.share({ text: texte }); return; } catch (er) { if (er.name === "AbortError") return; } }
      try { await navigator.clipboard.writeText(texte); } catch { const t = document.createElement("textarea"); t.value = texte; document.body.appendChild(t); t.select(); document.execCommand("copy"); t.remove(); }
      toast("Message copié ✓ : collez-le dans WhatsApp ou un SMS");
    } catch (er) { toast("Erreur : " + er.message); }
  };
  document.getElementById("enregSim").onclick = async () => { try { await enregistrer(); toast("Simulation enregistrée ✓"); } catch (er) { toast("Erreur : " + er.message); } };

  /* --- Devis à partir de la simulation --- */
  document.getElementById("devisSim").onclick = async () => {
    try {
      const ps = (await db.lister("prestations", { ordre: "created_at", desc: false })).filter(p => !p.archive);
      const cherche = mot => ps.find(p => p.designation.toLowerCase().includes(mot.toLowerCase()));
      const sections = [], lot = titre => { let s = sections.find(x => x.titre === titre); if (!s) { s = { titre, lignes: [] }; sections.push(s); } return s; };
      const ajoute = (mot, cat, qte, unite, description = "") => {
        const p = cherche(mot);
        lot(p?.categorie || cat).lignes.push(p ? { designation: p.designation, description, qte, unite: p.unite, pu: Number(p.prix_ht) }
          : { designation: mot, description, qte, unite: unite || "presta", pu: 0 });
      };
      const m = metre(), arr = n => Math.round(n * 10) / 10;
      if (etat.depose) ajoute("Dépose complète salle de bain", "Dépose & évacuation", 1);
      const comptes = {};
      etat.objets.forEach(o => { if (POUR_DEVIS[o.type] && !/^Exist/.test(o.travaux || "")) comptes[o.type] = (comptes[o.type] || 0) + 1; });
      const deja = new Set();
      for (const [t, n] of Object.entries(comptes)) {
        const [mot, cat] = POUR_DEVIS[t];
        if (deja.has(mot)) continue; deja.add(mot);
        ajoute(mot, cat, ["arrivees", "evacuation"].includes(t) ? 1 : n);
      }
      if (comptes.douche) ajoute("SPEC étanchéité", "Placo / Étanchéité / Sol", 1);
      ajoute("Ragréage", "Placo / Étanchéité / Sol", arr(m.sol), "m2");
      const cof = coffrages().filter(c => c.creer), dev = cof.reduce((a, c) => a + c.visible, 0);
      if (dev > .05 || etat.fauxPlafond) ajoute("Placo BA13 hydro", "Placo / Étanchéité / Sol", 1, "presta",
        [cof.some(c => !c.cloison) ? `Création de coffrage : ${arr(cof.filter(c => !c.cloison).reduce((a, c) => a + c.visible, 0)).toLocaleString("fr-FR")} m développés, du sol au plafond` : "",
         cof.some(c => c.cloison) ? `Création de cloison : ${arr(cof.filter(c => c.cloison).reduce((a, c) => a + c.longueur, 0)).toLocaleString("fr-FR")} m, du sol au plafond` : "",
         etat.fauxPlafond ? `Faux plafond : ${arr(m.plafond).toLocaleString("fr-FR")} m²` : ""].filter(Boolean).join(" ; "));
      const dem = etat.objets.filter(o => o.type === "demolition");
      if (dem.length) ajoute("Démolition de cloison", "Dépose & évacuation", arr(dem.reduce((a, o) => a + o.w, 0)), "ml", "Démolition, évacuation des gravats en déchetterie");
      const f = etat.sol.format;
      if (f === "parquet") ajoute("Pose de parquet", "Sols", arr(m.sol), "m2");
      else if (f !== "uni") ajoute(["120x120", "60x120", "80x80"].includes(f) ? "Pose sol grand format" : "Pose carrelage au sol", "Pose carrelage", arr(m.sol), "m2");
      if (m.murs > 0) ajoute(["60x120", "120x120"].includes(etat.murs.format) ? "Pose mural 60×120" : "Pose carrelage mural", "Pose carrelage", arr(m.murs), "m2");
      if (m.peinture > .5) ajoute("Peinture murs", "Peinture / Finitions", arr(m.peinture), "m2");
      ajoute("Peinture plafond", "Finitions", arr(m.plafond), "m2");
      ajoute("Nettoyage fin de chantier", "Finitions", 1);
      // consommables de l'artisan (le client achète lui-même carrelage, sanitaires, meubles et peinture)
      const PLACO = /Rails|Montants|Cornières|Laine|Fourrures|Suspentes|Plaques|Vis TTPC|Bande à joint|Enduit/;
      const fo = fournitures(), pose = fo.filter(x => !PLACO.test(x.nom)), placo = fo.filter(x => PLACO.test(x.nom));
      const detail = l => l.map(x => `${x.nom} : ${x.qte}`).join(" ; ");
      if (pose.length) ajoute("Consommables de pose", "Fournitures", 1, "forfait", detail(pose));
      if (placo.length) ajoute("Fournitures placo et ossature", "Fournitures", 1, "forfait", detail(placo));
      ajoute("Frais de déplacement", "Déplacement", 1, "forfait");
      await enregistrer();
      await creerDevis(sections, client, etat.nom);
    } catch (er) { toast("Erreur : " + er.message); }
  };
}
