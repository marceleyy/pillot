import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import * as XLSX from "xlsx";
import { C, Icon, gst, qteNum, valeurProduits, fmtPrix, fmtDate, Card } from "../ui";

// ── INVENTAIRE ────────────────────────────────────────────────
export default function Inventaire({products,restaurantId,onStockUpdate,toast}){
  const [cote,setCote]=useState("SALE"),[search,setSearch]=useState(""),[editId,setEditId]=useState(null),[editVal,setEditVal]=useState(""),[saving,setSaving]=useState(false),[showHist,setShowHist]=useState(false),[hist,setHist]=useState([]),[loadingHist,setLoadingHist]=useState(false);
  const cleBrouillon=`pillot:inventaire:${restaurantId}`;
  const [mode,setMode]=useState("liste"),[histTab,setHistTab]=useState("inventaires"),[invs,setInvs]=useState([]),[invErr,setInvErr]=useState(false),[selInv,setSelInv]=useState(null),[validating,setValidating]=useState(false);
  // Comptage en cours : { product_id: "quantité saisie" }, gardé dans le navigateur tant qu'il n'est pas validé.
  const [counts,setCounts]=useState(()=>{try{const s=JSON.parse(localStorage.getItem(cleBrouillon)||"{}");return s&&typeof s==="object"&&!Array.isArray(s)?s:{};}catch{return{};}});
  useEffect(()=>{if(!restaurantId)return;try{if(Object.keys(counts).length)localStorage.setItem(cleBrouillon,JSON.stringify(counts));else localStorage.removeItem(cleBrouillon);}catch{/* stockage indisponible */}},[counts,cleBrouillon,restaurantId]);
  const majCount=(id,v)=>setCounts(prev=>{const n={...prev};if(String(v).trim()==="")delete n[id];else n[id]=v;return n;});
  const comptes=products.filter(p=>qteNum(counts[p.id])!==null);
  const nbInvalides=products.filter(p=>counts[p.id]!==undefined&&qteNum(counts[p.id])===null).length;

  const loadInventaires=async()=>{
    const{data,error}=await supabase.from("inventories").select("*").eq("restaurant_id",restaurantId).order("created_at",{ascending:false}).limit(30);
    setInvErr(!!error);setInvs(data||[]);
  };

  const validerInventaire=async()=>{
    if(!comptes.length||nbInvalides||validating)return;
    setValidating(true);
    const lignes=comptes.map(p=>({product_id:p.id,quantite:qteNum(counts[p.id])}));
    const{error}=await supabase.rpc("valider_inventaire",{p_lignes:lignes});
    setValidating(false);
    if(error){toast("Inventaire non enregistré, réessayez","error");return;}
    lignes.forEach(l=>onStockUpdate(l.product_id,l.quantite));
    setCounts({});setMode("liste");
    toast(`Inventaire enregistré : ${lignes.length} produit${lignes.length>1?"s":""}`);
  };

  const loadHistory=async()=>{
    setLoadingHist(true);
    const{data}=await supabase.from("stock_entries").select("*,products(nom,unite,fournisseur)").eq("restaurant_id",restaurantId).order("created_at",{ascending:false}).limit(60);
    setHist(data||[]);
  };

  const cats=[...new Set(products.filter(p=>p.cote===cote).map(p=>p.categorie))];
  const filtered=products.filter(p=>p.cote===cote&&(!search||p.nom.toLowerCase().includes(search.toLowerCase())||p.fournisseur?.toLowerCase().includes(search.toLowerCase())));

  const saveStock=async(product)=>{
    setSaving(true);const v=parseFloat(editVal);
    if(!isNaN(v)&&v>=0){
      const{error}=await supabase.from("stock_entries").insert({product_id:product.id,restaurant_id:restaurantId,stock_reel:v});
      if(!error){onStockUpdate(product.id,v);toast("Stock mis à jour");}else toast("Erreur","error");
    }
    setEditId(null);setSaving(false);
  };

  const exportExcel=()=>{
    const ST={rupture:"Rupture",commander:"À commander",ok:"OK",non_saisi:"Non saisi",non_suivi:"Non suivi"};
    const rows=[...products].sort((a,b)=>(a.cote||"").localeCompare(b.cote||"")||(a.categorie||"").localeCompare(b.categorie||"")||(a.nom||"").localeCompare(b.nom||"")).map(p=>{
      const stock=p.stock??null,prix=Number(p.prix_achat)||0;
      return{"Côté":p.cote==="SUCRE"?"Sucré":"Salé","Catégorie":p.categorie||"","Produit":p.nom,"Fournisseur":p.fournisseur||"","Unité":p.unite||"","Prix d'achat (€)":prix,"Stock":stock??"","Stock min":p.stock_min??"","Valeur stock (€)":stock!==null?Math.round(stock*prix*100)/100:"","Statut":ST[gst(p)]};
    });
    const ws=XLSX.utils.json_to_sheet(rows);
    ws["!cols"]=[8,18,34,20,10,14,8,10,16,12].map(w=>({wch:w}));
    const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,ws,"Inventaire");
    XLSX.writeFile(wb,`inventaire_${new Date().toISOString().slice(0,10)}.xlsx`);
    toast("Export Excel téléchargé");
  };

  const DOT={rupture:C.danger,commander:C.warning,ok:C.success,non_saisi:"#CBD5E1",non_suivi:C.textMuted};

  const BTN={padding:"8px 14px",borderRadius:8,border:`1px solid ${C.border}`,background:"transparent",cursor:"pointer",fontSize:13};
  const ecartStyle=d=>d===null?{c:C.textMuted,t:"nouveau"}:d===0?{c:C.textMuted,t:"="}:{c:d<0?C.danger:C.brand,t:(d>0?"+":"")+Math.round(d*100)/100};

  if(showHist&&selInv){
    const inv=selInv,ls=Array.isArray(inv.lignes)?inv.lignes:[];
    return<div>
      <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:16}}>
        <button onClick={()=>setSelInv(null)} style={BTN}>← Retour</button>
        <div><h1 style={{margin:0,fontSize:20,fontWeight:800}}>Inventaire du {fmtDate(inv.created_at)}</h1><p style={{margin:0,fontSize:13,color:C.textSec}}>{inv.nb_produits} produit{inv.nb_produits>1?"s":""} compté{inv.nb_produits>1?"s":""}</p></div>
      </div>
      <Card style={{padding:"14px 18px",marginBottom:14,display:"flex",gap:18,flexWrap:"wrap"}}>
        {[["Valeur",inv.valeur_totale],["Salé",inv.valeur_sale],["Sucré",inv.valeur_sucre]].map(([l,v],i)=><div key={l}><p style={{margin:0,fontSize:11,fontWeight:700,textTransform:"uppercase",letterSpacing:".5px",color:C.textSec}}>{l}</p><p style={{margin:"2px 0 0",fontSize:i?15:20,fontWeight:800}}>{fmtPrix(Number(v))}</p></div>)}
        <p style={{flexBasis:"100%",margin:0,fontSize:11,color:C.textMuted}}>Calculée avec les prix d'achat du jour de l'inventaire.{inv.nb_sans_prix>0?` ${inv.nb_sans_prix} produit${inv.nb_sans_prix>1?"s":""} sans prix, hors total.`:""}</p>
      </Card>
      <Card style={{overflow:"hidden"}}>
        {ls.map((l,i)=>{const q=Number(l.quantite),px=Number(l.prix)||0,av=l.avant===null||l.avant===undefined?null:Number(l.avant),e=ecartStyle(av===null?null:q-av);return<div key={l.product_id||i} style={{padding:"11px 18px",borderBottom:i<ls.length-1?`1px solid ${C.border}`:"none",display:"flex",alignItems:"center",gap:12}}>
          <div style={{flex:1,minWidth:0}}>
            <p style={{margin:0,fontSize:13,fontWeight:600,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{l.nom}</p>
            <p style={{margin:0,fontSize:11,color:C.textSec}}>{l.cote==="SUCRE"?"Sucré":"Salé"} · {l.categorie||"—"}{px>0?` · ${fmtPrix(px)}/${l.unite}`:""}</p>
          </div>
          <div style={{textAlign:"right",flexShrink:0}}>
            <p style={{margin:0,fontSize:13,fontWeight:700}}>{q} {l.unite} <span style={{fontSize:11,fontWeight:600,color:e.c}}>{e.t}</span></p>
            <p style={{margin:0,fontSize:11,color:px>0?C.textSec:C.warning}}>{px>0?fmtPrix(q*px):"sans prix"}</p>
          </div>
        </div>;})}
      </Card>
    </div>;
  }

  if(showHist)return<div>
    <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:16,flexWrap:"wrap"}}>
      <button onClick={()=>setShowHist(false)} style={BTN}>← Retour</button>
      <h1 style={{margin:0,fontSize:20,fontWeight:800,flex:1}}>Historique</h1>
      <div style={{display:"flex",gap:4,background:"#F1F5F9",padding:4,borderRadius:10}}>
        {[["inventaires","Inventaires"],["saisies","Saisies"]].map(([k,l])=><button key={k} onClick={()=>setHistTab(k)} style={{padding:"6px 14px",borderRadius:8,border:"none",fontSize:13,fontWeight:600,cursor:"pointer",background:histTab===k?C.surface:"transparent",color:histTab===k?C.text:C.textSec,boxShadow:histTab===k?"0 1px 4px rgba(0,0,0,.1)":"none"}}>{l}</button>)}
      </div>
    </div>
    {loadingHist?<p style={{color:C.textMuted,textAlign:"center",padding:40}}>Chargement...</p>:histTab==="inventaires"?(
      invErr?<Card style={{padding:30,textAlign:"center"}}><p style={{color:C.textSec,margin:0}}>Les inventaires ne sont pas encore disponibles sur ce compte.</p></Card>:
      invs.length===0?<Card style={{padding:40,textAlign:"center"}}><Icon n="history" sz={40} c={C.textMuted}/><p style={{color:C.textSec,marginTop:12}}>Aucun inventaire validé pour l'instant</p></Card>:
      <Card style={{overflow:"hidden"}}>
        {invs.map((inv,i)=>{return<div key={inv.id} onClick={()=>setSelInv(inv)} style={{padding:"12px 18px",borderBottom:i<invs.length-1?`1px solid ${C.border}`:"none",display:"flex",alignItems:"center",gap:12,cursor:"pointer"}}
          onMouseEnter={e=>e.currentTarget.style.background="#F8FAFC"} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
          <div style={{flex:1}}>
            <p style={{margin:0,fontSize:13,fontWeight:600}}>{fmtDate(inv.created_at)}</p>
            <p style={{margin:0,fontSize:11,color:C.textSec}}>{inv.nb_produits} produit{inv.nb_produits>1?"s":""}{inv.nb_sans_prix>0?` · ${inv.nb_sans_prix} sans prix`:""}</p>
          </div>
          <div style={{textAlign:"right"}}>
            <p style={{margin:0,fontSize:14,fontWeight:700}}>{fmtPrix(Number(inv.valeur_totale))}</p>
                      </div>
        </div>;})}
      </Card>
    ):hist.length===0?<Card style={{padding:40,textAlign:"center"}}><Icon n="history" sz={40} c={C.textMuted}/><p style={{color:C.textSec,marginTop:12}}>Aucune saisie pour l'instant</p></Card>:
    <Card style={{overflow:"hidden"}}>
      {hist.map((e,i)=><div key={e.id} style={{padding:"11px 18px",borderBottom:i<hist.length-1?`1px solid ${C.border}`:"none",display:"flex",alignItems:"center",gap:12}}>
        <div style={{width:36,height:36,borderRadius:10,background:C.brandLight,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,fontSize:14,fontWeight:700,color:C.brand}}>{e.stock_reel}</div>
        <div style={{flex:1}}>
          <p style={{margin:0,fontSize:13,fontWeight:600}}>{e.products?.nom||"—"}</p>
          <p style={{margin:0,fontSize:11,color:C.textSec}}>{fmtDate(e.created_at)}</p>
        </div>
        <span style={{fontSize:12,color:C.textMuted}}>{e.products?.unite}</span>
      </div>)}
    </Card>}
  </div>;

  const barreCote=<div style={{display:"flex",gap:4,background:"#F1F5F9",padding:4,borderRadius:10}}>
    {[["SALE","Salé"],["SUCRE","Sucré"]].map(([k,l])=><button key={k} onClick={()=>setCote(k)} style={{padding:"6px 14px",borderRadius:8,border:"none",fontSize:13,fontWeight:600,cursor:"pointer",background:cote===k?C.surface:"transparent",color:cote===k?C.text:C.textSec,boxShadow:cote===k?"0 1px 4px rgba(0,0,0,.1)":"none"}}>{l}</button>)}
  </div>;
  const barreRecherche=<div style={{position:"relative",marginBottom:14}}>
    <span style={{position:"absolute",left:12,top:"50%",transform:"translateY(-50%)",color:C.textMuted}}><Icon n="search" sz={16}/></span>
    <input type="text" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Rechercher un produit ou fournisseur..."
      style={{width:"100%",boxSizing:"border-box",padding:"10px 12px 10px 38px",borderRadius:10,border:`1.5px solid ${C.border}`,fontSize:13,outline:"none"}}
      onFocus={e=>e.target.style.borderColor=C.brand} onBlur={e=>e.target.style.borderColor=C.border}/>
  </div>;
  const PRIMARY={padding:"9px 16px",background:C.brand,color:"#fff",border:"none",borderRadius:8,fontSize:13,fontWeight:700,cursor:"pointer"};

  if(mode==="resume"){
    const ls=comptes.map(p=>{const q=qteNum(counts[p.id]),px=Number(p.prix_achat)||0,av=p.stock??null;return{p,q,px,d:av===null?null:q-av};})
      .sort((a,b)=>(b.d===null?-1:Math.abs(b.d))-(a.d===null?-1:Math.abs(a.d)));
    const tot=ls.reduce((s,l)=>s+(l.px>0?l.q*l.px:0),0),sp=ls.filter(l=>l.q>0&&!(l.px>0)).length,nbEcarts=ls.filter(l=>l.d!==null&&l.d!==0).length;
    return<div>
      <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:16}}>
        <button onClick={()=>setMode("comptage")} style={BTN}>← Modifier</button>
        <div><h1 style={{margin:0,fontSize:20,fontWeight:800}}>Résumé de l'inventaire</h1><p style={{margin:0,fontSize:13,color:C.textSec}}>{ls.length} produit{ls.length>1?"s":""} compté{ls.length>1?"s":""} · {nbEcarts} écart{nbEcarts>1?"s":""}</p></div>
      </div>
      <Card style={{padding:"14px 18px",marginBottom:14}}>
        <p style={{margin:0,fontSize:11,fontWeight:700,textTransform:"uppercase",letterSpacing:".5px",color:C.textSec}}>Valeur comptée</p>
        <p style={{margin:"2px 0 6px",fontSize:22,fontWeight:800}}>{fmtPrix(tot)}</p>
        {sp>0&&<p style={{margin:"0 0 4px",fontSize:12,color:C.warning}}>{sp} produit{sp>1?"s":""} sans prix d'achat, hors total.</p>}
        <p style={{margin:0,fontSize:12,color:C.textSec}}>Les prix d'achat du jour sont gardés avec cet inventaire. Les produits non comptés ne changent pas.</p>
      </Card>
      <Card style={{overflow:"hidden",marginBottom:14}}>
        {ls.map(({p,q,px,d},i)=>{const e=ecartStyle(d);return<div key={p.id} style={{padding:"11px 18px",borderBottom:i<ls.length-1?`1px solid ${C.border}`:"none",display:"flex",alignItems:"center",gap:12}}>
          <div style={{flex:1,minWidth:0}}>
            <p style={{margin:0,fontSize:13,fontWeight:600,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{p.nom}</p>
            <p style={{margin:0,fontSize:11,color:C.textSec}}>avant {p.stock??"—"} → compté {q} {p.unite}</p>
          </div>
          <div style={{textAlign:"right",flexShrink:0}}>
            <p style={{margin:0,fontSize:13,fontWeight:700,color:e.c}}>{e.t}</p>
            <p style={{margin:0,fontSize:11,color:px>0?C.textSec:C.warning}}>{px>0?fmtPrix(q*px):"sans prix"}</p>
          </div>
        </div>;})}
      </Card>
      <div style={{display:"flex",gap:10,justifyContent:"flex-end"}}>
        <button onClick={()=>setMode("comptage")} style={BTN}>Modifier</button>
        <button onClick={validerInventaire} disabled={validating||!ls.length} style={{...PRIMARY,opacity:validating?.6:1}}>{validating?"Enregistrement...":"Valider l'inventaire"}</button>
      </div>
    </div>;
  }

  if(mode==="comptage")return<div>
    <div style={{display:"flex",alignItems:"flex-start",gap:12,marginBottom:14,flexWrap:"wrap"}}>
      <button onClick={()=>setMode("liste")} style={BTN}>← Retour</button>
      <div style={{flex:1,minWidth:180}}><h1 style={{margin:0,fontSize:20,fontWeight:800}}>Faire l'inventaire</h1><p style={{margin:0,fontSize:13,color:C.textSec}}>Saisissez ce que vous comptez. Un produit laissé vide ne change pas.</p></div>
      {barreCote}
    </div>
    <Card style={{padding:"12px 16px",marginBottom:14,display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
      <span style={{flex:1,fontSize:13,fontWeight:600}}>{comptes.length} produit{comptes.length>1?"s":""} compté{comptes.length>1?"s":""}{nbInvalides>0&&<span style={{color:C.danger,fontWeight:500}}> · {nbInvalides} quantité{nbInvalides>1?"s":""} à corriger</span>}</span>
      {Object.keys(counts).length>0&&<button onClick={()=>{if(window.confirm("Effacer tout le comptage en cours ?"))setCounts({});}} style={BTN}>Tout effacer</button>}
      <button onClick={()=>setMode("resume")} disabled={!comptes.length||nbInvalides>0} style={{...PRIMARY,opacity:!comptes.length||nbInvalides>0?.5:1}}>Voir le résumé</button>
    </Card>
    {barreRecherche}
    <Card style={{overflow:"hidden"}}>
      {cats.map(cat=>{
        const ps=filtered.filter(p=>p.categorie===cat);if(!ps.length)return null;
        return<div key={cat}>
          <div style={{padding:"8px 18px",background:"#F8FAFC",borderBottom:`1px solid ${C.border}`}}><span style={{fontSize:11,fontWeight:700,textTransform:"uppercase",letterSpacing:".8px",color:C.textSec}}>{cat}</span></div>
          {ps.map(p=>{const v=counts[p.id]??"",q=qteNum(v),bad=v!==""&&(q===null||q<0);return<div key={p.id} style={{padding:"10px 18px",borderBottom:`1px solid ${C.border}`,display:"flex",alignItems:"center",gap:12,background:v!==""&&!bad?"#F0FDF4":"transparent"}}>
            <div style={{flex:1,minWidth:0}}>
              <p style={{margin:0,fontSize:13,fontWeight:500,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{p.nom}</p>
              <p style={{margin:0,fontSize:11,color:C.textSec}}>avant : {p.stock??"—"} {p.unite}</p>
            </div>
            <input type="text" inputMode="decimal" value={v} onChange={e=>majCount(p.id,e.target.value)} placeholder="—" aria-label={`Quantité comptée : ${p.nom}`}
              style={{width:80,padding:"8px 10px",borderRadius:8,border:`1.5px solid ${bad?C.danger:v!==""?C.success:C.border}`,fontSize:15,fontWeight:700,textAlign:"right",outline:"none"}}/>
            <span style={{fontSize:12,color:C.textSec,width:40}}>{p.unite}</span>
          </div>;})}
        </div>;
      })}
    </Card>
  </div>;

  const vTot=valeurProduits(products),vSale=valeurProduits(products.filter(p=>p.cote!=="SUCRE")),vSucre=valeurProduits(products.filter(p=>p.cote==="SUCRE"));

  return<div>
    <div style={{marginBottom:16,display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:10,flexWrap:"wrap"}}>
      <div><h1 style={{margin:0,fontSize:22,fontWeight:800,letterSpacing:"-.5px"}}>Inventaire</h1><p style={{margin:"4px 0 0",fontSize:14,color:C.textSec}}>{products.filter(p=>p.cote===cote).length} produits</p></div>
      <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
        <button onClick={()=>setMode("comptage")} disabled={!products.length} style={{...PRIMARY,padding:"7px 12px",fontSize:12,display:"flex",alignItems:"center",gap:6}}><Icon n="clipboard" sz={14}/>{products.some(p=>counts[p.id]!==undefined)?"Reprendre l'inventaire":"Faire l'inventaire"}</button>
        <button onClick={async()=>{setShowHist(true);setSelInv(null);setLoadingHist(true);await Promise.all([loadHistory(),loadInventaires()]);setLoadingHist(false);}} style={{padding:"7px 12px",borderRadius:8,border:`1px solid ${C.border}`,background:"transparent",cursor:"pointer",display:"flex",alignItems:"center",gap:6,fontSize:12,color:C.textSec}}><Icon n="history" sz={14}/>Historique</button>
        <button onClick={exportExcel} disabled={!products.length} style={{padding:"7px 12px",borderRadius:8,border:`1px solid ${C.border}`,background:"transparent",cursor:"pointer",display:"flex",alignItems:"center",gap:6,fontSize:12,color:C.textSec}}><Icon n="download" sz={14}/>Excel</button>
        {barreCote}
      </div>
    </div>
    <Card style={{padding:"14px 18px",marginBottom:14,display:"flex",gap:18,flexWrap:"wrap",alignItems:"center"}}>
      <div style={{flex:"1 1 160px"}}><p style={{margin:0,fontSize:11,fontWeight:700,textTransform:"uppercase",letterSpacing:".5px",color:C.textSec}}>Valeur du stock</p><p style={{margin:"2px 0 0",fontSize:22,fontWeight:800}}>{fmtPrix(vTot.total)}</p></div>
      {[["Salé",vSale],["Sucré",vSucre]].map(([l,v])=><div key={l}><p style={{margin:0,fontSize:11,fontWeight:700,textTransform:"uppercase",letterSpacing:".5px",color:C.textSec}}>{l}</p><p style={{margin:"2px 0 0",fontSize:15,fontWeight:700}}>{fmtPrix(v.total)}</p></div>)}
      <p style={{flexBasis:"100%",margin:0,fontSize:11,color:vTot.sansPrix?C.warning:C.textMuted}}>{vTot.sansPrix?`${vTot.sansPrix} produit${vTot.sansPrix>1?"s":""} en stock sans prix d'achat, hors total.`:"Stock actuel × prix d'achat."}</p>
    </Card>
    {barreRecherche}
    <Card style={{overflow:"hidden"}}>
      {cats.map(cat=>{
        const ps=filtered.filter(p=>p.categorie===cat);if(!ps.length)return null;
        const rc=ps.filter(p=>gst(p)==="rupture").length,cc=ps.filter(p=>gst(p)==="commander").length,vc=valeurProduits(products.filter(p=>p.cote===cote&&p.categorie===cat)).total;
        return<div key={cat}>
          <div style={{padding:"8px 18px",background:"#F8FAFC",borderBottom:`1px solid ${C.border}`,display:"flex",alignItems:"center",gap:8}}>
            <span style={{fontSize:11,fontWeight:700,textTransform:"uppercase",letterSpacing:".8px",color:C.textSec,flex:1}}>{cat}</span>
            {rc>0&&<span style={{fontSize:10,fontWeight:700,color:C.danger,background:C.dangerLight,padding:"2px 7px",borderRadius:10}}>{rc} rupture{rc>1?"s":""}</span>}
            {cc>0&&<span style={{fontSize:10,fontWeight:700,color:C.warning,background:C.warningLight,padding:"2px 7px",borderRadius:10}}>{cc} cmd</span>}
            {vc>0&&<span style={{fontSize:11,fontWeight:600,color:C.textSec}}>{fmtPrix(vc)}</span>}
          </div>
          {ps.map(p=>{
            const st=gst(p);
            if(editId===p.id)return<div key={p.id} style={{padding:"13px 18px",borderBottom:`1px solid ${C.border}`,background:"#EFF6FF"}}>
              <p style={{margin:"0 0 10px",fontSize:14,fontWeight:700}}>{p.nom}</p>
              <div style={{display:"flex",alignItems:"center",gap:10}}>
                <input type="number" defaultValue={p.stock??""} min="0" step="0.5" autoFocus onChange={e=>setEditVal(e.target.value)}
                  style={{flex:1,padding:"9px 12px",borderRadius:8,border:`1.5px solid ${C.brand}`,fontSize:16,fontWeight:700,outline:"none"}}/>
                <span style={{fontSize:13,color:C.textSec,fontWeight:500}}>{p.unite}</span>
                <button onClick={()=>saveStock(p)} disabled={saving} style={{padding:"9px 18px",background:C.brand,color:"#fff",border:"none",borderRadius:8,fontSize:13,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",gap:6}}>
                  <Icon n="check" sz={14}/>{saving?"...":"OK"}</button>
                <button onClick={()=>setEditId(null)} style={{padding:"9px 10px",background:"transparent",border:`1px solid ${C.border}`,borderRadius:8,fontSize:13,cursor:"pointer"}}>✕</button>
              </div>
            </div>;
            return<div key={p.id} onClick={()=>{setEditId(p.id);setEditVal(String(p.stock??""));}}
              style={{padding:"12px 18px",borderBottom:`1px solid ${C.border}`,display:"flex",alignItems:"center",gap:12,cursor:"pointer",background:st==="rupture"?"#FFF9F9":st==="commander"?"#FFFDF5":"transparent"}}
              onMouseEnter={e=>e.currentTarget.style.background="#F8FAFC"} onMouseLeave={e=>e.currentTarget.style.background=st==="rupture"?"#FFF9F9":st==="commander"?"#FFFDF5":"transparent"}>
              <span style={{width:9,height:9,borderRadius:"50%",background:DOT[st],display:"inline-block",flexShrink:0}}/>
              <div style={{flex:1,minWidth:0}}>
                <p style={{margin:0,fontSize:13,fontWeight:500,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{p.nom}</p>
                <p style={{margin:0,fontSize:11,color:C.textSec}}>{p.fournisseur}</p>
              </div>
              {p.prix_achat>0&&<span style={{fontSize:12,fontWeight:600,color:C.textSec,flexShrink:0,whiteSpace:"nowrap"}}>{fmtPrix(p.prix_achat)}/{p.unite}</span>}
              <div style={{textAlign:"right",flexShrink:0}}>
                <p style={{margin:0,fontSize:14,fontWeight:700,color:st==="rupture"?C.danger:st==="commander"?C.warning:st==="ok"?C.success:C.textMuted}}>
                  {p.stock!==null&&p.stock!==undefined?`${p.stock} ${p.unite}`:"—"}</p>
                <p style={{margin:0,fontSize:11,color:C.textMuted}}>min {p.stock_min}</p>
              </div>
              <Icon n="edit" sz={14} c={C.textMuted}/>
            </div>;
          })}
        </div>;
      })}
    </Card>
  </div>;
}
