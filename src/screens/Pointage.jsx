// ═══════════════════════════════════════════════════════════════
//  PILLOT — Module Pointage (badgeuse + récap hebdo)
//  Fichier : src/screens/Pointage.jsx
//  Import dans App.jsx : import Pointage from "./screens/Pointage"
//  Table : pointages (voir supabase/migrations) — saisi_par = auth.uid() par défaut
// ═══════════════════════════════════════════════════════════════

import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabase";
import { localDate } from "../lib/dates";

const C = {
  brand:"#2563EB",brandLight:"#EFF6FF",navy:"#0F172A",
  success:"#16A34A",successLight:"#F0FDF4",
  warning:"#D97706",warningLight:"#FFFBEB",
  danger:"#DC2626",dangerLight:"#FEF2F2",
  border:"#E2E8F0",surface:"#FFFFFF",bg:"#F1F5F9",
  text:"#0F172A",textSec:"#64748B",textMuted:"#94A3B8"
};
const JOURS = ["Lun","Mar","Mer","Jeu","Ven","Sam","Dim"];
const lbl = {fontSize:11,fontWeight:600,color:C.textSec,display:"block",marginBottom:4,textTransform:"uppercase",letterSpacing:".5px"};
const inp = {width:"100%",boxSizing:"border-box",padding:"10px",borderRadius:8,border:`1px solid ${C.border}`,fontSize:16,background:C.surface,color:C.text};
const overlay = {position:"fixed",inset:0,background:"rgba(15,23,42,.5)",zIndex:200,display:"flex",alignItems:"center",justifyContent:"center",padding:16};
const modalBox = {background:C.surface,borderRadius:16,padding:20,width:"100%",maxWidth:380,maxHeight:"90vh",overflowY:"auto",boxSizing:"border-box",boxShadow:"0 20px 50px rgba(0,0,0,.3)"};

// ── Helpers ─────────────────────────────────────────────────
const pad = n => String(n).padStart(2, "0");
const fmtTime = iso => new Date(iso).toLocaleTimeString("fr-FR", { hour:"2-digit", minute:"2-digit" });
const fmtDay = d => d.toLocaleDateString("fr-FR", { weekday:"short", day:"numeric", month:"short" });
const startOfDay = (d = new Date()) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const dureeH = p => p.fin ? Math.max(0, (new Date(p.fin) - new Date(p.debut)) / 3600000) : 0;
const fmtH = h => { const m = Math.round(h * 60); return `${Math.floor(m / 60)}h${pad(m % 60)}`; };
const empName = e => e ? `${e.prenom || ""} ${e.nom || ""}`.trim() : "Employé supprimé";
// ISO -> valeur "YYYY-MM-DDTHH:MM" d'un input datetime-local (heure locale)
const toInput = iso => { if (!iso) return ""; const d = new Date(iso); return `${localDate(d)}T${pad(d.getHours())}:${pad(d.getMinutes())}`; };
// new Date("YYYY-MM-DDTHH:MM") (sans Z) est interprété en heure locale
const fromInput = v => v ? new Date(v).toISOString() : null;
const isMissingTable = err => !!err && (err.code === "42P01" || err.code === "PGRST205" || /pointages/i.test(err.message || ""));

function getWeekDays(offset = 0) {
  const now = new Date();
  const day = now.getDay();
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (day === 0 ? 6 : day - 1) + offset * 7);
  return Array.from({ length: 7 }, (_, i) => new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i));
}

