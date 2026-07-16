import { useState, useEffect, useCallback, useRef } from "react";
import { Planning, Taches } from "./screens/Planning_Taches";
import HACCPComplet from "./screens/HACCP_complet";
import PillotGlaces from "./screens/PillotGlaces";
import { EquipementSetup, InvoiceScanner } from "./screens/EquipementSetup";

import { supabase } from "./lib/supabase";

// ── Palette ──────────────────────────────────────────────────
const C = {
  navy:"#0F172A",brand:"#2563EB",brandLight:"#EFF6FF",brandDark:"#1D4ED8",
  success:"#16A34A",successLight:"#F0FDF4",
  warning:"#D97706",warningLight:"#FFFBEB",
  danger:"#DC2626",dangerLight:"#FEF2F2",
  purple:"#7C3AED",purpleLight:"#F5F3FF",
  bg:"#F1F5F9",surface:"#FFFFFF",
  border:"#E2E8F0",borderStrong:"#CBD5E1",
  text:"#0F172A",textSec:"#64748B",textMuted:"#94A3B8",
  fourn:{"TAD MARKET":"#065F46","METRO":"#1E3A8A","ALPAGEL":"#92400E","ODYSSÉE DES GLACES":"#5B21B6","LAVAZZA":"#7F1D1D"}
};

// ── SVG Icons ─────────────────────────────────────────────────
const ICONS = {
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
};
const Icon = ({n,sz=18,c="currentColor"})=><span style={{display:"inline-flex",width:sz,height:sz,color:c,flexShrink:0}}>{ICONS[n]}</span>;

// ── Helpers ──────────────────────────────────────────────────
const gst=p=>{if(p.stock===null||p.stock===undefined)return"non_saisi";if(!p.stock_min)return"non_suivi";if(p.stock===0)return"rupture";if(p.stock<=p.stock_min)return"commander";return"ok";};
const gqt=p=>p.cote==="SUCRE"?Math.max(1,Math.ceil(p.stock_min-p.stock)):Math.max(1,Math.ceil(p.stock_min*2-p.stock));
const fmt=n=>new Intl.NumberFormat("fr-FR",{style:"currency",currency:"EUR",minimumFractionDigits:0}).format(n||0);
const fmtDate=d=>new Date(d).toLocaleDateString("fr-FR",{day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"});
const fmtDay=d=>new Date(d).toLocaleDateString("fr-FR",{weekday:"long",day:"numeric",month:"long"});

// ── Status Badge ──────────────────────────────────────────────
function Chip({status,small}){
  const m={rupture:{l:"Rupture",bg:C.dangerLight,c:C.danger},commander:{l:"Commander",bg:C.warningLight,c:C.warning},ok:{l:"OK",bg:C.successLight,c:C.success},non_suivi:{l:"Non suivi",bg:"#F8FAFC",c:C.textMuted},non_saisi:{l:"Non saisi",bg:"#F8FAFC",c:C.textMuted}};
  const s=m[status]||m.non_saisi;
  return<span style={{display:"inline-flex",alignItems:"center",gap:4,padding:small?"2px 7px":"3px 10px",borderRadius:20,background:s.bg,fontSize:small?10:11,fontWeight:600,color:s.c,whiteSpace:"nowrap"}}><span style={{width:6,height:6,borderRadius:"50%",background:s.c,display:"inline-block"}}/>{s.l}</span>;
}

// ── Gauge ─────────────────────────────────────────────────────
function Gauge({ratio,obj=0.25}){
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
function Toast({msg,type="success",onClose}){
  useEffect(()=>{const t=setTimeout(onClose,3000);return()=>clearTimeout(t);},[onClose]);
  const bg=type==="success"?C.success:type==="error"?C.danger:C.warning;
  return<div style={{position:"fixed",top:20,right:20,zIndex:9999,background:bg,color:"#fff",padding:"12px 16px",borderRadius:10,display:"flex",alignItems:"center",gap:10,boxShadow:"0 4px 20px rgba(0,0,0,.2)",fontSize:14,fontWeight:500,maxWidth:320}}>
    <Icon n={type==="success"?"check":"alert"} sz={16}/>{msg}
    <button onClick={onClose} style={{background:"none",border:"none",color:"rgba(255,255,255,.8)",cursor:"pointer",marginLeft:"auto"}}><Icon n="x" sz={14}/></button>
  </div>;
}

// ── Card ──────────────────────────────────────────────────────
function Card({children,style={},onClick}){
  return<div onClick={onClick} style={{background:C.surface,borderRadius:14,border:`1px solid ${C.border}`,boxShadow:"0 1px 4px rgba(0,0,0,.04)",cursor:onClick?"pointer":"default",...style}}
    onMouseEnter={e=>onClick&&(e.currentTarget.style.boxShadow="0 4px 16px rgba(0,0,0,.08)")} onMouseLeave={e=>e.currentTarget.style.boxShadow="0 1px 4px rgba(0,0,0,.04)"}>
    {children}
  </div>;
}

// ── LOGIN ─────────────────────────────────────────────────────
function Login(){
  const [email,setEmail]=useState(""),[ pwd,setPwd]=useState(""),[ loading,setLoading]=useState(false),[ err,setErr]=useState("");
  const go=async()=>{setLoading(true);setErr("");const{error}=await supabase.auth.signInWithPassword({email,password:pwd});if(error)setErr("Email ou mot de passe incorrect");setLoading(false);};
  const inp={width:"100%",boxSizing:"border-box",padding:"11px 14px",borderRadius:10,border:`1.5px solid ${C.border}`,fontSize:14,outline:"none"};
  return<div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:"linear-gradient(135deg,#0F172A 0%,#1E3A5F 100%)",padding:20}}>
    <div style={{background:C.surface,borderRadius:20,padding:"40px 36px",width:"100%",maxWidth:380,boxShadow:"0 25px 60px rgba(0,0,0,.3)"}}>
      <div style={{textAlign:"center",marginBottom:32}}>
        <div style={{width:60,height:60,background:"linear-gradient(135deg,#2563EB,#0F172A)",borderRadius:18,display:"inline-flex",alignItems:"center",justifyContent:"center",marginBottom:14,boxShadow:"0 8px 24px rgba(37,99,235,.4)"}}>
          <span style={{color:"#fff",fontSize:26,fontWeight:800}}>P</span>
        </div>
        <h1 style={{margin:0,fontSize:28,fontWeight:800,color:C.text,letterSpacing:"-1px"}}>Pillot</h1>
        <p style={{margin:"6px 0 0",color:C.textSec,fontSize:14}}>pillot-restaurant.fr</p>
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:12}}>
        <div><label style={{fontSize:11,fontWeight:700,color:C.textSec,textTransform:"uppercase",letterSpacing:".5px",display:"block",marginBottom:5}}>Email</label>
          <input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="votre@email.com" style={inp} onFocus={e=>e.target.style.borderColor=C.brand} onBlur={e=>e.target.style.borderColor=C.border}/></div>
        <div><label style={{fontSize:11,fontWeight:700,color:C.textSec,textTransform:"uppercase",letterSpacing:".5px",display:"block",marginBottom:5}}>Mot de passe</label>
          <input type="password" value={pwd} onChange={e=>setPwd(e.target.value)} onKeyDown={e=>e.key==="Enter"&&go()} placeholder="••••••••" style={inp} onFocus={e=>e.target.style.borderColor=C.brand} onBlur={e=>e.target.style.borderColor=C.border}/></div>
        {err&&<p style={{margin:0,color:C.danger,fontSize:13,display:"flex",alignItems:"center",gap:6}}><Icon n="alert" sz={14}/>{err}</p>}
        <button onClick={go} disabled={loading} style={{padding:13,background:"linear-gradient(135deg,#2563EB,#1D4ED8)",color:"#fff",border:"none",borderRadius:10,fontSize:15,fontWeight:700,cursor:"pointer",opacity:loading?.7:1,marginTop:4,boxShadow:"0 4px 14px rgba(37,99,235,.4)"}}>
          {loading?"Connexion...":"Se connecter"}</button>
      </div>
    </div>
  </div>;
}

