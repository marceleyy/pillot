import { useState, useEffect, useCallback, useRef } from "react";
import * as XLSX from "xlsx";
import { supabase } from "../lib/supabase";
import { C, Icon, Card, fmt, fmtPrix, fmtDate, qteNum } from "../ui";
import { PARAMETRES_DEFAUT } from "../parametres";

// Consommation sur une période : stock au début + livré − stock à la fin, valorisée au prix d'achat.
const jour=d=>d.toLocaleDateString("sv-SE");
const debutJour=s=>new Date(`${s}T00:00:00`);
const finJour=s=>new Date(`${s}T23:59:59.999`);
const nb=v=>v===null||v===undefined?"—":Number(v).toLocaleString("fr-FR",{maximumFractionDigits:2});

function periodesRapides(invs){
  const now=new Date(),y=now.getFullYear(),m=now.getMonth();
  const p=[
    {id:"7j",nom:"7 derniers jours",debut:new Date(now-7*864e5),fin:now},
    {id:"mois",nom:"Ce mois-ci",debut:new Date(y,m,1),fin:now},
    {id:"moisprec",nom:"Mois dernier",debut:new Date(y,m-1,1),fin:new Date(y,m,0,23,59,59,999)},
  ];
  // Les inventaires datés donnent la période la plus juste : tout a été compté au début et à la fin.
  if(invs.length>=2)p.unshift({id:"inv",nom:"Entre les 2 derniers inventaires",debut:new Date(invs[1].created_at),fin:new Date(invs[0].created_at)});
  else if(invs.length===1)p.unshift({id:"inv",nom:"Depuis le dernier inventaire",debut:new Date(invs[0].created_at),fin:now});
  return p;
}

