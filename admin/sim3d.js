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
  boisClair: { nom: "Bois clair", couleur: "#d9c3a0", dessin: (g, w, h) => bois(g, w, h, 34, 36, 70) },
  bois: { nom: "Chêne", couleur: "#b58a5c", dessin: (g, w, h) => bois(g, w, h, 30, 45, 50) },
  noyer: { nom: "Noyer", couleur: "#5b4636", dessin: (g, w, h) => bois(g, w, h, 25, 30, 28) }
};
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
  "20x20": { nom: "20×20", t: [.2, .2] },
  "30x30": { nom: "30×30", t: [.3, .3] },
  "30x60": { nom: "30×60", t: [.6, .3] },
  "30x60d": { nom: "30×60 décalé", t: [.6, .3], decale: true },
  "60x60": { nom: "60×60", t: [.6, .6] },
  "60x120": { nom: "60×120", t: [.6, 1.2] },
  "80x80": { nom: "80×80", t: [.8, .8] },
  "120x120": { nom: "120×120", t: [1.2, 1.2] },
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
  const brillant = ["blanc", "marbre", "marbreNoir", "bleu", "bleuNuit", "creme", "zelligeBlanc", "zelligeVert", "rose"].includes(rev.matiere);
  return new THREE.MeshStandardMaterial({ map: t, bumpMap: t, bumpScale: sol ? 1.2 : .9, roughness: sol ? .5 : (brillant ? .14 : .42), envMapIntensity: brillant ? .45 : .2 });
}
const PEINTURES = { "#f3f1ec": "Blanc cassé", "#e6ddd0": "Lin", "#cfd6cf": "Vert d'eau", "#c9d3db": "Bleu brume", "#d9c3b5": "Rose poudré", "#e9d8b0": "Jaune paille", "#8a8f93": "Gris orage", "#4a5a52": "Vert forêt", "#2c3440": "Bleu nuit" };

