import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { C, Icon, fmt, Card } from "../ui";
import { PARAMETRES_DEFAUT } from "../parametres";

// ── FICHES TECHNIQUES ─────────────────────────────────────────
export default function Recettes({restaurantId,products,toast,params=PARAMETRES_DEFAUT}){
  const obj=params.objectif,alerte=params.alerte;
  const [recettes,setRecettes]=useState([]),[loading,setLoading]=useState(true),[sel,setSel]=useState(null),[adding,setAdding]=useState(false),[newNom,setNewNom]=useState(""),[newPrix,setNewPrix]=useState(""),[items,setItems]=useState([]),[saving,setSaving]=useState(false),[addItem,setAddItem]=useState({prodId:"",qte:"",unite:""});

  useEffect(()=>{const load=async()=>{const{data}=await supabase.from("recipes").select("*,recipe_items(*,products(nom,unite,prix_achat))").eq("restaurant_id",restaurantId).order("created_at",{ascending:false});setRecettes(data||[]);setLoading(false);};if(restaurantId)load();},[restaurantId]);

  const calcCout=(recipe)=>(recipe.recipe_items||[]).reduce((a,it)=>a+(it.quantite||0)*(it.products?.prix_achat||0),0);

  const saveRecette=async()=>{
    if(!newNom.trim())return;setSaving(true);
    const{data,error}=await supabase.from("recipes").insert({restaurant_id:restaurantId,nom:newNom.trim(),prix_vente:parseFloat(newPrix)||0}).select().single();
    if(!error&&data){
      if(items.length>0){for(const it of items){await supabase.from("recipe_items").insert({recipe_id:data.id,product_id:it.prodId||null,product_nom:it.nom,quantite:it.qte,unite:it.unite});}}
      const{data:rec}=await supabase.from("recipes").select("*,recipe_items(*,products(nom,unite,prix_achat))").eq("restaurant_id",restaurantId).order("created_at",{ascending:false});
      setRecettes(rec||[]);toast("Fiche créée !");setAdding(false);setNewNom("");setNewPrix("");setItems([]);
    }else toast("Erreur","error");setSaving(false);
  };

  const addIngredient=()=>{
    if(!addItem.prodId&&!addItem.nom)return;
    const prod=products.find(p=>p.id===addItem.prodId);
    setItems(prev=>[...prev,{prodId:addItem.prodId||null,nom:prod?.nom||addItem.nom,qte:parseFloat(addItem.qte)||1,unite:prod?.unite||addItem.unite,pa:prod?.prix_achat||0}]);
    setAddItem({prodId:"",qte:"",unite:""});
  };

  const deleteRecette=async(id)=>{await supabase.from("recipes").delete().eq("id",id);setRecettes(p=>p.filter(r=>r.id!==id));setSel(null);toast("Fiche supprimée");};

  if(sel){
    const r=recettes.find(x=>x.id===sel);if(!r)return null;
    const cout=calcCout(r),marge=r.prix_vente>0?((r.prix_vente-cout)/r.prix_vente*100):0,ratio=r.prix_vente>0?cout/r.prix_vente:0;
    return<div>
      <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:20}}>
        <button onClick={()=>setSel(null)} style={{padding:"8px 14px",borderRadius:8,border:`1px solid ${C.border}`,background:"transparent",cursor:"pointer",fontSize:13}}>← Retour</button>
        <div style={{flex:1}}><h1 style={{margin:0,fontSize:20,fontWeight:800}}>{r.nom}</h1></div>
        <button onClick={()=>deleteRecette(r.id)} style={{padding:"8px",borderRadius:8,border:`1px solid ${C.dangerLight}`,background:C.dangerLight,cursor:"pointer",display:"flex"}}><Icon n="trash" sz={16} c={C.danger}/></button>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,marginBottom:16}}>
        {[["Coût matière",fmt(cout),C.warning],["Prix vente",fmt(r.prix_vente),C.text],["Ratio",ratio>0?(ratio*100).toFixed(1)+"%":"—",ratio<=obj?C.success:C.danger]].map(([l,v,c])=>(
          <Card key={l} style={{padding:"14px"}}><p style={{margin:"0 0 4px",fontSize:10,fontWeight:700,color:C.textSec,textTransform:"uppercase",letterSpacing:".5px"}}>{l}</p><p style={{margin:0,fontSize:18,fontWeight:800,color:c}}>{v}</p></Card>
        ))}
      </div>
      <Card style={{overflow:"hidden"}}>
        <div style={{padding:"12px 18px",borderBottom:`1px solid ${C.border}`,background:"#F8FAFC"}}><p style={{margin:0,fontSize:13,fontWeight:700}}>Ingrédients</p></div>
        {(r.recipe_items||[]).map((it,i)=><div key={it.id} style={{padding:"11px 18px",borderBottom:i<r.recipe_items.length-1?`1px solid ${C.border}`:"none",display:"flex",alignItems:"center",gap:10}}>
          <div style={{flex:1}}><p style={{margin:0,fontSize:13,fontWeight:500}}>{it.product_nom||it.products?.nom}</p><p style={{margin:0,fontSize:11,color:C.textSec}}>{it.quantite} {it.unite||it.products?.unite}</p></div>
          <span style={{fontSize:13,fontWeight:700,color:C.warning}}>{fmt((it.quantite||0)*(it.products?.prix_achat||0))}</span>
        </div>)}
        {r.recipe_items?.length===0&&<p style={{padding:20,textAlign:"center",color:C.textMuted,fontSize:13}}>Aucun ingrédient</p>}
      </Card>
    </div>;
  }

  if(adding)return<div>
    <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:20}}>
      <button onClick={()=>{setAdding(false);setNewNom("");setNewPrix("");setItems([]);}} style={{padding:"8px 14px",borderRadius:8,border:`1px solid ${C.border}`,background:"transparent",cursor:"pointer",fontSize:13}}>← Annuler</button>
      <h1 style={{margin:0,fontSize:20,fontWeight:800}}>Nouvelle fiche</h1>
    </div>
    <Card style={{padding:20,marginBottom:14}}>
      <div style={{display:"flex",gap:10,marginBottom:14}}>
        <div style={{flex:2}}><label style={{fontSize:11,fontWeight:700,color:C.textSec,display:"block",marginBottom:5,textTransform:"uppercase",letterSpacing:".5px"}}>Nom de la recette</label>
          <input value={newNom} onChange={e=>setNewNom(e.target.value)} placeholder="Ex: Chichi classique" style={{width:"100%",boxSizing:"border-box",padding:"10px 12px",borderRadius:8,border:`1.5px solid ${C.border}`,fontSize:14,outline:"none"}} onFocus={e=>e.target.style.borderColor=C.brand} onBlur={e=>e.target.style.borderColor=C.border}/></div>
        <div style={{flex:1}}><label style={{fontSize:11,fontWeight:700,color:C.textSec,display:"block",marginBottom:5,textTransform:"uppercase",letterSpacing:".5px"}}>Prix vente (€)</label>
          <input type="number" value={newPrix} onChange={e=>setNewPrix(e.target.value)} placeholder="0.00" style={{width:"100%",boxSizing:"border-box",padding:"10px 12px",borderRadius:8,border:`1.5px solid ${C.border}`,fontSize:14,outline:"none"}} onFocus={e=>e.target.style.borderColor=C.brand} onBlur={e=>e.target.style.borderColor=C.border}/></div>
      </div>
      <p style={{margin:"0 0 10px",fontSize:12,fontWeight:700,color:C.textSec,textTransform:"uppercase",letterSpacing:".5px"}}>Ingrédients</p>
      {items.map((it,i)=><div key={i} style={{display:"flex",justifyContent:"space-between",padding:"7px 10px",background:"#F8FAFC",borderRadius:8,marginBottom:5}}>
        <span style={{fontSize:13}}>{it.nom} — {it.qte} {it.unite}</span>
        <span style={{fontSize:13,color:C.warning,fontWeight:700}}>{fmt(it.qte*it.pa)}</span>
      </div>)}
      <div style={{display:"flex",gap:8,marginTop:10,flexWrap:"wrap"}}>
        <select value={addItem.prodId} onChange={e=>setAddItem(p=>({...p,prodId:e.target.value}))}
          style={{flex:2,minWidth:140,padding:"8px 10px",borderRadius:8,border:`1px solid ${C.border}`,fontSize:13,outline:"none"}}>
          <option value="">Choisir produit...</option>
          {products.filter(p=>p.actif&&p.prix_achat>0).map(p=><option key={p.id} value={p.id}>{p.nom} ({fmt(p.prix_achat)}/{p.unite})</option>)}
        </select>
        <input type="number" value={addItem.qte} onChange={e=>setAddItem(p=>({...p,qte:e.target.value}))} placeholder="Qté" style={{width:70,padding:"8px 10px",borderRadius:8,border:`1px solid ${C.border}`,fontSize:13,outline:"none"}}/>
        <button onClick={addIngredient} style={{padding:"8px 14px",background:C.brandLight,color:C.brand,border:`1px solid ${C.border}`,borderRadius:8,fontSize:12,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",gap:4}}><Icon n="plus" sz={14}/>Ajouter</button>
      </div>
      {items.length>0&&<div style={{marginTop:12,padding:"10px 12px",background:C.successLight,borderRadius:10}}>
        <p style={{margin:0,fontSize:13,fontWeight:700,color:C.success}}>Coût estimé : {fmt(items.reduce((a,it)=>a+it.qte*it.pa,0))} · Ratio : {newPrix>0?((items.reduce((a,it)=>a+it.qte*it.pa,0)/parseFloat(newPrix))*100).toFixed(1)+"%":"—"}</p>
      </div>}
    </Card>
    <button onClick={saveRecette} disabled={saving||!newNom} style={{width:"100%",padding:13,background:newNom?C.brand:"#E2E8F0",color:newNom?"#fff":C.textMuted,border:"none",borderRadius:12,fontSize:15,fontWeight:700,cursor:newNom?"pointer":"not-allowed"}}>
      {saving?"Enregistrement...":"Créer la fiche technique"}</button>
  </div>;

  return<div>
    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:20}}>
      <div><h1 style={{margin:0,fontSize:22,fontWeight:800,letterSpacing:"-.5px"}}>Fiches techniques</h1><p style={{margin:"4px 0 0",fontSize:14,color:C.textSec}}>{recettes.length} recette{recettes.length>1?"s":""}</p></div>
      <button onClick={()=>setAdding(true)} style={{padding:"9px 16px",background:C.brand,color:"#fff",border:"none",borderRadius:10,fontSize:13,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",gap:6,boxShadow:"0 4px 12px rgba(37,99,235,.3)"}}>
        <Icon n="plus" sz={16}/>Nouvelle fiche</button>
    </div>
    {loading?<p style={{textAlign:"center",color:C.textMuted,padding:40}}>Chargement...</p>:recettes.length===0?
    <Card style={{padding:40,textAlign:"center"}}>
      <Icon n="book" sz={40} c={C.textMuted}/>
      <h3 style={{margin:"12px 0 6px",fontSize:16,fontWeight:700}}>Aucune fiche technique</h3>
      <p style={{margin:0,color:C.textSec,fontSize:13}}>Créez vos premières recettes pour calculer vos coûts matière.</p>
    </Card>:
    <div style={{display:"flex",flexDirection:"column",gap:10}}>
      {recettes.map(r=>{const cout=calcCout(r),ratio=r.prix_vente>0?cout/r.prix_vente:0;return<Card key={r.id} onClick={()=>setSel(r.id)} style={{padding:"16px 18px",display:"flex",alignItems:"center",gap:14}}>
        <div style={{width:44,height:44,borderRadius:12,background:C.purpleLight,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}><Icon n="book" sz={20} c={C.purple}/></div>
        <div style={{flex:1}}><p style={{margin:"0 0 2px",fontSize:14,fontWeight:700}}>{r.nom}</p><p style={{margin:0,fontSize:12,color:C.textSec}}>{(r.recipe_items||[]).length} ingrédient{(r.recipe_items||[]).length>1?"s":""} · coût {fmt(cout)}</p></div>
        <div style={{textAlign:"right"}}>
          <p style={{margin:0,fontSize:15,fontWeight:800,color:ratio<=obj?C.success:ratio<=alerte?C.warning:C.danger}}>{ratio>0?(ratio*100).toFixed(1)+"%":"—"}</p>
          {r.prix_vente>0&&<p style={{margin:0,fontSize:11,color:C.textMuted}}>PV {fmt(r.prix_vente)}</p>}
        </div>
      </Card>;})}
    </div>}
  </div>;
}
