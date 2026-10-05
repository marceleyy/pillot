// ═══════════════════════════════════════════════════════════════
//  PILLOT — Module Planning + Tâches
//  Fichier : src/screens/Planning.jsx
//  Ajouter l'import dans App.jsx : import Planning from "./screens/Planning"
// ═══════════════════════════════════════════════════════════════

import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { localDate } from "../lib/dates";

const C = {
  brand:"#2563EB",brandLight:"#EFF6FF",navy:"#0F172A",
  success:"#16A34A",successLight:"#F0FDF4",
  warning:"#D97706",warningLight:"#FFFBEB",
  danger:"#DC2626",dangerLight:"#FEF2F2",
  purple:"#7C3AED",purpleLight:"#F5F3FF",
  border:"#E2E8F0",surface:"#FFFFFF",bg:"#F1F5F9",
  text:"#0F172A",textSec:"#64748B",textMuted:"#94A3B8"
};

const JOURS = ["Lun","Mar","Mer","Jeu","Ven","Sam","Dim"];
const TYPE_COULEURS = ["#2563EB","#16A34A","#D97706","#DC2626","#7C3AED","#0891B2"];
const EMPTY_TYPE = { nom:"", heure_debut:"", heure_fin:"", couleur:TYPE_COULEURS[0] };

const JOURS_FULL = ["Lundi","Mardi","Mercredi","Jeudi","Vendredi","Samedi","Dimanche"];

function getWeekDates(weekOffset = 0) {
  const now = new Date();
  const day = now.getDay(); // 0 = dim
  const monday = new Date(now);
  monday.setDate(now.getDate() - (day === 0 ? 6 : day - 1) + weekOffset * 7);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
}

function timeToMin(t) {
  const [h, m] = (t||"00:00").split(":").map(Number);
  return h * 60 + m;
}

function calcDureeH(debut, fin) {
  let d = timeToMin(fin) - timeToMin(debut);
  if (d < 0) d += 24 * 60;
  return (d / 60).toFixed(1);
}

function calcHeures(shifts) {
  return shifts.filter(s => !s.repos).reduce((a, s) => a + (timeToMin(s.heure_fin) - timeToMin(s.heure_debut) + (timeToMin(s.heure_fin) < timeToMin(s.heure_debut) ? 1440 : 0)) / 60, 0);
}

