// ═══════════════════════════════════════════════════════════════
//  PILLOT — HACCP Complet + Export
//  Fichier : src/screens/HACCP_complet.jsx
// ═══════════════════════════════════════════════════════════════

import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { localDate, daysFromToday } from "../lib/dates";

const C = {
  brand:"#2563EB",brandLight:"#EFF6FF",
  success:"#16A34A",successLight:"#F0FDF4",
  warning:"#D97706",warningLight:"#FFFBEB",
  danger:"#DC2626",dangerLight:"#FEF2F2",
  orange:"#EA580C",orangeLight:"#FFF7ED",
  border:"#E2E8F0",surface:"#FFFFFF",bg:"#F1F5F9",
  text:"#0F172A",textSec:"#64748B",textMuted:"#64748B"
};

const fmt = d => d ? new Date(d).toLocaleDateString("fr-FR") : "—";
const today = () => localDate();
const saveErr = (toast, error) => toast("Échec de l'enregistrement : " + (error?.message || "erreur inconnue"), "error");
const STATUT_LABEL = s => s === "non_conforme" ? "Non conforme" : s === "conforme" ? "Conforme" : String(s ?? "").replace(/_/g, " ");
const checkboxKey = fn => e => { if (e.key === " " || e.key === "Enter") { e.preventDefault(); fn(); } };

function Card({ children, style = {} }) {
  return <div style={{ background: C.surface, borderRadius: 14, border: `1px solid ${C.border}`, boxShadow: "0 1px 4px rgba(0,0,0,.04)", ...style }}>{children}</div>;
}

// ─── TEMPÉRATURES ───────────────────────────────────────────
const EQUIP_ICONS = { frigo:"❄️", congelateur:"🧊", vitrine:"🛒", bain_marie:"♨️", zone_chaude:"🔥", friteuse:"🛢️" };
const seuil = v => (v === null || v === undefined || v === "" || !Number.isFinite(Number(v))) ? null : Number(v);
const mapEquipement = e => ({ id: e.id, nom: e.nom, min: seuil(e.temp_min), max: seuil(e.temp_max), icon: EQUIP_ICONS[e.type] || "🌡️", type: e.type });
// Liste par défaut, utilisée en secours si le restaurant n'a déclaré aucun équipement
const EQUIPEMENTS_DEFAUT = [
  { nom:"Frigo 1",      min:0,  max:4,  icon:"❄️" },
  { nom:"Frigo 2",      min:0,  max:4,  icon:"❄️" },
  { nom:"Congélateur",  min:-22,max:-18,icon:"🧊" },
  { nom:"Zone prépa",   min:-5, max:12, icon:"🌡️" },
  { nom:"Vitrine froide",min:0, max:6,  icon:"❄️" },
  { nom:"Bain-marie",   min:63, max:99, icon:"♨️" },
  { nom:"Zone chaude",  min:63, max:99, icon:"🔥" },
];

// ─── NETTOYAGE ───────────────────────────────────────────────
const NETTOYAGE_QUOTIDIEN = ["Plans de travail","Sol cuisine","Frigos (extérieur)","Plonge & robinetterie","Poubelles","Appareils & grille-pains","Lave-mains"];
const NETTOYAGE_HEBDO = ["Hottes et filtres","Intérieur frigos","Congélateur","Four & appareils cuisson","Derrière les appareils","Vitres & surfaces verticales"];
const NETTOYAGE_DEFAUT = () => ({ quotidien: [...NETTOYAGE_QUOTIDIEN], hebdo: [...NETTOYAGE_HEBDO] });
const nettoyageKey = restaurantId => `pillot_nettoyage_${restaurantId}`;
const loadNettoyage = restaurantId => {
  try {
    const raw = localStorage.getItem(nettoyageKey(restaurantId));
    if (!raw) return NETTOYAGE_DEFAUT();
    const parsed = JSON.parse(raw);
    const clean = arr => Array.isArray(arr) ? [...new Set(arr.filter(t => typeof t === "string" && t.trim()).map(t => t.trim()))] : null;
    const quotidien = clean(parsed?.quotidien), hebdo = clean(parsed?.hebdo);
    return { quotidien: quotidien ?? [...NETTOYAGE_QUOTIDIEN], hebdo: hebdo ?? [...NETTOYAGE_HEBDO] };
  } catch { return NETTOYAGE_DEFAUT(); }
};
const saveNettoyage = (restaurantId, lists) => {
  try { localStorage.setItem(nettoyageKey(restaurantId), JSON.stringify(lists)); return true; } catch { return false; }
};
const resetNettoyage = restaurantId => {
  try { localStorage.removeItem(nettoyageKey(restaurantId)); return true; } catch { return false; }
};

