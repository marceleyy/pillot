// ═══════════════════════════════════════════════════════════════
//  PILLOT — Cartographie des équipements + Scan facture IA
//  Fichier : src/screens/EquipementSetup.jsx
// ═══════════════════════════════════════════════════════════════

import { useState, useEffect, useRef } from "react";
import { supabase } from "../lib/supabase";

const D = {
  brand:"#2563EB", brandLight:"#EFF6FF",
  surface:"#FFFFFF", bg:"#F9FAFB",
  border:"#E5E7EB", borderFocus:"#93C5FD",
  text:"#111827", textSec:"#6B7280", textMuted:"#9CA3AF",
  success:"#059669", successLight:"#ECFDF5",
  warning:"#D97706", warningLight:"#FFFBEB",
  danger:"#DC2626", dangerLight:"#FEF2F2",
};

const TYPES = [
  { key:"frigo",       label:"Frigo",        icon:"❄️",  temp_min:0,   temp_max:4,  color:"#3B82F6" },
  { key:"congelateur", label:"Congélateur",  icon:"🧊",  temp_min:-22, temp_max:-18,color:"#6366F1" },
  { key:"vitrine",     label:"Vitrine froide",icon:"🛒", temp_min:0,   temp_max:6,  color:"#0EA5E9" },
  { key:"bain_marie",  label:"Bain-marie",   icon:"♨️",  temp_min:63,  temp_max:99, color:"#F97316" },
  { key:"zone_chaude", label:"Zone chaude",  icon:"🔥",  temp_min:63,  temp_max:99, color:"#EF4444" },
  { key:"friteuse",    label:"Friteuse",     icon:"🛢️",  temp_min:160, temp_max:190,color:"#92400E" },
  { key:"autre",       label:"Autre",        icon:"🌡️",  temp_min:0,   temp_max:25, color:"#6B7280" },
];

