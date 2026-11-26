// Blocs du tableau de bord : compteurs, actions prioritaires, prochaine échéance,
// accès rapides, calendrier des échéances, état du stock et aperçu des achats.
// Lecture seule, sauf la case « réalisée » des actions prioritaires (RPC changer_statut_tache).
import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";
import { C, Card, Icon, gst, fmtPrix, valeurProduits } from "../ui";
import { jourLocal, enRetard } from "../lib/taches";

const PRIO = { urgente: { l: "Urgente", c: C.danger, bg: C.dangerLight }, normale: { l: "Normale", c: C.brand, bg: C.brandLight }, quand_possible: { l: "Quand possible", c: C.textSec, bg: "#F1F5F9" } };
const PRIO_RANG = { urgente: 0, normale: 1, quand_possible: 2 };
const trier = (a, b) => (enRetard(b) - enRetard(a)) || (PRIO_RANG[a.priorite] - PRIO_RANG[b.priorite]) || (a.echeance || "9999").localeCompare(b.echeance || "9999");
const jour = s => new Date(s + "T12:00");
const plusJours = (s, n) => { const d = jour(s); d.setDate(d.getDate() + n); return jourLocal(d); };
const fmtCourt = s => jour(s).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
const fmtLong = s => jour(s).toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "long", year: "numeric" });
const fmtAvant = s => jour(s).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });
// DLC « à surveiller » : périmées ou dans les DLC_JOURS prochains jours (compteur et calendrier).
export const DLC_JOURS = 3;
const pluriel = (n, mot) => `${n} ${mot}${n > 1 ? "s" : ""}`;

const SANS_COMMERCE = { taches: [], dlc: [], tasks: null, comp: null, shifts: null, employes: null, equip: null, temp: null, achats: [] };

// ── Données ───────────────────────────────────────────────────
// Une lecture par source ; une source en erreur reste vide (et le bloc le dit) sans bloquer les autres.
export function useTableauDeBord({ restaurantId, gerant, modules }) {
  const [d, setD] = useState(null), [version, setVersion] = useState(0);
  useEffect(() => {
    if (!restaurantId) return;
    let fini = false;
    const auj = jourLocal(), debutAnnee = `${auj.slice(0, 4)}-01-01`;
    const debutJour = new Date(); debutJour.setHours(0, 0, 0, 0);
    const vide = Promise.resolve({ data: [], error: null, off: true });
    Promise.all([
      modules.reparations !== false ? supabase.from("taches_reparations").select("id,titre,categorie,priorite,echeance,statut,assignee_id,assignee_nom").eq("restaurant_id", restaurantId).neq("statut", "realisee") : vide,
      modules.haccp !== false ? supabase.from("dlc_entries").select("id,product_nom,dlc_date,quantite,unite").eq("restaurant_id", restaurantId).eq("statut", "actif").lte("dlc_date", plusJours(auj, 60)).order("dlc_date") : vide,
      modules.taches !== false ? supabase.from("tasks").select("id,frequence,jours_semaine,created_at").eq("restaurant_id", restaurantId).eq("actif", true) : vide,
      modules.taches !== false ? supabase.from("task_completions").select("task_id").eq("restaurant_id", restaurantId).eq("date", auj) : vide,
      modules.planning !== false ? supabase.from("shifts").select("employee_id,heure_debut,heure_fin,type_nom").eq("restaurant_id", restaurantId).eq("date", auj).eq("repos", false).order("heure_debut") : vide,
      modules.planning !== false ? supabase.from("employees").select("id,nom,prenom").eq("restaurant_id", restaurantId) : vide,
      modules.haccp !== false ? supabase.from("equipements").select("nom,temp_min,temp_max").eq("restaurant_id", restaurantId).eq("actif", true) : vide,
      modules.haccp !== false ? supabase.from("temperature_logs").select("equipement,temperature,temperature_min,temperature_max").eq("restaurant_id", restaurantId).gte("created_at", debutJour.toISOString()) : vide,
      gerant ? supabase.from("scanned_invoices").select("fournisseur,total_ht,date_facture").eq("restaurant_id", restaurantId).gte("date_facture", debutAnnee).lte("date_facture", auj) : vide,
    ]).then(([taches, dlc, tasks, comp, shifts, employes, equip, temp, achats]) => {
      if (fini) return;
      [taches, dlc, tasks, comp, shifts, employes, equip, temp, achats].forEach(r => r.error && console.warn("Tableau de bord : lecture incomplète", r.error.message));
      const lu = r => r.off ? null : r.error ? undefined : (r.data || []);
      setD({ taches: lu(taches), dlc: lu(dlc), tasks: lu(tasks), comp: lu(comp), shifts: lu(shifts), employes: lu(employes), equip: lu(equip), temp: lu(temp), achats: lu(achats) });
    }).catch(e => { console.warn("Tableau de bord indisponible", e); if (!fini) setD({}); });
    return () => { fini = true; };
  }, [restaurantId, gerant, modules.reparations, modules.haccp, modules.taches, modules.planning, version]);
  // Sans commerce ouvert (compte admin) : rien à lire.
  return [restaurantId ? d : SANS_COMMERCE, () => setVersion(v => v + 1)];
}

