// Valeurs de départ : reprises des devis et documents internes de KA Rénovation.

export const PARAMETRES_DEFAUT = {
  entreprise: "Ka Rénovation",
  forme: "SASU au capital de 1 000 €",
  adresse: "18 rue de l'Échauguette",
  cp: "78570",
  ville: "Chanteloup-les-Vignes",
  tel: "07 63 14 76 27",
  email: "karenovation@outlook.fr",
  site: "www.karenovation.fr",
  siret: "928 891 886 00014",
  ape: "74.10Z",
  tva_intra: "FR15 928 891 886",
  mention_tva: "TVA non applicable, article 293 B du Code général des impôts",
  // SASU : la TVA s'applique. 10 % pour la rénovation d'un logement achevé depuis plus de 2 ans ;
  // depuis le 16/02/2025, l'attestation du client est remplacée par cette mention sur le devis signé.
  regime_tva: "tva",
  tva_taux: 10,
  mention_attestation: "En qualité de preneur de la prestation, j'atteste que les travaux réalisés se rapportent à des locaux à usage d'habitation achevés depuis plus de deux ans et respectent les conditions prévues par les articles 279-0 bis et 278-0 bis A du Code général des impôts, et notamment que les travaux effectués sur une période de deux ans au plus n'ont ni concouru à la production d'un immeuble neuf au sens du 2° du 2 du I de l'article 257 du Code général des impôts, ni conduit à augmenter la surface de plancher des locaux existants de plus de 10 %.",
  iban: "",
  bic: "",
  titulaire: "",
  moyen_paiement: "Virement",
  acompte_pct: 30,
  validite_jours: 90,
  echeance_jours: 30,
  prochain_devis: 29,
  prochain_facture: 16,
  lien_avis: "https://share.google/FgNpJ7iHjoGko4ro1",
  conditions:
    "Prestations incluses : main-d'œuvre, installation et finition des éléments listés dans le devis, consommables (colles, joints, vis, protections), matériaux pour plomberie, électricité et plâtrerie (plaques de plâtre BA13 hydro), évacuation des déchets générés par nos travaux.\n" +
    "Prestations non incluses / fournies par le client : carrelages, faïences, sanitaires, meubles et éléments de décoration. Travaux supplémentaires non prévus ou modifications après signature.\n" +
    "Délais : indicatifs, peuvent varier selon aléas et fournisseurs.\n" +
    "Paiement : 30 % à la signature, 40 % à mi-travaux, solde à la réception.\n" +
    "Garanties : main-d'œuvre 1 an, matériaux selon fabricant.\n" +
    "Réception : à la fin des travaux, réserves à notifier sous 7 jours.",
  penalites:
    "En cas de retard de paiement, des pénalités au taux de trois fois le taux d'intérêt légal sont exigibles, ainsi qu'une indemnité forfaitaire de 40 € pour frais de recouvrement (clients professionnels). Pas d'escompte pour paiement anticipé."
};

export const UNITES = ["presta", "m2", "ml", "u", "h", "forfait"];

// [catégorie, désignation, unité, prix HT]
export const PRESTATIONS_DEFAUT = [
  ["Rénovation complète", "Rénovation complète clé en main · Petite salle de bain, jusqu'à 4 m² : dépose et évacuation, plomberie (douche à l'italienne ou receveur, meuble vasque), électricité (prises, éclairage), placo hydro, étanchéité SPEC, ragréage, pose du carrelage sol et murs, pose des équipements, nettoyage. Carrelage, sanitaires et meubles fournis par le client", "forfait", 2271.82],
  ["Rénovation complète", "Rénovation complète clé en main · Salle de bain moyenne, de 4 à 6 m² : dépose et évacuation, plomberie (douche à l'italienne ou receveur, meuble vasque), électricité (prises, éclairage), placo hydro, étanchéité SPEC, ragréage, pose du carrelage sol et murs, pose des équipements, nettoyage. Carrelage, sanitaires et meubles fournis par le client", "forfait", 2999.09],
  ["Rénovation complète", "Rénovation complète clé en main · Grande salle de bain, de 6 à 9 m² : dépose et évacuation, plomberie (douche à l'italienne ou receveur, meuble vasque), électricité (prises, éclairage), placo hydro, étanchéité SPEC, ragréage, pose du carrelage sol et murs, pose des équipements, nettoyage. Carrelage, sanitaires et meubles fournis par le client", "forfait", 3908.18],
  ["Rénovation complète", "Rénovation complète clé en main · Très grande salle de bain, plus de 9 m² : dépose et évacuation, plomberie (douche à l'italienne ou receveur, meuble vasque), électricité (prises, éclairage), placo hydro, étanchéité SPEC, ragréage, pose du carrelage sol et murs, pose des équipements, nettoyage. Carrelage, sanitaires et meubles fournis par le client", "forfait", 4999.09],
  ["Dépose & évacuation", "Dépose complète salle de bain (carrelages, sanitaires, faux plafond, etc.) + évacuation et mise en décharge, préparation des supports", "presta", 400],
  ["Dépose & évacuation", "Dépose de carrelage existant, nettoyage de la surface et évacuation", "m2", 30],
  ["Plomberie", "Création douche à l'italienne carrelée (receveur carrelé, siphon & étanchéité, colonne de douche)", "presta", 1050],
  ["Plomberie", "Modification alimentations / évacuations", "presta", 300],
  ["Plomberie", "Installation WC suspendu", "presta", 350],
  ["Plomberie", "Déplacement radiateur à eau", "presta", 300],
  ["Électricité", "Déplacement prise + interrupteur", "presta", 80],
  ["Électricité", "Installation VMC simple flux (non fournie)", "presta", 400],
  ["Électricité", "Pose de spot LED", "u", 8],
  ["Électricité", "Installation miroir éclairé", "presta", 15],
  ["Placo / Étanchéité / Sol", "Placo BA13 hydro : coffrage, reprises, faux plafond", "presta", 360],
  ["Placo / Étanchéité / Sol", "SPEC étanchéité", "presta", 180],
  ["Placo / Étanchéité / Sol", "Ragréage", "m2", 15],
  ["Pose carrelage", "Pose sol grand format 120×120, colle et joints inclus", "m2", 90],
  ["Pose carrelage", "Pose mural 60×120, colle et joints inclus", "m2", 50],
  ["Menuiserie / Installations", "Pose bloc-porte coulissant", "presta", 150],
  ["Menuiserie / Installations", "Pose meuble double vasque suspendu", "presta", 280],
  ["Finitions", "Peinture plafond", "m2", 20],
  ["Finitions", "Nettoyage fin de chantier", "presta", 90]
];

// Prestations ajoutées après coup : versées une seule fois dans une base déjà remplie.
// Celles que l'artisan a déjà (même désignation, même archivées) ne sont pas ajoutées deux fois.
export const AJOUTS_PRESTATIONS = [
  { cle: "forfaits-taille-2026-10", lignes: PRESTATIONS_DEFAUT.filter(p => p[0] === "Rénovation complète") }
];

// Désignations corrigées après coup : une ligne restée telle quelle chez l'artisan prend le nouveau texte.
// Une ligne qu'il a modifiée lui-même n'est pas touchée.
export const CORRECTIONS_PRESTATIONS = [
  { cle: "forfaits-sans-vmc-ni-wc-2026-10", remplacer: [
    ["électricité (prises, éclairage, VMC), placo hydro", "électricité (prises, éclairage), placo hydro"],
    ["(douche à l'italienne ou receveur, WC, meuble vasque)", "(douche à l'italienne ou receveur, meuble vasque)"]] }
];
