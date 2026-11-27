import { C, Icon } from "../ui";
import { PARAMETRES_DEFAUT } from "../parametres";
import { estGerant, libelleRole, ONGLETS_GERANT } from "../roles";

// Onglets d'un module que le commerce a désactivé : retirés du menu.
const visibles=(tabs,params,gerant)=>tabs.filter(([id])=>params.modules[id]!==false&&(gerant||!ONGLETS_GERANT.includes(id)));

// ── SIDEBAR ──────────────────────────────────────────────────
export function Sidebar({tab,onTab,profile,onLogout,params=PARAMETRES_DEFAUT,commerces=[],onChangeCommerce}){
  const isAdmin=profile?.role==="admin";
  const tabs=isAdmin
    ?[["dashboard","Tableau de bord","home"],["users","Clients","users"],["settings","Réglages","settings"]]
    :[["dashboard","Tableau de bord","home"],["stocks","Inventaire","box"],["commandes","Commandes","cart"],["historique","Historique","chart"],["haccp","HACCP","thermometer"],["recettes","Fiches techniques","book"],["settings","Réglages","settings"],["planning","Planning","calendar"],["taches","Tâches","clipboard"],["reparations","Réparations","edit"],["glaces",    "Pillot Glaces",  "ice-cream"],
    ["scan",      "Scan facture",   "camera"],
    ["appareils", "Équipements",    "device-desktop"],];
  const menu=isAdmin?tabs:visibles(tabs,params,estGerant(profile?.role));
  return<div className="pv-app-side" style={{width:230,background:C.navy,display:"flex",flexDirection:"column",minHeight:"calc(100vh - 32px)",flexShrink:0,position:"sticky",top:16,maxHeight:"calc(100vh - 32px)",overflowY:"auto"}}>
    <div style={{padding:"22px 18px 14px"}}>
      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:14}}>
        <div style={{width:38,height:38,background:"linear-gradient(135deg,#4C7DF0,#3D6BE0)",borderRadius:10,display:"flex",alignItems:"center",justifyContent:"center"}}>
          <span style={{color:"#fff",fontSize:18,fontWeight:800}}>P</span>
        </div>
        <div><p style={{margin:0,fontSize:16,fontWeight:800,color:"#fff"}}>Pillot</p><p style={{margin:0,fontSize:10,color:"#F4EDE7B3"}}>pillot-restaurant.fr</p></div>
      </div>
      <div style={{padding:"8px 10px",background:"rgba(255,255,255,.06)",borderRadius:8}}>
        <p style={{margin:0,fontSize:12,fontWeight:700,color:"#F4EDE780",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{profile?.restaurants?.name||profile?.email}</p>
        <p style={{margin:0,fontSize:11,color:"#F4EDE7B3"}}>{libelleRole(profile?.role)}</p>
        {commerces.length>1&&<select value={profile?.restaurant_id||""} onChange={e=>onChangeCommerce?.(e.target.value)} aria-label="Changer de commerce"
          style={{marginTop:8,width:"100%",padding:"6px 8px",borderRadius:6,border:"1px solid #FFFFFF33",background:"#FFFFFF14",color:"#F4EDE7",fontSize:12}}>
          {!profile?.restaurant_id&&<option value="">Choisir un commerce</option>}
          {commerces.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
        </select>}
      </div>
    </div>
    <nav style={{flex:1,padding:"4px 10px"}}>
      {menu.map(([id,label,icon])=>{const active=tab===id;return<button key={id} onClick={()=>onTab(id)} style={{width:"100%",padding:"9px 12px",borderRadius:9,border:"none",cursor:"pointer",display:"flex",alignItems:"center",gap:10,marginBottom:1,background:active?"rgba(37,99,235,.3)":"transparent",color:active?"#fff":"#F4EDE780",fontSize:13,fontWeight:active?700:400,textAlign:"left"}}
        onMouseEnter={e=>{if(!active){e.currentTarget.style.background="rgba(255,255,255,.06)";e.currentTarget.style.color="#fff";}}} onMouseLeave={e=>{if(!active){e.currentTarget.style.background="transparent";e.currentTarget.style.color="#F4EDE780";}}}>
        <Icon n={icon} sz={15} c={active?"#60A5FA":"currentColor"}/>{label}
        {active&&<span style={{marginLeft:"auto",width:5,height:5,borderRadius:"50%",background:"#60A5FA",display:"inline-block"}}/>}
      </button>;})}
    </nav>
    <div style={{padding:"10px 18px 22px"}}>
      <button onClick={onLogout} style={{width:"100%",padding:"9px 12px",borderRadius:9,border:"none",cursor:"pointer",display:"flex",alignItems:"center",gap:10,background:"transparent",color:"#F4EDE7B3",fontSize:13}}
        onMouseEnter={e=>{e.currentTarget.style.background="rgba(239,68,68,.15)";e.currentTarget.style.color="#F87171";}} onMouseLeave={e=>{e.currentTarget.style.background="transparent";e.currentTarget.style.color="#F4EDE7B3";}}>
        <Icon n="logout" sz={15}/>Déconnexion
      </button>
    </div>
  </div>;
}

// ── BOTTOM NAV ────────────────────────────────────────────────
export function BottomNav({tab,onTab,isAdmin,params=PARAMETRES_DEFAUT,gerant=false}){
  const tabs=isAdmin
    ?[["dashboard","Accueil","home"],["users","Clients","users"],["settings","Réglages","settings"]]
    :[["dashboard","Accueil","home"],["stocks","Stocks","box"],["commandes","Commandes","cart"],["haccp","HACCP","thermometer"],["settings","Réglages","settings"]];
  return<div style={{position:"fixed",bottom:0,left:0,right:0,background:"#1E1618E6",backdropFilter:"blur(20px)",WebkitBackdropFilter:"blur(20px)",borderTop:`1px solid ${C.border}`,display:"flex",zIndex:50,paddingBottom:"env(safe-area-inset-bottom)"}}>
    {(isAdmin?tabs:visibles(tabs,params,gerant)).map(([id,l,ic])=><button key={id} onClick={()=>onTab(id)} style={{flex:1,padding:"9px 4px 7px",border:"none",background:"transparent",cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:2}}>
      <Icon n={ic} sz={20} c={tab===id?C.brand:C.textMuted}/>
      <span style={{fontSize:10,fontWeight:tab===id?700:500,color:tab===id?C.brand:C.textMuted}}>{l}</span>
    </button>)}
  </div>;
}