/* =================== Matériaux des objets =================== */
const MAT = {
  blanc: new THREE.MeshStandardMaterial({ color: 0xf6f5f2, roughness: .3 }),
  ceramique: new THREE.MeshStandardMaterial({ color: 0xfbfbfa, roughness: .12 }),
  noir: new THREE.MeshStandardMaterial({ color: 0x1d1d1f, roughness: .45, metalness: .3 }),
  chrome: new THREE.MeshStandardMaterial({ color: 0xc9cccf, roughness: .15, metalness: .9 }),
  verre: new THREE.MeshPhysicalMaterial({ color: 0xdfeff0, roughness: .05, transmission: .9, transparent: true, opacity: .3 }),
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
const BOIS = { "#a97c52": "Chêne", "#d9c3a0": "Bois clair", "#5b4636": "Noyer", "#f2f0ec": "Blanc", "#55606a": "Gris bleu", "#7b8a74": "Vert sauge", "#1f1f21": "Noir" };
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
  douche: { nom: "Douche à l'italienne", groupe: "Sanitaires", pose: "sol", dims: [120, 90, 200], tailles: [[90, 90], [120, 80], [120, 90], [140, 90], [160, 90]], options: { receveur: ["Noir", "Blanc", "Carrelé"] },
    faire(w, d, h, o) {
      const g = new THREE.Group();
      const m = o.receveur === "Blanc" ? MAT.receveurBlanc : o.receveur === "Carrelé" ? null : MAT.receveurNoir;
      if (m) g.add(pose(boite(w, .03, d, m), 0, .015, 0));
      g.add(pose(boite(w * .6, .005, .05, MAT.chrome), 0, .033, -d / 2 + .1));
      g.add(pose(new THREE.Mesh(new THREE.BoxGeometry(.01, h, d), MAT.verre), w / 2, h / 2, 0));
      g.add(pose(boite(.02, .02, d, MAT.noir), w / 2, h, 0));
      g.add(pose(cyl(.012, 1.1, MAT.noir), -w * .1, 1.45, -d / 2 + .03));
      const bras = cyl(.01, .3, MAT.noir); bras.rotation.x = Math.PI / 2; g.add(pose(bras, -w * .1, 2, -d / 2 + .16));
      g.add(pose(boite(.25, .012, .25, MAT.noir), -w * .1, 1.99, -d / 2 + .28));
      g.add(pose(boite(.18, .06, .05, MAT.noir), -w * .1, 1.05, -d / 2 + .03));
      return g; } },
  baignoire: { nom: "Baignoire", groupe: "Sanitaires", pose: "mur", dims: [170, 75, 55], tailles: [[160, 70], [170, 70], [170, 75], [180, 80]],
    faire(w, d, h) {
      const g = new THREE.Group();
      g.add(pose(boite(w, h, d, MAT.ceramique), 0, h / 2, 0));
      g.add(pose(new THREE.Mesh(new THREE.BoxGeometry(w - .14, .02, d - .14), MAT.fond), 0, h + .001, 0));
      g.add(pose(boite(.05, .12, .05, MAT.chrome), -w / 2 + .1, h + .06, -d / 2 + .05));
      return g; } },
  ilot: { nom: "Baignoire îlot", groupe: "Sanitaires", pose: "sol", dims: [170, 80, 60], tailles: [[160, 75], [170, 80], [180, 85]],
    faire(w, d, h) {
      const g = new THREE.Group();
      const corps = new THREE.Mesh(new THREE.CapsuleGeometry(d / 2, Math.max(.01, w - d), 8, 24), MAT.ceramique);
      corps.rotation.z = Math.PI / 2; corps.scale.set(h / d, 1, 1); corps.position.y = h / 2; corps.castShadow = true; g.add(corps);
      const fond = new THREE.Mesh(new THREE.CapsuleGeometry(d / 2 - .06, Math.max(.01, w - d), 8, 24), MAT.fond);
      fond.rotation.z = Math.PI / 2; fond.scale.set(.04, 1, 1); fond.position.y = h - .005; g.add(fond);
      g.add(pose(cyl(.015, 1, MAT.noir), w / 2 + .12, .5, 0));
      return g; } },
  laveMains: { nom: "Lave-mains", groupe: "Sanitaires", pose: "mur", dims: [40, 25, 15], tailles: [[35, 22], [40, 25], [45, 25]],
    faire(w, d) { const g = new THREE.Group(); g.add(pose(boite(w, .12, d, MAT.ceramique), 0, .8, 0)); g.add(pose(cyl(.01, .15, MAT.chrome), 0, .92, -d / 2 + .04)); return g; } },
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
  vasque: { nom: "Meuble vasque", groupe: "Meubles", pose: "mur", dims: [80, 46, 55], tailles: [[60, 46], [80, 46], [100, 46]], options: { finition: Object.keys(BOIS) }, faire: (w, d, h, o) => meuble(w, d, h, 1, o) },
  double: { nom: "Double vasque", groupe: "Meubles", pose: "mur", dims: [120, 46, 55], tailles: [[120, 46], [140, 46], [160, 46]], options: { finition: Object.keys(BOIS) }, faire: (w, d, h, o) => meuble(w, d, h, 2, o) },
  vasquePoser: { nom: "Plan + vasque à poser", groupe: "Meubles", pose: "mur", dims: [100, 46, 4], tailles: [[80, 46], [100, 46], [120, 46]], options: { finition: Object.keys(BOIS) },
    faire(w, d, h, o) {
      const g = new THREE.Group();
      g.add(pose(boite(w, .04, d, matBois(o.finition || "#a97c52")), 0, .86, 0));
      g.add(pose(cyl(.19, .14, MAT.noir, 32), 0, .95, .02));
      g.add(pose(cyl(.16, .02, MAT.receveurNoir, 32), 0, 1.015, .02));
      g.add(pose(cyl(.012, .3, MAT.noir), 0, 1.03, -d / 2 + .04));
      return g; } },
  colonne: { nom: "Colonne de rangement", groupe: "Meubles", pose: "mur", dims: [40, 33, 170], tailles: [[30, 30], [40, 33], [50, 35]], options: { finition: Object.keys(BOIS) },
    faire(w, d, h, o) { const g = new THREE.Group(); g.add(pose(boite(w, h, d, matBois(o.finition || "#a97c52")), 0, h / 2 + .15, 0));
      g.add(pose(boite(.015, .2, .01, MAT.noir), w / 2 - .05, h / 2 + .15, d / 2 + .005)); return g; } },
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
  radiateur: { nom: "Sèche-serviettes", groupe: "Équipements", pose: "mur", dims: [50, 8, 120], tailles: [[50, 8], [60, 8]], hauteur: 40,
    faire(w, d, h) { const g = new THREE.Group();
      [-w / 2 + .02, w / 2 - .02].forEach(x => g.add(pose(cyl(.015, h, MAT.blanc), x, h / 2, 0)));
      for (let y = .05; y < h; y += .085) { const b = cyl(.01, w - .04, MAT.blanc); b.rotation.z = Math.PI / 2; g.add(pose(b, 0, y, 0)); }
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
  porte: { nom: "Porte", groupe: "Ouvertures", pose: "dansMur", dims: [83, 4, 204], tailles: [[73, 4], [83, 4], [93, 4]], options: { type: ["Battante", "Coulissante"] },
    faire(w, d, h, o) { const g = new THREE.Group(), cadre = MAT.blanc, coul = o.type === "Coulissante";
      g.add(pose(boite(.05, h + .05, .04, cadre), -w / 2 - .025, (h + .05) / 2, .01)); g.add(pose(boite(.05, h + .05, .04, cadre), w / 2 + .025, (h + .05) / 2, .01));
      g.add(pose(boite(w + .1, .05, .04, cadre), 0, h + .025, .01));
      g.add(pose(boite(w - .01, h - .01, .035, new THREE.MeshStandardMaterial({ color: 0xeeebe5, roughness: .5 })), coul ? w * .25 : 0, h / 2, coul ? .05 : .015));
      g.add(pose(boite(.02, .02, .08, MAT.noir), (coul ? w * .25 : 0) + w / 2 - .08, 1.02, .05));
      return g; } },
  fenetre: { nom: "Fenêtre", groupe: "Ouvertures", pose: "dansMur", dims: [60, 4, 75], tailles: [[45, 4], [60, 4], [80, 4], [100, 4]], hauteur: 120,
    faire(w, d, h) { const g = new THREE.Group();
      g.add(pose(new THREE.Mesh(new THREE.PlaneGeometry(w, h), MAT.vitre), 0, h / 2, .01));
      [0, h].forEach(y => g.add(pose(boite(w + .06, .05, .05, MAT.blanc), 0, y, .015)));
      [-w / 2, w / 2, 0].forEach(x => g.add(pose(boite(.05, h, .05, MAT.blanc), x, h / 2, .015)));
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
      g.add(tube(new THREE.Vector3(0, .08, -.005), new THREE.Vector3(0, 1.6, -.005), .006, MAT.gaine)); return g; } },
  interrupteur: { nom: "Interrupteur", groupe: "Réseaux", pose: "dansMur", dims: [8, 2, 8], hauteur: 110,
    faire() { const g = new THREE.Group(); g.add(pose(boite(.08, .08, .015, MAT.plastique), 0, .04, .008)); g.add(pose(boite(.04, .05, .01, MAT.blanc), 0, .04, .018));
      g.add(tube(new THREE.Vector3(0, .08, -.005), new THREE.Vector3(0, 1.3, -.005), .006, MAT.gaine)); return g; } },
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
    g.add(pose(cyl(.012, .22, MAT.noir), x, haut + .11, -d / 2 + .05));
    const bec = cyl(.008, .12, MAT.noir); bec.rotation.x = Math.PI / 2; g.add(pose(bec, x, haut + .2, -d / 2 + .1));
  }
  [-.1, .08].forEach(y => g.add(pose(boite(w * .3, .015, .01, MAT.noir), 0, haut - h / 2 + y, d / 2 + .006)));
  return g;
}
const GROUPES = ["Sanitaires", "Meubles", "Équipements", "Ouvertures", "Réseaux"];

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
    murs: { matiere: "blanc", format: "60x120", joint: "gris" }, accent: { matiere: "bleu", format: "7.5x15", joint: "blanc", actif: true },
    sol: { matiere: "beton", format: "60x60", joint: "gris" }, faience: "plafond", peinture: "#f3f1ec", depose: true,
    objets: [
      { type: "douche", x: .7, z: -.55, rot: 0 }, { type: "double", x: -.55, z: -.8, rot: 0 }, { type: "miroir", x: -.55, z: -.98, rot: 0 },
      { type: "wc", x: -1.1, z: .35, rot: Math.PI / 2 }, { type: "porte", x: 1.3, z: .45, rot: -Math.PI / 2 }, { type: "radiateur", x: -1.3, z: .8, rot: Math.PI / 2 }, { type: "prise", x: -.1, z: -1, rot: 0 }
    ]
  });
  let etat = defaut(), simId = null, client = null, selection = null, chantier = false;
  if (params.get("sim")) {
    const s = await db.lire("simulations", params.get("sim"));
    if (s) { etat = migrer({ ...defaut(), ...s.data }); simId = s.id; etat.nom = s.nom || etat.nom; if (s.client_id) client = await db.lire("clients", s.client_id); }
  } else if (params.get("client")) client = await db.lire("clients", params.get("client"));
  etat.objets = etat.objets.filter(o => CAT[o.type]); etat.objets.forEach(completer);

  function migrer(e) { // simulations enregistrées avant la refonte
    ["murs", "sol"].forEach(k => { if (typeof e[k] === "string") e[k] = { matiere: MATIERES[e[k]] ? e[k] : "blanc", format: k === "sol" ? "60x60" : "60x120", joint: "gris" }; });
    if (typeof e.accent === "string") e.accent = { matiere: MATIERES[e.accent] ? e.accent : "bleu", format: "7.5x15", joint: "blanc", actif: true };
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
  const TITRES = { murs: "Carrelage des murs", accent: "Mur de la douche", sol: "Sol" };
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
          <button class="btn discret" id="vueDessus">Vue de dessus</button>
          <button class="btn discret" id="modeChantier">Mode chantier</button>
        </div>
        <div class="carte" id="metre"></div>
      </div>
      <div class="carte" id="reglages3d">
        <fieldset><legend>Pièce (cm)</legend>
          <div class="trois">
            <div class="champ"><label>Longueur</label><input type="number" data-dim="l" value="${cm(etat.dims.l)}" min="100" max="900" inputmode="numeric"></div>
            <div class="champ"><label>Largeur</label><input type="number" data-dim="p" value="${cm(etat.dims.p)}" min="100" max="900" inputmode="numeric"></div>
            <div class="champ"><label>Hauteur</label><input type="number" data-dim="h" value="${cm(etat.dims.h)}" min="200" max="400" inputmode="numeric"></div>
          </div>
          <div class="deux">
            <div class="champ"><label>Faïence</label><select id="faience"><option value="plafond" ${etat.faience === "plafond" ? "selected" : ""}>Jusqu'au plafond</option><option value="120" ${etat.faience === "120" ? "selected" : ""}>Hauteur 1,20 m</option><option value="douche" ${etat.faience === "douche" ? "selected" : ""}>Zone douche seulement</option></select></div>
            <div class="champ"><label>Dépose de l'existant</label><select id="depose"><option value="1" ${etat.depose ? "selected" : ""}>Oui</option><option value="0" ${!etat.depose ? "selected" : ""}>Non</option></select></div>
          </div>
          <label>Peinture (au-dessus de la faïence)</label><div class="palette">${Object.entries(PEINTURES).map(([c, n]) => `<button type="button" class="pastille ${c === etat.peinture ? "actif" : ""}" data-peinture="${c}" title="${n}" aria-label="${n}" style="background:${c}"></button>`).join("")}</div>
        </fieldset>
        ${["murs", "accent", "sol"].map(k => `
        <fieldset><legend>${TITRES[k]}</legend>
          ${k === "accent" ? `<label style="display:flex;gap:8px;align-items:center;text-transform:none;letter-spacing:0;font-weight:500;color:var(--encre)"><input type="checkbox" id="accentActif" ${etat.accent.actif ? "checked" : ""} style="width:auto"> Carrelage différent derrière la douche</label>` : ""}
          <div class="palette" style="margin:6px 0 4px">${pal(MATIERES, etat[k].matiere, "mat-" + k)}</div>
          <p class="gris" style="font-size:13px;margin-bottom:8px" data-nommat="${k}">${esc(MATIERES[etat[k].matiere].nom)}</p>
          <div class="deux">
            <div class="champ"><label>Format</label><select data-format="${k}">${opts(FORMATS, etat[k].format)}</select></div>
            <div class="champ"><label>Joints</label><select data-joint="${k}">${opts({ blanc: "Blancs", gris: "Gris", noir: "Noirs" }, etat[k].joint)}</select></div>
          </div>
        </fieldset>`).join("")}
        <fieldset><legend>Ajouter</legend>
          ${GROUPES.map(gp => `<div class="cat-titre">${gp}</div><div class="objets">${Object.entries(CAT).filter(([, c]) => c.groupe === gp).map(([k, c]) => `<button type="button" data-ajout="${k}">${esc(c.nom)}</button>`).join("")}</div>`).join("")}
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
  let murs = []; const objetsMesh = new Map();

  // murs : 0 fond (z-), 1 droite (x+), 2 avant (z+), 3 gauche (x-)
  const norm = a => ((a % TAU) + TAU) % TAU;
  const murDe = rot => [0, -Math.PI / 2, Math.PI, Math.PI / 2].findIndex(r => Math.abs(norm(rot) - norm(r)) < .01);
  const MURS = () => { const { l, p } = etat.dims; return [
    { w: l, c: [0, -p / 2], rot: 0, n: [0, 0, 1] }, { w: p, c: [l / 2, 0], rot: -Math.PI / 2, n: [-1, 0, 0] },
    { w: l, c: [0, p / 2], rot: Math.PI, n: [0, 0, -1] }, { w: p, c: [-l / 2, 0], rot: Math.PI / 2, n: [1, 0, 0] }]; };
  function murDeLaDouche() {
    const o = etat.objets.find(x => x.type === "douche"); if (!o) return -1;
    const { l, p } = etat.dims;
    const d = [o.z + p / 2, l / 2 - o.x, p / 2 - o.z, o.x + l / 2];
    return d.indexOf(Math.min(...d));
  }

  function construirePiece() {
    piece.clear(); murs = [];
    const { l, p, h } = etat.dims;
    const sol = new THREE.Mesh(new THREE.PlaneGeometry(l, p), materiauCarrelage(etat.sol, l, p, true));
    sol.rotation.x = -Math.PI / 2; sol.receiveShadow = true; piece.add(sol);
    const md = murDeLaDouche();
    MURS().forEach((d, i) => {
      const g = new THREE.Group(); g.position.set(d.c[0], 0, d.c[1]); g.rotation.y = d.rot;
      g.userData.normale = new THREE.Vector3(...d.n); g.userData.centre = new THREE.Vector3(d.c[0], h / 2, d.c[1]);
      const rev = etat.accent.actif && i === md ? etat.accent : etat.murs;
      const hf = etat.faience === "plafond" ? h : etat.faience === "120" ? (i === md ? h : 1.2) : (i === md ? h : 0);
      if (hf > 0) { const m = new THREE.Mesh(new THREE.PlaneGeometry(d.w, hf), materiauCarrelage(rev, d.w, hf)); m.position.y = hf / 2; m.receiveShadow = true; g.add(m); }
      if (hf < h) { const m = new THREE.Mesh(new THREE.PlaneGeometry(d.w, h - hf), new THREE.MeshStandardMaterial({ color: new THREE.Color(etat.peinture), roughness: .9 })); m.position.y = hf + (h - hf) / 2; m.receiveShadow = true; g.add(m); }
      if (hf > 0 && hf < h) g.add(pose(boite(d.w, .015, .012, MAT.chrome), 0, hf, .006));
      g.children.forEach(m => { m.material.transparent = chantier; m.material.opacity = chantier ? .28 : 1; m.material.depthWrite = !chantier; });
      piece.add(g); murs.push(g);
    });
    plafonnier.position.set(0, h - .1, 0);
    majMetre(); doser();
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
    if (auMur) collerAuMur(o);
    const [ex, ez] = encombrement(o);
    o.x = Math.min(l / 2 - ex, Math.max(-l / 2 + ex, o.x)); o.z = Math.min(p / 2 - ez, Math.max(-p / 2 + ez, o.z));
    if (auMur) {
      const k = murDe(o.rot), prof = c.pose === "dansMur" ? 0 : o.d / 2;
      if (k === 0) o.z = -p / 2 + prof; if (k === 2) o.z = p / 2 - prof; if (k === 1) o.x = l / 2 - prof; if (k === 3) o.x = -l / 2 + prof;
    }
    g.position.set(o.x, c.pose === "plafond" ? h - .01 : (o.y || 0), o.z);
    g.rotation.y = o.rot;
    g.userData.mur = c.pose === "dansMur" ? murDe(o.rot) : -1;
  }
  // reflets dosés : forts sur le métal et le verre, discrets ailleurs
  function doser() { scene.traverse(m => { const mt = m.material; if (!mt || mt.userData.dose) return; mt.userData.dose = true;
    if (mt.envMapIntensity === 1) mt.envMapIntensity = mt.metalness > .5 ? .9 : mt.roughness < .2 ? .5 : .25; }); }
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
    meubles.children.forEach(g => { if (g.userData.mur >= 0) g.visible = vis[g.userData.mur]; });
    renderer.render(scene, camera);
    if (tournage) tournage.image();
    requestAnimationFrame(boucle);
  }
  reconstruire(); boucle();

  /* --- Métré --- */
  function metre() {
    const { l, p, h } = etat.dims, md = murDeLaDouche();
    const largeurs = [l, p, l, p];
    let murm2 = 0;
    largeurs.forEach((w, i) => { const hf = etat.faience === "plafond" ? h : etat.faience === "120" ? (i === md ? h : 1.2) : (i === md ? h : 0); murm2 += w * hf; });
    etat.objets.filter(o => o.type === "porte" || o.type === "fenetre").forEach(o => {
      const i = murDe(o.rot), hf = etat.faience === "plafond" ? h : etat.faience === "120" ? (i === md ? h : 1.2) : (i === md ? h : 0);
      murm2 -= o.w * Math.max(0, Math.min(o.y + o.h, hf) - o.y);
    });
    const peint = 2 * (l + p) * h - murm2 - etat.objets.filter(o => o.type === "porte").reduce((a, o) => a + o.w * o.h, 0);
    return { sol: l * p, murs: Math.max(0, murm2), peinture: Math.max(0, peint), plafond: l * p };
  }
  function majMetre() {
    const m = metre(), f = n => n.toLocaleString("fr-FR", { maximumFractionDigits: 1 });
    const bloc = (v, t) => `<div><b style="font-family:var(--serif);font-size:20px;font-weight:400">${f(v)} m²</b><br><span class="gris" style="font-size:13px">${t}</span></div>`;
    document.getElementById("metre").innerHTML = `<div class="petit" style="margin-bottom:8px">Métré</div>
      <div class="deux" style="gap:12px">${bloc(m.sol, `sol · ${FORMATS[etat.sol.format].nom}`)}${bloc(m.murs, "faïence murale")}${bloc(m.peinture, "peinture murs")}${bloc(m.plafond, "plafond")}</div>`;
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

  const LIBELLES = { receveur: "Receveur", diametre: "Diamètre", type: "Type" };
  function afficherSelection() {
    const p = document.getElementById("selPanneau");
    if (selection === null || !etat.objets[selection]) { selection = null; p.hidden = true; return; }
    const o = etat.objets[selection], c = CAT[o.type];
    p.hidden = false;
    p.innerHTML = `<div class="entete" style="margin-bottom:10px"><h2>${esc(c.nom)}</h2><button type="button" class="icone" data-sel="fermer" aria-label="Fermer">✕</button></div>
      ${c.tailles ? `<label>Tailles courantes</label><div class="palette" style="margin-bottom:12px">${c.tailles.map(([w, d]) => `<button type="button" class="btn ${cm(o.w) === w && cm(o.d) === d ? "" : "discret"} petit-btn" data-taille="${w}x${d}">${w} × ${d}</button>`).join("")}</div>` : ""}
      <div class="trois">
        <div class="champ"><label>Largeur cm</label><input type="number" data-od="w" value="${cm(o.w)}" inputmode="numeric"></div>
        <div class="champ"><label>${c.pose === "dansMur" ? "Épaisseur" : "Profondeur"} cm</label><input type="number" data-od="d" value="${cm(o.d)}" inputmode="numeric"></div>
        <div class="champ"><label>Hauteur cm</label><input type="number" data-od="h" value="${cm(o.h)}" inputmode="numeric"></div>
      </div>
      ${c.pose === "mur" || c.pose === "dansMur" ? `<div class="champ"><label>Hauteur de pose (cm depuis le sol)</label><input type="number" data-od="y" value="${cm(o.y || 0)}" inputmode="numeric"></div>` : ""}
      ${Object.entries(c.options || {}).map(([k, vals]) => k === "finition"
        ? `<label>Finition</label><div class="palette" style="margin-bottom:12px">${vals.map(v => `<button type="button" class="pastille ${o[k] === v ? "actif" : ""}" data-opt="${k}" data-val="${v}" title="${BOIS[v]}" aria-label="${BOIS[v]}" style="background:${v}"></button>`).join("")}</div>`
        : `<div class="champ"><label>${LIBELLES[k] || k}</label><select data-opt="${k}">${vals.map(v => `<option ${o[k] === v ? "selected" : ""}>${esc(v)}</option>`).join("")}</select></div>`).join("")}
      <div class="actions-doc" style="margin:6px 0 0">
        <button type="button" class="btn clair petit-btn" data-sel="tourner">↻ ${c.pose === "mur" || c.pose === "dansMur" ? "Mur suivant" : "Tourner"}</button>
        <button type="button" class="btn discret petit-btn" data-sel="dupliquer">Dupliquer</button>
        <button type="button" class="btn danger petit-btn" data-sel="retirer">Retirer</button>
      </div>`;
  }
  const panneauSel = document.getElementById("selPanneau");
  const refaire = () => {
    const i = selection, o = etat.objets[i], g = CAT[o.type].faire(o.w, o.d, o.h, o);
    g.userData.index = i; meubles.remove(objetsMesh.get(i)); meubles.add(g); objetsMesh.set(i, g); placer(i);
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
    else if (b.dataset.sel === "tourner") {
      const c = CAT[o.type];
      if (c.pose === "mur" || c.pose === "dansMur") { const { l, p } = etat.dims; const k = (murDe(o.rot) + 1) % 4; [o.x, o.z] = [[0, -p / 2], [l / 2, 0], [0, p / 2], [-l / 2, 0]][k]; }
      else o.rot = norm(o.rot + Math.PI / 2);
      placer(selection); if (o.type === "douche") construirePiece(); else majMetre();
    }
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
    } else if (b.dataset.peinture) etat.peinture = b.dataset.peinture;
    else if (b.dataset.ajout) {
      const t = b.dataset.ajout, o = { type: t, x: 0, z: 0, rot: 0 }; completer(o);
      if (CAT[t].pose === "mur" || CAT[t].pose === "dansMur") o.z = -etat.dims.p / 2;
      etat.objets.push(o); selection = etat.objets.length - 1; reconstruire();
      toast(`${CAT[t].nom} ajouté : faites-le glisser`); return;
    } else return;
    b.parentElement.querySelectorAll(".pastille").forEach(x => x.classList.toggle("actif", x === b));
    panneau.querySelectorAll("[data-format]").forEach(s => { s.value = etat[s.dataset.format].format; });
    construirePiece();
  });
  panneau.addEventListener("change", e => {
    const t = e.target;
    if (t.dataset.dim) { etat.dims[t.dataset.dim] = Math.max(1, Math.min(9, (Number(t.value) || 0) / 100)); reconstruire(); return; }
    if (t.dataset.format) etat[t.dataset.format].format = t.value;
    else if (t.dataset.joint) etat[t.dataset.joint].joint = t.value;
    else if (t.id === "faience") etat.faience = t.value;
    else if (t.id === "depose") etat.depose = t.value === "1";
    else if (t.id === "accentActif") etat.accent.actif = t.checked;
    else return;
    construirePiece();
  });

  /* --- Barre d'actions --- */
  let dessus = false;
  document.getElementById("vueDessus").onclick = e => {
    dessus = !dessus;
    if (dessus) { camera.position.set(0, Math.max(etat.dims.l, etat.dims.p) * 2.2, .01); controles.target.set(0, 0, 0); e.target.textContent = "Vue 3D"; }
    else { camera.position.set(2.6, 2.3, 3.2); controles.target.set(0, .9, 0); e.target.textContent = "Vue de dessus"; }
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
  document.getElementById("clientSim").onclick = () => choisirClient(c => { client = c; document.getElementById("clientSim").textContent = nomClient(c); });
  document.getElementById("titreSim").onclick = () => { const n = prompt("Nom de la simulation", etat.nom); if (n) { etat.nom = n; document.getElementById("titreSim").textContent = n; } };
  const enregistrer = async () => {
    const s = await db.enregistrer("simulations", { ...(simId ? { id: simId } : {}), client_id: client?.id || null, nom: etat.nom, data: etat, image: image(480) });
    simId = s.id; return s;
  };
  document.getElementById("enregSim").onclick = async () => { try { await enregistrer(); toast("Simulation enregistrée ✓"); } catch (er) { toast("Erreur : " + er.message); } };

  /* --- Devis à partir de la simulation --- */
  document.getElementById("devisSim").onclick = async () => {
    try {
      const ps = (await db.lister("prestations", { ordre: "created_at", desc: false })).filter(p => !p.archive);
      const cherche = mot => ps.find(p => p.designation.toLowerCase().includes(mot.toLowerCase()));
      const sections = [], lot = titre => { let s = sections.find(x => x.titre === titre); if (!s) { s = { titre, lignes: [] }; sections.push(s); } return s; };
      const ajoute = (mot, cat, qte, unite) => {
        const p = cherche(mot);
        lot(p?.categorie || cat).lignes.push(p ? { designation: p.designation, description: "", qte, unite: p.unite, pu: Number(p.prix_ht) }
          : { designation: mot, description: "", qte, unite: unite || "presta", pu: 0 });
      };
      const m = metre(), arr = n => Math.round(n * 10) / 10;
      if (etat.depose) ajoute("Dépose complète salle de bain", "Dépose & évacuation", 1);
      const comptes = {};
      etat.objets.forEach(o => { if (POUR_DEVIS[o.type]) comptes[o.type] = (comptes[o.type] || 0) + 1; });
      const deja = new Set();
      for (const [t, n] of Object.entries(comptes)) {
        const [mot, cat] = POUR_DEVIS[t];
        if (deja.has(mot)) continue; deja.add(mot);
        ajoute(mot, cat, ["arrivees", "evacuation"].includes(t) ? 1 : n);
      }
      if (comptes.douche) ajoute("SPEC étanchéité", "Placo / Étanchéité / Sol", 1);
      ajoute("Ragréage", "Placo / Étanchéité / Sol", arr(m.sol), "m2");
      const f = etat.sol.format;
      if (f === "parquet") ajoute("Pose de parquet", "Sols", arr(m.sol), "m2");
      else if (f !== "uni") ajoute(["120x120", "60x120", "80x80"].includes(f) ? "Pose sol grand format" : "Pose carrelage au sol", "Pose carrelage", arr(m.sol), "m2");
      if (m.murs > 0) ajoute(["60x120", "120x120"].includes(etat.murs.format) ? "Pose mural 60×120" : "Pose carrelage mural", "Pose carrelage", arr(m.murs), "m2");
      if (m.peinture > .5) ajoute("Peinture murs", "Peinture / Finitions", arr(m.peinture), "m2");
      ajoute("Peinture plafond", "Finitions", arr(m.plafond), "m2");
      ajoute("Nettoyage fin de chantier", "Finitions", 1);
      ajoute("Frais de déplacement", "Déplacement", 1, "forfait");
      await enregistrer();
      await creerDevis(sections, client, etat.nom);
    } catch (er) { toast("Erreur : " + er.message); }
  };
}