// Check-list du jour : tâches prévues aujourd'hui (pas avant leur création) et faites.
export function checklistDuJour(tasks, comp) {
  if (!tasks || !comp) return null;
  const auj = jourLocal(), dow = jour(auj).getDay() || 7;
  const prevues = tasks.filter(t => (!t.created_at || jourLocal(t.created_at) <= auj) && (t.frequence === "daily" || (t.frequence === "weekly" && (t.jours_semaine || []).includes(dow))));
  const faites = new Set(comp.map(c => c.task_id));
  return { prevu: prevues.length, fait: prevues.filter(t => faites.has(t.id)).length };
}

// Événements datés : échéances des tâches et DLC.
export function evenements(d) {
  const auj = jourLocal(), ev = [];
  (d?.taches || []).filter(t => t.echeance).forEach(t => ev.push({ id: "t" + t.id, date: t.echeance, titre: t.titre, type: "Échéance", tab: "reparations", ton: enRetard(t) ? "rouge" : t.priorite === "urgente" ? "orange" : "bleu" }));
  (d?.dlc || []).forEach(x => ev.push({ id: "d" + x.id, date: x.dlc_date, titre: `DLC : ${x.product_nom}`, type: "DLC", tab: "haccp", ton: x.dlc_date < auj ? "rouge" : x.dlc_date <= plusJours(auj, DLC_JOURS) ? "orange" : "vert" }));
  return ev.sort((a, b) => a.date.localeCompare(b.date));
}
const TONS = { rouge: { c: C.danger, bg: C.dangerLight }, orange: { c: "#B45309", bg: "#FEF3C7" }, bleu: { c: C.brandDark, bg: C.brandLight }, vert: { c: "#047857", bg: "#ECFDF5" } };

// ── Petits éléments ───────────────────────────────────────────
function Titre({ icon, children, droite }) {
  return <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:8,marginBottom:12}}>
    <div style={{display:"flex",alignItems:"center",gap:8}}><Icon n={icon} sz={16} c={C.brand}/><h2 style={{margin:0,fontSize:15,fontWeight:700,color:C.text}}>{children}</h2></div>
    {droite}
  </div>;
}
const Badge = ({ c, bg, children }) => <span style={{display:"inline-block",padding:"2px 7px",borderRadius:5,background:bg,color:c,fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:".4px",whiteSpace:"nowrap"}}>{children}</span>;
const Lien = ({ onClick, children }) => <button onClick={onClick} style={{alignSelf:"flex-start",marginTop:12,padding:"6px 12px",borderRadius:8,border:`1px solid ${C.border}`,background:C.surface,fontSize:12,fontWeight:600,color:C.text,cursor:"pointer"}}>{children}</button>;
const Bloc = ({ children, style }) => <Card style={{padding:"16px 18px",display:"flex",flexDirection:"column",...style}}>{children}</Card>;
const Vide = ({ children }) => <p style={{margin:"4px 0",fontSize:13,color:C.textMuted}}>{children}</p>;

