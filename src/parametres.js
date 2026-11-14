// Réglages propres à chaque commerce, lus sur la ligne « restaurants ».
// Tout a une valeur par défaut, identique au comportement d'avant les réglages :
// un commerce sans réglages fonctionne comme Pillot le faisait déjà.

// Les produits gardent leur code de section (colonne products.cote) : SALE ou SUCRE.
// Le commerce choisit le nom affiché, si la 2e section est utilisée, et jusqu'où
// on recommande (1 = jusqu'au minimum, 2 = jusqu'à 2 fois le minimum).
export const CODES_SECTIONS = ["SALE", "SUCRE"];
const SECTIONS_DEFAUT = {
  SALE:  { nom: "Salé",  actif: true, commande: 2 },
  SUCRE: { nom: "Sucré", actif: true, commande: 1 },
};

// Modules du menu. « auto » : affiché seulement si le commerce a des données
// (Glaces : au moins un parfum actif), tant que le gérant n'a rien choisi.
export const MODULES = [
  { id: "commandes",  nom: "Commandes" },
  { id: "historique", nom: "Historique" },
  { id: "haccp",      nom: "HACCP" },
  { id: "recettes",   nom: "Fiches techniques" },
  { id: "planning",   nom: "Planning" },
  { id: "taches",     nom: "Tâches" },
  { id: "glaces",     nom: "Glaces", auto: true },
  { id: "scan",       nom: "Scan facture" },
  { id: "appareils",  nom: "Équipements" },
];

const texte = (v, defaut) => (typeof v === "string" && v.trim() ? v.trim().slice(0, 30) : defaut);

export function lireParametres(rest, { aDesGlaces = false } = {}) {
  const p = rest?.parametres && typeof rest.parametres === "object" ? rest.parametres : {};
  const s = p.sections && typeof p.sections === "object" ? p.sections : {};
  const sections = CODES_SECTIONS.map(code => {
    const d = SECTIONS_DEFAUT[code], v = s[code] || {};
    return {
      code,
      nom: texte(v.nom, d.nom),
      // La 1re section est toujours utilisée.
      actif: code === "SALE" ? true : v.actif !== false,
      commande: v.commande === 1 || v.commande === 2 ? v.commande : d.commande,
    };
  });
  const obj = Number(rest?.objectif);
  const m = rest?.modules && typeof rest.modules === "object" ? rest.modules : {};
  const modules = {};
  MODULES.forEach(({ id, auto }) => {
    modules[id] = m[id] === true || m[id] === false ? m[id] : (auto ? aDesGlaces : true);
  });
  return {
    sections,
    sectionsActives: sections.filter(x => x.actif),
    nomSection: code => (sections.find(x => x.code === code) || sections[0]).nom,
    commande: code => (sections.find(x => x.code === code) || sections[0]).commande,
    objectif: obj > 0 && obj < 1 ? obj : 0.25,
    modules,
  };
}

// Paramètres par défaut, pour les écrans affichés hors d'un commerce.
export const PARAMETRES_DEFAUT = lireParametres(null);

// Couleur stable par fournisseur, sans liste codée en dur.
const TEINTES = ["#065F46", "#1E3A8A", "#92400E", "#5B21B6", "#7F1D1D", "#0E7490", "#9D174D", "#3F6212"];
export function couleurFournisseur(nom) {
  const t = String(nom || "");
  let h = 0;
  for (let i = 0; i < t.length; i++) h = (h * 31 + t.charCodeAt(i)) | 0;
  return t ? TEINTES[Math.abs(h) % TEINTES.length] : "#374151";
}
