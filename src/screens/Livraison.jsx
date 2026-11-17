import { useState, useMemo } from "react";
import { supabase } from "../lib/supabase";
import { C, Card, qteNum } from "../ui";

// Réception d'une livraison : les quantités reçues s'ajoutent au stock et
// comptent comme entrées dans la consommation. Le gérant peut corriger le prix.
export default function Livraison({products,fournisseur:fInit="",quantites={},gerant=false,toast,onDone,onClose}){
  const fourns=useMemo(()=>[...new Set(products.map(p=>p.fournisseur).filter(Boolean))].sort((a,b)=>a.localeCompare(b)),[products]);
  const [fournisseur,setFournisseur]=useState(fInit||"");
  const [tous,setTous]=useState(!fInit);
  const [qtes,setQtes]=useState(()=>Object.fromEntries(Object.entries(quantites).map(([k,v])=>[k,String(v)])));
  const [prix,setPrix]=useState({}),[numero,setNumero]=useState("");
  const [search,setSearch]=useState(""),[busy,setBusy]=useState(false);

  // Seuls les produits du fournisseur choisi sont enregistrés (la recherche ne fait que filtrer l'affichage).
  const perimetre=products.filter(p=>tous||p.fournisseur===fournisseur);
  const liste=perimetre.filter(p=>!search||p.nom.toLowerCase().includes(search.toLowerCase()));
  const saisis=perimetre.filter(p=>qtes[p.id]!==undefined&&qtes[p.id]!=="");
  const invalides=saisis.filter(p=>!(qteNum(qtes[p.id])>0)||(prix[p.id]!==undefined&&prix[p.id]!==""&&qteNum(prix[p.id])===null));
  const lignes=saisis.filter(p=>qteNum(qtes[p.id])>0);
  const prixDe=p=>qteNum(prix[p.id])>0?qteNum(prix[p.id]):(Number(p.prix_achat)||0);
  const total=lignes.reduce((a,p)=>a+qteNum(qtes[p.id])*prixDe(p),0);
  const changerFournisseur=f=>{
    if((Object.values(qtes).some(v=>v!=="")||Object.values(prix).some(v=>v!==""))&&!window.confirm("Changer de fournisseur efface les quantités saisies. Continuer ?"))return;
    setFournisseur(f);setTous(!f);setQtes({});setPrix({});
  };

  const valider=async()=>{
    if(!lignes.length||invalides.length||busy)return;
    setBusy(true);
    const p_lignes=lignes.map(p=>({product_id:p.id,quantite:qteNum(qtes[p.id]),...(gerant&&qteNum(prix[p.id])>0?{prix_unitaire:qteNum(prix[p.id])}:{})}));
    const{error}=await supabase.rpc("enregistrer_livraison",{p_fournisseur:fournisseur,p_numero:numero,p_date:null,p_lignes});
    setBusy(false);
    if(error){toast(error.code==="PGRST202"?"Mise à jour de la base nécessaire pour enregistrer les livraisons":"Livraison non enregistrée, réessayez","error");return;}
    toast(`Livraison enregistrée : ${lignes.length} produit${lignes.length>1?"s":""} ajouté${lignes.length>1?"s":""} au stock`);
    onDone?.();
  };

  const champ={padding:"8px 10px",borderRadius:8,border:`1.5px solid ${C.border}`,fontSize:14,outline:"none",background:"#fff",boxSizing:"border-box"};
  return<div role="dialog" aria-modal="true" aria-label="Livraison reçue" style={{position:"fixed",inset:0,background:"rgba(15,23,42,.45)",zIndex:60,display:"flex",alignItems:"flex-start",justifyContent:"center",padding:"24px 12px 96px",overflowY:"auto"}} onClick={e=>{if(e.target===e.currentTarget&&!busy)onClose?.();}}>
    <Card style={{width:"100%",maxWidth:620,padding:20}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
        <h2 style={{margin:0,fontSize:18,fontWeight:800}}>Livraison reçue</h2>
        <button onClick={onClose} disabled={busy} aria-label="Fermer" style={{border:"none",background:"transparent",fontSize:22,cursor:"pointer",color:C.textSec,lineHeight:1}}>×</button>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:8,marginBottom:12}}>
        <select value={tous?"":fournisseur} onChange={e=>changerFournisseur(e.target.value)} aria-label="Fournisseur" style={champ}>
          <option value="">Tous les produits</option>
          {fourns.map(f=><option key={f} value={f}>{f}</option>)}
        </select>
        <input value={numero} onChange={e=>setNumero(e.target.value)} placeholder="N° de bon (facultatif)" aria-label="Numéro du bon de livraison" style={champ}/>
      </div>
      <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Rechercher un produit" aria-label="Rechercher un produit" style={{...champ,width:"100%",marginBottom:10}}/>
      <div style={{maxHeight:"50vh",overflowY:"auto",border:`1px solid ${C.border}`,borderRadius:10}}>
        {!liste.length&&<p style={{margin:0,padding:16,fontSize:13,color:C.textMuted,textAlign:"center"}}>Aucun produit</p>}
        {liste.map((p,i)=>{
          const bad=qtes[p.id]!==undefined&&qtes[p.id]!==""&&!(qteNum(qtes[p.id])>0);
          return<div key={p.id} style={{display:"flex",alignItems:"center",gap:8,padding:"8px 12px",borderTop:i?`1px solid ${C.border}`:"none"}}>
            <div style={{flex:1,minWidth:0}}>
              <p style={{margin:0,fontSize:13,fontWeight:600,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{p.nom}</p>
              <p style={{margin:0,fontSize:11,color:C.textMuted}}>Stock {p.stock??"—"} {p.unite}{tous&&p.fournisseur?` · ${p.fournisseur}`:""}</p>
            </div>
            <input inputMode="decimal" value={qtes[p.id]??""} onChange={e=>setQtes(q=>({...q,[p.id]:e.target.value}))} placeholder="0" aria-label={`Quantité reçue ${p.nom}`}
              style={{...champ,width:72,textAlign:"right",borderColor:bad?C.danger:C.border}}/>
            <span style={{fontSize:12,color:C.textSec,width:34}}>{p.unite}</span>
            {gerant&&<input inputMode="decimal" value={prix[p.id]??""} onChange={e=>setPrix(x=>({...x,[p.id]:e.target.value}))} placeholder={p.prix_achat?String(p.prix_achat):"prix"} aria-label={`Prix unitaire ${p.nom}`}
              style={{...champ,width:78,textAlign:"right"}}/>}
          </div>;
        })}
      </div>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:10,marginTop:14,flexWrap:"wrap"}}>
        <p style={{margin:0,fontSize:13,color:invalides.length?C.danger:C.textSec}}>
          {invalides.length?`${invalides.length} saisie${invalides.length>1?"s":""} à corriger`:`${lignes.length} produit${lignes.length>1?"s":""}`}
          {gerant&&lignes.length>0&&!invalides.length&&` · ${new Intl.NumberFormat("fr-FR",{style:"currency",currency:"EUR"}).format(total)} HT`}
        </p>
        <button onClick={valider} disabled={!lignes.length||invalides.length>0||busy} style={{padding:"10px 18px",background:C.brand,color:"#fff",border:"none",borderRadius:8,fontSize:14,fontWeight:700,cursor:"pointer",opacity:!lignes.length||invalides.length||busy?.6:1}}>
          {busy?"Enregistrement...":"Ajouter au stock"}</button>
      </div>
      {gerant&&<p style={{margin:"8px 0 0",fontSize:12,color:C.textMuted}}>Un prix saisi remplace le prix d'achat du produit.</p>}
    </Card>
  </div>;
}
