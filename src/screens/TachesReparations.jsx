// Tâches et réparations : les tâches ponctuelles du commerce (réparation, entretien,
// achat, déco…), hors check-list du jour. Statuts Créée → En cours → Réalisée,
// chacun tracé par la base (qui, quand). Table taches_reparations.
import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";
import { C, Card, Icon } from "../ui";
import { jourLocal, enRetard } from "../lib/taches";

const CATEGORIES = { salle: "Salle", cuisine: "Cuisine", reparation: "Réparation", entretien: "Entretien", deco: "Déco", achat: "Achat" };
const PRIORITES = { urgente: "Urgente", normale: "Normale", quand_possible: "Quand possible" };
const STATUTS = { creee: "Créée", en_cours: "En cours", realisee: "Réalisée" };
const PRIO_COUL = { urgente: C.danger, normale: C.brand, quand_possible: C.textMuted };
const PRIO_RANG = { urgente: 0, normale: 1, quand_possible: 2 };
const RELANCES = [["Non", 0], ["Dans 1 semaine", 7], ["Dans 1 mois", 30], ["Dans 3 mois", 90]];

const aujourdhui = () => jourLocal();
// « 1 mois » du 31 janvier : 28 ou 29 février (jamais début mars).
const plusJours = (s, n) => {
  const x = new Date((s || aujourdhui()) + "T12:00");
  if (n === 30 || n === 90) { const j = x.getDate(); x.setDate(1); x.setMonth(x.getMonth() + n / 30); x.setDate(Math.min(j, new Date(x.getFullYear(), x.getMonth() + 1, 0).getDate())); }
  else x.setDate(x.getDate() + n);
  return jourLocal(x);
};
const fmtJour = s => new Date(s + "T12:00").toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" });
const fmtQuand = s => new Date(s).toLocaleString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
const trier = (a, b) => (enRetard(b) - enRetard(a)) || (PRIO_RANG[a.priorite] - PRIO_RANG[b.priorite]) || ((a.echeance || "9999") < (b.echeance || "9999") ? -1 : (a.echeance || "9999") > (b.echeance || "9999") ? 1 : 0);
const VIDE = { titre: "", categorie: "salle", priorite: "normale", echeance: "", assignee_id: "", detail: "" };
const COLS = "id,titre,categorie,priorite,echeance,assignee_id,assignee_nom,detail,statut,historique,realisee_le,created_at";

