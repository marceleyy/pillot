import { useState } from "react";
import { C, Icon, gst, gqt, Card } from "../ui";

// ── COMMANDES ────────────────────────────────────────────────
export default function Commandes({products,profile,toast}){
  const [canaux,setCanaux]=useState({}),[ copied,setCopied]=useState(null);
  const opts=["WhatsApp","Email","SMS","Téléphone","PDF"];
  const alert=products.filter(p=>["rupture","commander"].includes(gst(p))&&p.stock_min>0);
  const fourns=[...new Set(alert.map(p=>p.fournisseur))];
  const genMsg=(f,ps)=>{
    const r=ps.filter(p=>gst(p)==="rupture"),c=ps.filter(p=>gst(p)==="commander");
    let m=`Bonjour,\nMerci de me livrer cette commande pour ${profile?.restaurants?.name||"Le restaurant"} :\n\n`;
    if(r.length){m+="RUPTURE - stocks épuisés :\n";r.forEach(p=>m+=`- ${p.nom} : ${gqt(p)} ${p.unite}\n`);m+="\n";}
    if(c.length){m+="À commander :\n";c.forEach(p=>m+=`- ${p.nom} : ${gqt(p)} ${p.unite}\n`);m+="\n";}
    return m+"Merci d'avance,\n"+(profile?.restaurants?.name||"Le restaurant");
  };
  const copy=(f,msg)=>{navigator.clipboard?.writeText(msg);setCopied(f);toast("Message copié !");setTimeout(()=>setCopied(null),2000);};
  if(!fourns.length)return<div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",minHeight:300,gap:12}}>
    <div style={{width:64,height:64,borderRadius:"50%",background:C.successLight,display:"flex",alignItems:"center",justifyContent:"center"}}><Icon n="check" sz={28} c={C.success}/></div>
    <h3 style={{margin:0,fontSize:18,fontWeight:700}}>Tout est en ordre</h3>
    <p style={{margin:0,color:C.textSec,fontSize:14}}>Aucun produit à commander</p>
  </div>;
  return<div>
    <div style={{marginBottom:20}}><h1 style={{margin:0,fontSize:22,fontWeight:800,letterSpacing:"-.5px"}}>Commandes</h1><p style={{margin:"4px 0 0",fontSize:14,color:C.textSec}}>{alert.length} produits · {fourns.length} fournisseurs</p></div>
    {fourns.map(f=>{
      const fp=alert.filter(p=>p.fournisseur===f),col=C.fourn[f]||"#374151",canal=canaux[f]||"WhatsApp";
      const rup=fp.filter(p=>gst(p)==="rupture"),cmd=fp.filter(p=>gst(p)==="commander"),msg=genMsg(f,fp);
      return<Card key={f} style={{marginBottom:16,overflow:"hidden"}}>
        <div style={{background:`linear-gradient(135deg,${col},${col}BB)`,padding:"15px 18px",color:"#fff"}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
            <div><p style={{margin:0,fontSize:16,fontWeight:800}}>{f}</p><p style={{margin:"2px 0 0",fontSize:12,opacity:.8}}>{fp.length} produit{fp.length>1?"s":""} à commander</p></div>
            <div style={{display:"flex",gap:5}}>
              {rup.length>0&&<span style={{background:"rgba(255,255,255,.25)",padding:"3px 9px",borderRadius:20,fontSize:11,fontWeight:700}}>{rup.length} rupture{rup.length>1?"s":""}</span>}
            </div>
          </div>
        </div>
        <div style={{padding:"10px 14px",borderBottom:`1px solid ${C.border}`,display:"flex",gap:5,flexWrap:"wrap"}}>
          {opts.map(c=><button key={c} onClick={()=>setCanaux(p=>({...p,[f]:c}))} style={{padding:"5px 11px",borderRadius:8,border:`1px solid ${canal===c?col:C.border}`,fontSize:11,cursor:"pointer",background:canal===c?col:"transparent",color:canal===c?"#fff":C.textSec,fontWeight:canal===c?700:400}}>{c}</button>)}
        </div>
        {rup.length>0&&<div style={{padding:"11px 14px",background:C.dangerLight,borderBottom:`1px solid ${C.border}`}}>
          <p style={{margin:"0 0 7px",fontSize:10,fontWeight:700,color:C.danger,textTransform:"uppercase",letterSpacing:".5px"}}>🔴 Ruptures</p>
          {rup.map(p=><div key={p.id} style={{display:"flex",justifyContent:"space-between",padding:"4px 0",borderTop:"1px solid rgba(220,38,38,.1)"}}>
            <span style={{fontSize:13}}>{p.nom}</span><span style={{fontSize:13,fontWeight:800,color:C.danger}}>{gqt(p)} {p.unite}</span>
          </div>)}
        </div>}
        {cmd.length>0&&<div style={{padding:"11px 14px",borderBottom:`1px solid ${C.border}`}}>
          <p style={{margin:"0 0 7px",fontSize:10,fontWeight:700,color:C.warning,textTransform:"uppercase",letterSpacing:".5px"}}>À commander</p>
          {cmd.map(p=><div key={p.id} style={{display:"flex",justifyContent:"space-between",padding:"4px 0",borderTop:`1px solid ${C.border}`}}>
            <span style={{fontSize:13}}>{p.nom} <span style={{fontSize:11,color:C.textMuted}}>({p.stock}/{p.stock_min})</span></span>
            <span style={{fontSize:13,fontWeight:700,color:C.warning}}>{gqt(p)} {p.unite}</span>
          </div>)}
        </div>}
        <div style={{padding:"12px 14px"}}>
          <p style={{margin:"0 0 7px",fontSize:10,fontWeight:700,color:C.textSec,textTransform:"uppercase",letterSpacing:".5px"}}>Message {canal}</p>
          <div style={{background:"#F8FAFC",border:`1px solid ${C.border}`,borderRadius:10,padding:"11px 13px",fontFamily:"monospace",fontSize:12,whiteSpace:"pre-wrap",lineHeight:1.6,maxHeight:150,overflow:"auto",marginBottom:10}}>{msg}</div>
          <button onClick={()=>copy(f,msg)} style={{width:"100%",padding:11,background:copied===f?C.success:col,color:"#fff",border:"none",borderRadius:10,fontSize:14,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:8,transition:"background .2s",boxShadow:`0 4px 12px ${col}40`}}>
            <Icon n={copied===f?"check":"copy"} sz={16}/>{copied===f?"Copié !":"Copier pour "+canal}
          </button>
        </div>
      </Card>;
    })}
  </div>;
}
