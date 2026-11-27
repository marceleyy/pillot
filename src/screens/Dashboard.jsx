import { gst, fmtDay, fmtPrix } from "../ui";
import { T, STYLE_VERRE, Courbe, Anneau, Jauge } from "../verre";
import { PARAMETRES_DEFAUT } from "../parametres";
import { CarteConformite } from "./TourControle";
import { jourLocal, enRetard } from "../lib/taches";
import { useMemo } from "react";
import { useTableauDeBord, DLC_JOURS, checklistDuJour, evenements, Compteurs, ActionsPrioritaires, Aujourdhui, AccesRapides, Calendrier, EtatStock, Achats } from "./TableauDeBord";

// Grille du tableau de bord : 3 colonnes sur grand écran, une seule (blocs réordonnés) en dessous de 1000 px.
const STYLE_GRILLE=`.pd-compteurs{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:12px;margin-bottom:16px}
.pd-grille{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px;align-items:start;margin-bottom:20px}
.pd-col{display:flex;flex-direction:column;gap:16px;min-width:0}
@media(max-width:1000px){.pd-grille{display:flex;flex-direction:column;align-items:stretch}.pd-col{display:contents}.pd-o1{order:1}.pd-o2{order:2}.pd-o3{order:3}.pd-o4{order:4}.pd-o5{order:5}.pd-o6{order:6}}
@media(max-width:520px){.pd-compteurs{grid-template-columns:repeat(2,1fr)}}`;

