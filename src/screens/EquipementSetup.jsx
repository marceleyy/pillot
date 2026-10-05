// ═══════════════════════════════════════════════════════════════
//  PILLOT — Cartographie des équipements
//  Fichier : src/screens/EquipementSetup.jsx
// ═══════════════════════════════════════════════════════════════

import { useState, useEffect, useRef } from "react";
import { supabase } from "../lib/supabase";

const D = {
  brand:"#2563EB", brandLight:"#EFF6FF",
  surface:"#FFFFFF", bg:"#F9FAFB",
  border:"#E5E7EB", borderFocus:"#93C5FD",
  text:"#111827", textSec:"#6B7280", textMuted:"#6B7280",
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
  const [pendingRemove, setPendingRemove] = useState(null);

  useEffect(() => { load(); }, [restaurantId]);

  const load = async () => {
    if (!restaurantId) { setLoading(false); return; }
    const { data } = await supabase.from("equipements").select("*").eq("restaurant_id", restaurantId).or("actif.is.null,actif.eq.true").order("ordre");
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
    const { error } = await supabase.from("equipements").insert({ restaurant_id:restaurantId, ...form, actif:true, ordre:equipements.length });
    if (error) { toast("Erreur : l'équipement n'a pas été ajouté","error"); setSaving(false); return; }
    toast("Équipement ajouté"); setModal(false);
    setForm({ nom:"", type:"frigo", marque:"", modele:"", localisation:"", temp_min:0, temp_max:4 });
    await load(); setSaving(false);
  };

  const remove = async (id) => {
    setPendingRemove(null);
    const { error } = await supabase.from("equipements").update({ actif:false }).eq("id", id);
    if (error) { toast("Erreur : l'équipement n'a pas été retiré","error"); return; }
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
                {pendingRemove === eq.id ? (
                  <div style={{ display:"flex", gap:6 }}>
                    <button onClick={() => remove(eq.id)} style={{ padding:"6px 10px", background:D.danger, border:"none", borderRadius:7, cursor:"pointer", fontSize:12, color:"#fff", fontWeight:600 }}>Confirmer</button>
                    <button onClick={() => setPendingRemove(null)} style={{ padding:"6px 10px", background:"transparent", border:`1px solid ${D.border}`, borderRadius:7, cursor:"pointer", fontSize:12, color:D.textSec }}>Annuler</button>
                  </div>
                ) : (
                  <button onClick={() => setPendingRemove(eq.id)} style={{ padding:"6px 10px", background:D.dangerLight, border:"none", borderRadius:7, cursor:"pointer", fontSize:12, color:D.danger, fontWeight:600 }}>Retirer</button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── SCAN FACTURE / BL avec IA (via l'Edge Function scan-facture) ──
// Affiché seulement si VITE_SCAN_FACTURE=1 (fonction déployée + clé configurée, voir supabase/functions/README.md)
export const SCAN_ACTIVE = import.meta.env.VITE_SCAN_FACTURE === "1";

const SCAN_INDISPONIBLE = "Scan pas encore activé : déployer la fonction scan-facture (voir README)";
const MAX_FILE = 6 * 1024 * 1024; // limite côté fonction : ~8 Mo en base64
const inputSt = { width:"100%", boxSizing:"border-box", padding:"8px 10px", borderRadius:8, border:`1px solid ${D.border}`, fontSize:16, background:D.surface, color:D.text };
const labelSt = { fontSize:11, fontWeight:600, color:D.textMuted, display:"block", marginBottom:4, textTransform:"uppercase", letterSpacing:".06em" };

// Correspondance produit : nom complet d'abord ; à défaut premier mot (≥ 4 lettres) s'il ne correspond qu'à un seul produit
// Mots entiers uniquement (« Sel » ne correspond pas à « Selle »), sans tenir compte de la casse ni des accents
const normMatch = v => String(v || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
const hasWord = (hay, word) => !!word && new RegExp(`(^|[^a-z0-9])${word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([^a-z0-9]|$)`).test(hay);
const matchProduct = (products, nom) => {
  const n = normMatch(nom);
  if (!n) return null;
  const list = (products || []).filter(p => p?.nom);
  const full = list.find(p => {
    const pn = normMatch(p.nom);
    return hasWord(pn, n) || hasWord(n, pn);
  });
  if (full) return full;
  const candidates = list.filter(p => {
    const first = normMatch(p.nom).split(/\s+/)[0];
    return first.length >= 4 && hasWord(n, first);
  });
  return candidates.length === 1 ? candidates[0] : null;
};

// Nombre tolérant la virgule décimale ("12,50") ; null si absent ou invalide
const toNum = v => {
  if (v === null || v === undefined || v === "") return null;
  const n = typeof v === "number" ? v : Number(String(v).replace(/[\s  €]/g, "").replace(",", "."));
  return Number.isFinite(n) ? n : null;
};
const variationPct = (prix, precedent) => prix && precedent ? (prix - precedent) / precedent * 100 : null;

const readBase64 = blob => new Promise((res, rej) => {
  const reader = new FileReader();
  reader.onload = () => res(String(reader.result).split(",")[1] || "");
  reader.onerror = () => rej(new Error("lecture du fichier impossible"));
  reader.readAsDataURL(blob);
});

// Photo réduite à 2000 px de côté en JPEG (photos de téléphone trop lourdes, HEIC converti)
const compressImage = file => new Promise((res, rej) => {
  const url = URL.createObjectURL(file);
  const img = new Image();
  img.onload = () => {
    const scale = Math.min(1, 2000 / Math.max(img.naturalWidth, img.naturalHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(img.naturalWidth * scale); canvas.height = Math.round(img.naturalHeight * scale);
    canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
    URL.revokeObjectURL(url);
    canvas.toBlob(b => b ? res(b) : rej(new Error("conversion de l'image impossible")), "image/jpeg", 0.85);
  };
  img.onerror = () => { URL.revokeObjectURL(url); rej(new Error("image illisible")); };
  img.src = url;
});

// Appel d'une Edge Function : renvoie data (ok:true) ou lève une erreur au message lisible
const invokeScan = async body => {
  const { data, error } = await supabase.functions.invoke("scan-facture", { body });
  if (!error) {
    if (data?.ok) return data;
    throw new Error(data?.error || "réponse inattendue du service");
  }
  const res = error.context;
  if (error.name === "FunctionsFetchError" || error.name === "FunctionsRelayError" || res?.status === 404) throw new Error(SCAN_INDISPONIBLE);
  let msg = null;
  try { msg = (await res.json())?.error; } catch { /* corps non JSON */ }
  throw new Error(msg || `erreur ${res?.status || "inconnue"}`);
};

export function InvoiceScanner({ restaurantId, products, toast, onSaved }) {
  const [step, setStep] = useState("upload"); // upload | preview | done
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState(null);   // { url, pdf } pour l'aperçu
  const [head, setHead] = useState(null);         // fournisseur, numero, date, total_ht (modifiables)
  const [items, setItems] = useState([]);         // lignes modifiables
  const [saving, setSaving] = useState(false);
  const [summary, setSummary] = useState("");
  const fileRef = useRef(null);

  useEffect(() => () => { if (preview?.url) URL.revokeObjectURL(preview.url); }, [preview]);

  const reset = () => { setStep("upload"); setHead(null); setItems([]); setPreview(null); setSummary(""); };

  const handleFile = async (file) => {
    if (!file || loading) return;
    const pdf = file.type === "application/pdf" || /\.pdf$/i.test(file.name);
    if (!pdf && !file.type.startsWith("image/")) { toast("Format non pris en charge : photo ou PDF", "error"); return; }
    setLoading(true);
    try {
      const blob = pdf ? file : await compressImage(file);
      if (blob.size > MAX_FILE) throw new Error("fichier trop volumineux (6 Mo maximum)");
      const image_base64 = await readBase64(blob);
      const { facture } = await invokeScan({ image_base64, media_type: pdf ? "application/pdf" : "image/jpeg" });

      setPreview({ url: URL.createObjectURL(blob), pdf });
      setHead({ fournisseur: facture.fournisseur || "", numero: facture.numero || "", date: facture.date || "", total_ht: facture.total_ht ?? "" });
      setItems((facture.lignes || []).map(l => {
        const prod = matchProduct(products, l.designation);
        const prix = toNum(l.prix_unitaire_ht), quantite = toNum(l.quantite);
        return {
          nom: l.designation, unite: l.unite || "", total_ht: toNum(l.total_ht),
          quantite: quantite ?? "", prix_unitaire: prix !== null && prix >= 0 ? prix : "",
          product_id: prod?.id || "", update_inventory: !!prod && quantite > 0,
        };
      }));
      setStep("preview");
    } catch (e) {
      toast(e.message === SCAN_INDISPONIBLE ? SCAN_INDISPONIBLE : "Erreur d'analyse : " + e.message, "error");
    }
    setLoading(false);
  };

  const setItem = (i, patch) => setItems(prev => prev.map((it, j) => j === i ? { ...it, ...patch } : it));
  const productOf = id => (products || []).find(p => p.id === id) || null;

  // Rien n'est écrit en base avant ce clic
  const confirmAndSave = async () => {
    if (saving) return;
    const lignes = items.map(it => ({ ...it, q: toNum(it.quantite), prix: toNum(it.prix_unitaire), prod: productOf(it.product_id) }));
    if (lignes.some(l => l.update_inventory && l.prod && !(l.q > 0))) { toast("Quantité manquante sur une ligne à mettre en stock", "error"); return; }
    const date = /^\d{4}-\d{2}-\d{2}$/.test(head.date) ? head.date : null;
    setSaving(true);
    try {
      const { data: inv, error: invError } = await supabase.from("scanned_invoices").insert({
        restaurant_id:restaurantId, fournisseur:head.fournisseur.trim() || null,
        numero_bl:head.numero.trim() || null, date_facture:date,
        total_ht:toNum(head.total_ht), statut:"validated", source:"scan",
      }).select().single();
      if (invError) throw new Error("la facture n'a pas été enregistrée");

      let errors = 0, updated = 0;
      const { error: itemsError } = await supabase.from("scanned_invoice_items").insert(lignes.map(l => ({
        invoice_id:inv.id, product_nom:l.nom, quantite:l.q, unite:l.unite || null,
        prix_unitaire:l.prix, total_ht:l.total_ht, matched_product_id:l.prod?.id || null,
        prix_precedent:l.prod?.prix_achat ?? null, variation_pct:variationPct(l.prix, l.prod?.prix_achat),
      })));
      if (itemsError) errors++;

      // Cumul des quantités par produit coché
      const parProduit = new Map(); // id -> { product, quantite, prix }
      for (const l of lignes) {
        if (!l.update_inventory || !l.prod || !(l.q > 0)) continue;
        const cur = parProduit.get(l.prod.id) || { product:l.prod, quantite:0, prix:null };
        cur.quantite += l.q;
        if (l.prix > 0) cur.prix = l.prix;
        parProduit.set(l.prod.id, cur);
      }

      // Stock relu en base (la liste reçue en props peut être périmée après un premier scan)
      const ids = [...parProduit.keys()];
      const stockActuel = {};
      if (ids.length) {
        const { data: st, error: stErr } = await supabase.from("latest_stock").select("product_id,stock_reel").in("product_id", ids);
        if (stErr) throw new Error("lecture du stock impossible : facture enregistrée, stocks non modifiés");
        (st || []).forEach(s => { stockActuel[s.product_id] = s.stock_reel; });
      }

      for (const [id, { quantite, prix }] of parProduit) {
        const { error: stockError } = await supabase.from("stock_entries").insert({
          product_id:id, restaurant_id:restaurantId, stock_reel:(Number(stockActuel[id]) || 0) + quantite,
        });
        let prodError = null;
        if (prix) ({ error: prodError } = await supabase.from("products").update({ prix_achat:prix }).eq("id", id));
        if (stockError || prodError) errors++; else updated++;
      }

      const msg = `${updated} stock${updated>1?"s":""} mis à jour`;
      if (errors) toast(`Facture enregistrée avec ${errors} erreur${errors>1?"s":""} — ${msg}`, "error");
      else toast(`Facture enregistrée — ${msg}`);
      setSummary(msg);
      setStep("done");
      onSaved?.();
    } catch (e) { toast("Erreur : " + e.message, "error"); }
    setSaving(false);
  };

  const varColor = v => v === null ? D.textMuted : v > 5 ? D.danger : v > 0 ? D.warning : D.success;
  const toSync = items.filter(i => i.update_inventory && i.product_id).length;

  if (step === "done") return (
    <div style={{ textAlign:"center", padding:"40px 20px" }}>
      <div style={{ width:64, height:64, borderRadius:"50%", background:D.successLight, display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 16px", fontSize:28 }}>✅</div>
      <h3 style={{ margin:"0 0 8px", fontSize:20, fontWeight:700 }}>Facture enregistrée</h3>
      <p style={{ margin:"0 0 24px", color:D.textSec }}>{summary}</p>
      <button onClick={reset} style={{ padding:"11px 24px", background:D.brand, color:"#fff", border:"none", borderRadius:10, fontSize:14, fontWeight:600, cursor:"pointer" }}>
        Scanner une autre facture
      </button>
    </div>
  );

  if (step === "preview") return (
    <div>
      <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:18 }}>
        <button onClick={reset} disabled={saving} style={{ padding:"7px 12px", borderRadius:8, border:`1px solid ${D.border}`, background:"transparent", cursor:"pointer", fontSize:13 }}>← Annuler</button>
        <div><h2 style={{ margin:0, fontSize:18, fontWeight:700 }}>Vérifier la facture</h2>
          <p style={{ margin:0, fontSize:13, color:D.textSec }}>{items.length} ligne{items.length>1?"s":""} lue{items.length>1?"s":""} · corrigez avant de valider</p></div>
      </div>

      {preview && (preview.pdf
        ? <a href={preview.url} target="_blank" rel="noreferrer" style={{ display:"inline-block", marginBottom:14, fontSize:13, color:D.brand }}>📄 Ouvrir le PDF</a>
        : <img src={preview.url} alt="Facture scannée" style={{ width:"100%", maxHeight:200, objectFit:"contain", borderRadius:10, border:`1px solid ${D.border}`, marginBottom:14 }}/>)}

      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))", gap:10, marginBottom:14 }}>
        {[["fournisseur","Fournisseur","text"],["numero","N° facture / BL","text"],["date","Date","date"],["total_ht","Total HT (€)","text"]].map(([k,l,t]) => (
          <div key={k}><label style={labelSt}>{l}</label>
            <input type={t} inputMode={k==="total_ht"?"decimal":undefined} value={head[k]} onChange={e=>setHead(h=>({...h,[k]:e.target.value}))} style={inputSt}/></div>
        ))}
      </div>

      {items.some(i => variationPct(toNum(i.prix_unitaire), productOf(i.product_id)?.prix_achat) > 5) && (
        <div style={{ background:D.dangerLight, border:`1px solid #FECACA`, borderRadius:10, padding:"10px 14px", marginBottom:14 }}>
          <p style={{ margin:0, fontSize:13, fontWeight:600, color:D.danger }}>⚠️ Hausse de prix de plus de 5 % sur certains produits</p>
        </div>
      )}

      {items.length === 0 && <p style={{ fontSize:13, color:D.textSec, marginBottom:14 }}>Aucune ligne de produit lue sur ce document.</p>}

      <div style={{ display:"flex", flexDirection:"column", gap:8, marginBottom:14 }}>
        {items.map((item, i) => {
          const prod = productOf(item.product_id);
          const v = variationPct(toNum(item.prix_unitaire), prod?.prix_achat);
          return (
            <div key={i} style={{ background:v>5?D.dangerLight:D.surface, border:`1px solid ${D.border}`, borderRadius:12, padding:"12px 14px" }}>
              <p style={{ margin:"0 0 8px", fontSize:14, fontWeight:600 }}>{item.nom}{item.total_ht != null && <span style={{ fontWeight:400, color:D.textSec }}> · {item.total_ht.toFixed(2)} € HT</span>}</p>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:8 }}>
                <div><label style={labelSt}>Qté{item.unite ? ` (${item.unite})` : ""}</label>
                  <input inputMode="decimal" value={item.quantite} onChange={e=>setItem(i,{quantite:e.target.value})} style={inputSt}/></div>
                <div><label style={labelSt}>Prix unit. HT (€)</label>
                  <input inputMode="decimal" value={item.prix_unitaire} onChange={e=>setItem(i,{prix_unitaire:e.target.value})} style={inputSt}/></div>
              </div>
              <label style={labelSt}>Produit de l'inventaire</label>
              <select value={item.product_id} onChange={e=>setItem(i,{product_id:e.target.value, update_inventory:!!e.target.value})} style={{ ...inputSt, marginBottom:8 }}>
                <option value="">— Aucun (non suivi en stock) —</option>
                {(products || []).map(p => <option key={p.id} value={p.id}>{p.nom}{p.unite ? ` (${p.unite})` : ""}</option>)}
              </select>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", gap:8 }}>
                <label style={{ display:"flex", alignItems:"center", gap:8, cursor:prod?"pointer":"default", fontSize:13, color:prod?D.text:D.textMuted, minHeight:32 }}>
                  <input type="checkbox" disabled={!prod} checked={!!prod && item.update_inventory} onChange={e=>setItem(i,{update_inventory:e.target.checked})} style={{ width:18, height:18 }}/>
                  Ajouter au stock et mettre à jour le prix
                </label>
                {v !== null && <span style={{ fontSize:12, fontWeight:600, color:varColor(v) }}>{v>=0?"+":""}{v.toFixed(1)} %</span>}
              </div>
            </div>
          );
        })}
      </div>

      <button onClick={confirmAndSave} disabled={saving}
        style={{ width:"100%", padding:13, background:saving?"#93C5FD":D.brand, color:"#fff", border:"none", borderRadius:11, fontSize:14, fontWeight:600, cursor:saving?"default":"pointer", boxShadow:"0 4px 14px rgba(37,99,235,.3)" }}>
        {saving ? "Enregistrement..." : `Valider la facture${toSync ? ` — ${toSync} produit${toSync>1?"s":""} en stock` : ""}`}
      </button>
    </div>
  );

  return (
    <div>
      <h2 style={{ margin:"0 0 4px", fontSize:18, fontWeight:700, letterSpacing:"-.02em" }}>Scanner une facture / BL</h2>
      <p style={{ margin:"0 0 18px", fontSize:13, color:D.textSec }}>Claude lit la facture ; vous vérifiez puis validez la mise à jour de l'inventaire</p>

      <div role="button" tabIndex={0} aria-disabled={loading} onClick={()=>!loading&&fileRef.current?.click()} onKeyDown={e=>{if((e.key==="Enter"||e.key===" ")&&!loading){e.preventDefault();fileRef.current?.click();}}}
        style={{ background:D.surface, borderRadius:14, border:`2px dashed ${D.border}`, padding:"48px 24px", textAlign:"center", cursor:loading?"wait":"pointer", marginBottom:16 }}
        onMouseEnter={e=>e.currentTarget.style.borderColor=D.brand} onMouseLeave={e=>e.currentTarget.style.borderColor=D.border}
        onDrop={e=>{e.preventDefault();handleFile(e.dataTransfer.files[0]);}} onDragOver={e=>e.preventDefault()}>
        <div style={{ width:56, height:56, borderRadius:14, background:D.brandLight, display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 14px", fontSize:26 }}>📸</div>
        <p style={{ margin:0, fontSize:16, fontWeight:600, color:D.text }}>Photo ou fichier de la facture</p>
        <p style={{ margin:"6px 0 0", fontSize:13, color:D.textSec }}>Photo (JPEG, PNG, WebP) ou PDF · 6 Mo max</p>
        {loading && <p role="status" style={{ margin:"14px 0 0", fontSize:14, fontWeight:600, color:D.brand }}>Analyse en cours, cela peut prendre une minute...</p>}
        <input ref={fileRef} type="file" accept="image/*,application/pdf,.pdf" style={{display:"none"}} onChange={e=>{const f=e.target.files[0];e.target.value="";handleFile(f);}}/>
      </div>

      <div style={{ background:"#FFFBEB", border:`1px solid #FDE68A`, borderRadius:10, padding:"12px 14px" }}>
        <p style={{ margin:"0 0 6px", fontSize:13, fontWeight:600, color:"#92400E" }}>💡 Comment ça marche</p>
        <p style={{ margin:0, fontSize:12, color:"#78350F", lineHeight:1.6 }}>
          1. Prenez la facture en photo ou importez le PDF<br/>
          2. Claude lit les produits, quantités et prix<br/>
          3. Vous corrigez si besoin et validez : l'inventaire et les prix sont mis à jour<br/>
          4. Une alerte s'affiche si un prix a augmenté
        </p>
      </div>
    </div>
  );
}
