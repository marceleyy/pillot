import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { C, Icon, Card } from "../ui";

// ── ADMIN ─────────────────────────────────────────────────────
export default function Admin({adminProfile,toast}){
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
