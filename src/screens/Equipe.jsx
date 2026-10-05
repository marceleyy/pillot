// ═══════════════════════════════════════════════════════════════
//  PILLOT — Équipe : membres du restaurant et invitations
//  Fichier : src/screens/Equipe.jsx
// ═══════════════════════════════════════════════════════════════

import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabase";

const C = {
  brand:"#2563EB", brandLight:"#EFF6FF",
  success:"#16A34A", successLight:"#F0FDF4",
  warning:"#B45309", warningLight:"#FFFBEB",
  danger:"#DC2626", dangerLight:"#FEF2F2",
  purple:"#7C3AED", purpleLight:"#F5F3FF",
  border:"#E2E8F0", surface:"#FFFFFF", bg:"#F1F5F9",
  text:"#0F172A", textSec:"#64748B", textMuted:"#64748B",
};

const ROLE_LABELS = { owner:"Gérant", admin:"Administrateur", manager:"Manager", employee:"Employé" };
const ROLE_COLORS = { owner:[C.purple, C.purpleLight], admin:[C.purple, C.purpleLight], manager:[C.brand, C.brandLight], employee:[C.success, C.successLight] };
const ROLE_ORDER = { owner:0, admin:1, manager:2, employee:3 };
const NOT_DEPLOYED = "Invitations pas encore activées : déployer la fonction invite-employe (voir README)";
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const labelSt = { fontSize:11, fontWeight:600, color:C.textMuted, display:"block", marginBottom:4, textTransform:"uppercase", letterSpacing:".06em" };
const inputSt = { width:"100%", boxSizing:"border-box", padding:"10px 12px", borderRadius:9, border:`1.5px solid ${C.border}`, fontSize:16, background:C.surface, color:C.text };

function Card({ children, style = {} }) {
  return <div style={{ background:C.surface, borderRadius:14, border:`1px solid ${C.border}`, boxShadow:"0 1px 4px rgba(0,0,0,.04)", ...style }}>{children}</div>;
}

// Appel de la fonction ; lève une erreur au message lisible
async function invite(body) {
  const { data, error } = await supabase.functions.invoke("invite-employe", { body });
  if (!error) {
    if (data?.ok) return data;
    throw new Error(data?.error || "Réponse inattendue du service");
  }
  const res = error.context;
  // Fonction absente : 404, ou échec réseau (la réponse 404 de la passerelle n'a pas les en-têtes CORS)
  if (error.name === "FunctionsFetchError" || error.name === "FunctionsRelayError" || res?.status === 404) throw new Error(NOT_DEPLOYED);
  let msg = null;
  try { msg = (await res.json())?.error; } catch { /* corps non JSON */ }
  throw new Error(msg || `Erreur ${res?.status || "inconnue"}`);
}

