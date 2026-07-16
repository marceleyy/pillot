// ═══════════════════════════════════════════════════════════════
//  PILLOT — Module Import Caisse
//  Fichier : src/screens/ImportCaisse.jsx
//  Calcule automatiquement la consommation de glace depuis les ventes
// ═══════════════════════════════════════════════════════════════

import { useState, useRef } from "react";
import { supabase } from "../lib/supabase";
import * as XLSX from "xlsx";

const C = {
  brand:"#2563EB",brandLight:"#EFF6FF",
  success:"#16A34A",successLight:"#F0FDF4",
  warning:"#D97706",warningLight:"#FFFBEB",
  danger:"#DC2626",dangerLight:"#FEF2F2",
  purple:"#7C3AED",purpleLight:"#F5F3FF",
  border:"#E2E8F0",surface:"#FFFFFF",text:"#0F172A",textSec:"#64748B",textMuted:"#94A3B8"
};

const fmt = n => new Intl.NumberFormat("fr-FR",{style:"currency",currency:"EUR",minimumFractionDigits:2}).format(n||0);
const fmtKg = n => (Math.round((n||0)*100)/100).toFixed(2) + " kg";

export default function ImportCaisse({ restaurantId, profileId, toast }) {
  const [step, setStep] = useState("upload"); // upload | preview | result
  const [loading, setLoading] = useState(false);
  const [sales, setSales] = useState([]);
  const [glaceProducts, setGlaceProducts] = useState([]);
  const [consumption, setConsumption] = useState(null);
  const [importDate, setImportDate] = useState(new Date().toISOString().split("T")[0]);
  const fileRef = useRef(null);

  // Charger les poids théoriques depuis la base
  const loadGlaceProducts = async () => {
    const { data } = await supabase.from("glaces_products")
      .select("*").eq("restaurant_id", restaurantId).eq("actif", true);
    return data || [];
  };

  // Lire le fichier Excel de la caisse
  const handleFile = async (file) => {
    setLoading(true);
    try {
      const gp = await loadGlaceProducts();
      setGlaceProducts(gp);
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(ws, { defval: 0 });

      // Normaliser les colonnes (le format peut varier)
      const normalized = rows.map(r => {
        const nom = r["Produit"] || r["Product"] || r["Designation"] || r["Nom"] || Object.values(r)[0] || "";
        const sku = r["SKU"] || r["Code"] || r["Reference"] || "";
        const qty = parseFloat(r["QteProduit"] || r["Quantite"] || r["Qty"] || r["Qte"] || 0);
        const ca  = parseFloat(r["Chiffre d'affaires (€)"] || r["CA"] || r["Revenue"] || r["Montant"] || 0);
        const pm  = qty > 0 ? ca / qty : parseFloat(r["Prix Moyen (€)"] || r["PrixMoyen"] || 0);
        return { nom: String(nom).trim(), sku: String(sku), qty_sold: qty, ca, prix_moyen: pm };
      }).filter(r => r.nom && r.qty_sold > 0);

      setSales(normalized);

      // Calculer la consommation théorique de glace
      const gpMap = {};
      gp.forEach(p => {
        gpMap[p.sku] = p;
        gpMap[p.nom.toLowerCase()] = p;
      });

      let totalTheoriqueG = 0;
      const details = normalized.map(s => {
        const gp_match = gpMap[s.sku] || gpMap[s.nom.toLowerCase()] ||
          gp.find(p => s.nom.toLowerCase().includes(p.nom.toLowerCase()) ||
                       p.nom.toLowerCase().includes(s.nom.toLowerCase()));
        const poidsG = gp_match ? gp_match.poids_theorique_g : 0;
        const consG  = s.qty_sold * poidsG;
        totalTheoriqueG += consG;
        return { ...s, poids_theorique_g: poidsG, consommation_g: consG, matched: !!gp_match };
      });

      setSales(details);
      setConsumption({
        theorique_kg: totalTheoriqueG / 1000,
        theorique_bacs_35L: totalTheoriqueG / 1000 / 3.5,
        nb_produits_matches: details.filter(d => d.matched).length,
        nb_produits_total: details.length,
        ca_total: details.reduce((a, s) => a + s.ca, 0)
      });

      setStep("preview");
    } catch(err) {
      toast("Erreur de lecture du fichier : " + err.message, "error");
    }
    setLoading(false);
  };

  // Enregistrer l'import dans Supabase
  const saveImport = async () => {
    setLoading(true);
    try {
      // Créer l'import
      const { data: imp, error: impErr } = await supabase.from("pos_imports").insert({
        restaurant_id: restaurantId,
        import_date: importDate,
        source: "manual",
        total_ca: consumption?.ca_total || 0,
        nb_produits: sales.length
      }).select().single();

      if (impErr) throw impErr;

      // Enregistrer les lignes de vente
      const salesRows = sales.map(s => ({
        pos_import_id: imp.id,
        restaurant_id: restaurantId,
        product_nom: s.nom,
        sku: s.sku || null,
        qty_sold: s.qty_sold,
        ca: s.ca,
        prix_moyen: s.prix_moyen
      }));

      await supabase.from("pos_sales").insert(salesRows);

      // Enregistrer la consommation glace
      if (consumption && consumption.theorique_kg > 0) {
        await supabase.from("glaces_consumption").insert({
          restaurant_id: restaurantId,
          pos_import_id: imp.id,
          date: importDate,
          consommation_theorique_kg: consumption.theorique_kg,
          consommation_reelle_kg: 0, // sera mis à jour lors de l'inventaire physique
          ecart_kg: 0
        });
      }

      // Mise à jour CA automatique dans le restaurant
      await supabase.from("restaurants")
        .update({ ca_sucre: consumption?.ca_total || 0 })
        .eq("id", restaurantId);
        
      toast("Import enregistré — " + sales.length + " produits");
      
      setStep("result");
    } catch(err) {
      toast("Erreur : " + err.message, "error");
    }
    setLoading(false);
  };

  // ── UI ────────────────────────────────────────────────────────

  if (step === "upload") return (
    <div>
      <div style={{marginBottom:24}}>
        <h1 style={{margin:0,fontSize:22,fontWeight:800,letterSpacing:"-.5px"}}>Import caisse</h1>
        <p style={{margin:"4px 0 0",fontSize:14,color:C.textSec}}>Importe tes ventes POS pour calculer la consommation automatiquement</p>
      </div>

      <div style={{background:C.surface,borderRadius:14,border:`1px solid ${C.border}`,padding:24,marginBottom:16}}>
        <p style={{margin:"0 0 6px",fontSize:13,fontWeight:700}}>Date de la période</p>
        <input type="date" value={importDate} onChange={e => setImportDate(e.target.value)}
          style={{padding:"9px 12px",borderRadius:8,border:`1.5px solid ${C.border}`,fontSize:14,outline:"none"}}/>
      </div>

      <div
        onClick={() => fileRef.current?.click()}
        style={{background:C.surface,borderRadius:14,border:`2px dashed ${C.border}`,padding:"40px 24px",textAlign:"center",cursor:"pointer",marginBottom:16}}
        onMouseEnter={e => e.currentTarget.style.borderColor=C.brand}
        onMouseLeave={e => e.currentTarget.style.borderColor=C.border}
        onDrop={e => { e.preventDefault(); handleFile(e.dataTransfer.files[0]); }}
        onDragOver={e => e.preventDefault()}>
        <div style={{width:56,height:56,borderRadius:14,background:C.brandLight,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 14px",fontSize:26}}>📊</div>
        <p style={{margin:0,fontSize:15,fontWeight:700}}>Déposer le fichier Excel de la caisse</p>
        <p style={{margin:"6px 0 0",fontSize:13,color:C.textSec}}>Format accepté : .xlsx, .xls, .csv</p>
        {loading && <p style={{margin:"12px 0 0",fontSize:13,color:C.brand,fontWeight:600}}>Lecture en cours...</p>}
        <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" style={{display:"none"}}
          onChange={e => e.target.files[0] && handleFile(e.target.files[0])}/>
      </div>

      <div style={{background:C.surface,borderRadius:14,border:`1px solid ${C.border}`,padding:16}}>
        <p style={{margin:"0 0 10px",fontSize:12,fontWeight:700,color:C.textSec,textTransform:"uppercase",letterSpacing:".5px"}}>Formats supportés</p>
        <div style={{display:"flex",flexDirection:"column",gap:6}}>
          {[["Export standard caisse","Colonnes : Produit, QteProduit, CA"],["Lightspeed / Zelty","Export Excel → Rapport ventes → Période"],["L'Addition","Export CSV produits vendus"],["Ton fichier ventes actuel","Le .xlsx que tu viens d'uploader fonctionne"]].map(([n,d])=>(
            <div key={n} style={{display:"flex",alignItems:"flex-start",gap:10,padding:"8px 10px",background:"#F8FAFC",borderRadius:8}}>
              <span style={{color:C.success,fontWeight:700,fontSize:16,flexShrink:0}}>✓</span>
              <div><p style={{margin:0,fontSize:13,fontWeight:600}}>{n}</p><p style={{margin:0,fontSize:11,color:C.textSec}}>{d}</p></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  if (step === "preview") return (
    <div>
      <div style={{marginBottom:20,display:"flex",alignItems:"center",gap:12}}>
        <button onClick={() => setStep("upload")} style={{padding:"8px 14px",borderRadius:8,border:`1px solid ${C.border}`,background:"transparent",cursor:"pointer",fontSize:13}}>← Retour</button>
        <div><h1 style={{margin:0,fontSize:20,fontWeight:800}}>Vérification avant import</h1><p style={{margin:0,fontSize:13,color:C.textSec}}>{sales.length} produits · {importDate}</p></div>
      </div>

      {/* Stats consommation glace */}
      {consumption && consumption.theorique_kg > 0 && (
        <div style={{background:C.purpleLight,borderRadius:14,border:`1px solid #C4B5FD`,padding:16,marginBottom:16}}>
          <p style={{margin:"0 0 10px",fontSize:13,fontWeight:800,color:C.purple}}>🍦 Consommation glace théorique calculée</p>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10}}>
            {[[fmtKg(consumption.theorique_kg),"Glace consommée"],[consumption.theorique_bacs_35L.toFixed(1)+" bacs","Équiv. bacs 3,5L"],[consumption.nb_produits_matches+"/"+consumption.nb_produits_total,"Produits matchés"]].map(([v,l])=>(
              <div key={l} style={{background:C.surface,borderRadius:10,padding:"10px 12px",textAlign:"center"}}>
                <p style={{margin:0,fontSize:17,fontWeight:800,color:C.purple}}>{v}</p>
                <p style={{margin:0,fontSize:10,color:C.textMuted}}>{l}</p>
              </div>
            ))}
          </div>
          <p style={{margin:"10px 0 0",fontSize:11,color:C.purple}}>Comparez avec votre inventaire physique pour calculer l'écart réel.</p>
        </div>
      )}

      {/* Stats CA */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:14}}>
        <div style={{background:C.surface,borderRadius:10,border:`1px solid ${C.border}`,padding:"12px 14px"}}>
          <p style={{margin:0,fontSize:11,color:C.textSec}}>CA total</p>
          <p style={{margin:"4px 0 0",fontSize:20,fontWeight:800,color:C.text}}>{fmt(consumption?.ca_total)}</p>
        </div>
        <div style={{background:C.surface,borderRadius:10,border:`1px solid ${C.border}`,padding:"12px 14px"}}>
          <p style={{margin:0,fontSize:11,color:C.textSec}}>Produits vendus</p>
          <p style={{margin:"4px 0 0",fontSize:20,fontWeight:800}}>{sales.reduce((a,s)=>a+s.qty_sold,0).toFixed(0)}</p>
        </div>
      </div>

      {/* Top produits avec consommation glace */}
      <div style={{background:C.surface,borderRadius:14,border:`1px solid ${C.border}`,overflow:"hidden",marginBottom:16}}>
        <div style={{padding:"11px 16px",borderBottom:`1px solid ${C.border}`,background:"#F8FAFC"}}>
          <p style={{margin:0,fontSize:12,fontWeight:700,color:C.textSec,textTransform:"uppercase",letterSpacing:".5px"}}>Top ventes</p>
        </div>
        {sales.sort((a,b)=>b.ca-a.ca).slice(0,10).map((s,i) => (
          <div key={i} style={{padding:"10px 16px",borderBottom:`1px solid ${C.border}`,display:"flex",alignItems:"center",gap:10}}>
            <span style={{width:22,height:22,borderRadius:"50%",background:"#F1F5F9",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,color:C.textSec,flexShrink:0}}>{i+1}</span>
            <div style={{flex:1}}>
              <p style={{margin:0,fontSize:13,fontWeight:500}}>{s.nom}</p>
              {s.poids_theorique_g > 0 && <p style={{margin:0,fontSize:11,color:C.purple}}>{s.qty_sold}× × {s.poids_theorique_g}g = {fmtKg(s.consommation_g/1000)}</p>}
            </div>
            <div style={{textAlign:"right",flexShrink:0}}>
              <p style={{margin:0,fontSize:13,fontWeight:700}}>{fmt(s.ca)}</p>
              <p style={{margin:0,fontSize:11,color:C.textSec}}>{s.qty_sold.toFixed(0)} ventes</p>
            </div>
            {s.matched && <span style={{fontSize:10,background:C.purpleLight,color:C.purple,padding:"2px 6px",borderRadius:6,flexShrink:0}}>🍦</span>}
          </div>
        ))}
      </div>

      <button onClick={saveImport} disabled={loading} style={{width:"100%",padding:14,background:C.brand,color:"#fff",border:"none",borderRadius:12,fontSize:15,fontWeight:700,cursor:"pointer",boxShadow:"0 4px 14px rgba(37,99,235,.35)"}}>
        {loading ? "Enregistrement..." : "Confirmer l'import — " + sales.length + " produits"}
      </button>
    </div>
  );

  return (
    <div style={{textAlign:"center",padding:"40px 20px"}}>
      <div style={{width:64,height:64,borderRadius:"50%",background:C.successLight,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 16px",fontSize:28}}>✅</div>
      <h2 style={{margin:"0 0 8px",fontSize:20,fontWeight:800}}>Import enregistré</h2>
      <p style={{margin:"0 0 24px",color:C.textSec,fontSize:14}}>{sales.length} produits · CA {fmt(consumption?.ca_total)}</p>
      {consumption?.theorique_kg > 0 && (
        <div style={{background:C.purpleLight,borderRadius:12,padding:16,marginBottom:24,textAlign:"left"}}>
          <p style={{margin:"0 0 6px",fontSize:13,fontWeight:700,color:C.purple}}>Résumé consommation glace</p>
          <p style={{margin:0,fontSize:15,fontWeight:800,color:C.purple}}>{fmtKg(consumption.theorique_kg)} théoriques</p>
          <p style={{margin:"4px 0 0",fontSize:12,color:C.purple}}>≈ {consumption.theorique_bacs_35L.toFixed(1)} bacs de 3,5L consommés</p>
          <p style={{margin:"8px 0 0",fontSize:12,color:C.textSec}}>Faites l'inventaire physique pour calculer l'écart réel.</p>
        </div>
      )}
      <button onClick={() => setStep("upload")} style={{padding:"11px 24px",background:C.brand,color:"#fff",border:"none",borderRadius:10,fontSize:14,fontWeight:700,cursor:"pointer"}}>
        Nouvel import
      </button>
    </div>
  );
}
