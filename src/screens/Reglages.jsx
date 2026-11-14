import { useState } from "react";
import { supabase } from "../lib/supabase";
import { C, Card } from "../ui";
import { MODULES, PARAMETRES_DEFAUT } from "../parametres";

// ── RÉGLAGES ─────────────────────────────────────────────────
export default function Reglages({profile,toast,params=PARAMETRES_DEFAUT,products=[],onSaved}){
  const [ca_s,setCaS]=useState(""),[ ca_su,setCaSu]=useState(""),[ saving,setSaving]=useState(false);
  const rest=profile?.restaurants;
  const saveCa=async()=>{
    setSaving(true);
    const cout_s=products_cost_estimate(rest?.id);
    // Section 2 non utilisée : son CA n'est pas affiché, donc pas écrasé.
    const maj={ca_sale:parseFloat(ca_s)||0,...(params.deuxSections?{ca_sucre:parseFloat(ca_su)||0}:{})};
    const{error}=await supabase.from("restaurants").update(maj).eq("id",rest?.id);
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
      <div style={{display:"grid",gridTemplateColumns:params.deuxSections?"1fr 1fr":"1fr",gap:12,marginBottom:16}}>
        {[[`CA HT ${params.nomSection("SALE")} (€)`,ca_s,setCaS],...(params.deuxSections?[[`CA HT ${params.nomSection("SUCRE")} (€)`,ca_su,setCaSu]]:[])].map(([l,v,set])=><div key={l}>
          <label style={{fontSize:11,fontWeight:700,color:C.textSec,display:"block",marginBottom:5,textTransform:"uppercase",letterSpacing:".5px"}}>{l}</label>
          <input type="number" value={v} onChange={e=>set(e.target.value)} placeholder="0" style={inp} onFocus={e=>e.target.style.borderColor=C.brand} onBlur={e=>e.target.style.borderColor=C.border}/>
        </div>)}
      </div>
      <button onClick={saveCa} disabled={saving} style={{padding:"11px 24px",background:C.brand,color:"#fff",border:"none",borderRadius:10,fontSize:14,fontWeight:700,cursor:"pointer"}}>
        {saving?"Enregistrement...":"Enregistrer le CA"}</button>
    </Card>
    {["owner","manager","admin"].includes(profile?.role)&&rest?.id&&<ReglagesCommerce rest={rest} params={params} products={products} toast={toast} onSaved={onSaved}/>}
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

// Réglages propres au commerce : sections du stock, règle de commande, objectif, modules du menu.
function ReglagesCommerce({rest,params,products,toast,onSaved}){
  const [sections,setSections]=useState(()=>params.sections.map(x=>({...x})));
  const [objectif,setObjectif]=useState(()=>String(Math.round(params.objectif*1000)/10));
  const [modules,setModules]=useState(()=>({...params.modules}));
  const [modulesDepart]=useState(()=>({...params.modules}));
  const [saving,setSaving]=useState(false);
  const nbSucre=products.filter(p=>p.cote==="SUCRE").length;
  const majSection=(code,champ,v)=>setSections(prev=>prev.map(x=>x.code===code?{...x,[champ]:v}:x));
  const obj=Number(String(objectif).replace(",","."));
  const objOk=Number.isFinite(obj)&&obj>=1&&obj<=90;
  const nomsOk=sections.every(x=>!x.actif||x.nom.trim());

  const enregistrer=async()=>{
    if(!rest?.id||!objOk||!nomsOk)return;
    setSaving(true);
    const parametres={...(rest.parametres&&typeof rest.parametres==="object"?rest.parametres:{}),
      sections:Object.fromEntries(sections.map(x=>[x.code,{nom:x.nom.trim(),actif:x.actif,commande:x.commande}]))};
    // Seuls les modules que le gérant a changés deviennent un choix fixe : les autres gardent leur réglage
    // (Glaces reste automatique tant qu'on n'y touche pas).
    const choix={};Object.keys(modules).forEach(k=>{if(modules[k]!==modulesDepart[k])choix[k]=modules[k];});
    const{data,error}=await supabase.from("restaurants").update({parametres,objectif:Math.round(obj*10)/1000,modules:{...(rest.modules||{}),...choix}}).eq("id",rest.id).select("id");
    setSaving(false);
    if(!error&&!data?.length){toast("Seul le gérant peut modifier ces réglages","error");return;}
    if(error){
      const manque=error.code==="PGRST204"||error.code==="42703";
      toast(manque?"Mise à jour de la base nécessaire pour enregistrer ces réglages":"Réglages non enregistrés","error");
      return;
    }
    toast("Réglages du commerce enregistrés");
    onSaved?.();
  };

  const lab={fontSize:11,fontWeight:700,color:C.textSec,display:"block",marginBottom:5,textTransform:"uppercase",letterSpacing:".5px"};
  const champ={width:"100%",boxSizing:"border-box",padding:"9px 12px",borderRadius:8,border:`1.5px solid ${C.border}`,fontSize:14,outline:"none",background:"#fff"};
  return<Card style={{padding:24,marginBottom:14}}>
    <h3 style={{margin:"0 0 6px",fontSize:15,fontWeight:800}}>Votre commerce</h3>
    <p style={{margin:"0 0 16px",fontSize:13,color:C.textSec}}>Ces réglages adaptent Pillot à votre activité. Ils s'appliquent à tout le commerce.</p>

    <p style={{...lab,marginBottom:8}}>Sections du stock</p>
    {sections.map((x,i)=><div key={x.code} style={{display:"grid",gridTemplateColumns:"auto 1fr 1fr",gap:10,alignItems:"center",marginBottom:10}}>
      <input type="checkbox" checked={x.actif} disabled={i===0||(x.actif&&nbSucre>0)} aria-label={`Utiliser la section ${i+1}`}
        onChange={e=>majSection(x.code,"actif",e.target.checked)} title={i===0?"La première section est toujours utilisée":x.actif&&nbSucre>0?`${nbSucre} produit(s) dans cette section`:""}/>
      <input type="text" value={x.nom} maxLength={30} disabled={!x.actif} onChange={e=>majSection(x.code,"nom",e.target.value)} aria-label={`Nom de la section ${i+1}`} style={{...champ,borderColor:x.actif&&!x.nom.trim()?C.danger:C.border}}/>
      <select value={x.commande} disabled={!x.actif} onChange={e=>majSection(x.code,"commande",Number(e.target.value))} aria-label={`Règle de commande de la section ${i+1}`} style={champ}>
        <option value={1}>Commander jusqu'au minimum</option>
        <option value={2}>Commander jusqu'à 2 × le minimum</option>
      </select>
    </div>)}
    <p style={{margin:"0 0 18px",fontSize:12,color:C.textMuted}}>Exemples : Cuisine et Bar, Salé et Sucré, ou une seule section. {nbSucre>0?"La 2e section contient des produits : elle ne peut pas être retirée.":""}</p>

    <label style={lab} htmlFor="objectif-ratio">Objectif de coût matière (% du CA, de 1 à 90)</label>
    <input id="objectif-ratio" type="text" inputMode="decimal" value={objectif} onChange={e=>setObjectif(e.target.value)} style={{...champ,maxWidth:140,marginBottom:4,borderColor:objOk?C.border:C.danger}}/>
    <p style={{margin:"0 0 18px",fontSize:12,color:C.textMuted}}>Sert aux jauges du tableau de bord, à l'historique et aux fiches techniques.</p>

    <p style={{...lab,marginBottom:8}}>Modules affichés dans le menu</p>
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(170px,1fr))",gap:8,marginBottom:18}}>
      {MODULES.map(m=><label key={m.id} style={{display:"flex",alignItems:"center",gap:8,fontSize:13,padding:"8px 10px",background:"#F8FAFC",borderRadius:8,cursor:"pointer"}}>
        <input type="checkbox" checked={modules[m.id]!==false} onChange={e=>setModules(prev=>({...prev,[m.id]:e.target.checked}))}/>{m.nom}
      </label>)}
    </div>

    <button onClick={enregistrer} disabled={saving||!objOk||!nomsOk} style={{padding:"11px 24px",background:C.brand,color:"#fff",border:"none",borderRadius:10,fontSize:14,fontWeight:700,cursor:"pointer",opacity:saving||!objOk||!nomsOk?.6:1}}>
      {saving?"Enregistrement...":"Enregistrer les réglages"}</button>
  </Card>;
}
