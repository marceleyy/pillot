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
  { key:"frigo",       label:"Frigo",        temp_min:0,   temp_max:4,  color:"#3B82F6" },
  { key:"congelateur", label:"Congélateur",  temp_min:-22, temp_max:-18,color:"#6366F1" },
  { key:"vitrine",     label:"Vitrine froide",temp_min:0,   temp_max:6,  color:"#0EA5E9" },
  { key:"bain_marie",  label:"Bain-marie",   temp_min:63,  temp_max:99, color:"#F97316" },
  { key:"zone_chaude", label:"Zone chaude",  temp_min:63,  temp_max:99, color:"#EF4444" },
  { key:"friteuse",    label:"Friteuse",     temp_min:160, temp_max:190,color:"#92400E" },
  { key:"autre",       label:"Autre",        temp_min:0,   temp_max:25, color:"#6B7280" },
];

// Icônes au trait (24x24, currentColor)
const Ico = ({ d, size=20, color="currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{d}</svg>
);
const THERMO = <path d="M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4.5 4.5 0 1 0 5 0z"/>;

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
          <div style={{ background:D.surface, borderRadius:18, padding:20, maxWidth:420, width:"100%", maxHeight:"calc(100vh - 32px)", overflowY:"auto", boxSizing:"border-box", boxShadow:"0 24px 60px rgba(0,0,0,.2)" }}>
            <h3 style={{ margin:"0 0 18px", fontSize:17, fontWeight:700, letterSpacing:"-.02em" }}>Ajouter un équipement</h3>

            {/* Choix du type — grille visuelle */}
            <p style={{ margin:"0 0 8px", fontSize:11, fontWeight:600, color:D.textMuted, textTransform:"uppercase", letterSpacing:".06em" }}>Type d'équipement</p>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:6, marginBottom:16 }}>
              {TYPES.map(t => (
                <button key={t.key} onClick={() => pickType(t.key)}
                  style={{ padding:"10px 4px", minHeight:52, borderRadius:10, border:`1.5px solid ${form.type===t.key?t.color:D.border}`, background:form.type===t.key?t.color+"15":"transparent", cursor:"pointer", textAlign:"center" }}>
                  <span style={{ display:"block", width:10, height:10, borderRadius:"50%", background:t.color, margin:"0 auto 6px" }}/>
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
        <button onClick={()=>setModal(true)} style={{ minHeight:44, padding:"9px 16px", background:D.brand, color:"#fff", border:"none", borderRadius:9, fontSize:13, fontWeight:600, cursor:"pointer", display:"flex", alignItems:"center", gap:6 }}>
          + Ajouter
        </button>
      </div>

      {loading ? <p style={{textAlign:"center",color:D.textMuted,padding:32}}>Chargement...</p> :
       equipements.length === 0 ? (
        <div style={{ background:D.surface, border:`2px dashed ${D.border}`, borderRadius:14, padding:"48px 24px", textAlign:"center" }}>
          <div style={{ display:"flex", justifyContent:"center", marginBottom:10, color:D.textMuted }}><Ico d={THERMO} size={32}/></div>
          <p style={{ margin:0, fontSize:16, fontWeight:600 }}>Aucun équipement</p>
          <p style={{ margin:"6px 0 16px", fontSize:13, color:D.textSec }}>Ajoutez vos frigos, congélateurs et équipements pour personnaliser votre suivi HACCP</p>
          <button onClick={()=>setModal(true)} style={{ padding:"10px 20px", background:D.brand, color:"#fff", border:"none", borderRadius:9, fontSize:14, fontWeight:600, cursor:"pointer" }}>Ajouter mon premier équipement</button>
        </div>
      ) : (
        <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
          {equipements.map(eq => {
            const t = typeInfo(eq.type);
            return (
              <div key={eq.id} style={{ background:D.surface, border:`1px solid ${D.border}`, borderRadius:12, padding:"14px 16px", display:"flex", alignItems:"center", gap:12, flexWrap:"wrap" }}>
                <div style={{ width:44, height:44, borderRadius:12, background:t.color+"15", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}><Ico d={THERMO} color={t.color}/></div>
                <div style={{ flex:1, minWidth:140 }}>
                  <p style={{ margin:0, fontSize:14, fontWeight:600 }}>{eq.nom}</p>
                  <p style={{ margin:0, fontSize:11, color:D.textSec }}>
                    {t.label} · {eq.temp_min}°C à {eq.temp_max}°C
                    {eq.localisation ? ` · ${eq.localisation}` : ""}
                    {eq.marque ? ` · ${eq.marque}` : ""}
                  </p>
                </div>
                {pendingRemove === eq.id ? (
                  <div style={{ display:"flex", gap:6 }}>
                    <button onClick={() => remove(eq.id)} style={{ minHeight:44, padding:"6px 12px", background:D.danger, border:"none", borderRadius:7, cursor:"pointer", fontSize:12, color:"#fff", fontWeight:600 }}>Confirmer</button>
                    <button onClick={() => setPendingRemove(null)} style={{ minHeight:44, padding:"6px 12px", background:"transparent", border:`1px solid ${D.border}`, borderRadius:7, cursor:"pointer", fontSize:12, color:D.textSec }}>Annuler</button>
                  </div>
                ) : (
                  <button onClick={() => setPendingRemove(eq.id)} style={{ minHeight:44, padding:"6px 12px", background:D.dangerLight, border:"none", borderRadius:7, cursor:"pointer", fontSize:12, color:D.danger, fontWeight:600 }}>Retirer</button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── SCAN FACTURE / BL (via l'Edge Function scan-facture) ──────
// Affiché seulement si VITE_SCAN_FACTURE=1 (fonction déployée + clé configurée, voir supabase/functions/README.md)
export const SCAN_ACTIVE = import.meta.env.VITE_SCAN_FACTURE === "1";

const SCAN_INDISPONIBLE = "Scan pas encore activé : déployer la fonction scan-facture (voir README)";
const MAX_FILE = 6 * 1024 * 1024; // limite côté fonction : ~8 Mo en base64
const inputSt = { width:"100%", boxSizing:"border-box", minHeight:44, padding:"8px 10px", borderRadius:8, border:`1px solid ${D.border}`, fontSize:16, background:D.surface, color:D.text };
const labelSt = { fontSize:11, fontWeight:600, color:D.textMuted, display:"block", marginBottom:4, textTransform:"uppercase", letterSpacing:".06em" };
const btnSt = { minHeight:44, padding:"10px 16px", borderRadius:10, fontSize:14, fontWeight:600, cursor:"pointer", display:"inline-flex", alignItems:"center", justifyContent:"center", gap:8 };
const ICON_CAMERA = <><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></>;
const ICON_FILE = <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></>;
const ICON_BACK = <polyline points="15 18 9 12 15 6"/>;
const ICON_CHECK = <polyline points="20 6 9 17 4 12"/>;

// Correspondance produit, sans tenir compte de la casse ni des accents, mots entiers uniquement (« Sel » ≠ « Selle ») :
// 1) nom complet (le plus long gagne) ; 2) premier mot (≥ 4 lettres) s'il ne désigne qu'un produit ;
// 3) à défaut, le produit qui partage le plus de mots significatifs (au moins la moitié de son nom)
const normMatch = v => String(v || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
const hasWord = (hay, word) => !!word && new RegExp(`(^|[^a-z0-9])${word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([^a-z0-9]|$)`).test(hay);
const STOP = new Set(["les","des","une","pour","avec","sans","aux","kg","kgs","pce","pces","piece","pieces","carton","colis","sac","bte","boite","lot","barq","barquette"]);
const words = s => normMatch(s).split(/[^a-z0-9]+/).filter(w => w.length >= 3 && !STOP.has(w) && !/^\d+$/.test(w));
const matchProduct = (products, nom, fournisseur) => {
  const n = normMatch(nom);
  if (!n) return null;
  const list = (products || []).filter(p => p?.nom);
  const full = list.filter(p => { const pn = normMatch(p.nom); return hasWord(pn, n) || hasWord(n, pn); })
    .sort((a, b) => b.nom.length - a.nom.length);
  if (full.length) return full[0];
  const firsts = list.filter(p => { const first = normMatch(p.nom).split(/\s+/)[0]; return first.length >= 4 && hasWord(n, first); });
  if (firsts.length === 1) return firsts[0];
  const nw = new Set(words(nom)), fn = normMatch(fournisseur);
  let best = null, bestScore = 0, tie = false;
  for (const p of list) {
    const pw = words(p.nom);
    const shared = pw.filter(w => nw.has(w)).length;
    if (!shared) continue;
    const score = shared / pw.length + (fn && normMatch(p.fournisseur) === fn ? 0.01 : 0);
    if (score > bestScore) { best = p; bestScore = score; tie = false; }
    else if (score === bestScore) tie = true;
  }
  return best && !tie && bestScore >= 0.5 ? best : null;
};

// Unités : comparaison indicative seulement (alerte si la facture est en cartons et le stock en kg, etc.)
const UNITS = { kg:"kg", kgs:"kg", kilo:"kg", kilos:"kg", g:"g", gr:"g", l:"l", lt:"l", litre:"l", litres:"l", cl:"cl", ml:"ml",
  piece:"piece", pieces:"piece", pce:"piece", pces:"piece", pc:"piece", u:"piece", un:"piece", unite:"piece", unites:"piece" };
const normUnit = u => { const n = normMatch(u).replace(/\.$/, ""); return n ? UNITS[n] || n : ""; };

// Nombre tolérant la virgule décimale ("12,50") ; null si absent ou invalide
const toNum = v => {
  if (v === null || v === undefined || v === "") return null;
  const n = typeof v === "number" ? v : Number(String(v).replace(/[\s  €]/g, "").replace(",", "."));
  return Number.isFinite(n) ? n : null;
};
const variationPct = (prix, precedent) => prix && precedent ? (prix - precedent) / precedent * 100 : null;
const eur = n => n === null || n === undefined ? "—" : `${Number(n).toLocaleString("fr-FR", { minimumFractionDigits:2, maximumFractionDigits:2 })} €`;
const plural = (n, s) => `${n} ${s}${n > 1 ? "s" : ""}`;

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

const STEPS = [["upload","Document"],["reading","Lecture"],["review","Vérification"]];
function Stepper({ step }) {
  const cur = STEPS.findIndex(([k]) => k === step);
  return (
    <ol style={{ listStyle:"none", display:"flex", gap:6, padding:0, margin:"0 0 18px" }}>
      {STEPS.map(([k, label], i) => {
        const on = i <= cur;
        return (
          <li key={k} style={{ flex:1, minWidth:0 }}>
            <div style={{ height:4, borderRadius:2, background:on ? D.brand : D.border, marginBottom:6 }}/>
            <span style={{ fontSize:12, fontWeight:i === cur ? 700 : 500, color:on ? D.text : D.textMuted }}>{i + 1}. {label}</span>
          </li>
        );
      })}
    </ol>
  );
}

export function InvoiceScanner({ restaurantId, products, toast, onSaved }) {
  const [step, setStep] = useState("upload"); // upload | reading | review | done
  const [fileName, setFileName] = useState("");
  const [preview, setPreview] = useState(null);   // { url, pdf } pour l'aperçu
  const [head, setHead] = useState(null);         // fournisseur, numero, date, total_ht (modifiables)
  const [items, setItems] = useState([]);         // lignes modifiables
  const [majPrix, setMajPrix] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [summary, setSummary] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const camRef = useRef(null), fileRef = useRef(null);
  const savingRef = useRef(false);   // anti double clic (l'état React arrive un rendu trop tard)
  const scanToken = useRef(0);       // permet d'abandonner une lecture en cours
  const progress = useRef(null);     // ce qui est déjà écrit en base : une nouvelle tentative ne refait pas de doublon

  useEffect(() => () => { if (preview?.url) URL.revokeObjectURL(preview.url); }, [preview]);

  const reset = () => {
    scanToken.current++; progress.current = null;
    setStep("upload"); setHead(null); setItems([]); setPreview(null); setSummary(""); setSaveError(""); setFileName("");
  };

  const handleFile = async (file) => {
    if (!file || step === "reading") return;
    const pdf = file.type === "application/pdf" || /\.pdf$/i.test(file.name);
    if (!pdf && !file.type.startsWith("image/")) { toast("Format non pris en charge : photo ou PDF", "error"); return; }
    const token = ++scanToken.current;
    setFileName(file.name || "Photo"); setStep("reading");
    try {
      const blob = pdf ? file : await compressImage(file);
      if (blob.size > MAX_FILE) throw new Error("fichier trop volumineux (6 Mo maximum)");
      const image_base64 = await readBase64(blob);
      const { facture } = await invokeScan({ image_base64, media_type: pdf ? "application/pdf" : "image/jpeg" });
      if (token !== scanToken.current) return; // lecture abandonnée entre-temps

      setPreview({ url: URL.createObjectURL(blob), pdf });
      setHead({ fournisseur: facture.fournisseur || "", numero: facture.numero || "", date: facture.date || "", total_ht: facture.total_ht ?? "" });
      setItems((facture.lignes || []).map((l, i) => {
        const prix = toNum(l.prix_unitaire_ht), quantite = toNum(l.quantite);
        return {
          key:i, nom:l.designation, unite:l.unite || "", total_ht:toNum(l.total_ht),
          quantite:quantite ?? "", prix_unitaire:prix !== null && prix >= 0 ? prix : "",
          product_id:matchProduct(products, l.designation, facture.fournisseur)?.id || "", ignore:false,
        };
      }));
      progress.current = null; setSaveError(""); setMajPrix(true);
      setStep("review");
    } catch (e) {
      if (token !== scanToken.current) return;
      toast(e.message === SCAN_INDISPONIBLE ? SCAN_INDISPONIBLE : "Lecture impossible : " + e.message, "error");
      setStep("upload");
    }
  };

  const setItem = (key, patch) => setItems(prev => prev.map(it => it.key === key ? { ...it, ...patch } : it));
  const productOf = id => (products || []).find(p => p.id === id) || null;

  // État de chaque ligne (recalculé à chaque saisie)
  const rows = items.map(it => {
    const prod = productOf(it.product_id), q = toNum(it.quantite), prix = toNum(it.prix_unitaire);
    const status = it.ignore ? "ignored" : !prod ? "unmatched" : !(q > 0) ? "noqty" : "ok";
    return { ...it, prod, q, prix, status, v:variationPct(prix, prod?.prix_achat) };
  });
  const unmatched = rows.filter(r => r.status === "unmatched");
  const noQty = rows.filter(r => r.status === "noqty");
  const toStock = rows.filter(r => r.status === "ok");
  const priceChanged = r => r.prix > 0 && (r.prod?.prix_achat == null || Math.abs(r.prix - Number(r.prod.prix_achat)) > 0.0001);
  const nbPrix = new Set(toStock.filter(priceChanged).map(r => r.prod.id)).size;
  const hausse = toStock.filter(r => r.v > 5).length;

  // Contrôle : somme des lignes (qté × prix, sinon total lu) ≈ total HT de la facture
  const lineTotal = r => r.q !== null && r.prix !== null ? r.q * r.prix : r.total_ht;
  const sumLines = rows.reduce((s, r) => s + (lineTotal(r) ?? 0), 0);
  const total = head ? toNum(head.total_ht) : null;
  const ecart = total !== null && rows.length ? sumLines - total : null;
  const ecartOk = ecart !== null && Math.abs(ecart) <= Math.max(0.05, Math.abs(total) * 0.01);

  // Rien n'est écrit en base avant ce clic
  const confirmAndSave = async () => {
    if (savingRef.current) return;
    if (unmatched.length) { toast(`${plural(unmatched.length, "ligne")} non reconnue${unmatched.length>1?"s":""} : choisir un produit ou ignorer`, "error"); return; }
    if (noQty.length) { toast(`Quantité manquante sur ${plural(noQty.length, "ligne")}`, "error"); return; }
    savingRef.current = true; setSaving(true); setSaveError("");
    const p = progress.current || (progress.current = { invoiceId:null, itemsSaved:false, stockDone:new Set(), priceDone:new Set() });
    const failures = [];
    try {
      if (!p.invoiceId) {
        const date = /^\d{4}-\d{2}-\d{2}$/.test(head.date) ? head.date : null;
        const { data: inv, error } = await supabase.from("scanned_invoices").insert({
          restaurant_id:restaurantId, fournisseur:head.fournisseur.trim() || null,
          numero_bl:head.numero.trim() || null, date_facture:date,
          total_ht:total, statut:"validated", source:"scan",
        }).select().single();
        if (error) throw new Error("la facture n'a pas été enregistrée, rien n'a été modifié");
        p.invoiceId = inv.id;
      }

      if (!rows.length) p.itemsSaved = true; // facture sans ligne lue : rien à détailler
      if (!p.itemsSaved) {
        const { error } = await supabase.from("scanned_invoice_items").insert(rows.map(r => {
          const prod = r.ignore ? null : r.prod;
          return {
            invoice_id:p.invoiceId, product_nom:r.nom, quantite:r.q, unite:r.unite || null,
            prix_unitaire:r.prix, total_ht:r.total_ht, matched_product_id:prod?.id || null,
            prix_precedent:prod?.prix_achat ?? null, variation_pct:prod ? variationPct(r.prix, prod.prix_achat) : null,
          };
        }));
        if (error) failures.push("détail des lignes"); else p.itemsSaved = true;
      }

      // Cumul des quantités par produit (plusieurs lignes peuvent viser le même produit)
      const parProduit = new Map(); // id -> { prod, quantite, prix }
      for (const r of toStock) {
        const cur = parProduit.get(r.prod.id) || { prod:r.prod, quantite:0, prix:null };
        cur.quantite += r.q;
        if (r.prix > 0) cur.prix = r.prix;
        parProduit.set(r.prod.id, cur);
      }

      // Stock relu en base (la liste reçue en props peut être périmée après un premier scan)
      const ids = [...parProduit.keys()].filter(id => !p.stockDone.has(id));
      const stockActuel = {};
      if (ids.length) {
        const { data: st, error } = await supabase.from("latest_stock").select("product_id,stock_reel").in("product_id", ids);
        if (error) throw new Error("lecture du stock impossible : facture enregistrée, stocks non modifiés");
        (st || []).forEach(s => { stockActuel[s.product_id] = s.stock_reel; });
      }

      let stockFails = 0, priceFails = 0;
      for (const [id, { prod, quantite, prix }] of parProduit) {
        if (!p.stockDone.has(id)) {
          const { error } = await supabase.from("stock_entries").insert({
            product_id:id, restaurant_id:restaurantId, stock_reel:(Number(stockActuel[id]) || 0) + quantite,
          });
          if (error) { stockFails++; continue; }
          p.stockDone.add(id);
        }
        const changed = prix > 0 && (prod.prix_achat == null || Math.abs(prix - Number(prod.prix_achat)) > 0.0001);
        if (majPrix && changed && !p.priceDone.has(id)) {
          const { error } = await supabase.from("products").update({ prix_achat:prix }).eq("id", id);
          if (error) priceFails++; else p.priceDone.add(id);
        }
      }
      if (stockFails) failures.push(`stock de ${plural(stockFails, "produit")}`);
      if (priceFails) failures.push(`prix de ${plural(priceFails, "produit")}`);

      const nStock = p.stockDone.size, nPrix = p.priceDone.size;
      const msg = `${plural(nStock, "stock")} mis à jour${nPrix ? ` · ${plural(nPrix, "prix")} d'achat modifié${nPrix>1?"s":""}` : ""}`;
      if (nStock || nPrix) onSaved?.();
      if (failures.length) {
        const err = `Facture enregistrée, mais non mis à jour : ${failures.join(", ")}. Vos corrections sont conservées, réessayez.`;
        setSaveError(err); toast(err, "error");
      } else {
        toast(`Facture enregistrée — ${msg}`);
        setSummary(msg); setStep("done");
      }
    } catch (e) {
      setSaveError("Erreur : " + e.message + ". Vos corrections sont conservées, réessayez.");
      toast("Erreur : " + e.message, "error");
    }
    savingRef.current = false; setSaving(false);
  };

  // ── Étape finale ──
  if (step === "done") return (
    <div style={{ textAlign:"center", padding:"40px 4px" }}>
      <div style={{ width:56, height:56, borderRadius:"50%", background:D.successLight, color:D.success, display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 16px" }}><Ico d={ICON_CHECK} size={26}/></div>
      <h3 style={{ margin:"0 0 8px", fontSize:20, fontWeight:700 }}>Facture enregistrée</h3>
      <p style={{ margin:"0 0 24px", color:D.textSec }}>{summary}</p>
      <button onClick={reset} style={{ ...btnSt, background:D.brand, color:"#fff", border:"none" }}>Scanner une autre facture</button>
    </div>
  );

  // ── Étape 3 : vérification ──
  if (step === "review") {
    const blocked = unmatched.length > 0 || noQty.length > 0;
    return (
      <div>
        <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:14 }}>
          <button onClick={reset} disabled={saving} aria-label="Annuler et revenir" style={{ ...btnSt, padding:"0 10px", minWidth:44, background:"transparent", border:`1px solid ${D.border}`, color:D.text }}><Ico d={ICON_BACK}/></button>
          <div style={{ minWidth:0 }}><h2 style={{ margin:0, fontSize:18, fontWeight:700 }}>Vérifier la facture</h2>
            <p style={{ margin:0, fontSize:13, color:D.textSec }}>{plural(items.length, "ligne")} lue{items.length>1?"s":""} · rien n'est enregistré avant validation</p></div>
        </div>
        <Stepper step="review"/>

        {preview && (preview.pdf
          ? <a href={preview.url} target="_blank" rel="noreferrer" style={{ display:"inline-flex", alignItems:"center", gap:6, minHeight:44, marginBottom:10, fontSize:14, color:D.brand }}><Ico d={ICON_FILE} size={18}/>Ouvrir le PDF</a>
          : <details style={{ marginBottom:12 }}>
              <summary style={{ minHeight:44, display:"flex", alignItems:"center", fontSize:14, color:D.brand, cursor:"pointer" }}>Voir la photo</summary>
              <img src={preview.url} alt="Facture scannée" style={{ width:"100%", maxHeight:420, objectFit:"contain", borderRadius:10, border:`1px solid ${D.border}` }}/>
            </details>)}

        <div style={{ background:D.surface, border:`1px solid ${D.border}`, borderRadius:12, padding:14, marginBottom:12 }}>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))", gap:10 }}>
            {[["fournisseur","Fournisseur","text"],["numero","N° facture / BL","text"],["date","Date","date"],["total_ht","Total HT (€)","text"]].map(([k,l,t]) => (
              <div key={k} style={{ minWidth:0 }}><label style={labelSt}>{l}</label>
                <input type={t} inputMode={k==="total_ht"?"decimal":undefined} value={head[k]} onChange={e=>setHead(h=>({...h,[k]:e.target.value}))} style={inputSt}/></div>
            ))}
          </div>
          {rows.length > 0 && (
            <p style={{ margin:"10px 0 0", fontSize:13, color:ecart === null ? D.textSec : ecartOk ? D.success : D.warning, fontWeight:ecart !== null && !ecartOk ? 600 : 400 }}>
              Somme des lignes : {eur(sumLines)}
              {ecart === null ? " · total de la facture non lu" : ecartOk ? " · cohérent avec le total" : ` · écart de ${eur(ecart)} avec le total : vérifiez quantités et prix`}
            </p>
          )}
        </div>

        {hausse > 0 && (
          <div style={{ background:D.dangerLight, border:`1px solid #FECACA`, borderRadius:10, padding:"10px 14px", marginBottom:12 }}>
            <p style={{ margin:0, fontSize:13, fontWeight:600, color:D.danger }}>Hausse de prix de plus de 5 % sur {plural(hausse, "ligne")}</p>
          </div>
        )}

        {unmatched.length > 0 && (
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:8, background:D.warningLight, border:`1px solid #FDE68A`, borderRadius:10, padding:"8px 8px 8px 14px", marginBottom:12 }}>
            <p style={{ margin:0, fontSize:13, fontWeight:600, color:"#92400E" }}>{plural(unmatched.length, "ligne")} non reconnue{unmatched.length>1?"s":""}</p>
            <button onClick={()=>setItems(prev=>prev.map(it=>productOf(it.product_id)?it:{...it,ignore:true}))} style={{ ...btnSt, background:"transparent", border:`1px solid #FDE68A`, color:"#92400E", fontSize:13 }}>Ignorer les non reconnues</button>
          </div>
        )}

        {items.length === 0 && <p style={{ fontSize:13, color:D.textSec, marginBottom:14 }}>Aucune ligne de produit lue sur ce document. Vous pouvez reprendre une photo plus nette.</p>}

        <div style={{ display:"flex", flexDirection:"column", gap:8, marginBottom:14 }}>
          {rows.map(r => {
            const flag = r.status === "unmatched", off = r.status === "ignored";
            const uFact = normUnit(r.unite), uProd = normUnit(r.prod?.unite);
            return (
              <div key={r.key} style={{ background:off ? D.bg : D.surface, border:`1px solid ${flag ? "#FCD34D" : D.border}`, borderLeft:`4px solid ${flag ? D.warning : off ? D.border : r.v > 5 ? D.danger : D.success}`, borderRadius:12, padding:"12px 12px 12px 14px", opacity:off ? .7 : 1 }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:8, marginBottom:off ? 0 : 8 }}>
                  <div style={{ minWidth:0 }}>
                    <p style={{ margin:0, fontSize:14, fontWeight:600, overflowWrap:"anywhere", textDecoration:off ? "line-through" : "none" }}>{r.nom}</p>
                    <p style={{ margin:"2px 0 0", fontSize:12, color:D.textSec }}>
                      Lu : {r.q ?? "?"} {r.unite || ""} × {eur(r.prix)}{r.total_ht !== null ? ` = ${eur(r.total_ht)}` : ""}
                    </p>
                  </div>
                  <button onClick={()=>setItem(r.key,{ignore:!r.ignore})} style={{ ...btnSt, padding:"8px 12px", fontSize:13, flexShrink:0, background:"transparent", border:`1px solid ${D.border}`, color:D.textSec }}>{off ? "Réintégrer" : "Ignorer"}</button>
                </div>
                {!off && <>
                  {flag && <p style={{ margin:"0 0 6px", fontSize:13, fontWeight:600, color:"#92400E" }}>Non reconnu : choisir un produit ou ignorer</p>}
                  <label style={labelSt}>Produit de l'inventaire</label>
                  <select value={r.product_id} onChange={e=>setItem(r.key,{product_id:e.target.value})} style={{ ...inputSt, marginBottom:8, borderColor:flag ? D.warning : D.border }}>
                    <option value="">Choisir un produit...</option>
                    {(products || []).map(p => <option key={p.id} value={p.id}>{p.nom}{p.unite ? ` (${p.unite})` : ""}</option>)}
                  </select>
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
                    <div style={{ minWidth:0 }}><label style={labelSt}>Qté reçue{r.prod?.unite ? ` (${r.prod.unite})` : r.unite ? ` (${r.unite})` : ""}</label>
                      <input inputMode="decimal" value={r.quantite} onChange={e=>setItem(r.key,{quantite:e.target.value})} style={{ ...inputSt, borderColor:r.status === "noqty" ? D.danger : D.border }}/></div>
                    <div style={{ minWidth:0 }}><label style={labelSt}>Prix unit. HT (€)</label>
                      <input inputMode="decimal" value={r.prix_unitaire} onChange={e=>setItem(r.key,{prix_unitaire:e.target.value})} style={inputSt}/></div>
                  </div>
                  {(r.prod && uFact && uProd && uFact !== uProd) && <p style={{ margin:"6px 0 0", fontSize:12, color:D.warning }}>Facture en {r.unite}, stock suivi en {r.prod.unite} : ajustez la quantité si besoin.</p>}
                  {r.prod && (
                    <p style={{ margin:"6px 0 0", fontSize:12, color:D.textSec }}>
                      Prix actuel : {eur(r.prod.prix_achat)}
                      {r.v !== null && <span style={{ fontWeight:600, color:r.v > 5 ? D.danger : r.v > 0 ? D.warning : D.success }}> · {r.v >= 0 ? "+" : ""}{r.v.toFixed(1)} %</span>}
                    </p>
                  )}
                </>}
              </div>
            );
          })}
        </div>

        {saveError && <div role="alert" style={{ background:D.dangerLight, border:`1px solid #FECACA`, borderRadius:10, padding:"10px 14px", marginBottom:12 }}>
          <p style={{ margin:0, fontSize:13, color:D.danger }}>{saveError}</p></div>}

        <div style={{ paddingTop:10, borderTop:`1px solid ${D.border}` }}>
          <label style={{ display:"flex", alignItems:"center", gap:10, minHeight:44, fontSize:14, cursor:"pointer" }}>
            <input type="checkbox" checked={majPrix} onChange={e=>setMajPrix(e.target.checked)} style={{ width:20, height:20, flexShrink:0 }}/>
            <span>Mettre à jour les prix d'achat{nbPrix ? <span style={{ color:D.textSec }}> ({plural(nbPrix, "produit")})</span> : ""}</span>
          </label>
          <button onClick={confirmAndSave} disabled={saving || blocked}
            style={{ ...btnSt, width:"100%", minHeight:48, background:saving || blocked ? "#93C5FD" : D.brand, color:"#fff", border:"none", cursor:saving ? "wait" : blocked ? "not-allowed" : "pointer" }}>
            {saving ? "Enregistrement..."
              : unmatched.length ? `${plural(unmatched.length, "ligne")} à traiter`
              : noQty.length ? `Quantité manquante (${noQty.length})`
              : saveError ? "Réessayer"
              : `Valider${toStock.length ? ` et ajouter ${plural(new Set(toStock.map(r => r.prod.id)).size, "produit")} au stock` : " la facture"}`}
          </button>
        </div>
      </div>
    );
  }

  // ── Étape 2 : lecture ──
  if (step === "reading") return (
    <div>
      <h2 style={{ margin:"0 0 14px", fontSize:18, fontWeight:700, letterSpacing:"-.02em" }}>Scanner une facture / BL</h2>
      <Stepper step="reading"/>
      <div role="status" style={{ background:D.surface, border:`1px solid ${D.border}`, borderRadius:14, padding:"40px 20px", textAlign:"center" }}>
        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke={D.brand} strokeWidth="2" strokeLinecap="round" aria-hidden="true" style={{ marginBottom:12 }}>
          <path d="M21 12a9 9 0 1 1-6.2-8.56"><animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="0.9s" repeatCount="indefinite"/></path>
        </svg>
        <p style={{ margin:0, fontSize:16, fontWeight:600 }}>Lecture de la facture...</p>
        <p style={{ margin:"6px 0 0", fontSize:13, color:D.textSec, overflowWrap:"anywhere" }}>{fileName} · cela peut prendre jusqu'à une minute</p>
        <button onClick={reset} style={{ ...btnSt, marginTop:18, background:"transparent", border:`1px solid ${D.border}`, color:D.textSec }}>Annuler</button>
      </div>
    </div>
  );

  // ── Étape 1 : document ──
  return (
    <div>
      <h2 style={{ margin:"0 0 4px", fontSize:18, fontWeight:700, letterSpacing:"-.02em" }}>Scanner une facture / BL</h2>
      <p style={{ margin:"0 0 14px", fontSize:13, color:D.textSec }}>La facture est lue automatiquement, vous vérifiez avant d'enregistrer.</p>
      <Stepper step="upload"/>

      <div onDrop={e=>{e.preventDefault();setDragOver(false);handleFile(e.dataTransfer.files[0]);}} onDragOver={e=>{e.preventDefault();setDragOver(true);}} onDragLeave={()=>setDragOver(false)}
        style={{ background:D.surface, borderRadius:14, border:`2px dashed ${dragOver ? D.brand : D.border}`, padding:"24px 16px", textAlign:"center", marginBottom:16 }}>
        <div style={{ display:"flex", flexDirection:"column", gap:10, maxWidth:360, margin:"0 auto" }}>
          <button onClick={()=>camRef.current?.click()} style={{ ...btnSt, minHeight:52, fontSize:15, background:D.brand, color:"#fff", border:"none" }}><Ico d={ICON_CAMERA}/>Prendre une photo</button>
          <button onClick={()=>fileRef.current?.click()} style={{ ...btnSt, minHeight:52, fontSize:15, background:D.surface, color:D.text, border:`1px solid ${D.border}` }}><Ico d={ICON_FILE}/>Choisir un fichier (photo ou PDF)</button>
        </div>
        <p style={{ margin:"12px 0 0", fontSize:12, color:D.textSec }}>JPEG, PNG, WebP ou PDF · 6 Mo max · ou glissez le fichier ici</p>
        <input ref={camRef} type="file" accept="image/*" capture="environment" style={{display:"none"}} onChange={e=>{const f=e.target.files[0];e.target.value="";handleFile(f);}}/>
        <input ref={fileRef} type="file" accept="image/*,application/pdf,.pdf" style={{display:"none"}} onChange={e=>{const f=e.target.files[0];e.target.value="";handleFile(f);}}/>
      </div>

      <div style={{ background:D.bg, border:`1px solid ${D.border}`, borderRadius:10, padding:"12px 14px" }}>
        <p style={{ margin:"0 0 6px", fontSize:13, fontWeight:600 }}>Comment ça marche</p>
        <ol style={{ margin:0, paddingLeft:18, fontSize:13, color:D.textSec, lineHeight:1.6 }}>
          <li>Photographiez la facture à plat, bien éclairée, ou importez le PDF.</li>
          <li>Les produits, quantités et prix sont lus automatiquement.</li>
          <li>Vous associez chaque ligne à un produit, corrigez si besoin et validez : le stock et les prix d'achat sont mis à jour.</li>
        </ol>
      </div>
    </div>
  );
}
