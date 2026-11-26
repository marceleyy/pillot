// Tour de contrôle du tableau de bord : conformité HACCP en couleur,
// check-list de la semaine et tâches et réparations à suivre.
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { C, Card, Icon } from "../ui";
import { jourLocal, enRetard } from "../lib/taches";

// Accepte une date ou une chaîne « AAAA-MM-JJ » (lue à midi, heure locale).
const ajouterJours = (d, n) => { const x = typeof d === "string" ? new Date(d + "T12:00") : new Date(d); x.setHours(12,0,0,0); x.setDate(x.getDate()+n); return x; };

const COUL = {
  vert:   { c: C.success, bg: C.successLight, l: "Conforme" },
  orange: { c: C.warning, bg: C.warningLight, l: "À surveiller" },
  rouge:  { c: C.danger,  bg: C.dangerLight,  l: "À corriger" },
  gris:   { c: C.textMuted, bg: "#F8FAFC",    l: "Pas de données" },
};
const RANG = { gris: 0, vert: 1, orange: 2, rouge: 3 };
// Jours renseignés sur 7 : 6 ou 7 = vert (un jour de fermeture toléré), 4 ou 5 = orange, moins = rouge.
const couleurJours = n => n >= 6 ? "vert" : n >= 4 ? "orange" : "rouge";
// La semaine affichée commence le lundi.
const lundi = () => { const d = ajouterJours(new Date(), 0); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return d; };
// Tâches du jour prévues le jour d (« AAAA-MM-JJ ») : pas avant leur création.
const prevues = (tasks, d) => { const dow = new Date(d + "T12:00").getDay() || 7; return tasks.filter(t => (!t.created_at || jourLocal(t.created_at) <= d) && (t.frequence === "daily" || (t.frequence === "weekly" && (t.jours_semaine || []).includes(dow)))); };

function Pastille({ couleur, petit }) {
  const k = COUL[couleur] || COUL.gris;
  return <span style={{display:"inline-flex",alignItems:"center",gap:5,padding:petit?"2px 8px":"3px 10px",borderRadius:20,background:k.bg,color:k.c,fontSize:11,fontWeight:700,whiteSpace:"nowrap"}}>
    <span style={{width:7,height:7,borderRadius:"50%",background:k.c,display:"inline-block"}}/>{k.l}
  </span>;
}

// Lecture groupée des registres sur les 7 derniers jours (hier compris, aujourd'hui exclu)
// et de la semaine en cours pour la check-list.
async function lireRegistres(restaurantId) {
  const auj = ajouterJours(new Date(), 0), debut7 = ajouterJours(auj, -7), lun = lundi();
  const depuis = new Date(Math.min(debut7, lun)); depuis.setHours(0,0,0,0);
  const [temp, net, dlc, tasks, comp] = await Promise.all([
    supabase.from("temperature_logs").select("created_at,temperature,temperature_min,temperature_max,action_corrective").eq("restaurant_id", restaurantId).gte("created_at", depuis.toISOString()),
    supabase.from("cleaning_logs").select("created_at,fait").eq("restaurant_id", restaurantId).gte("created_at", depuis.toISOString()),
    supabase.from("dlc_entries").select("dlc_date").eq("restaurant_id", restaurantId).eq("statut", "actif").lte("dlc_date", jourLocal(auj)),
    supabase.from("tasks").select("id,nom,frequence,jours_semaine,created_at").eq("restaurant_id", restaurantId).eq("actif", true),
    supabase.from("task_completions").select("task_id,date,completed_at").eq("restaurant_id", restaurantId).gte("date", jourLocal(depuis)),
  ]);
  const err = [temp, net, dlc, tasks, comp].find(r => r.error);
  if (err) throw err.error;
  return { temp: temp.data || [], net: net.data || [], dlc: dlc.data || [], tasks: tasks.data || [], comp: comp.data || [] };
}

