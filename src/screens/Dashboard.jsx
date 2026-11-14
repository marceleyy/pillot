import { C, Icon, gst, gqt, fmt, fmtDay, Gauge, Card } from "../ui";

// ── DASHBOARD ─────────────────────────────────────────────────
export default function Dashboard({profile,products,onTab}){
  const rest=profile?.restaurants;
  const rup=products.filter(p=>gst(p)==="rupture");
  const cmd=products.filter(p=>gst(p)==="commander");
  const ok=products.filter(p=>gst(p)==="ok");
  const ns=products.filter(p=>gst(p)==="non_saisi");
  const rs=rest?.ratio_sale||0,rsu=rest?.ratio_sucre||0,obj=rest?.objectif||0.25;
  const ca_s=rest?.ca_sale||0,ca_su=rest?.ca_sucre||0;

  function StatCard({icon,label,value,sub,color,bg,onClick}){
    return<Card onClick={onClick} style={{padding:"18px 20px"}}>
      <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between"}}>
        <div>
          <p style={{margin:0,fontSize:11,fontWeight:700,color:C.textSec,textTransform:"uppercase",letterSpacing:".5px"}}>{label}</p>
          <p style={{margin:"8px 0 0",fontSize:32,fontWeight:800,color:color||C.text,lineHeight:1}}>{value}</p>
          {sub&&<p style={{margin:"4px 0 0",fontSize:12,color:C.textMuted}}>{sub}</p>}
        </div>
        <div style={{width:44,height:44,borderRadius:12,background:bg||C.brandLight,display:"flex",alignItems:"center",justifyContent:"center"}}>
          <Icon n={icon} sz={20} c={color||C.brand}/>
        </div>
      </div>
    </Card>;
  }

  return<div>
    <div style={{marginBottom:24}}>
      <h1 style={{margin:0,fontSize:22,fontWeight:800,color:C.text,letterSpacing:"-.5px"}}>Tableau de bord</h1>
      <p style={{margin:"4px 0 0",fontSize:14,color:C.textSec}}>{rest?.name} · {fmtDay(new Date())}</p>
    </div>
    <div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:12,marginBottom:20}}>
      <StatCard icon="alert" label="Ruptures" value={rup.length} sub="stocks épuisés" color={rup.length>0?C.danger:C.textMuted} bg={rup.length>0?C.dangerLight:"#F8FAFC"} onClick={()=>onTab("commandes")}/>
      <StatCard icon="cart" label="À commander" value={cmd.length} sub="sous le minimum" color={cmd.length>0?C.warning:C.textMuted} bg={cmd.length>0?C.warningLight:"#F8FAFC"} onClick={()=>onTab("commandes")}/>
      <StatCard icon="check" label="OK" value={ok.length} sub="stocks suffisants" color={C.success} bg={C.successLight}/>
      <StatCard icon="box" label="Non saisis" value={ns.length} sub="à mettre à jour" color={C.textSec} bg="#F8FAFC" onClick={()=>onTab("stocks")}/>
    </div>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:20}}>
      {[["SALE","Côté Salé",rs,ca_s],["SUCRE","Côté Sucré",rsu,ca_su]].map(([k,l,r,ca])=>(
        <Card key={k} style={{padding:"18px",textAlign:"center"}}>
          <p style={{margin:"0 0 4px",fontSize:11,fontWeight:700,color:C.textSec,textTransform:"uppercase",letterSpacing:".5px"}}>{l}</p>
          <Gauge ratio={r} obj={obj}/>
          {ca>0?<div style={{marginTop:6,padding:"3px 10px",borderRadius:20,display:"inline-block",background:r<=obj?C.successLight:C.dangerLight}}>
            <span style={{fontSize:11,fontWeight:700,color:r<=obj?C.success:C.danger}}>{r<=obj?"Dans l'objectif":`+${((r-obj)*100).toFixed(1)}% au-dessus`}</span>
          </div>:<button onClick={()=>onTab("settings")} style={{marginTop:8,fontSize:12,color:C.brand,background:"none",border:"none",cursor:"pointer",fontWeight:500}}>Saisir le CA →</button>}
          {ca>0&&<p style={{margin:"6px 0 0",fontSize:11,color:C.textMuted}}>CA {fmt(ca)}</p>}
        </Card>
      ))}
    </div>
    {rup.length>0&&<Card style={{overflow:"hidden",marginBottom:20}}>
      <div style={{padding:"12px 18px",borderBottom:`1px solid ${C.border}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div style={{display:"flex",alignItems:"center",gap:8}}><Icon n="alert" sz={15} c={C.danger}/><span style={{fontSize:14,fontWeight:700}}>Ruptures à traiter</span></div>
        <button onClick={()=>onTab("commandes")} style={{fontSize:12,color:C.brand,background:"none",border:"none",cursor:"pointer",fontWeight:600}}>Générer commandes →</button>
      </div>
      {rup.slice(0,5).map(p=><div key={p.id} style={{padding:"10px 18px",borderBottom:`1px solid ${C.border}`,display:"flex",alignItems:"center",gap:10}}>
        <span style={{width:8,height:8,borderRadius:"50%",background:C.danger,display:"inline-block",flexShrink:0}}/>
        <div style={{flex:1}}><p style={{margin:0,fontSize:13,fontWeight:500}}>{p.nom}</p><p style={{margin:0,fontSize:11,color:C.textSec}}>{p.fournisseur}</p></div>
        <span style={{fontSize:12,fontWeight:700,color:C.danger}}>Commander {gqt(p)} {p.unite}</span>
      </div>)}
    </Card>}
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
      <Card onClick={()=>onTab("haccp")} style={{padding:"16px 18px",display:"flex",alignItems:"center",gap:12}}>
        <div style={{width:40,height:40,borderRadius:10,background:"#FFF7ED",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}><Icon n="thermometer" sz={20} c="#EA580C"/></div>
        <div><p style={{margin:0,fontSize:13,fontWeight:700}}>HACCP</p><p style={{margin:0,fontSize:11,color:C.textSec}}>Températures & nettoyage</p></div>
      </Card>
      <Card onClick={()=>onTab("recettes")} style={{padding:"16px 18px",display:"flex",alignItems:"center",gap:12}}>
        <div style={{width:40,height:40,borderRadius:10,background:C.purpleLight,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}><Icon n="book" sz={20} c={C.purple}/></div>
        <div><p style={{margin:0,fontSize:13,fontWeight:700}}>Fiches techniques</p><p style={{margin:0,fontSize:11,color:C.textSec}}>Recettes & coûts</p></div>
      </Card>
    </div>
  </div>;
}
