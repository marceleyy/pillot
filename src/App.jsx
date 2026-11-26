import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Planning, Taches } from "./screens/Planning_Taches";
import HACCPComplet from "./screens/HACCP_complet";
import PillotGlaces from "./screens/PillotGlaces";
import { EquipementSetup, InvoiceScanner } from "./screens/EquipementSetup";
import Login, { NouveauMotDePasse } from "./screens/Login";
import Demarrage from "./screens/Demarrage";
import Dashboard from "./screens/Dashboard";
import TachesReparations from "./screens/TachesReparations";
import Inventaire from "./screens/Inventaire";
import Commandes from "./screens/Commandes";
import Historique from "./screens/Historique";
import Recettes from "./screens/Recettes";
import Reglages from "./screens/Reglages";
import Admin from "./screens/Admin";
import { Sidebar, BottomNav } from "./screens/Navigation";
import { supabase } from "./lib/supabase";
import { C, Toast } from "./ui";
import { lireParametres } from "./parametres";
import { estGerant, ONGLETS_GERANT } from "./roles";
import { COLS_PRODUIT, COLS_COMMERCE, lirePrix, lireChiffres } from "./lib/donnees";

// ── APP ──────────────────────────────────────────────────────
export default function App(){
  const [session,setSession]=useState(null),[profile,setProfile]=useState(null),[products,setProducts]=useState([]),[tab,setTab]=useState("dashboard"),[loading,setLoading]=useState(true),[toast,setToast]=useState(null),[isMobile,setIsMobile]=useState(window.innerWidth<768),[aDesGlaces,setADesGlaces]=useState(false),[commerces,setCommerces]=useState([]),[recuperation,setRecuperation]=useState(false);

  const restOuvert=useRef(null);
  useEffect(()=>{const h=()=>setIsMobile(window.innerWidth<768);window.addEventListener("resize",h);return()=>window.removeEventListener("resize",h);},[]);
  const showToast=useCallback((msg,type="success")=>setToast({msg,type}),[]);

  useEffect(()=>{
    supabase.auth.getSession().then(({data:{session}})=>{setSession(session);if(session)loadProfile(session.user.id);else setLoading(false);});
    const{data:{subscription}}=supabase.auth.onAuthStateChange((ev,s)=>{setSession(s);if(ev==="PASSWORD_RECOVERY")setRecuperation(true);if(s){if(ev==="SIGNED_IN"||ev==="USER_UPDATED")loadProfile(s.user.id);}else{setProfile(null);setProducts([]);setADesGlaces(false);setCommerces([]);setRecuperation(false);setLoading(false);}});
    return()=>subscription.unsubscribe();
  },[]);

  const loadProfile=async(uid)=>{
    // Lien nommé : profiles et restaurants sont aussi reliés par restaurant_members et taches_reparations,
    // un « restaurants(...) » seul est ambigu pour Supabase (réponse 300, profil vide).
    const{data:p}=await supabase.from("profiles").select(`*,restaurants!profiles_restaurant_id_fkey(${COLS_COMMERCE})`).eq("id",uid).single();
    // Le gérant lit aussi le CA et les ratios, réservés dans la base.
    const g=estGerant(p?.role),rid=p?.restaurant_id;
    // Les données du commerce précédent ne restent pas affichées sur un autre commerce.
    if(restOuvert.current!==rid){setProducts([]);setADesGlaces(false);}
    restOuvert.current=rid;
    const[ch]=await Promise.all([g&&p.restaurants?lireChiffres(rid):null,loadCommerces(),...(rid?[loadProducts(rid,g),loadGlaces(rid)]:[])]);
    setProfile(ch?{...p,restaurants:{...p.restaurants,...ch}}:p);setLoading(false);
  };

  // Le module Glaces s'affiche de lui-même si le commerce a des parfums actifs (tant que le gérant n'a rien choisi).
  const loadGlaces=async(restId)=>{
    const{count}=await supabase.from("glaces_flavors").select("id",{count:"exact",head:true}).eq("restaurant_id",restId).eq("actif",true);
    setADesGlaces((count||0)>0);
  };

  // Commerces du compte (plusieurs pour un gérant multi-sites). Sans la migration rôles/comptes : liste vide.
  const loadCommerces=async()=>{
    const{data,error}=await supabase.rpc("mes_restaurants");
    setCommerces(error?[]:(data||[]));
  };

  const changerCommerce=async(id)=>{
    if(!id||id===profile?.restaurant_id)return;
    const{error}=await supabase.rpc("changer_restaurant",{p_restaurant:id});
    if(error){showToast("Impossible d'ouvrir ce commerce","error");return;}
    setTab("dashboard");setLoading(true);
    await loadProfile(profile.id);
  };

  // Après un changement de réglages : relire le commerce sans recharger la page.
  const reloadRestaurant=async()=>{
    if(!profile?.restaurant_id)return;
    const{data}=await supabase.from("restaurants").select(COLS_COMMERCE).eq("id",profile.restaurant_id).single();
    const ch=estGerant(profile.role)?await lireChiffres(profile.restaurant_id):{};
    if(data)setProfile(p=>({...p,restaurants:{...data,...ch}}));
  };

  const params=useMemo(()=>lireParametres(profile?.restaurants,{aDesGlaces}),[profile?.restaurants,aDesGlaces]);
  const isAdmin=profile?.role==="admin";
  // Onglet d'un module désactivé : retour au tableau de bord.
  const gerant=estGerant(profile?.role);
  const tabCoupe=!isAdmin&&(params.modules[tab]===false||(!gerant&&ONGLETS_GERANT.includes(tab)));
  useEffect(()=>{if(tabCoupe)setTab("dashboard");},[tabCoupe]);

  const loadProducts=async(restId,avecPrix=gerant)=>{
    const[{data:prods},{data:stocks},prix]=await Promise.all([
      supabase.from("products").select(COLS_PRODUIT).eq("restaurant_id",restId).eq("actif",true).order("categorie"),
      supabase.from("latest_stock").select("product_id,stock_reel"),
      avecPrix?lirePrix(restId):Promise.resolve({}),
    ]);
    const sm={};(stocks||[]).forEach(s=>sm[s.product_id]=s.stock_reel);
    setProducts((prods||[]).map(p=>({...p,prix_achat:prix[p.id]??null,stock:sm[p.id]!==undefined?sm[p.id]:null})));
  };

  const onStockUpdate=(id,v)=>setProducts(p=>p.map(x=>x.id===id?{...x,stock:v}:x));
  const logout=()=>supabase.auth.signOut();

  const renderScreen=()=>{
    if(tabCoupe)return<Dashboard key={profile?.restaurant_id||"aucun"} profile={profile} products={products} onTab={setTab} params={params} gerant={gerant} toast={showToast}/>;
    if(tab==="stocks")return<Inventaire key={profile?.restaurant_id||"aucun"} products={products} restaurantId={profile?.restaurant_id} onStockUpdate={onStockUpdate} toast={showToast} params={params} gerant={gerant} onProduitsChange={()=>loadProducts(profile.restaurant_id)}/>;
    if(tab==="commandes")return<Commandes products={products} profile={profile} toast={showToast} params={params} gerant={gerant} onLivraison={()=>loadProducts(profile.restaurant_id)}/>;
    if(tab==="historique")return<Historique restaurantId={profile?.restaurant_id} params={params} toast={showToast}/>;
    if (tab === "haccp") return <HACCPComplet restaurantId={profile?.restaurant_id} profileId={profile?.id} toast={showToast}/>;    if(tab==="recettes")return<Recettes restaurantId={profile?.restaurant_id} products={products} toast={showToast} params={params}/>;
    if(tab==="settings")return<Reglages profile={profile} toast={showToast} params={params} products={products} onSaved={reloadRestaurant} commerces={commerces} onChangeCommerce={changerCommerce}/>;
    if(tab==="users"&&isAdmin)return<Admin adminProfile={profile} toast={showToast} onCommerceCree={loadCommerces}/>;
    if (tab === "planning") return <Planning restaurantId={profile?.restaurant_id} profileId={profile?.id} toast={showToast}/>;
    if (tab === "taches") return <Taches restaurantId={profile?.restaurant_id} profileId={profile?.id} toast={showToast} isOwner={gerant}/>;
    if (tab === "reparations") return <TachesReparations key={profile?.restaurant_id||"aucun"} restaurantId={profile?.restaurant_id} profileId={profile?.id} toast={showToast} gerant={gerant}/>;
    if (tab === "glaces")    return <PillotGlaces restaurantId={profile?.restaurant_id} profileId={profile?.id} toast={showToast}/>;
    if (tab === "appareils") return <EquipementSetup restaurantId={profile?.restaurant_id} toast={showToast}/>;
    if (tab === "scan")      return <InvoiceScanner restaurantId={profile?.restaurant_id} profileId={profile?.id} products={products} toast={showToast}/>;
    return<Dashboard key={profile?.restaurant_id||"aucun"} profile={profile} products={products} onTab={setTab} params={params} gerant={gerant} toast={showToast}/>;
  };

  const STYLE=`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');*{font-family:'Inter',sans-serif;box-sizing:border-box;margin:0;}body{background:${C.bg};}::-webkit-scrollbar{width:6px;}::-webkit-scrollbar-track{background:#f1f5f9;}::-webkit-scrollbar-thumb{background:#cbd5e1;border-radius:3px;}input,button,textarea,select{font-family:inherit;}button:focus-visible{outline:2px solid ${C.brand};outline-offset:2px;}`;

  if(loading)return<><style>{STYLE}</style><div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:"linear-gradient(135deg,#0F172A,#1E3A5F)",flexDirection:"column",gap:14}}><div style={{width:52,height:52,background:"linear-gradient(135deg,#2563EB,#1D4ED8)",borderRadius:14,display:"flex",alignItems:"center",justifyContent:"center"}}><span style={{color:"#fff",fontSize:24,fontWeight:800}}>P</span></div><p style={{color:"rgba(255,255,255,.5)",fontSize:14}}>Chargement...</p></div></>;
  if(recuperation&&session)return<><style>{STYLE}</style><NouveauMotDePasse onFini={()=>{setRecuperation(false);showToast("Mot de passe changé");}} onAnnuler={()=>setRecuperation(false)}/>{toast&&<Toast msg={toast.msg} type={toast.type} onClose={()=>setToast(null)}/>}</>;
  if(!session)return<><style>{STYLE}</style><Login/></>;
  // Compte sans commerce : il ouvre le sien (ou attend qu'un gérant l'ajoute).
  if(profile&&!profile.restaurant_id&&!isAdmin)return<><style>{STYLE}</style>{toast&&<Toast msg={toast.msg} type={toast.type} onClose={()=>setToast(null)}/>}
    <Demarrage profile={profile} toast={showToast} onLogout={logout} onCree={()=>{setLoading(true);setTab("stocks");loadProfile(profile.id);}}/></>;

  return<><style>{STYLE}</style>
    {toast&&<Toast msg={toast.msg} type={toast.type} onClose={()=>setToast(null)}/>}
    <div style={{display:"flex",minHeight:"100vh"}}>
      {!isMobile&&<Sidebar tab={tab} onTab={setTab} profile={profile} onLogout={logout} params={params} commerces={commerces} onChangeCommerce={changerCommerce}/>}
      <main style={{flex:1,padding:isMobile?"16px 14px 80px":"28px 32px",overflowY:"auto",maxWidth:isMobile?"100%":(tab==="dashboard"||tabCoupe?1200:860),minWidth:0}}>
        {renderScreen()}
      </main>
    </div>
    {isMobile&&<BottomNav tab={tab} onTab={setTab} isAdmin={isAdmin} params={params} gerant={gerant}/>}
  </>;
}
