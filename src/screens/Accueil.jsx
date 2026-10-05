// ── Page d'accueil publique : présentation de Pillot + accès à la connexion ──
import { useEffect } from "react";
import html from "./accueil.html?raw";
import css from "./accueil.css?raw";

const FONTS = "https://fonts.googleapis.com/css2?family=Syne:wght@600;700&family=Space+Grotesk:wght@400;500;600&display=swap";

export default function Accueil({ onLogin, onLegal }) {
  useEffect(() => {
    if (document.querySelector(`link[href="${FONTS}"]`)) return;
    const l = document.createElement("link"); l.rel = "stylesheet"; l.href = FONTS; document.head.appendChild(l);
  }, []);
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
