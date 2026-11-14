// Palette, icônes, formats et petits composants partagés par les écrans.
import { useEffect } from "react";
// ── Palette ──────────────────────────────────────────────────
export const C = {
  navy:"#0F172A",brand:"#2563EB",brandLight:"#EFF6FF",brandDark:"#1D4ED8",
  success:"#16A34A",successLight:"#F0FDF4",
  warning:"#D97706",warningLight:"#FFFBEB",
  danger:"#DC2626",dangerLight:"#FEF2F2",
  purple:"#7C3AED",purpleLight:"#F5F3FF",
  bg:"#F1F5F9",surface:"#FFFFFF",
  border:"#E2E8F0",borderStrong:"#CBD5E1",
  text:"#0F172A",textSec:"#64748B",textMuted:"#94A3B8"
};

// ── SVG Icons ─────────────────────────────────────────────────
export const ICONS = {
  home:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
  box:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>,
  cart:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 001.99 1.61h9.72a2 2 0 001.99-1.61L23 6H6"/></svg>,
  chart:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>,
  thermometer:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 14.76V3.5a2.5 2.5 0 00-5 0v11.26a4.5 4.5 0 105 0z"/></svg>,
  clipboard:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/></svg>,
  book:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/></svg>,
  users:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>,
  settings:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>,
  logout:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>,
  edit:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
  copy:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>,
  check:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>,
  alert:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>,
  plus:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  trash:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>,
  search:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
  history:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="12 8 12 12 14 14"/><path d="M3.05 11a9 9 0 119.9 9.9"/><path d="M3 3v5h5"/><path d="M3 8L6.5 4.5"/></svg>,
  key:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 11-7.778 7.778 5.5 5.5 0 017.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/></svg>,
  x:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  trend:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>,
  droplet:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2.69l5.66 5.66a8 8 0 11-11.31 0z"/></svg>,
  download:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>,
};
export const Icon = ({n,sz=18,c="currentColor"})=><span style={{display:"inline-flex",width:sz,height:sz,color:c,flexShrink:0}}>{ICONS[n]}</span>;

