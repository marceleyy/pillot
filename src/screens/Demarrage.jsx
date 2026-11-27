import { useState } from "react";
import { supabase } from "../lib/supabase";
import { C, Card } from "../ui";

// Premier passage d'un compte sans commerce : il ouvre le sien et en devient le gérant.
// Le type de commerce règle les sections du stock et les modules ; tout reste modifiable dans Réglages.
const TYPES=[
  {id:"restaurant",nom:"Restaurant",sections:{SALE:{nom:"Cuisine",actif:true,commande:2},SUCRE:{nom:"Desserts",actif:true,commande:1}},modules:{glaces:false}},
  {id:"bar",nom:"Bar, café",sections:{SALE:{nom:"Bar",actif:true,commande:2},SUCRE:{nom:"Cuisine",actif:false,commande:1}},modules:{glaces:false,recettes:false}},
  {id:"glacier",nom:"Glacier",sections:{SALE:{nom:"Salé",actif:true,commande:2},SUCRE:{nom:"Sucré",actif:true,commande:1}},modules:{glaces:true}},
  {id:"boulangerie",nom:"Boulangerie, pâtisserie",sections:{SALE:{nom:"Salé",actif:true,commande:2},SUCRE:{nom:"Sucré",actif:true,commande:1}},modules:{glaces:false}},
  {id:"epicerie",nom:"Épicerie, traiteur",sections:{SALE:{nom:"Magasin",actif:true,commande:2},SUCRE:{nom:"Sucré",actif:false,commande:1}},modules:{glaces:false,recettes:false}},
  {id:"autre",nom:"Autre",sections:{SALE:{nom:"Salé",actif:true,commande:2},SUCRE:{nom:"Sucré",actif:true,commande:1}},modules:{glaces:false}},
];

export default function Demarrage({profile,onCree,onLogout,toast}){
  const [nom,setNom]=useState(""),[ville,setVille]=useState(""),[type,setType]=useState("restaurant"),[busy,setBusy]=useState(false),[err,setErr]=useState("");
  const creer=async()=>{
    if(!nom.trim()||busy)return;
    setBusy(true);setErr("");
    const t=TYPES.find(x=>x.id===type)||TYPES[0];
    const{error}=await supabase.rpc("creer_mon_commerce",{p_nom:nom.trim(),p_ville:ville.trim(),p_parametres:{type:t.id,sections:t.sections},p_modules:t.modules});
    setBusy(false);
    if(error){setErr(error.code==="PGRST202"?"L'ouverture d'un commerce n'est pas encore disponible. Contactez-nous.":error.message||"Création impossible, réessayez");return;}
    toast?.("Votre commerce est prêt");onCree?.();
  };
  const champ={width:"100%",boxSizing:"border-box",padding:"11px 14px",borderRadius:10,border:`1.5px solid ${C.border}`,fontSize:14,outline:"none",background:"#FFFFFF0F"};
  const lab={fontSize:11,fontWeight:700,color:C.textSec,textTransform:"uppercase",letterSpacing:".5px",display:"block",marginBottom:5};
  return<div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:C.bg,padding:20}}>
    <Card style={{width:"100%",maxWidth:480,padding:"32px 28px"}}>
      <h1 style={{margin:"0 0 6px",fontSize:22,fontWeight:800,letterSpacing:"-.5px"}}>Bienvenue{profile?.name?`, ${profile.name.split(" ")[0]}`:""}</h1>
      <p style={{margin:"0 0 22px",fontSize:14,color:C.textSec}}>Ouvrez votre commerce sur Pillot. Vous pourrez tout modifier ensuite dans Réglages.</p>
      <form onSubmit={e=>{e.preventDefault();creer();}} style={{display:"flex",flexDirection:"column",gap:14}}>
        <div><label style={lab} htmlFor="d-nom">Nom du commerce</label><input id="d-nom" value={nom} onChange={e=>setNom(e.target.value)} placeholder="Le Bistrot du Port" style={champ} autoFocus/></div>
        <div><label style={lab} htmlFor="d-ville">Ville</label><input id="d-ville" value={ville} onChange={e=>setVille(e.target.value)} style={champ}/></div>
        <div><span style={lab}>Type de commerce</span>
          <div role="radiogroup" aria-label="Type de commerce" style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
            {TYPES.map(t=><button type="button" role="radio" aria-checked={type===t.id} key={t.id} onClick={()=>setType(t.id)}
              style={{padding:"10px 12px",borderRadius:10,border:`1.5px solid ${type===t.id?C.brand:C.border}`,background:type===t.id?C.brandLight:"#FFFFFF0F",color:type===t.id?C.brand:C.text,fontSize:13,fontWeight:600,cursor:"pointer",textAlign:"left"}}>{t.nom}</button>)}
          </div></div>
        {err&&<p role="alert" style={{margin:0,fontSize:13,color:C.danger}}>{err}</p>}
        <button type="submit" disabled={!nom.trim()||busy} style={{padding:13,background:C.brand,color:"#fff",border:"none",borderRadius:10,fontSize:15,fontWeight:700,cursor:"pointer",opacity:!nom.trim()||busy?.6:1}}>{busy?"Création...":"Ouvrir mon commerce"}</button>
      </form>
      <p style={{margin:"18px 0 0",fontSize:12,color:C.textMuted,textAlign:"center"}}>Vous rejoignez une équipe existante ? Demandez au gérant de vous ajouter avec votre e-mail ({profile?.email}).
        {" "}<button onClick={onLogout} style={{background:"none",border:"none",color:C.brand,fontSize:12,cursor:"pointer",padding:0}}>Se déconnecter</button></p>
    </Card>
  </div>;
}
