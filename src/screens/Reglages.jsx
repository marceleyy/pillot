import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabase";
import { C, Card } from "../ui";
import { MODULES, PARAMETRES_DEFAUT } from "../parametres";
import { estGerant, libelleRole } from "../roles";

// ── RÉGLAGES ─────────────────────────────────────────────────
export default function Reglages({profile,toast,params=PARAMETRES_DEFAUT,products=[],onSaved,commerces=[],onChangeCommerce}){
  const gerant=estGerant(profile?.role);
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
    {commerces.length>1&&<MesCommerces commerces={commerces} actuel={profile?.restaurant_id} onChange={onChangeCommerce}/>}
    {gerant&&<Card style={{padding:24,marginBottom:14}}>
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
    </Card>}
    {gerant&&rest?.id&&<Equipe profile={profile} toast={toast}/>}
    {gerant&&rest?.id&&<ReglagesCommerce rest={rest} params={params} products={products} toast={toast} onSaved={onSaved}/>}
    <Card style={{padding:20}}>
      <h3 style={{margin:"0 0 12px",fontSize:15,fontWeight:800}}>Informations du compte</h3>
      <div style={{display:"flex",flexDirection:"column",gap:8}}>
        {[["Restaurant",rest?.name],["Plan",rest?.plan],["Email",profile?.email],["Rôle",libelleRole(profile?.role)],["Domaine","pillot-restaurant.fr"]].map(([l,v])=><div key={l} style={{display:"flex",justifyContent:"space-between",padding:"9px 12px",background:"#FFFFFF0A",borderRadius:8}}>
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
  return<Card style={{padding:24,marginBottom:14}}>
    <h3 style={{margin:"0 0 6px",fontSize:15,fontWeight:800}}>Votre commerce</h3>
    <p style={{margin:"0 0 16px",fontSize:13,color:C.textSec}}>Ces réglages adaptent Pillot à votre activité. Ils s'appliquent à tout le commerce.</p>

    <p style={{...lab,marginBottom:8}}>Sections du stock</p>
    {sections.map((x,i)=><div key={x.code} style={{display:"grid",gridTemplateColumns:"auto 1fr 1fr",gap:10,alignItems:"center",marginBottom:10}}>
      <input type="checkbox" checked={x.actif} disabled={i===0||(x.actif&&nbSucre>0)} aria-label={`Utiliser la section ${i+1}`}
        onChange={e=>majSection(x.code,"actif",e.target.checked)} title={i===0?"La première section est toujours utilisée":x.actif&&nbSucre>0?`${nbSucre} produit(s) dans cette section`:""}/>
      <input type="text" value={x.nom} maxLength={30} disabled={!x.actif} onChange={e=>majSection(x.code,"nom",e.target.value)} aria-label={`Nom de la section ${i+1}`} style={{...CHAMP,borderColor:x.actif&&!x.nom.trim()?C.danger:C.border}}/>
      <select value={x.commande} disabled={!x.actif} onChange={e=>majSection(x.code,"commande",Number(e.target.value))} aria-label={`Règle de commande de la section ${i+1}`} style={CHAMP}>
        <option value={1}>Commander jusqu'au minimum</option>
        <option value={2}>Commander jusqu'à 2 × le minimum</option>
      </select>
    </div>)}
    <p style={{margin:"0 0 18px",fontSize:12,color:C.textMuted}}>Exemples : Cuisine et Bar, Salé et Sucré, ou une seule section. {nbSucre>0?"La 2e section contient des produits : elle ne peut pas être retirée.":""}</p>

    <label style={lab} htmlFor="objectif-ratio">Objectif de coût matière (% du CA, de 1 à 90)</label>
    <input id="objectif-ratio" type="text" inputMode="decimal" value={objectif} onChange={e=>setObjectif(e.target.value)} style={{...CHAMP,maxWidth:140,marginBottom:4,borderColor:objOk?C.border:C.danger}}/>
    <p style={{margin:"0 0 18px",fontSize:12,color:C.textMuted}}>Sert aux jauges du tableau de bord, à l'historique et aux fiches techniques.</p>

    <p style={{...lab,marginBottom:8}}>Modules affichés dans le menu</p>
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(170px,1fr))",gap:8,marginBottom:18}}>
      {MODULES.map(m=><label key={m.id} style={{display:"flex",alignItems:"center",gap:8,fontSize:13,padding:"8px 10px",background:"#FFFFFF0A",borderRadius:8,cursor:"pointer"}}>
        <input type="checkbox" checked={modules[m.id]!==false} onChange={e=>setModules(prev=>({...prev,[m.id]:e.target.checked}))}/>{m.nom}
      </label>)}
    </div>

    <button onClick={enregistrer} disabled={saving||!objOk||!nomsOk} style={{padding:"11px 24px",background:C.brand,color:"#fff",border:"none",borderRadius:10,fontSize:14,fontWeight:700,cursor:"pointer",opacity:saving||!objOk||!nomsOk?.6:1}}>
      {saving?"Enregistrement...":"Enregistrer les réglages"}</button>
  </Card>;
}

const LAB={fontSize:11,fontWeight:700,color:C.textSec,display:"block",marginBottom:5,textTransform:"uppercase",letterSpacing:".5px"};
const CHAMP={width:"100%",boxSizing:"border-box",padding:"9px 12px",borderRadius:8,border:`1.5px solid ${C.border}`,fontSize:14,outline:"none",background:"#FFFFFF0F"};

// Gérant de plusieurs commerces : passer de l'un à l'autre (aussi possible depuis le menu sur ordinateur).
function MesCommerces({commerces,actuel,onChange}){
  return<Card style={{padding:24,marginBottom:14}}>
    <h3 style={{margin:"0 0 12px",fontSize:15,fontWeight:800}}>Mes commerces</h3>
    <div style={{display:"flex",flexDirection:"column",gap:8}}>
      {commerces.map(c=><button key={c.id} onClick={()=>onChange?.(c.id)} disabled={c.id===actuel}
        style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 12px",borderRadius:8,border:`1.5px solid ${c.id===actuel?C.brand:C.border}`,background:c.id===actuel?C.brandLight:"#FFFFFF0F",cursor:c.id===actuel?"default":"pointer",textAlign:"left"}}>
        <span><span style={{fontSize:14,fontWeight:700,color:C.text}}>{c.name}</span>{c.ville&&<span style={{fontSize:12,color:C.textSec}}> · {c.ville}</span>}</span>
        <span style={{fontSize:12,color:c.id===actuel?C.brand:C.textSec,fontWeight:600}}>{c.id===actuel?"Ouvert":libelleRole(c.role)}</span>
      </button>)}
    </div>
  </Card>;
}

// Équipe du commerce ouvert : qui y a accès, avec quel rôle. On ajoute un compte déjà créé, par son e-mail.
function Equipe({profile,toast}){
  const [membres,setMembres]=useState([]),[indispo,setIndispo]=useState(false),[email,setEmail]=useState(""),[role,setRole]=useState("employee"),[busy,setBusy]=useState(false);
  const charger=useCallback(async()=>{
    const{data,error}=await supabase.rpc("membres_du_commerce");
    setIndispo(!!error);setMembres(data||[]);
  },[]);
  useEffect(()=>{charger();},[charger,profile?.restaurant_id]);
  const roles=profile?.role==="admin"?["owner","manager","employee"]:profile?.role==="owner"?["manager","employee"]:["employee"];
  const ajouter=async()=>{
    if(!email.trim()||busy)return;
    setBusy(true);
    const{error}=await supabase.rpc("ajouter_membre",{p_email:email.trim(),p_role:role});
    setBusy(false);
    if(error){toast(error.message||"Ajout impossible","error");return;}
    toast("Accès donné");setEmail("");charger();
  };
  const retirer=async m=>{
    if(!window.confirm(`Retirer l'accès de ${m.name||m.email} à ce commerce ?`))return;
    const{error}=await supabase.rpc("retirer_membre",{p_profile:m.profile_id});
    if(error){toast(error.message||"Retrait impossible","error");return;}
    toast("Accès retiré");charger();
  };
  const peutRetirer=m=>m.profile_id!==profile?.id&&(profile?.role==="admin"||(m.role!=="owner"&&(profile?.role==="owner"||m.role==="employee")));
  return<Card style={{padding:24,marginBottom:14}}>
    <h3 style={{margin:"0 0 6px",fontSize:15,fontWeight:800}}>Équipe</h3>
    <p style={{margin:"0 0 14px",fontSize:13,color:C.textSec}}>L'équipe compte le stock, remplit l'HACCP et les tâches. Elle ne voit ni les prix d'achat, ni le CA, ni ces réglages.</p>
    {indispo?<p style={{margin:0,fontSize:13,color:C.textMuted}}>La gestion de l'équipe demande une mise à jour de la base.</p>:<>
      <div style={{display:"flex",flexDirection:"column",gap:6,marginBottom:14}}>
        {membres.map(m=><div key={m.profile_id} style={{display:"flex",alignItems:"center",gap:10,padding:"9px 12px",background:"#FFFFFF0A",borderRadius:8}}>
          <div style={{flex:1,minWidth:0}}><p style={{margin:0,fontSize:13,fontWeight:600,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{m.name||m.email}</p>{m.name&&<p style={{margin:0,fontSize:11,color:C.textSec}}>{m.email}</p>}</div>
          <span style={{fontSize:12,fontWeight:600,color:C.textSec}}>{libelleRole(m.role)}</span>
          {peutRetirer(m)&&<button onClick={()=>retirer(m)} style={{padding:"5px 10px",borderRadius:6,border:`1px solid ${C.border}`,background:"#FFFFFF0F",fontSize:12,cursor:"pointer",color:C.danger}}>Retirer</button>}
        </div>)}
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr auto auto",gap:8,alignItems:"end"}}>
        <div><label style={LAB} htmlFor="membre-email">E-mail du compte</label>
          <input id="membre-email" type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="prenom@exemple.fr" style={CHAMP}/></div>
        <select value={role} onChange={e=>setRole(e.target.value)} aria-label="Rôle" style={{...CHAMP,width:"auto"}}>
          {roles.map(r=><option key={r} value={r}>{libelleRole(r)}</option>)}
        </select>
        <button onClick={ajouter} disabled={busy||!email.trim()} style={{padding:"10px 16px",background:C.brand,color:"#fff",border:"none",borderRadius:8,fontSize:13,fontWeight:700,cursor:"pointer",opacity:busy||!email.trim()?.6:1}}>Donner l'accès</button>
      </div>
      <p style={{margin:"8px 0 0",fontSize:12,color:C.textMuted}}>La personne crée d'abord son compte Pillot avec cet e-mail.</p>
    </>}
  </Card>;
}