// ── Helpers ──────────────────────────────────────────────────
export const gst =p=>{if(p.stock===null||p.stock===undefined)return"non_saisi";if(!p.stock_min)return"non_suivi";if(p.stock===0)return"rupture";if(p.stock<=p.stock_min)return"commander";return"ok";};
export const qteNum =v=>{const t=String(v??"").trim();return /^\d+([.,]\d+)?$/.test(t)?Number(t.replace(",",".")):null;};
// Valeur d'une liste de produits au stock actuel : total, et produits en stock (> 0) restés sans prix.
export const valeurProduits =ps=>{let total=0,sansPrix=0;ps.forEach(p=>{const q=Number(p.stock);if(p.stock===null||p.stock===undefined||!(q>0))return;const px=Number(p.prix_achat)||0;if(px>0)total+=q*px;else sansPrix++;});return{total,sansPrix};};
// Quantité à commander : jusqu'à « mult » fois le minimum (réglage de la section, par défaut 1 en Sucré, 2 en Salé).
export const gqt =(p,mult)=>Math.max(1,Math.ceil(p.stock_min*(mult??(p.cote==="SUCRE"?1:2))-p.stock));
export const fmt =n=>new Intl.NumberFormat("fr-FR",{style:"currency",currency:"EUR",minimumFractionDigits:0}).format(n||0);
export const fmtPrix =n=>new Intl.NumberFormat("fr-FR",{style:"currency",currency:"EUR",minimumFractionDigits:2,maximumFractionDigits:2}).format(n||0);
export const fmtDate =d=>new Date(d).toLocaleDateString("fr-FR",{day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"});
export const fmtDay =d=>new Date(d).toLocaleDateString("fr-FR",{weekday:"long",day:"numeric",month:"long"});

// ── Status Badge ──────────────────────────────────────────────
export function Chip({status,small}){
  const m={rupture:{l:"Rupture",bg:C.dangerLight,c:C.danger},commander:{l:"Commander",bg:C.warningLight,c:C.warning},ok:{l:"OK",bg:C.successLight,c:C.success},non_suivi:{l:"Non suivi",bg:"#F8FAFC",c:C.textMuted},non_saisi:{l:"Non saisi",bg:"#F8FAFC",c:C.textMuted}};
  const s=m[status]||m.non_saisi;
  return<span style={{display:"inline-flex",alignItems:"center",gap:4,padding:small?"2px 7px":"3px 10px",borderRadius:20,background:s.bg,fontSize:small?10:11,fontWeight:600,color:s.c,whiteSpace:"nowrap"}}><span style={{width:6,height:6,borderRadius:"50%",background:s.c,display:"inline-block"}}/>{s.l}</span>;
}

// ── Gauge ─────────────────────────────────────────────────────
export function Gauge({ratio,obj=0.25}){
  const pct=Math.min(ratio*100,50),fill=pct/50,R=70,cx=90,cy=85;
  const a=(-180+fill*180)*Math.PI/180,ex=cx+R*Math.cos(a),ey=cy+R*Math.sin(a),lg=fill>0.5?1:0;
  const col=ratio<=obj?C.success:ratio<=obj*1.4?C.warning:C.danger;
  const fp=fill>0.005?`M${cx-R} ${cy} A${R} ${R} 0 ${lg} 1 ${ex.toFixed(1)} ${ey.toFixed(1)}`:"";
  return<svg width="180" height="108" viewBox="0 0 180 108">
    <path d={`M${cx-R} ${cy} A${R} ${R} 0 0 1 ${cx+R} ${cy}`} fill="none" stroke="#E2E8F0" strokeWidth="14" strokeLinecap="round"/>
    {fp&&<path d={fp} fill="none" stroke={col} strokeWidth="14" strokeLinecap="round"/>}
    {fill>0.005&&<circle cx={ex.toFixed(1)} cy={ey.toFixed(1)} r={7} fill={col} stroke="white" strokeWidth="2"/>}
    <text x={cx} y={cy-8} textAnchor="middle" fontSize="26" fontWeight="700" fill={col}>{ratio>0?(ratio*100).toFixed(1)+"%":"—"}</text>
    <text x={cx} y={cy+12} textAnchor="middle" fontSize="11" fill={C.textMuted}>objectif {(obj*100).toFixed(0)}%</text>
    <text x={cx-R-4} y={cy+22} textAnchor="middle" fontSize="9" fill={C.textMuted}>0%</text>
    <text x={cx+R+4} y={cy+22} textAnchor="middle" fontSize="9" fill={C.textMuted}>50%</text>
  </svg>;
}

// ── Toast ─────────────────────────────────────────────────────
export function Toast({msg,type="success",onClose}){
  useEffect(()=>{const t=setTimeout(onClose,3000);return()=>clearTimeout(t);},[onClose]);
  const bg=type==="success"?C.success:type==="error"?C.danger:C.warning;
  return<div style={{position:"fixed",top:20,right:20,zIndex:9999,background:bg,color:"#fff",padding:"12px 16px",borderRadius:10,display:"flex",alignItems:"center",gap:10,boxShadow:"0 4px 20px rgba(0,0,0,.2)",fontSize:14,fontWeight:500,maxWidth:320}}>
    <Icon n={type==="success"?"check":"alert"} sz={16}/>{msg}
    <button onClick={onClose} style={{background:"none",border:"none",color:"rgba(255,255,255,.8)",cursor:"pointer",marginLeft:"auto"}}><Icon n="x" sz={14}/></button>
  </div>;
}

// ── Card ──────────────────────────────────────────────────────
export function Card({children,style={},onClick}){
  return<div onClick={onClick} style={{background:C.surface,borderRadius:14,border:`1px solid ${C.border}`,boxShadow:"0 1px 4px rgba(0,0,0,.04)",cursor:onClick?"pointer":"default",...style}}
    onMouseEnter={e=>onClick&&(e.currentTarget.style.boxShadow="0 4px 16px rgba(0,0,0,.08)")} onMouseLeave={e=>e.currentTarget.style.boxShadow="0 1px 4px rgba(0,0,0,.04)"}>
    {children}
  </div>;
}