function calculer({ temp, net, dlc, tasks, comp }) {
  const auj = jourLocal(new Date());
  const jours7 = Array.from({ length: 7 }, (_, i) => jourLocal(ajouterJours(new Date(), i - 7)));
  const dans7 = d => jours7.includes(d);

  const t7 = temp.filter(r => dans7(jourLocal(r.created_at)));
  const joursTemp = new Set(t7.map(r => jourLocal(r.created_at))).size;
  const hors = r => (r.temperature_max != null && Number(r.temperature) > Number(r.temperature_max)) || (r.temperature_min != null && Number(r.temperature) < Number(r.temperature_min));
  const ecarts = t7.filter(r => hors(r) && !String(r.action_corrective || "").trim()).length;
  let cTemp = couleurJours(joursTemp);
  if (ecarts > 0 && cTemp === "vert") cTemp = "orange";

  const joursNet = new Set(net.filter(r => r.fait && dans7(jourLocal(r.created_at))).map(r => jourLocal(r.created_at))).size;

  const perimes = dlc.filter(r => r.dlc_date < auj).length, ceJour = dlc.filter(r => r.dlc_date === auj).length;
  const cDlc = perimes > 0 ? "rouge" : ceJour > 0 ? "orange" : "vert";

  // Check-list du jour : une tâche compte une fois par jour.
  const faitesLe = d => new Set(comp.filter(c => c.date === d).map(c => c.task_id));
  let prev7 = 0, faites7 = 0;
  jours7.forEach(d => { const p = prevues(tasks, d), f = faitesLe(d); prev7 += p.length; faites7 += p.filter(t => f.has(t.id)).length; });
  const taux = prev7 ? faites7 / prev7 : null;
  const cTaches = taux == null ? "gris" : taux >= 0.9 ? "vert" : taux >= 0.6 ? "orange" : "rouge";

  const lignes = [
    { id: "temp", nom: "Températures", couleur: cTemp, detail: `${joursTemp} jour${joursTemp>1?"s":""} relevé${joursTemp>1?"s":""} sur 7${ecarts?` · ${ecarts} écart${ecarts>1?"s":""} sans action corrective`:""}`, tab: "haccp" },
    { id: "net", nom: "Nettoyage", couleur: couleurJours(joursNet), detail: `${joursNet} jour${joursNet>1?"s":""} noté${joursNet>1?"s":""} sur 7`, tab: "haccp" },
    { id: "dlc", nom: "DLC", couleur: cDlc, detail: perimes ? `${perimes} produit${perimes>1?"s":""} périmé${perimes>1?"s":""} encore en stock` : ceJour ? `${ceJour} produit${ceJour>1?"s":""} à consommer aujourd'hui` : "Aucun produit périmé", tab: "haccp" },
    { id: "taches", nom: "Check-list du jour", couleur: cTaches, detail: taux == null ? "Aucune tâche prévue" : `${faites7}/${prev7} faites (${Math.round(taux*100)} %)`, tab: "taches" },
  ];
  // Semaine en cours, lundi → dimanche.
  const lun = lundi();
  const semaine = Array.from({ length: 7 }, (_, i) => {
    const d = jourLocal(ajouterJours(lun, i)), p = prevues(tasks, d), f = faitesLe(d);
    const n = p.filter(t => f.has(t.id)).length;
    const etat = d > auj || !p.length ? "gris" : n === p.length ? "vert" : d === auj ? "gris" : n > 0 ? "orange" : "rouge";
    return { d, n, prevu: p.length, etat, futur: d > auj, auj: d === auj };
  });
  const fAuj = faitesLe(auj);
  const listeAuj = prevues(tasks, auj).map(t => {
    const c = comp.find(x => x.date === auj && x.task_id === t.id);
    return { id: t.id, nom: t.nom, fait: fAuj.has(t.id), heure: c?.completed_at ? new Date(c.completed_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }) : null };
  });
  return { lignes, semaine, listeAuj };
}

