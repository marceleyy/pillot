// Date locale « AAAA-MM-JJ » (pas la date UTC, qui décale d'un jour après minuit).
export const jourLocal = (d = new Date()) => { const x = new Date(d); return `${x.getFullYear()}-${String(x.getMonth()+1).padStart(2,"0")}-${String(x.getDate()).padStart(2,"0")}`; };
// Tâche et réparation non réalisée dont l'échéance est passée.
export const enRetard = t => t.statut !== "realisee" && !!t.echeance && t.echeance < jourLocal();
