import { C, Icon } from "../ui";

// ── SIDEBAR ──────────────────────────────────────────────────
export function Sidebar({tab,onTab,profile,onLogout}){
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
export function BottomNav({tab,onTab,isAdmin}){
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