// ── Compteurs ─────────────────────────────────────────────────
export function Compteurs({ items }) {
  return <div className="pd-compteurs">
    {items.map(k => <Card key={k.id} onClick={k.tab ? k.onClick : undefined} style={{padding:"14px 16px"}}>
      <p style={{margin:0,fontSize:28,fontWeight:800,lineHeight:1,color:k.valeur > 0 ? k.couleur : C.textMuted}}>{k.valeur ?? "–"}</p>
      <p style={{margin:"8px 0 0",fontSize:10.5,fontWeight:700,color:C.textSec,textTransform:"uppercase",letterSpacing:".5px",lineHeight:1.35}}>{k.label}</p>
      {k.sous && <p style={{margin:"2px 0 0",fontSize:11,color:C.textMuted}}>{k.sous}</p>}
    </Card>)}
  </div>;
}

// ── Actions prioritaires ──────────────────────────────────────
export function ActionsPrioritaires({ taches, gerant, profileId, onTab, toast, onChange }) {
  const [busy, setBusy] = useState(null), [faites, setFaites] = useState([]);
  if (taches === null) return <Bloc><Titre icon="target">Actions prioritaires</Titre><Vide>Chargement…</Vide></Bloc>;
  if (taches === undefined) return <Bloc><Titre icon="target">Actions prioritaires</Titre><Vide>Tâches indisponibles pour le moment.</Vide></Bloc>;
  const liste = (gerant ? taches : taches.filter(t => t.assignee_id === profileId)).filter(t => !faites.includes(t.id)).sort(trier);
  const cocher = async t => {
    if (busy || !window.confirm(`Marquer « ${t.titre} » comme réalisée ?`)) return;
    setBusy(t.id);
    const { error } = await supabase.rpc("changer_statut_tache", { p_tache: t.id, p_statut: "realisee" });
    setBusy(null);
    if (error) { toast?.("Statut non modifié, réessayez", "error"); return; }
    setFaites(f => [...f, t.id]);
    toast?.("Tâche réalisée");
    onChange();
  };
  return <Bloc>
    <Titre icon="target">{gerant ? "Actions prioritaires" : "Mes tâches"}</Titre>
    {!liste.length && <Vide>{gerant ? "Aucune tâche ouverte. Tout est à jour." : "Aucune tâche ne vous est assignée."}</Vide>}
    {liste.slice(0, 5).map((t, i) => {
      const peut = gerant || t.assignee_id === profileId, p = PRIO[t.priorite] || PRIO.normale, retard = enRetard(t);
      return <div key={t.id} style={{display:"flex",alignItems:"flex-start",gap:10,padding:"10px 0",borderTop:i ? `1px solid ${C.border}` : "none"}}>
        <input type="checkbox" checked={busy === t.id} disabled={!peut || !!busy} onChange={() => cocher(t)} aria-label={`Marquer « ${t.titre} » comme réalisée`} title={peut ? "Marquer comme réalisée" : "Seul le gérant ou la personne assignée peut la clore"}
          style={{marginTop:3,width:16,height:16,accentColor:C.brand,cursor:peut?"pointer":"not-allowed",flexShrink:0}}/>
        <button onClick={() => onTab("reparations")} style={{flex:1,minWidth:0,border:"none",background:"none",padding:0,textAlign:"left",cursor:"pointer",display:"flex",alignItems:"center",gap:8}}>
          <div style={{flex:1,minWidth:0}}>
            <p style={{margin:0,fontSize:13,fontWeight:600,color:C.text,lineHeight:1.35}}>{t.titre}</p>
            <div style={{display:"flex",flexWrap:"wrap",gap:4,marginTop:5}}>
              {retard && <Badge c={C.danger} bg={C.dangerLight}>En retard</Badge>}
              {t.priorite !== "normale" && <Badge c={p.c} bg={p.bg}>{p.l}</Badge>}
              {t.echeance && <Badge c={C.textSec} bg="#F1F5F9">Avant le {fmtAvant(t.echeance)}</Badge>}
              {t.statut === "en_cours" && <Badge c="#B45309" bg="#FEF3C7">En cours</Badge>}
              {gerant && t.assignee_nom && <Badge c={C.textSec} bg="#F8FAFC">{t.assignee_nom}</Badge>}
            </div>
          </div>
          <Icon n="chevR" sz={14} c={C.textMuted}/>
        </button>
      </div>;
    })}
    {liste.length > 0 && <Lien onClick={() => onTab("reparations")}>{gerant ? `Toutes les tâches (${liste.length})` : "Voir les tâches"}</Lien>}
  </Bloc>;
}