const lbl = { fontSize: 11, fontWeight: 600, color: C.textSec, display: "block", marginBottom: 4, textTransform: "uppercase", letterSpacing: ".5px" };
const champ = { width: "100%", boxSizing: "border-box", padding: "9px 12px", borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 14, background: "#FFFFFF0F" };
const btn = (fond, texte = "#fff") => ({ padding: "8px 14px", background: fond, color: texte, border: fond === "transparent" ? `1px solid ${C.border}` : "none", borderRadius: 9, fontSize: 13, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" });

function Fenetre({ children, onFermer }) {
  return <div onClick={onFermer} style={{position:"fixed",inset:0,background:"rgba(14,9,11,.62)",backdropFilter:"blur(14px)",WebkitBackdropFilter:"blur(14px)",zIndex:200,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
    <div onClick={e => e.stopPropagation()} role="dialog" style={{background:C.surface,borderRadius:16,padding:22,width:"100%",maxWidth:440,maxHeight:"90vh",overflowY:"auto",boxShadow:"0 20px 50px rgba(0,0,0,.3)"}}>{children}</div>
  </div>;
}

export default function TachesReparations({ restaurantId, profileId, toast, gerant }) {
  const [taches, setTaches] = useState([]), [loading, setLoading] = useState(true);
  const [onglet, setOnglet] = useState("afaire"), [cat, setCat] = useState(""), [miennes, setMiennes] = useState(!gerant);
  const [membres, setMembres] = useState([]);
  const [form, setForm] = useState(null); // tâche en création / modification
  const [ouverte, setOuverte] = useState(null); // tâche affichée en détail
  const [relance, setRelance] = useState(null); // tâche réalisée : proposer la suivante
  const [occupe, setOccupe] = useState(false);

  const charger = async () => {
    if (!restaurantId) return;
    const { data, error } = await supabase.from("taches_reparations").select(COLS).eq("restaurant_id", restaurantId).order("created_at", { ascending: false });
    if (error) toast("Impossible de lire les tâches", "error");
    setTaches(data || []); setLoading(false);
  };
  useEffect(() => { setLoading(true); charger(); }, [restaurantId]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!gerant || !restaurantId) return;
    supabase.rpc("membres_du_commerce").then(({ data }) => setMembres(data || []));
  }, [gerant, restaurantId]);

  const peutAvancer = t => gerant || t.assignee_id === profileId;
  const visibles = useMemo(() => taches
    .filter(t => onglet === "afaire" ? t.statut !== "realisee" : t.statut === "realisee")
    .filter(t => !cat || t.categorie === cat)
    .filter(t => !miennes || t.assignee_id === profileId)
    .sort(onglet === "afaire" ? trier : (a, b) => String(b.realisee_le).localeCompare(String(a.realisee_le))), [taches, onglet, cat, miennes, profileId]);
  const nbAFaire = taches.filter(t => t.statut !== "realisee").length, nbRetard = taches.filter(enRetard).length;

  const remplacer = t => { setTaches(prev => prev.map(x => x.id === t.id ? t : x)); setOuverte(o => o?.id === t.id ? t : o); };

  const changerStatut = async (t, statut) => {
    if (occupe) return;
    setOccupe(true);
    const { data, error } = await supabase.rpc("changer_statut_tache", { p_tache: t.id, p_statut: statut });
    setOccupe(false);
    if (error || !data) { toast("Statut non enregistré", "error"); return; }
    remplacer(data);
    toast(statut === "realisee" ? "Tâche réalisée" : statut === "en_cours" ? "Tâche démarrée" : "Tâche rouverte");
    if (statut === "realisee" && gerant && t.statut !== "realisee") { setOuverte(null); setRelance(data); }
  };

  const enregistrer = async () => {
    const titre = form.titre.trim();
    if (!titre || occupe) return;
    setOccupe(true);
    const champs = { titre, categorie: form.categorie, priorite: form.priorite, echeance: form.echeance || null, assignee_id: form.assignee_id || null, detail: form.detail.trim() || null };
    const req = form.id
      ? supabase.from("taches_reparations").update(champs).eq("id", form.id).select(COLS).single()
      : supabase.from("taches_reparations").insert({ restaurant_id: restaurantId, ...champs }).select(COLS).single();
    const { data, error } = await req;
    setOccupe(false);
    if (error || !data) { toast("Tâche non enregistrée", "error"); return; }
    if (form.id) remplacer(data); else setTaches(prev => [data, ...prev]);
    toast(form.id ? "Tâche modifiée" : "Tâche créée"); setForm(null);
  };

  const supprimer = async t => {
    if (!window.confirm(`Supprimer « ${t.titre} » ? Son historique sera perdu.`)) return;
    const { error } = await supabase.from("taches_reparations").delete().eq("id", t.id);
    if (error) { toast("Suppression impossible", "error"); return; }
    setTaches(prev => prev.filter(x => x.id !== t.id)); setOuverte(null); toast("Tâche supprimée");
  };

  const reprogrammer = async jours => {
    const t = relance; setRelance(null);
    if (!jours || !t) return;
    const { data, error } = await supabase.from("taches_reparations").insert({
      restaurant_id: restaurantId, titre: t.titre, categorie: t.categorie, priorite: t.priorite,
      echeance: plusJours(t.echeance && t.echeance > aujourdhui() ? t.echeance : aujourdhui(), jours),
      // Personne partie de l'équipe : la suivante n'est assignée à personne.
      assignee_id: membres.some(m => m.profile_id === t.assignee_id) ? t.assignee_id : null, detail: t.detail,
    }).select(COLS).single();
    if (error || !data) { toast("Tâche suivante non créée", "error"); return; }
    setTaches(prev => [data, ...prev]); toast(`Prochaine fois : ${fmtJour(data.echeance)}`);
  };

  const ouvrirForm = t => setForm(t ? { id: t.id, titre: t.titre, categorie: t.categorie, priorite: t.priorite, echeance: t.echeance || "", assignee_id: t.assignee_id || "", detail: t.detail || "" } : { ...VIDE });

  if (loading) return <div style={{padding:40,textAlign:"center",color:C.textMuted}}>Chargement...</div>;

  const derniere = t => (t.historique || []).slice(-1)[0];
  const boutonsStatut = t => peutAvancer(t) && <div style={{display:"flex",gap:6,flexShrink:0}} onClick={e => e.stopPropagation()}>
    {t.statut === "creee" && <button disabled={occupe} onClick={() => changerStatut(t, "en_cours")} style={btn("transparent", C.text)}>Démarrer</button>}
    {t.statut !== "realisee" && <button disabled={occupe} onClick={() => changerStatut(t, "realisee")} style={btn(C.success)}>Réalisée</button>}
    {t.statut === "realisee" && gerant && <button disabled={occupe} onClick={() => changerStatut(t, "en_cours")} style={btn("transparent", C.text)}>Rouvrir</button>}
  </div>;

  return <div>
    {form && <Fenetre onFermer={() => setForm(null)}>
      <h3 style={{margin:"0 0 14px",fontSize:16,fontWeight:800}}>{form.id ? "Modifier la tâche" : "Nouvelle tâche"}</h3>
      <div style={{display:"flex",flexDirection:"column",gap:10,marginBottom:14}}>
        <div><label style={lbl} htmlFor="tr-titre">Titre</label><input id="tr-titre" autoFocus value={form.titre} maxLength={200} onChange={e => setForm(f => ({ ...f, titre: e.target.value }))} placeholder="Ex : réparer la porte de la chambre froide" style={champ}/></div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
          <div><label style={lbl} htmlFor="tr-cat">Catégorie</label><select id="tr-cat" value={form.categorie} onChange={e => setForm(f => ({ ...f, categorie: e.target.value }))} style={champ}>{Object.entries(CATEGORIES).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></div>
          <div><label style={lbl} htmlFor="tr-ech">Échéance</label><input id="tr-ech" type="date" value={form.echeance} onChange={e => setForm(f => ({ ...f, echeance: e.target.value }))} style={champ}/></div>
        </div>
        <div><span style={lbl}>Priorité</span><div style={{display:"flex",gap:6}}>
          {Object.entries(PRIORITES).map(([k, l]) => <button key={k} type="button" onClick={() => setForm(f => ({ ...f, priorite: k }))} style={{flex:1,padding:"7px 6px",borderRadius:8,border:`1.5px solid ${form.priorite===k?PRIO_COUL[k]:C.border}`,background:form.priorite===k?PRIO_COUL[k]+"15":"transparent",fontSize:12,fontWeight:form.priorite===k?700:500,color:form.priorite===k?PRIO_COUL[k]:C.textSec,cursor:"pointer"}}>{l}</button>)}
        </div></div>
        <div><label style={lbl} htmlFor="tr-qui">Assignée à</label><select id="tr-qui" value={form.assignee_id} onChange={e => setForm(f => ({ ...f, assignee_id: e.target.value }))} style={champ}>
          <option value="">Personne</option>{membres.map(m => <option key={m.profile_id} value={m.profile_id}>{m.name || m.email}</option>)}
        </select></div>
        <div><label style={lbl} htmlFor="tr-det">Détail</label><textarea id="tr-det" rows={3} maxLength={2000} value={form.detail} onChange={e => setForm(f => ({ ...f, detail: e.target.value }))} placeholder="Ce qu'il faut faire, qui appeler, référence de pièce…" style={{...champ,resize:"vertical"}}/></div>
      </div>
      <div style={{display:"flex",gap:8}}>
        <button onClick={enregistrer} disabled={occupe || !form.titre.trim()} style={{...btn(form.titre.trim() ? C.brand : "#FFFFFF1F", form.titre.trim() ? "#fff" : C.textMuted),flex:1,padding:11}}>{occupe ? "..." : form.id ? "Enregistrer" : "Créer la tâche"}</button>
        <button onClick={() => setForm(null)} style={btn("transparent", C.text)}>Annuler</button>
      </div>
    </Fenetre>}

    {relance && <Fenetre onFermer={() => setRelance(null)}>
      <h3 style={{margin:"0 0 6px",fontSize:16,fontWeight:800}}>Reprogrammer la suivante ?</h3>
      <p style={{margin:"0 0 14px",fontSize:13,color:C.textSec}}>« {relance.titre} » est réalisée. Pour une tâche qui revient (dégivrage, filtre de hotte…), créez la prochaine tout de suite.</p>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>{RELANCES.map(([l, j]) => <button key={l} onClick={() => reprogrammer(j)} style={btn(j ? C.brand : "transparent", j ? "#fff" : C.text)}>{l}</button>)}</div>
    </Fenetre>}

    {ouverte && <Fenetre onFermer={() => setOuverte(null)}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:10,marginBottom:10}}>
        <h3 style={{margin:0,fontSize:16,fontWeight:800}}>{ouverte.titre}</h3>
        <button onClick={() => setOuverte(null)} aria-label="Fermer" style={{background:"none",border:"none",cursor:"pointer",color:C.textMuted}}><Icon n="x" sz={18}/></button>
      </div>
      <p style={{margin:"0 0 10px",fontSize:12,color:C.textSec}}>{[CATEGORIES[ouverte.categorie], PRIORITES[ouverte.priorite], ouverte.echeance && `pour le ${fmtJour(ouverte.echeance)}`, ouverte.assignee_nom && `assignée à ${ouverte.assignee_nom}`].filter(Boolean).join(" · ")}</p>
      {ouverte.detail && <p style={{margin:"0 0 12px",fontSize:13,whiteSpace:"pre-wrap",background:"#FFFFFF0A",padding:"10px 12px",borderRadius:8}}>{ouverte.detail}</p>}
      <p style={{...lbl,marginTop:4}}>Historique</p>
      <div style={{marginBottom:14}}>{(ouverte.historique || []).map((h, i) => <div key={i} style={{display:"flex",gap:8,fontSize:12,padding:"5px 0",borderBottom:`1px solid ${C.border}`}}>
        <span style={{fontWeight:700,minWidth:68}}>{STATUTS[h.statut] || h.statut}</span><span style={{flex:1,color:C.textSec}}>{h.nom}</span><span style={{color:C.textMuted}}>{h.le ? fmtQuand(h.le) : ""}</span>
      </div>)}</div>
      <div style={{display:"flex",gap:6,flexWrap:"wrap",justifyContent:"space-between"}}>
        {boutonsStatut(ouverte) || <span/>}
        {gerant && <div style={{display:"flex",gap:6}}>
          <button onClick={() => { const t = ouverte; setOuverte(null); ouvrirForm(t); }} style={btn("transparent", C.text)}>Modifier</button>
          <button onClick={() => supprimer(ouverte)} style={btn(C.dangerLight, C.danger)}>Supprimer</button>
        </div>}
      </div>
    </Fenetre>}

    <div style={{marginBottom:18,display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:10,flexWrap:"wrap"}}>
      <div>
        <h1 style={{margin:0,fontSize:22,fontWeight:800,letterSpacing:"-.5px"}}>Tâches et réparations</h1>
        <p style={{margin:"4px 0 0",fontSize:14,color:C.textSec}}>{nbAFaire} à faire{nbRetard ? ` · ${nbRetard} en retard` : ""}</p>
      </div>
      {gerant && <button onClick={() => ouvrirForm(null)} style={btn(C.brand)}>+ Tâche</button>}
    </div>

    <div style={{display:"flex",gap:4,background:"#FFFFFF14",padding:4,borderRadius:10,marginBottom:10}}>
      {[["afaire", `À faire (${nbAFaire})`], ["realisees", "Réalisées"]].map(([k, l]) => <button key={k} onClick={() => setOnglet(k)} style={{flex:1,padding:"7px 10px",borderRadius:8,border:"none",fontSize:13,fontWeight:600,cursor:"pointer",background:onglet===k?C.surface:"transparent",color:onglet===k?C.text:C.textSec,boxShadow:onglet===k?"0 1px 4px rgba(0,0,0,.1)":"none"}}>{l}</button>)}
    </div>
    <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:14}}>
      {[["", "Toutes"], ...Object.entries(CATEGORIES)].map(([k, l]) => <button key={k || "toutes"} onClick={() => setCat(k)} style={{padding:"5px 11px",borderRadius:20,border:`1px solid ${cat===k?C.brand:C.border}`,background:cat===k?C.brandLight:C.surface,color:cat===k?C.brand:C.textSec,fontSize:12,fontWeight:600,cursor:"pointer"}}>{l}</button>)}
      <label style={{display:"flex",alignItems:"center",gap:6,fontSize:12,color:C.textSec,marginLeft:"auto",cursor:"pointer"}}><input type="checkbox" checked={miennes} onChange={e => setMiennes(e.target.checked)}/>Mes tâches</label>
    </div>

    <Card style={{overflow:"hidden"}}>
      {visibles.length === 0
        ? <p style={{padding:32,textAlign:"center",color:C.textMuted,margin:0,fontSize:13}}>{onglet === "afaire" ? "Rien à faire pour le moment." : "Aucune tâche réalisée."}</p>
        : visibles.map((t, i) => {
          const retard = enRetard(t), d = derniere(t);
          return <div key={t.id} onClick={() => setOuverte(t)} style={{padding:"12px 16px",borderBottom:i<visibles.length-1?`1px solid ${C.border}`:"none",display:"flex",alignItems:"center",gap:12,cursor:"pointer",flexWrap:"wrap"}}>
            <span style={{width:9,height:9,borderRadius:"50%",background:retard?C.danger:PRIO_COUL[t.priorite],flexShrink:0}}/>
            <div style={{flex:1,minWidth:160}}>
              <p style={{margin:0,fontSize:14,fontWeight:600}}>{t.titre}</p>
              <p style={{margin:"2px 0 0",fontSize:11,color:C.textSec}}>
                {CATEGORIES[t.categorie]}
                {t.priorite !== "normale" && <> · <span style={{color:PRIO_COUL[t.priorite],fontWeight:600}}>{PRIORITES[t.priorite]}</span></>}
                {t.statut !== "realisee" && t.echeance && <> · <span style={{color:retard?C.danger:C.textSec,fontWeight:retard?700:400}}>{retard ? "En retard, " : ""}pour le {fmtJour(t.echeance)}</span></>}
                {t.assignee_nom && ` · ${t.assignee_nom}`}
                {t.statut === "en_cours" && <> · <span style={{color:C.warning,fontWeight:600}}>En cours</span></>}
                {t.statut === "realisee" && d && ` · par ${d.nom}, ${fmtQuand(d.le)}`}
              </p>
            </div>
            {boutonsStatut(t)}
          </div>;
        })}
    </Card>
  </div>;
}
