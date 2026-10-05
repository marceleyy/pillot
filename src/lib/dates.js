// Dates au format YYYY-MM-DD dans le fuseau local (toISOString() renvoie l'UTC,
// ce qui décale d'un jour entre minuit et 2 h en France).
const pad = n => String(n).padStart(2, "0");

export const localDate = (d = new Date()) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

// "YYYY-MM-DD" -> Date à minuit local (new Date("YYYY-MM-DD") donne minuit UTC)
export const parseLocalDate = s => {
  const [y, m, d] = String(s).split("-").map(Number);
  return new Date(y, m - 1, d);
};

// Nombre de jours entiers entre aujourd'hui et la date (négatif si passée)
export const daysFromToday = s => {
  const t = new Date();
  const today = new Date(t.getFullYear(), t.getMonth(), t.getDate());
  return Math.round((parseLocalDate(s) - today) / 86400000);
};
