// ── Page d'accueil publique : présentation de Pillot + accès à la connexion ──
import html from "./accueil.html?raw";
import css from "./accueil.css?raw";

export default function Accueil({ onLogin, onLegal }) {
  // Liens du contenu statique : connexion et textes légaux gérés par l'application
  const onClick = e => {
    const a = e.target.closest("[data-action]");
    if (!a) return;
    e.preventDefault();
    const act = a.getAttribute("data-action");
    if (act === "login") onLogin();
    else onLegal(act === "privacy" ? "confidentialite" : "mentions");
  };
  return <>
    <style>{css}</style>
    {/* Contenu statique écrit par nous (aucune donnée utilisateur) */}
    <div className="acc" onClick={onClick} dangerouslySetInnerHTML={{ __html: html }}/>
  </>;
}
