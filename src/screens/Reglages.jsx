import { useState } from "react";
import { supabase } from "../lib/supabase";
import { C, Card } from "../ui";

// ── RÉGLAGES ─────────────────────────────────────────────────
export default function Reglages({profile,toast}){
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