function csvCell(v) {
  const s = v == null ? "" : String(v);
  return /[;"\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

// ── Composant ───────────────────────────────────────────────
export default function Pointage({ restaurantId, toast, canManage = false }) {
  const [vue, setVue] = useState("jour");
  const [employees, setEmployees] = useState([]);
  const [missing, setMissing] = useState(false);
  const [, setTick] = useState(0);
  const onMissing = useCallback(() => setMissing(true), []);

  const loadEmployees = useCallback(async () => {
    if (!restaurantId) return;
    // Le manager charge aussi les inactifs (pointages passés) ; heures_contrat via "*" si la colonne existe
    let q = supabase.from("employees").select(canManage ? "*" : "id,nom,prenom,actif").eq("restaurant_id", restaurantId);
    if (!canManage) q = q.eq("actif", true);
    const { data, error } = await q.order("nom");
    if (error) { toast("Erreur de chargement des employés", "error"); return; }
    setEmployees(data || []);
  }, [restaurantId, canManage, toast]);

  useEffect(() => { loadEmployees(); }, [loadEmployees]);
  // Rafraîchit l'affichage des durées "présent depuis" chaque minute
  useEffect(() => { const t = setInterval(() => setTick(x => x + 1), 60000); return () => clearInterval(t); }, []);

  if (!restaurantId) return <div style={{padding:40,textAlign:"center",color:C.textMuted}}>Aucun restaurant sélectionné</div>;

  const tabBtn = (id, label) => (
    <button key={id} onClick={() => setVue(id)} aria-pressed={vue===id}
      style={{flex:1,minHeight:40,padding:"8px 12px",borderRadius:8,border:"none",cursor:"pointer",fontSize:14,fontWeight:700,background:vue===id?C.surface:"transparent",color:vue===id?C.text:C.textSec,boxShadow:vue===id?"0 1px 3px rgba(0,0,0,.1)":"none"}}>{label}</button>
  );

  return (
    <div style={{maxWidth:900,margin:"0 auto"}}>
      <div style={{marginBottom:14,display:"flex",alignItems:"center",justifyContent:"space-between",gap:10,flexWrap:"wrap"}}>
        <h1 style={{margin:0,fontSize:22,fontWeight:800,letterSpacing:"-.5px"}}>Pointage</h1>
        <span style={{fontSize:13,color:C.textSec}}>{new Date().toLocaleDateString("fr-FR",{weekday:"long",day:"numeric",month:"long"})} · {new Date().toLocaleTimeString("fr-FR",{hour:"2-digit",minute:"2-digit"})}</span>
      </div>
      {missing ? (
        <div role="alert" style={{padding:"14px 16px",borderRadius:12,background:C.warningLight,border:`1px solid ${C.warning}55`,color:"#92400E",fontSize:14,fontWeight:600}}>
          Pointage pas encore activé : appliquer la migration SQL (supabase/migrations)
        </div>
      ) : (
        <>
          {canManage && <div style={{display:"flex",gap:4,padding:4,background:C.bg,borderRadius:10,marginBottom:14}}>{tabBtn("jour","Aujourd'hui")}{tabBtn("semaine","Semaine")}</div>}
          {vue === "semaine" && canManage
            ? <Semaine restaurantId={restaurantId} toast={toast} employees={employees} onMissing={onMissing}/>
            : <Jour restaurantId={restaurantId} toast={toast} employees={employees.filter(e => e.actif !== false)} onMissing={onMissing}/>}
        </>
      )}
    </div>
  );
}

// ── Vue Aujourd'hui (badgeuse) ──────────────────────────────
function Jour({ restaurantId, toast, employees, onMissing }) {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]); // pointages ouverts + pointages du jour
  const [busy, setBusy] = useState(null); // employee_id en cours
  const [oubli, setOubli] = useState(null); // {p, fin}

  const load = useCallback(async () => {
    const since = startOfDay().toISOString();
    const { data, error } = await supabase.from("pointages").select("*").eq("restaurant_id", restaurantId)
      .or(`fin.is.null,debut.gte.${since}`).order("debut");
    setLoading(false);
    if (error) { if (isMissingTable(error)) onMissing(); else toast("Erreur de chargement des pointages", "error"); return; }
    setRows(data || []);
  }, [restaurantId, toast, onMissing]);

  useEffect(() => { load(); }, [load]);
  // Tablette partagée : resynchronise toutes les minutes et au retour au premier plan
  useEffect(() => {
    const t = setInterval(load, 60000);
    const onVis = () => { if (document.visibilityState === "visible") load(); };
    document.addEventListener("visibilitychange", onVis);
    return () => { clearInterval(t); document.removeEventListener("visibilitychange", onVis); };
  }, [load]);

  const arrivee = async emp => {
    setBusy(emp.id);
    const { data, error } = await supabase.from("pointages").insert({ restaurant_id: restaurantId, employee_id: emp.id, debut: new Date().toISOString() }).select().single();
    setBusy(null);
    if (error) { toast("Erreur : l'arrivée n'a pas été enregistrée", "error"); return; }
    setRows(r => [...r, data]);
    toast(`Arrivée de ${emp.prenom || emp.nom} à ${fmtTime(data.debut)}`);
  };

  const depart = async (emp, p) => {
    setBusy(emp.id);
    const { data, error } = await supabase.from("pointages").update({ fin: new Date().toISOString() })
      .eq("id", p.id).eq("restaurant_id", restaurantId).is("fin", null).select();
    setBusy(null);
    if (error) { toast("Erreur : le départ n'a pas été enregistré", "error"); return; }
    if (!data || data.length === 0) { toast("Ce pointage a déjà été fermé ailleurs", "error"); load(); return; }
    setRows(r => r.map(x => x.id === p.id ? data[0] : x));
    toast(`Départ de ${emp.prenom || emp.nom} à ${fmtTime(data[0].fin)} (${fmtH(dureeH(data[0]))})`);
  };

  const fermerOubli = async () => {
    const { p, fin } = oubli;
    const finIso = fromInput(fin);
    if (!finIso || new Date(finIso) <= new Date(p.debut)) { toast("L'heure de départ doit être après l'arrivée", "error"); return; }
    if (new Date(finIso) > new Date()) { toast("L'heure de départ ne peut pas être dans le futur", "error"); return; }
    setBusy(p.employee_id);
    const note = [p.note, "Oubli de départ corrigé"].filter(Boolean).join(" · ");
    const { data, error } = await supabase.from("pointages").update({ fin: finIso, note })
      .eq("id", p.id).eq("restaurant_id", restaurantId).is("fin", null).select();
    setBusy(null);
    if (error) { toast("Erreur : le pointage n'a pas été fermé", "error"); return; }
    if (!data || data.length === 0) { toast("Ce pointage a déjà été fermé ailleurs", "error"); setOubli(null); load(); return; }
    setRows(r => r.map(x => x.id === p.id ? data[0] : x));
    setOubli(null);
    toast("Départ oublié enregistré");
  };

  if (loading) return <div style={{padding:40,textAlign:"center",color:C.textMuted}}>Chargement du pointage...</div>;
  if (employees.length === 0) return <div style={{padding:30,textAlign:"center",color:C.textSec,fontSize:14,background:C.surface,borderRadius:12,border:`1px solid ${C.border}`}}>Aucun employé actif. Ajoutez-les dans l'onglet Planning.</div>;

  const today0 = startOfDay();
  const presents = employees.filter(e => rows.some(p => p.employee_id === e.id && !p.fin && new Date(p.debut) >= today0)).length;

  return (
    <div>
      {oubli && (
        <div style={overlay}>
          <div style={modalBox}>
            <p style={{margin:"0 0 4px",fontSize:16,fontWeight:800}}>Oubli de départ</p>
            <p style={{margin:"0 0 14px",fontSize:13,color:C.textSec}}>{empName(oubli.emp)} · arrivée le {fmtDay(new Date(oubli.p.debut))} à {fmtTime(oubli.p.debut)}</p>
            <label style={lbl} htmlFor="oubli-fin">Heure de départ réelle</label>
            <input id="oubli-fin" type="datetime-local" value={oubli.fin} min={toInput(oubli.p.debut)} max={toInput(new Date().toISOString())}
              onChange={e => setOubli(o => ({ ...o, fin: e.target.value }))} style={{...inp,marginBottom:14}}/>
            <div style={{display:"flex",gap:8}}>
              <button onClick={fermerOubli} disabled={busy === oubli.p.employee_id}
                style={{flex:1,minHeight:44,borderRadius:8,border:"none",background:C.brand,color:"#fff",fontSize:14,fontWeight:700,cursor:"pointer",opacity:busy===oubli.p.employee_id?.6:1}}>
                {busy === oubli.p.employee_id ? "..." : "Enregistrer"}</button>
              <button onClick={() => setOubli(null)} style={{minHeight:44,padding:"0 14px",borderRadius:8,border:`1px solid ${C.border}`,background:"transparent",cursor:"pointer",fontSize:14}}>Annuler</button>
            </div>
          </div>
        </div>
      )}

      <p style={{margin:"0 0 10px",fontSize:13,color:C.textSec}}><strong style={{color:C.text}}>{presents}</strong> présent{presents > 1 ? "s" : ""} sur {employees.length}</p>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))",gap:10}}>
        {employees.map(emp => {
          const mine = rows.filter(p => p.employee_id === emp.id);
          const open = mine.filter(p => !p.fin).sort((a, b) => new Date(b.debut) - new Date(a.debut));
          const stale = open.find(p => new Date(p.debut) < today0); // pointage ouvert d'un jour précédent
          const current = open.find(p => new Date(p.debut) >= today0);
          const doneToday = mine.filter(p => p.fin && new Date(p.debut) >= today0);
          const totalToday = doneToday.reduce((a, p) => a + dureeH(p), 0) + (current ? (Date.now() - new Date(current.debut)) / 3600000 : 0);
          const isBusy = busy === emp.id;
          const present = !!current;
          return (
            <div key={emp.id} style={{background:C.surface,borderRadius:12,border:`1px solid ${stale?C.warning:present?C.success+"66":C.border}`,padding:14,display:"flex",flexDirection:"column",gap:10}}>
              <div style={{display:"flex",alignItems:"center",gap:10}}>
                <span aria-hidden style={{width:10,height:10,borderRadius:"50%",background:present?C.success:C.textMuted,flexShrink:0}}/>
                <div style={{flex:1,minWidth:0}}>
                  <p style={{margin:0,fontSize:16,fontWeight:800,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{empName(emp)}</p>
                  <p style={{margin:0,fontSize:13,color:present?C.success:C.textSec,fontWeight:600}}>
                    {present ? `Présent depuis ${fmtTime(current.debut)}` : "Absent"}
                    {totalToday > 0 && <span style={{color:C.textSec,fontWeight:500}}> · {fmtH(totalToday)} aujourd'hui</span>}
                  </p>
                </div>
              </div>
              {doneToday.length > 0 && (
                <p style={{margin:0,fontSize:12,color:C.textSec}}>{doneToday.map(p => `${fmtTime(p.debut)}–${fmtTime(p.fin)}`).join(" · ")}</p>
              )}
              {stale && (
                <div style={{padding:"8px 10px",borderRadius:8,background:C.warningLight,display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
                  <span style={{flex:1,minWidth:140,fontSize:12,fontWeight:600,color:"#92400E"}}>Oubli de départ : arrivée {fmtDay(new Date(stale.debut))} à {fmtTime(stale.debut)}</span>
                  <button onClick={() => setOubli({ emp, p: stale, fin: toInput(stale.debut) })} disabled={isBusy}
                    style={{minHeight:36,padding:"4px 12px",borderRadius:8,border:`1px solid ${C.warning}`,background:C.surface,color:"#92400E",fontSize:13,fontWeight:700,cursor:"pointer"}}>Fermer</button>
                </div>
              )}
              <button onClick={() => present ? depart(emp, current) : arrivee(emp)} disabled={isBusy}
                style={{minHeight:56,borderRadius:10,border:"none",fontSize:18,fontWeight:800,color:"#fff",background:present?C.danger:C.success,cursor:isBusy?"wait":"pointer",opacity:isBusy?.6:1}}>
                {isBusy ? "..." : present ? "Départ" : "Arrivée"}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Vue Semaine (manager) ───────────────────────────────────
function Semaine({ restaurantId, toast, employees, onMissing }) {
  const [week, setWeek] = useState(0);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cell, setCell] = useState(null); // {emp, day}
  const [edit, setEdit] = useState(null); // {id|null, debut, fin}
  const [saving, setSaving] = useState(false);
  const [pendingDel, setPendingDel] = useState(null);

  const days = getWeekDays(week);
  const from = days[0];
  const to = new Date(days[6].getFullYear(), days[6].getMonth(), days[6].getDate() + 1);
  const fromIso = from.toISOString(), toIso = to.toISOString();

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.from("pointages").select("*").eq("restaurant_id", restaurantId)
      .gte("debut", fromIso).lt("debut", toIso).order("debut");
    setLoading(false);
    if (error) { if (isMissingTable(error)) onMissing(); else toast("Erreur de chargement des pointages", "error"); return; }
    setRows(data || []);
  }, [restaurantId, fromIso, toIso, toast, onMissing]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPendingDel(null); }, [cell, edit]);
  useEffect(() => {
    if (pendingDel === null) return;
    const t = setTimeout(() => setPendingDel(null), 4000);
    return () => clearTimeout(t);
  }, [pendingDel]);

  const hasContrat = employees.some(e => Object.prototype.hasOwnProperty.call(e, "heures_contrat"));
  const empById = Object.fromEntries(employees.map(e => [e.id, e]));
  // Actifs + tout employé (même retiré) ayant pointé cette semaine
  const shown = employees.filter(e => e.actif !== false || rows.some(p => p.employee_id === e.id));
  const orphans = [...new Set(rows.map(p => p.employee_id).filter(id => !empById[id]))];
  const lines = [...shown, ...orphans.map(id => ({ id, nom: "Employé inconnu", prenom: "" }))];

  const dayIdx = p => { const d = startOfDay(new Date(p.debut)); return Math.round((d - from) / 86400000); };
  const cellRows = (empId, di) => rows.filter(p => p.employee_id === empId && dayIdx(p) === di);
  const openCount = rows.filter(p => !p.fin).length;

  const weekLabel = `${days[0].toLocaleDateString("fr-FR",{day:"numeric",month:"short"})} – ${days[6].toLocaleDateString("fr-FR",{day:"numeric",month:"short",year:"numeric"})}`;

  const save = async () => {
    const debut = fromInput(edit.debut), fin = fromInput(edit.fin);
    if (!debut) { toast("Heure d'arrivée obligatoire", "error"); return; }
    if (fin && new Date(fin) <= new Date(debut)) { toast("Le départ doit être après l'arrivée", "error"); return; }
    if (fin && new Date(fin) - new Date(debut) > 24 * 3600000) { toast("Durée supérieure à 24 h : vérifiez les dates", "error"); return; }
    setSaving(true);
    const { error } = edit.id
      ? await supabase.from("pointages").update({ debut, fin }).eq("id", edit.id).eq("restaurant_id", restaurantId)
      : await supabase.from("pointages").insert({ restaurant_id: restaurantId, employee_id: cell.emp.id, debut, fin, note: "Saisie manuelle" });
    setSaving(false);
    if (error) { toast("Erreur : le pointage n'a pas été enregistré", "error"); return; }
    toast(edit.id ? "Pointage corrigé" : "Pointage ajouté");
    setEdit(null);
    load();
  };

  const remove = async id => {
    setPendingDel(null);
    const { error } = await supabase.from("pointages").delete().eq("id", id).eq("restaurant_id", restaurantId);
    if (error) { toast("Erreur : le pointage n'a pas été supprimé", "error"); return; }
    setRows(r => r.filter(p => p.id !== id));
    toast("Pointage supprimé");
  };

  const exportCsv = () => {
    const nameOf = id => empName(empById[id]);
    const sorted = [...rows].sort((a, b) => nameOf(a.employee_id).localeCompare(nameOf(b.employee_id), "fr") || new Date(a.debut) - new Date(b.debut));
    const out = [["Employé", "Date", "Arrivée", "Départ", "Durée (h)"]];
    sorted.forEach(p => out.push([
      nameOf(p.employee_id),
      new Date(p.debut).toLocaleDateString("fr-FR"),
      fmtTime(p.debut),
      p.fin ? fmtTime(p.fin) : "",
      p.fin ? dureeH(p).toFixed(2).replace(".", ",") : "",
    ]));
    const csv = "﻿" + out.map(r => r.map(csvCell).join(";")).join("\r\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url; a.download = `pointage_${localDate(days[0])}.csv`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const navBtn = {minWidth:40,minHeight:40,borderRadius:8,border:`1px solid ${C.border}`,background:C.surface,cursor:"pointer",fontSize:16,fontWeight:700,color:C.text};
  const cellList = cell ? cellRows(cell.emp.id, cell.di) : [];

  return (
    <div>
      {cell && (
        <div style={overlay}>
          <div style={modalBox}>
            <p style={{margin:"0 0 2px",fontSize:16,fontWeight:800}}>{empName(cell.emp)}</p>
            <p style={{margin:"0 0 14px",fontSize:13,color:C.textSec}}>{days[cell.di].toLocaleDateString("fr-FR",{weekday:"long",day:"numeric",month:"long"})}</p>
            {edit ? (
              <div>
                <label style={lbl} htmlFor="pt-debut">Arrivée</label>
                <input id="pt-debut" type="datetime-local" value={edit.debut} onChange={e => setEdit(x => ({ ...x, debut: e.target.value }))} style={{...inp,marginBottom:10}}/>
                <label style={lbl} htmlFor="pt-fin">Départ (vide = toujours présent)</label>
                <input id="pt-fin" type="datetime-local" value={edit.fin} min={edit.debut || undefined} onChange={e => setEdit(x => ({ ...x, fin: e.target.value }))} style={{...inp,marginBottom:14}}/>
                <div style={{display:"flex",gap:8}}>
                  <button onClick={save} disabled={saving} style={{flex:1,minHeight:44,borderRadius:8,border:"none",background:C.brand,color:"#fff",fontSize:14,fontWeight:700,cursor:"pointer",opacity:saving?.6:1}}>{saving ? "..." : "Enregistrer"}</button>
                  <button onClick={() => setEdit(null)} style={{minHeight:44,padding:"0 14px",borderRadius:8,border:`1px solid ${C.border}`,background:"transparent",cursor:"pointer",fontSize:14}}>Retour</button>
                </div>
              </div>
            ) : (
              <>
                <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:12}}>
                  {cellList.length === 0 && <p style={{margin:0,fontSize:13,color:C.textSec}}>Aucun pointage ce jour.</p>}
                  {cellList.map(p => (
                    <div key={p.id} style={{padding:"8px 10px",borderRadius:10,border:`1px solid ${p.fin?C.border:C.warning}`,background:p.fin?C.surface:C.warningLight,display:"flex",alignItems:"center",gap:8}}>
                      <div style={{flex:1,minWidth:0}}>
                        <p style={{margin:0,fontSize:14,fontWeight:700}}>{fmtTime(p.debut)} – {p.fin ? fmtTime(p.fin) : "ouvert"}</p>
                        <p style={{margin:0,fontSize:11,color:C.textSec}}>
                          {p.fin ? fmtH(dureeH(p)) : "Non compté (pas de départ)"}
                          {p.fin && startOfDay(new Date(p.fin)) > startOfDay(new Date(p.debut)) ? ` · départ le ${fmtDay(new Date(p.fin))}` : ""}
                          {p.note ? ` · ${p.note}` : ""}
                        </p>
                      </div>
                      <button onClick={() => setEdit({ id: p.id, debut: toInput(p.debut), fin: toInput(p.fin) })}
                        style={{minHeight:36,padding:"4px 10px",borderRadius:8,border:`1px solid ${C.border}`,background:C.surface,color:C.text,fontSize:12,fontWeight:700,cursor:"pointer"}}>Corriger</button>
                      <button onClick={() => pendingDel === p.id ? remove(p.id) : setPendingDel(p.id)}
                        aria-label={pendingDel === p.id ? "Confirmer la suppression du pointage" : "Supprimer le pointage"}
                        style={{minHeight:36,padding:"4px 10px",borderRadius:8,border:`1px solid ${pendingDel===p.id?C.danger:C.border}`,background:pendingDel===p.id?C.dangerLight:C.surface,color:pendingDel===p.id?C.danger:C.textSec,fontSize:12,fontWeight:700,cursor:"pointer"}}>
                        {pendingDel === p.id ? "Supprimer ?" : "Suppr."}</button>
                    </div>
                  ))}
                </div>
                <div style={{display:"flex",gap:8}}>
                  <button onClick={() => { const d = localDate(days[cell.di]); setEdit({ id: null, debut: `${d}T09:00`, fin: `${d}T17:00` }); }}
                    style={{flex:1,minHeight:44,borderRadius:8,border:`1px solid ${C.brand}`,background:C.brandLight,color:C.brand,fontSize:14,fontWeight:700,cursor:"pointer"}}>+ Ajouter</button>
                  <button onClick={() => setCell(null)} style={{minHeight:44,padding:"0 14px",borderRadius:8,border:`1px solid ${C.border}`,background:"transparent",cursor:"pointer",fontSize:14}}>Fermer</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10,flexWrap:"wrap"}}>
        <button onClick={() => setWeek(w => w - 1)} aria-label="Semaine précédente" style={navBtn}>‹</button>
        <button onClick={() => setWeek(0)} disabled={week === 0} style={{...navBtn,padding:"0 10px",fontSize:13,opacity:week===0?.5:1}}>Cette semaine</button>
        <button onClick={() => setWeek(w => w + 1)} aria-label="Semaine suivante" style={navBtn}>›</button>
        <span style={{flex:1,minWidth:150,fontSize:14,fontWeight:700}}>{weekLabel}</span>
        <button onClick={exportCsv} disabled={rows.length === 0}
          style={{minHeight:40,padding:"0 14px",borderRadius:8,border:"none",background:C.navy,color:"#fff",fontSize:13,fontWeight:700,cursor:rows.length?"pointer":"not-allowed",opacity:rows.length?1:.5}}>Export CSV</button>
      </div>

      {openCount > 0 && (
        <div style={{marginBottom:10,padding:"8px 12px",borderRadius:8,background:C.warningLight,color:"#92400E",fontSize:12,fontWeight:600}}>
          {openCount} pointage{openCount > 1 ? "s" : ""} sans départ, non compté{openCount > 1 ? "s" : ""} dans les totaux.
        </div>
      )}

      {loading ? <div style={{padding:40,textAlign:"center",color:C.textMuted}}>Chargement...</div> : lines.length === 0 ? (
        <div style={{padding:30,textAlign:"center",color:C.textSec,fontSize:14,background:C.surface,borderRadius:12,border:`1px solid ${C.border}`}}>Aucun employé.</div>
      ) : (
        <div style={{background:C.surface,borderRadius:12,border:`1px solid ${C.border}`,overflowX:"auto",WebkitOverflowScrolling:"touch"}}>
          <div style={{display:"grid",gridTemplateColumns:"110px repeat(7,minmax(52px,1fr)) 76px",minWidth:690,borderBottom:`1px solid ${C.border}`,background:C.bg}}>
            <div style={{padding:"8px 10px",fontSize:11,fontWeight:700,color:C.textSec,position:"sticky",left:0,background:C.bg,zIndex:1}}>Employé</div>
            {days.map((d, i) => {
              const isToday = localDate(d) === localDate();
              return <div key={i} style={{padding:"8px 4px",textAlign:"center",fontSize:11,fontWeight:700,color:isToday?C.brand:C.textSec}}>{JOURS[i]} {d.getDate()}</div>;
            })}
            <div style={{padding:"8px 6px",textAlign:"right",fontSize:11,fontWeight:700,color:C.textSec}}>Total</div>
          </div>
          {lines.map(emp => {
            const mine = rows.filter(p => p.employee_id === emp.id);
            const total = mine.reduce((a, p) => a + dureeH(p), 0);
            const contrat = hasContrat && emp.heures_contrat != null ? Number(emp.heures_contrat) : null;
            const ecart = contrat != null ? total - contrat : null;
            return (
              <div key={emp.id} style={{display:"grid",gridTemplateColumns:"110px repeat(7,minmax(52px,1fr)) 76px",minWidth:690,borderBottom:`1px solid ${C.border}`}}>
                <div style={{padding:"8px 10px",position:"sticky",left:0,background:C.surface,zIndex:1,borderRight:`1px solid ${C.border}`,minWidth:0}}>
                  <p style={{margin:0,fontSize:13,fontWeight:700,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{empName(emp)}</p>
                  {emp.actif === false && <p style={{margin:0,fontSize:10,color:C.textMuted}}>retiré</p>}
                </div>
                {days.map((d, di) => {
                  const list = cellRows(emp.id, di);
                  const h = list.reduce((a, p) => a + dureeH(p), 0);
                  const hasOpen = list.some(p => !p.fin);
                  return (
                    <button key={di} onClick={() => empById[emp.id] && setCell({ emp, di })} disabled={!empById[emp.id]}
                      aria-label={`${empName(emp)}, ${JOURS[di]} ${d.getDate()} : ${h > 0 ? fmtH(h) : "aucune heure"}${hasOpen ? ", pointage ouvert" : ""}`}
                      style={{padding:"6px 2px",minHeight:48,border:"none",borderRight:`1px solid ${C.border}`,background:hasOpen?C.warningLight:"transparent",cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:2,color:C.text}}>
                      <span style={{fontSize:13,fontWeight:h>0?700:400,color:h>0?C.text:C.border}}>{h > 0 ? fmtH(h) : "–"}</span>
                      {hasOpen && <span style={{fontSize:9,fontWeight:700,color:C.warning}}>ouvert</span>}
                    </button>
                  );
                })}
                <div style={{padding:"6px 6px",textAlign:"right",display:"flex",flexDirection:"column",justifyContent:"center"}}>
                  <span style={{fontSize:13,fontWeight:800}}>{fmtH(total)}</span>
                  {contrat != null && (
                    <span style={{fontSize:10,fontWeight:600,color:ecart > 0.01 ? C.warning : ecart < -1 ? C.danger : C.success}}>
                      {ecart >= 0 ? "+" : "−"}{fmtH(Math.abs(ecart))} / {contrat}h
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
      <p style={{margin:"8px 0 0",fontSize:11,color:C.textMuted}}>Touchez une case pour corriger, ajouter ou supprimer un pointage. Les heures sont rattachées au jour d'arrivée.</p>
    </div>
  );
}
