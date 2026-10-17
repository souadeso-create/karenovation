// Simulateur 3D de salle de bain : dimensions, revêtements, équipements déplaçables au doigt.
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

/* ---------- Textures dessinées (pas d'images à charger) ---------- */
function toile(w, h, dessin) {
  const c = document.createElement("canvas"); c.width = w; c.height = h;
  dessin(c.getContext("2d"), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8;
  return t;
}
function joints(g, w, h, nx, ny, couleur, ep = 2, decale = false) {
  g.strokeStyle = couleur; g.lineWidth = ep;
  for (let j = 0; j <= ny; j++) { const y = j * h / ny; g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
  for (let j = 0; j < ny; j++) for (let i = 0; i <= nx; i++) {
    const x = (i + (decale && j % 2 ? .5 : 0)) * w / nx;
    g.beginPath(); g.moveTo(x % w, j * h / ny); g.lineTo(x % w, (j + 1) * h / ny); g.stroke();
  }
}
function bruit(g, w, h, base, ampl, n = 9000) {
  g.fillStyle = base; g.fillRect(0, 0, w, h);
  for (let i = 0; i < n; i++) { const v = (Math.random() - .5) * ampl; g.fillStyle = `rgba(${v > 0 ? "255,255,255" : "0,0,0"},${Math.abs(v)})`; g.fillRect(Math.random() * w, Math.random() * h, 2, 2); }
}
function veines(g, w, h, couleur, n) {
  g.strokeStyle = couleur;
  for (let i = 0; i < n; i++) {
    g.lineWidth = .6 + Math.random() * 1.8; g.beginPath();
    let x = Math.random() * w, y = 0; g.moveTo(x, y);
    while (y < h) { x += (Math.random() - .5) * 60; y += 20 + Math.random() * 30; g.lineTo(x, y); }
    g.stroke();
  }
}

// taille réelle d'un motif de texture (m) pour calculer la répétition
const MURS = {
  marbre: { nom: "Marbre blanc", pas: [1.2, 2.4], couleur: "#ece8e2", t: () => toile(512, 1024, (g, w, h) => { bruit(g, w, h, "#efebe5", .05); veines(g, w, h, "rgba(140,128,112,.55)", 7); veines(g, w, h, "rgba(186,160,120,.35)", 5); joints(g, w, h, 2, 2, "rgba(170,160,150,.6)"); }) },
  beige: { nom: "Pierre beige", pas: [1.2, 1.2], couleur: "#d8cbb8", t: () => toile(512, 512, (g, w, h) => { bruit(g, w, h, "#d9ccb9", .08); joints(g, w, h, 2, 4, "rgba(150,135,115,.6)"); }) },
  beton: { nom: "Béton gris", pas: [1.2, 1.2], couleur: "#9b9a97", t: () => toile(512, 512, (g, w, h) => { bruit(g, w, h, "#a2a19e", .12, 16000); joints(g, w, h, 2, 2, "rgba(70,70,70,.55)"); }) },
  bleu: { nom: "Bleu-vert", pas: [.6, .6], couleur: "#5f8a87", t: () => toile(512, 512, (g, w, h) => { g.fillStyle = "#5c8783"; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 16; i++) { g.fillStyle = `hsl(176,${18 + Math.random() * 8}%,${40 + Math.random() * 8}%)`; g.fillRect(i * w / 16 + 1, 0, w / 16 - 2, h); }
    joints(g, w, h, 16, 2, "rgba(235,235,230,.7)", 2); }) },
  noir: { nom: "Anthracite", pas: [1.2, 1.2], couleur: "#2f3032", t: () => toile(512, 512, (g, w, h) => { bruit(g, w, h, "#323336", .06); joints(g, w, h, 2, 2, "rgba(15,15,15,.8)"); }) },
  blanc: { nom: "Blanc brillant", pas: [.6, 1.2], couleur: "#f4f3f0", t: () => toile(512, 512, (g, w, h) => { bruit(g, w, h, "#f5f4f1", .03); joints(g, w, h, 2, 2, "rgba(190,188,182,.8)"); }) },
  metro: { nom: "Métro blanc", pas: [.3, .3], couleur: "#f2f1ee", t: () => toile(512, 512, (g, w, h) => { bruit(g, w, h, "#f3f2ef", .03); joints(g, w, h, 4, 8, "rgba(170,168,160,.9)", 2, true); }) },
  pierre: { nom: "Mur effet pierre", pas: [1, 1], couleur: "#d6ccbc", t: () => toile(512, 512, (g, w, h) => { g.fillStyle = "#cfc4b2"; g.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 26) for (let x = -Math.random() * 80; x < w; x += 60 + Math.random() * 90) { g.fillStyle = `hsl(36,${15 + Math.random() * 10}%,${72 + Math.random() * 14}%)`; g.fillRect(x, y, 60 + Math.random() * 80, 22); } }) }
};
const SOLS = {
  beton: MURS.beton, noir: MURS.noir,
  gris: { nom: "Gris clair 60×60", pas: [1.2, 1.2], couleur: "#c9c5be", t: () => toile(512, 512, (g, w, h) => { bruit(g, w, h, "#cbc7c0", .06); joints(g, w, h, 2, 2, "rgba(120,115,108,.6)"); }) },
  bois: { nom: "Parquet bois", pas: [1.2, 1.2], couleur: "#b58a5c", t: () => toile(512, 512, (g, w, h) => {
    for (let j = 0; j < 8; j++) for (let i = -1; i < 3; i++) { g.fillStyle = `hsl(30,${38 + Math.random() * 10}%,${46 + Math.random() * 10}%)`; const x = i * w / 2 + (j % 2) * w / 4; g.fillRect(x, j * h / 8, w / 2, h / 8); }
    g.strokeStyle = "rgba(60,40,20,.35)"; joints(g, w, h, 2, 8, "rgba(60,40,20,.35)", 2, true); }) },
  terrazzo: { nom: "Terrazzo", pas: [.6, .6], couleur: "#e5e1da", t: () => toile(512, 512, (g, w, h) => { bruit(g, w, h, "#e8e4dd", .04);
    for (let i = 0; i < 900; i++) { g.fillStyle = ["#2d2d2d", "#8a8580", "#c9a98a", "#bcb6ad"][i % 4]; g.beginPath(); g.ellipse(Math.random() * w, Math.random() * h, 2 + Math.random() * 6, 2 + Math.random() * 5, Math.random() * 3, 0, 7); g.fill(); }
    joints(g, w, h, 1, 1, "rgba(150,145,138,.6)"); }) },
  marbre: MURS.marbre
};

