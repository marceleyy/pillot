import { useState, useEffect, useCallback } from "react";
import { Planning, Taches } from "./screens/Planning_Taches";
import HACCPComplet from "./screens/HACCP_complet";
import PillotGlaces from "./screens/PillotGlaces";
import { EquipementSetup, InvoiceScanner } from "./screens/EquipementSetup";
import Login from "./screens/Login";
import Dashboard from "./screens/Dashboard";
import Inventaire from "./screens/Inventaire";
import Commandes from "./screens/Commandes";
import Historique from "./screens/Historique";
import Recettes from "./screens/Recettes";
import Reglages from "./screens/Reglages";
import Admin from "./screens/Admin";
import { Sidebar, BottomNav } from "./screens/Navigation";
import { supabase } from "./lib/supabase";
import { C, Toast } from "./ui";

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
    if(tab==="stocks")return<Inventaire key={profile?.restaurant_id||"aucun"} products={products} restaurantId={profile?.restaurant_id} onStockUpdate={onStockUpdate} toast={showToast}/>;
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
