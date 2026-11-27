// ═══════════════════════════════════════════════════════════════
//  PILLOT GLACES — Module complet glacier artisan
//  Fichier : src/screens/PillotGlaces.jsx
// ═══════════════════════════════════════════════════════════════

import { useState, useEffect, useRef } from "react";
import { supabase } from "../lib/supabase";
import * as XLSX from "xlsx";

// ── Design System ─────────────────────────────────────────────
const D = {
  bg: "#F9FAFB",
  surface: "#FFFFFF",
  purple: "#7C3AED",
  purpleLight: "#F5F3FF",
  purpleMid: "#DDD6FE",
  border: "#E5E7EB",
  text: "#111827",
  textSec: "#6B7280",
  textMuted: "#9CA3AF",
  success: "#059669",
  successLight: "#ECFDF5",
  warning: "#D97706",
  warningLight: "#FFFBEB",
  danger: "#DC2626",
  dangerLight: "#FEF2F2",
};

// Poids théoriques par format vendu (grammes de glace)
const POIDS = {
  "CORNET ENFANT":    69,  "CORNET PETIT":     114, "CORNET CLASSIQUE": 153,
  "CORNET GRAND":     224, "POT ENFANT":        81,  "POT PETIT":         133,
  "POT CLASSIQUE":    163, "POT GRAND":         221, "POT GEANT":         275,
  "CHOCO CONE PETIT": 112, "CHOCO CONE CLASSIQUE": 149, "CHOCO CONE GRAND": 208,
  "BAC 550 ML":       470, "BAC 1100 ML":       930,
  "MILKSHAKE":        160, "SORBET DRINK":      160, "AFFOGATO CAFFE":    160,
  "GAUFRE PARFAITE":   50, "MACARON XL":         50,
};

const KG_PAR_BAC = 3.5; // bac 3.5L standard Odyssée des Glaces
const fmtKg = v => `${((+v)||0).toFixed(2)} kg`;
const fmtBac = v => `${((+v)||0).toFixed(1)} bacs`;
const fmt = n => new Intl.NumberFormat("fr-FR",{style:"currency",currency:"EUR",minimumFractionDigits:0}).format(n||0);

function Tag({ children, color = D.purple, bg = D.purpleLight }) {
  return <span style={{ fontSize:11, fontWeight:600, color, background:bg, padding:"2px 8px", borderRadius:20, whiteSpace:"nowrap" }}>{children}</span>;
}

function Stat({ label, value, sub, color = D.text }) {
  return (
    <div style={{ background:D.surface, border:`1px solid ${D.border}`, borderRadius:12, padding:"16px 18px" }}>
      <p style={{ margin:"0 0 6px", fontSize:11, fontWeight:600, color:D.textMuted, textTransform:"uppercase", letterSpacing:".06em" }}>{label}</p>
      <p style={{ margin:0, fontSize:26, fontWeight:700, color, letterSpacing:"-.03em", lineHeight:1 }}>{value}</p>
      {sub && <p style={{ margin:"4px 0 0", fontSize:12, color:D.textSec }}>{sub}</p>}
    </div>
  );
}