// ─── HACCP PRINCIPAL ────────────────────────────────────────
export default function HACCPComplet({ restaurantId, profileId, toast }) {
  const [onglet, setOnglet] = useState("temp");
  const [tempLogs, setTempLogs] = useState([]);
  const [cleanLogs, setCleanLogs] = useState([]);
  const [dlcEntries, setDlcEntries] = useState([]);
  const [receptions, setReceptions] = useState([]);
  const [oilChanges, setOilChanges] = useState([]);
  // null = pas encore chargé (ou erreur) ; [] = restaurant sans équipement déclaré
  const [equipements, setEquipements] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadAll(); }, [restaurantId]);

  const loadAll = async () => {
    if (!restaurantId) { setLoading(false); return; }
    setLoading(true);
    const [rTl, rCl, rDlc, rRec, rOil, rEq] = await Promise.all([
      supabase.from("temperature_logs").select("*").eq("restaurant_id", restaurantId).order("created_at", { ascending: false }).limit(50),
      supabase.from("cleaning_logs").select("*").eq("restaurant_id", restaurantId).order("created_at", { ascending: false }).limit(50),
      supabase.from("dlc_entries").select("*").eq("restaurant_id", restaurantId).eq("statut", "actif").order("dlc_date"),
      supabase.from("reception_controls").select("*").eq("restaurant_id", restaurantId).order("created_at", { ascending: false }).limit(20),
      supabase.from("oil_changes").select("*").eq("restaurant_id", restaurantId).order("date_changement", { ascending: false }).limit(10),
      supabase.from("equipements").select("id,nom,type,temp_min,temp_max,actif,ordre").eq("restaurant_id", restaurantId).or("actif.is.null,actif.eq.true").order("ordre"),
    ]);
    // En cas d'erreur de lecture, on garde l'état précédent plutôt que de tout vider
    if (!rTl.error) setTempLogs(rTl.data || []);
    if (!rCl.error) setCleanLogs(rCl.data || []);
    if (!rDlc.error) setDlcEntries(rDlc.data || []);
    if (!rRec.error) setReceptions(rRec.data || []);
    if (!rOil.error) setOilChanges(rOil.data || []);
    if (!rEq.error) setEquipements((rEq.data || []).filter(e => e.nom).map(mapEquipement));
    const loadErr = [rTl, rCl, rDlc, rRec, rOil, rEq].find(r => r.error)?.error;
    if (loadErr) toast("Erreur de chargement des données HACCP : " + loadErr.message, "error");
    setLoading(false);
  };

  // Export CSV
  const exportCSV = (data, filename) => {
    if (!data.length) { toast("Aucune donnée à exporter", "warning"); return; }
    const keys = Object.keys(data[0]).filter(k => k !== "id" && k !== "restaurant_id");
    const cell = v => {
      if (v === null || v === undefined) return '""';
      let s = typeof v === "object" ? JSON.stringify(v) : String(v);
      // Neutralise les formules (=, +, @, et - si ce n'est pas un nombre) — les nombres restent intacts
      const isNum = typeof v === "number" || (s.trim() !== "" && !isNaN(Number(s)));
      if (!isNum && /^[=+\-@\t\r]/.test(s)) s = "'" + s;
      return `"${s.replace(/"/g, '""')}"`;
    };
    const csv = "﻿" + [keys.join(";"), ...data.map(r => keys.map(k => cell(r[k])).join(";"))].join("\n");
    const a = document.createElement("a");
    a.href = "data:text/csv;charset=utf-8," + encodeURIComponent(csv);
    a.download = `${filename}_${today()}.csv`;
    a.click();
    toast("Export téléchargé");
  };

  // Registre complet des 12 derniers mois (les listes affichées sont limitées aux dernières saisies)
  const exportFull = async (table, dateCol, filename) => {
    const since = new Date(); since.setFullYear(since.getFullYear() - 1);
    const from = dateCol === "created_at" ? since.toISOString() : localDate(since);
    const rows = [];
    for (let off = 0; ; off += 1000) {
      const { data, error } = await supabase.from(table).select("*").eq("restaurant_id", restaurantId)
        .gte(dateCol, from).order(dateCol, { ascending: true }).order("id", { ascending: true }).range(off, off + 999);
      if (error) { toast("Erreur : export impossible", "error"); return; }
      rows.push(...(data || []));
      if (!data || data.length < 1000) break;
    }
    exportCSV(rows, `${filename}_12mois`);
  };

  const TABS = [
    ["temp","🌡️ Températures"],["clean","🧹 Nettoyage"],
    ["dlc","📦 DLC"],["reception","✅ Réception"],["huile","🛢️ Huile"]
  ];

  return (
    <div>
      <div style={{ marginBottom: 20, display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, letterSpacing: "-.5px" }}>HACCP</h1>
          <p style={{ margin: "4px 0 0", fontSize: 14, color: C.textSec }}>Traçabilité hygiène · {new Date().toLocaleDateString("fr-FR", { weekday:"long", day:"numeric", month:"long" })}</p>
        </div>
        <button onClick={() => exportFull("temperature_logs", "created_at", "temperatures")}
          style={{ padding: "8px 14px", minHeight: 44, background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, fontWeight: 600 }}>
          ↓ Exporter CSV
        </button>
      </div>

      {/* Onglets */}
      <div style={{ display: "flex", gap: 4, overflowX: "auto", marginBottom: 16, paddingBottom: 4 }}>
        {TABS.map(([k, l]) => (
          <button key={k} onClick={() => setOnglet(k)}
            style={{ padding: "7px 14px", minHeight: 44, borderRadius: 9, border: `1px solid ${onglet===k?C.brand:C.border}`, fontSize: 12, cursor: "pointer", background: onglet===k?C.brandLight:"transparent", color: onglet===k?C.brand:C.textSec, fontWeight: onglet===k?700:400, whiteSpace: "nowrap", flexShrink: 0 }}>
            {l}
          </button>
        ))}
      </div>

      {loading ? <p style={{ textAlign:"center", color:C.textMuted, padding:40 }}>Chargement...</p> : (
        <>
          {onglet === "temp" && <TemperaturesTab logs={tempLogs} equipements={equipements} restaurantId={restaurantId} profileId={profileId} toast={toast} onRefresh={loadAll}/>}
          {onglet === "clean" && <NettoyageTab key={restaurantId} logs={cleanLogs} restaurantId={restaurantId} profileId={profileId} toast={toast} onRefresh={loadAll} onExport={() => exportFull("cleaning_logs", "created_at", "nettoyage")}/>}
          {onglet === "dlc" && <DLCTab entries={dlcEntries} restaurantId={restaurantId} profileId={profileId} toast={toast} onRefresh={loadAll} onExport={() => exportFull("dlc_entries", "dlc_date", "dlc")}/>}
          {onglet === "reception" && <ReceptionTab receptions={receptions} restaurantId={restaurantId} profileId={profileId} toast={toast} onRefresh={loadAll} onExport={() => exportFull("reception_controls", "created_at", "receptions")}/>}
          {onglet === "huile" && <HuileTab oils={oilChanges} equipements={equipements} restaurantId={restaurantId} profileId={profileId} toast={toast} onRefresh={loadAll} onExport={() => exportFull("oil_changes", "date_changement", "huile")}/>}
        </>
      )}
    </div>
  );
}