export function CarteConformite({ restaurantId, onTab, modules = {} }) {
  const [res, setRes] = useState(null), [erreur, setErreur] = useState(false);
  useEffect(() => {
    if (!restaurantId) return;
    let fini = false;
    lireRegistres(restaurantId).then(r => { if (!fini) setRes(calculer(r)); }).catch(() => { if (!fini) setErreur(true); });
    return () => { fini = true; };
  }, [restaurantId]);

  if (erreur) return <Card style={{padding:"14px 18px",marginBottom:20}}><p style={{margin:0,fontSize:13,color:C.textSec}}>Conformité indisponible pour le moment.</p></Card>;
  if (!res) return <Card style={{padding:"14px 18px",marginBottom:20}}><p style={{margin:0,fontSize:13,color:C.textMuted}}>Conformité : chargement…</p></Card>;
  const lignes = res.lignes.filter(l => modules[l.tab] !== false);
  const avecTaches = modules.taches !== false;
  const globale = lignes.reduce((m, l) => RANG[l.couleur] > RANG[m] ? l.couleur : m, "gris");
  const JOURS = ["L", "M", "M", "J", "V", "S", "D"];

  return <>
    <Card style={{overflow:"hidden",marginBottom:20}}>
      <div style={{padding:"12px 18px",borderBottom:`1px solid ${C.border}`,display:"flex",justifyContent:"space-between",alignItems:"center",gap:10,flexWrap:"wrap"}}>
        <div style={{display:"flex",alignItems:"center",gap:8}}><Icon n="check" sz={15} c={COUL[globale].c}/><span style={{fontSize:14,fontWeight:700}}>Conformité HACCP</span><span style={{fontSize:11,color:C.textMuted}}>7 derniers jours</span></div>
        <Pastille couleur={globale}/>
      </div>
      {lignes.map(l => <button key={l.id} onClick={() => onTab(l.tab)} style={{width:"100%",padding:"10px 18px",border:"none",borderBottom:`1px solid ${C.border}`,background:"transparent",cursor:"pointer",display:"flex",alignItems:"center",gap:10,textAlign:"left"}}>
        <span style={{width:10,height:10,borderRadius:"50%",background:COUL[l.couleur].c,flexShrink:0}}/>
        <div style={{flex:1,minWidth:0}}><p style={{margin:0,fontSize:13,fontWeight:600,color:C.text}}>{l.nom}</p><p style={{margin:0,fontSize:11,color:C.textSec}}>{l.detail}</p></div>
        <Pastille couleur={l.couleur} petit/>
      </button>)}
    </Card>
    {avecTaches && res.semaine.some(j => j.prevu) && <Card style={{overflow:"hidden",marginBottom:20}}>
      <div style={{padding:"12px 18px",borderBottom:`1px solid ${C.border}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <span style={{fontSize:14,fontWeight:700}}>Check-list de la semaine</span>
        <button onClick={() => onTab("taches")} style={{fontSize:12,color:C.brand,background:"none",border:"none",cursor:"pointer",fontWeight:600}}>Voir →</button>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:6,padding:"12px 14px"}}>
        {res.semaine.map((j, i) => <button key={j.d} onClick={() => onTab("taches")} title={j.d} style={{padding:"8px 2px",borderRadius:10,border:j.auj?`2px solid ${C.brand}`:`1px solid ${C.border}`,background:COUL[j.etat].bg,cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:2}}>
          <span style={{fontSize:11,fontWeight:700,color:C.textSec}}>{JOURS[i]}</span>
          <span style={{fontSize:12,fontWeight:800,color:j.futur?C.textMuted:j.etat==="gris"?C.text:COUL[j.etat].c}}>{j.futur || !j.prevu ? "–" : `${j.n}/${j.prevu}`}</span>
        </button>)}
      </div>
      {res.listeAuj.length > 0 && <div style={{borderTop:`1px solid ${C.border}`}}>
        {res.listeAuj.map(t => <div key={t.id} style={{padding:"8px 18px",display:"flex",alignItems:"center",gap:10,fontSize:13}}>
          <span style={{width:8,height:8,borderRadius:"50%",background:t.fait?C.success:C.borderStrong,flexShrink:0}}/>
          <span style={{flex:1,color:t.fait?C.textSec:C.text}}>{t.nom}</span>
          <span style={{fontSize:11,fontWeight:600,color:t.fait?C.success:C.textMuted}}>{t.fait ? (t.heure ? `Fait à ${t.heure}` : "Fait") : "À faire"}</span>
        </div>)}
      </div>}
    </Card>}
  </>;
}

// Tâches et réparations : en retard et urgentes pour le gérant, « Mes tâches » pour la personne assignée.
export function CarteTachesReparations({ restaurantId, profileId, gerant, onTab }) {
  const [taches, setTaches] = useState(null);
  useEffect(() => {
    if (!restaurantId) return;
    let fini = false;
    supabase.from("taches_reparations").select("id,titre,priorite,echeance,statut,assignee_id,assignee_nom").eq("restaurant_id", restaurantId).neq("statut", "realisee")
      .then(({ data, error }) => {
        // Table absente (migration pas encore appliquée) ou erreur : pas de carte, mais une trace.
        if (error) console.warn("Tâches et réparations indisponibles", error.message);
        if (!fini) setTaches(error ? [] : (data || []));
      });
    return () => { fini = true; };
  }, [restaurantId]);
  if (!taches) return null;
  const retard = taches.filter(enRetard), urgentes = taches.filter(t => t.priorite === "urgente" && !enRetard(t));
  const miennes = taches.filter(t => t.assignee_id === profileId);
  const liste = gerant ? [...retard, ...urgentes] : miennes;
  if (!liste.length) return null;
  const titre = gerant
    ? [retard.length && `${retard.length} tâche${retard.length>1?"s":""} en retard`, urgentes.length && `${urgentes.length} urgente${urgentes.length>1?"s":""}`].filter(Boolean).join(" · ")
    : `Mes tâches (${miennes.length})`;
  const rouge = gerant && retard.length > 0;
  return <Card style={{overflow:"hidden",marginBottom:20,borderColor:rouge?"#FECACA":C.border}}>
    <div style={{padding:"12px 18px",borderBottom:`1px solid ${C.border}`,display:"flex",justifyContent:"space-between",alignItems:"center",gap:10,background:rouge?C.dangerLight:"transparent"}}>
      <div style={{display:"flex",alignItems:"center",gap:8}}><Icon n={rouge?"alert":"clipboard"} sz={15} c={rouge?C.danger:C.warning}/><span style={{fontSize:14,fontWeight:700}}>{titre}</span></div>
      <button onClick={() => onTab("reparations")} style={{fontSize:12,color:C.brand,background:"none",border:"none",cursor:"pointer",fontWeight:600}}>Ouvrir →</button>
    </div>
    {liste.slice(0, 5).map(t => <button key={t.id} onClick={() => onTab("reparations")} style={{width:"100%",padding:"10px 18px",border:"none",borderBottom:`1px solid ${C.border}`,background:"transparent",cursor:"pointer",display:"flex",alignItems:"center",gap:10,textAlign:"left"}}>
      <span style={{width:8,height:8,borderRadius:"50%",background:enRetard(t)?C.danger:t.priorite==="urgente"?C.warning:C.brand,flexShrink:0}}/>
      <div style={{flex:1,minWidth:0}}><p style={{margin:0,fontSize:13,fontWeight:600,color:C.text}}>{t.titre}</p>
        <p style={{margin:0,fontSize:11,color:C.textSec}}>{[t.echeance && `Pour le ${new Date(t.echeance+"T12:00").toLocaleDateString("fr-FR",{day:"numeric",month:"short"})}`, t.assignee_nom, t.statut==="en_cours"&&"En cours"].filter(Boolean).join(" · ")}</p></div>
    </button>)}
  </Card>;
}