// ── PLANNING ─────────────────────────────────────────────────
export function Planning({ restaurantId, toast, canManage = true }) {
  const [week, setWeek] = useState(0);
  const [employees, setEmployees] = useState([]);
  const [shiftTypes, setShiftTypes] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null); // {empId, date}
  const [addEmp, setAddEmp] = useState(false);
  const [newEmp, setNewEmp] = useState({ nom:"", prenom:"", heures_contrat:35, salaire_horaire:11.65 });
  const [saving, setSaving] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(null); // id du créneau à confirmer
  const [typesModal, setTypesModal] = useState(false);
  const [newType, setNewType] = useState(EMPTY_TYPE);
  const [savingType, setSavingType] = useState(false);
  const [pendingTypeDelete, setPendingTypeDelete] = useState(null); // id du type de poste à confirmer
  const published = shifts.length > 0 && shifts.every(s => s.published);

  const days = getWeekDates(week);
  const weekLabel = days[0].getMonth() === days[6].getMonth()
    ? `${days[0].getDate()} – ${days[6].getDate()} ${days[6].toLocaleDateString("fr-FR",{month:"long",year:"numeric"})}`
    : `${days[0].toLocaleDateString("fr-FR",{day:"numeric",month:"short"})} – ${days[6].toLocaleDateString("fr-FR",{day:"numeric",month:"short",year:"numeric"})}`;

  useEffect(() => {
    loadAll();
  }, [restaurantId, week]);

  // Confirmation de suppression désarmée au changement de semaine, à l'ouverture de la modale, et après 4 s
  useEffect(() => { setPendingDelete(null); }, [week, modal]);
  useEffect(() => {
    if (pendingDelete === null) return;
    const t = setTimeout(() => setPendingDelete(null), 4000);
    return () => clearTimeout(t);
  }, [pendingDelete]);

  // Même logique pour la suppression d'un type de poste
  useEffect(() => { setPendingTypeDelete(null); }, [typesModal]);
  useEffect(() => {
    if (pendingTypeDelete === null) return;
    const t = setTimeout(() => setPendingTypeDelete(null), 4000);
    return () => clearTimeout(t);
  }, [pendingTypeDelete]);

  const loadAll = async () => {
    if (!restaurantId) { setLoading(false); return; }
    setLoading(true);
    const [{ data: emps }, { data: sts }, { data: sh }] = await Promise.all([
      supabase.from("employees").select("*").eq("restaurant_id", restaurantId).eq("actif", true).order("nom"),
      supabase.from("shift_types").select("*").eq("restaurant_id", restaurantId),
      (canManage ? supabase.from("shifts").select("*").eq("restaurant_id", restaurantId)
        : supabase.from("shifts").select("*").eq("restaurant_id", restaurantId).eq("published", true))
        .gte("date", localDate(days[0]))
        .lte("date", localDate(days[6]))
    ]);
    setEmployees(emps || []);
    setShiftTypes(sts || []);
    setShifts(sh || []);
    setLoading(false);
  };

  const getShifts = (empId, date) => {
    const ds = localDate(date);
    return shifts.filter(s => s.employee_id === empId && s.date === ds);
  };

  const addShift = async (type) => {
    if (!modal || saving) return;
    setSaving(true);
    const ds = localDate(modal.date);
    let error;
    if (type === "repos") {
      ({ error } = await supabase.from("shifts").insert({ restaurant_id: restaurantId, employee_id: modal.empId, date: ds, heure_debut:"00:00", heure_fin:"00:00", type_nom:"Repos", couleur:"#E2E8F0", repos: true }));
    } else {
      ({ error } = await supabase.from("shifts").insert({ restaurant_id: restaurantId, employee_id: modal.empId, date: ds, heure_debut: type.heure_debut, heure_fin: type.heure_fin, type_nom: type.nom, couleur: type.couleur, repos: false }));
    }
    if (error) { toast("Erreur : le service n'a pas été ajouté", "error"); setSaving(false); return; }
    await loadAll();
    setModal(null);
    setSaving(false);
  };

  const removeShift = async (id) => {
    setPendingDelete(null);
    const { error } = await supabase.from("shifts").delete().eq("id", id);
    if (error) { toast("Erreur : le service n'a pas été supprimé", "error"); return; }
    setShifts(prev => prev.filter(s => s.id !== id));
  };

  const typeNom = newType.nom.trim();
  const typeError = !typeNom ? "Le nom est obligatoire"
    : shiftTypes.some(t => (t.nom || "").trim().toLowerCase() === typeNom.toLowerCase()) ? "Un type de poste porte déjà ce nom"
    : !newType.heure_debut || !newType.heure_fin ? "Indiquez l'heure de début et de fin"
    : newType.heure_debut === newType.heure_fin ? "L'heure de fin doit être différente de l'heure de début"
    : null;

  const saveShiftType = async () => {
    if (typeError || savingType) return;
    setSavingType(true);
    const { error } = await supabase.from("shift_types").insert({ restaurant_id: restaurantId, nom: typeNom, heure_debut: newType.heure_debut, heure_fin: newType.heure_fin, couleur: newType.couleur });
    setSavingType(false);
    if (error) { toast("Erreur : le type de poste n'a pas été créé", "error"); return; }
    toast("Type de poste créé");
    setNewType(EMPTY_TYPE);
    await loadAll();
  };

  const removeShiftType = async (id) => {
    setPendingTypeDelete(null);
    const { error } = await supabase.from("shift_types").delete().eq("id", id);
    if (error) { toast("Erreur : le type de poste n'a pas été supprimé", "error"); return; }
    toast("Type de poste supprimé");
    await loadAll();
  };

  const saveEmployee = async () => {
    if (!newEmp.nom.trim()) return;
    setSaving(true);
    const { error } = await supabase.from("employees").insert({ restaurant_id: restaurantId, ...newEmp });
    if (!error) { await loadAll(); toast("Employé ajouté"); setAddEmp(false); setNewEmp({ nom:"", prenom:"", heures_contrat:35, salaire_horaire:11.65 }); }
    else toast("Erreur", "error");
    setSaving(false);
  };

  const publishPlanning = async () => {
    const { error } = await supabase.from("shifts").update({ published: true })
      .eq("restaurant_id", restaurantId)
      .gte("date", localDate(days[0]))
      .lte("date", localDate(days[6]));
    if (error) { toast("Erreur : le planning n'a pas été publié", "error"); return; }
    setShifts(prev => prev.map(s => ({ ...s, published: true })));
    toast("Planning publié");
  };

  // Total masse salariale
  const totalMasse = employees.reduce((total, emp) => {
    const heures = calcHeures(shifts.filter(s => s.employee_id === emp.id));
    return total + heures * (emp.salaire_horaire || 11.65);
  }, 0);

  if (loading) return <div style={{padding:40,textAlign:"center",color:C.textMuted}}>Chargement du planning...</div>;

  return (
    <div>
      {/* Modal ajout shift */}
      {modal && (
        <div style={{position:"fixed",inset:0,background:"rgba(15,23,42,.5)",zIndex:200,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
          <div style={{background:C.surface,borderRadius:16,padding:24,width:"100%",maxWidth:360,boxShadow:"0 20px 50px rgba(0,0,0,.3)"}}>
            <p style={{margin:"0 0 4px",fontSize:16,fontWeight:800}}>{modal.empName}</p>
            <p style={{margin:"0 0 16px",fontSize:13,color:C.textSec}}>{modal.date.toLocaleDateString("fr-FR",{weekday:"long",day:"numeric",month:"long"})}</p>
            <p style={{margin:"0 0 10px",fontSize:11,fontWeight:700,color:C.textSec,textTransform:"uppercase",letterSpacing:".5px"}}>Choisir un service</p>
            <div style={{display:"flex",flexDirection:"column",gap:7,marginBottom:14}}>
              {shiftTypes.map(st => (
                <button key={st.id} onClick={() => addShift(st)} disabled={saving}
                  style={{padding:"10px 14px",borderRadius:10,border:"none",background:st.couleur+"22",cursor:saving?"wait":"pointer",opacity:saving?.6:1,display:"flex",alignItems:"center",gap:10,textAlign:"left"}}>
                  <span style={{width:12,height:12,borderRadius:"50%",background:st.couleur,flexShrink:0,display:"inline-block"}}/>
                  <div style={{flex:1}}>
                    <p style={{margin:0,fontSize:13,fontWeight:700,color:C.text}}>{st.nom}{st.abrev ? ` (${st.abrev})` : ""}</p>
                    <p style={{margin:0,fontSize:11,color:C.textSec}}>{st.heure_debut} – {st.heure_fin} · {calcDureeH(st.heure_debut,st.heure_fin)}h</p>
                  </div>
                </button>
              ))}
              <button onClick={() => addShift("repos")} disabled={saving}
                style={{padding:"10px 14px",borderRadius:10,border:`1px solid ${C.border}`,background:"#F8FAFC",cursor:saving?"wait":"pointer",opacity:saving?.6:1,display:"flex",alignItems:"center",gap:10,color:C.textSec}}>
                <span style={{width:12,height:12,borderRadius:"50%",background:"#CBD5E1",flexShrink:0,display:"inline-block"}}/>
                <span style={{fontSize:13}}>Repos hebdomadaire</span>
              </button>
            </div>
            <button onClick={() => setModal(null)} style={{width:"100%",padding:10,borderRadius:8,border:`1px solid ${C.border}`,background:"transparent",cursor:"pointer",fontSize:13}}>Annuler</button>
          </div>
        </div>
      )}

      {/* Modal types de poste */}
      {typesModal && (
        <div style={{position:"fixed",inset:0,background:"rgba(15,23,42,.5)",zIndex:200,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
          <div style={{background:C.surface,borderRadius:16,padding:24,width:"100%",maxWidth:400,maxHeight:"90vh",overflowY:"auto",boxSizing:"border-box",boxShadow:"0 20px 50px rgba(0,0,0,.3)"}}>
            <p style={{margin:"0 0 16px",fontSize:16,fontWeight:800}}>Types de poste</p>
            <div style={{display:"flex",flexDirection:"column",gap:7,marginBottom:18}}>
              {shiftTypes.length === 0 && <p style={{margin:0,fontSize:13,color:C.textSec}}>Aucun type de poste pour le moment.</p>}
              {shiftTypes.map(st => (
                <div key={st.id} style={{padding:"8px 10px",borderRadius:10,background:st.couleur+"22",display:"flex",alignItems:"center",gap:10}}>
                  <span style={{width:12,height:12,borderRadius:"50%",background:st.couleur,flexShrink:0,display:"inline-block"}}/>
                  <div style={{flex:1,minWidth:0}}>
                    <p style={{margin:0,fontSize:13,fontWeight:700,color:C.text,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{st.nom}</p>
                    <p style={{margin:0,fontSize:11,color:C.textSec}}>{(st.heure_debut||"").slice(0,5)} – {(st.heure_fin||"").slice(0,5)} · {calcDureeH(st.heure_debut,st.heure_fin)}h</p>
                  </div>
                  <button onClick={() => { if (pendingTypeDelete===st.id) removeShiftType(st.id); else setPendingTypeDelete(st.id); }}
                    aria-label={pendingTypeDelete===st.id?"Confirmer la suppression du type de poste":"Supprimer le type de poste"}
                    style={{minHeight:36,padding:"4px 10px",borderRadius:8,border:`1px solid ${pendingTypeDelete===st.id?C.danger:C.border}`,background:pendingTypeDelete===st.id?C.dangerLight:C.surface,color:pendingTypeDelete===st.id?C.danger:C.textSec,fontSize:12,fontWeight:700,cursor:"pointer",flexShrink:0}}>
                    {pendingTypeDelete===st.id ? "Supprimer ?" : "Supprimer"}
                  </button>
                </div>
              ))}
            </div>
            <p style={{margin:"0 0 10px",fontSize:11,fontWeight:700,color:C.textSec,textTransform:"uppercase",letterSpacing:".5px"}}>Nouveau type de poste</p>
            <div style={{marginBottom:10}}>
              <label style={{fontSize:11,fontWeight:600,color:C.textSec,display:"block",marginBottom:4,textTransform:"uppercase",letterSpacing:".5px"}}>Nom</label>
              <input value={newType.nom} onChange={e=>setNewType(p=>({...p,nom:e.target.value}))} placeholder="Ex. Midi, Soir, Coupure…" style={{width:"100%",boxSizing:"border-box",padding:"8px 10px",borderRadius:8,border:`1px solid ${C.border}`,fontSize:13}}/>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}>
              {[["Début","heure_debut"],["Fin","heure_fin"]].map(([l,k])=>(
                <div key={k}><label style={{fontSize:11,fontWeight:600,color:C.textSec,display:"block",marginBottom:4,textTransform:"uppercase",letterSpacing:".5px"}}>{l}</label>
                <input type="time" value={newType[k]} onChange={e=>setNewType(p=>({...p,[k]:e.target.value}))} style={{width:"100%",boxSizing:"border-box",padding:"8px 10px",borderRadius:8,border:`1px solid ${C.border}`,fontSize:13}}/></div>
              ))}
            </div>
            <label style={{fontSize:11,fontWeight:600,color:C.textSec,display:"block",marginBottom:6,textTransform:"uppercase",letterSpacing:".5px"}}>Couleur</label>
            <div style={{display:"flex",gap:8,marginBottom:12}}>
              {TYPE_COULEURS.map(c => (
                <button key={c} onClick={() => setNewType(p=>({...p,couleur:c}))} aria-label={`Couleur ${c}`} aria-pressed={newType.couleur===c}
                  style={{width:32,height:32,borderRadius:"50%",background:c,border:newType.couleur===c?`3px solid ${C.navy}`:"3px solid transparent",boxShadow:newType.couleur===c?"0 0 0 2px #fff inset":"none",cursor:"pointer",padding:0}}/>
              ))}
            </div>
            {typeError && (newType.nom || newType.heure_debut || newType.heure_fin) && <p style={{margin:"0 0 10px",fontSize:12,color:C.danger}}>{typeError}</p>}
            <div style={{display:"flex",gap:8}}>
              <button onClick={saveShiftType} disabled={!!typeError || savingType} style={{flex:1,padding:"10px 14px",background:C.brand,color:"#fff",border:"none",borderRadius:8,fontSize:13,fontWeight:700,cursor:typeError||savingType?"not-allowed":"pointer",opacity:typeError||savingType?.5:1}}>{savingType?"...":"Ajouter"}</button>
              <button onClick={() => { setTypesModal(false); setNewType(EMPTY_TYPE); }} style={{padding:"10px 14px",borderRadius:8,border:`1px solid ${C.border}`,background:"transparent",cursor:"pointer",fontSize:13}}>Fermer</button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{marginBottom:16,display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:10}}>
        <div>
          <h1 style={{margin:0,fontSize:22,fontWeight:800,letterSpacing:"-.5px"}}>Planning</h1>
          <div style={{display:"flex",alignItems:"center",gap:8,marginTop:4}}>
            <button onClick={() => setWeek(w => w-1)} aria-label="Semaine précédente" style={{minWidth:44,minHeight:44,padding:"4px 8px",borderRadius:6,border:`1px solid ${C.border}`,background:"transparent",cursor:"pointer",fontSize:14}}>‹</button>
            <p style={{margin:0,fontSize:14,fontWeight:600}}>{weekLabel}</p>
            <button onClick={() => setWeek(w => w+1)} aria-label="Semaine suivante" style={{minWidth:44,minHeight:44,padding:"4px 8px",borderRadius:6,border:`1px solid ${C.border}`,background:"transparent",cursor:"pointer",fontSize:14}}>›</button>
            <button onClick={() => setWeek(0)} style={{padding:"4px 8px",borderRadius:6,border:`1px solid ${C.border}`,background:"transparent",cursor:"pointer",fontSize:11,color:C.textSec}}>Aujourd'hui</button>
            {published && <span style={{fontSize:11,fontWeight:700,background:C.successLight,color:C.success,padding:"2px 8px",borderRadius:10}}>Publié</span>}
          </div>
        </div>
        {canManage && <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
          <button onClick={() => setTypesModal(true)} style={{padding:"8px 14px",background:C.bg,border:`1px solid ${C.border}`,borderRadius:10,fontSize:13,fontWeight:600,cursor:"pointer"}}>
            Types de poste
          </button>
          <button onClick={() => setAddEmp(true)} style={{padding:"8px 14px",background:C.bg,border:`1px solid ${C.border}`,borderRadius:10,fontSize:13,fontWeight:600,cursor:"pointer",display:"flex",alignItems:"center",gap:6}}>
            + Employé
          </button>
          <button onClick={publishPlanning} style={{padding:"8px 16px",background:C.brand,color:"#fff",border:"none",borderRadius:10,fontSize:13,fontWeight:700,cursor:"pointer",boxShadow:"0 4px 12px rgba(37,99,235,.3)"}}>
            Publier le planning
          </button>
        </div>}
      </div>

      {/* Aucun type de poste */}
      {canManage && shiftTypes.length === 0 && (
        <div style={{background:C.warningLight,borderRadius:12,border:`1px solid ${C.warning}40`,padding:"12px 16px",marginBottom:14,display:"flex",gap:12,flexWrap:"wrap",alignItems:"center",justifyContent:"space-between"}}>
          <div style={{flex:"1 1 220px"}}>
            <p style={{margin:0,fontSize:13,fontWeight:700,color:C.text}}>Aucun type de poste</p>
            <p style={{margin:"2px 0 0",fontSize:12,color:C.textSec}}>Créez vos postes (ex. Midi, Soir) pour pouvoir planifier des services. Sans eux, seuls les repos peuvent être placés.</p>
          </div>
          <button onClick={() => setTypesModal(true)} style={{padding:"8px 14px",background:C.warning,color:"#fff",border:"none",borderRadius:10,fontSize:13,fontWeight:700,cursor:"pointer"}}>Créer un type de poste</button>
        </div>
      )}

      {/* Barre masse salariale (gérant/manager uniquement) */}
      {canManage && <div style={{background:C.surface,borderRadius:12,border:`1px solid ${C.border}`,padding:"12px 16px",marginBottom:14,display:"flex",gap:20,flexWrap:"wrap",alignItems:"center"}}>
        <div><p style={{margin:0,fontSize:10,color:C.textMuted,textTransform:"uppercase",letterSpacing:".5px"}}>Masse salariale semaine</p><p style={{margin:0,fontSize:18,fontWeight:800,color:C.warning}}>{totalMasse.toFixed(0)}€</p></div>
        <div><p style={{margin:0,fontSize:10,color:C.textMuted,textTransform:"uppercase",letterSpacing:".5px"}}>Shifts planifiés</p><p style={{margin:0,fontSize:18,fontWeight:800}}>{shifts.filter(s=>!s.repos).length}</p></div>
        <div><p style={{margin:0,fontSize:10,color:C.textMuted,textTransform:"uppercase",letterSpacing:".5px"}}>Employés</p><p style={{margin:0,fontSize:18,fontWeight:800}}>{employees.length}</p></div>
      </div>}

      {/* Ajout employé */}
      {addEmp && (
        <div style={{background:C.surface,borderRadius:12,border:`1px solid ${C.border}`,padding:16,marginBottom:14}}>
          <p style={{margin:"0 0 12px",fontSize:14,fontWeight:700}}>Nouvel employé</p>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:12}}>
            {[["Nom",newEmp.nom,v=>setNewEmp(p=>({...p,nom:v}))],["Prénom",newEmp.prenom,v=>setNewEmp(p=>({...p,prenom:v}))]].map(([l,v,set])=>(
              <div key={l}><label style={{fontSize:11,fontWeight:600,color:C.textSec,display:"block",marginBottom:4,textTransform:"uppercase",letterSpacing:".5px"}}>{l}</label>
              <input value={v} onChange={e=>set(e.target.value)} style={{width:"100%",boxSizing:"border-box",padding:"8px 10px",borderRadius:8,border:`1px solid ${C.border}`,fontSize:13}}/></div>
            ))}
            {[["Heures/semaine",newEmp.heures_contrat,v=>setNewEmp(p=>({...p,heures_contrat:v})),"number"],["Taux horaire (€)",newEmp.salaire_horaire,v=>setNewEmp(p=>({...p,salaire_horaire:v})),"number"]].map(([l,v,set,t])=>(
              <div key={l}><label style={{fontSize:11,fontWeight:600,color:C.textSec,display:"block",marginBottom:4,textTransform:"uppercase",letterSpacing:".5px"}}>{l}</label>
              <input type={t} value={v} onChange={e=>set(parseFloat(e.target.value))} style={{width:"100%",boxSizing:"border-box",padding:"8px 10px",borderRadius:8,border:`1px solid ${C.border}`,fontSize:13}}/></div>
            ))}
          </div>
          <div style={{display:"flex",gap:8}}>
            <button onClick={saveEmployee} disabled={saving} style={{padding:"9px 18px",background:C.brand,color:"#fff",border:"none",borderRadius:8,fontSize:13,fontWeight:700,cursor:"pointer"}}>{saving?"...":"Ajouter"}</button>
            <button onClick={()=>setAddEmp(false)} style={{padding:"9px 12px",background:"transparent",border:`1px solid ${C.border}`,borderRadius:8,fontSize:13,cursor:"pointer"}}>Annuler</button>
          </div>
        </div>
      )}

      {employees.length === 0 ? (
        <div style={{padding:40,textAlign:"center",background:C.surface,borderRadius:14,border:`1px solid ${C.border}`}}>
          <p style={{fontSize:32,margin:"0 0 10px"}}>👥</p>
          <p style={{fontSize:16,fontWeight:700,margin:0}}>Aucun employé</p>
          <p style={{fontSize:13,color:C.textSec,margin:"6px 0 0"}}>Ajoutez vos employés pour créer le planning</p>
        </div>
      ) : (
        <div style={{background:C.surface,borderRadius:14,border:`1px solid ${C.border}`,overflow:"auto"}}>
          {/* En-tête jours */}
          <div style={{display:"grid",gridTemplateColumns:"120px repeat(7,minmax(84px,1fr))",borderBottom:`1px solid ${C.border}`,minWidth:708}}>
            <div style={{padding:"10px 14px",background:"#F8FAFC",borderRight:`1px solid ${C.border}`,position:"sticky",left:0,zIndex:2}}>
              <p style={{margin:0,fontSize:11,fontWeight:700,color:C.textSec,textTransform:"uppercase",letterSpacing:".5px"}}>Employés</p>
            </div>
            {days.map((d, i) => {
              const today = localDate() === localDate(d);
              return (
                <div key={i} style={{padding:"10px 8px",textAlign:"center",background: today?"#EFF6FF":"#F8FAFC",borderRight:i<6?`1px solid ${C.border}`:"none",borderBottom:`2px solid ${today?C.brand:C.border}`}}>
                  <p style={{margin:0,fontSize:11,fontWeight:500,color:today?C.brand:C.textSec}}>{JOURS[i]}</p>
                  <p style={{margin:"2px 0 0",fontSize:15,fontWeight:800,color:today?C.brand:C.text}}>{d.getDate()}</p>
                </div>
              );
            })}
          </div>

          {/* Lignes employés */}
          {employees.map((emp, ei) => {
            const empShifts = shifts.filter(s => s.employee_id === emp.id);
            const heuresTotales = calcHeures(empShifts);
            const surplus = heuresTotales - (emp.heures_contrat || 35);
            return (
              <div key={emp.id} style={{display:"grid",gridTemplateColumns:"120px repeat(7,minmax(84px,1fr))",borderBottom:`1px solid ${C.border}`,minWidth:708}}>
                {/* Nom employé */}
                <div style={{padding:"10px 12px",borderRight:`1px solid ${C.border}`,display:"flex",flexDirection:"column",justifyContent:"center",position:"sticky",left:0,zIndex:1,background:C.surface,minWidth:0}}>
                  <p style={{margin:0,fontSize:13,fontWeight:700,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{emp.prenom} {emp.nom}</p>
                  <p style={{margin:0,fontSize:11,color:C.textSec}}>{(emp.heures_contrat||35)}h | <span style={{color:surplus>0?C.success:surplus<-1?C.danger:C.textSec}}>{heuresTotales.toFixed(1)}h</span></p>
                </div>
                {/* Cellules jours */}
                {days.map((d, di) => {
                  const ds = localDate(d);
                  const dayShifts = empShifts.filter(s => s.date === ds);
                  return (
                    <div key={di} onClick={canManage ? () => setModal({ empId: emp.id, empName: `${emp.prenom} ${emp.nom}`, date: d }) : undefined}
                      style={{padding:6,borderRight:di<6?`1px solid ${C.border}`:"none",minHeight:60,cursor:canManage?"pointer":"default",background:"transparent",position:"relative"}}
                      onMouseEnter={e=>e.currentTarget.style.background="#F8FAFC"} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                      {dayShifts.length === 0 && (
                        <div style={{height:"100%",display:"flex",alignItems:"center",justifyContent:"center"}}>
                          <span style={{fontSize:18,color:C.border,opacity:0}}>+</span>
                        </div>
                      )}
                      {dayShifts.map(s => (
                        <div key={s.id} role={canManage?"button":undefined} aria-label={canManage?(pendingDelete===s.id?"Confirmer la suppression du service":"Supprimer le service"):undefined}
                          onClick={e=>{e.stopPropagation();if (!canManage) return;if (pendingDelete===s.id) removeShift(s.id); else setPendingDelete(s.id);}}
                          style={{marginBottom:3,padding:"3px 6px",borderRadius:6,background:pendingDelete===s.id?C.dangerLight:s.repos?"#F1F5F9":s.couleur+"22",border:`1px solid ${pendingDelete===s.id?C.danger:(s.repos?"#E2E8F0":s.couleur)+"50"}`,cursor:canManage?"pointer":"default",position:"relative"}}
                          title={canManage?"Toucher pour supprimer":undefined}>
                          {pendingDelete===s.id ? (
                            <p style={{margin:0,fontSize:10,fontWeight:700,color:C.danger}}>Supprimer ?</p>
                          ) : s.repos ? (
                            <p style={{margin:0,fontSize:10,color:C.textMuted}}>Repos</p>
                          ) : (
                            <>
                              <p style={{margin:0,fontSize:10,fontWeight:700,color:s.couleur}}>{s.type_nom}</p>
                              <p style={{margin:0,fontSize:9,color:C.textSec}}>{s.heure_debut}–{s.heure_fin}</p>
                            </>
                          )}
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── TÂCHES ───────────────────────────────────────────────────
export function Taches({ restaurantId, profileId, toast, isOwner }) {
  const [onglet, setOnglet] = useState("jour");
  const [tasks, setTasks] = useState([]);
  const [completions, setCompletions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addModal, setAddModal] = useState(false);
  const [newTask, setNewTask] = useState({ nom:"", description:"", categorie:"general", frequence:"daily", priorite:"normale" });
  const [saving, setSaving] = useState(false);
  const [onceDone, setOnceDone] = useState([]); // ids des tâches ponctuelles complétées un autre jour
  const [pendingTaskDelete, setPendingTaskDelete] = useState(null);

  const today = localDate();
  const todayDow = new Date().getDay() || 7; // 1=lun, 7=dim
  const [jourSemaine, setJourSemaine] = useState(todayDow);

  useEffect(() => { loadAll(); }, [restaurantId]);

  const loadAll = async () => {
    if (!restaurantId) { setLoading(false); return; }
    setLoading(true);
    const [{ data: ts }, { data: cs }] = await Promise.all([
      supabase.from("tasks").select("*").eq("restaurant_id", restaurantId).eq("actif", true),
      supabase.from("task_completions").select("*").eq("restaurant_id", restaurantId).eq("date", today)
    ]);
    const RANG = { haute:0, normale:1, basse:2 };
    const sorted = (ts || []).slice().sort((a, b) => (RANG[a.priorite] ?? 1) - (RANG[b.priorite] ?? 1));
    const onceIds = sorted.filter(t => t.frequence === "once").map(t => t.id);
    let prev = [];
    if (onceIds.length) {
      const { data: oc } = await supabase.from("task_completions").select("task_id,date").in("task_id", onceIds).neq("date", today);
      prev = (oc || []).map(c => c.task_id);
    }
    setTasks(sorted);
    setOnceDone(prev);
    setCompletions(cs || []);
    setLoading(false);
  };

  const todayTasks = tasks.filter(t => {
    if (t.frequence === "daily") return true;
    if (t.frequence === "weekly") return (t.jours_semaine || []).includes(todayDow);
    if (t.frequence === "once") return !onceDone.includes(t.id);
    return false;
  });

  const isDone = (taskId) => completions.some(c => c.task_id === taskId);
  const done = todayTasks.filter(t => isDone(t.id));
  const todo = todayTasks.filter(t => !isDone(t.id));

  const complete = async (task) => {
    const { error } = await supabase.from("task_completions").insert({
      task_id: task.id, restaurant_id: restaurantId, completed_by: profileId, date: today
    });
    if (!error) { setCompletions(prev => [...prev, { task_id: task.id }]); toast("Tâche complétée ✓"); }
    else toast("Erreur : la tâche n'a pas été complétée", "error");
  };

  const uncomplete = async (task) => {
    const { error } = await supabase.from("task_completions").delete().eq("task_id", task.id).eq("date", today);
    if (error) { toast("Erreur : l'annulation a échoué", "error"); return; }
    setCompletions(prev => prev.filter(c => c.task_id !== task.id));
  };

  const saveTask = async () => {
    if (!newTask.nom.trim()) return;
    setSaving(true);
    const { error } = await supabase.from("tasks").insert({ restaurant_id: restaurantId, ...newTask, created_by: profileId, jours_semaine: newTask.frequence === "weekly" ? [jourSemaine] : [1,2,3,4,5,6,7] });
    if (!error) { await loadAll(); toast("Tâche créée"); setAddModal(false); setNewTask({ nom:"", description:"", categorie:"general", frequence:"daily", priorite:"normale" }); }
    else toast("Erreur : la tâche n'a pas été créée", "error");
    setSaving(false);
  };

  const deleteTask = async (id) => {
    setPendingTaskDelete(null);
    const { error } = await supabase.from("tasks").update({ actif: false }).eq("id", id);
    if (error) { toast("Erreur : la tâche n'a pas été supprimée", "error"); return; }
    setTasks(prev => prev.filter(t => t.id !== id));
    toast("Tâche supprimée");
  };

  const PRIO_COLOR = { haute: C.danger, normale: C.brand, basse: C.textMuted };
  const CAT_ICON = { ouverture:"☀️", fermeture:"🌙", nettoyage:"🧹", haccp:"🌡️", stock:"📦", general:"📋" };

  if (loading) return <div style={{padding:40,textAlign:"center",color:C.textMuted}}>Chargement...</div>;

  return (
    <div>
      {addModal && (
        <div style={{position:"fixed",inset:0,background:"rgba(15,23,42,.5)",zIndex:200,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
          <div style={{background:C.surface,borderRadius:16,padding:24,width:"100%",maxWidth:400,boxShadow:"0 20px 50px rgba(0,0,0,.3)"}}>
            <h3 style={{margin:"0 0 16px",fontSize:16,fontWeight:800}}>Nouvelle tâche</h3>
            <div style={{display:"flex",flexDirection:"column",gap:10,marginBottom:14}}>
              <div><label style={{fontSize:11,fontWeight:600,color:C.textSec,display:"block",marginBottom:4,textTransform:"uppercase",letterSpacing:".5px"}}>Nom de la tâche</label>
                <input value={newTask.nom} onChange={e=>setNewTask(p=>({...p,nom:e.target.value}))} placeholder="Ex: Mise en place ouverture" style={{width:"100%",boxSizing:"border-box",padding:"9px 12px",borderRadius:8,border:`1px solid ${C.border}`,fontSize:14}}/></div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                <div><label style={{fontSize:11,fontWeight:600,color:C.textSec,display:"block",marginBottom:4,textTransform:"uppercase",letterSpacing:".5px"}}>Catégorie</label>
                  <select value={newTask.categorie} onChange={e=>setNewTask(p=>({...p,categorie:e.target.value}))} style={{width:"100%",padding:"9px 10px",borderRadius:8,border:`1px solid ${C.border}`,fontSize:13}}>
                    {Object.keys(CAT_ICON).map(c=><option key={c} value={c}>{CAT_ICON[c]} {c}</option>)}
                  </select></div>
                <div><label style={{fontSize:11,fontWeight:600,color:C.textSec,display:"block",marginBottom:4,textTransform:"uppercase",letterSpacing:".5px"}}>Fréquence</label>
                  <select value={newTask.frequence} onChange={e=>setNewTask(p=>({...p,frequence:e.target.value}))} style={{width:"100%",padding:"9px 10px",borderRadius:8,border:`1px solid ${C.border}`,fontSize:13}}>
                    <option value="daily">Chaque jour</option>
                    <option value="weekly">Hebdomadaire</option>
                    <option value="once">Ponctuelle</option>
                  </select></div>
              </div>
              {newTask.frequence === "weekly" && (
                <div><label style={{fontSize:11,fontWeight:600,color:C.textSec,display:"block",marginBottom:4,textTransform:"uppercase",letterSpacing:".5px"}}>Jour</label>
                  <div style={{display:"flex",gap:4}}>
                    {["L","M","M","J","V","S","D"].map((l,i)=>(
                      <button key={i} onClick={()=>setJourSemaine(i+1)} aria-label={JOURS_FULL[i]} aria-pressed={jourSemaine===i+1}
                        style={{flex:1,minHeight:36,borderRadius:8,border:`1.5px solid ${jourSemaine===i+1?C.brand:C.border}`,background:jourSemaine===i+1?C.brandLight:"transparent",fontSize:12,fontWeight:jourSemaine===i+1?700:400,color:jourSemaine===i+1?C.brand:C.textSec,cursor:"pointer"}}>{l}</button>
                    ))}
                  </div>
                </div>
              )}
              <div><label style={{fontSize:11,fontWeight:600,color:C.textSec,display:"block",marginBottom:4,textTransform:"uppercase",letterSpacing:".5px"}}>Priorité</label>
                <div style={{display:"flex",gap:6}}>
                  {["haute","normale","basse"].map(p=><button key={p} onClick={()=>setNewTask(prev=>({...prev,priorite:p}))} style={{flex:1,padding:"7px 6px",borderRadius:8,border:`1.5px solid ${newTask.priorite===p?PRIO_COLOR[p]:C.border}`,background:newTask.priorite===p?PRIO_COLOR[p]+"15":"transparent",fontSize:12,fontWeight:newTask.priorite===p?700:400,color:newTask.priorite===p?PRIO_COLOR[p]:C.textSec,cursor:"pointer",textTransform:"capitalize"}}>{p}</button>)}
                </div>
              </div>
            </div>
            <div style={{display:"flex",gap:8}}>
              <button onClick={saveTask} disabled={saving||!newTask.nom} style={{flex:1,padding:"11px",background:newTask.nom?C.brand:"#E2E8F0",color:newTask.nom?"#fff":C.textMuted,border:"none",borderRadius:10,fontSize:14,fontWeight:700,cursor:newTask.nom?"pointer":"not-allowed"}}>{saving?"...":"Créer la tâche"}</button>
              <button onClick={()=>setAddModal(false)} style={{padding:"11px 14px",background:"transparent",border:`1px solid ${C.border}`,borderRadius:10,cursor:"pointer"}}>Annuler</button>
            </div>
          </div>
        </div>
      )}

      <div style={{marginBottom:20,display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:10,flexWrap:"wrap"}}>
        <div>
          <h1 style={{margin:0,fontSize:22,fontWeight:800,letterSpacing:"-.5px"}}>Tâches du jour</h1>
          <p style={{margin:"4px 0 0",fontSize:14,color:C.textSec}}>{new Date().toLocaleDateString("fr-FR",{weekday:"long",day:"numeric",month:"long"})}</p>
        </div>
        {isOwner && <button onClick={()=>setAddModal(true)} style={{padding:"9px 16px",background:C.brand,color:"#fff",border:"none",borderRadius:10,fontSize:13,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",gap:6}}>+ Tâche</button>}
      </div>

      {/* Progression */}
      <div style={{background:C.surface,borderRadius:12,border:`1px solid ${C.border}`,padding:"14px 16px",marginBottom:16}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
          <p style={{margin:0,fontSize:14,fontWeight:700}}>Progression du jour</p>
          <p style={{margin:0,fontSize:16,fontWeight:800,color:done.length===todayTasks.length&&todayTasks.length>0?C.success:C.brand}}>{done.length}/{todayTasks.length}</p>
        </div>
        <div style={{height:8,background:"#F1F5F9",borderRadius:4,overflow:"hidden"}}>
          <div style={{height:"100%",width:`${todayTasks.length>0?(done.length/todayTasks.length*100):0}%`,background:done.length===todayTasks.length&&todayTasks.length>0?C.success:C.brand,borderRadius:4,transition:"width .3s"}}/>
        </div>
      </div>

      {/* Tabs */}
      <div style={{display:"flex",gap:4,background:"#F1F5F9",padding:4,borderRadius:10,marginBottom:14}}>
        {[["jour",`À faire (${todo.length})`],["done",`Complétées (${done.length})`],isOwner&&["all","Toutes les tâches"]].filter(Boolean).map(([k,l])=>(
          <button key={k} onClick={()=>setOnglet(k)} style={{flex:1,padding:"7px 10px",borderRadius:8,border:"none",fontSize:13,fontWeight:600,cursor:"pointer",background:onglet===k?C.surface:"transparent",color:onglet===k?C.text:C.textSec,boxShadow:onglet===k?"0 1px 4px rgba(0,0,0,.1)":"none"}}>{l}</button>
        ))}
      </div>

      {/* Liste tâches À FAIRE */}
      {onglet === "jour" && (
        <div style={{background:C.surface,borderRadius:14,border:`1px solid ${C.border}`,overflow:"hidden"}}>
          {todo.length === 0 ? (
            <div style={{padding:40,textAlign:"center"}}>
              <p style={{fontSize:28,margin:"0 0 8px"}}>✅</p>
              <p style={{margin:0,fontSize:15,fontWeight:700,color:C.success}}>Toutes les tâches sont complétées !</p>
            </div>
          ) : todo.map((t, i) => (
            <div key={t.id} style={{padding:"14px 16px",borderBottom:i<todo.length-1?`1px solid ${C.border}`:"none",display:"flex",alignItems:"center",gap:12}}>
              <div style={{width:40,height:40,borderRadius:12,background:`${PRIO_COLOR[t.priorite]}15`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,flexShrink:0}}>
                {CAT_ICON[t.categorie]||"📋"}
              </div>
              <div style={{flex:1}}>
                <p style={{margin:0,fontSize:14,fontWeight:600}}>{t.nom}</p>
                <div style={{display:"flex",alignItems:"center",gap:8,marginTop:2}}>
                  <span style={{fontSize:11,color:PRIO_COLOR[t.priorite],fontWeight:600,textTransform:"capitalize"}}>{t.priorite}</span>
                  <span style={{fontSize:11,color:C.textMuted}}>·</span>
                  <span style={{fontSize:11,color:C.textMuted,textTransform:"capitalize"}}>{t.frequence==="daily"?"chaque jour":t.frequence==="weekly"?"hebdomadaire":"ponctuelle"}</span>
                </div>
              </div>
              <button onClick={() => complete(t)} style={{padding:"9px 18px",background:C.brand,color:"#fff",border:"none",borderRadius:10,fontSize:13,fontWeight:700,cursor:"pointer",flexShrink:0,boxShadow:"0 2px 8px rgba(37,99,235,.25)"}}>
                Compléter
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Tâches COMPLÉTÉES */}
      {onglet === "done" && (
        <div style={{background:C.surface,borderRadius:14,border:`1px solid ${C.border}`,overflow:"hidden"}}>
          {done.length === 0 ? (
            <p style={{padding:32,textAlign:"center",color:C.textMuted,margin:0,fontSize:13}}>Aucune tâche complétée aujourd'hui</p>
          ) : done.map((t, i) => (
            <div key={t.id} style={{padding:"14px 16px",borderBottom:i<done.length-1?`1px solid ${C.border}`:"none",display:"flex",alignItems:"center",gap:12,background:C.successLight}}>
              <div style={{width:40,height:40,borderRadius:12,background:C.successLight,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,flexShrink:0}}>{CAT_ICON[t.categorie]||"✅"}</div>
              <div style={{flex:1}}>
                <p style={{margin:0,fontSize:14,fontWeight:600,color:C.success,textDecoration:"line-through"}}>{t.nom}</p>
                <p style={{margin:"2px 0 0",fontSize:11,color:C.success,opacity:.7}}>Complétée aujourd'hui</p>
              </div>
              <button onClick={() => uncomplete(t)} style={{padding:"7px 12px",background:"transparent",border:`1px solid ${C.border}`,borderRadius:8,fontSize:12,cursor:"pointer",color:C.textSec}}>Annuler</button>
            </div>
          ))}
        </div>
      )}

      {/* GESTION toutes tâches (owner) */}
      {onglet === "all" && isOwner && (
        <div style={{background:C.surface,borderRadius:14,border:`1px solid ${C.border}`,overflow:"hidden"}}>
          {tasks.map((t, i) => (
            <div key={t.id} style={{padding:"12px 16px",borderBottom:i<tasks.length-1?`1px solid ${C.border}`:"none",display:"flex",alignItems:"center",gap:12}}>
              <span style={{fontSize:18,flexShrink:0}}>{CAT_ICON[t.categorie]||"📋"}</span>
              <div style={{flex:1}}>
                <p style={{margin:0,fontSize:13,fontWeight:600}}>{t.nom}</p>
                <p style={{margin:0,fontSize:11,color:C.textSec}}>{t.frequence==="daily"?"Chaque jour":t.frequence==="weekly"?"Hebdomadaire":"Ponctuelle"} · Priorité {t.priorite}</p>
              </div>
              {pendingTaskDelete === t.id ? (
                <div style={{display:"flex",gap:6}}>
                  <button onClick={() => deleteTask(t.id)} style={{padding:"6px 10px",background:C.danger,color:"#fff",border:"none",borderRadius:8,cursor:"pointer",fontSize:12,fontWeight:700}}>Supprimer ?</button>
                  <button onClick={() => setPendingTaskDelete(null)} style={{padding:"6px 10px",background:"transparent",border:`1px solid ${C.border}`,borderRadius:8,cursor:"pointer",fontSize:12}}>Annuler</button>
                </div>
              ) : (
                <button onClick={() => setPendingTaskDelete(t.id)} aria-label={`Supprimer la tâche ${t.nom}`} style={{padding:"6px",background:C.dangerLight,border:"none",borderRadius:8,cursor:"pointer",display:"flex",alignItems:"center"}}>
                  <span style={{fontSize:14}} aria-hidden="true">🗑️</span>
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