/* ---------- Matériaux communs ---------- */
const M = {
  blanc: new THREE.MeshStandardMaterial({ color: 0xf6f5f2, roughness: .25 }),
  ceramique: new THREE.MeshStandardMaterial({ color: 0xfbfbfa, roughness: .12 }),
  noir: new THREE.MeshStandardMaterial({ color: 0x1d1d1f, roughness: .45, metalness: .3 }),
  chrome: new THREE.MeshStandardMaterial({ color: 0xc9cccf, roughness: .15, metalness: .9 }),
  bois: new THREE.MeshStandardMaterial({ color: 0xa97c52, roughness: .6 }),
  verre: new THREE.MeshPhysicalMaterial({ color: 0xdfeff0, roughness: .05, transmission: .9, transparent: true, opacity: .32, thickness: .01 }),
  miroir: new THREE.MeshStandardMaterial({ color: 0xd7dfe2, roughness: .08, metalness: .15, emissive: 0x2a3033, emissiveIntensity: .25 }),
  led: new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xfff4dc, emissiveIntensity: 1.6 }),
  receveur: new THREE.MeshStandardMaterial({ color: 0x2b2b2d, roughness: .7 })
};
const boite = (w, h, d, mat) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.castShadow = m.receiveShadow = true; return m; };
const cyl = (r, h, mat, s = 16) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, s), mat); m.castShadow = true; return m; };

