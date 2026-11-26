import { C, gst, fmt, fmtDay, Gauge, Card } from "../ui";
import { PARAMETRES_DEFAUT } from "../parametres";
import { CarteConformite } from "./TourControle";
import { jourLocal, enRetard } from "../lib/taches";
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
    mod.reparations!==false&&{id:"ouv",label:gerant?"Tâches ouvertes":"Mes tâches ouvertes",valeur:ouvertes?.length,couleur:C.brand,tab:"reparations"},
    mod.reparations!==false&&{id:"urg",label:"Urgentes / en retard",valeur:urg,couleur:C.danger,tab:"reparations"},
    {id:"rup",label:"Ruptures",valeur:rup,couleur:C.danger,tab:mod.commandes!==false?"commandes":"stocks"},
    {id:"cmd",label:"À commander",sous:"sous le minimum",valeur:cmd,couleur:C.warning,tab:mod.commandes!==false?"commandes":"stocks"},
    mod.haccp!==false&&{id:"dlc",label:"DLC à surveiller",sous:`périmées ou sous ${DLC_JOURS} jours`,valeur:dlc,couleur:C.warning,tab:"haccp"},
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

  return<div>
    <style>{STYLE_GRILLE}</style>
    <div style={{marginBottom:18}}>
      <h1 style={{margin:0,fontSize:24,fontWeight:800,color:C.text,letterSpacing:"-.5px"}}>Bonjour{prenom?` ${prenom}`:""} !</h1>
      <p style={{margin:"4px 0 0",fontSize:13,color:C.textSec}}>{rest?.name} · {fmtDay(new Date())}</p>
    </div>
    <Compteurs items={compteurs}/>
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
    {gerant&&<div style={{display:"grid",gridTemplateColumns:params.deuxSections?"1fr 1fr":"1fr",gap:12,marginBottom:20}}>
      {[["SALE",rs,ca_s],["SUCRE",rsu,ca_su]].filter(([k])=>params.sectionsActives.some(x=>x.code===k)).map(([k,r,ca])=>[k,params.nomSection(k),r,ca]).map(([k,l,r,ca])=>(
        <Card key={k} style={{padding:"18px",textAlign:"center"}}>
          <p style={{margin:"0 0 4px",fontSize:11,fontWeight:700,color:C.textSec,textTransform:"uppercase",letterSpacing:".5px"}}>{l}</p>
          <Gauge ratio={r} obj={obj}/>
          {ca>0?<div style={{marginTop:6,padding:"3px 10px",borderRadius:20,display:"inline-block",background:r<=obj?C.successLight:C.dangerLight}}>
            <span style={{fontSize:11,fontWeight:700,color:r<=obj?C.success:C.danger}}>{r<=obj?"Dans l'objectif":`+${((r-obj)*100).toFixed(1)}% au-dessus`}</span>
          </div>:<button onClick={()=>onTab("settings")} style={{marginTop:8,fontSize:12,color:C.brand,background:"none",border:"none",cursor:"pointer",fontWeight:500}}>Saisir le CA →</button>}
          {ca>0&&<p style={{margin:"6px 0 0",fontSize:11,color:C.textMuted}}>CA {fmt(ca)}</p>}
        </Card>
      ))}
    </div>}
    {gerant&&profile?.restaurant_id&&(mod.haccp!==false||mod.taches!==false)&&<CarteConformite restaurantId={profile?.restaurant_id} onTab={onTab} modules={mod}/>}
  </div>;
}