// ── TEMPÉRATURES ──────────────────────────────────────────────
function TemperaturesTab({ logs, equipements, restaurantId, profileId, toast, onRefresh }) {
  const sansEquipement = Array.isArray(equipements) && equipements.length === 0;
  const EQUIPEMENTS = equipements?.length ? equipements : EQUIPEMENTS_DEFAUT;
  const [adding, setAdding] = useState(null), [val, setVal] = useState(""), [saving, setSaving] = useState(false);

  const isOk = (equip, temp) => {
    const e = EQUIPEMENTS.find(x => x.nom === equip);
    return e ? (e.min === null || temp >= e.min) && (e.max === null || temp <= e.max) : true;
  };

  const save = async () => {
    const v = parseFloat(val);
    if (isNaN(v)) { toast("Valeur invalide","error"); return; }
    // Garde-fou contre les fautes de frappe (ex. 300 au lieu de 3,0)
    if (v < -40 || v > 250) { toast("Température improbable : vérifiez la saisie (entre -40 et 250 °C)","error"); return; }
    setSaving(true);
    const e = EQUIPEMENTS.find(x => x.nom === adding);
    const { error } = await supabase.from("temperature_logs").insert({ restaurant_id:restaurantId, saisi_par:profileId, equipement:adding, temperature:v, temperature_min:e?.min, temperature_max:e?.max });
    if (error) { saveErr(toast, error); setSaving(false); return; }
    await onRefresh(); toast("Température enregistrée"); setAdding(null); setVal("");
    setSaving(false);
  };

  return (
    <div>
      {sansEquipement && (
        <div style={{ padding:"10px 14px", marginBottom:12, borderRadius:10, background:C.warningLight, border:`1px solid ${C.border}`, fontSize:12, fontWeight:600, color:C.text }}>
          ℹ️ Ajoutez vos équipements dans le menu Équipements pour des relevés à vos seuils
        </div>
      )}
      {adding && (
        <div style={{ position:"fixed", inset:0, background:"rgba(15,23,42,.5)", zIndex:200, display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}>
          <div style={{ background:C.surface, borderRadius:16, padding:24, maxWidth:340, width:"100%", boxShadow:"0 20px 50px rgba(0,0,0,.3)" }}>
            <p style={{ margin:"0 0 4px", fontSize:16, fontWeight:800 }}>{adding}</p>
            <p style={{ margin:"0 0 16px", fontSize:13, color:C.textSec }}>Norme : {EQUIPEMENTS.find(e=>e.nom===adding)?.min ?? "—"}°C à {EQUIPEMENTS.find(e=>e.nom===adding)?.max ?? "—"}°C</p>
            <input type="number" value={val} onChange={e=>setVal(e.target.value)} autoFocus placeholder="Ex: 3.5" step="0.1"
              style={{ width:"100%", boxSizing:"border-box", padding:"12px 14px", borderRadius:10, border:`1.5px solid ${C.brand}`, fontSize:22, fontWeight:800, textAlign:"center", marginBottom:10 }}/>
            {val && !isNaN(parseFloat(val)) && (
              <div style={{ padding:"8px 12px", borderRadius:8, background:isOk(adding,parseFloat(val))?C.successLight:C.dangerLight, marginBottom:12 }}>
                <p style={{ margin:0, fontSize:13, fontWeight:700, color:isOk(adding,parseFloat(val))?C.success:C.danger }}>
                  {isOk(adding,parseFloat(val)) ? "✅ Conforme" : "⚠️ HORS NORME — Vérifier l'équipement !"}
                </p>
              </div>
            )}
            <div style={{ display:"flex", gap:8 }}>
              <button onClick={save} disabled={saving||!val} style={{ flex:1, padding:12, background:C.brand, color:"#fff", border:"none", borderRadius:10, fontSize:14, fontWeight:700, cursor:"pointer" }}>{saving?"...":"Enregistrer"}</button>
              <button onClick={()=>{setAdding(null);setVal("");}} style={{ padding:"12px 16px", background:"transparent", border:`1px solid ${C.border}`, borderRadius:10, cursor:"pointer" }}>Annuler</button>
            </div>
          </div>
        </div>
      )}
      <div style={{ display:"flex", flexDirection:"column", gap:10, marginBottom:20 }}>
        {EQUIPEMENTS.map(e => {
          const last = logs.find(l => l.equipement === e.nom);
          const ok = last ? isOk(e.nom, last.temperature) : null;
          return (
            <Card key={e.id ?? e.nom} style={{ padding:"14px 16px", display:"flex", alignItems:"center", gap:12 }}>
              <div style={{ width:46, height:46, borderRadius:13, background:ok===null?"#F1F5F9":ok?C.successLight:C.dangerLight, display:"flex", alignItems:"center", justifyContent:"center", fontSize:22, flexShrink:0 }}>{e.icon}</div>
              <div style={{ flex:1 }}>
                <p style={{ margin:0, fontSize:14, fontWeight:700 }}>{e.nom}</p>
                <p style={{ margin:0, fontSize:11, color:C.textSec }}>{e.min ?? "—"}°C à {e.max ?? "—"}°C</p>
                {last && <p style={{ margin:"2px 0 0", fontSize:10, color:C.textMuted }}>{new Date(last.created_at).toLocaleString("fr-FR")}</p>}
              </div>
              <div style={{ textAlign:"right", flexShrink:0 }}>
                {last ? <>
                  <p style={{ margin:"0 0 4px", fontSize:22, fontWeight:800, color:ok?C.success:C.danger }}>{last.temperature}°C</p>
                  <span style={{ fontSize:10, fontWeight:700, color:ok?C.success:C.danger, background:ok?C.successLight:C.dangerLight, padding:"2px 8px", borderRadius:10 }}>{ok?"OK":"ALERTE"}</span>
                </> : <p style={{ margin:0, fontSize:12, color:C.textMuted }}>Non relevé</p>}
              </div>
              <button onClick={() => setAdding(e.nom)} style={{ padding:"9px 14px", minHeight:44, background:C.brandLight, color:C.brand, border:`1px solid ${C.border}`, borderRadius:10, fontSize:12, fontWeight:700, cursor:"pointer" }}>+ Relever</button>
            </Card>
          );
        })}
      </div>
      {/* Historique */}
      {logs.length > 0 && <Card style={{ overflow:"hidden" }}>
        <div style={{ padding:"11px 16px", borderBottom:`1px solid ${C.border}`, background:"#F8FAFC" }}>
          <p style={{ margin:0, fontSize:12, fontWeight:700, color:C.textSec, textTransform:"uppercase", letterSpacing:".5px" }}>Historique récent</p>
        </div>
        {logs.slice(0,10).map((l,i) => (
          <div key={l.id} style={{ padding:"9px 16px", borderBottom:i<9?`1px solid ${C.border}`:"none", display:"flex", alignItems:"center", gap:10 }}>
            <span style={{ fontSize:13, fontWeight:800, color:isOk(l.equipement,l.temperature)?C.success:C.danger, minWidth:50 }}>{l.temperature}°C</span>
            <div style={{ flex:1 }}><p style={{ margin:0, fontSize:12, fontWeight:500 }}>{l.equipement}</p><p style={{ margin:0, fontSize:10, color:C.textMuted }}>{new Date(l.created_at).toLocaleString("fr-FR")}</p></div>
            <span style={{ fontSize:11, fontWeight:700, color:isOk(l.equipement,l.temperature)?C.success:C.danger }}>{isOk(l.equipement,l.temperature)?"✓":"⚠"}</span>
          </div>
        ))}
      </Card>}
    </div>
  );
}

// ── NETTOYAGE ─────────────────────────────────────────────────
function NettoyageTab({ logs, restaurantId, profileId, toast, onRefresh, onExport }) {
  const [checks, setChecks] = useState({}), [saving, setSaving] = useState(false);
  // Liste personnalisée par restaurant (localStorage) — le composant est remonté à chaque changement de restaurant (key)
  const [lists, setLists] = useState(() => loadNettoyage(restaurantId));
  const [editMode, setEditMode] = useState(false);
  const [newTask, setNewTask] = useState({ quotidien: "", hebdo: "" });

  const persist = next => {
    setLists(next);
    if (!saveNettoyage(restaurantId, next)) toast("Liste modifiée, mais non sauvegardée sur cet appareil", "warning");
  };
  const addTask = kind => {
    const t = newTask[kind].trim();
    if (!t) return;
    if (lists.quotidien.includes(t) || lists.hebdo.includes(t)) { toast("Cette tâche existe déjà", "error"); return; }
    persist({ ...lists, [kind]: [...lists[kind], t] });
    setNewTask(p => ({ ...p, [kind]: "" }));
  };
  const removeTask = (kind, t) => {
    persist({ ...lists, [kind]: lists[kind].filter(x => x !== t) });
    setChecks(p => { const n = { ...p }; delete n[t]; return n; });
  };
  const resetLists = () => {
    if (!window.confirm("Réinitialiser la liste de nettoyage par défaut ?")) return;
    resetNettoyage(restaurantId);
    setLists(NETTOYAGE_DEFAUT());
    setChecks({});
    toast("Liste réinitialisée");
  };
  const todayStr = today();
  const todayLogs = logs.filter(l => l.created_at && localDate(new Date(l.created_at)) === todayStr);
  const doneTasks = todayLogs.map(l => l.tache);

  const toggle = task => setChecks(p => ({ ...p, [task]: !p[task] }));

  const save = async () => {
    setSaving(true);
    const tasks = Object.entries(checks).filter(([,v]) => v).map(([k]) => k);
    const { error } = await supabase.from("cleaning_logs").insert(tasks.map(t => ({ restaurant_id:restaurantId, saisi_par:profileId, tache:t, fait:true })));
    if (error) { saveErr(toast, error); setSaving(false); return; }
    toast(tasks.length + " tâche" + (tasks.length > 1 ? "s" : "") + " enregistrée" + (tasks.length > 1 ? "s" : ""));
    setChecks({}); await onRefresh();
    setSaving(false);
  };

  const ListTaches = ({ tasks, title }) => (
    <Card style={{ marginBottom:12, overflow:"hidden" }}>
      <div style={{ padding:"10px 16px", borderBottom:`1px solid ${C.border}`, background:"#F8FAFC" }}><p style={{ margin:0, fontSize:12, fontWeight:700, color:C.textSec, textTransform:"uppercase", letterSpacing:".5px" }}>{title}</p></div>
      {tasks.map((t, i) => {
        const done = doneTasks.includes(t), checked = checks[t];
        return (
          <div key={t} onClick={() => !done && toggle(t)}
            role="checkbox" aria-checked={!!(done || checked)} aria-disabled={done || undefined} tabIndex={done ? -1 : 0}
            onKeyDown={checkboxKey(() => !done && toggle(t))}
            style={{ padding:"12px 16px", borderBottom:i<tasks.length-1?`1px solid ${C.border}`:"none", display:"flex", alignItems:"center", gap:12, cursor:done?"default":"pointer", background:done?C.successLight:checked?"#EFF6FF":"transparent" }}>
            <div style={{ width:22, height:22, borderRadius:6, border:`2px solid ${done?C.success:checked?C.brand:C.border}`, background:done?C.success:checked?C.brand:"transparent", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
              {(done||checked) && <span style={{ color:"#fff", fontSize:12, fontWeight:800 }}>✓</span>}
            </div>
            <span style={{ fontSize:13, fontWeight:done||checked?600:400, color:done?C.success:C.text, textDecoration:done?"line-through":"none" }}>{t}</span>
            {done && <span style={{ fontSize:10, color:C.success, marginLeft:"auto" }}>Fait</span>}
          </div>
        );
      })}
    </Card>
  );

  const renderEditTaches = ({ kind, title }) => (
    <Card style={{ marginBottom:12, overflow:"hidden" }}>
      <div style={{ padding:"10px 16px", borderBottom:`1px solid ${C.border}`, background:"#F8FAFC" }}><p style={{ margin:0, fontSize:12, fontWeight:700, color:C.textSec, textTransform:"uppercase", letterSpacing:".5px" }}>{title}</p></div>
      {lists[kind].length === 0 && <p style={{ margin:0, padding:"12px 16px", fontSize:12, color:C.textMuted }}>Aucune tâche</p>}
      {lists[kind].map(t => (
        <div key={t} style={{ padding:"8px 16px", borderBottom:`1px solid ${C.border}`, display:"flex", alignItems:"center", gap:12 }}>
          <span style={{ flex:1, fontSize:13 }}>{t}</span>
          <button onClick={() => removeTask(kind, t)} aria-label={`Retirer ${t}`} style={{ padding:"6px 12px", minHeight:44, background:C.dangerLight, color:C.danger, border:`1px solid ${C.border}`, borderRadius:8, fontSize:12, fontWeight:700, cursor:"pointer" }}>Retirer</button>
        </div>
      ))}
      <div style={{ padding:"10px 16px", display:"flex", gap:8 }}>
        <input value={newTask[kind]} onChange={e => { const v = e.target.value; setNewTask(p => ({ ...p, [kind]: v })); }}
          onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addTask(kind); } }}
          placeholder="Nouvelle tâche" aria-label={`Nouvelle tâche — ${title}`}
          style={{ flex:1, minWidth:0, boxSizing:"border-box", padding:"9px 12px", borderRadius:8, border:`1px solid ${C.border}`, fontSize:13 }}/>
        <button onClick={() => addTask(kind)} disabled={!newTask[kind].trim()} style={{ padding:"8px 14px", minHeight:44, background:C.brand, color:"#fff", border:"none", borderRadius:8, fontSize:12, fontWeight:700, cursor:"pointer" }}>+ Ajouter</button>
      </div>
    </Card>
  );

  return (
    <div>
      <div style={{ display:"flex", justifyContent:"flex-end", gap:8, marginBottom:14, flexWrap:"wrap" }}>
        {editMode && <button onClick={resetLists} style={{ padding:"8px 12px", minHeight:44, background:"transparent", border:`1px solid ${C.border}`, borderRadius:8, fontSize:12, cursor:"pointer" }}>↺ Réinitialiser</button>}
        <button onClick={() => setEditMode(m => !m)} style={{ padding:"8px 12px", minHeight:44, background:editMode?C.brand:C.brandLight, color:editMode?"#fff":C.brand, border:`1px solid ${C.border}`, borderRadius:8, fontSize:12, fontWeight:700, cursor:"pointer" }}>{editMode ? "✓ Terminer" : "✎ Modifier la liste"}</button>
        <button onClick={onExport} style={{ padding:"8px 12px", minHeight:44, background:C.bg, border:`1px solid ${C.border}`, borderRadius:8, fontSize:12, cursor:"pointer" }}>↓ Export</button>
      </div>
      {editMode ? <>
        {renderEditTaches({ kind:"quotidien", title:"Tâches quotidiennes" })}
        {renderEditTaches({ kind:"hebdo", title:"Tâches hebdomadaires" })}
      </> : <>
        <ListTaches tasks={lists.quotidien} title="Tâches quotidiennes"/>
        <ListTaches tasks={lists.hebdo} title="Tâches hebdomadaires"/>
      </>}
      {!editMode && Object.values(checks).some(Boolean) && (
        <button onClick={save} disabled={saving} style={{ width:"100%", padding:13, background:C.success, color:"#fff", border:"none", borderRadius:12, fontSize:15, fontWeight:700, cursor:"pointer", boxShadow:`0 4px 12px ${C.success}40` }}>
          {saving ? "Enregistrement..." : "✅ Valider les tâches effectuées"}
        </button>
      )}
    </div>
  );
}

