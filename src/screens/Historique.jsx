import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { C, Icon, fmt, Chip, Card } from "../ui";
import { PARAMETRES_DEFAUT } from "../parametres";

// ── HISTORIQUE ────────────────────────────────────────────────
export default function Historique({restaurantId,params=PARAMETRES_DEFAUT}){
  const obj=params.objectif,alerte=obj*1.4;
  const [hist,setHist]=useState([]),[loading,setLoading]=useState(true);
  useEffect(()=>{const load=async()=>{const{data}=await supabase.from("ca_history").select("*").eq("restaurant_id",restaurantId).order("created_at",{ascending:false}).limit(20);setHist(data||[]);setLoading(false);};if(restaurantId)load();else setLoading(false);},[restaurantId]);
  const totCA=hist.reduce((a,h)=>a+(h.ca_sale||0)+(h.ca_sucre||0),0);
  const totCout=hist.reduce((a,h)=>a+(h.cout_sale||0)+(h.cout_sucre||0),0);
  const avg=totCA>0?totCout/totCA:0;

  // Mini bar chart SVG
  const BarChart=()=>{
    const data=hist.slice(0,8).reverse();if(!data.length)return null;
    const W=320,H=120,PL=28,PB=20,PT=10,PR=8;
    const IW=W-PL-PR,IH=H-PB-PT,maxV=50;
    const bw=IW/data.length,gap=8,bW=(bw-gap)/1;
    const yS=v=>PT+IH-(v/maxV)*IH;
    return<svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{overflow:"visible"}}>
      {[0,25,50].map(v=>{const y=yS(v);return<g key={v}>
        <line x1={PL} y1={y} x2={W-PR} y2={y} stroke={v===25?C.warning:"#E2E8F0"} strokeWidth={v===25?"1":"0.5"} strokeDasharray={v===25?"4,3":""}/>
        <text x={PL-4} y={y+3} textAnchor="end" fontSize="8" fill={C.textMuted}>{v}%</text>
      </g>;})}
      {data.map((h,i)=>{
        const x0=PL+i*bw+gap/2,rs=h.ratio_sale||0,col=rs<=obj?C.success:rs<=alerte?C.warning:C.danger;
        return<g key={h.id}>
          <rect x={x0} y={yS(rs*100)} width={bW-2} height={Math.max(2,(rs/0.5)*IH)} fill={col} rx="3"/>
          <text x={x0+(bW-2)/2} y={H-6} textAnchor="middle" fontSize="8" fill={C.textMuted}>{(h.periode||"").replace("Fin ","")}</text>
        </g>;
      })}
    </svg>;
  };

  if(loading)return<p style={{color:C.textMuted,padding:40,textAlign:"center"}}>Chargement...</p>;
  if(!hist.length)return<div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",minHeight:300,gap:12,textAlign:"center",padding:20}}>
    <div style={{width:64,height:64,borderRadius:"50%",background:"#F1F5F9",display:"flex",alignItems:"center",justifyContent:"center"}}><Icon n="chart" sz={28} c={C.textMuted}/></div>
    <h3 style={{margin:0,fontSize:18,fontWeight:700}}>Pas encore de données</h3>
    <p style={{margin:0,color:C.textSec,fontSize:14,maxWidth:280}}>L'historique se remplira automatiquement chaque dimanche via Google Sheets.</p>
  </div>;

  return<div>
    <div style={{marginBottom:20}}><h1 style={{margin:0,fontSize:22,fontWeight:800,letterSpacing:"-.5px"}}>Historique</h1><p style={{margin:"4px 0 0",fontSize:14,color:C.textSec}}>{hist.length} période{hist.length>1?"s":""}</p></div>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginBottom:16}}>
      {[["CA total",fmt(totCA),C.brand,"trend"],["Coût total",fmt(totCout),C.warning,"box"],["Ratio moyen",avg>0?(avg*100).toFixed(1)+"%":"—",avg<=obj?C.success:C.danger,"chart"]].map(([l,v,c,ic])=>(
        <Card key={l} style={{padding:"14px 16px"}}>
          <p style={{margin:"0 0 6px",fontSize:10,fontWeight:700,color:C.textSec,textTransform:"uppercase",letterSpacing:".5px"}}>{l}</p>
          <p style={{margin:0,fontSize:18,fontWeight:800,color:c}}>{v}</p>
        </Card>
      ))}
    </div>
    {hist.length>1&&<Card style={{padding:"16px 18px",marginBottom:16}}>
      <p style={{margin:"0 0 12px",fontSize:13,fontWeight:700}}>Évolution du ratio {params.nomSection("SALE")}</p>
      <BarChart/>
    </Card>}
    <Card style={{overflow:"hidden"}}>
      {hist.map((h,i)=>{
        const rs=h.ratio_sale||0,ru=h.ratio_sucre||0,col=rs<=obj?C.success:rs<=alerte?C.warning:C.danger;
        return<div key={h.id} style={{padding:"14px 18px",borderBottom:i<hist.length-1?`1px solid ${C.border}`:"none"}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              <span style={{fontSize:13,fontWeight:700}}>{h.periode}</span>
              {h.type==="mensuel"&&<span style={{fontSize:10,fontWeight:700,background:C.brandLight,color:C.brand,padding:"2px 8px",borderRadius:10}}>MENSUEL</span>}
            </div>
            <Chip status={rs<=obj?"ok":rs<=alerte?"commander":"rupture"} small/>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8}}>
            {[[`CA ${params.nomSection("SALE")}`,fmt(h.ca_sale)],[`Ratio ${params.nomSection("SALE")}`,(rs*100).toFixed(1)+"%"],...(params.sectionsActives.length>1?[[`CA ${params.nomSection("SUCRE")}`,fmt(h.ca_sucre)],[`Ratio ${params.nomSection("SUCRE")}`,(ru*100).toFixed(1)+"%"]]:[])].map(([l,v])=>(
              <div key={l}><p style={{margin:0,fontSize:10,color:C.textMuted}}>{l}</p><p style={{margin:0,fontSize:13,fontWeight:700}}>{v}</p></div>
            ))}
          </div>
        </div>;
      })}
    </Card>
  </div>;
}
