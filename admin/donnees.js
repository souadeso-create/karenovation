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