/* ---------- Équipements (dimensions en mètres) ---------- */
const OBJETS = {
  douche: { nom: "Douche à l'italienne", taille: [1.2, .9], mural: false, faire() {
    const g = new THREE.Group();
    const r = boite(1.2, .03, .9, M.receveur); r.position.y = .015; g.add(r);
    const caniveau = boite(.7, .005, .05, M.chrome); caniveau.position.set(0, .032, -.38); g.add(caniveau);
    const paroi = new THREE.Mesh(new THREE.BoxGeometry(.01, 2, .9), M.verre); paroi.position.set(.6, 1, 0); g.add(paroi);
    const barre = boite(.02, .02, .9, M.noir); barre.position.set(.6, 2, 0); g.add(barre);
    const profil = boite(.03, 2, .02, M.noir); profil.position.set(.6, 1, -.44); g.add(profil);
    const col = cyl(.012, 1.1, M.noir); col.position.set(-.1, 1.45, -.42); g.add(col);
    const bras = cyl(.01, .3, M.noir); bras.rotation.x = Math.PI / 2; bras.position.set(-.1, 2, -.29); g.add(bras);
    const pomme = boite(.25, .012, .25, M.noir); pomme.position.set(-.1, 1.99, -.17); g.add(pomme);
    const mitig = boite(.18, .06, .05, M.noir); mitig.position.set(-.1, 1.05, -.42); g.add(mitig);
    return g; } },
  baignoire: { nom: "Baignoire", taille: [1.7, .75], mural: false, faire() {
    const g = new THREE.Group();
    const ext = boite(1.7, .55, .75, M.ceramique); ext.position.y = .275; g.add(ext);
    const int = new THREE.Mesh(new THREE.BoxGeometry(1.52, .02, .58), new THREE.MeshStandardMaterial({ color: 0xe9edef, roughness: .2 })); int.position.y = .55; g.add(int);
    const rob = boite(.05, .12, .05, M.chrome); rob.position.set(-.78, .62, -.3); g.add(rob);
    return g; } },
  vasque: { nom: "Meuble vasque", taille: [.8, .46], mural: true, faire() { return meuble(.8, 1); } },
  double: { nom: "Double vasque", taille: [1.2, .46], mural: true, faire() { return meuble(1.2, 2); } },
  wc: { nom: "WC suspendu", taille: [.37, .55], mural: true, faire() {
    const g = new THREE.Group();
    const bati = boite(.5, 1.1, .2, M.blanc); bati.position.set(0, .55, -.17); g.add(bati);
    const plaque = boite(.22, .15, .01, M.noir); plaque.position.set(0, 1, -.065); g.add(plaque);
    const cuvette = new THREE.Mesh(new THREE.CapsuleGeometry(.17, .22, 6, 16), M.ceramique); cuvette.rotation.x = Math.PI / 2; cuvette.scale.set(1, 1, .7); cuvette.position.set(0, .37, .12); cuvette.castShadow = true; g.add(cuvette);
    const abattant = boite(.36, .025, .46, M.noir); abattant.position.set(0, .46, .13); g.add(abattant);
    return g; } },
  radiateur: { nom: "Sèche-serviettes", taille: [.5, .1], mural: true, faire() {
    const g = new THREE.Group();
    [-.24, .24].forEach(x => { const m = cyl(.015, 1.2, M.blanc); m.position.set(x, 1, -.02); g.add(m); });
    for (let i = 0; i < 13; i++) { const b = cyl(.01, .48, M.blanc); b.rotation.z = Math.PI / 2; b.position.set(0, .45 + i * .09, -.02); g.add(b); }
    return g; } },
  miroir: { nom: "Miroir rond", taille: [.6, .04], mural: true, faire() {
    const g = new THREE.Group();
    const anneau = new THREE.Mesh(new THREE.TorusGeometry(.3, .012, 8, 48), M.led); anneau.position.set(0, 1.6, -.03); g.add(anneau);
    const glace = new THREE.Mesh(new THREE.CircleGeometry(.29, 48), M.miroir); glace.position.set(0, 1.6, -.02); g.add(glace);
    const halo = new THREE.PointLight(0xfff1d6, .6, 1.6); halo.position.set(0, 1.6, .15); g.add(halo);
    return g; } }
};
function meuble(w, n) {
  const g = new THREE.Group();
  const caisson = boite(w, .45, .46, M.bois); caisson.position.y = .62; g.add(caisson);
  const plan = boite(w + .02, .04, .48, M.ceramique); plan.position.y = .865; g.add(plan);
  for (let i = 0; i < n; i++) {
    const x = n === 1 ? 0 : (i ? w / 4 : -w / 4);
    const bac = new THREE.Mesh(new THREE.CylinderGeometry(.17, .14, .005, 32), new THREE.MeshStandardMaterial({ color: 0xe6e9eb, roughness: .2 })); bac.position.set(x, .888, .02); g.add(bac);
    const rob = cyl(.012, .22, M.noir); rob.position.set(x, .99, -.17); g.add(rob);
    const bec = cyl(.008, .12, M.noir); bec.rotation.x = Math.PI / 2; bec.position.set(x, 1.09, -.12); g.add(bec);
  }
  [-.1, .1].forEach(y => { const p = boite(w * .3, .015, .01, M.noir); p.position.set(0, .62 + y, .235); g.add(p); });
  return g;
}

