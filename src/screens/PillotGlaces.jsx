// ═══════════════════════════════════════════════════════════════
//  PILLOT GLACES — Module complet glacier artisan
//  Fichier : src/screens/PillotGlaces.jsx
// ═══════════════════════════════════════════════════════════════

import { useState, useEffect, useRef } from "react";
import { supabase } from "../lib/supabase";
import { localDate } from "../lib/dates";

// Pictogrammes au trait (même style que la navigation)
const ICONS = {
  "ice-cream":<><path d="M12 21.5V21"/><path d="M8 11.5l4 9.5 4-9.5"/><path d="M6.5 11.5a5.5 5.5 0 1111 0z"/></>,
  alert:<><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></>,
  chart:<><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></>,
  check:<polyline points="20 6 9 17 4 12"/>,
};
const Ico = ({ name, size = 20, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flexShrink:0, display:"block" }}>{ICONS[name]}</svg>
);

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
  textMuted: "#6B7280",
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
const fmtDec = (v, d) => ((+v)||0).toLocaleString("fr-FR", { minimumFractionDigits:d, maximumFractionDigits:d });
const fmtKg = v => `${fmtDec(v, 2)} kg`;
const fmtBac = v => `${fmtDec(v, 1)} bacs`;
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 Mo

// Nombre au format français : 45,50 · "1 234,50 €" · 12.5
const parseNum = v => {
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  let s = String(v ?? "").replace(/[\s\u00A0\u202F€]/g, "");
  if (!s) return 0;
  const seps = s.match(/[.,]/g) || [];
  // Un seul type de séparateur, présent une seule fois, suivi d'exactement 3 chiffres : milliers ("1,234" / "1.234")
  // Le même séparateur répété ("1.234.567") est aussi un séparateur de milliers
  if (seps.length && seps.every(c => c === seps[0]) && (seps.length > 1 || /^-?\d+[.,]\d{3}$/.test(s))) s = s.replace(/[.,]/g, "");
  // Sinon le dernier séparateur rencontré est la décimale ("1.234,50" ou "1,234.50")
  else if (s.lastIndexOf(",") > s.lastIndexOf(".")) s = s.replace(/\./g, "").replace(",", ".");
  else s = s.replace(/,/g, "");
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : 0;
};
const normNom = v => String(v ?? "").trim().toUpperCase().replace(/\s+/g, " ");
const POIDS_KEYS = Object.keys(POIDS).sort((a, b) => b.length - a.length);
// Correspondance exacte d'abord, puis la clé la plus longue contenue dans le nom
const findPoidsKey = nom => POIDS[nom] !== undefined ? nom : POIDS_KEYS.find(k => nom.includes(k));
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
export default function PillotGlaces({ restaurantId, profileId, toast, restaurantName }) {
  const [onglet, setOnglet] = useState("bilan");
  const [flavors, setFlavors] = useState([]);
  const [daily, setDaily] = useState([]);
  const [posImports, setPosImports] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadAll(); }, [restaurantId]);

  const loadAll = async () => {
    if (!restaurantId) { setLoading(false); return; }
    setLoading(true);
    const [{ data: fl }, { data: da }, { data: pi }] = await Promise.all([
      supabase.from("glaces_flavors").select("*").eq("restaurant_id", restaurantId).order("ordre"),
      supabase.from("glaces_daily").select("*").eq("restaurant_id", restaurantId).order("date", { ascending:false }).limit(30),
      supabase.from("pos_imports").select("*, pos_sales(*)").eq("restaurant_id", restaurantId).order("created_at", { ascending:false }).limit(10),
    ]);
    setFlavors(fl || []); setDaily(da || []); setPosImports(pi || []);
    setLoading(false);
  };

  const totalBacsEnStock = flavors.reduce((a, f) => a + (f.stock_bacs || 0), 0);
  const flavorsRupture = flavors.filter(f => f.stock_bacs <= 0 && f.actif);
  const flavorsAlerte = flavors.filter(f => f.stock_bacs > 0 && f.stock_bacs <= f.stock_min_bacs && f.actif);

  const TABS = [["bilan","Bilan"],["parfums","Parfums"],["import","Import caisse"],["commande","Commander"]];

  if (loading) return <div style={{ padding:48, textAlign:"center", color:D.textMuted }}>Chargement Pillot Glaces...</div>;

  return (
    <div>
      {/* Header signature */}
      <div style={{ marginBottom:20, display:"flex", alignItems:"flex-start", justifyContent:"space-between", flexWrap:"wrap", gap:10 }}>
        <div>
          <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:4 }}>
            <div style={{ width:32, height:32, background:"linear-gradient(135deg,#7C3AED,#5B21B6)", borderRadius:9, display:"flex", alignItems:"center", justifyContent:"center", color:"#fff" }}><Ico name="ice-cream" size={18}/></div>
            <h1 style={{ margin:0, fontSize:22, fontWeight:700, letterSpacing:"-.03em", color:D.text }}>Pillot Glaces</h1>
          </div>
          <p style={{ margin:0, fontSize:14, color:D.textSec }}>{flavors.filter(f=>f.actif).length} parfums actifs · {fmtBac(totalBacsEnStock)} en stock</p>
        </div>
      </div>

      {/* Alertes urgentes */}
      {(flavorsRupture.length > 0 || flavorsAlerte.length > 0) && (
        <div style={{ background:D.dangerLight, border:`1px solid #FECACA`, borderRadius:12, padding:"12px 16px", marginBottom:16, display:"flex", alignItems:"center", gap:12 }}>
          <Ico name="alert" size={20} color={D.danger}/>
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
      {onglet === "commande"&& <CommandeTab flavors={flavors} toast={toast} restaurantName={restaurantName}/>}
    </div>
  );
}

