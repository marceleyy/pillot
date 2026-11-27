import { useState, useEffect } from "react";
import * as XLSX from "xlsx";
import { supabase } from "../lib/supabase";
import { C, Card, qteNum } from "../ui";
import { PARAMETRES_DEFAUT } from "../parametres";

// Fiches produits (gérant) : ajout, modification, archivage, et import Excel.
const LAB={fontSize:11,fontWeight:700,color:C.textSec,display:"block",marginBottom:4,textTransform:"uppercase",letterSpacing:".5px"};
const CHAMP={width:"100%",boxSizing:"border-box",padding:"9px 11px",borderRadius:8,border:`1.5px solid ${C.border}`,fontSize:14,outline:"none",background:"#fff"};
const BTN={padding:"10px 16px",background:C.brand,color:"#fff",border:"none",borderRadius:8,fontSize:14,fontWeight:700,cursor:"pointer"};
const BTN2={padding:"10px 14px",background:"transparent",border:`1px solid ${C.border}`,borderRadius:8,fontSize:13,cursor:"pointer",color:C.text};

function Fenetre({titre,onClose,busy,children,large}){
  return<div role="dialog" aria-modal="true" aria-label={titre} style={{position:"fixed",inset:0,background:"rgba(15,23,42,.45)",zIndex:60,display:"flex",alignItems:"flex-start",justifyContent:"center",padding:"24px 12px 96px",overflowY:"auto"}} onClick={e=>{if(e.target===e.currentTarget&&!busy)onClose?.();}}>
    <Card style={{width:"100%",maxWidth:large?720:480,padding:20}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
        <h2 style={{margin:0,fontSize:18,fontWeight:800}}>{titre}</h2>
        <button onClick={onClose} disabled={busy} aria-label="Fermer" style={{border:"none",background:"transparent",fontSize:22,cursor:"pointer",color:C.textSec,lineHeight:1}}>×</button>
      </div>
      {children}
    </Card>
  </div>;
}

const texte=v=>String(v??"").trim();
const nombre=v=>{const n=qteNum(typeof v==="number"?String(v):v);return n===null?null:n;};

export function FicheProduit({produit,restaurantId,params=PARAMETRES_DEFAUT,products=[],toast,onDone,onClose}){
  const nouveau=!produit?.id;
  const [f,setF]=useState(()=>({nom:produit?.nom||"",categorie:produit?.categorie||"",unite:produit?.unite||"",fournisseur:produit?.fournisseur||"",
    stock_min:produit?.stock_min??"",prix_achat:produit?.prix_achat??"",cote:produit?.cote==="SUCRE"?"SUCRE":"SALE"}));
  const [busy,setBusy]=useState(false);
  const maj=(k,v)=>setF(x=>({...x,[k]:v}));
  const cats=[...new Set(products.map(p=>p.categorie).filter(Boolean))].sort();
  const fourns=[...new Set(products.map(p=>p.fournisseur).filter(Boolean))].sort();
  const min=texte(f.stock_min)===""?0:nombre(f.stock_min),prix=texte(f.prix_achat)===""?null:nombre(f.prix_achat);
  const erreur=!texte(f.nom)?"Nom obligatoire":min===null?"Stock minimum invalide":texte(f.prix_achat)!==""&&prix===null?"Prix invalide":null;

  const enregistrer=async()=>{
    if(erreur||busy)return;
    setBusy(true);
    const ligne={nom:texte(f.nom).slice(0,120),categorie:texte(f.categorie)||"Divers",unite:texte(f.unite)||"pièce",fournisseur:texte(f.fournisseur)||null,
      stock_min:min,cote:params.deuxSections?f.cote:"SALE"};
    // Le prix n'est envoyé que s'il a été changé : un prix non chargé ne doit pas effacer celui de la base.
    if(nouveau||texte(f.prix_achat)!==texte(produit?.prix_achat))ligne.prix_achat=prix;
    const{error}=nouveau
      ?await supabase.from("products").insert({...ligne,restaurant_id:restaurantId,actif:true})
      :await supabase.from("products").update(ligne).eq("id",produit.id);
    setBusy(false);
    if(error){toast("Fiche non enregistrée, réessayez","error");return;}
    toast(nouveau?"Produit ajouté":"Fiche enregistrée");onDone?.();
  };
  const archiver=async()=>{
    if(busy||!window.confirm(`Retirer « ${produit.nom} » de l'inventaire ? Son historique est conservé.`))return;
    setBusy(true);
    const{error}=await supabase.from("products").update({actif:false}).eq("id",produit.id);
    setBusy(false);
    if(error){toast("Impossible de retirer ce produit","error");return;}
    toast("Produit retiré");onDone?.();
  };

  return<Fenetre titre={nouveau?"Nouveau produit":"Fiche produit"} onClose={onClose} busy={busy}>
    <form onSubmit={e=>{e.preventDefault();enregistrer();}} style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
      <div style={{gridColumn:"1 / -1"}}><label style={LAB} htmlFor="fp-nom">Nom</label><input id="fp-nom" value={f.nom} onChange={e=>maj("nom",e.target.value)} style={CHAMP} autoFocus/></div>
      <div><label style={LAB} htmlFor="fp-cat">Catégorie</label><input id="fp-cat" list="fp-cats" value={f.categorie} onChange={e=>maj("categorie",e.target.value)} placeholder="Divers" style={CHAMP}/>
        <datalist id="fp-cats">{cats.map(c=><option key={c} value={c}/>)}</datalist></div>
      <div><label style={LAB} htmlFor="fp-four">Fournisseur</label><input id="fp-four" list="fp-fourns" value={f.fournisseur} onChange={e=>maj("fournisseur",e.target.value)} style={CHAMP}/>
        <datalist id="fp-fourns">{fourns.map(c=><option key={c} value={c}/>)}</datalist></div>
      <div><label style={LAB} htmlFor="fp-unite">Unité</label><input id="fp-unite" value={f.unite} onChange={e=>maj("unite",e.target.value)} placeholder="kg, L, pièce…" style={CHAMP}/></div>
      <div><label style={LAB} htmlFor="fp-min">Stock minimum</label><input id="fp-min" inputMode="decimal" value={f.stock_min} onChange={e=>maj("stock_min",e.target.value)} placeholder="0" style={CHAMP}/></div>
      <div><label style={LAB} htmlFor="fp-prix">Prix d'achat HT (€)</label><input id="fp-prix" inputMode="decimal" value={f.prix_achat} onChange={e=>maj("prix_achat",e.target.value)} style={CHAMP}/></div>
      {params.deuxSections&&<div><label style={LAB} htmlFor="fp-sec">Section</label>
        <select id="fp-sec" value={f.cote} onChange={e=>maj("cote",e.target.value)} style={CHAMP}>
          {params.sectionsActives.map(s=><option key={s.code} value={s.code}>{s.nom}</option>)}
        </select></div>}
      {erreur&&texte(f.nom)&&<p style={{gridColumn:"1 / -1",margin:0,fontSize:13,color:C.danger}}>{erreur}</p>}
      <div style={{gridColumn:"1 / -1",display:"flex",justifyContent:"space-between",gap:8,marginTop:6,flexWrap:"wrap"}}>
        {!nouveau?<button type="button" onClick={archiver} disabled={busy} style={{...BTN2,color:C.danger}}>Retirer de l'inventaire</button>:<span/>}
        <button type="submit" disabled={!!erreur||busy} style={{...BTN,opacity:erreur||busy?.6:1}}>{busy?"Enregistrement...":"Enregistrer"}</button>
      </div>
    </form>
  </Fenetre>;
}

// ── Import Excel ─────────────────────────────────────────────
const COLONNES=["Produit","Catégorie","Unité","Fournisseur","Stock minimum","Prix d'achat HT","Section","Stock actuel"];

function telechargerModele(params=PARAMETRES_DEFAUT){
  const ex=[["Farine T55","Épicerie","kg","METRO",5,1.2,params.sectionsActives[0]?.nom||"",10],["Lait entier","Frais","L","Laiterie",6,0.95,params.sectionsActives[1]?.nom||params.sectionsActives[0]?.nom||"",4]];
  const ws=XLSX.utils.aoa_to_sheet([COLONNES,...ex]);ws["!cols"]=[28,16,8,18,14,16,12,12].map(w=>({wch:w}));
  const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,ws,"Produits");
  XLSX.writeFile(wb,"pillot_modele_produits.xlsx");
}

// Lit une feuille : une ligne par produit, en-têtes reconnus sans tenir compte des accents ni de la casse.
function lireFeuille(rows,params,existants){
  const sansAccent=s=>String(s||"").normalize("NFD").replace(/[̀-ͯ]/g,"").toLowerCase().trim();
  const cle=k=>{const s=sansAccent(k);
    if(s.startsWith("produit")||s==="nom"||s==="article")return"nom";if(s.startsWith("categ"))return"categorie";if(s.startsWith("unit"))return"unite";
    if(s.startsWith("fourn"))return"fournisseur";if(s.includes("min"))return"stock_min";if(s.includes("prix"))return"prix_achat";
    if(s.startsWith("section")||s==="cote"||s==="côté")return"section";if(s.includes("stock"))return"stock";return null;};
  const vus=new Set(existants.map(p=>sansAccent(p.nom)));
  const ok=[],erreurs=[];let doublons=0;
  rows.forEach((r,i)=>{
    const l={};Object.entries(r).forEach(([k,v])=>{const c=cle(k);if(c&&l[c]===undefined)l[c]=v;});
    const nom=texte(l.nom);if(!nom)return;
    if(vus.has(sansAccent(nom))){doublons++;return;}
    const min=texte(l.stock_min)===""?0:nombre(l.stock_min),prix=texte(l.prix_achat)===""?null:nombre(l.prix_achat),stock=texte(l.stock)===""?null:nombre(l.stock);
    if(min===null||(texte(l.prix_achat)!==""&&prix===null)||(texte(l.stock)!==""&&stock===null)){erreurs.push(i+2);return;}
    const sec=sansAccent(l.section),code=params.deuxSections&&params.sections.find(s=>s.code!=="SALE"&&(sansAccent(s.nom)===sec||sansAccent(s.code)===sec))?"SUCRE":"SALE";
    vus.add(sansAccent(nom));
    ok.push({ligne:{nom:nom.slice(0,120),categorie:texte(l.categorie)||"Divers",unite:texte(l.unite)||"pièce",fournisseur:texte(l.fournisseur)||null,stock_min:min,prix_achat:prix,cote:code},stock});
  });
  return{ok,erreurs,doublons};
}

export function ImportProduits({restaurantId,params=PARAMETRES_DEFAUT,products=[],toast,onDone,onClose}){
  const [lu,setLu]=useState(null),[nomFichier,setNomFichier]=useState(""),[busy,setBusy]=useState(false),[err,setErr]=useState("");
  // Doublons : comparés à tous les produits du commerce, y compris ceux retirés de l'inventaire.
  const [tous,setTous]=useState(null);
  useEffect(()=>{supabase.from("products").select("nom").eq("restaurant_id",restaurantId).then(({data,error})=>setTous(error?products:data||[]));},[restaurantId,products]);
  const choisir=async e=>{
    const file=e.target.files?.[0];if(!file)return;
    setErr("");setLu(null);setNomFichier(file.name);
    try{
      const wb=XLSX.read(await file.arrayBuffer());
      const rows=XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]],{defval:""});
      if(rows.length>2000){setErr("2 000 produits au plus par fichier");return;}
      const r=lireFeuille(rows,params,tous||products);
      if(!r.ok.length&&!r.erreurs.length&&!r.doublons){setErr("Aucun produit trouvé : vérifiez que la 1re ligne contient les en-têtes du modèle (Produit, Catégorie…)");return;}
      setLu(r);
    }catch{setErr("Fichier illisible : utilisez un fichier Excel (.xlsx) ou CSV");}
  };
  const importer=async()=>{
    if(!lu?.ok.length||busy)return;
    setBusy(true);
    const{data,error}=await supabase.from("products").insert(lu.ok.map(x=>({...x.ligne,restaurant_id:restaurantId,actif:true}))).select("id,nom");
    if(error){setBusy(false);toast("Import impossible, réessayez","error");return;}
    // Stock de départ : une saisie de stock par produit qui en a un.
    const parNom=Object.fromEntries((data||[]).map(p=>[p.nom,p.id]));
    const stocks=lu.ok.filter(x=>x.stock!==null&&parNom[x.ligne.nom]).map(x=>({product_id:parNom[x.ligne.nom],restaurant_id:restaurantId,stock_reel:x.stock}));
    const r2=stocks.length?await supabase.from("stock_entries").insert(stocks):{};
    setBusy(false);
    toast(r2.error?`${data.length} produits importés, mais les stocks de départ n'ont pas été enregistrés`:`${data.length} produit${data.length>1?"s":""} importé${data.length>1?"s":""}`,r2.error?"error":"success");
    onDone?.();
  };
  return<Fenetre titre="Importer des produits" onClose={onClose} busy={busy}>
    <p style={{margin:"0 0 12px",fontSize:13,color:C.textSec}}>Une ligne par produit. Colonnes : {COLONNES.join(", ")}. Seul le nom est obligatoire.</p>
    <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:12}}>
      <button onClick={()=>telechargerModele(params)} style={BTN2}>Télécharger le modèle</button>
      <label style={{...BTN,display:"inline-block"}}>Choisir un fichier
        <input type="file" accept=".xlsx,.xls,.csv" onChange={choisir} style={{display:"none"}} aria-label="Fichier de produits"/></label>
    </div>
    {nomFichier&&<p style={{margin:"0 0 8px",fontSize:12,color:C.textMuted}}>{nomFichier}</p>}
    {err&&<p style={{margin:"0 0 8px",fontSize:13,color:C.danger}}>{err}</p>}
    {lu&&<>
      <div style={{fontSize:13,color:C.text,display:"flex",flexDirection:"column",gap:4,marginBottom:12}}>
        <span><b>{lu.ok.length}</b> produit{lu.ok.length>1?"s":""} à importer</span>
        {lu.doublons>0&&<span style={{color:C.textSec}}>{lu.doublons} déjà dans l'inventaire, ignoré{lu.doublons>1?"s":""}</span>}
        {lu.erreurs.length>0&&<span style={{color:C.danger}}>{lu.erreurs.length} ligne{lu.erreurs.length>1?"s":""} ignorée{lu.erreurs.length>1?"s":""} (nombre illisible) : {lu.erreurs.slice(0,8).join(", ")}{lu.erreurs.length>8?"…":""}</span>}
      </div>
      {lu.ok.length>0&&<div style={{maxHeight:220,overflowY:"auto",border:`1px solid ${C.border}`,borderRadius:8,marginBottom:12}}>
        {lu.ok.slice(0,50).map((x,i)=><div key={i} style={{display:"flex",justifyContent:"space-between",gap:8,padding:"6px 10px",fontSize:12,borderTop:i?`1px solid ${C.border}`:"none"}}>
          <span>{x.ligne.nom} <span style={{color:C.textMuted}}>· {x.ligne.categorie}{params.deuxSections?` · ${params.nomSection(x.ligne.cote)}`:""}</span></span>
          <span style={{color:C.textSec}}>{x.stock??"—"} {x.ligne.unite}</span>
        </div>)}
        {lu.ok.length>50&&<p style={{margin:0,padding:"6px 10px",fontSize:12,color:C.textMuted}}>… et {lu.ok.length-50} autres</p>}
      </div>}
      <div style={{display:"flex",justifyContent:"flex-end"}}>
        <button onClick={importer} disabled={!lu.ok.length||busy} style={{...BTN,opacity:!lu.ok.length||busy?.6:1}}>{busy?"Import...":`Importer ${lu.ok.length} produit${lu.ok.length>1?"s":""}`}</button>
      </div>
    </>}
  </Fenetre>;
}