/* =================================================================== */
export async function monterSimulateur(vue, { db, params, toast, esc, choisirClient, nomClient }) {
  let etat = { nom: "Ma salle de bain", dims: { l: 2.6, p: 2.0, h: 2.5 }, murs: "blanc", accent: "bleu", sol: "gris", objets: [
    { type: "douche", x: .7, z: -.55, rot: 0 }, { type: "double", x: -.55, z: -.8, rot: 0 }, { type: "miroir", x: -.55, z: -.98, rot: 0 }, { type: "wc", x: -1.1, z: .35, rot: Math.PI / 2 }
  ] };
  let simId = null, client = null, selection = null;
  if (params.get("sim")) {
    const s = await db.lire("simulations", params.get("sim"));
    if (s) { etat = { ...etat, ...s.data }; simId = s.id; etat.nom = s.nom || etat.nom; if (s.client_id) client = await db.lire("clients", s.client_id); }
  } else if (params.get("client")) client = await db.lire("clients", params.get("client"));

  const pastilles = (liste, choisi, cle) => Object.entries(liste).map(([k, v]) => `<button class="pastille ${k === choisi ? "actif" : ""}" data-${cle}="${k}" title="${esc(v.nom)}" aria-label="${esc(v.nom)}" style="background:${v.couleur}"></button>`).join("");
  vue.innerHTML = `
    <div class="entete"><div><div class="petit">Simulation 3D</div><h1 id="titreSim">${esc(etat.nom)}</h1></div>
      <button class="btn clair" id="clientSim">${client ? esc(nomClient(client)) : "Associer un client"}</button></div>
    <div class="deux-col">
      <div>
        <div class="sim" id="scene"><div class="aide3d" id="aide">Glissez pour tourner · pincez pour zoomer · touchez un élément pour le déplacer</div></div>
        <div class="actions-doc" id="selActions" hidden>
          <span class="gris" id="selNom" style="align-self:center"></span>
          <button class="btn clair petit-btn" id="tourner">↻ Tourner</button>
          <button class="btn danger petit-btn" id="retirer">Retirer</button>
        </div>
        <div class="actions-doc">
          <button class="btn" id="enregSim">Enregistrer</button>
          <button class="btn clair" id="imageSim">Télécharger l'image</button>
          <button class="btn discret" id="vueDessus">Vue de dessus</button>
        </div>
      </div>
      <div class="carte">
        <fieldset><legend>Dimensions de la pièce (cm)</legend>
          <div class="trois">
            <div class="champ"><label>Longueur</label><input type="number" id="dl" value="${Math.round(etat.dims.l * 100)}" min="100" max="800"></div>
            <div class="champ"><label>Largeur</label><input type="number" id="dp" value="${Math.round(etat.dims.p * 100)}" min="100" max="800"></div>
            <div class="champ"><label>Hauteur</label><input type="number" id="dh" value="${Math.round(etat.dims.h * 100)}" min="200" max="400"></div>
          </div></fieldset>
        <fieldset><legend>Murs</legend><div class="palette">${pastilles(MURS, etat.murs, "mur")}</div></fieldset>
        <fieldset><legend>Mur de la douche</legend><div class="palette">${pastilles(MURS, etat.accent, "accent")}</div></fieldset>
        <fieldset><legend>Sol</legend><div class="palette">${pastilles(SOLS, etat.sol, "sol")}</div></fieldset>
        <fieldset><legend>Ajouter</legend><div class="objets">${Object.entries(OBJETS).map(([k, o]) => `<button data-ajout="${k}">${esc(o.nom)}</button>`).join("")}</div></fieldset>
      </div>
    </div>`;

  /* --- Scène --- */
  const hote = document.getElementById("scene");
  const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  hote.appendChild(renderer.domElement);
  const scene = new THREE.Scene(); scene.background = new THREE.Color(0xe9e4dc);
  const camera = new THREE.PerspectiveCamera(50, 1, .05, 50);
  camera.position.set(2.6, 2.3, 3.2);
  const controles = new OrbitControls(camera, renderer.domElement);
  controles.target.set(0, .9, 0); controles.enableDamping = true; controles.maxPolarAngle = Math.PI / 2 - .05; controles.minDistance = 1.2; controles.maxDistance = 9;
  scene.add(new THREE.HemisphereLight(0xffffff, 0xd8cfc2, 1.4));
  const soleil = new THREE.DirectionalLight(0xffffff, 1.6); soleil.position.set(2, 5, 3); soleil.castShadow = true;
  soleil.shadow.mapSize.set(1024, 1024); Object.assign(soleil.shadow.camera, { left: -4, right: 4, top: 4, bottom: -4 }); scene.add(soleil);
  const plafonnier = new THREE.PointLight(0xfff3e0, 1.2, 8); scene.add(plafonnier);

  const piece = new THREE.Group(); scene.add(piece);
  const meubles = new THREE.Group(); scene.add(meubles);
  let murs = [];

  const cacheTextures = {};
  const tex = (liste, cle) => (cacheTextures[(liste === SOLS ? "s" : "m") + cle] ??= liste[cle].t());
  function materiau(liste, cle, w, h) {
    const t = tex(liste, cle).clone(); t.needsUpdate = true;
    const [pw, ph] = liste[cle].pas; t.repeat.set(w / pw, h / ph);
    return new THREE.MeshStandardMaterial({ map: t, roughness: liste === SOLS ? .55 : .3 });
  }

  function construirePiece() {
    piece.clear(); murs = [];
    const { l, p, h } = etat.dims;
    const sol = new THREE.Mesh(new THREE.PlaneGeometry(l, p), materiau(SOLS, etat.sol, l, p));
    sol.rotation.x = -Math.PI / 2; sol.receiveShadow = true; sol.name = "sol"; piece.add(sol);
    // murs : fond (z-), droite (x+), avant (z+), gauche (x-) ; le mur de fond reçoit l'accent derrière la douche
    const defs = [
      { w: l, pos: [0, h / 2, -p / 2], rot: 0, n: [0, 0, 1] },
      { w: p, pos: [l / 2, h / 2, 0], rot: -Math.PI / 2, n: [-1, 0, 0] },
      { w: l, pos: [0, h / 2, p / 2], rot: Math.PI, n: [0, 0, -1] },
      { w: p, pos: [-l / 2, h / 2, 0], rot: Math.PI / 2, n: [1, 0, 0] }
    ];
    defs.forEach((d, i) => {
      const accent = i === 0 && etat.objets.some(o => o.type === "douche");
      const m = new THREE.Mesh(new THREE.PlaneGeometry(d.w, h), materiau(MURS, accent ? etat.accent : etat.murs, d.w, h));
      m.position.set(...d.pos); m.rotation.y = d.rot; m.receiveShadow = true; m.userData.normale = new THREE.Vector3(...d.n);
      piece.add(m); murs.push(m);
    });
    // bande d'accent derrière la douche si elle n'est pas contre le mur de fond
    plafonnier.position.set(0, h - .1, 0);
    soleil.target.position.set(0, 0, 0);
  }

  const objetsMesh = new Map();
  function construireObjets() {
    meubles.clear(); objetsMesh.clear();
    etat.objets.forEach((o, i) => {
      const g = OBJETS[o.type].faire();
      g.userData.index = i;
      placer(g, o);
      meubles.add(g); objetsMesh.set(i, g);
    });
  }
  function borner(o) {
    const { l, p } = etat.dims;
    const [w, d] = OBJETS[o.type].taille;
    const tourne = Math.round(o.rot / (Math.PI / 2)) % 2 !== 0;
    const ew = (tourne ? d : w) / 2, ed = (tourne ? w : d) / 2;
    o.x = Math.min(l / 2 - ew, Math.max(-l / 2 + ew, o.x));
    o.z = Math.min(p / 2 - ed, Math.max(-p / 2 + ed, o.z));
  }
  // les éléments muraux se collent au mur le plus proche, face à la pièce
  function collerAuMur(o) {
    const { l, p } = etat.dims;
    const [w, d] = OBJETS[o.type].taille;
    const dist = [{ v: o.z + p / 2, rot: 0 }, { v: l / 2 - o.x, rot: -Math.PI / 2 }, { v: p / 2 - o.z, rot: Math.PI }, { v: o.x + l / 2, rot: Math.PI / 2 }];
    const m = dist.reduce((a, b) => (b.v < a.v ? b : a));
    o.rot = m.rot;
    if (m.rot === 0) o.z = -p / 2 + d / 2;
    if (m.rot === Math.PI) o.z = p / 2 - d / 2;
    if (m.rot === -Math.PI / 2) o.x = l / 2 - d / 2;
    if (m.rot === Math.PI / 2) o.x = -l / 2 + d / 2;
    void w;
  }
  function placer(g, o) {
    if (OBJETS[o.type].mural) collerAuMur(o);
    borner(o);
    g.position.set(o.x, 0, o.z);
    g.rotation.y = o.rot;
    // les modèles sont dessinés avec leur dos vers z- : décaler pour que (x,z) soit le centre au sol
    const [, d] = OBJETS[o.type].taille;
    g.children.forEach(c => { if (c.userData.base === undefined) c.userData.base = c.position.z; c.position.z = c.userData.base + (OBJETS[o.type].mural ? d / 2 - d / 2 : 0); });
  }

  function reconstruire() { construirePiece(); construireObjets(); majSelection(); }
  reconstruire();

  /* --- Taille du canevas --- */
  const redim = () => { const r = hote.getBoundingClientRect(); renderer.setSize(r.width, r.height, false); camera.aspect = r.width / r.height; camera.updateProjectionMatrix(); };
  new ResizeObserver(redim).observe(hote); redim();

  /* --- Murs masqués côté caméra (vue en coupe) --- */
  const dir = new THREE.Vector3();
  function boucle() {
    if (!document.body.contains(hote)) { renderer.dispose(); return; }
    controles.update();
    murs.forEach(m => { dir.copy(camera.position).sub(m.position); m.visible = dir.dot(m.userData.normale) > 0; });
    renderer.render(scene, camera);
    requestAnimationFrame(boucle);
  }
  boucle();

  /* --- Sélection et déplacement au doigt --- */
  const ray = new THREE.Raycaster(), ptr = new THREE.Vector2();
  const planSol = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), point = new THREE.Vector3();
  let glisse = false, decal = new THREE.Vector3(), depart = null;
  const versPtr = e => { const r = renderer.domElement.getBoundingClientRect(); ptr.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1); };
  function objetSous(e) {
    versPtr(e); ray.setFromCamera(ptr, camera);
    const hit = ray.intersectObjects(meubles.children, true)[0];
    if (!hit) return null;
    let o = hit.object; while (o.parent && o.parent !== meubles) o = o.parent;
    return o.userData.index;
  }
  function majSelection() {
    const zone = document.getElementById("selActions");
    meubles.children.forEach(g => g.traverse(m => { if (m.material?.emissive && m.material !== M.led) m.material.emissive?.setHex?.(0); }));
    if (selection === null || !etat.objets[selection]) { selection = null; zone.hidden = true; return; }
    zone.hidden = false;
    document.getElementById("selNom").textContent = OBJETS[etat.objets[selection].type].nom;
  }
  renderer.domElement.addEventListener("pointerdown", e => {
    const i = objetSous(e);
    depart = { x: e.clientX, y: e.clientY };
    if (i === null || i === undefined) return;
    selection = i; majSelection();
    glisse = true; controles.enabled = false;
    ray.ray.intersectPlane(planSol, point);
    const o = etat.objets[i]; decal.set(o.x - point.x, 0, o.z - point.z);
    renderer.domElement.setPointerCapture(e.pointerId);
  });
  renderer.domElement.addEventListener("pointermove", e => {
    if (!glisse || selection === null) return;
    versPtr(e); ray.setFromCamera(ptr, camera);
    if (!ray.ray.intersectPlane(planSol, point)) return;
    const o = etat.objets[selection];
    o.x = point.x + decal.x; o.z = point.z + decal.z;
    placer(objetsMesh.get(selection), o);
  });
  renderer.domElement.addEventListener("pointerup", e => {
    if (!glisse && depart && Math.hypot(e.clientX - depart.x, e.clientY - depart.y) < 5) { selection = null; majSelection(); }
    if (glisse && selection !== null && etat.objets[selection]?.type === "douche") construirePiece();
    glisse = false; controles.enabled = true;
  });

  document.getElementById("tourner").onclick = () => {
    if (selection === null) return;
    const o = etat.objets[selection];
    if (OBJETS[o.type].mural) { // un élément mural passe au mur suivant
      const { l, p } = etat.dims; const ordre = [[0, -p / 2], [l / 2, 0], [0, p / 2], [-l / 2, 0]];
      const k = ([0, -Math.PI / 2, Math.PI, Math.PI / 2].indexOf(o.rot) + 1) % 4; [o.x, o.z] = ordre[k];
    } else o.rot = (o.rot + Math.PI / 2) % (2 * Math.PI);
    placer(objetsMesh.get(selection), o);
  };
  document.getElementById("retirer").onclick = () => {
    if (selection === null) return;
    etat.objets.splice(selection, 1); selection = null; reconstruire();
  };

  /* --- Panneau de réglages --- */
  const panneau = vue.querySelector(".carte");
  panneau.addEventListener("click", e => {
    const b = e.target.closest("button"); if (!b) return;
    if (b.dataset.mur) { etat.murs = b.dataset.mur; }
    else if (b.dataset.accent) { etat.accent = b.dataset.accent; }
    else if (b.dataset.sol) { etat.sol = b.dataset.sol; }
    else if (b.dataset.ajout) {
      etat.objets.push({ type: b.dataset.ajout, x: 0, z: 0, rot: 0 });
      selection = etat.objets.length - 1; reconstruire(); toast(`${OBJETS[b.dataset.ajout].nom} ajouté : faites-le glisser`); return;
    } else return;
    panneau.querySelectorAll(`[data-${b.dataset.mur ? "mur" : b.dataset.accent ? "accent" : "sol"}]`).forEach(x => x.classList.toggle("actif", x === b));
    construirePiece();
  });
  ["dl", "dp", "dh"].forEach(id => document.getElementById(id).addEventListener("change", e => {
    const v = Math.max(100, Math.min(800, Number(e.target.value) || 0)) / 100;
    etat.dims[{ dl: "l", dp: "p", dh: "h" }[id]] = v; reconstruire();
  }));

  let dessus = false;
  document.getElementById("vueDessus").onclick = e => {
    dessus = !dessus;
    if (dessus) { camera.position.set(0, 6, .01); controles.target.set(0, 0, 0); e.target.textContent = "Vue 3D"; }
    else { camera.position.set(2.6, 2.3, 3.2); controles.target.set(0, .9, 0); e.target.textContent = "Vue de dessus"; }
  };

  const image = (largeur = 1400) => {
    renderer.render(scene, camera);
    const src = renderer.domElement, c = document.createElement("canvas");
    c.width = largeur; c.height = Math.round(largeur * src.height / src.width);
    c.getContext("2d").drawImage(src, 0, 0, c.width, c.height);
    return c.toDataURL("image/jpeg", .85);
  };
  document.getElementById("imageSim").onclick = () => {
    const a = document.createElement("a"); a.href = image(); a.download = `simulation-${(client?.nom || "salle-de-bain").toLowerCase()}.jpg`; a.click();
  };
  document.getElementById("clientSim").onclick = () => choisirClient(c => { client = c; document.getElementById("clientSim").textContent = nomClient(c); });
  document.getElementById("titreSim").onclick = () => {
    const n = prompt("Nom de la simulation", etat.nom); if (n) { etat.nom = n; document.getElementById("titreSim").textContent = n; }
  };
  document.getElementById("enregSim").onclick = async () => {
    try {
      const s = await db.enregistrer("simulations", { ...(simId ? { id: simId } : {}), client_id: client?.id || null, nom: etat.nom, data: etat, image: image(480) });
      simId = s.id; toast("Simulation enregistrée ✓");
    } catch (er) { toast("Erreur : " + er.message); }
  };
}