// ── COMPOSANT PRINCIPAL ───────────────────────────────────────
export default function PillotGlaces({ restaurantId, profileId, toast }) {
  const [onglet, setOnglet] = useState("bilan");
  const [flavors, setFlavors] = useState([]);
  const [daily, setDaily] = useState([]);
  const [posImports, setPosImports] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadAll(); }, [restaurantId]);

  const loadAll = async () => {
    if (!restaurantId) return;
    setLoading(true);
    const [{ data: fl }, { data: da }, { data: pi }] = await Promise.all([
      supabase.from("glaces_flavors").select("*").eq("restaurant_id", restaurantId).order("ordre"),
      supabase.from("glaces_daily").select("*").eq("restaurant_id", restaurantId).order("date", { ascending:false }).limit(30),
      supabase.from("pos_imports").select("*, pos_sales(*)").eq("restaurant_id", restaurantId).order("created_at", { ascending:false }).limit(10),
    ]);
    setFlavors(fl || []); setDaily(da || []); setPosImports(pi || []);
    setLoading(false);
  };

  const today = daily[0];
  const totalBacsEnStock = flavors.reduce((a, f) => a + (f.stock_bacs || 0), 0);
  const flavorsRupture = flavors.filter(f => f.stock_bacs <= 0 && f.actif);
  const flavorsAlerte = flavors.filter(f => f.stock_bacs > 0 && f.stock_bacs <= f.stock_min_bacs && f.actif);

  const TABS = [["bilan","📊 Bilan"],["parfums","🍦 Parfums"],["import","📂 Import caisse"],["commande","📋 Commander"]];

  if (loading) return <div style={{ padding:48, textAlign:"center", color:D.textMuted }}>Chargement Pillot Glaces...</div>;

  return (
    <div>
      {/* Header signature */}
      <div style={{ marginBottom:20, display:"flex", alignItems:"flex-start", justifyContent:"space-between", flexWrap:"wrap", gap:10 }}>
        <div>
          <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:4 }}>
            <div style={{ width:32, height:32, background:"linear-gradient(135deg,#7C3AED,#5B21B6)", borderRadius:9, display:"flex", alignItems:"center", justifyContent:"center", fontSize:17 }}>🍦</div>
            <h1 style={{ margin:0, fontSize:22, fontWeight:700, letterSpacing:"-.03em", color:D.text }}>Pillot Glaces</h1>
          </div>
          <p style={{ margin:0, fontSize:14, color:D.textSec }}>{flavors.filter(f=>f.actif).length} parfums actifs · {fmtBac(totalBacsEnStock)} en stock</p>
        </div>
      </div>

      {/* Alertes urgentes */}
      {(flavorsRupture.length > 0 || flavorsAlerte.length > 0) && (
        <div style={{ background:D.dangerLight, border:`1px solid #FECACA`, borderRadius:12, padding:"12px 16px", marginBottom:16, display:"flex", alignItems:"center", gap:12 }}>
          <span style={{ fontSize:20 }}>⚠️</span>
          <div>
            {flavorsRupture.length > 0 && <p style={{ margin:0, fontSize:13, fontWeight:600, color:D.danger }}>{flavorsRupture.length} parfum{flavorsRupture.length>1?"s":""} en rupture : {flavorsRupture.map(f=>f.nom).join(", ")}</p>}
            {flavorsAlerte.length > 0 && <p style={{ margin:0, fontSize:12, color:D.warning }}>Stock faible : {flavorsAlerte.map(f=>f.nom).join(", ")}</p>}
          </div>
        </div>
      )}

      {/* Onglets */}
      <div style={{ display:"flex", gap:3, background:"#F3F4F6", padding:3, borderRadius:10, marginBottom:18 }}>
        {TABS.map(([k,l]) => (
          <button key={k} onClick={() => setOnglet(k)}
            style={{ flex:1, padding:"7px 6px", borderRadius:8, border:"none", fontSize:12, fontWeight:onglet===k?600:400, cursor:"pointer", background:onglet===k?D.surface:"transparent", color:onglet===k?D.text:D.textSec, boxShadow:onglet===k?"0 1px 3px rgba(0,0,0,.08)":"none", transition:"all .15s", whiteSpace:"nowrap" }}>
            {l}
          </button>
        ))}
      </div>

      {onglet === "bilan"   && <BilanTab daily={daily} flavors={flavors} toast={toast} restaurantId={restaurantId} onRefresh={loadAll}/>}
      {onglet === "parfums" && <ParfumsTab flavors={flavors} restaurantId={restaurantId} profileId={profileId} toast={toast} onRefresh={loadAll}/>}
      {onglet === "import"  && <ImportTab posImports={posImports} restaurantId={restaurantId} profileId={profileId} toast={toast} onRefresh={loadAll}/>}
      {onglet === "commande"&& <CommandeTab flavors={flavors} toast={toast}/>}
    </div>
  );
}