// ── DLC ───────────────────────────────────────────────────────
function DLCTab({ entries, restaurantId, profileId, toast, onRefresh, onExport }) {
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ product_nom:"", dlc_date:"", lot:"", fournisseur:"", quantite:1, unite:"" });
  const [saving, setSaving] = useState(false);

  const [confirmJete, setConfirmJete] = useState(null);
  const daysUntil = dlc => daysFromToday(dlc);
  const color = d => d < 0 ? C.danger : d <= 2 ? C.danger : d <= 5 ? C.warning : C.success;
  const bg = d => d < 0 ? C.dangerLight : d <= 2 ? C.dangerLight : d <= 5 ? C.warningLight : C.successLight;
  const label = d => d < 0 ? "Expiré" : d === 0 ? "Expire aujourd'hui !" : d === 1 ? "Expire demain" : `J-${d}`;

  const save = async () => {
    if (!form.product_nom || !form.dlc_date) { toast("Nom et DLC obligatoires","error"); return; }
    setSaving(true);
    const { error } = await supabase.from("dlc_entries").insert({ restaurant_id:restaurantId, saisi_par:profileId, ...form });
    if (error) { saveErr(toast, error); setSaving(false); return; }
    toast("DLC enregistrée"); setModal(false); setForm({ product_nom:"", dlc_date:"", lot:"", fournisseur:"", quantite:1, unite:"" });
    await onRefresh(); setSaving(false);
  };

  const markConsumed = async (id, statut) => {
    setConfirmJete(null);
    const { error } = await supabase.from("dlc_entries").update({ statut }).eq("id", id);
    if (error) { saveErr(toast, error); return; }
    toast(statut === "consomme" ? "Marqué consommé" : "Marqué jeté"); await onRefresh();
  };

  const urgent = entries.filter(e => daysUntil(e.dlc_date) <= 2);

  return (
    <div>
      {modal && (
        <div style={{ position:"fixed", inset:0, background:"rgba(15,23,42,.5)", zIndex:200, display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}>
          <div style={{ background:C.surface, borderRadius:16, padding:24, maxWidth:400, width:"100%", boxShadow:"0 20px 50px rgba(0,0,0,.3)" }}>
            <h3 style={{ margin:"0 0 16px", fontSize:16, fontWeight:800 }}>Nouvelle DLC</h3>
            <div style={{ display:"flex", flexDirection:"column", gap:10, marginBottom:14 }}>
              {[["Produit *",form.product_nom,v=>setForm(p=>({...p,product_nom:v})),"text","Ex: Emmental râpé 1kg"],["Fournisseur",form.fournisseur,v=>setForm(p=>({...p,fournisseur:v})),"text","Ex : Metro"],["N° de lot",form.lot,v=>setForm(p=>({...p,lot:v})),"text","Ex: FR 74 012"]].map(([l,v,set,t,ph])=>(
                <div key={l}><label style={{ fontSize:11, fontWeight:600, color:C.textSec, display:"block", marginBottom:4, textTransform:"uppercase", letterSpacing:".5px" }}>{l}</label>
                  <input type={t} value={v} onChange={e=>set(e.target.value)} placeholder={ph} style={{ width:"100%", boxSizing:"border-box", padding:"9px 12px", borderRadius:8, border:`1px solid ${C.border}`, fontSize:13 }}/></div>
              ))}
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
                <div><label style={{ fontSize:11, fontWeight:600, color:C.textSec, display:"block", marginBottom:4, textTransform:"uppercase", letterSpacing:".5px" }}>Date DLC *</label>
                  <input type="date" value={form.dlc_date} onChange={e=>setForm(p=>({...p,dlc_date:e.target.value}))} style={{ width:"100%", boxSizing:"border-box", padding:"9px 12px", borderRadius:8, border:`1px solid ${C.border}`, fontSize:13 }}/></div>
                <div><label style={{ fontSize:11, fontWeight:600, color:C.textSec, display:"block", marginBottom:4, textTransform:"uppercase", letterSpacing:".5px" }}>Quantité</label>
                  <input type="number" value={form.quantite} onChange={e=>setForm(p=>({...p,quantite:parseFloat(e.target.value)||1}))} style={{ width:"100%", boxSizing:"border-box", padding:"9px 12px", borderRadius:8, border:`1px solid ${C.border}`, fontSize:13 }}/></div>
              </div>
            </div>
            <div style={{ display:"flex", gap:8 }}>
              <button onClick={save} disabled={saving} style={{ flex:1, padding:12, background:C.brand, color:"#fff", border:"none", borderRadius:10, fontSize:14, fontWeight:700, cursor:"pointer" }}>{saving?"...":"Enregistrer"}</button>
              <button onClick={()=>setModal(false)} style={{ padding:"12px 14px", background:"transparent", border:`1px solid ${C.border}`, borderRadius:10, cursor:"pointer" }}>Annuler</button>
            </div>
          </div>
        </div>
      )}

      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
        <div>
          {urgent.length > 0 && <div style={{ display:"inline-flex", alignItems:"center", gap:6, padding:"6px 12px", background:C.dangerLight, borderRadius:8, fontSize:12, fontWeight:700, color:C.danger }}>
            ⚠️ {urgent.length} produit{urgent.length>1?"s":""} expiran{urgent.length>1?"t":"t"} bientôt
          </div>}
        </div>
        <div style={{ display:"flex", gap:8 }}>
          <button onClick={onExport} style={{ padding:"8px 12px", minHeight:44, background:C.bg, border:`1px solid ${C.border}`, borderRadius:8, fontSize:12, cursor:"pointer" }}>↓ Export</button>
          <button onClick={()=>setModal(true)} style={{ padding:"8px 14px", minHeight:44, background:C.brand, color:"#fff", border:"none", borderRadius:8, fontSize:12, fontWeight:700, cursor:"pointer" }}>+ DLC</button>
        </div>
      </div>

      {entries.length === 0 ? (
        <Card style={{ padding:40, textAlign:"center" }}>
          <p style={{ fontSize:28, margin:"0 0 8px" }}>📦</p>
          <p style={{ fontSize:14, fontWeight:700, margin:0 }}>Aucune DLC enregistrée</p>
          <p style={{ fontSize:13, color:C.textSec, margin:"6px 0 0" }}>Ajoutez les DLC de vos produits pour les suivre</p>
        </Card>
      ) : (
        <Card style={{ overflow:"hidden" }}>
          {entries.map((e, i) => {
            const d = daysUntil(e.dlc_date);
            return (
              <div key={e.id} style={{ padding:"12px 16px", borderBottom:i<entries.length-1?`1px solid ${C.border}`:"none", display:"flex", alignItems:"center", gap:10, background:d<=2?C.dangerLight:d<=5?C.warningLight:"transparent" }}>
                <div style={{ flex:1 }}>
                  <p style={{ margin:0, fontSize:14, fontWeight:700 }}>{e.product_nom}</p>
                  <p style={{ margin:0, fontSize:11, color:C.textSec }}>DLC : {fmt(e.dlc_date)} {e.lot?"· Lot "+e.lot:""} {e.fournisseur?"· "+e.fournisseur:""}</p>
                  {e.quantite > 0 && <p style={{ margin:0, fontSize:11, color:C.textMuted }}>Qté : {e.quantite} {e.unite}</p>}
                </div>
                <span style={{ fontSize:11, fontWeight:700, color:color(d), background:bg(d), padding:"3px 10px", borderRadius:10, flexShrink:0 }}>{label(d)}</span>
                <div style={{ display:"flex", gap:4, flexShrink:0 }}>
                  <button onClick={()=>markConsumed(e.id,"consomme")} title="Consommé" style={{ padding:"5px 10px", minHeight:44, background:C.successLight, border:"none", borderRadius:6, fontSize:12, cursor:"pointer", color:C.success, fontWeight:600 }}>✓ Consommé</button>
                  {confirmJete === e.id ? <>
                    <button onClick={()=>markConsumed(e.id,"jete")} title="Confirmer : jeté" style={{ padding:"5px 10px", minHeight:44, background:C.danger, border:"none", borderRadius:6, fontSize:12, cursor:"pointer", color:"#fff", fontWeight:700 }}>Confirmer ?</button>
                    <button onClick={()=>setConfirmJete(null)} title="Annuler" style={{ padding:"5px 10px", minHeight:44, background:"transparent", border:`1px solid ${C.border}`, borderRadius:6, fontSize:12, cursor:"pointer", color:C.textSec }}>Annuler</button>
                  </> : (
                    <button onClick={()=>setConfirmJete(e.id)} title="Jeté" style={{ padding:"5px 10px", minHeight:44, background:C.dangerLight, border:"none", borderRadius:6, fontSize:12, cursor:"pointer", color:C.danger, fontWeight:600 }}>✗ Jeté</button>
                  )}
                </div>
              </div>
            );
          })}
        </Card>
      )}
    </div>
  );
}