// ── BILAN QUOTIDIEN ───────────────────────────────────────────
function BilanTab({ daily, flavors, toast, restaurantId, onRefresh }) {
  const [stockFin, setStockFin] = useState("");
  const [perte, setPerte] = useState(0);
  const [recus, setRecus] = useState("0");
  const [saving, setSaving] = useState(false);

  const todayStr = localDate();
  const today = daily.find(d => d.date === todayStr);
  const last = daily.find(d => d.stock_fin_bacs != null);
  const previous = daily.find(d => d.date < todayStr && d.stock_fin_bacs != null);
  const totalBacs = flavors.reduce((a, f) => a + (f.stock_bacs || 0), 0);
  const stockDebut = previous ? (+previous.stock_fin_bacs || 0) : totalBacs;

  const saveBilan = async () => {
    if (!stockFin) { toast("Saisir le stock de fin","warning"); return; }
    setSaving(true);
    const stockFinBacs = parseFloat(stockFin);
    const theorique_kg = today?.consommation_theorique_kg || 0;
    // Bacs reçus entre deux bilans : utilisés pour le calcul uniquement (pas de colonne en base)
    const recusBacs = parseFloat(String(recus).replace(",", ".")) || 0;
    const reelle_kg = (stockDebut + recusBacs - stockFinBacs) * KG_PAR_BAC;
    const ecart = reelle_kg - theorique_kg;
    const ecart_pct = theorique_kg > 0 ? (ecart / theorique_kg * 100) : 0;

    const { error } = await supabase.from("glaces_daily").upsert({
      restaurant_id: restaurantId, date: todayStr,
      stock_debut_bacs: stockDebut,
      stock_fin_bacs: stockFinBacs,
      consommation_theorique_kg: theorique_kg,
      consommation_reelle_kg: reelle_kg,
      perte_kg: parseFloat(perte) || 0,
      ecart_kg: ecart,
      ecart_pct,
    }, { onConflict: "restaurant_id,date" });

    if (!error) { toast("Bilan enregistré"); await onRefresh(); setStockFin(""); setRecus("0"); }
    else toast("Erreur lors de l'enregistrement du bilan : " + error.message,"error");
    setSaving(false);
  };

  const ecart = last?.ecart_kg || 0;
  const ecartColor = Math.abs(ecart) < 0.5 ? D.success : Math.abs(ecart) < 2 ? D.warning : D.danger;

  return (
    <div>
      {/* Stats du jour */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(2,1fr)", gap:10, marginBottom:16 }}>
        <Stat label="Stock actuel" value={fmtBac(flavors.reduce((a,f)=>a+(f.stock_bacs||0),0))} sub="total bacs en stock"/>
        <Stat label="Consommation théo." value={fmtKg(today?.consommation_theorique_kg)} sub={today ? "calculée depuis la caisse" : "Aucun import caisse aujourd'hui"} color={D.purple}/>
        <Stat label="Écart dernier bilan" value={last ? (ecart >= 0 ? "+" : "") + fmtKg(ecart) : "—"} sub={last ? `${fmtDec(last.ecart_pct, 1)} % de la consommation` : "Aucun bilan"} color={ecartColor}/>
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
        <div style={{ marginBottom:14 }}>
          <label style={{ fontSize:11, fontWeight:600, color:D.textMuted, display:"block", marginBottom:5, textTransform:"uppercase", letterSpacing:".06em" }}>Bacs reçus depuis le dernier bilan</label>
          <input type="text" inputMode="decimal" value={recus} onChange={e=>setRecus(e.target.value)} placeholder="0"
            style={{ width:"100%", boxSizing:"border-box", padding:"10px 12px", borderRadius:9, border:`1.5px solid ${D.border}`, fontSize:15, fontWeight:600, outline:"none" }}
            onFocus={e=>e.target.style.borderColor=D.purple} onBlur={e=>e.target.style.borderColor=D.border}/>
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
                  <p style={{ margin:0, fontSize:10, color:D.textMuted }}>{fmtDec(d.ecart_pct, 1)} % écart</p>
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
    const { error } = await supabase.from("glaces_flavors").update({ stock_bacs: parseFloat(editBacs) || 0 }).eq("id", id);
    if (error) { toast("Erreur lors de la mise à jour du stock : " + error.message, "error"); setSaving(false); return; }
    toast("Stock mis à jour"); setEditId(null); await onRefresh();
    setSaving(false);
  };

  const saveFlavor = async () => {
    setSaving(true);
    const { error } = await supabase.from("glaces_flavors").insert({ restaurant_id:restaurantId, ...newFlavor });
    if (error) { toast("Erreur lors de l'ajout du parfum : " + error.message, "error"); setSaving(false); return; }
    toast("Parfum ajouté"); setAddModal(false);
    setNewFlavor({ nom:"", categorie:"glace", couleur_hex:"#7C3AED", stock_bacs:0, stock_min_bacs:2 });
    await onRefresh(); setSaving(false);
  };

  const glaces = flavors.filter(f => f.categorie === "glace" && f.actif);
  const sorbets = flavors.filter(f => f.categorie === "sorbet" && f.actif);
  const sectionProps = { editId, setEditId, editBacs, setEditBacs, saveBacs, saving };

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
      {glaces.length > 0 && <FlavorSection title={`Glaces (${glaces.length})`} items={glaces} {...sectionProps}/>}
      {sorbets.length > 0 && <FlavorSection title={`Sorbets (${sorbets.length})`} items={sorbets} {...sectionProps}/>}
    </div>
  );
}