// ── BILAN QUOTIDIEN ───────────────────────────────────────────
function BilanTab({ daily, flavors, toast, restaurantId, onRefresh }) {
  const [stockFin, setStockFin] = useState("");
  const [perte, setPerte] = useState(0);
  const [saving, setSaving] = useState(false);

  const today = daily[0];
  const totalBacs = flavors.reduce((a, f) => a + (f.stock_bacs || 0), 0);

  const saveBilan = async () => {
    if (!stockFin) { toast("Saisir le stock de fin","warning"); return; }
    setSaving(true);
    const stockFinBacs = parseFloat(stockFin);
    const theorique_kg = today?.consommation_theorique_kg || 0;
    const reelle_kg = (totalBacs - stockFinBacs) * KG_PAR_BAC;
    const ecart = reelle_kg - theorique_kg;
    const ecart_pct = theorique_kg > 0 ? (ecart / theorique_kg * 100) : 0;

    const d = new Date().toISOString().split("T")[0];
    const { error } = await supabase.from("glaces_daily").upsert({
      restaurant_id: restaurantId, date: d,
      stock_debut_bacs: totalBacs,
      stock_fin_bacs: stockFinBacs,
      consommation_theorique_kg: theorique_kg,
      consommation_reelle_kg: reelle_kg,
      perte_kg: parseFloat(perte) || 0,
      ecart_kg: ecart,
      ecart_pct,
    }, { onConflict: "restaurant_id,date" });

    if (!error) { toast("Bilan enregistré"); await onRefresh(); setStockFin(""); }
    else toast("Erreur","error");
    setSaving(false);
  };

  const ecart = today?.ecart_kg || 0;
  const ecartColor = Math.abs(ecart) < 0.5 ? D.success : Math.abs(ecart) < 2 ? D.warning : D.danger;

  return (
    <div>
      {/* Stats du jour */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(2,1fr)", gap:10, marginBottom:16 }}>
        <Stat label="Stock actuel" value={fmtBac(flavors.reduce((a,f)=>a+(f.stock_bacs||0),0))} sub="total bacs en stock"/>
        <Stat label="Consommation théo." value={today ? fmtKg(today.consommation_theorique_kg) : "—"} sub="calculée depuis la caisse" color={D.purple}/>
        <Stat label="Écart dernier bilan" value={today ? (ecart >= 0 ? "+" : "") + fmtKg(ecart) : "—"} sub={today ? `${(today.ecart_pct||0).toFixed(1)}% de la consommation` : "Aucun bilan"} color={ecartColor}/>
        <Stat label="Pertes déclarées" value={today ? fmtKg(today.perte_kg) : "—"} sub="ce jour"/>
      </div>

      {/* Saisie bilan de fin de journée */}
      <div style={{ background:D.surface, border:`1px solid ${D.border}`, borderRadius:14, padding:20, marginBottom:16 }}>
        <p style={{ margin:"0 0 14px", fontSize:15, fontWeight:600, color:D.text }}>Bilan de fin de journée</p>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:14 }}>
          <div>
            <label style={{ fontSize:11, fontWeight:600, color:D.textMuted, display:"block", marginBottom:5, textTransform:"uppercase", letterSpacing:".06em" }}>Stock fin de journée (bacs)</label>
            <input type="number" value={stockFin} onChange={e=>setStockFin(e.target.value)} placeholder="Ex: 42" min="0" step="0.5"
              style={{ width:"100%", boxSizing:"border-box", padding:"10px 12px", borderRadius:9, border:`1.5px solid ${D.border}`, fontSize:15, fontWeight:600, outline:"none" }}
              onFocus={e=>e.target.style.borderColor=D.purple} onBlur={e=>e.target.style.borderColor=D.border}/>
          </div>
          <div>
            <label style={{ fontSize:11, fontWeight:600, color:D.textMuted, display:"block", marginBottom:5, textTransform:"uppercase", letterSpacing:".06em" }}>Pertes déclarées (kg)</label>
            <input type="number" value={perte} onChange={e=>setPerte(e.target.value)} placeholder="0" min="0" step="0.1"
              style={{ width:"100%", boxSizing:"border-box", padding:"10px 12px", borderRadius:9, border:`1.5px solid ${D.border}`, fontSize:15, fontWeight:600, outline:"none" }}
              onFocus={e=>e.target.style.borderColor=D.purple} onBlur={e=>e.target.style.borderColor=D.border}/>
          </div>
        </div>
        <button onClick={saveBilan} disabled={saving || !stockFin}
          style={{ width:"100%", padding:"12px", background:stockFin?"#7C3AED":"#E5E7EB", color:stockFin?"#fff":D.textMuted, border:"none", borderRadius:10, fontSize:14, fontWeight:600, cursor:stockFin?"pointer":"not-allowed", transition:"background .15s" }}>
          {saving ? "Enregistrement..." : "Enregistrer le bilan"}
        </button>
      </div>

      {/* Historique bilans */}
      {daily.length > 0 && (
        <div style={{ background:D.surface, border:`1px solid ${D.border}`, borderRadius:14, overflow:"hidden" }}>
          <div style={{ padding:"12px 16px", borderBottom:`1px solid ${D.border}`, background:"#FAFAFA" }}>
            <p style={{ margin:0, fontSize:11, fontWeight:600, color:D.textMuted, textTransform:"uppercase", letterSpacing:".06em" }}>Historique des bilans</p>
          </div>
          {daily.slice(0,7).map((d, i) => {
            const ec = d.ecart_kg || 0;
            const eCol = Math.abs(ec) < 0.5 ? D.success : Math.abs(ec) < 2 ? D.warning : D.danger;
            return (
              <div key={d.id} style={{ padding:"12px 16px", borderBottom:i<6?`1px solid ${D.border}`:"none", display:"flex", alignItems:"center", gap:12 }}>
                <div style={{ flex:1 }}>
                  <p style={{ margin:0, fontSize:13, fontWeight:600 }}>{new Date(d.date).toLocaleDateString("fr-FR",{weekday:"long",day:"numeric",month:"short"})}</p>
                  <p style={{ margin:0, fontSize:11, color:D.textSec }}>Théo: {fmtKg(d.consommation_theorique_kg)} · Réel: {fmtKg(d.consommation_reelle_kg)}</p>
                </div>
                <div style={{ textAlign:"right" }}>
                  <p style={{ margin:0, fontSize:14, fontWeight:700, color:eCol }}>{ec>=0?"+":""}{fmtKg(ec)}</p>
                  <p style={{ margin:0, fontSize:10, color:D.textMuted }}>{(d.ecart_pct||0).toFixed(1)}% écart</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── PARFUMS ───────────────────────────────────────────────────
function ParfumsTab({ flavors, restaurantId, profileId, toast, onRefresh }) {
  const [editId, setEditId] = useState(null);
  const [editBacs, setEditBacs] = useState("");
  const [saving, setSaving] = useState(false);
  const [addModal, setAddModal] = useState(false);
  const [newFlavor, setNewFlavor] = useState({ nom:"", categorie:"glace", couleur_hex:"#7C3AED", stock_bacs:0, stock_min_bacs:2 });

  const saveBacs = async (id) => {
    setSaving(true);
    await supabase.from("glaces_flavors").update({ stock_bacs: parseFloat(editBacs) || 0 }).eq("id", id);
    toast("Stock mis à jour"); setEditId(null); await onRefresh();
    setSaving(false);
  };

  const saveFlavor = async () => {
    setSaving(true);
    await supabase.from("glaces_flavors").insert({ restaurant_id:restaurantId, ...newFlavor });
    toast("Parfum ajouté"); setAddModal(false);
    setNewFlavor({ nom:"", categorie:"glace", couleur_hex:"#7C3AED", stock_bacs:0, stock_min_bacs:2 });
    await onRefresh(); setSaving(false);
  };

  const status = (f) => {
    if (!f.stock_bacs || f.stock_bacs <= 0) return { label:"Rupture", color:D.danger, bg:D.dangerLight };
    if (f.stock_bacs <= f.stock_min_bacs) return { label:"Stock faible", color:D.warning, bg:D.warningLight };
    return { label:"OK", color:D.success, bg:D.successLight };
  };

  const glaces = flavors.filter(f => f.categorie === "glace" && f.actif);
  const sorbets = flavors.filter(f => f.categorie === "sorbet" && f.actif);

  const Section = ({ title, items }) => (
    <div style={{ marginBottom:16 }}>
      <p style={{ margin:"0 0 10px", fontSize:11, fontWeight:700, color:D.textMuted, textTransform:"uppercase", letterSpacing:".06em" }}>{title}</p>
      <div style={{ background:D.surface, border:`1px solid ${D.border}`, borderRadius:12, overflow:"hidden" }}>
        {items.map((f, i) => {
          const s = status(f);
          if (editId === f.id) return (
            <div key={f.id} style={{ padding:"13px 16px", borderBottom:i<items.length-1?`1px solid ${D.border}`:"none", background:D.purpleLight }}>
              <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:8 }}>
                <div style={{ width:10, height:10, borderRadius:"50%", background:f.couleur_hex, flexShrink:0 }}/>
                <p style={{ margin:0, fontSize:14, fontWeight:600 }}>{f.nom}</p>
              </div>
              <div style={{ display:"flex", gap:8 }}>
                <input type="number" value={editBacs} onChange={e=>setEditBacs(e.target.value)} autoFocus min="0" step="0.5" placeholder="Bacs"
                  style={{ flex:1, padding:"8px 12px", borderRadius:8, border:`1.5px solid ${D.purple}`, fontSize:16, fontWeight:700, outline:"none" }}/>
                <span style={{ alignSelf:"center", fontSize:13, color:D.textSec }}>bacs</span>
                <button onClick={() => saveBacs(f.id)} disabled={saving}
                  style={{ padding:"8px 16px", background:D.purple, color:"#fff", border:"none", borderRadius:8, fontSize:13, fontWeight:600, cursor:"pointer" }}>
                  {saving?"...":"OK"}
                </button>
                <button onClick={() => setEditId(null)} style={{ padding:"8px 10px", background:"transparent", border:`1px solid ${D.border}`, borderRadius:8, cursor:"pointer" }}>✕</button>
              </div>
            </div>
          );
          return (
            <div key={f.id} onClick={() => { setEditId(f.id); setEditBacs(String(f.stock_bacs||0)); }}
              style={{ padding:"12px 16px", borderBottom:i<items.length-1?`1px solid ${D.border}`:"none", display:"flex", alignItems:"center", gap:12, cursor:"pointer", transition:"background .1s" }}
              onMouseEnter={e=>e.currentTarget.style.background="#FAFAFA"} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
              <div style={{ width:10, height:10, borderRadius:"50%", background:f.couleur_hex, flexShrink:0 }}/>
              <p style={{ margin:0, fontSize:13, fontWeight:500, flex:1 }}>{f.nom}</p>
              <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                <p style={{ margin:0, fontSize:14, fontWeight:700, color:s.color }}>{f.stock_bacs || 0} bacs</p>
                <span style={{ fontSize:10, fontWeight:600, color:s.color, background:s.bg, padding:"2px 8px", borderRadius:10 }}>{s.label}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  return (
    <div>
      {addModal && (
        <div style={{ position:"fixed", inset:0, background:"rgba(17,24,39,.5)", zIndex:200, display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}>
          <div style={{ background:D.surface, borderRadius:16, padding:24, maxWidth:360, width:"100%", boxShadow:"0 20px 60px rgba(0,0,0,.25)" }}>
            <h3 style={{ margin:"0 0 16px", fontSize:16, fontWeight:700 }}>Ajouter un parfum</h3>
            <div style={{ display:"flex", flexDirection:"column", gap:10, marginBottom:16 }}>
              <div><label style={{ fontSize:11, fontWeight:600, color:D.textMuted, display:"block", marginBottom:4, textTransform:"uppercase", letterSpacing:".06em" }}>Nom du parfum</label>
                <input value={newFlavor.nom} onChange={e=>setNewFlavor(p=>({...p,nom:e.target.value}))} placeholder="Ex: Caramel" style={{ width:"100%", boxSizing:"border-box", padding:"9px 12px", borderRadius:9, border:`1px solid ${D.border}`, fontSize:14 }}/></div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
                <div><label style={{ fontSize:11, fontWeight:600, color:D.textMuted, display:"block", marginBottom:4, textTransform:"uppercase", letterSpacing:".06em" }}>Type</label>
                  <select value={newFlavor.categorie} onChange={e=>setNewFlavor(p=>({...p,categorie:e.target.value}))} style={{ width:"100%", padding:"9px 10px", borderRadius:9, border:`1px solid ${D.border}`, fontSize:13 }}>
                    <option value="glace">Glace</option><option value="sorbet">Sorbet</option><option value="special">Spécial</option>
                  </select></div>
                <div><label style={{ fontSize:11, fontWeight:600, color:D.textMuted, display:"block", marginBottom:4, textTransform:"uppercase", letterSpacing:".06em" }}>Couleur</label>
                  <input type="color" value={newFlavor.couleur_hex} onChange={e=>setNewFlavor(p=>({...p,couleur_hex:e.target.value}))} style={{ width:"100%", height:42, borderRadius:9, border:`1px solid ${D.border}`, cursor:"pointer" }}/></div>
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
                <div><label style={{ fontSize:11, fontWeight:600, color:D.textMuted, display:"block", marginBottom:4, textTransform:"uppercase", letterSpacing:".06em" }}>Stock actuel (bacs)</label>
                  <input type="number" value={newFlavor.stock_bacs} onChange={e=>setNewFlavor(p=>({...p,stock_bacs:+e.target.value}))} min="0" step="0.5" style={{ width:"100%", boxSizing:"border-box", padding:"9px 12px", borderRadius:9, border:`1px solid ${D.border}`, fontSize:14 }}/></div>
                <div><label style={{ fontSize:11, fontWeight:600, color:D.textMuted, display:"block", marginBottom:4, textTransform:"uppercase", letterSpacing:".06em" }}>Stock minimum</label>
                  <input type="number" value={newFlavor.stock_min_bacs} onChange={e=>setNewFlavor(p=>({...p,stock_min_bacs:+e.target.value}))} min="0" step="0.5" style={{ width:"100%", boxSizing:"border-box", padding:"9px 12px", borderRadius:9, border:`1px solid ${D.border}`, fontSize:14 }}/></div>
              </div>
            </div>
            <div style={{ display:"flex", gap:8 }}>
              <button onClick={saveFlavor} disabled={saving||!newFlavor.nom} style={{ flex:1, padding:"11px", background:newFlavor.nom?D.purple:"#E5E7EB", color:newFlavor.nom?"#fff":D.textMuted, border:"none", borderRadius:10, fontSize:14, fontWeight:600, cursor:newFlavor.nom?"pointer":"default" }}>{saving?"...":"Ajouter"}</button>
              <button onClick={()=>setAddModal(false)} style={{ padding:"11px 14px", background:"transparent", border:`1px solid ${D.border}`, borderRadius:10, cursor:"pointer" }}>Annuler</button>
            </div>
          </div>
        </div>
      )}
      <div style={{ display:"flex", justifyContent:"flex-end", marginBottom:14 }}>
        <button onClick={()=>setAddModal(true)} style={{ padding:"8px 16px", background:D.purple, color:"#fff", border:"none", borderRadius:9, fontSize:13, fontWeight:600, cursor:"pointer" }}>+ Parfum</button>
      </div>
      {glaces.length > 0 && <Section title={`Glaces (${glaces.length})`} items={glaces}/>}
      {sorbets.length > 0 && <Section title={`Sorbets (${sorbets.length})`} items={sorbets}/>}
    </div>
  );
}

// ── IMPORT CAISSE ─────────────────────────────────────────────
function ImportTab({ posImports, restaurantId, profileId, toast, onRefresh }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const fileRef = useRef(null);

  const handleFile = async (file) => {
    setLoading(true);
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type:"array" });
      const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval:0 });

      let totalGlaceG = 0, totalCA = 0;
      const detail = [];

      rows.forEach(r => {
        const nom = String(r["Produit"]||r["Product"]||Object.values(r)[0]||"").trim().toUpperCase();
        const qty = parseFloat(r["QteProduit"]||r["Qty"]||r["Quantite"]||0);
        const ca  = parseFloat(r["Chiffre d'affaires (€)"]||r["CA"]||0);
        if (!nom || !qty) return;

        // Chercher le poids théorique
        const poidsKey = Object.keys(POIDS).find(k => nom.includes(k) || k.includes(nom));
        const poids = poidsKey ? POIDS[poidsKey] : 0;
        const consoG = qty * poids;
        totalGlaceG += consoG;
        totalCA += ca;
        if (poids > 0) detail.push({ nom, qty, poids, consoG, ca });
      });

      const theorique_kg = totalGlaceG / 1000;
      const theorique_bacs = theorique_kg / KG_PAR_BAC;

      // Sauvegarder
      const { data: imp } = await supabase.from("pos_imports").insert({
        restaurant_id: restaurantId, import_date: new Date().toISOString().split("T")[0],
        source:"manual", total_ca: totalCA, nb_produits: detail.length
      }).select().single();

      if (imp) {
        await supabase.from("pos_sales").insert(detail.map(d => ({
          pos_import_id:imp.id, restaurant_id:restaurantId,
          product_nom:d.nom, qty_sold:d.qty, ca:d.ca
        })));

        const d = new Date().toISOString().split("T")[0];
        await supabase.from("glaces_daily").upsert({
          restaurant_id:restaurantId, date:d,
          consommation_theorique_kg: theorique_kg,
          ca_glaces: totalCA, pos_import_id: imp.id
        }, { onConflict:"restaurant_id,date" });

        // Mettre à jour CA sucré du restaurant
        await supabase.from("restaurants").update({ ca_sucre: totalCA }).eq("id", restaurantId);
      }

      setResult({ theorique_kg, theorique_bacs, totalCA, detail });
      await onRefresh();
      toast("Import calculé — consommation mise à jour");
    } catch(e) { toast("Erreur : " + e.message, "error"); }
    setLoading(false);
  };

  if (result) return (
    <div>
      <div style={{ background:D.purpleLight, border:`1px solid ${D.purpleMid}`, borderRadius:14, padding:20, marginBottom:16 }}>
        <p style={{ margin:"0 0 12px", fontSize:15, fontWeight:700, color:D.purple }}>🍦 Résultat de l'import</p>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10, marginBottom:12 }}>
          {[[fmtKg(result.theorique_kg),"Consommation théo."],[fmtBac(result.theorique_bacs),"Équiv. bacs 3,5L"],[fmt(result.totalCA),"CA glaces"]].map(([v,l])=>(
            <div key={l} style={{ background:D.surface, borderRadius:10, padding:"10px 12px", textAlign:"center" }}>
              <p style={{ margin:0, fontSize:17, fontWeight:700, color:D.purple }}>{v}</p>
              <p style={{ margin:0, fontSize:10, color:D.textMuted }}>{l}</p>
            </div>
          ))}
        </div>
        <div style={{ background:D.surface, borderRadius:10, overflow:"hidden" }}>
          {result.detail.sort((a,b)=>b.consoG-a.consoG).slice(0,8).map((d,i)=>(
            <div key={i} style={{ padding:"8px 12px", borderBottom:i<7?`1px solid ${D.border}`:"none", display:"flex", justifyContent:"space-between", fontSize:12 }}>
              <span style={{ fontWeight:500 }}>{d.nom} <span style={{ color:D.textMuted }}>×{d.qty}</span></span>
              <span style={{ color:D.purple, fontWeight:600 }}>{fmtKg(d.consoG/1000)}</span>
            </div>
          ))}
        </div>
      </div>
      <button onClick={()=>setResult(null)} style={{ width:"100%", padding:12, background:D.purple, color:"#fff", border:"none", borderRadius:10, fontSize:14, fontWeight:600, cursor:"pointer" }}>Nouvel import</button>
    </div>
  );

  return (
    <div>
      <div onClick={()=>fileRef.current?.click()}
        style={{ background:D.surface, borderRadius:14, border:`2px dashed ${D.border}`, padding:"40px 24px", textAlign:"center", cursor:"pointer", marginBottom:16 }}
        onMouseEnter={e=>e.currentTarget.style.borderColor=D.purple} onMouseLeave={e=>e.currentTarget.style.borderColor=D.border}
        onDrop={e=>{e.preventDefault();handleFile(e.dataTransfer.files[0]);}} onDragOver={e=>e.preventDefault()}>
        <div style={{ width:52, height:52, borderRadius:14, background:D.purpleLight, display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 14px", fontSize:24 }}>📊</div>
        <p style={{ margin:0, fontSize:15, fontWeight:600 }}>Déposer le fichier de ventes caisse</p>
        <p style={{ margin:"6px 0 0", fontSize:13, color:D.textSec }}>Calcul automatique de la consommation de glace</p>
        {loading && <p style={{ margin:"12px 0 0", fontSize:13, color:D.purple, fontWeight:600 }}>Calcul en cours...</p>}
        <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" style={{display:"none"}} onChange={e=>e.target.files[0]&&handleFile(e.target.files[0])}/>
      </div>

      {posImports.length > 0 && (
        <div style={{ background:D.surface, border:`1px solid ${D.border}`, borderRadius:12, overflow:"hidden" }}>
          <div style={{ padding:"10px 14px", background:"#FAFAFA", borderBottom:`1px solid ${D.border}` }}>
            <p style={{ margin:0, fontSize:11, fontWeight:600, color:D.textMuted, textTransform:"uppercase", letterSpacing:".06em" }}>Imports récents</p>
          </div>
          {posImports.slice(0,5).map((p,i)=>(
            <div key={p.id} style={{ padding:"10px 14px", borderBottom:i<4?`1px solid ${D.border}`:"none", display:"flex", justifyContent:"space-between", fontSize:13 }}>
              <span style={{ fontWeight:500 }}>{new Date(p.import_date).toLocaleDateString("fr-FR")}</span>
              <span style={{ color:D.textSec }}>{p.nb_produits} produits · {fmt(p.total_ca)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── COMMANDE ODG ──────────────────────────────────────────────
function CommandeTab({ flavors, toast }) {
  const [copied, setCopied] = useState(false);
  const toLow = flavors.filter(f => f.actif && (f.stock_bacs || 0) <= (f.stock_min_bacs || 2));
  const msg = "Bonjour Lucas,\nMerci de préparer cette commande pour Le Chichi Annecy :\n\n" +
    toLow.map(f => `- ${f.nom} : ${Math.max(1, (f.stock_min_bacs||2)*2 - (f.stock_bacs||0)).toFixed(0)} bac(s)`).join("\n") +
    "\n\nMerci d'avance";

  const copy = () => { navigator.clipboard?.writeText(msg); setCopied(true); toast("Message copié !"); setTimeout(()=>setCopied(false),2000); };

  return (
    <div>
      <div style={{ background:D.surface, border:`1px solid ${D.border}`, borderRadius:14, overflow:"hidden", marginBottom:14 }}>
        <div style={{ background:"#5B21B6", padding:"14px 16px", color:"#fff" }}>
          <p style={{ margin:0, fontSize:14, fontWeight:700 }}>Odyssée des Glaces</p>
          <p style={{ margin:"2px 0 0", fontSize:12, opacity:.8 }}>Lucas — 06 42 46 98 57</p>
        </div>
        {toLow.length === 0 ? (
          <div style={{ padding:32, textAlign:"center" }}>
            <p style={{ fontSize:22, margin:"0 0 8px" }}>✅</p>
            <p style={{ margin:0, fontSize:14, fontWeight:600, color:D.success }}>Tous les parfums sont bien stockés</p>
          </div>
        ) : <>
          <div style={{ padding:14 }}>
            {toLow.map((f,i)=>(
              <div key={f.id} style={{ display:"flex", justifyContent:"space-between", padding:"8px 0", borderBottom:i<toLow.length-1?`1px solid ${D.border}`:"none" }}>
                <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                  <div style={{ width:8, height:8, borderRadius:"50%", background:f.couleur_hex }}/>
                  <span style={{ fontSize:13, fontWeight:500 }}>{f.nom}</span>
                </div>
                <span style={{ fontSize:13, fontWeight:700, color:D.purple }}>
                  {Math.max(1,(f.stock_min_bacs||2)*2-(f.stock_bacs||0)).toFixed(0)} bac(s)
                </span>
              </div>
            ))}
          </div>
          <div style={{ padding:14, borderTop:`1px solid ${D.border}` }}>
            <div style={{ background:"#FAFAFA", border:`1px solid ${D.border}`, borderRadius:9, padding:12, fontFamily:"monospace", fontSize:12, whiteSpace:"pre-wrap", marginBottom:10 }}>{msg}</div>
            <button onClick={copy} style={{ width:"100%", padding:11, background:copied?D.success:"#5B21B6", color:"#fff", border:"none", borderRadius:10, fontSize:14, fontWeight:600, cursor:"pointer", transition:"background .2s" }}>
              {copied ? "✓ Copié !" : "Copier pour WhatsApp"}
            </button>
          </div>
        </>}
      </div>
    </div>
  );
}
