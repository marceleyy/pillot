// ═══════════════════════════════════════════════════════════════
//  PILLOT — Données personnelles des employés (droits RGPD)
//  Fichier : src/screens/DonneesEmployes.jsx
//  Export CSV des données d'un employé (accès / portabilité) et
//  anonymisation d'un ancien employé (fonction anonymiser_employe,
//  supabase/migrations/20261005_04_rgpd.sql). Réservé aux responsables.
// ═══════════════════════════════════════════════════════════════

import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabase";
import { localDate } from "../lib/dates";

const C = {
  brand:"#2563EB",danger:"#DC2626",border:"#E2E8F0",surface:"#FFFFFF",bg:"#F1F5F9",
  text:"#0F172A",textSec:"#64748B",textMuted:"#94A3B8"
};
const overlay = {position:"fixed",inset:0,background:"rgba(15,23,42,.5)",zIndex:200,display:"flex",alignItems:"center",justifyContent:"center",padding:16};
const modalBox = {background:C.surface,borderRadius:16,padding:20,width:"100%",maxWidth:460,maxHeight:"90vh",overflowY:"auto",boxSizing:"border-box",boxShadow:"0 20px 50px rgba(0,0,0,.3)"};
const btn = {minHeight:36,padding:"0 10px",borderRadius:8,border:`1px solid ${C.border}`,background:"transparent",cursor:"pointer",fontSize:12,fontWeight:600};

function csvCell(v) {
  let s = v == null ? "" : typeof v === "object" ? JSON.stringify(v) : String(v);
  // Neutralise les formules à l'ouverture dans un tableur (= + - @)
  if (typeof v === "string" && /^[=+\-@\t\r]/.test(s)) s = "'" + s;
  return /[;"\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

// Une section par table : titre, puis en-têtes et lignes
function toCsv(sections) {
  const out = [];
  for (const [titre, rows] of sections) {
    out.push([titre]);
    if (!rows.length) { out.push(["(aucune donnée)"]); out.push([]); continue; }
    const cols = Object.keys(rows[0]);
    out.push(cols);
    rows.forEach(r => out.push(cols.map(c => r[c])));
    out.push([]);
  }
  return "﻿" + out.map(r => r.map(csvCell).join(";")).join("\r\n");
}

export default function DonneesEmployes({ restaurantId, toast, onClose, onChange }) {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(null);
  const [confirm, setConfirm] = useState(null);

  const load = useCallback(async () => {
    const { data, error } = await supabase.from("employees").select("*").eq("restaurant_id", restaurantId).order("nom");
    setLoading(false);
    if (error) { toast("Erreur de chargement des employés", "error"); return; }
    setEmployees(data || []);
  }, [restaurantId, toast]);

  useEffect(() => { load(); }, [load]);

  const exporter = async emp => {
    setBusy(emp.id);
    const [rPaie, rShifts, rPointages, rHisto] = await Promise.all([
      supabase.from("employees_paie").select("salaire_horaire,updated_at").eq("employee_id", emp.id),
      supabase.from("shifts").select("*").eq("employee_id", emp.id).eq("restaurant_id", restaurantId).order("date"),
      supabase.from("pointages").select("debut,fin,note,created_at").eq("employee_id", emp.id).eq("restaurant_id", restaurantId).order("debut"),
      supabase.from("pointages_historique").select("operation,avant,apres,modifie_le").eq("employee_id", emp.id).eq("restaurant_id", restaurantId).order("modifie_le"),
    ]);
    setBusy(null);
    // employees_paie peut ne pas exister si la migration 03 n'est pas jouée : section vide
    if (rShifts.error || rPointages.error) { toast("Erreur : export incomplet, réessayez", "error"); return; }
    const csv = toCsv([
      ["Fiche employé", [emp]],
      ["Rémunération", rPaie.error ? [] : rPaie.data || []],
      ["Planning", rShifts.data || []],
      ["Pointages", rPointages.data || []],
      ["Corrections de pointages", rHisto.error ? [] : rHisto.data || []],
    ]);
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    const nom = `${emp.nom || ""}_${emp.prenom || ""}`.replace(/[^\p{L}\p{N}_-]+/gu, "_");
    a.href = url; a.download = `donnees_${nom}_${localDate(new Date())}.csv`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast("Export téléchargé");
  };

  const anonymiser = async emp => {
    setConfirm(null);
    setBusy(emp.id);
    const { error } = await supabase.rpc("anonymiser_employe", { p_employee_id: emp.id });
    setBusy(null);
    if (error) {
      toast(error.code === "PGRST202" ? "Fonction absente : jouer la migration RGPD (voir README)" : "Erreur : l'employé n'a pas été anonymisé", "error");
      return;
    }
    toast("Employé anonymisé");
    await load();
    onChange?.();
  };

  return (
    <div style={overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={modalBox} role="dialog" aria-modal="true" aria-labelledby="donnees-titre">
        <p id="donnees-titre" style={{margin:"0 0 4px",fontSize:16,fontWeight:800}}>Données personnelles</p>
        <p style={{margin:"0 0 14px",fontSize:12,color:C.textSec}}>
          Pour répondre à une demande d'un salarié : exporter ses données (fiche, planning, pointages), ou anonymiser un ancien employé.
          Ses heures sont conservées sans son nom. Sans demande, les anciens employés sont anonymisés 3 ans après leur retrait.
        </p>
        {loading ? <p style={{fontSize:13,color:C.textMuted}}>Chargement...</p> :
          employees.length === 0 ? <p style={{fontSize:13,color:C.textMuted}}>Aucun employé.</p> :
          employees.map(emp => {
            const retire = emp.actif === false;
            const anonyme = emp.nom === "Ancien employé";
            return (
              <div key={emp.id} style={{display:"flex",alignItems:"center",gap:8,padding:"8px 0",borderTop:`1px solid ${C.border}`}}>
                <div style={{flex:1,minWidth:0}}>
                  <p style={{margin:0,fontSize:14,fontWeight:600,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{`${emp.prenom || ""} ${emp.nom || ""}`.trim()}</p>
                  <p style={{margin:0,fontSize:11,color:C.textMuted}}>{anonyme ? "Anonymisé" : retire ? "Retiré du planning" : "Actif"}</p>
                </div>
                <button onClick={() => exporter(emp)} disabled={busy === emp.id} style={btn}>Exporter</button>
                {retire && !anonyme && (confirm === emp.id
                  ? <button onClick={() => anonymiser(emp)} disabled={busy === emp.id} style={{...btn,background:C.danger,color:"#fff",border:"none"}}>Confirmer</button>
                  : <button onClick={() => setConfirm(emp.id)} disabled={busy === emp.id} style={{...btn,color:C.danger}}>Anonymiser</button>)}
              </div>
            );
          })}
        <button onClick={onClose} style={{marginTop:14,width:"100%",minHeight:44,borderRadius:8,border:`1px solid ${C.border}`,background:"transparent",cursor:"pointer",fontSize:14}}>Fermer</button>
      </div>
    </div>
  );
}
