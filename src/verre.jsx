// Thème « verre » du tableau de bord : fenêtre en verre dépoli sur un fond flou.
// Les blocs lisent leurs couleurs dans T (variables CSS avec la couleur d'origine en secours),
// ce qui permet de changer de piste (clair / fumé) sans toucher aux composants.
const v = (nom, defaut) => `var(--pv-${nom}, ${defaut})`;
export const T = {
  text: v("text", "#0F172A"), textSec: v("text-sec", "#64748B"), textMuted: v("text-muted", "#94A3B8"),
  border: v("border", "#E2E8F0"), surface: v("surface", "#FFFFFF"), navy: v("navy", "#0F172A"),
  track: v("track", "#E2E8F0"), borderStrong: v("border-strong", "#CBD5E1"), chip: v("chip", "#F1F5F9"),
  brand: v("brand", "#2563EB"), brandBg: v("brand-bg", "#EFF6FF"), brandDark: v("brand-dark", "#1D4ED8"), brandSoft: v("brand-soft", "#93C5FD"),
  success: v("success", "#16A34A"), successBg: v("success-bg", "#F0FDF4"),
  warning: v("warning", "#D97706"), warningBg: v("warning-bg", "#FFFBEB"),
  danger: v("danger", "#DC2626"), dangerBg: v("danger-bg", "#FEF2F2"),
  orange: v("orange", "#B45309"), orangeBg: v("orange-bg", "#FEF3C7"),
  green: v("green", "#047857"), greenBg: v("green-bg", "#ECFDF5"),
};