// ── Aujourd'hui : équipe en service, relevés de températures, check-list ──
function Ligne({ icon, couleur, titre, detail, onClick, children }) {
  return <button onClick={onClick} style={{display:"flex",flexDirection:"column",gap:6,padding:"10px 12px",borderRadius:10,border:`1px solid ${C.border}`,background:C.surface,cursor:"pointer",textAlign:"left"}}>
    <div style={{display:"flex",alignItems:"center",gap:8,width:"100%"}}>
      <Icon n={icon} sz={15} c={couleur}/>
      <span style={{flex:1,fontSize:13,fontWeight:600,color:C.text}}>{titre}</span>
      <span style={{fontSize:12,fontWeight:600,color:couleur,whiteSpace:"nowrap"}}>{detail} ›</span>
    </div>
    {children}
  </button>;
}
const Barre = ({ part, couleur }) => <div style={{height:6,borderRadius:3,background:"#E2E8F0",overflow:"hidden",width:"100%"}}><div style={{height:"100%",width:`${Math.round(part * 100)}%`,background:couleur,borderRadius:3}}/></div>;

export function Aujourdhui({ d, checklist, onTab }) {
  if (!d) return <Bloc><Titre icon="calendar">Aujourd'hui</Titre><Vide>Chargement…</Vide></Bloc>;
  const lignes = [];
  // Équipe en service (planning du jour).
  if (d.shifts) {
    const noms = Object.fromEntries((d.employes || []).map(e => [e.id, [e.prenom, e.nom].filter(Boolean).join(" ").trim()]));
    const equipe = d.shifts.map(s => ({ nom: noms[s.employee_id] || "—", h: `${s.heure_debut}–${s.heure_fin}` }));
    lignes.push(<Ligne key="equipe" icon="users" couleur={equipe.length ? C.brand : C.textMuted} titre="En service" detail={equipe.length ? pluriel(equipe.length, "personne") : "Planning vide"} onClick={() => onTab("planning")}>
      {equipe.length > 0 && <div style={{display:"flex",flexWrap:"wrap",gap:4}}>
        {equipe.slice(0, 6).map((e, i) => <span key={i} style={{fontSize:11,padding:"2px 8px",borderRadius:12,background:C.brandLight,color:C.brandDark,whiteSpace:"nowrap"}}>{e.nom} · {e.h}</span>)}
        {equipe.length > 6 && <span style={{fontSize:11,color:C.textMuted}}>+{equipe.length - 6}</span>}
      </div>}
    </Ligne>);
  }
  // Relevés de températures : équipements avec seuils, relevés au moins une fois aujourd'hui.
  if (d.equip && d.temp) {
    const suivis = d.equip.filter(e => e.temp_min != null || e.temp_max != null);
    const releves = new Set(d.temp.map(t => t.equipement));
    const faits = suivis.filter(e => releves.has(e.nom)).length;
    const hors = d.temp.filter(t => (t.temperature_max != null && Number(t.temperature) > Number(t.temperature_max)) || (t.temperature_min != null && Number(t.temperature) < Number(t.temperature_min))).length;
    if (suivis.length) {
      const coul = hors ? C.danger : faits === suivis.length ? C.success : C.warning;
      lignes.push(<Ligne key="temp" icon="thermometer" couleur={coul} titre="Températures" detail={hors ? `${pluriel(hors, "écart")} à traiter` : `${faits} / ${suivis.length} relevés`} onClick={() => onTab("haccp")}>
        <Barre part={faits / suivis.length} couleur={coul}/>
      </Ligne>);
    }
  }
  if (checklist && checklist.prevu > 0) {
    const fini = checklist.fait === checklist.prevu;
    lignes.push(<Ligne key="check" icon="check" couleur={fini ? C.success : C.brand} titre="Check-list du jour" detail={`${checklist.fait} / ${checklist.prevu}`} onClick={() => onTab("taches")}>
      <Barre part={checklist.fait / checklist.prevu} couleur={fini ? C.success : C.brand}/>
    </Ligne>);
  }
  return <Bloc>
    <Titre icon="calendar">Aujourd'hui</Titre>
    {!lignes.length && <Vide>Rien à suivre aujourd'hui : planning, relevés et check-list sont vides.</Vide>}
    <div style={{display:"flex",flexDirection:"column",gap:8}}>{lignes}</div>
  </Bloc>;
}

// ── Accès rapides ─────────────────────────────────────────────
export function AccesRapides({ liens, onTab }) {
  if (!liens.length) return null;
  return <Bloc>
    <Titre icon="zap">Accès rapides</Titre>
    <div style={{display:"flex",flexDirection:"column",gap:8}}>
      {liens.map(([tab, label, icon]) => <button key={label} onClick={() => onTab(tab)} style={{display:"flex",alignItems:"center",gap:10,padding:"9px 12px",borderRadius:9,border:`1px solid ${C.border}`,background:C.surface,cursor:"pointer",fontSize:13,fontWeight:500,color:C.text,textAlign:"left"}}>
        <Icon n={icon} sz={15} c={C.textSec}/>{label}
      </button>)}
    </div>
  </Bloc>;
}

// ── Calendrier : semaine + liste des échéances à venir ────────
const JOURS = ["L", "M", "M", "J", "V", "S", "D"];
export function Calendrier({ evs, onTab, charge = true }) {
  const auj = jourLocal();
  const lundiDe = s => plusJours(s, -((jour(s).getDay() + 6) % 7));
  const [lundi, setLundi] = useState(() => lundiDe(auj)), [choisi, setChoisi] = useState(auj);
  const semaine = Array.from({ length: 7 }, (_, i) => plusJours(lundi, i));
  const parJour = useMemo(() => { const m = {}; evs.forEach(e => { (m[e.date] ||= []).push(e); }); return m; }, [evs]);
  const mois = jour(plusJours(lundi, 3)).toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
  const liste = evs.filter(e => e.date >= choisi).slice(0, 6);
  const nav = sens => { const l = plusJours(lundi, 7 * sens); setLundi(l); setChoisi(l <= auj && auj <= plusJours(l, 6) ? auj : l); };
  const fleche = (sens, icon, label) => <button onClick={() => nav(sens)} aria-label={label} style={{width:28,height:28,borderRadius:7,border:`1px solid ${C.border}`,background:C.surface,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}><Icon n={icon} sz={13} c={C.textSec}/></button>;
  return <Bloc>
    <Titre icon="calendar">Échéances & DLC</Titre>
    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
      {fleche(-1, "chevL", "Semaine précédente")}
      <span style={{fontSize:13,fontWeight:700,color:C.text,textTransform:"capitalize"}}>{mois}</span>
      {fleche(1, "chevR", "Semaine suivante")}
    </div>
    <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:4,marginBottom:12}}>
      {semaine.map((d, i) => {
        const sel = d === choisi, ev = parJour[d] || [], estAuj = d === auj;
        return <button key={d} onClick={() => setChoisi(d)} aria-pressed={sel} aria-label={`${fmtLong(d)}${ev.length ? ` : ${pluriel(ev.length, "échéance")}` : ""}`}
          style={{padding:"5px 0 6px",borderRadius:9,border:estAuj && !sel ? `1.5px solid ${C.brand}` : "1.5px solid transparent",background:sel ? C.navy : "transparent",cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:2}}>
          <span style={{fontSize:10,fontWeight:600,color:sel ? "#93C5FD" : C.textMuted}}>{JOURS[i]}</span>
          <span style={{fontSize:14,fontWeight:700,color:sel ? "#fff" : C.text}}>{jour(d).getDate()}</span>
          <span style={{width:5,height:5,borderRadius:"50%",background:ev.length ? (sel ? "#fff" : TONS[ev.some(e => e.ton === "rouge") ? "rouge" : ev[0].ton].c) : "transparent"}}/>
        </button>;
      })}
    </div>
    {!charge ? <Vide>Chargement…</Vide> : !liste.length && <Vide>Aucune échéance à partir du {fmtCourt(choisi)}.</Vide>}
    <div style={{display:"flex",flexDirection:"column",gap:5}}>
      {liste.map(e => <button key={e.id} onClick={() => onTab(e.tab)} style={{display:"flex",gap:10,alignItems:"center",padding:"7px 10px",borderRadius:7,border:"none",background:TONS[e.ton].bg,cursor:"pointer",textAlign:"left"}}>
        <span style={{fontSize:11,fontWeight:600,color:TONS[e.ton].c,width:44,flexShrink:0}}>{fmtCourt(e.date)}</span>
        <span style={{fontSize:12,color:C.text,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{e.titre}</span>
      </button>)}
    </div>
  </Bloc>;
}

// ── État du stock par catégorie ───────────────────────────────
export function EtatStock({ products, onTab, commandes = true }) {
  const cats = useMemo(() => {
    const m = {};
    products.forEach(p => {
      const k = p.categorie || "Sans catégorie", c = (m[k] ||= { nom: k, n: 0, rupture: 0, commander: 0, saisi: 0 });
      const s = gst(p); c.n++; if (s === "rupture") c.rupture++; if (s === "commander") c.commander++; if (s !== "non_saisi") c.saisi++;
    });
    const rang = c => c.rupture ? 0 : c.commander ? 1 : !c.saisi ? 2 : 3;
    return Object.values(m).sort((a, b) => rang(a) - rang(b) || a.nom.localeCompare(b.nom));
  }, [products]);
  return <Bloc>
    <Titre icon="box">État du stock</Titre>
    {!cats.length && <Vide>Aucun produit pour l'instant.</Vide>}
    {cats.slice(0, 8).map((c, i) => {
      const [txt, col, icon] = c.rupture ? [`Rupture · ${c.rupture}`, C.danger, "alert"] : c.commander ? [`À commander · ${c.commander}`, C.warning, "cart"] : !c.saisi ? ["Non saisi", C.textMuted, "box"] : ["OK", C.success, "check"];
      return <button key={c.nom} onClick={() => onTab((c.rupture || c.commander) && commandes ? "commandes" : "stocks")} style={{display:"flex",alignItems:"center",gap:10,padding:"9px 0",border:"none",borderTop:i ? `1px solid ${C.border}` : "none",background:"none",cursor:"pointer",textAlign:"left"}}>
        <Icon n={icon} sz={14} c={col}/>
        <span style={{flex:1,minWidth:0,fontSize:13,color:C.text,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{c.nom} <span style={{color:C.textMuted}}>({c.n})</span></span>
        <span style={{fontSize:12,fontWeight:600,color:col,whiteSpace:"nowrap"}}>{txt}</span>
        <Icon n="chevR" sz={13} c={C.textMuted}/>
      </button>;
    })}
    {cats.length > 8 && <Lien onClick={() => onTab("stocks")}>Tout l'inventaire ({cats.length} catégories)</Lien>}
  </Bloc>;
}

// ── Achats : total du mois et répartition par fournisseur ─────
const TEINTES = ["#1E3A8A", "#2563EB", "#60A5FA", "#93C5FD", "#BFDBFE", "#94A3B8"];
function Donut({ parts }) {
  const total = parts.reduce((a, p) => a + p.v, 0), R = 38, L = 2 * Math.PI * R;
  let cumul = 0;
  return <svg width="104" height="104" viewBox="0 0 104 104" role="img" aria-label="Répartition des achats par fournisseur" style={{flexShrink:0}}>
    <circle cx="52" cy="52" r={R} fill="none" stroke="#E2E8F0" strokeWidth="16"/>
    {total > 0 && parts.map((p, i) => {
      const long = p.v / total * L, el = <circle key={p.nom} cx="52" cy="52" r={R} fill="none" stroke={TEINTES[i]} strokeWidth="16"
        strokeDasharray={`${Math.max(long - (parts.length > 1 ? 1.5 : 0), 0)} ${L}`} strokeDashoffset={-cumul} transform="rotate(-90 52 52)"/>;
      cumul += long; return el;
    })}
  </svg>;
}
export function Achats({ achats, products, onTab, detail = true }) {
  const auj = jourLocal(), debutMois = auj.slice(0, 8) + "01";
  const res = useMemo(() => {
    if (!achats) return achats; // null : chargement, undefined : erreur
    const mois = achats.filter(a => a.date_facture >= debutMois);
    const somme = l => l.reduce((a, x) => a + (Number(x.total_ht) || 0), 0);
    const base = mois.length ? mois : achats, m = {};
    base.forEach(a => { const k = a.fournisseur || "Sans fournisseur"; m[k] = (m[k] || 0) + (Number(a.total_ht) || 0); });
    const tri = Object.entries(m).map(([nom, v]) => ({ nom, v })).filter(p => p.v > 0).sort((a, b) => b.v - a.v);
    const parts = tri.length > 6 ? [...tri.slice(0, 5), { nom: "Autres", v: somme(tri.slice(5).map(p => ({ total_ht: p.v }))) }] : tri;
    return { mois: somme(mois), annee: somme(achats), parts, surAnnee: !mois.length, nbMois: mois.length };
  }, [achats, debutMois]);
  const stock = useMemo(() => valeurProduits(products), [products]);
  const nomMois = jour(auj).toLocaleDateString("fr-FR", { month: "long" });
  return <Bloc>
    <Titre icon="wallet">Achats — aperçu</Titre>
    {res === undefined && <Vide>Achats indisponibles pour le moment.</Vide>}
    {res && <>
      <p style={{margin:0,fontSize:26,fontWeight:800,color:C.text,letterSpacing:"-.5px"}}>{fmtPrix(res.mois)}</p>
      <p style={{margin:"2px 0 10px",fontSize:12,color:C.textSec}}>Livraisons et factures de {nomMois} ({pluriel(res.nbMois, "pièce")}), HT</p>
      <p style={{margin:0,fontSize:12,color:C.textSec}}>Depuis janvier : <b style={{color:C.text}}>{fmtPrix(res.annee)}</b></p>
      <p style={{margin:"2px 0 0",fontSize:12,color:C.textSec}}>Valeur du stock : <b style={{color:C.text}}>{fmtPrix(stock.total)}</b>{stock.sansPrix > 0 && <span style={{color:C.textMuted}}> ({stock.sansPrix} sans prix)</span>}</p>
      {res.parts.length > 0 ? <div style={{display:"flex",alignItems:"center",gap:14,marginTop:14}}>
        <Donut parts={res.parts}/>
        <div style={{flex:1,minWidth:0,display:"flex",flexDirection:"column",gap:4}}>
          {res.surAnnee && <span style={{fontSize:10,color:C.textMuted,textTransform:"uppercase",letterSpacing:".4px",fontWeight:700}}>Depuis janvier</span>}
          {res.parts.map((p, i) => { const tot = res.parts.reduce((a, x) => a + x.v, 0); return <div key={p.nom} style={{display:"flex",alignItems:"center",gap:6,fontSize:11.5,color:C.text}}>
            <span style={{width:8,height:8,borderRadius:"50%",background:TEINTES[i],flexShrink:0}}/>
            <span style={{flex:1,minWidth:0,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{p.nom}</span>
            <span style={{color:C.textSec}}>{Math.round(p.v / tot * 100)} %</span>
          </div>; })}
        </div>
      </div> : <Vide>Aucune livraison enregistrée cette année.</Vide>}
      {detail && <div style={{display:"flex",justifyContent:"flex-end"}}><Lien onClick={() => onTab("historique")}>Consommation et coûts ›</Lien></div>}
    </>}
    {res === null && <Vide>Chargement…</Vide>}
  </Bloc>;
}
