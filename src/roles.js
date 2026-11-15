// Rôles d'un compte dans le commerce ouvert.
// admin : équipe Pillot · owner : gérant · manager : responsable · employee : équipe.
// Un rôle inconnu (ancien « staff ») est traité comme l'équipe.
export const ROLES = { admin: "Administrateur", owner: "Gérant", manager: "Responsable", employee: "Équipe" };
export const libelleRole = role => ROLES[role] || ROLES.employee;
// Gérant, responsable et admin voient les prix, le CA et les réglages du commerce.
export const estGerant = role => role === "owner" || role === "manager" || role === "admin";
// Onglets réservés aux gérants (prix d'achat, CA, coûts, factures, matériel).
export const ONGLETS_GERANT = ["historique", "recettes", "scan", "appareils"];