// ── DASHBOARD ─────────────────────────────────────────────────
export default function Dashboard({profile,products,onTab,params=PARAMETRES_DEFAUT,gerant=false,toast}){
  const rest=profile?.restaurants,mod=params.modules;
  const rs=rest?.ratio_sale||0,rsu=rest?.ratio_sucre||0,obj=params.objectif;
  const ca_s=rest?.ca_sale||0,ca_su=rest?.ca_sucre||0;
  const [d,recharger]=useTableauDeBord({restaurantId:profile?.restaurant_id,gerant,modules:mod});
  const evs=evenements(d);
  const checklist=checklistDuJour(d?.tasks,d?.comp);
  const auj=jourLocal(),dans3=new Date(auj+"T12:00");dans3.setDate(dans3.getDate()+DLC_JOURS);
  const rup=products.filter(p=>gst(p)==="rupture").length,cmd=products.filter(p=>gst(p)==="commander").length;
  const ouvertes=gerant?d?.taches:d?.taches?.filter(t=>t.assignee_id===profile?.id),urg=ouvertes?.filter(t=>enRetard(t)||t.priorite==="urgente").length;
  const dlc=d?.dlc?.filter(x=>x.dlc_date<=jourLocal(dans3)).length;
  const compteurs=[
    mod.reparations!==false&&{id:"ouv",label:gerant?"Tâches ouvertes":"Mes tâches ouvertes",valeur:ouvertes?.length,couleur:T.brand,tab:"reparations"},
    mod.reparations!==false&&{id:"urg",label:"Urgentes / en retard",valeur:urg,couleur:T.danger,tab:"reparations"},
    {id:"rup",label:"Ruptures",valeur:rup,couleur:T.danger,tab:mod.commandes!==false?"commandes":"stocks"},
    {id:"cmd",label:"À commander",sous:"sous le minimum",valeur:cmd,couleur:T.warning,tab:mod.commandes!==false?"commandes":"stocks"},
    mod.haccp!==false&&{id:"dlc",label:"DLC à surveiller",sous:`périmées ou sous ${DLC_JOURS} jours`,valeur:dlc,couleur:T.warning,tab:"haccp"},
  ].filter(Boolean).map(k=>({...k,onClick:()=>onTab(k.tab)}));
  const liens=[
    gerant&&mod.reparations!==false&&["reparations","Nouvelle tâche","plus"],
    mod.commandes!==false&&["commandes","Enregistrer une livraison","box"],
    mod.haccp!==false&&["haccp","Relever une température","thermometer"],
    ["stocks","Faire l'inventaire","clipboard"],
    gerant&&mod.recettes!==false&&["recettes","Fiches techniques","book"],
    gerant&&mod.scan!==false&&["scan","Scanner une facture","upload"],
  ].filter(Boolean).slice(0,6);
  const prenom=String(profile?.name||"").trim().split(/\s+/)[0];

  // Achats par mois depuis janvier (factures et livraisons enregistrées, HT).
  const achatsMois=useMemo(()=>{
    if(!d?.achats)return d?.achats;
    const auj=jourLocal(),n=Number(auj.slice(5,7)),serie=Array(n).fill(0);
    d.achats.forEach(a=>{const m=Number(String(a.date_facture||"").slice(5,7));if(m>=1&&m<=n)serie[m-1]+=Number(a.total_ht)||0;});
    return{serie,mois:serie[n-1],annee:serie.reduce((x,y)=>x+y,0),nb:d.achats.length};
  },[d?.achats]);
  const nomMois=new Date().toLocaleDateString("fr-FR",{month:"long"});

  // À surveiller : DLC proches ou dépassées, tâches en retard ou urgentes.
  const surveiller=evs.filter(e=>e.ton==="rouge"||e.ton==="orange").slice(0,3);
  const fmtJ=s=>new Date(s+"T12:00").toLocaleDateString("fr-FR",{day:"numeric",month:"short"});

  // Cartes colorées : état du stock, relevés, check-list, ratios matière.
  const zones=[
    {id:"stock",t:"État du stock",v:rup?`${rup} rupture${rup>1?"s":""}`:cmd?`${cmd} à commander`:"Tout est en stock",s:rup&&cmd?`et ${cmd} à commander`:`${products.length} produit${products.length>1?"s":""}`,tab:mod.commandes!==false&&(rup||cmd)?"commandes":"stocks",
      viz:<Anneau part={products.length?(products.length-rup-cmd)/products.length:0} texte={products.length?`${Math.round((products.length-rup-cmd)/products.length*100)}%`:"–"}/>},
    mod.haccp!==false&&d?.temp&&(()=>{const faits=new Set(d.temp.map(t=>t.equipement)).size,hors=d.temp.filter(t=>(t.temperature_max!=null&&Number(t.temperature)>Number(t.temperature_max))||(t.temperature_min!=null&&Number(t.temperature)<Number(t.temperature_min))).length;
      return{id:"temp",t:"Températures du jour",v:hors?`${hors} écart${hors>1?"s":""}`:faits?`${faits} relevé${faits>1?"s":""}`:"Aucun relevé",s:hors?"à traiter":faits?"équipements relevés":"à faire aujourd'hui",tab:"haccp",viz:<Anneau part={hors?0.25:faits?1:0} texte={hors?"!":faits?"OK":"0"}/>};})(),
    checklist&&checklist.prevu>0&&{id:"check",t:"Check-list du jour",v:`${checklist.fait} sur ${checklist.prevu}`,s:checklist.fait===checklist.prevu?"tout est fait":`${checklist.prevu-checklist.fait} restante${checklist.prevu-checklist.fait>1?"s":""}`,tab:"taches",viz:<Anneau part={checklist.fait/checklist.prevu} texte={`${checklist.fait}/${checklist.prevu}`}/>},
    ...(gerant?[["SALE",rs,ca_s],["SUCRE",rsu,ca_su]].filter(([k])=>params.sectionsActives.some(x=>x.code===k)).map(([k,r,ca])=>({id:k,t:`Ratio ${params.nomSection(k).toLowerCase()}`,
      v:ca>0?`${(r*100).toFixed(1).replace(".",",")} %`:"CA à saisir",s:ca>0?(r<=obj?`dans l'objectif de ${Math.round(obj*100)} %`:`${((r-obj)*100).toFixed(1).replace(".",",")} pt au-dessus de l'objectif`):"pour calculer le ratio",tab:ca>0?"historique":"settings",
      viz:<Jauge part={ca>0?Math.min(r*100,50)/50:0} texte={ca>0?`${Math.round(r*100)} %`:"–"}/>})):[]),
  ].filter(Boolean);
  const teintes=["pv-g4","pv-g5","pv-g6","pv-g7","pv-g3"];

  const hero=gerant?<section className="pv-hero" aria-label="Achats">
      <div className="pv-flags"><span>Achats {new Date().getFullYear()}</span><span>HT</span></div>
      {achatsMois?.serie?.length>1&&achatsMois.annee>0&&<Courbe valeurs={achatsMois.serie} couleur="var(--pv-hero-line)" className="pv-courbe"/>}
      <h2>{achatsMois===null?"Achats : chargement…":achatsMois===undefined?"Achats indisponibles":`${fmtPrix(achatsMois.mois)} d'achats en ${nomMois}`}</h2>
      {achatsMois&&<p>{achatsMois.annee>0?`${fmtPrix(achatsMois.annee)} depuis janvier, ${achatsMois.nb} facture${achatsMois.nb>1?"s":""} ou livraison${achatsMois.nb>1?"s":""} enregistrée${achatsMois.nb>1?"s":""}.`:"Aucune facture ni livraison enregistrée cette année."}</p>}
      <div className="pv-actions">
        {mod.historique!==false&&<button type="button" className="pv-btn" onClick={()=>onTab("historique")}>Voir les coûts</button>}
        {mod.scan!==false&&<button type="button" className="pv-btn pv-gh" onClick={()=>onTab("scan")}>Scanner une facture</button>}
      </div>
    </section>
    :<section className="pv-hero" aria-label="Votre journée">
      <div className="pv-flags"><span>{fmtDay(new Date())}</span></div>
      <h2>{checklist&&checklist.prevu>0?`Check-list : ${checklist.fait} sur ${checklist.prevu}`:"Bonne journée"}</h2>
      <p>{urg?`${urg} tâche${urg>1?"s":""} urgente${urg>1?"s":""} ou en retard vous attend${urg>1?"ent":""}.`:"Vos tâches et relevés du jour sont ci-dessous."}</p>
      <div className="pv-actions">{mod.taches!==false&&<button type="button" className="pv-btn" onClick={()=>onTab("taches")}>Ouvrir la check-list</button>}</div>
    </section>;

  return<div className="pv-verre" data-piste="clair">
    <style>{STYLE_GRILLE+STYLE_VERRE}</style>
    <div className="pv-fenetre">
    <div style={{marginBottom:16}}>
      <h1 style={{margin:0,fontSize:24,fontWeight:800,color:T.text,letterSpacing:"-.5px"}}>Bonjour{prenom?` ${prenom}`:""} !</h1>
      <p style={{margin:"4px 0 0",fontSize:13,color:T.textSec}}>{rest?.name} · {fmtDay(new Date())}</p>
    </div>
    <Compteurs items={compteurs}/>
    <div className="pv-haut">
      <div className="pv-col">
        <div className="pv-titre">À surveiller<small>{surveiller.length?`${surveiller.length} élément${surveiller.length>1?"s":""}`:""}</small></div>
        {!d&&<p style={{fontSize:13,color:T.textMuted}}>Chargement…</p>}
        {d&&!surveiller.length&&<div className="pv-bloc" style={{padding:"14px",fontSize:13,color:T.textSec}}>Rien d'urgent : aucune DLC proche ni tâche en retard.</div>}
        {surveiller.map((e,i)=><button type="button" key={e.id} className={`pv-mini ${e.ton==="rouge"?"pv-g1":"pv-g2"}`} style={{animationDelay:`${.1+i*.06}s`}} onClick={()=>onTab(e.tab)}>
          <span className="pv-etiq"><span>{e.type}</span><span>{fmtJ(e.date)}</span></span>
          <b>{e.titre.replace(/^DLC : /,"")}</b>
        </button>)}
      </div>
      {hero}
    </div>
    {zones.length>0&&<>
      <p className="pv-section">Zones à surveiller</p>
      <div className="pv-zones">{zones.map((z,i)=><button type="button" key={z.id} className={`pv-zone ${teintes[i%teintes.length]}`} style={{animationDelay:`${.15+i*.05}s`}} onClick={()=>onTab(z.tab)}>
        <span className="pv-z-t">{z.t}</span><b>{z.v}</b><span className="pv-z-s">{z.s}</span><span className="pv-viz">{z.viz}</span>
      </button>)}</div>
    </>}
    <div className="pd-grille">
      <div className="pd-col">
        {mod.reparations!==false&&<div className="pd-o1"><ActionsPrioritaires taches={d?d.taches:null} gerant={gerant} profileId={profile?.id} onTab={onTab} toast={toast} onChange={recharger}/></div>}
        <div className="pd-o5"><EtatStock products={products} onTab={onTab} commandes={mod.commandes!==false}/></div>
      </div>
      <div className="pd-col">
        <div className="pd-o2"><Aujourdhui d={d} checklist={checklist} onTab={onTab}/></div>
        {gerant&&<div className="pd-o6"><Achats achats={d?d.achats:null} products={products} onTab={onTab} detail={mod.historique!==false}/></div>}
      </div>
      <div className="pd-col">
        <div className="pd-o3"><AccesRapides liens={liens} onTab={onTab}/></div>
        {(mod.reparations!==false||mod.haccp!==false)&&<div className="pd-o4"><Calendrier evs={evs} onTab={onTab} charge={!!d}/></div>}
      </div>
    </div>
    {gerant&&profile?.restaurant_id&&(mod.haccp!==false||mod.taches!==false)&&<CarteConformite restaurantId={profile?.restaurant_id} onTab={onTab} modules={mod}/>}
    </div>
  </div>;
}