const flavorStatus = (f) => {
  if (!f.stock_bacs || f.stock_bacs <= 0) return { label:"Rupture", color:D.danger, bg:D.dangerLight };
  if (f.stock_bacs <= f.stock_min_bacs) return { label:"Stock faible", color:D.warning, bg:D.warningLight };
  return { label:"OK", color:D.success, bg:D.successLight };
};

// Hors de ParfumsTab : sinon le composant est recréé à chaque rendu et l'input perd le focus à chaque frappe
function FlavorSection({ title, items, editId, setEditId, editBacs, setEditBacs, saveBacs, saving }) {
  return (
    <div style={{ marginBottom:16 }}>
      <p style={{ margin:"0 0 10px", fontSize:11, fontWeight:700, color:D.textMuted, textTransform:"uppercase", letterSpacing:".06em" }}>{title}</p>
      <div style={{ background:D.surface, border:`1px solid ${D.border}`, borderRadius:12, overflow:"hidden" }}>
        {items.map((f, i) => {
          const s = flavorStatus(f);
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
}

// ── IMPORT CAISSE ─────────────────────────────────────────────
function ImportTab({ posImports, restaurantId, profileId, toast, onRefresh }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const fileRef = useRef(null);

  const handleFile = async (file) => {
    if (!file) return;
    if (file.size > MAX_FILE_SIZE) { toast("Fichier trop volumineux (5 Mo maximum)", "error"); return; }
    setLoading(true);
    try {
      const XLSX = await import("xlsx");
      // CSV lu en texte UTF-8 (sinon le "€" des en-têtes est cassé)
      const wb = /\.csv$/i.test(file.name)
        ? XLSX.read(await file.text(), { type:"string", raw:true })
        : XLSX.read(await file.arrayBuffer(), { type:"array" });
      // raw:true → les nombres xlsx restent des nombres ; en CSV (lu en raw) les cellules restent des chaînes ("45,50"), relues par parseNum
      const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { raw:true, defval:"" });

      let totalGlaceG = 0, totalCA = 0;
      const detail = [];

      rows.forEach(r => {
        const nom = normNom(r["Produit"]||r["Product"]||Object.values(r)[0]||"");
        // Lignes de total ignorées
        if (!nom || /^(SOUS-|SOUS )?TOTAL/.test(nom)) return;
        const qty = parseNum(r["QteProduit"]||r["Qty"]||r["Quantite"]||0);
        const ca  = parseNum(r["Chiffre d'affaires (€)"]||r["CA"]||0);
        if (!qty) return;

        // Chercher le poids théorique
        const poidsKey = findPoidsKey(nom);
        const poids = poidsKey ? POIDS[poidsKey] : 0;
        const consoG = qty * poids;
        totalGlaceG += consoG;
        totalCA += ca;
        if (poids > 0) detail.push({ nom, qty, poids, consoG, ca });
      });

      const theorique_kg = totalGlaceG / 1000;
      const theorique_bacs = theorique_kg / KG_PAR_BAC;
      const d = localDate();

      // Sauvegarder
      const { data: imp, error: impErr } = await supabase.from("pos_imports").insert({
        restaurant_id: restaurantId, import_date: d,
        source:"manual", total_ca: totalCA, nb_produits: detail.length
      }).select().single();
      if (impErr || !imp) throw new Error("enregistrement de l'import impossible" + (impErr ? " (" + impErr.message + ")" : ""));

      if (detail.length > 0) {
        const { error: salesErr } = await supabase.from("pos_sales").insert(detail.map(x => ({
          pos_import_id:imp.id, restaurant_id:restaurantId,
          product_nom:x.nom, qty_sold:x.qty, ca:x.ca
        })));
        if (salesErr) throw new Error("enregistrement des ventes impossible (" + salesErr.message + ")");
      }

      const { error: dailyErr } = await supabase.from("glaces_daily").upsert({
        restaurant_id:restaurantId, date:d,
        consommation_theorique_kg: theorique_kg,
        ca_glaces: totalCA, pos_import_id: imp.id
      }, { onConflict:"restaurant_id,date" });
      if (dailyErr) throw new Error("mise à jour du bilan du jour impossible (" + dailyErr.message + ")");

      // Le CA sucré hebdomadaire est saisi à la clôture (Réglages), pas ici : un import = une journée

      setResult({ theorique_kg, theorique_bacs, totalCA, detail });
      await onRefresh();
      toast("Import calculé — consommation mise à jour");
    } catch(e) { toast("Erreur d'import : " + e.message, "error"); await onRefresh(); }
    setLoading(false);
  };

  if (result) return (
    <div>
      <div style={{ background:D.purpleLight, border:`1px solid ${D.purpleMid}`, borderRadius:14, padding:20, marginBottom:16 }}>
        <p style={{ margin:"0 0 12px", fontSize:15, fontWeight:700, color:D.purple }}>Résultat de l'import</p>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10, marginBottom:12 }}>
          {[[fmtKg(result.theorique_kg),"Consommation théo."],[fmtBac(result.theorique_bacs),"Équiv. bacs 3,5L"],[fmt(result.totalCA),"CA glaces"]].map(([v,l])=>(
            <div key={l} style={{ background:D.surface, borderRadius:10, padding:"10px 12px", textAlign:"center" }}>
              <p style={{ margin:0, fontSize:17, fontWeight:700, color:D.purple }}>{v}</p>
              <p style={{ margin:0, fontSize:10, color:D.textMuted }}>{l}</p>
            </div>
          ))}
        </div>
        <div style={{ background:D.surface, borderRadius:10, overflow:"hidden" }}>
          {[...result.detail].sort((a,b)=>b.consoG-a.consoG).slice(0,8).map((d,i)=>(
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
        <div style={{ width:52, height:52, borderRadius:14, background:D.purpleLight, display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 14px", color:D.purple }}><Ico name="chart" size={24}/></div>
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
function CommandeTab({ flavors, toast, restaurantName }) {
  const [copied, setCopied] = useState(false);
  const toLow = flavors.filter(f => f.actif && (f.stock_bacs || 0) <= (f.stock_min_bacs || 2));
  const msg = `Bonjour,\nMerci de préparer cette commande pour ${restaurantName || "notre établissement"} :\n\n` +
    toLow.map(f => `- ${f.nom} : ${Math.max(1, (f.stock_min_bacs||2)*2 - (f.stock_bacs||0)).toFixed(0)} bac(s)`).join("\n") +
    "\n\nMerci d'avance";

  const copy = () => { navigator.clipboard?.writeText(msg); setCopied(true); toast("Message copié !"); setTimeout(()=>setCopied(false),2000); };

  return (
    <div>
      <div style={{ background:D.surface, border:`1px solid ${D.border}`, borderRadius:14, overflow:"hidden", marginBottom:14 }}>
        <div style={{ background:"#5B21B6", padding:"14px 16px", color:"#fff" }}>
          <p style={{ margin:0, fontSize:14, fontWeight:700 }}>Odyssée des Glaces</p>
          <p style={{ margin:"2px 0 0", fontSize:12, opacity:.8 }}>Contact fournisseur à configurer</p>
        </div>
        {toLow.length === 0 ? (
          <div style={{ padding:32, textAlign:"center" }}>
            <div style={{ display:"flex", justifyContent:"center", marginBottom:8, color:D.success }}><Ico name="check" size={22}/></div>
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
              {copied ? "Copié !" : "Copier pour WhatsApp"}
            </button>
          </div>
        </>}
      </div>
    </div>
  );
}