// ── CONTRÔLE RÉCEPTION ────────────────────────────────────────
function ReceptionTab({ receptions, restaurantId, profileId, toast, onRefresh, onExport }) {
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ fournisseur:"", numero_bl:"", temperature_ok:true, emballage_ok:true, quantites_ok:true, statut:"conforme", note:"" });
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!form.fournisseur.trim()) { toast("Fournisseur obligatoire","error"); return; }
    setSaving(true);
    const all_ok = form.temperature_ok && form.emballage_ok && form.quantites_ok;
    const { error } = await supabase.from("reception_controls").insert({ restaurant_id:restaurantId, saisi_par:profileId, date_reception:today(), ...form, statut: all_ok ? "conforme" : "non_conforme" });
    if (error) { saveErr(toast, error); setSaving(false); return; }
    toast("Réception enregistrée"); setModal(false);
    setForm({ fournisseur:"", numero_bl:"", temperature_ok:true, emballage_ok:true, quantites_ok:true, statut:"conforme", note:"" });
    await onRefresh(); setSaving(false);
  };


  return (
    <div>
      {modal && (
        <div style={{ position:"fixed", inset:0, background:"rgba(15,23,42,.5)", zIndex:200, display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}>
          <div style={{ background:C.surface, borderRadius:16, padding:24, maxWidth:420, width:"100%", boxShadow:"0 20px 50px rgba(0,0,0,.3)" }}>
            <h3 style={{ margin:"0 0 16px", fontSize:16, fontWeight:800 }}>Contrôle de réception</h3>
            <div style={{ display:"flex", flexDirection:"column", gap:12, marginBottom:16 }}>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
                <div><label style={{ fontSize:11, fontWeight:600, color:C.textSec, display:"block", marginBottom:4, textTransform:"uppercase", letterSpacing:".5px" }}>Fournisseur *</label>
                  <input value={form.fournisseur} onChange={e=>setForm(p=>({...p,fournisseur:e.target.value}))} placeholder="Ex : Metro" style={{ width:"100%", boxSizing:"border-box", padding:"9px 12px", borderRadius:8, border:`1px solid ${C.border}`, fontSize:16 }}/></div>
                <div><label style={{ fontSize:11, fontWeight:600, color:C.textSec, display:"block", marginBottom:4, textTransform:"uppercase", letterSpacing:".5px" }}>N° de BL</label>
                  <input value={form.numero_bl} onChange={e=>setForm(p=>({...p,numero_bl:e.target.value}))} placeholder="Ex: FC26-2200" style={{ width:"100%", boxSizing:"border-box", padding:"9px 12px", borderRadius:8, border:`1px solid ${C.border}`, fontSize:13 }}/></div>
              </div>
              <div><p style={{ margin:"0 0 10px", fontSize:12, fontWeight:700, color:C.textSec, textTransform:"uppercase", letterSpacing:".5px" }}>Points de contrôle</p>
                {[["temperature_ok","🌡️ Température conforme"],["emballage_ok","📦 Emballage intact"],["quantites_ok","📋 Quantités conformes au BL"]].map(([k,l])=>(
                  <div key={k} onClick={()=>setForm(p=>({...p,[k]:!p[k]}))}
                    role="checkbox" aria-checked={!!form[k]} tabIndex={0}
                    onKeyDown={checkboxKey(()=>setForm(p=>({...p,[k]:!p[k]})))}
                    style={{ padding:"10px 12px", borderRadius:10, border:`1.5px solid ${form[k]?C.success:C.danger}`, background:form[k]?C.successLight:C.dangerLight, cursor:"pointer", display:"flex", alignItems:"center", gap:10, marginBottom:6 }}>
                    <span style={{ width:22, height:22, borderRadius:6, border:`2px solid ${form[k]?C.success:C.danger}`, background:form[k]?C.success:C.danger, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                      <span style={{ color:"#fff", fontSize:12, fontWeight:800 }}>{form[k]?"✓":"✗"}</span>
                    </span>
                    <span style={{ fontSize:13, fontWeight:600, color:form[k]?C.success:C.danger }}>{l}</span>
                  </div>
                ))}
              </div>
              <div><label style={{ fontSize:11, fontWeight:600, color:C.textSec, display:"block", marginBottom:4, textTransform:"uppercase", letterSpacing:".5px" }}>Note</label>
                <textarea value={form.note} onChange={e=>setForm(p=>({...p,note:e.target.value}))} placeholder="Observations, anomalies..." rows={2}
                  style={{ width:"100%", boxSizing:"border-box", padding:"8px 12px", borderRadius:8, border:`1px solid ${C.border}`, fontSize:13, resize:"none" }}/></div>
            </div>
            <div style={{ display:"flex", gap:8 }}>
              <button onClick={save} disabled={saving||!form.fournisseur.trim()} style={{ flex:1, padding:12, background:C.brand, color:"#fff", border:"none", borderRadius:10, fontSize:14, fontWeight:700, cursor:"pointer" }}>{saving?"...":"Valider la réception"}</button>
              <button onClick={()=>setModal(false)} style={{ padding:"12px 14px", background:"transparent", border:`1px solid ${C.border}`, borderRadius:10, cursor:"pointer" }}>Annuler</button>
            </div>
          </div>
        </div>
      )}

      <div style={{ display:"flex", justifyContent:"flex-end", gap:8, marginBottom:14 }}>
        <button onClick={onExport} style={{ padding:"8px 12px", minHeight:44, background:C.bg, border:`1px solid ${C.border}`, borderRadius:8, fontSize:12, cursor:"pointer" }}>↓ Export</button>
        <button onClick={()=>setModal(true)} style={{ padding:"8px 16px", minHeight:44, background:C.brand, color:"#fff", border:"none", borderRadius:8, fontSize:13, fontWeight:700, cursor:"pointer" }}>+ Contrôle réception</button>
      </div>

      {receptions.length === 0 ? (
        <Card style={{ padding:40, textAlign:"center" }}>
          <p style={{ fontSize:28, margin:"0 0 8px" }}>✅</p>
          <p style={{ fontSize:14, fontWeight:700, margin:0 }}>Aucun contrôle enregistré</p>
        </Card>
      ) : (
        <Card style={{ overflow:"hidden" }}>
          {receptions.map((r, i) => (
            <div key={r.id} style={{ padding:"12px 16px", borderBottom:i<receptions.length-1?`1px solid ${C.border}`:"none", display:"flex", alignItems:"center", gap:10 }}>
              <div style={{ width:38, height:38, borderRadius:10, background:r.statut==="conforme"?C.successLight:C.dangerLight, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                <span style={{ fontSize:18 }}>{r.statut==="conforme"?"✅":"⚠️"}</span>
              </div>
              <div style={{ flex:1 }}>
                <p style={{ margin:0, fontSize:13, fontWeight:700 }}>{r.fournisseur}</p>
                <p style={{ margin:0, fontSize:11, color:C.textSec }}>
                  {fmt(r.date_reception)} {r.numero_bl?"· BL "+r.numero_bl:""}
                </p>
                {r.note && <p style={{ margin:"2px 0 0", fontSize:11, color:C.textMuted }}>{r.note}</p>}
              </div>
              <span style={{ fontSize:11, fontWeight:700, color:r.statut==="conforme"?C.success:C.danger, background:r.statut==="conforme"?C.successLight:C.dangerLight, padding:"3px 10px", borderRadius:10, flexShrink:0 }}>
                {STATUT_LABEL(r.statut)}
              </span>
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}

// ── HUILE ─────────────────────────────────────────────────────
function HuileTab({ oils, equipements, restaurantId, profileId, toast, onRefresh, onExport }) {
  // Friteuses déclarées dans Équipements + noms déjà présents dans l'historique ; à défaut, une seule « Friteuse »
  const declarees = (equipements || []).filter(e => e.type === "friteuse").map(e => e.nom);
  const connues = [...new Set([...declarees, ...oils.map(o => o.equipement).filter(Boolean)])];
  const FRITEUSES = connues.length ? connues : ["Friteuse"];
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ equipement:FRITEUSES[0], tpo:0, statut:"ok", note:"" });
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    const tpo = parseFloat(form.tpo) || 0;
    const prochain = new Date(); prochain.setDate(prochain.getDate() + 14);
    const { error } = await supabase.from("oil_changes").insert({ restaurant_id:restaurantId, saisi_par:profileId, date_changement:today(), prochain_changement:localDate(prochain), ...form, tpo, statut:tpo>25?"critique":tpo>20?"alerte":"ok" });
    if (error) { saveErr(toast, error); setSaving(false); return; }
    toast("Changement d'huile enregistré"); setModal(false);
    setForm({ equipement:FRITEUSES[0], tpo:0, statut:"ok", note:"" });
    await onRefresh(); setSaving(false);
  };

  const daysSince = d => {
    if (!d) return null;
    const n = -daysFromToday(String(d).slice(0, 10));
    return Number.isFinite(n) ? n : null;
  };

  return (
    <div>
      {modal && (
        <div style={{ position:"fixed", inset:0, background:"rgba(15,23,42,.5)", zIndex:200, display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}>
          <div style={{ background:C.surface, borderRadius:16, padding:24, maxWidth:380, width:"100%", boxShadow:"0 20px 50px rgba(0,0,0,.3)" }}>
            <h3 style={{ margin:"0 0 16px", fontSize:16, fontWeight:800 }}>Changement d'huile</h3>
            <div style={{ display:"flex", flexDirection:"column", gap:10, marginBottom:14 }}>
              <div><label style={{ fontSize:11, fontWeight:600, color:C.textSec, display:"block", marginBottom:4, textTransform:"uppercase", letterSpacing:".5px" }}>Équipement</label>
                <select value={form.equipement} onChange={e=>setForm(p=>({...p,equipement:e.target.value}))} style={{ width:"100%", padding:"9px 10px", borderRadius:8, border:`1px solid ${C.border}`, fontSize:13 }}>
                  {FRITEUSES.map(f=><option key={f} value={f}>{f}</option>)}
                </select></div>
              <div><label style={{ fontSize:11, fontWeight:600, color:C.textSec, display:"block", marginBottom:4, textTransform:"uppercase", letterSpacing:".5px" }}>TPO % (Teneur Produits Polaires)</label>
                <input type="number" value={form.tpo} onChange={e=>setForm(p=>({...p,tpo:e.target.value}))} placeholder="0–30%" min="0" max="30" step="0.1"
                  style={{ width:"100%", boxSizing:"border-box", padding:"9px 12px", borderRadius:8, border:`1px solid ${C.border}`, fontSize:13 }}/>
                <p style={{ margin:"4px 0 0", fontSize:11, color:C.textMuted }}>OK &lt;20% · Alerte 20–25% · Critique &gt;25%</p></div>
              <div><label style={{ fontSize:11, fontWeight:600, color:C.textSec, display:"block", marginBottom:4, textTransform:"uppercase", letterSpacing:".5px" }}>Note</label>
                <textarea value={form.note} onChange={e=>setForm(p=>({...p,note:e.target.value}))} rows={2} style={{ width:"100%", boxSizing:"border-box", padding:"8px 12px", borderRadius:8, border:`1px solid ${C.border}`, fontSize:13, resize:"none" }}/></div>
            </div>
            <div style={{ display:"flex", gap:8 }}>
              <button onClick={save} disabled={saving} style={{ flex:1, padding:12, background:C.brand, color:"#fff", border:"none", borderRadius:10, fontSize:14, fontWeight:700, cursor:"pointer" }}>{saving?"...":"Enregistrer"}</button>
              <button onClick={()=>setModal(false)} style={{ padding:"12px 14px", background:"transparent", border:`1px solid ${C.border}`, borderRadius:10, cursor:"pointer" }}>Annuler</button>
            </div>
          </div>
        </div>
      )}

      <div style={{ display:"flex", justifyContent:"flex-end", gap:8, marginBottom:14 }}>
        <button onClick={onExport} style={{ padding:"8px 12px", minHeight:44, background:C.bg, border:`1px solid ${C.border}`, borderRadius:8, fontSize:12, cursor:"pointer" }}>↓ Export</button>
        <button onClick={()=>{ setForm(p => ({ ...p, equipement: FRITEUSES.includes(p.equipement) ? p.equipement : FRITEUSES[0] })); setModal(true); }} style={{ padding:"8px 16px", minHeight:44, background:C.brand, color:"#fff", border:"none", borderRadius:8, fontSize:13, fontWeight:700, cursor:"pointer" }}>+ Changement d'huile</button>
      </div>

      {FRITEUSES.map(f => {
        const last = oils.find(o => o.equipement === f);
        const days = last ? daysSince(last.date_changement) : null;
        const alert = days !== null && days > 10;
        return (
          <Card key={f} style={{ padding:"16px", marginBottom:12, display:"flex", alignItems:"center", gap:14 }}>
            <div style={{ width:48, height:48, borderRadius:14, background:alert?"#FFF7ED":"#F0FDF4", display:"flex", alignItems:"center", justifyContent:"center", fontSize:24, flexShrink:0 }}>🛢️</div>
            <div style={{ flex:1 }}>
              <p style={{ margin:0, fontSize:15, fontWeight:700 }}>{f}</p>
              {last ? <>
                <p style={{ margin:"2px 0 0", fontSize:12, color:C.textSec }}>Dernier changement : {fmt(last.date_changement)} ({days !== null ? `${days} jours` : "—"})</p>
                {last.tpo > 0 && <p style={{ margin:0, fontSize:11, color:last.statut==="critique"?C.danger:last.statut==="alerte"?C.warning:C.success }}>TPO : {last.tpo}%</p>}
              </> : <p style={{ margin:0, fontSize:12, color:C.textMuted }}>Aucun relevé</p>}
            </div>
            {alert && <span style={{ fontSize:11, fontWeight:700, color:C.warning, background:C.warningLight, padding:"3px 10px", borderRadius:10 }}>À changer</span>}
            {!alert && last && <span style={{ fontSize:11, fontWeight:700, color:C.success, background:C.successLight, padding:"3px 10px", borderRadius:10 }}>OK</span>}
          </Card>
        );
      })}

      {oils.length > 0 && (
        <Card style={{ overflow:"hidden", marginTop:16 }}>
          <div style={{ padding:"10px 16px", borderBottom:`1px solid ${C.border}`, background:"#F8FAFC" }}>
            <p style={{ margin:0, fontSize:11, fontWeight:700, color:C.textSec, textTransform:"uppercase", letterSpacing:".5px" }}>Historique</p>
          </div>
          {oils.map((o, i) => (
            <div key={o.id} style={{ padding:"10px 16px", borderBottom:i<oils.length-1?`1px solid ${C.border}`:"none", display:"flex", gap:12 }}>
              <div style={{ flex:1 }}><p style={{ margin:0, fontSize:13, fontWeight:600 }}>{o.equipement}</p><p style={{ margin:0, fontSize:11, color:C.textSec }}>{fmt(o.date_changement)}</p></div>
              {o.tpo > 0 && <span style={{ fontSize:12, fontWeight:700, color:o.statut==="critique"?C.danger:o.statut==="alerte"?C.warning:C.success }}>TPO {o.tpo}%</span>}
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}