// ── DASHBOARD ─────────────────────────────────────────────────
function Dashboard({profile,products,onTab}){
  const rest=profile?.restaurants;
  const rup=products.filter(p=>gst(p)==="rupture");
  const cmd=products.filter(p=>gst(p)==="commander");
  const ok=products.filter(p=>gst(p)==="ok");
  const ns=products.filter(p=>gst(p)==="non_saisi");
  const rs=rest?.ratio_sale||0,rsu=rest?.ratio_sucre||0,obj=rest?.objectif||0.25;
  const ca_s=rest?.ca_sale||0,ca_su=rest?.ca_sucre||0;

  function StatCard({icon,label,value,sub,color,bg,onClick}){
    return<Card onClick={onClick} style={{padding:"18px 20px"}}>
      <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between"}}>
        <div>
          <p style={{margin:0,fontSize:11,fontWeight:700,color:C.textSec,textTransform:"uppercase",letterSpacing:".5px"}}>{label}</p>
          <p style={{margin:"8px 0 0",fontSize:32,fontWeight:800,color:color||C.text,lineHeight:1}}>{value}</p>
          {sub&&<p style={{margin:"4px 0 0",fontSize:12,color:C.textMuted}}>{sub}</p>}
        </div>
        <div style={{width:44,height:44,borderRadius:12,background:bg||C.brandLight,display:"flex",alignItems:"center",justifyContent:"center"}}>
          <Icon n={icon} sz={20} c={color||C.brand}/>
        </div>
      </div>
    </Card>;
  }

  return<div>
    <div style={{marginBottom:24}}>
      <h1 style={{margin:0,fontSize:22,fontWeight:800,color:C.text,letterSpacing:"-.5px"}}>Tableau de bord</h1>
      <p style={{margin:"4px 0 0",fontSize:14,color:C.textSec}}>{rest?.name} · {fmtDay(new Date())}</p>
    </div>
    <div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:12,marginBottom:20}}>
      <StatCard icon="alert" label="Ruptures" value={rup.length} sub="stocks épuisés" color={rup.length>0?C.danger:C.textMuted} bg={rup.length>0?C.dangerLight:"#F8FAFC"} onClick={()=>onTab("commandes")}/>
      <StatCard icon="cart" label="À commander" value={cmd.length} sub="sous le minimum" color={cmd.length>0?C.warning:C.textMuted} bg={cmd.length>0?C.warningLight:"#F8FAFC"} onClick={()=>onTab("commandes")}/>
      <StatCard icon="check" label="OK" value={ok.length} sub="stocks suffisants" color={C.success} bg={C.successLight}/>
      <StatCard icon="box" label="Non saisis" value={ns.length} sub="à mettre à jour" color={C.textSec} bg="#F8FAFC" onClick={()=>onTab("stocks")}/>
    </div>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:20}}>
      {[["SALE","Côté Salé",rs,ca_s],["SUCRE","Côté Sucré",rsu,ca_su]].map(([k,l,r,ca])=>(
        <Card key={k} style={{padding:"18px",textAlign:"center"}}>
          <p style={{margin:"0 0 4px",fontSize:11,fontWeight:700,color:C.textSec,textTransform:"uppercase",letterSpacing:".5px"}}>{l}</p>
          <Gauge ratio={r} obj={obj}/>
          {ca>0?<div style={{marginTop:6,padding:"3px 10px",borderRadius:20,display:"inline-block",background:r<=obj?C.successLight:C.dangerLight}}>
            <span style={{fontSize:11,fontWeight:700,color:r<=obj?C.success:C.danger}}>{r<=obj?"Dans l'objectif":`+${((r-obj)*100).toFixed(1)}% au-dessus`}</span>
          </div>:<button onClick={()=>onTab("settings")} style={{marginTop:8,fontSize:12,color:C.brand,background:"none",border:"none",cursor:"pointer",fontWeight:500}}>Saisir le CA →</button>}
          {ca>0&&<p style={{margin:"6px 0 0",fontSize:11,color:C.textMuted}}>CA {fmt(ca)}</p>}
        </Card>
      ))}
    </div>
    {rup.length>0&&<Card style={{overflow:"hidden",marginBottom:20}}>
      <div style={{padding:"12px 18px",borderBottom:`1px solid ${C.border}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div style={{display:"flex",alignItems:"center",gap:8}}><Icon n="alert" sz={15} c={C.danger}/><span style={{fontSize:14,fontWeight:700}}>Ruptures à traiter</span></div>
        <button onClick={()=>onTab("commandes")} style={{fontSize:12,color:C.brand,background:"none",border:"none",cursor:"pointer",fontWeight:600}}>Générer commandes →</button>
      </div>
      {rup.slice(0,5).map(p=><div key={p.id} style={{padding:"10px 18px",borderBottom:`1px solid ${C.border}`,display:"flex",alignItems:"center",gap:10}}>
        <span style={{width:8,height:8,borderRadius:"50%",background:C.danger,display:"inline-block",flexShrink:0}}/>
        <div style={{flex:1}}><p style={{margin:0,fontSize:13,fontWeight:500}}>{p.nom}</p><p style={{margin:0,fontSize:11,color:C.textSec}}>{p.fournisseur}</p></div>
        <span style={{fontSize:12,fontWeight:700,color:C.danger}}>Commander {gqt(p)} {p.unite}</span>
      </div>)}
    </Card>}
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
      <Card onClick={()=>onTab("haccp")} style={{padding:"16px 18px",display:"flex",alignItems:"center",gap:12}}>
        <div style={{width:40,height:40,borderRadius:10,background:"#FFF7ED",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}><Icon n="thermometer" sz={20} c="#EA580C"/></div>
        <div><p style={{margin:0,fontSize:13,fontWeight:700}}>HACCP</p><p style={{margin:0,fontSize:11,color:C.textSec}}>Températures & nettoyage</p></div>
      </Card>
      <Card onClick={()=>onTab("recettes")} style={{padding:"16px 18px",display:"flex",alignItems:"center",gap:12}}>
        <div style={{width:40,height:40,borderRadius:10,background:C.purpleLight,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}><Icon n="book" sz={20} c={C.purple}/></div>
        <div><p style={{margin:0,fontSize:13,fontWeight:700}}>Fiches techniques</p><p style={{margin:0,fontSize:11,color:C.textSec}}>Recettes & coûts</p></div>
      </Card>
    </div>
  </div>;
}

// ── INVENTAIRE ────────────────────────────────────────────────
function Inventaire({products,restaurantId,onStockUpdate,toast}){
  const [cote,setCote]=useState("SALE"),[search,setSearch]=useState(""),[editId,setEditId]=useState(null),[editVal,setEditVal]=useState(""),[saving,setSaving]=useState(false),[showHist,setShowHist]=useState(false),[hist,setHist]=useState([]),[loadingHist,setLoadingHist]=useState(false);

  const loadHistory=async()=>{
    setLoadingHist(true);
    const{data}=await supabase.from("stock_entries").select("*,products(nom,unite,fournisseur)").eq("restaurant_id",restaurantId).order("created_at",{ascending:false}).limit(60);
    setHist(data||[]);setLoadingHist(false);
  };

  const cats=[...new Set(products.filter(p=>p.cote===cote).map(p=>p.categorie))];
  const filtered=products.filter(p=>p.cote===cote&&(!search||p.nom.toLowerCase().includes(search.toLowerCase())||p.fournisseur?.toLowerCase().includes(search.toLowerCase())));

  const saveStock=async(product)=>{
    setSaving(true);const v=parseFloat(editVal);
    if(!isNaN(v)&&v>=0){
      const{error}=await supabase.from("stock_entries").insert({product_id:product.id,restaurant_id:restaurantId,stock_reel:v});
      if(!error){onStockUpdate(product.id,v);toast("Stock mis à jour");}else toast("Erreur","error");
    }
    setEditId(null);setSaving(false);
  };

  const DOT={rupture:C.danger,commander:C.warning,ok:C.success,non_saisi:"#CBD5E1",non_suivi:C.textMuted};

  if(showHist)return<div>
    <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:20}}>
      <button onClick={()=>setShowHist(false)} style={{padding:"8px 14px",borderRadius:8,border:`1px solid ${C.border}`,background:"transparent",cursor:"pointer",fontSize:13}}>← Retour</button>
      <div><h1 style={{margin:0,fontSize:20,fontWeight:800}}>Historique des saisies</h1><p style={{margin:0,fontSize:13,color:C.textSec}}>{hist.length} entrées</p></div>
    </div>
    {loadingHist?<p style={{color:C.textMuted,textAlign:"center",padding:40}}>Chargement...</p>:hist.length===0?<Card style={{padding:40,textAlign:"center"}}><Icon n="history" sz={40} c={C.textMuted}/><p style={{color:C.textSec,marginTop:12}}>Aucune saisie pour l'instant</p></Card>:
    <Card style={{overflow:"hidden"}}>
      {hist.map((e,i)=><div key={e.id} style={{padding:"11px 18px",borderBottom:i<hist.length-1?`1px solid ${C.border}`:"none",display:"flex",alignItems:"center",gap:12}}>
        <div style={{width:36,height:36,borderRadius:10,background:C.brandLight,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,fontSize:14,fontWeight:700,color:C.brand}}>{e.stock_reel}</div>
        <div style={{flex:1}}>
          <p style={{margin:0,fontSize:13,fontWeight:600}}>{e.products?.nom||"—"}</p>
          <p style={{margin:0,fontSize:11,color:C.textSec}}>{fmtDate(e.created_at)}</p>
        </div>
        <span style={{fontSize:12,color:C.textMuted}}>{e.products?.unite}</span>
      </div>)}
    </Card>}
  </div>;

  return<div>
    <div style={{marginBottom:16,display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:10,flexWrap:"wrap"}}>
      <div><h1 style={{margin:0,fontSize:22,fontWeight:800,letterSpacing:"-.5px"}}>Inventaire</h1><p style={{margin:"4px 0 0",fontSize:14,color:C.textSec}}>{products.filter(p=>p.cote===cote).length} produits</p></div>
      <div style={{display:"flex",gap:8,alignItems:"center"}}>
        <button onClick={()=>{setShowHist(true);loadHistory();}} style={{padding:"7px 12px",borderRadius:8,border:`1px solid ${C.border}`,background:"transparent",cursor:"pointer",display:"flex",alignItems:"center",gap:6,fontSize:12,color:C.textSec}}><Icon n="history" sz={14}/>Historique</button>
        <div style={{display:"flex",gap:4,background:"#F1F5F9",padding:4,borderRadius:10}}>
          {[["SALE","Salé"],["SUCRE","Sucré"]].map(([k,l])=><button key={k} onClick={()=>setCote(k)} style={{padding:"6px 14px",borderRadius:8,border:"none",fontSize:13,fontWeight:600,cursor:"pointer",background:cote===k?C.surface:"transparent",color:cote===k?C.text:C.textSec,boxShadow:cote===k?"0 1px 4px rgba(0,0,0,.1)":"none"}}>{l}</button>)}
        </div>
      </div>
    </div>
    <div style={{position:"relative",marginBottom:14}}>
      <span style={{position:"absolute",left:12,top:"50%",transform:"translateY(-50%)",color:C.textMuted}}><Icon n="search" sz={16}/></span>
      <input type="text" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Rechercher un produit ou fournisseur..."
        style={{width:"100%",boxSizing:"border-box",padding:"10px 12px 10px 38px",borderRadius:10,border:`1.5px solid ${C.border}`,fontSize:13,outline:"none"}}
        onFocus={e=>e.target.style.borderColor=C.brand} onBlur={e=>e.target.style.borderColor=C.border}/>
    </div>
    <Card style={{overflow:"hidden"}}>
      {cats.map(cat=>{
        const ps=filtered.filter(p=>p.categorie===cat);if(!ps.length)return null;
        const rc=ps.filter(p=>gst(p)==="rupture").length,cc=ps.filter(p=>gst(p)==="commander").length;
        return<div key={cat}>
          <div style={{padding:"8px 18px",background:"#F8FAFC",borderBottom:`1px solid ${C.border}`,display:"flex",alignItems:"center",gap:8}}>
            <span style={{fontSize:11,fontWeight:700,textTransform:"uppercase",letterSpacing:".8px",color:C.textSec,flex:1}}>{cat}</span>
            {rc>0&&<span style={{fontSize:10,fontWeight:700,color:C.danger,background:C.dangerLight,padding:"2px 7px",borderRadius:10}}>{rc} rupture{rc>1?"s":""}</span>}
            {cc>0&&<span style={{fontSize:10,fontWeight:700,color:C.warning,background:C.warningLight,padding:"2px 7px",borderRadius:10}}>{cc} cmd</span>}
          </div>
          {ps.map(p=>{
            const st=gst(p);
            if(editId===p.id)return<div key={p.id} style={{padding:"13px 18px",borderBottom:`1px solid ${C.border}`,background:"#EFF6FF"}}>
              <p style={{margin:"0 0 10px",fontSize:14,fontWeight:700}}>{p.nom}</p>
              <div style={{display:"flex",alignItems:"center",gap:10}}>
                <input type="number" defaultValue={p.stock??""} min="0" step="0.5" autoFocus onChange={e=>setEditVal(e.target.value)}
                  style={{flex:1,padding:"9px 12px",borderRadius:8,border:`1.5px solid ${C.brand}`,fontSize:16,fontWeight:700,outline:"none"}}/>
                <span style={{fontSize:13,color:C.textSec,fontWeight:500}}>{p.unite}</span>
                <button onClick={()=>saveStock(p)} disabled={saving} style={{padding:"9px 18px",background:C.brand,color:"#fff",border:"none",borderRadius:8,fontSize:13,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",gap:6}}>
                  <Icon n="check" sz={14}/>{saving?"...":"OK"}</button>
                <button onClick={()=>setEditId(null)} style={{padding:"9px 10px",background:"transparent",border:`1px solid ${C.border}`,borderRadius:8,fontSize:13,cursor:"pointer"}}>✕</button>
              </div>
            </div>;
            return<div key={p.id} onClick={()=>{setEditId(p.id);setEditVal(String(p.stock??""));}}
              style={{padding:"12px 18px",borderBottom:`1px solid ${C.border}`,display:"flex",alignItems:"center",gap:12,cursor:"pointer",background:st==="rupture"?"#FFF9F9":st==="commander"?"#FFFDF5":"transparent"}}
              onMouseEnter={e=>e.currentTarget.style.background="#F8FAFC"} onMouseLeave={e=>e.currentTarget.style.background=st==="rupture"?"#FFF9F9":st==="commander"?"#FFFDF5":"transparent"}>
              <span style={{width:9,height:9,borderRadius:"50%",background:DOT[st],display:"inline-block",flexShrink:0}}/>
              <div style={{flex:1,minWidth:0}}>
                <p style={{margin:0,fontSize:13,fontWeight:500,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{p.nom}</p>
                <p style={{margin:0,fontSize:11,color:C.textSec}}>{p.fournisseur}</p>
              </div>
              <div style={{textAlign:"right",flexShrink:0}}>
                <p style={{margin:0,fontSize:14,fontWeight:700,color:st==="rupture"?C.danger:st==="commander"?C.warning:st==="ok"?C.success:C.textMuted}}>
                  {p.stock!==null&&p.stock!==undefined?`${p.stock} ${p.unite}`:"—"}</p>
                <p style={{margin:0,fontSize:11,color:C.textMuted}}>min {p.stock_min}</p>
              </div>
              <Icon n="edit" sz={14} c={C.textMuted}/>
            </div>;
          })}
        </div>;
      })}
    </Card>
  </div>;
}

// ── COMMANDES ────────────────────────────────────────────────
function Commandes({products,profile,toast}){
  const [canaux,setCanaux]=useState({}),[ copied,setCopied]=useState(null);
  const opts=["WhatsApp","Email","SMS","Téléphone","PDF"];
  const alert=products.filter(p=>["rupture","commander"].includes(gst(p))&&p.stock_min>0);
  const fourns=[...new Set(alert.map(p=>p.fournisseur))];
  const genMsg=(f,ps)=>{
    const r=ps.filter(p=>gst(p)==="rupture"),c=ps.filter(p=>gst(p)==="commander");
    let m=`Bonjour,\nMerci de me livrer cette commande pour ${profile?.restaurants?.name||"Le restaurant"} :\n\n`;
    if(r.length){m+="RUPTURE - stocks épuisés :\n";r.forEach(p=>m+=`- ${p.nom} : ${gqt(p)} ${p.unite}\n`);m+="\n";}
    if(c.length){m+="À commander :\n";c.forEach(p=>m+=`- ${p.nom} : ${gqt(p)} ${p.unite}\n`);m+="\n";}
    return m+"Merci d'avance,\n"+(profile?.restaurants?.name||"Le restaurant");
  };
  const copy=(f,msg)=>{navigator.clipboard?.writeText(msg);setCopied(f);toast("Message copié !");setTimeout(()=>setCopied(null),2000);};
  if(!fourns.length)return<div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",minHeight:300,gap:12}}>
    <div style={{width:64,height:64,borderRadius:"50%",background:C.successLight,display:"flex",alignItems:"center",justifyContent:"center"}}><Icon n="check" sz={28} c={C.success}/></div>
    <h3 style={{margin:0,fontSize:18,fontWeight:700}}>Tout est en ordre</h3>
    <p style={{margin:0,color:C.textSec,fontSize:14}}>Aucun produit à commander</p>
  </div>;
  return<div>
    <div style={{marginBottom:20}}><h1 style={{margin:0,fontSize:22,fontWeight:800,letterSpacing:"-.5px"}}>Commandes</h1><p style={{margin:"4px 0 0",fontSize:14,color:C.textSec}}>{alert.length} produits · {fourns.length} fournisseurs</p></div>
    {fourns.map(f=>{
      const fp=alert.filter(p=>p.fournisseur===f),col=C.fourn[f]||"#374151",canal=canaux[f]||"WhatsApp";
      const rup=fp.filter(p=>gst(p)==="rupture"),cmd=fp.filter(p=>gst(p)==="commander"),msg=genMsg(f,fp);
      return<Card key={f} style={{marginBottom:16,overflow:"hidden"}}>
        <div style={{background:`linear-gradient(135deg,${col},${col}BB)`,padding:"15px 18px",color:"#fff"}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
            <div><p style={{margin:0,fontSize:16,fontWeight:800}}>{f}</p><p style={{margin:"2px 0 0",fontSize:12,opacity:.8}}>{fp.length} produit{fp.length>1?"s":""} à commander</p></div>
            <div style={{display:"flex",gap:5}}>
              {rup.length>0&&<span style={{background:"rgba(255,255,255,.25)",padding:"3px 9px",borderRadius:20,fontSize:11,fontWeight:700}}>{rup.length} rupture{rup.length>1?"s":""}</span>}
            </div>
          </div>
        </div>
        <div style={{padding:"10px 14px",borderBottom:`1px solid ${C.border}`,display:"flex",gap:5,flexWrap:"wrap"}}>
          {opts.map(c=><button key={c} onClick={()=>setCanaux(p=>({...p,[f]:c}))} style={{padding:"5px 11px",borderRadius:8,border:`1px solid ${canal===c?col:C.border}`,fontSize:11,cursor:"pointer",background:canal===c?col:"transparent",color:canal===c?"#fff":C.textSec,fontWeight:canal===c?700:400}}>{c}</button>)}
        </div>
        {rup.length>0&&<div style={{padding:"11px 14px",background:C.dangerLight,borderBottom:`1px solid ${C.border}`}}>
          <p style={{margin:"0 0 7px",fontSize:10,fontWeight:700,color:C.danger,textTransform:"uppercase",letterSpacing:".5px"}}>🔴 Ruptures</p>
          {rup.map(p=><div key={p.id} style={{display:"flex",justifyContent:"space-between",padding:"4px 0",borderTop:"1px solid rgba(220,38,38,.1)"}}>
            <span style={{fontSize:13}}>{p.nom}</span><span style={{fontSize:13,fontWeight:800,color:C.danger}}>{gqt(p)} {p.unite}</span>
          </div>)}
        </div>}
        {cmd.length>0&&<div style={{padding:"11px 14px",borderBottom:`1px solid ${C.border}`}}>
          <p style={{margin:"0 0 7px",fontSize:10,fontWeight:700,color:C.warning,textTransform:"uppercase",letterSpacing:".5px"}}>À commander</p>
          {cmd.map(p=><div key={p.id} style={{display:"flex",justifyContent:"space-between",padding:"4px 0",borderTop:`1px solid ${C.border}`}}>
            <span style={{fontSize:13}}>{p.nom} <span style={{fontSize:11,color:C.textMuted}}>({p.stock}/{p.stock_min})</span></span>
            <span style={{fontSize:13,fontWeight:700,color:C.warning}}>{gqt(p)} {p.unite}</span>
          </div>)}
        </div>}
        <div style={{padding:"12px 14px"}}>
          <p style={{margin:"0 0 7px",fontSize:10,fontWeight:700,color:C.textSec,textTransform:"uppercase",letterSpacing:".5px"}}>Message {canal}</p>
          <div style={{background:"#F8FAFC",border:`1px solid ${C.border}`,borderRadius:10,padding:"11px 13px",fontFamily:"monospace",fontSize:12,whiteSpace:"pre-wrap",lineHeight:1.6,maxHeight:150,overflow:"auto",marginBottom:10}}>{msg}</div>
          <button onClick={()=>copy(f,msg)} style={{width:"100%",padding:11,background:copied===f?C.success:col,color:"#fff",border:"none",borderRadius:10,fontSize:14,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:8,transition:"background .2s",boxShadow:`0 4px 12px ${col}40`}}>
            <Icon n={copied===f?"check":"copy"} sz={16}/>{copied===f?"Copié !":"Copier pour "+canal}
          </button>
        </div>
      </Card>;
    })}
  </div>;
}

// ── HISTORIQUE ────────────────────────────────────────────────
function Historique({restaurantId}){
  const [hist,setHist]=useState([]),[loading,setLoading]=useState(true);
  useEffect(()=>{const load=async()=>{const{data}=await supabase.from("ca_history").select("*").eq("restaurant_id",restaurantId).order("created_at",{ascending:false}).limit(20);setHist(data||[]);setLoading(false);};if(restaurantId)load();else setLoading(false);},[restaurantId]);
  const totCA=hist.reduce((a,h)=>a+(h.ca_sale||0)+(h.ca_sucre||0),0);
  const totCout=hist.reduce((a,h)=>a+(h.cout_sale||0)+(h.cout_sucre||0),0);
  const avg=totCA>0?totCout/totCA:0;

  // Mini bar chart SVG
  const BarChart=()=>{
    const data=hist.slice(0,8).reverse();if(!data.length)return null;
    const W=320,H=120,PL=28,PB=20,PT=10,PR=8;
    const IW=W-PL-PR,IH=H-PB-PT,maxV=50;
    const bw=IW/data.length,gap=8,bW=(bw-gap)/1;
    const yS=v=>PT+IH-(v/maxV)*IH;
    return<svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{overflow:"visible"}}>
      {[0,25,50].map(v=>{const y=yS(v);return<g key={v}>
        <line x1={PL} y1={y} x2={W-PR} y2={y} stroke={v===25?C.warning:"#E2E8F0"} strokeWidth={v===25?"1":"0.5"} strokeDasharray={v===25?"4,3":""}/>
        <text x={PL-4} y={y+3} textAnchor="end" fontSize="8" fill={C.textMuted}>{v}%</text>
      </g>;})}
      {data.map((h,i)=>{
        const x0=PL+i*bw+gap/2,rs=h.ratio_sale||0,col=rs<=0.25?C.success:rs<=0.35?C.warning:C.danger;
        return<g key={h.id}>
          <rect x={x0} y={yS(rs*100)} width={bW-2} height={Math.max(2,(rs/0.5)*IH)} fill={col} rx="3"/>
          <text x={x0+(bW-2)/2} y={H-6} textAnchor="middle" fontSize="8" fill={C.textMuted}>{(h.periode||"").replace("Fin ","")}</text>
        </g>;
      })}
    </svg>;
  };

  if(loading)return<p style={{color:C.textMuted,padding:40,textAlign:"center"}}>Chargement...</p>;
  if(!hist.length)return<div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",minHeight:300,gap:12,textAlign:"center",padding:20}}>
    <div style={{width:64,height:64,borderRadius:"50%",background:"#F1F5F9",display:"flex",alignItems:"center",justifyContent:"center"}}><Icon n="chart" sz={28} c={C.textMuted}/></div>
    <h3 style={{margin:0,fontSize:18,fontWeight:700}}>Pas encore de données</h3>
    <p style={{margin:0,color:C.textSec,fontSize:14,maxWidth:280}}>L'historique se remplira automatiquement chaque dimanche via Google Sheets.</p>
  </div>;

  return<div>
    <div style={{marginBottom:20}}><h1 style={{margin:0,fontSize:22,fontWeight:800,letterSpacing:"-.5px"}}>Historique</h1><p style={{margin:"4px 0 0",fontSize:14,color:C.textSec}}>{hist.length} période{hist.length>1?"s":""}</p></div>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginBottom:16}}>
      {[["CA total",fmt(totCA),C.brand,"trend"],["Coût total",fmt(totCout),C.warning,"box"],["Ratio moyen",avg>0?(avg*100).toFixed(1)+"%":"—",avg<=0.25?C.success:C.danger,"chart"]].map(([l,v,c,ic])=>(
        <Card key={l} style={{padding:"14px 16px"}}>
          <p style={{margin:"0 0 6px",fontSize:10,fontWeight:700,color:C.textSec,textTransform:"uppercase",letterSpacing:".5px"}}>{l}</p>
          <p style={{margin:0,fontSize:18,fontWeight:800,color:c}}>{v}</p>
        </Card>
      ))}
    </div>
    {hist.length>1&&<Card style={{padding:"16px 18px",marginBottom:16}}>
      <p style={{margin:"0 0 12px",fontSize:13,fontWeight:700}}>Évolution du ratio Salé</p>
      <BarChart/>
    </Card>}
    <Card style={{overflow:"hidden"}}>
      {hist.map((h,i)=>{
        const rs=h.ratio_sale||0,ru=h.ratio_sucre||0,col=rs<=0.25?C.success:rs<=0.35?C.warning:C.danger;
        return<div key={h.id} style={{padding:"14px 18px",borderBottom:i<hist.length-1?`1px solid ${C.border}`:"none"}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              <span style={{fontSize:13,fontWeight:700}}>{h.periode}</span>
              {h.type==="mensuel"&&<span style={{fontSize:10,fontWeight:700,background:C.brandLight,color:C.brand,padding:"2px 8px",borderRadius:10}}>MENSUEL</span>}
            </div>
            <Chip status={rs<=0.25?"ok":rs<=0.35?"commander":"rupture"} small/>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8}}>
            {[["CA salé",fmt(h.ca_sale)],["Ratio salé",(rs*100).toFixed(1)+"%"],["CA sucré",fmt(h.ca_sucre)],["Ratio sucré",(ru*100).toFixed(1)+"%"]].map(([l,v])=>(
              <div key={l}><p style={{margin:0,fontSize:10,color:C.textMuted}}>{l}</p><p style={{margin:0,fontSize:13,fontWeight:700}}>{v}</p></div>
            ))}
          </div>
        </div>;
      })}
    </Card>
  </div>;
}

// ── HACCP ────────────────────────────────────────────────────
const EQUIPEMENTS=[
  {nom:"Frigo 1",min:0,max:4,icon:"❄️"},{nom:"Frigo 2",min:0,max:4,icon:"❄️"},
  {nom:"Congélateur",min:-22,max:-18,icon:"🧊"},{nom:"Zone prépa",min:-5,max:12,icon:"🌡️"},
  {nom:"Vitrine froide",min:0,max:6,icon:"❄️"},
];
const NETTOYAGE_QUOTIDIEN=["Plans de travail","Sol cuisine","Frigos (extérieur)","Plonge & robinetterie","Poubelles","Grille-pains & appareils","Lave-mains"];
const NETTOYAGE_HEBDO=["Hottes et filtres","Intérieur frigos","Congélateur (dégivrage)","Four & équipements cuisson","Derrière les appareils","Vitres & surfaces verticales"];

function HACCP({restaurantId,profileId,toast}){
  const [onglet,setOnglet]=useState("temp"),[logs,setLogs]=useState([]),[loading,setLoading]=useState(true),[adding,setAdding]=useState(null),[inputTemp,setInputTemp]=useState(""),[saving,setSaving]=useState(false),[checks,setChecks]=useState({}),[savingClean,setSavingClean]=useState(false);

  useEffect(()=>{const load=async()=>{const{data}=await supabase.from("temperature_logs").select("*").eq("restaurant_id",restaurantId).order("created_at",{ascending:false}).limit(50);setLogs(data||[]);setLoading(false);};if(restaurantId)load();},[restaurantId]);

  const getLastTemp=(equip)=>logs.find(l=>l.equipement===equip);
  const isTempOk=(equip,temp)=>{const e=EQUIPEMENTS.find(x=>x.nom===equip);if(!e)return true;return temp>=e.min&&temp<=e.max;};

  const saveTemp=async()=>{
    const v=parseFloat(inputTemp);if(isNaN(v)){toast("Température invalide","error");return;}
    setSaving(true);
    const e=EQUIPEMENTS.find(x=>x.nom===adding);
    const{error}=await supabase.from("temperature_logs").insert({restaurant_id:restaurantId,saisi_par:profileId,equipement:adding,temperature:v,temperature_min:e?.min,temperature_max:e?.max});
    if(!error){const{data}=await supabase.from("temperature_logs").select("*").eq("restaurant_id",restaurantId).order("created_at",{ascending:false}).limit(50);setLogs(data||[]);toast("Température enregistrée");setAdding(null);setInputTemp("");}
    else toast("Erreur","error");setSaving(false);
  };

  const toggleCheck=(task)=>setChecks(p=>({...p,[task]:!p[task]}));
  const saveChecklist=async()=>{
    setSavingClean(true);
    const tasks=Object.entries(checks).filter(([,v])=>v).map(([k])=>k);
    for(const t of tasks){await supabase.from("cleaning_logs").insert({restaurant_id:restaurantId,saisi_par:profileId,tache:t,fait:true});}
    toast(tasks.length+" tâche"+(tasks.length>1?"s":"")+" enregistrée"+(tasks.length>1?"s":""));
    setChecks({});setSavingClean(false);
  };

  return<div>
    <div style={{marginBottom:20}}><h1 style={{margin:0,fontSize:22,fontWeight:800,letterSpacing:"-.5px"}}>HACCP</h1><p style={{margin:"4px 0 0",fontSize:14,color:C.textSec}}>Traçabilité hygiène · {new Date().toLocaleDateString("fr-FR",{weekday:"long",day:"numeric",month:"long"})}</p></div>
    <div style={{display:"flex",gap:4,background:"#F1F5F9",padding:4,borderRadius:10,marginBottom:16}}>
      {[["temp","🌡️ Températures"],["clean","🧹 Nettoyage"]].map(([k,l])=><button key={k} onClick={()=>setOnglet(k)} style={{flex:1,padding:"8px 12px",borderRadius:8,border:"none",fontSize:13,fontWeight:600,cursor:"pointer",background:onglet===k?C.surface:"transparent",color:onglet===k?C.text:C.textSec,boxShadow:onglet===k?"0 1px 4px rgba(0,0,0,.1)":"none"}}>{l}</button>)}
    </div>

    {onglet==="temp"&&<div>
      {adding&&<div style={{position:"fixed",inset:0,background:"rgba(15,23,42,.5)",zIndex:100,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
        <div style={{background:C.surface,borderRadius:16,padding:28,maxWidth:360,width:"100%",boxShadow:"0 20px 50px rgba(0,0,0,.3)"}}>
          <h3 style={{margin:"0 0 4px",fontSize:16,fontWeight:800}}>{adding}</h3>
          <p style={{margin:"0 0 16px",fontSize:13,color:C.textSec}}>{EQUIPEMENTS.find(e=>e.nom===adding)?.icon} Saisir la température relevée</p>
          <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:16}}>
            <input type="number" value={inputTemp} onChange={e=>setInputTemp(e.target.value)} placeholder="Ex: 3" autoFocus step="0.1"
              style={{flex:1,padding:"12px 14px",borderRadius:10,border:`1.5px solid ${C.brand}`,fontSize:22,fontWeight:800,outline:"none",textAlign:"center"}}/>
            <span style={{fontSize:20,fontWeight:700}}>°C</span>
          </div>
          {inputTemp&&!isNaN(parseFloat(inputTemp))&&<div style={{padding:"10px 14px",borderRadius:10,background:isTempOk(adding,parseFloat(inputTemp))?C.successLight:C.dangerLight,marginBottom:16}}>
            <p style={{margin:0,fontSize:13,fontWeight:700,color:isTempOk(adding,parseFloat(inputTemp))?C.success:C.danger}}>
              {isTempOk(adding,parseFloat(inputTemp))?"✅ Température dans la norme":"⚠️ HORS NORME — vérifier l'équipement !"}
            </p>
          </div>}
          <div style={{display:"flex",gap:8}}>
            <button onClick={saveTemp} disabled={saving||!inputTemp} style={{flex:1,padding:"12px",background:C.brand,color:"#fff",border:"none",borderRadius:10,fontSize:14,fontWeight:700,cursor:"pointer"}}>{saving?"...":"Enregistrer"}</button>
            <button onClick={()=>{setAdding(null);setInputTemp("");}} style={{padding:"12px 16px",background:"transparent",border:`1px solid ${C.border}`,borderRadius:10,cursor:"pointer"}}>Annuler</button>
          </div>
        </div>
      </div>}
      <div style={{display:"flex",flexDirection:"column",gap:10}}>
        {EQUIPEMENTS.map(e=>{
          const last=getLastTemp(e.nom);const ok=last?isTempOk(e.nom,last.temperature):null;
          return<Card key={e.nom} style={{padding:"16px 18px",display:"flex",alignItems:"center",gap:14}}>
            <div style={{width:48,height:48,borderRadius:14,background:ok===null?"#F1F5F9":ok?C.successLight:C.dangerLight,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
              <span style={{fontSize:22}}>{e.icon}</span>
            </div>
            <div style={{flex:1}}>
              <p style={{margin:"0 0 2px",fontSize:14,fontWeight:700}}>{e.nom}</p>
              <p style={{margin:0,fontSize:11,color:C.textSec}}>Norme : {e.min}°C à {e.max}°C</p>
              {last&&<p style={{margin:"2px 0 0",fontSize:11,color:C.textMuted}}>{fmtDate(last.created_at)}</p>}
            </div>
            <div style={{textAlign:"right",flexShrink:0}}>
              {last?<>
                <p style={{margin:"0 0 4px",fontSize:22,fontWeight:800,color:ok?C.success:C.danger}}>{last.temperature}°C</p>
                <span style={{fontSize:10,fontWeight:700,color:ok?C.success:C.danger,background:ok?C.successLight:C.dangerLight,padding:"2px 8px",borderRadius:10}}>{ok?"OK":"HORS NORME"}</span>
              </>:<p style={{margin:0,fontSize:12,color:C.textMuted}}>Non relevé</p>}
            </div>
            <button onClick={()=>setAdding(e.nom)} style={{padding:"9px 14px",background:C.brandLight,color:C.brand,border:`1px solid ${C.border}`,borderRadius:10,fontSize:12,fontWeight:700,cursor:"pointer",flexShrink:0}}>+ Relever</button>
          </Card>;
        })}
      </div>
      {logs.length>0&&<div style={{marginTop:16}}>
        <p style={{margin:"0 0 10px",fontSize:13,fontWeight:700,color:C.textSec}}>Derniers relevés</p>
        <Card style={{overflow:"hidden"}}>
          {logs.slice(0,8).map((l,i)=><div key={l.id} style={{padding:"10px 16px",borderBottom:i<7?`1px solid ${C.border}`:"none",display:"flex",alignItems:"center",gap:10}}>
            <span style={{fontSize:12,fontWeight:800,color:isTempOk(l.equipement,l.temperature)?C.success:C.danger,minWidth:48,textAlign:"right"}}>{l.temperature}°C</span>
            <div style={{flex:1}}><p style={{margin:0,fontSize:12,fontWeight:500}}>{l.equipement}</p><p style={{margin:0,fontSize:10,color:C.textMuted}}>{fmtDate(l.created_at)}</p></div>
            <span style={{fontSize:11,fontWeight:700,color:isTempOk(l.equipement,l.temperature)?C.success:C.danger}}>{isTempOk(l.equipement,l.temperature)?"✓":"⚠"}</span>
          </div>)}
        </Card>
      </div>}
    </div>}

    {onglet==="clean"&&<div>
      {[["Tâches quotidiennes",NETTOYAGE_QUOTIDIEN],["Tâches hebdomadaires",NETTOYAGE_HEBDO]].map(([title,tasks])=>(
        <Card key={title} style={{marginBottom:14,overflow:"hidden"}}>
          <div style={{padding:"12px 18px",borderBottom:`1px solid ${C.border}`,background:"#F8FAFC"}}>
            <p style={{margin:0,fontSize:13,fontWeight:700}}>{title}</p>
          </div>
          {tasks.map(t=><div key={t} onClick={()=>toggleCheck(t)} style={{padding:"12px 18px",borderBottom:`1px solid ${C.border}`,display:"flex",alignItems:"center",gap:12,cursor:"pointer",background:checks[t]?C.successLight:"transparent"}}>
            <div style={{width:22,height:22,borderRadius:6,border:`2px solid ${checks[t]?C.success:C.border}`,background:checks[t]?C.success:"transparent",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
              {checks[t]&&<Icon n="check" sz={12} c="#fff"/>}
            </div>
            <span style={{fontSize:13,fontWeight:checks[t]?600:400,color:checks[t]?C.success:C.text,textDecoration:checks[t]?"line-through":"none"}}>{t}</span>
          </div>)}
        </Card>
      ))}
      {Object.values(checks).some(Boolean)&&<button onClick={saveChecklist} disabled={savingClean} style={{width:"100%",padding:13,background:C.success,color:"#fff",border:"none",borderRadius:12,fontSize:15,fontWeight:700,cursor:"pointer",boxShadow:`0 4px 12px ${C.success}40`}}>
        {savingClean?"Enregistrement...":"✅ Enregistrer les tâches effectuées"}
      </button>}
    </div>}
  </div>;
}

// ── FICHES TECHNIQUES ─────────────────────────────────────────
function Recettes({restaurantId,products,toast}){
  const [recettes,setRecettes]=useState([]),[loading,setLoading]=useState(true),[sel,setSel]=useState(null),[adding,setAdding]=useState(false),[newNom,setNewNom]=useState(""),[newPrix,setNewPrix]=useState(""),[items,setItems]=useState([]),[saving,setSaving]=useState(false),[addItem,setAddItem]=useState({prodId:"",qte:"",unite:""});

  useEffect(()=>{const load=async()=>{const{data}=await supabase.from("recipes").select("*,recipe_items(*,products(nom,unite,prix_achat))").eq("restaurant_id",restaurantId).order("created_at",{ascending:false});setRecettes(data||[]);setLoading(false);};if(restaurantId)load();},[restaurantId]);

  const calcCout=(recipe)=>(recipe.recipe_items||[]).reduce((a,it)=>a+(it.quantite||0)*(it.products?.prix_achat||0),0);

  const saveRecette=async()=>{
    if(!newNom.trim())return;setSaving(true);
    const{data,error}=await supabase.from("recipes").insert({restaurant_id:restaurantId,nom:newNom.trim(),prix_vente:parseFloat(newPrix)||0}).select().single();
    if(!error&&data){
      if(items.length>0){for(const it of items){await supabase.from("recipe_items").insert({recipe_id:data.id,product_id:it.prodId||null,product_nom:it.nom,quantite:it.qte,unite:it.unite});}}
      const{data:rec}=await supabase.from("recipes").select("*,recipe_items(*,products(nom,unite,prix_achat))").eq("restaurant_id",restaurantId).order("created_at",{ascending:false});
      setRecettes(rec||[]);toast("Fiche créée !");setAdding(false);setNewNom("");setNewPrix("");setItems([]);
    }else toast("Erreur","error");setSaving(false);
  };

  const addIngredient=()=>{
    if(!addItem.prodId&&!addItem.nom)return;
    const prod=products.find(p=>p.id===addItem.prodId);
    setItems(prev=>[...prev,{prodId:addItem.prodId||null,nom:prod?.nom||addItem.nom,qte:parseFloat(addItem.qte)||1,unite:prod?.unite||addItem.unite,pa:prod?.prix_achat||0}]);
    setAddItem({prodId:"",qte:"",unite:""});
  };

  const deleteRecette=async(id)=>{await supabase.from("recipes").delete().eq("id",id);setRecettes(p=>p.filter(r=>r.id!==id));setSel(null);toast("Fiche supprimée");};

  if(sel){
    const r=recettes.find(x=>x.id===sel);if(!r)return null;
    const cout=calcCout(r),marge=r.prix_vente>0?((r.prix_vente-cout)/r.prix_vente*100):0,ratio=r.prix_vente>0?cout/r.prix_vente:0;
    return<div>
      <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:20}}>
        <button onClick={()=>setSel(null)} style={{padding:"8px 14px",borderRadius:8,border:`1px solid ${C.border}`,background:"transparent",cursor:"pointer",fontSize:13}}>← Retour</button>
        <div style={{flex:1}}><h1 style={{margin:0,fontSize:20,fontWeight:800}}>{r.nom}</h1></div>
        <button onClick={()=>deleteRecette(r.id)} style={{padding:"8px",borderRadius:8,border:`1px solid ${C.dangerLight}`,background:C.dangerLight,cursor:"pointer",display:"flex"}}><Icon n="trash" sz={16} c={C.danger}/></button>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,marginBottom:16}}>
        {[["Coût matière",fmt(cout),C.warning],["Prix vente",fmt(r.prix_vente),C.text],["Ratio",ratio>0?(ratio*100).toFixed(1)+"%":"—",ratio<=0.25?C.success:C.danger]].map(([l,v,c])=>(
          <Card key={l} style={{padding:"14px"}}><p style={{margin:"0 0 4px",fontSize:10,fontWeight:700,color:C.textSec,textTransform:"uppercase",letterSpacing:".5px"}}>{l}</p><p style={{margin:0,fontSize:18,fontWeight:800,color:c}}>{v}</p></Card>
        ))}
      </div>
      <Card style={{overflow:"hidden"}}>
        <div style={{padding:"12px 18px",borderBottom:`1px solid ${C.border}`,background:"#F8FAFC"}}><p style={{margin:0,fontSize:13,fontWeight:700}}>Ingrédients</p></div>
        {(r.recipe_items||[]).map((it,i)=><div key={it.id} style={{padding:"11px 18px",borderBottom:i<r.recipe_items.length-1?`1px solid ${C.border}`:"none",display:"flex",alignItems:"center",gap:10}}>
          <div style={{flex:1}}><p style={{margin:0,fontSize:13,fontWeight:500}}>{it.product_nom||it.products?.nom}</p><p style={{margin:0,fontSize:11,color:C.textSec}}>{it.quantite} {it.unite||it.products?.unite}</p></div>
          <span style={{fontSize:13,fontWeight:700,color:C.warning}}>{fmt((it.quantite||0)*(it.products?.prix_achat||0))}</span>
        </div>)}
        {r.recipe_items?.length===0&&<p style={{padding:20,textAlign:"center",color:C.textMuted,fontSize:13}}>Aucun ingrédient</p>}
      </Card>
    </div>;
  }

  if(adding)return<div>
    <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:20}}>
      <button onClick={()=>{setAdding(false);setNewNom("");setNewPrix("");setItems([]);}} style={{padding:"8px 14px",borderRadius:8,border:`1px solid ${C.border}`,background:"transparent",cursor:"pointer",fontSize:13}}>← Annuler</button>
      <h1 style={{margin:0,fontSize:20,fontWeight:800}}>Nouvelle fiche</h1>
    </div>
    <Card style={{padding:20,marginBottom:14}}>
      <div style={{display:"flex",gap:10,marginBottom:14}}>
        <div style={{flex:2}}><label style={{fontSize:11,fontWeight:700,color:C.textSec,display:"block",marginBottom:5,textTransform:"uppercase",letterSpacing:".5px"}}>Nom de la recette</label>
          <input value={newNom} onChange={e=>setNewNom(e.target.value)} placeholder="Ex: Chichi classique" style={{width:"100%",boxSizing:"border-box",padding:"10px 12px",borderRadius:8,border:`1.5px solid ${C.border}`,fontSize:14,outline:"none"}} onFocus={e=>e.target.style.borderColor=C.brand} onBlur={e=>e.target.style.borderColor=C.border}/></div>
        <div style={{flex:1}}><label style={{fontSize:11,fontWeight:700,color:C.textSec,display:"block",marginBottom:5,textTransform:"uppercase",letterSpacing:".5px"}}>Prix vente (€)</label>
          <input type="number" value={newPrix} onChange={e=>setNewPrix(e.target.value)} placeholder="0.00" style={{width:"100%",boxSizing:"border-box",padding:"10px 12px",borderRadius:8,border:`1.5px solid ${C.border}`,fontSize:14,outline:"none"}} onFocus={e=>e.target.style.borderColor=C.brand} onBlur={e=>e.target.style.borderColor=C.border}/></div>
      </div>
      <p style={{margin:"0 0 10px",fontSize:12,fontWeight:700,color:C.textSec,textTransform:"uppercase",letterSpacing:".5px"}}>Ingrédients</p>
      {items.map((it,i)=><div key={i} style={{display:"flex",justifyContent:"space-between",padding:"7px 10px",background:"#F8FAFC",borderRadius:8,marginBottom:5}}>
        <span style={{fontSize:13}}>{it.nom} — {it.qte} {it.unite}</span>
        <span style={{fontSize:13,color:C.warning,fontWeight:700}}>{fmt(it.qte*it.pa)}</span>
      </div>)}
      <div style={{display:"flex",gap:8,marginTop:10,flexWrap:"wrap"}}>
        <select value={addItem.prodId} onChange={e=>setAddItem(p=>({...p,prodId:e.target.value}))}
          style={{flex:2,minWidth:140,padding:"8px 10px",borderRadius:8,border:`1px solid ${C.border}`,fontSize:13,outline:"none"}}>
          <option value="">Choisir produit...</option>
          {products.filter(p=>p.actif&&p.prix_achat>0).map(p=><option key={p.id} value={p.id}>{p.nom} ({fmt(p.prix_achat)}/{p.unite})</option>)}
        </select>
        <input type="number" value={addItem.qte} onChange={e=>setAddItem(p=>({...p,qte:e.target.value}))} placeholder="Qté" style={{width:70,padding:"8px 10px",borderRadius:8,border:`1px solid ${C.border}`,fontSize:13,outline:"none"}}/>
        <button onClick={addIngredient} style={{padding:"8px 14px",background:C.brandLight,color:C.brand,border:`1px solid ${C.border}`,borderRadius:8,fontSize:12,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",gap:4}}><Icon n="plus" sz={14}/>Ajouter</button>
      </div>
      {items.length>0&&<div style={{marginTop:12,padding:"10px 12px",background:C.successLight,borderRadius:10}}>
        <p style={{margin:0,fontSize:13,fontWeight:700,color:C.success}}>Coût estimé : {fmt(items.reduce((a,it)=>a+it.qte*it.pa,0))} · Ratio : {newPrix>0?((items.reduce((a,it)=>a+it.qte*it.pa,0)/parseFloat(newPrix))*100).toFixed(1)+"%":"—"}</p>
      </div>}
    </Card>
    <button onClick={saveRecette} disabled={saving||!newNom} style={{width:"100%",padding:13,background:newNom?C.brand:"#E2E8F0",color:newNom?"#fff":C.textMuted,border:"none",borderRadius:12,fontSize:15,fontWeight:700,cursor:newNom?"pointer":"not-allowed"}}>
      {saving?"Enregistrement...":"Créer la fiche technique"}</button>
  </div>;

  return<div>
    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:20}}>
      <div><h1 style={{margin:0,fontSize:22,fontWeight:800,letterSpacing:"-.5px"}}>Fiches techniques</h1><p style={{margin:"4px 0 0",fontSize:14,color:C.textSec}}>{recettes.length} recette{recettes.length>1?"s":""}</p></div>
      <button onClick={()=>setAdding(true)} style={{padding:"9px 16px",background:C.brand,color:"#fff",border:"none",borderRadius:10,fontSize:13,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",gap:6,boxShadow:"0 4px 12px rgba(37,99,235,.3)"}}>
        <Icon n="plus" sz={16}/>Nouvelle fiche</button>
    </div>
    {loading?<p style={{textAlign:"center",color:C.textMuted,padding:40}}>Chargement...</p>:recettes.length===0?
    <Card style={{padding:40,textAlign:"center"}}>
      <Icon n="book" sz={40} c={C.textMuted}/>
      <h3 style={{margin:"12px 0 6px",fontSize:16,fontWeight:700}}>Aucune fiche technique</h3>
      <p style={{margin:0,color:C.textSec,fontSize:13}}>Créez vos premières recettes pour calculer vos coûts matière.</p>
    </Card>:
    <div style={{display:"flex",flexDirection:"column",gap:10}}>
      {recettes.map(r=>{const cout=calcCout(r),ratio=r.prix_vente>0?cout/r.prix_vente:0;return<Card key={r.id} onClick={()=>setSel(r.id)} style={{padding:"16px 18px",display:"flex",alignItems:"center",gap:14}}>
        <div style={{width:44,height:44,borderRadius:12,background:C.purpleLight,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}><Icon n="book" sz={20} c={C.purple}/></div>
        <div style={{flex:1}}><p style={{margin:"0 0 2px",fontSize:14,fontWeight:700}}>{r.nom}</p><p style={{margin:0,fontSize:12,color:C.textSec}}>{(r.recipe_items||[]).length} ingrédient{(r.recipe_items||[]).length>1?"s":""} · coût {fmt(cout)}</p></div>
        <div style={{textAlign:"right"}}>
          <p style={{margin:0,fontSize:15,fontWeight:800,color:ratio<=0.25?C.success:ratio<=0.35?C.warning:C.danger}}>{ratio>0?(ratio*100).toFixed(1)+"%":"—"}</p>
          {r.prix_vente>0&&<p style={{margin:0,fontSize:11,color:C.textMuted}}>PV {fmt(r.prix_vente)}</p>}
        </div>
      </Card>;})}
    </div>}
  </div>;
}

// ── RÉGLAGES ─────────────────────────────────────────────────
function Reglages({profile,toast}){
  const [ca_s,setCaS]=useState(""),[ ca_su,setCaSu]=useState(""),[ saving,setSaving]=useState(false);
  const rest=profile?.restaurants;
  const saveCa=async()=>{
    setSaving(true);
    const cout_s=products_cost_estimate(rest?.id);
    const{error}=await supabase.from("restaurants").update({ca_sale:parseFloat(ca_s)||0,ca_sucre:parseFloat(ca_su)||0}).eq("id",rest?.id);
    if(!error)toast("CA mis à jour — rechargez le tableau de bord");else toast("Erreur","error");
    setSaving(false);
  };
  const products_cost_estimate=()=>0;
  const inp={width:"100%",boxSizing:"border-box",padding:"11px 14px",borderRadius:10,border:`1.5px solid ${C.border}`,fontSize:15,fontWeight:700,outline:"none"};
  return<div>
    <div style={{marginBottom:24}}><h1 style={{margin:0,fontSize:22,fontWeight:800,letterSpacing:"-.5px"}}>Réglages</h1><p style={{margin:"4px 0 0",fontSize:14,color:C.textSec}}>{rest?.name}</p></div>
    <Card style={{padding:24,marginBottom:14}}>
      <h3 style={{margin:"0 0 6px",fontSize:15,fontWeight:800}}>CA de la semaine en cours</h3>
      <p style={{margin:"0 0 16px",fontSize:13,color:C.textSec}}>Le ratio coût/CA est calculé à partir de ces valeurs.</p>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:16}}>
        {[["CA HT Salé (€)",ca_s,setCaS],["CA HT Sucré (€)",ca_su,setCaSu]].map(([l,v,set])=><div key={l}>
          <label style={{fontSize:11,fontWeight:700,color:C.textSec,display:"block",marginBottom:5,textTransform:"uppercase",letterSpacing:".5px"}}>{l}</label>
          <input type="number" value={v} onChange={e=>set(e.target.value)} placeholder="0" style={inp} onFocus={e=>e.target.style.borderColor=C.brand} onBlur={e=>e.target.style.borderColor=C.border}/>
        </div>)}
      </div>
      <button onClick={saveCa} disabled={saving} style={{padding:"11px 24px",background:C.brand,color:"#fff",border:"none",borderRadius:10,fontSize:14,fontWeight:700,cursor:"pointer"}}>
        {saving?"Enregistrement...":"Enregistrer le CA"}</button>
    </Card>
    <Card style={{padding:20}}>
      <h3 style={{margin:"0 0 12px",fontSize:15,fontWeight:800}}>Informations du compte</h3>
      <div style={{display:"flex",flexDirection:"column",gap:8}}>
        {[["Restaurant",rest?.name],["Plan",rest?.plan],["Email",profile?.email],["Rôle",profile?.role],["Domaine","pillot-restaurant.fr"]].map(([l,v])=><div key={l} style={{display:"flex",justifyContent:"space-between",padding:"9px 12px",background:"#F8FAFC",borderRadius:8}}>
          <span style={{fontSize:13,color:C.textSec,fontWeight:500}}>{l}</span><span style={{fontSize:13,fontWeight:700}}>{v||"—"}</span>
        </div>)}
      </div>
    </Card>
  </div>;
}

// ── ADMIN ─────────────────────────────────────────────────────
function Admin({adminProfile,toast}){
  const [clients,setClients]=useState([]),[loading,setLoading]=useState(true),[askId,setAskId]=useState(null),[raison,setRaison]=useState(""),[sent,setSent]=useState(new Set());
  useEffect(()=>{const load=async()=>{const{data}=await supabase.from("restaurants").select("*");setClients(data||[]);setLoading(false);};load();},[]);
  const send=async()=>{
    const{error}=await supabase.from("access_requests").insert({admin_id:adminProfile?.id,restaurant_id:askId,raison,message:"Intervention : "+raison,statut:"en_attente"});
    if(!error){setSent(p=>new Set([...p,askId]));setAskId(null);toast("Demande envoyée au propriétaire");}else toast("Erreur","error");
  };
  return<div>
    {askId&&<div style={{position:"fixed",inset:0,background:"rgba(15,23,42,.5)",zIndex:100,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
      <div style={{background:C.surface,borderRadius:16,padding:28,maxWidth:420,width:"100%",boxShadow:"0 20px 50px rgba(0,0,0,.3)"}}>
        <h3 style={{margin:"0 0 4px",fontSize:16,fontWeight:800}}>Demande d'accès supervisée</h3>
        <p style={{margin:"0 0 18px",fontSize:13,color:C.textSec}}>{clients.find(c=>c.id===askId)?.name}</p>
        <p style={{margin:"0 0 10px",fontSize:11,fontWeight:700,color:C.textSec,textTransform:"uppercase",letterSpacing:".5px"}}>Raison</p>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:16}}>
          {["Problème de ratio","Formation équipe","Ajout produits","Config fournisseur","Contrôle sanitaire","Autre"].map(r=>(
            <button key={r} onClick={()=>setRaison(r)} style={{padding:"8px",border:`1.5px solid ${raison===r?C.brand:C.border}`,borderRadius:8,fontSize:12,cursor:"pointer",background:raison===r?C.brandLight:"transparent",color:raison===r?C.brand:C.text,fontWeight:raison===r?700:400}}>{r}</button>
          ))}
        </div>
        <div style={{display:"flex",gap:8}}>
          <button onClick={send} disabled={!raison} style={{flex:1,padding:"12px",background:raison?C.brand:"#E2E8F0",color:raison?"#fff":C.textMuted,border:"none",borderRadius:10,fontSize:14,fontWeight:700,cursor:raison?"pointer":"not-allowed"}}>Envoyer</button>
          <button onClick={()=>setAskId(null)} style={{padding:"12px 16px",background:"transparent",border:`1px solid ${C.border}`,borderRadius:10,cursor:"pointer"}}>Annuler</button>
        </div>
      </div>
    </div>}
    <div style={{marginBottom:20}}><h1 style={{margin:0,fontSize:22,fontWeight:800,letterSpacing:"-.5px"}}>Multi-clients</h1><p style={{margin:"4px 0 0",fontSize:14,color:C.textSec}}>{clients.length} restaurant{clients.length>1?"s":""}</p></div>
    {loading?<p style={{color:C.textMuted,padding:40,textAlign:"center"}}>Chargement...</p>:clients.map(c=>{
      const rs=c.ratio_sale||0,obj=c.objectif||0.25,col=rs<=obj?C.success:rs<=obj*1.4?C.warning:C.danger;
      return<Card key={c.id} style={{marginBottom:12,overflow:"hidden"}}>
        <div style={{padding:"14px 18px",borderBottom:`1px solid ${C.border}`,display:"flex",alignItems:"center",gap:12}}>
          <span style={{width:10,height:10,borderRadius:"50%",background:col,display:"inline-block",flexShrink:0}}/>
          <div style={{flex:1}}><p style={{margin:0,fontSize:15,fontWeight:700}}>{c.name}</p><p style={{margin:0,fontSize:12,color:C.textSec}}>{c.ville}</p></div>
          <span style={{fontSize:11,fontWeight:700,color:C.purple,background:C.purpleLight,padding:"3px 10px",borderRadius:20}}>{c.plan}</span>
        </div>
        <div style={{padding:"12px 18px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <div style={{display:"flex",gap:16}}>
            {[["Salé",rs,col],["Sucré",c.ratio_sucre||0,"#7C3AED"],["Objectif",obj,C.textMuted]].map(([l,v,c])=>(
              <div key={l}><p style={{margin:0,fontSize:10,color:C.textMuted}}>{l}</p><p style={{margin:0,fontSize:16,fontWeight:800,color:c}}>{(v*100).toFixed(1)}%</p></div>
            ))}
          </div>
          {sent.has(c.id)?<span style={{fontSize:12,color:C.success,fontWeight:600}}>Demande envoyée ✓</span>:
          <button onClick={()=>{setAskId(c.id);setRaison("");}} style={{padding:"8px 14px",background:C.brandLight,color:C.brand,border:`1px solid ${C.border}`,borderRadius:8,fontSize:12,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",gap:6}}>
            <Icon n="key" sz={14}/>Accès</button>}
        </div>
      </Card>;
    })}
  </div>;
}

// ── SIDEBAR ──────────────────────────────────────────────────
function Sidebar({tab,onTab,profile,onLogout}){
  const isAdmin=profile?.role==="admin";
  const tabs=isAdmin
    ?[["dashboard","Tableau de bord","home"],["users","Clients","users"],["settings","Réglages","settings"]]
    :[["dashboard","Tableau de bord","home"],["stocks","Inventaire","box"],["commandes","Commandes","cart"],["historique","Historique","chart"],["haccp","HACCP","thermometer"],["recettes","Fiches techniques","book"],["settings","Réglages","settings"],["planning","Planning","calendar"],["taches","Tâches","clipboard"],["glaces",    "Pillot Glaces",  "ice-cream"],
    ["scan",      "Scan facture",   "camera"],
    ["appareils", "Équipements",    "device-desktop"],];
  return<div style={{width:230,background:C.navy,display:"flex",flexDirection:"column",minHeight:"100vh",flexShrink:0,position:"sticky",top:0,maxHeight:"100vh",overflowY:"auto"}}>
    <div style={{padding:"22px 18px 14px"}}>
      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:14}}>
        <div style={{width:38,height:38,background:"linear-gradient(135deg,#2563EB,#1D4ED8)",borderRadius:10,display:"flex",alignItems:"center",justifyContent:"center"}}>
          <span style={{color:"#fff",fontSize:18,fontWeight:800}}>P</span>
        </div>
        <div><p style={{margin:0,fontSize:16,fontWeight:800,color:"#fff"}}>Pillot</p><p style={{margin:0,fontSize:10,color:"#475569"}}>pillot-restaurant.fr</p></div>
      </div>
      <div style={{padding:"8px 10px",background:"rgba(255,255,255,.06)",borderRadius:8}}>
        <p style={{margin:0,fontSize:12,fontWeight:700,color:"#94A3B8",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{profile?.restaurants?.name||profile?.email}</p>
        <p style={{margin:0,fontSize:11,color:"#475569",textTransform:"capitalize"}}>{profile?.role}</p>
      </div>
    </div>
    <nav style={{flex:1,padding:"4px 10px"}}>
      {tabs.map(([id,label,icon])=>{const active=tab===id;return<button key={id} onClick={()=>onTab(id)} style={{width:"100%",padding:"9px 12px",borderRadius:9,border:"none",cursor:"pointer",display:"flex",alignItems:"center",gap:10,marginBottom:1,background:active?"rgba(37,99,235,.3)":"transparent",color:active?"#fff":"#94A3B8",fontSize:13,fontWeight:active?700:400,textAlign:"left"}}
        onMouseEnter={e=>{if(!active){e.currentTarget.style.background="rgba(255,255,255,.06)";e.currentTarget.style.color="#fff";}}} onMouseLeave={e=>{if(!active){e.currentTarget.style.background="transparent";e.currentTarget.style.color="#94A3B8";}}}>
        <Icon n={icon} sz={15} c={active?"#60A5FA":"currentColor"}/>{label}
        {active&&<span style={{marginLeft:"auto",width:5,height:5,borderRadius:"50%",background:"#60A5FA",display:"inline-block"}}/>}
      </button>;})}
    </nav>
    <div style={{padding:"10px 18px 22px"}}>
      <button onClick={onLogout} style={{width:"100%",padding:"9px 12px",borderRadius:9,border:"none",cursor:"pointer",display:"flex",alignItems:"center",gap:10,background:"transparent",color:"#64748B",fontSize:13}}
        onMouseEnter={e=>{e.currentTarget.style.background="rgba(239,68,68,.15)";e.currentTarget.style.color="#F87171";}} onMouseLeave={e=>{e.currentTarget.style.background="transparent";e.currentTarget.style.color="#64748B";}}>
        <Icon n="logout" sz={15}/>Déconnexion
      </button>
    </div>
  </div>;
}

// ── BOTTOM NAV ────────────────────────────────────────────────
function BottomNav({tab,onTab,isAdmin}){
  const tabs=isAdmin
    ?[["dashboard","Accueil","home"],["users","Clients","users"],["settings","Réglages","settings"]]
    :[["dashboard","Accueil","home"],["stocks","Stocks","box"],["commandes","Commandes","cart"],["haccp","HACCP","thermometer"],["settings","Réglages","settings"]];
  return<div style={{position:"fixed",bottom:0,left:0,right:0,background:C.surface,borderTop:`1px solid ${C.border}`,display:"flex",zIndex:50,paddingBottom:"env(safe-area-inset-bottom)"}}>
    {tabs.map(([id,l,ic])=><button key={id} onClick={()=>onTab(id)} style={{flex:1,padding:"9px 4px 7px",border:"none",background:"transparent",cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:2}}>
      <Icon n={ic} sz={20} c={tab===id?C.brand:C.textMuted}/>
      <span style={{fontSize:10,fontWeight:tab===id?700:500,color:tab===id?C.brand:C.textMuted}}>{l}</span>
    </button>)}
  </div>;
}

// ── APP ──────────────────────────────────────────────────────
export default function App(){
  const [session,setSession]=useState(null),[profile,setProfile]=useState(null),[products,setProducts]=useState([]),[tab,setTab]=useState("dashboard"),[loading,setLoading]=useState(true),[toast,setToast]=useState(null),[isMobile,setIsMobile]=useState(window.innerWidth<768);

  useEffect(()=>{const h=()=>setIsMobile(window.innerWidth<768);window.addEventListener("resize",h);return()=>window.removeEventListener("resize",h);},[]);
  const showToast=useCallback((msg,type="success")=>setToast({msg,type}),[]);

  useEffect(()=>{
    supabase.auth.getSession().then(({data:{session}})=>{setSession(session);if(session)loadProfile(session.user.id);else setLoading(false);});
    const{data:{subscription}}=supabase.auth.onAuthStateChange((_,s)=>{setSession(s);if(s)loadProfile(s.user.id);else{setProfile(null);setProducts([]);setLoading(false);}});
    return()=>subscription.unsubscribe();
  },[]);

  const loadProfile=async(uid)=>{
    const{data}=await supabase.from("profiles").select("*,restaurants(*)").eq("id",uid).single();
    setProfile(data);if(data?.restaurant_id)await loadProducts(data.restaurant_id);setLoading(false);
  };

  const loadProducts=async(restId)=>{
    const{data:prods}=await supabase.from("products").select("*").eq("restaurant_id",restId).eq("actif",true).order("categorie");
    const{data:stocks}=await supabase.from("latest_stock").select("*");
    const sm={};(stocks||[]).forEach(s=>sm[s.product_id]=s.stock_reel);
    setProducts((prods||[]).map(p=>({...p,stock:sm[p.id]!==undefined?sm[p.id]:null})));
  };

  const onStockUpdate=(id,v)=>setProducts(p=>p.map(x=>x.id===id?{...x,stock:v}:x));
  const logout=()=>supabase.auth.signOut();
  const isAdmin=profile?.role==="admin";

  const renderScreen=()=>{
    if(tab==="stocks")return<Inventaire products={products} restaurantId={profile?.restaurant_id} onStockUpdate={onStockUpdate} toast={showToast}/>;
    if(tab==="commandes")return<Commandes products={products} profile={profile} toast={showToast}/>;
    if(tab==="historique")return<Historique restaurantId={profile?.restaurant_id}/>;
    if (tab === "haccp") return <HACCPComplet restaurantId={profile?.restaurant_id} profileId={profile?.id} toast={showToast}/>;    if(tab==="recettes")return<Recettes restaurantId={profile?.restaurant_id} products={products} toast={showToast}/>;
    if(tab==="settings")return<Reglages profile={profile} toast={showToast}/>;
    if(tab==="users"&&isAdmin)return<Admin adminProfile={profile} toast={showToast}/>;
    if (tab === "planning") return <Planning restaurantId={profile?.restaurant_id} profileId={profile?.id} toast={showToast}/>;
    if (tab === "taches") return <Taches restaurantId={profile?.restaurant_id} profileId={profile?.id} toast={showToast} isOwner={profile?.role==="owner"}/>;
    if (tab === "glaces")    return <PillotGlaces restaurantId={profile?.restaurant_id} profileId={profile?.id} toast={showToast}/>;
    if (tab === "appareils") return <EquipementSetup restaurantId={profile?.restaurant_id} toast={showToast}/>;
    if (tab === "scan")      return <InvoiceScanner restaurantId={profile?.restaurant_id} profileId={profile?.id} products={products} toast={showToast}/>;
    return<Dashboard profile={profile} products={products} onTab={setTab}/>;
  };

  const STYLE=`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');*{font-family:'Inter',sans-serif;box-sizing:border-box;margin:0;}body{background:${C.bg};}::-webkit-scrollbar{width:6px;}::-webkit-scrollbar-track{background:#f1f5f9;}::-webkit-scrollbar-thumb{background:#cbd5e1;border-radius:3px;}input,button,textarea,select{font-family:inherit;}button:focus-visible{outline:2px solid ${C.brand};outline-offset:2px;}`;

  if(loading)return<><style>{STYLE}</style><div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:"linear-gradient(135deg,#0F172A,#1E3A5F)",flexDirection:"column",gap:14}}><div style={{width:52,height:52,background:"linear-gradient(135deg,#2563EB,#1D4ED8)",borderRadius:14,display:"flex",alignItems:"center",justifyContent:"center"}}><span style={{color:"#fff",fontSize:24,fontWeight:800}}>P</span></div><p style={{color:"rgba(255,255,255,.5)",fontSize:14}}>Chargement...</p></div></>;
  if(!session)return<><style>{STYLE}</style><Login/></>;

  return<><style>{STYLE}</style>
    {toast&&<Toast msg={toast.msg} type={toast.type} onClose={()=>setToast(null)}/>}
    <div style={{display:"flex",minHeight:"100vh"}}>
      {!isMobile&&<Sidebar tab={tab} onTab={setTab} profile={profile} onLogout={logout}/>}
      <main style={{flex:1,padding:isMobile?"16px 14px 80px":"28px 32px",overflowY:"auto",maxWidth:isMobile?"100%":860,minWidth:0}}>
        {renderScreen()}
      </main>
    </div>
    {isMobile&&<BottomNav tab={tab} onTab={setTab} isAdmin={isAdmin}/>}
  </>;
}