export const STYLE_VERRE = `
.pv-verre{--pv-glass:rgba(255,255,255,.55);--pv-glass-b:rgba(255,255,255,.8);--pv-tile:rgba(255,255,255,.62);--pv-tile-h:rgba(255,255,255,.88);
 --pv-surface:rgba(255,255,255,.7);--pv-chip:rgba(15,23,42,.06);--pv-border:rgba(15,23,42,.08);--pv-track:rgba(15,23,42,.09);
 --pv-b1:#c9dafc;--pv-b2:#eef3fb;--pv-b3:#ffffff;--pv-b4:#d8e6f7;--pv-hero-a:#0b1530;--pv-hero-b:#2563eb;--pv-hero-line:#9cc0ff;
 position:relative;isolation:isolate;border-radius:28px;padding:18px;overflow:hidden;background:var(--pv-b2);color:var(--pv-text,#0F172A)}
.pv-verre[data-piste="fume"]{--pv-glass:rgba(58,44,38,.42);--pv-glass-b:rgba(255,255,255,.14);--pv-tile:rgba(255,255,255,.07);--pv-tile-h:rgba(255,255,255,.12);
 --pv-surface:rgba(255,255,255,.06);--pv-border-strong:rgba(255,255,255,.25);--pv-chip:rgba(255,255,255,.1);--pv-border:rgba(255,255,255,.1);--pv-track:rgba(255,255,255,.14);
 --pv-text:#f4ede7;--pv-text-sec:rgba(244,237,231,.7);--pv-text-muted:rgba(244,237,231,.5);--pv-navy:#140f11;
 --pv-brand:#8fb3ff;--pv-brand-bg:rgba(143,179,255,.16);--pv-brand-dark:#bcd0ff;--pv-success:#5fd39a;--pv-success-bg:rgba(95,211,154,.15);
 --pv-warning:#f2b545;--pv-warning-bg:rgba(242,181,69,.15);--pv-danger:#ff7b8b;--pv-danger-bg:rgba(255,123,139,.15);
 --pv-orange:#f2b545;--pv-orange-bg:rgba(242,181,69,.15);--pv-green:#5fd39a;--pv-green-bg:rgba(95,211,154,.15);
 --pv-b1:#6b4a34;--pv-b2:#2e211b;--pv-b3:#a5835f;--pv-b4:#3c4a2c;--pv-hero-a:#160f12;--pv-hero-b:#8d2450;--pv-hero-line:#ff8fb3}
.pv-verre::before{content:"";position:absolute;inset:-60px;z-index:-1;filter:blur(40px);pointer-events:none;
 background:radial-gradient(28% 40% at 12% 18%,var(--pv-b3),transparent 70%),radial-gradient(30% 50% at 88% 30%,var(--pv-b1),transparent 70%),
 radial-gradient(40% 35% at 70% 92%,var(--pv-b4),transparent 70%),radial-gradient(22% 60% at 4% 80%,var(--pv-b1),transparent 70%),
 linear-gradient(160deg,var(--pv-b1),var(--pv-b2))}
.pv-fenetre{border-radius:24px;padding:18px;background:var(--pv-glass);border:1px solid var(--pv-glass-b);
 backdrop-filter:blur(26px) saturate(1.3);-webkit-backdrop-filter:blur(26px) saturate(1.3);box-shadow:inset 0 1px 0 rgba(255,255,255,.25),0 30px 60px -30px rgba(15,23,42,.35)}
.pv-bloc,.pv-tuile{background:var(--pv-tile);border:1px solid var(--pv-glass-b);border-radius:20px;min-width:0;transition:transform .25s cubic-bezier(.2,.8,.2,1),background .25s;animation:pv-up .55s cubic-bezier(.2,.8,.2,1) both}
.pv-tuile:hover{transform:translateY(-3px);background:var(--pv-tile-h)}
.pv-tuile{padding:12px 14px;display:flex;flex-direction:column;gap:6px;text-align:left;font:inherit;color:inherit;cursor:pointer}
.pv-tuile:focus-visible,.pv-mini:focus-visible,.pv-zone:focus-visible{outline:2px solid var(--pv-brand,#2563EB);outline-offset:2px}
@keyframes pv-up{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}
.pv-haut{display:grid;grid-template-columns:240px minmax(0,1fr);gap:14px;margin-bottom:14px}
.pv-col{display:flex;flex-direction:column;gap:10px;min-width:0}
.pv-titre{display:flex;justify-content:space-between;align-items:center;gap:8px;font-size:13px;font-weight:700;color:var(--pv-text,#0F172A)}
.pv-titre small{font-weight:500;color:var(--pv-text-sec,#64748B);font-size:11px}
.pv-mini{border:0;border-radius:16px;padding:10px 12px;color:#fff;position:relative;overflow:hidden;min-height:86px;display:flex;flex-direction:column;justify-content:space-between;gap:8px;text-align:left;cursor:pointer;font:inherit;animation:pv-up .55s cubic-bezier(.2,.8,.2,1) both;transition:transform .25s}
.pv-mini:hover{transform:translateX(3px)}
.pv-mini .pv-etiq{display:flex;justify-content:space-between;gap:6px;font-size:10.5px;font-weight:700}
.pv-mini .pv-etiq span:first-child{background:rgba(255,255,255,.2);padding:2px 8px;border-radius:999px}
.pv-mini b{font-size:13px;line-height:1.3}
.pv-g1{background:linear-gradient(135deg,#7a1532,#d0436f)}.pv-g2{background:linear-gradient(135deg,#6e440a,#a8740f)}.pv-g3{background:linear-gradient(135deg,#1d4ed8,#3b82f6)}
.pv-g4{background:linear-gradient(135deg,#6e440a,#a8740f)}.pv-gok{background:linear-gradient(135deg,#1d4f17,#3f8a2a)}.pv-g5{background:linear-gradient(135deg,#142a6b,#3a6fe0)}.pv-g6{background:linear-gradient(135deg,#1d4f17,#4b9d33)}.pv-g7{background:linear-gradient(135deg,#2e1772,#7a4fe0)}
.pv-hero{border-radius:22px;padding:58px 22px 22px;color:#fff;position:relative;overflow:hidden;min-height:270px;display:flex;flex-direction:column;justify-content:flex-end;gap:10px;
 background:radial-gradient(120% 120% at 85% 15%,var(--pv-hero-b) 0%,transparent 55%),linear-gradient(135deg,var(--pv-hero-a) 35%,color-mix(in srgb,var(--pv-hero-b) 55%,var(--pv-hero-a)));animation:pv-up .6s .05s cubic-bezier(.2,.8,.2,1) both}
.pv-hero .pv-flags{position:absolute;top:16px;left:18px;display:flex;gap:6px;flex-wrap:wrap}
.pv-hero .pv-flags span{font-size:11px;font-weight:700;background:rgba(255,255,255,.15);padding:4px 10px;border-radius:999px}
.pv-hero .pv-courbe{position:absolute;right:16px;top:44px;width:54%;height:56%}
.pv-hero h2{margin:0;max-width:16ch;font-size:26px;letter-spacing:-.02em;line-height:1.15;position:relative;font-weight:800}
.pv-hero p{margin:0;font-size:13px;opacity:.8;max-width:36ch;line-height:1.45;position:relative}
.pv-hero .pv-actions{display:flex;gap:8px;flex-wrap:wrap;position:relative}
.pv-btn{display:inline-flex;align-items:center;gap:6px;border:0;border-radius:999px;padding:9px 16px;font-weight:700;font-size:12.5px;font-family:inherit;cursor:pointer;background:#fff;color:#0b1530;transition:transform .15s}
.pv-btn:hover{transform:translateY(-1px)}
.pv-btn:focus-visible{outline:2px solid #fff;outline-offset:2px}
.pv-btn.pv-gh{background:transparent;color:#fff;box-shadow:inset 0 0 0 1px rgba(255,255,255,.4)}
.pv-zones{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;margin-bottom:16px}
.pv-zone{border:0;border-radius:18px;padding:12px;color:#fff;min-height:130px;position:relative;overflow:hidden;display:flex;flex-direction:column;gap:2px;text-align:left;cursor:pointer;font:inherit;animation:pv-up .55s cubic-bezier(.2,.8,.2,1) both;transition:transform .25s}
.pv-zone:hover{transform:translateY(-4px)}
.pv-zone .pv-z-t{font-size:11px;font-weight:700;opacity:.92}
.pv-zone b{font-size:18px}
.pv-zone .pv-z-s{font-size:11px}
.pv-zone .pv-viz{margin-top:auto;height:60px;display:flex;align-items:end;justify-content:center}
.pv-trace{stroke-dasharray:1400;animation:pv-trace 1.6s .2s cubic-bezier(.3,.7,.2,1) both}
@keyframes pv-trace{from{stroke-dashoffset:1400}to{stroke-dashoffset:0}}
.pv-section{font-size:13px;font-weight:700;margin:0 0 10px;color:var(--pv-text,#0F172A)}
@media (prefers-reduced-motion:reduce){.pv-verre *{animation:none!important;transition:none!important}}
@media (max-width:1000px){.pv-haut{grid-template-columns:minmax(0,1fr)}}
@media (max-width:600px){.pv-verre{padding:8px;border-radius:20px}.pv-fenetre{padding:12px;border-radius:18px}.pv-hero .pv-courbe{width:90%;opacity:.35}.pv-hero h2{font-size:21px}}
`;

