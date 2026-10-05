// ═══════════════════════════════════════════════════════════════
//  PILLOT — Cartographie des équipements
//  Fichier : src/screens/EquipementSetup.jsx
// ═══════════════════════════════════════════════════════════════

import { useState, useEffect } from "react";
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