export default function Equipe({ restaurantId, role, toast }) {
  const [membres, setMembres] = useState([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [newRole, setNewRole] = useState("employee");
  const [sending, setSending] = useState(false);
  const [notice, setNotice] = useState(null); // message persistant (fonction non déployée)

  const canInvite = ["owner", "manager", "admin"].includes(role);
  const canInviteManager = role === "owner" || role === "admin";

  const load = useCallback(async () => {
    if (!restaurantId) { setMembres([]); setLoading(false); return; }
    const { data, error } = await supabase.from("profiles").select("id,email,role").eq("restaurant_id", restaurantId);
    if (error) toast("Erreur de chargement de l'équipe", "error");
    setMembres((data || []).slice().sort((a, b) => (ROLE_ORDER[a.role] ?? 9) - (ROLE_ORDER[b.role] ?? 9) || String(a.email || "").localeCompare(String(b.email || ""))));
    setLoading(false);
  }, [restaurantId, toast]);

  useEffect(() => { load(); }, [load]);

  const submit = async (e) => {
    e.preventDefault();
    if (sending) return;
    const mail = email.trim().toLowerCase();
    if (!EMAIL_RE.test(mail)) { toast("Adresse e-mail invalide", "error"); return; }
    if (membres.some(m => String(m.email || "").toLowerCase() === mail)) { toast("Cette personne fait déjà partie de l'équipe", "error"); return; }
    const r = canInviteManager ? newRole : "employee";
    setSending(true);
    try {
      await invite({ email: mail, role: r, redirect_to: window.location.origin });
      toast(`Invitation envoyée à ${mail}`);
      setEmail(""); setNewRole("employee"); setNotice(null);
      await load();
    } catch (err) {
      if (err.message === NOT_DEPLOYED) setNotice(NOT_DEPLOYED);
      toast(err.message, "error");
    }
    setSending(false);
  };

  if (!restaurantId) return (
    <Card style={{ padding:"32px 20px", textAlign:"center" }}>
      <p style={{ margin:0, fontSize:14, color:C.textSec }}>Aucun restaurant n'est rattaché à ce compte.</p>
    </Card>
  );

  return (
    <div>
      <div style={{ marginBottom:18 }}>
        <h2 style={{ margin:0, fontSize:18, fontWeight:700, letterSpacing:"-.02em" }}>Équipe</h2>
        <p style={{ margin:"3px 0 0", fontSize:13, color:C.textSec }}>{membres.length} membre{membres.length > 1 ? "s" : ""}</p>
      </div>

      {canInvite && (
        <Card style={{ padding:"16px 16px 18px", marginBottom:16 }}>
          <h3 style={{ margin:"0 0 4px", fontSize:15, fontWeight:700 }}>Inviter un membre</h3>
          <p style={{ margin:"0 0 14px", fontSize:13, color:C.textSec }}>La personne reçoit un e-mail pour créer son mot de passe et rejoint votre restaurant.</p>
          {notice && (
            <div role="status" style={{ background:C.warningLight, border:"1px solid #FDE68A", borderRadius:10, padding:"10px 14px", marginBottom:14 }}>
              <p style={{ margin:0, fontSize:13, color:C.warning }}>{notice}</p>
            </div>
          )}
          <form onSubmit={submit} style={{ display:"flex", flexDirection:"column", gap:12 }}>
            <div>
              <label htmlFor="equipe-email" style={labelSt}>E-mail</label>
              <input id="equipe-email" type="email" autoComplete="off" autoCapitalize="none" value={email} onChange={e => setEmail(e.target.value)} placeholder="prenom@exemple.fr" style={inputSt} required/>
            </div>
            {canInviteManager && (
              <div>
                <span style={labelSt}>Rôle</span>
                <div role="radiogroup" aria-label="Rôle" style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
                  {[["employee","Employé","Inventaire, HACCP, tâches"],["manager","Manager","Gestion complète, invite des employés"]].map(([k, l, d]) => (
                    <button key={k} type="button" role="radio" aria-checked={newRole === k} onClick={() => setNewRole(k)}
                      style={{ padding:"10px 12px", borderRadius:10, textAlign:"left", cursor:"pointer", border:`1.5px solid ${newRole === k ? C.brand : C.border}`, background:newRole === k ? C.brandLight : "transparent" }}>
                      <p style={{ margin:0, fontSize:14, fontWeight:600, color:newRole === k ? C.brand : C.text }}>{l}</p>
                      <p style={{ margin:"2px 0 0", fontSize:11, color:C.textSec }}>{d}</p>
                    </button>
                  ))}
                </div>
              </div>
            )}
            <button type="submit" disabled={sending || !email.trim()}
              style={{ padding:12, background:sending || !email.trim() ? "#E2E8F0" : C.brand, color:sending || !email.trim() ? C.textMuted : "#fff", border:"none", borderRadius:10, fontSize:14, fontWeight:600, cursor:sending || !email.trim() ? "default" : "pointer" }}>
              {sending ? "Envoi..." : "Envoyer l'invitation"}
            </button>
          </form>
        </Card>
      )}

      {loading ? <p style={{ textAlign:"center", color:C.textMuted, padding:32 }}>Chargement...</p> : (
        <Card style={{ overflow:"hidden" }}>
          {membres.length === 0 && <p style={{ margin:0, padding:"24px 16px", fontSize:13, color:C.textSec, textAlign:"center" }}>Aucun membre pour le moment.</p>}
          {membres.map((m, i) => {
            const [fg, bg] = ROLE_COLORS[m.role] || [C.textSec, C.bg];
            const initiale = String(m.email || "?").charAt(0).toUpperCase();
            return (
              <div key={m.id} style={{ display:"flex", alignItems:"center", gap:12, padding:"12px 16px", borderTop:i ? `1px solid ${C.border}` : "none" }}>
                <div style={{ width:36, height:36, borderRadius:10, background:bg, color:fg, display:"flex", alignItems:"center", justifyContent:"center", fontSize:14, fontWeight:700, flexShrink:0 }}>{initiale}</div>
                <p style={{ margin:0, flex:1, minWidth:0, fontSize:14, fontWeight:500, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{m.email || "—"}</p>
                <span style={{ fontSize:11, fontWeight:600, color:fg, background:bg, padding:"3px 8px", borderRadius:6, flexShrink:0 }}>{ROLE_LABELS[m.role] || m.role || "Employé"}</span>
              </div>
            );
          })}
        </Card>
      )}
    </div>
  );
}