// Courbe d'une série de valeurs (mise à l'échelle sur la série elle-même).
export function Courbe({ valeurs, couleur = "#fff", className, aire = true, largeur = 600, hauteur = 220, marge = 10 }) {
  if (!valeurs || valeurs.length < 2) return null;
  const mn = Math.min(...valeurs), mx = Math.max(...valeurs), r = mx - mn || 1;
  const pts = valeurs.map((x, i) => [marge + i * (largeur - 2 * marge) / (valeurs.length - 1), hauteur - marge - (x - mn) / r * (hauteur - 2 * marge)]);
  const d = pts.map((p, i) => (i ? "L" : "M") + p[0].toFixed(1) + " " + p[1].toFixed(1)).join(" ");
  const id = "pvg" + Math.round(mn * 7 + mx * 13 + valeurs.length);
  const fin = pts[pts.length - 1];
  return <svg viewBox={`0 0 ${largeur} ${hauteur}`} preserveAspectRatio="none" className={className} aria-hidden="true">
    <defs><linearGradient id={id} x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopOpacity=".45" style={{stopColor:couleur}}/><stop offset="1" stopOpacity="0" style={{stopColor:couleur}}/></linearGradient></defs>
    {aire && <path d={`${d} L${fin[0]} ${hauteur} L${pts[0][0]} ${hauteur}Z`} fill={`url(#${id})`}/>}
    <path className="pv-trace" d={d} fill="none" style={{stroke:couleur}} strokeWidth="2.5" vectorEffect="non-scaling-stroke" strokeLinecap="round"/>
  </svg>;
}

export function Anneau({ part, texte }) {
  const C = 2 * Math.PI * 22;
  return <svg viewBox="0 0 60 60" width="66" height="66" aria-hidden="true">
    <circle cx="30" cy="30" r="22" fill="none" stroke="rgba(255,255,255,.25)" strokeWidth="7"/>
    <circle cx="30" cy="30" r="22" fill="none" stroke="#fff" strokeWidth="7" strokeLinecap="round" strokeDasharray={C} strokeDashoffset={C * (1 - Math.max(0, Math.min(1, part)))} transform="rotate(-90 30 30)"/>
    <text x="30" y="35" textAnchor="middle" fill="#fff" fontSize="12.5" fontWeight="800">{texte}</text>
  </svg>;
}

export function Jauge({ part, texte }) {
  const L = Math.PI * 24;
  return <svg viewBox="0 0 64 40" width="96" height="60" aria-hidden="true">
    <path d="M8 34a24 24 0 0 1 48 0" fill="none" stroke="rgba(255,255,255,.25)" strokeWidth="7" strokeLinecap="round"/>
    <path d="M8 34a24 24 0 0 1 48 0" fill="none" stroke="#fff" strokeWidth="7" strokeLinecap="round" strokeDasharray={L} strokeDashoffset={L * (1 - Math.max(0, Math.min(1, part)))}/>
    <text x="32" y="34" textAnchor="middle" fill="#fff" fontSize="10.5" fontWeight="800">{texte}</text>
  </svg>;
}