// ── CARTOGRAPHIE ÉQUIPEMENTS ──────────────────────────────────
export function EquipementSetup({ restaurantId, toast }) {
  const [equipements, setEquipements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ nom:"", type:"frigo", marque:"", modele:"", localisation:"", temp_min:0, temp_max:4 });

  useEffect(() => { load(); }, [restaurantId]);

  const load = async () => {
    const { data } = await supabase.from("equipements").select("*").eq("restaurant_id", restaurantId).order("ordre");
    setEquipements(data || []);
    setLoading(false);
  };

  const pickType = (type) => {
    const t = TYPES.find(x => x.key === type);
    setForm(p => ({ ...p, type, temp_min: t?.temp_min||0, temp_max: t?.temp_max||25 }));
  };

  const save = async () => {
    if (!form.nom.trim()) { toast("Nom obligatoire","error"); return; }
    setSaving(true);
    await supabase.from("equipements").insert({ restaurant_id:restaurantId, ...form, ordre:equipements.length });
    toast("Équipement ajouté"); setModal(false);
    setForm({ nom:"", type:"frigo", marque:"", modele:"", localisation:"", temp_min:0, temp_max:4 });
    await load(); setSaving(false);
  };

  const remove = async (id) => {
    await supabase.from("equipements").update({ actif:false }).eq("id", id);
    setEquipements(p => p.filter(e => e.id !== id));
    toast("Équipement retiré");
  };

  const typeInfo = (type) => TYPES.find(t => t.key === type) || TYPES[TYPES.length-1];

  return (
    <div>
      {modal && (
        <div style={{ position:"fixed", inset:0, background:"rgba(17,24,39,.5)", zIndex:300, display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}>
          <div style={{ background:D.surface, borderRadius:18, padding:24, maxWidth:420, width:"100%", boxShadow:"0 24px 60px rgba(0,0,0,.2)" }}>
            <h3 style={{ margin:"0 0 18px", fontSize:17, fontWeight:700, letterSpacing:"-.02em" }}>Ajouter un équipement</h3>

            {/* Choix du type — grille visuelle */}
            <p style={{ margin:"0 0 8px", fontSize:11, fontWeight:600, color:D.textMuted, textTransform:"uppercase", letterSpacing:".06em" }}>Type d'équipement</p>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:6, marginBottom:16 }}>
              {TYPES.map(t => (
                <button key={t.key} onClick={() => pickType(t.key)}
                  style={{ padding:"10px 4px", borderRadius:10, border:`1.5px solid ${form.type===t.key?t.color:D.border}`, background:form.type===t.key?t.color+"15":"transparent", cursor:"pointer", textAlign:"center" }}>
                  <div style={{ fontSize:20, marginBottom:3 }}>{t.icon}</div>
                  <p style={{ margin:0, fontSize:10, fontWeight:form.type===t.key?700:400, color:form.type===t.key?t.color:D.textSec }}>{t.label}</p>
                </button>
              ))}
            </div>

            <div style={{ display:"flex", flexDirection:"column", gap:10, marginBottom:16 }}>
              <div><label style={{ fontSize:11, fontWeight:600, color:D.textMuted, display:"block", marginBottom:4, textTransform:"uppercase", letterSpacing:".06em" }}>Nom *</label>
                <input value={form.nom} onChange={e=>setForm(p=>({...p,nom:e.target.value}))} placeholder="Ex: Frigo 1 — Cuisine" style={{ width:"100%", boxSizing:"border-box", padding:"9px 12px", borderRadius:9, border:`1.5px solid ${D.border}`, fontSize:14 }} onFocus={e=>e.target.style.borderColor=D.borderFocus} onBlur={e=>e.target.style.borderColor=D.border}/></div>

              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
                <div><label style={{ fontSize:11, fontWeight:600, color:D.textMuted, display:"block", marginBottom:4, textTransform:"uppercase", letterSpacing:".06em" }}>Temp. min (°C)</label>
                  <input type="number" value={form.temp_min} onChange={e=>setForm(p=>({...p,temp_min:+e.target.value}))} step="1" style={{ width:"100%", boxSizing:"border-box", padding:"9px 12px", borderRadius:9, border:`1px solid ${D.border}`, fontSize:14 }}/></div>
                <div><label style={{ fontSize:11, fontWeight:600, color:D.textMuted, display:"block", marginBottom:4, textTransform:"uppercase", letterSpacing:".06em" }}>Temp. max (°C)</label>
                  <input type="number" value={form.temp_max} onChange={e=>setForm(p=>({...p,temp_max:+e.target.value}))} step="1" style={{ width:"100%", boxSizing:"border-box", padding:"9px 12px", borderRadius:9, border:`1px solid ${D.border}`, fontSize:14 }}/></div>
              </div>

              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
                <div><label style={{ fontSize:11, fontWeight:600, color:D.textMuted, display:"block", marginBottom:4, textTransform:"uppercase", letterSpacing:".06em" }}>Marque</label>
                  <input value={form.marque} onChange={e=>setForm(p=>({...p,marque:e.target.value}))} placeholder="Ex: Liebherr" style={{ width:"100%", boxSizing:"border-box", padding:"9px 12px", borderRadius:9, border:`1px solid ${D.border}`, fontSize:13 }}/></div>
                <div><label style={{ fontSize:11, fontWeight:600, color:D.textMuted, display:"block", marginBottom:4, textTransform:"uppercase", letterSpacing:".06em" }}>Localisation</label>
                  <input value={form.localisation} onChange={e=>setForm(p=>({...p,localisation:e.target.value}))} placeholder="Ex: Cuisine" style={{ width:"100%", boxSizing:"border-box", padding:"9px 12px", borderRadius:9, border:`1px solid ${D.border}`, fontSize:13 }}/></div>
              </div>
            </div>

            <div style={{ display:"flex", gap:8 }}>
              <button onClick={save} disabled={saving||!form.nom} style={{ flex:1, padding:"12px", background:form.nom?D.brand:"#E5E7EB", color:form.nom?"#fff":D.textMuted, border:"none", borderRadius:10, fontSize:14, fontWeight:600, cursor:form.nom?"pointer":"default" }}>{saving?"...":"Ajouter l'équipement"}</button>
              <button onClick={()=>setModal(false)} style={{ padding:"12px 16px", background:"transparent", border:`1px solid ${D.border}`, borderRadius:10, cursor:"pointer", fontSize:14 }}>Annuler</button>
            </div>
          </div>
        </div>
      )}

      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:18 }}>
        <div>
          <h2 style={{ margin:0, fontSize:18, fontWeight:700, letterSpacing:"-.02em" }}>Mes équipements</h2>
          <p style={{ margin:"3px 0 0", fontSize:13, color:D.textSec }}>{equipements.length} appareil{equipements.length>1?"s":""} enregistré{equipements.length>1?"s":""}</p>
        </div>
        <button onClick={()=>setModal(true)} style={{ padding:"9px 16px", background:D.brand, color:"#fff", border:"none", borderRadius:9, fontSize:13, fontWeight:600, cursor:"pointer", display:"flex", alignItems:"center", gap:6 }}>
          + Ajouter
        </button>
      </div>

      {loading ? <p style={{textAlign:"center",color:D.textMuted,padding:32}}>Chargement...</p> :
       equipements.length === 0 ? (
        <div style={{ background:D.surface, border:`2px dashed ${D.border}`, borderRadius:14, padding:"48px 24px", textAlign:"center" }}>
          <p style={{ fontSize:36, margin:"0 0 10px" }}>🌡️</p>
          <p style={{ margin:0, fontSize:16, fontWeight:600 }}>Aucun équipement</p>
          <p style={{ margin:"6px 0 16px", fontSize:13, color:D.textSec }}>Ajoutez vos frigos, congélateurs et équipements pour personnaliser votre suivi HACCP</p>
          <button onClick={()=>setModal(true)} style={{ padding:"10px 20px", background:D.brand, color:"#fff", border:"none", borderRadius:9, fontSize:14, fontWeight:600, cursor:"pointer" }}>Ajouter mon premier équipement</button>
        </div>
      ) : (
        <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
          {equipements.map(eq => {
            const t = typeInfo(eq.type);
            return (
              <div key={eq.id} style={{ background:D.surface, border:`1px solid ${D.border}`, borderRadius:12, padding:"14px 16px", display:"flex", alignItems:"center", gap:12 }}>
                <div style={{ width:44, height:44, borderRadius:12, background:t.color+"15", display:"flex", alignItems:"center", justifyContent:"center", fontSize:20, flexShrink:0 }}>{t.icon}</div>
                <div style={{ flex:1 }}>
                  <p style={{ margin:0, fontSize:14, fontWeight:600 }}>{eq.nom}</p>
                  <p style={{ margin:0, fontSize:11, color:D.textSec }}>
                    {t.label} · {eq.temp_min}°C à {eq.temp_max}°C
                    {eq.localisation ? ` · ${eq.localisation}` : ""}
                    {eq.marque ? ` · ${eq.marque}` : ""}
                  </p>
                </div>
                <button onClick={() => remove(eq.id)} style={{ padding:"6px 10px", background:D.dangerLight, border:"none", borderRadius:7, cursor:"pointer", fontSize:12, color:D.danger, fontWeight:600 }}>Retirer</button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── SCAN FACTURE / BL avec IA ─────────────────────────────────
export function InvoiceScanner({ restaurantId, profileId, products, toast }) {
  const [step, setStep] = useState("upload"); // upload | preview | done
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState(null);   // URL pour afficher l'image
  const [result, setResult] = useState(null);     // résultat IA
  const [items, setItems] = useState([]);         // items parsés
  const [saving, setSaving] = useState(false);
  const fileRef = useRef(null);

  const analyzeWithAI = async (base64, mimeType) => {
    // Appel à l'API Claude avec vision
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method:"POST",
      headers:{ "Content-Type":"application/json" },
      body: JSON.stringify({
        model:"claude-sonnet-4-6",
        max_tokens:2000,
        messages:[{
          role:"user",
          content:[
            { type:"image", source:{ type:"base64", media_type:mimeType, data:base64 } },
            { type:"text",  text:`Tu es un assistant pour restaurant. Analyse cette facture ou ce bon de livraison et extrais les informations.

Réponds UNIQUEMENT en JSON valide avec ce format :
{
  "fournisseur": "nom du fournisseur",
  "numero_bl": "numéro du bon ou facture",
  "date": "date au format YYYY-MM-DD",
  "total_ht": 0.00,
  "items": [
    {"nom": "nom exact du produit", "quantite": 1, "unite": "kg/pièce/carton/etc", "prix_unitaire": 0.00, "total_ht": 0.00}
  ]
}

Si une information n'est pas visible, mets null. Sois précis sur les noms de produits et les quantités.` }
          ]
        }]
      })
    });

    const data = await response.json();
    const text = data.content?.[0]?.text || "{}";
    const clean = text.replace(/```json|```/g, "").trim();
    return JSON.parse(clean);
  };

  const handleFile = async (file) => {
    setLoading(true);
    try {
      const url = URL.createObjectURL(file);
      setPreview(url);

      // Convert to base64
      const base64 = await new Promise((res, rej) => {
        const reader = new FileReader();
        reader.onload = () => res(reader.result.split(",")[1]);
        reader.onerror = rej;
        reader.readAsDataURL(file);
      });

      const mimeType = file.type || "image/jpeg";
      const parsed = await analyzeWithAI(base64, mimeType);
      setResult(parsed);

      // Matcher les produits de la facture avec l'inventaire
      const matched = (parsed.items || []).map(item => {
        const prod = products?.find(p =>
          p.nom.toLowerCase().includes(item.nom.toLowerCase()) ||
          item.nom.toLowerCase().includes(p.nom.toLowerCase().split(" ")[0])
        );
        const prixPrecedent = prod?.prix_achat;
        const variation = prixPrecedent && item.prix_unitaire ?
          ((item.prix_unitaire - prixPrecedent) / prixPrecedent * 100) : null;
        return { ...item, matched_product: prod || null, prix_precedent: prixPrecedent, variation_pct: variation, update_inventory: !!prod };
      });

      setItems(matched);
      setStep("preview");
    } catch(e) {
      toast("Erreur d'analyse : " + e.message, "error");
      console.error(e);
    }
    setLoading(false);
  };

  const confirmAndSave = async () => {
    setSaving(true);
    try {
      // Sauvegarder la facture
      const { data: inv } = await supabase.from("scanned_invoices").insert({
        restaurant_id:restaurantId, fournisseur:result?.fournisseur,
        numero_bl:result?.numero_bl, date_facture:result?.date,
        total_ht:result?.total_ht, statut:"validated", source:"scan"
      }).select().single();

      // Sauvegarder les lignes et mettre à jour l'inventaire
      let updated = 0;
      for (const item of items) {
        await supabase.from("scanned_invoice_items").insert({
          invoice_id:inv.id, product_nom:item.nom, quantite:item.quantite,
          unite:item.unite, prix_unitaire:item.prix_unitaire, total_ht:item.total_ht,
          matched_product_id:item.matched_product?.id || null,
          prix_precedent:item.prix_precedent, variation_pct:item.variation_pct
        });

        // Mettre à jour le stock et le prix du produit
        if (item.update_inventory && item.matched_product) {
          const newStock = (item.matched_product.stock || 0) + (item.quantite || 0);
          await supabase.from("products").update({
            prix_achat:item.prix_unitaire || item.matched_product.prix_achat
          }).eq("id", item.matched_product.id);

          // Ajouter une entrée de stock
          await supabase.from("stock_entries").insert({
            product_id:item.matched_product.id,
            restaurant_id:restaurantId,
            stock_reel:newStock
          });
          updated++;
        }
      }

      toast(`✅ Facture enregistrée — ${updated} stock${updated>1?"s":""} mis à jour`);
      setStep("done");
    } catch(e) { toast("Erreur : " + e.message, "error"); }
    setSaving(false);
  };

  const varColor = v => v === null ? D.textMuted : v > 5 ? D.danger : v > 0 ? D.warning : D.success;

  if (step === "done") return (
    <div style={{ textAlign:"center", padding:"40px 20px" }}>
      <div style={{ width:64, height:64, borderRadius:"50%", background:D.successLight, display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 16px", fontSize:28 }}>✅</div>
      <h3 style={{ margin:"0 0 8px", fontSize:20, fontWeight:700 }}>Facture traitée</h3>
      <p style={{ margin:"0 0 24px", color:D.textSec }}>Inventaire et prix mis à jour automatiquement</p>
      <button onClick={()=>{setStep("upload");setResult(null);setItems([]);setPreview(null);}}
        style={{ padding:"11px 24px", background:D.brand, color:"#fff", border:"none", borderRadius:10, fontSize:14, fontWeight:600, cursor:"pointer" }}>
        Scanner une autre facture
      </button>
    </div>
  );

  if (step === "preview") return (
    <div>
      <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:18 }}>
        <button onClick={()=>setStep("upload")} style={{ padding:"7px 12px", borderRadius:8, border:`1px solid ${D.border}`, background:"transparent", cursor:"pointer", fontSize:13 }}>← Retour</button>
        <div><h2 style={{ margin:0, fontSize:18, fontWeight:700 }}>Résultat de l'analyse IA</h2>
          <p style={{ margin:0, fontSize:13, color:D.textSec }}>{result?.fournisseur || "Fournisseur non détecté"} · {items.length} produits</p></div>
      </div>

      {preview && <img src={preview} alt="Facture scannée" style={{ width:"100%", maxHeight:200, objectFit:"contain", borderRadius:10, border:`1px solid ${D.border}`, marginBottom:14 }}/>}

      {/* Alertes hausse de prix */}
      {items.some(i => i.variation_pct > 5) && (
        <div style={{ background:D.dangerLight, border:`1px solid #FECACA`, borderRadius:10, padding:"10px 14px", marginBottom:14 }}>
          <p style={{ margin:0, fontSize:13, fontWeight:600, color:D.danger }}>
            ⚠️ Hausse de prix détectée sur {items.filter(i=>i.variation_pct>5).length} produit(s)
          </p>
        </div>
      )}

      {/* Tableau des items */}
      <div style={{ background:D.surface, border:`1px solid ${D.border}`, borderRadius:12, overflow:"hidden", marginBottom:14 }}>
        <div style={{ padding:"10px 14px", background:"#FAFAFA", borderBottom:`1px solid ${D.border}`, display:"grid", gridTemplateColumns:"2fr 1fr 1fr 1fr auto", gap:8 }}>
          {["Produit","Qté","Prix unit.","Variation","Sync"].map(h=>(
            <p key={h} style={{ margin:0, fontSize:10, fontWeight:700, color:D.textMuted, textTransform:"uppercase", letterSpacing:".06em" }}>{h}</p>
          ))}
        </div>
        {items.map((item, i) => (
          <div key={i} style={{ padding:"10px 14px", borderBottom:i<items.length-1?`1px solid ${D.border}`:"none", display:"grid", gridTemplateColumns:"2fr 1fr 1fr 1fr auto", gap:8, alignItems:"center", background:item.variation_pct>5?D.dangerLight:"transparent" }}>
            <div>
              <p style={{ margin:0, fontSize:13, fontWeight:500 }}>{item.nom}</p>
              {item.matched_product && <p style={{ margin:0, fontSize:10, color:D.brand }}>→ {item.matched_product.nom}</p>}
            </div>
            <p style={{ margin:0, fontSize:13 }}>{item.quantite} {item.unite}</p>
            <p style={{ margin:0, fontSize:13 }}>{item.prix_unitaire?.toFixed(2)}€</p>
            <p style={{ margin:0, fontSize:12, fontWeight:600, color:varColor(item.variation_pct) }}>
              {item.variation_pct !== null ? `${item.variation_pct>=0?"+":""}${item.variation_pct.toFixed(1)}%` : "—"}
            </p>
            <label style={{ display:"flex", alignItems:"center", gap:4, cursor:"pointer" }}>
              <input type="checkbox" checked={item.update_inventory} onChange={e=>setItems(prev=>prev.map((it,j)=>j===i?{...it,update_inventory:e.target.checked}:it))} style={{ width:16, height:16, cursor:"pointer" }}/>
            </label>
          </div>
        ))}
      </div>

      <button onClick={confirmAndSave} disabled={saving}
        style={{ width:"100%", padding:13, background:D.brand, color:"#fff", border:"none", borderRadius:11, fontSize:14, fontWeight:600, cursor:"pointer", boxShadow:"0 4px 14px rgba(37,99,235,.3)" }}>
        {saving ? "Mise à jour en cours..." : `Confirmer — mettre à jour ${items.filter(i=>i.update_inventory).length} produit(s)`}
      </button>
    </div>
  );

  return (
    <div>
      <h2 style={{ margin:"0 0 4px", fontSize:18, fontWeight:700, letterSpacing:"-.02em" }}>Scanner une facture / BL</h2>
      <p style={{ margin:"0 0 18px", fontSize:13, color:D.textSec }}>Claude lit la facture et met l'inventaire à jour automatiquement</p>

      <div onClick={()=>fileRef.current?.click()}
        style={{ background:D.surface, borderRadius:14, border:`2px dashed ${D.border}`, padding:"48px 24px", textAlign:"center", cursor:"pointer", marginBottom:16 }}
        onMouseEnter={e=>e.currentTarget.style.borderColor=D.brand} onMouseLeave={e=>e.currentTarget.style.borderColor=D.border}
        onDrop={e=>{e.preventDefault();handleFile(e.dataTransfer.files[0]);}} onDragOver={e=>e.preventDefault()}>
        <div style={{ width:56, height:56, borderRadius:14, background:D.brandLight, display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 14px", fontSize:26 }}>📸</div>
        <p style={{ margin:0, fontSize:16, fontWeight:600, color:D.text }}>Photo ou fichier de la facture</p>
        <p style={{ margin:"6px 0 0", fontSize:13, color:D.textSec }}>JPEG, PNG, PDF · Pris en photo depuis la tablette ou importé</p>
        {loading && <p style={{ margin:"14px 0 0", fontSize:14, fontWeight:600, color:D.brand }}>🤖 Claude analyse la facture...</p>}
        <input ref={fileRef} type="file" accept="image/*,.pdf" capture="environment" style={{display:"none"}} onChange={e=>e.target.files[0]&&handleFile(e.target.files[0])}/>
      </div>

      <div style={{ background:"#FFFBEB", border:`1px solid #FDE68A`, borderRadius:10, padding:"12px 14px" }}>
        <p style={{ margin:"0 0 6px", fontSize:13, fontWeight:600, color:"#92400E" }}>💡 Comment ça marche</p>
        <p style={{ margin:0, fontSize:12, color:"#78350F", lineHeight:1.6 }}>
          1. Tu prends la facture en photo ou l'importes<br/>
          2. Claude lit automatiquement les produits, quantités et prix<br/>
          3. Tu valides et l'inventaire + les prix sont mis à jour<br/>
          4. Si un prix a augmenté, une alerte s'affiche
        </p>
      </div>
    </div>
  );
}