export default function Consommation({restaurantId,params=PARAMETRES_DEFAUT,toast}){
  const [invs,setInvs]=useState(null),[periode,setPeriode]=useState(null),[lignes,setLignes]=useState(null),[err,setErr]=useState(null),[loading,setLoading]=useState(false);
  const [ca,setCa]=useState({}),[voirTout,setVoirTout]=useState(false);

  useEffect(()=>{
    if(!restaurantId)return;
    supabase.from("inventories").select("created_at").eq("restaurant_id",restaurantId).order("created_at",{ascending:false}).limit(2)
      .then(({data})=>{const l=data||[];setInvs(l);const p=periodesRapides(l)[0];setPeriode({id:p.id,debut:p.debut,fin:p.fin});});
  },[restaurantId]);

  // Seule la réponse de la dernière période demandée s'affiche.
  const demande=useRef(0);
  const charger=useCallback(async p=>{
    const n=++demande.current;
    setLoading(true);setErr(null);
    const{data,error}=await supabase.rpc("consommation",{p_debut:p.debut.toISOString(),p_fin:p.fin.toISOString()});
    if(n!==demande.current)return;
    setLoading(false);
    if(error){setLignes(null);setErr(error.code==="PGRST202"?"base":"erreur");return;}
    setLignes(data||[]);
  },[]);
  useEffect(()=>{
    if(!periode)return;
    if(periode.fin>periode.debut)charger(periode);
    else{demande.current++;setLignes(null);setLoading(false);}
  },[periode,charger]);

  if(!invs||!periode)return<p style={{color:C.textMuted,padding:40,textAlign:"center"}}>Chargement...</p>;
  const rapides=periodesRapides(invs);

  const calc=(lignes||[]).filter(l=>l.consommation!==null);
  const manquants=(lignes||[]).filter(l=>l.consommation===null&&(l.stock_fin!==null||Number(l.entrees)>0));
  const negatifs=calc.filter(l=>Number(l.consommation)<0);
  const sections=params.sectionsActives.map(s=>{
    const ls=calc.filter(l=>(l.cote==="SUCRE"?"SUCRE":"SALE")===s.code||(!params.deuxSections));
    const valeur=ls.reduce((a,l)=>a+Math.max(0,Number(l.valeur)||0),0);
    const c=qteNum(ca[s.code]);
    return{...s,valeur,ratio:c>0?valeur/c:null};
  });
  const total=sections.reduce((a,s)=>a+s.valeur,0);
  const visibles=calc.filter(l=>voirTout||Number(l.consommation)!==0||Number(l.entrees)>0).sort((a,b)=>(Number(b.valeur)||0)-(Number(a.valeur)||0));

  const exporter=()=>{
    const rows=calc.map(l=>({"Section":params.nomSection(l.cote),"Catégorie":l.categorie||"","Produit":l.nom,"Fournisseur":l.fournisseur||"","Unité":l.unite||"",
      "Stock début":Number(l.stock_debut),"Livré":Number(l.entrees),"Stock fin":Number(l.stock_fin),"Consommé":Number(l.consommation),"Prix d'achat (€)":Number(l.prix),"Valeur consommée (€)":Number(l.valeur)}));
    const ws=XLSX.utils.json_to_sheet(rows);ws["!cols"]=[10,18,34,18,8,11,9,10,11,14,18].map(w=>({wch:w}));
    const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,ws,"Consommation");
    XLSX.writeFile(wb,`consommation_${jour(periode.debut)}_${jour(periode.fin)}.xlsx`);
    toast?.("Export Excel téléchargé");
  };

  const champ={padding:"8px 10px",borderRadius:8,border:`1.5px solid ${C.border}`,fontSize:13,outline:"none",background:"#FFFFFF0F"};
  return<div>
    <Card style={{padding:16,marginBottom:14}}>
      <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:10}}>
        {rapides.map(p=><button key={p.id} onClick={()=>setPeriode({id:p.id,debut:p.debut,fin:p.fin})}
          style={{padding:"6px 12px",borderRadius:20,border:`1px solid ${periode.id===p.id?C.brand:C.border}`,background:periode.id===p.id?C.brandLight:"#FFFFFF0F",color:periode.id===p.id?C.brand:C.textSec,fontSize:12,fontWeight:600,cursor:"pointer"}}>{p.nom}</button>)}
      </div>
      <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap",fontSize:13,color:C.textSec}}>
        Du <input type="date" value={jour(periode.debut)} aria-label="Début de la période" onChange={e=>e.target.value&&setPeriode(p=>({id:"libre",debut:debutJour(e.target.value),fin:p.fin}))} style={champ}/>
        au <input type="date" value={jour(periode.fin)} aria-label="Fin de la période" onChange={e=>e.target.value&&setPeriode(p=>({id:"libre",debut:p.debut,fin:finJour(e.target.value)}))} style={champ}/>
      </div>
      {periode.id==="inv"&&<p style={{margin:"8px 0 0",fontSize:12,color:C.textMuted}}>{fmtDate(periode.debut)} → {fmtDate(periode.fin)}</p>}
      {periode.fin<=periode.debut&&<p style={{margin:"8px 0 0",fontSize:12,color:C.danger}}>La fin doit être après le début.</p>}
    </Card>

    {err==="base"&&<Card style={{padding:20}}><p style={{margin:0,fontSize:13,color:C.textSec}}>Le calcul de la consommation demande une mise à jour de la base.</p></Card>}
    {err==="erreur"&&<Card style={{padding:20}}><p style={{margin:0,fontSize:13,color:C.danger}}>Calcul impossible pour le moment, réessayez.</p></Card>}
    {loading&&<p style={{color:C.textMuted,padding:20,textAlign:"center"}}>Calcul...</p>}

    {!loading&&lignes&&<>
      <div style={{display:"grid",gridTemplateColumns:`repeat(${sections.length+1},1fr)`,gap:10,marginBottom:14}}>
        <Card style={{padding:"14px 16px"}}>
          <p style={{margin:"0 0 6px",fontSize:10,fontWeight:700,color:C.textSec,textTransform:"uppercase",letterSpacing:".5px"}}>Consommé</p>
          <p style={{margin:0,fontSize:20,fontWeight:800,color:C.text}}>{fmt(total)}</p>
          <p style={{margin:"2px 0 0",fontSize:11,color:C.textMuted}}>{calc.length} produit{calc.length>1?"s":""} calculé{calc.length>1?"s":""}</p>
        </Card>
        {sections.map(s=><Card key={s.code} style={{padding:"14px 16px"}}>
          <p style={{margin:"0 0 6px",fontSize:10,fontWeight:700,color:C.textSec,textTransform:"uppercase",letterSpacing:".5px"}}>{s.nom}</p>
          <p style={{margin:0,fontSize:16,fontWeight:800}}>{fmt(s.valeur)}</p>
          <input inputMode="decimal" value={ca[s.code]??""} onChange={e=>setCa(x=>({...x,[s.code]:e.target.value}))} placeholder="CA HT de la période" aria-label={`CA HT ${s.nom}`}
            style={{...champ,width:"100%",boxSizing:"border-box",marginTop:8,fontSize:12,padding:"6px 8px"}}/>
          {s.ratio!==null&&<p style={{margin:"6px 0 0",fontSize:13,fontWeight:700,color:s.ratio<=params.objectif?C.success:s.ratio<=params.alerte?C.warning:C.danger}}>
            Coût matière {(s.ratio*100).toLocaleString("fr-FR",{maximumFractionDigits:1})} % <span style={{fontWeight:400,color:C.textMuted}}>(objectif {(params.objectif*100).toFixed(0)} %)</span></p>}
        </Card>)}
      </div>

      {(manquants.length>0||negatifs.length>0)&&<Card style={{padding:"12px 16px",marginBottom:14,background:C.warningLight}}>
        {manquants.length>0&&<p style={{margin:0,fontSize:13,color:C.text}}><b>{manquants.length} produit{manquants.length>1?"s":""}</b> sans stock connu au début ou à la fin : non comptés. Un inventaire au début et à la fin de la période les inclut.</p>}
        {negatifs.length>0&&<p style={{margin:manquants.length?"6px 0 0":0,fontSize:13,color:C.text}}><b>{negatifs.length} produit{negatifs.length>1?"s":""}</b> avec plus de stock à la fin que prévu : une livraison n'a sans doute pas été enregistrée ({negatifs.slice(0,3).map(l=>l.nom).join(", ")}{negatifs.length>3?"…":""}).</p>}
      </Card>}

      <Card style={{overflow:"hidden"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"12px 16px",borderBottom:`1px solid ${C.border}`,gap:8,flexWrap:"wrap"}}>
          <label style={{fontSize:12,color:C.textSec,display:"flex",alignItems:"center",gap:6,cursor:"pointer"}}>
            <input type="checkbox" checked={voirTout} onChange={e=>setVoirTout(e.target.checked)}/>Afficher les produits sans mouvement</label>
          <button onClick={exporter} disabled={!calc.length} style={{padding:"7px 12px",borderRadius:8,border:`1px solid ${C.border}`,background:"transparent",cursor:"pointer",display:"flex",alignItems:"center",gap:6,fontSize:12,color:C.textSec}}><Icon n="download" sz={14}/>Excel</button>
        </div>
        {!visibles.length&&<p style={{margin:0,padding:20,fontSize:13,color:C.textMuted,textAlign:"center"}}>Aucune consommation sur cette période.</p>}
        {visibles.map((l,i)=>{
          const neg=Number(l.consommation)<0;
          return<div key={l.product_id} style={{padding:"10px 16px",borderTop:i?`1px solid ${C.border}`:"none",display:"flex",alignItems:"center",gap:10}}>
            <div style={{flex:1,minWidth:0}}>
              <p style={{margin:0,fontSize:13,fontWeight:600,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{l.nom}</p>
              <p style={{margin:0,fontSize:11,color:C.textMuted}}>{nb(l.stock_debut)} + {nb(l.entrees)} livré − {nb(l.stock_fin)} · {fmtPrix(l.prix)}/{l.unite}</p>
            </div>
            <div style={{textAlign:"right"}}>
              <p style={{margin:0,fontSize:13,fontWeight:700,color:neg?C.danger:C.text}}>{nb(l.consommation)} {l.unite}</p>
              <p style={{margin:0,fontSize:11,color:C.textSec}}>{fmtPrix(l.valeur)}</p>
            </div>
          </div>;
        })}
      </Card>
    </>}
  </div>;
}
