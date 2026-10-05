// ── Clôture de la semaine : CA + achats + variation de stock → ratio coût matière ──
import { useState, useEffect, useMemo } from "react";
import { supabase } from "../lib/supabase";

const C = { brand:"#2563EB", text:"#0F172A", textSec:"#64748B", border:"#E2E8F0", success:"#16A34A", warning:"#B45309", danger:"#DC2626", bgSoft:"#F8FAFC" };
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const fmt = v => ((+v)||0).toLocaleString("fr-FR", { style:"currency", currency:"EUR" });
const pad = n => String(n).padStart(2, "0");
const isoDay = d => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
const dayStart = iso => { const [y,m,d] = iso.split("-").map(Number); return new Date(y, m-1, d); };
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate()+n); return x; };

// Semaine complète précédente (lundi → dimanche)
const lastWeek = () => {
  const today = new Date(); today.setHours(0,0,0,0);
  const monday = addDays(today, -((today.getDay()+6)%7) - 7);
  return [isoDay(monday), isoDay(addDays(monday, 6))];
};

// Nombre au format français : 45,50 · "1 234,50 €" · 12.5
const parseNum = v => {
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  let s = String(v ?? "").replace(/[\s  €]/g, "");
  if (!s) return 0;
  const seps = s.match(/[.,]/g) || [];
  if (seps.length && seps.every(c => c === seps[0]) && (seps.length > 1 || /^-?\d+[.,]\d{3}$/.test(s))) s = s.replace(/[.,]/g, "");
  else if (s.lastIndexOf(",") > s.lastIndexOf(".")) s = s.replace(/\./g, "").replace(",", ".");
  else s = s.replace(/,/g, "");
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : 0;
};

// Date de caisse : série Excel, "03/10/2026 12:30", "2026-10-03"
const parseDate = v => {
  if (v instanceof Date) return isNaN(v) ? null : isoDay(v);
  if (typeof v === "number" && v > 20000 && v < 80000) { const d = new Date(Math.round((v - 25569) * 86400000)); return `${d.getUTCFullYear()}-${pad(d.getUTCMonth()+1)}-${pad(d.getUTCDate())}`; }
  const s = String(v ?? "").trim();
  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})/); if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  m = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})/);
  if (m) { const y = m[3].length === 2 ? "20"+m[3] : m[3]; return `${y}-${pad(m[2])}-${pad(m[1])}`; }
  return null;
};

const guessCol = (cols, re) => cols.find(c => re.test(c.toLowerCase())) || "";

export default function Cloture({ restaurantId, objectif = 0.25, toast, onSaved }) {
  const [[debut, fin], setPeriode] = useState(lastWeek);
  // Un seul CA et un seul coût par restaurant (plus de séparation salé / sucré)
  const [ca, setCa] = useState("");
  const [achats, setAchats] = useState("");
  const [stock, setStock] = useState(null); // { debut, fin, n } en euros
  const [withStock, setWithStock] = useState(true);
  const [file, setFile] = useState(null); // { name, rows, cols, colMontant, colDate, ttc }
  const [saving, setSaving] = useState(false);

  // Valeur du stock au début et à la fin de la période (dernier inventaire connu × prix d'achat)
  useEffect(() => {
    if (!restaurantId || !debut || !fin || debut > fin) { setStock(null); return; }
    let stale = false;
    (async () => {
      const tDebut = dayStart(debut), tFin = addDays(dayStart(fin), 1);
      const { data: prods, error: e1 } = await supabase.from("products").select("id,prix_achat").eq("restaurant_id", restaurantId);
      if (e1) { if (!stale) setStock(null); return; }
      const entries = [];
      for (let p = 0; p < 10; p++) {
        const { data, error } = await supabase.from("stock_entries").select("product_id,stock_reel,created_at")
          .eq("restaurant_id", restaurantId).gte("created_at", addDays(tDebut, -90).toISOString()).lt("created_at", tFin.toISOString())
          .order("created_at").order("id").range(p*1000, p*1000+999);
        if (error) { if (!stale) setStock(null); return; }
        entries.push(...(data||[]));
        if (!data || data.length < 1000) break;
      }
      const prix = new Map((prods||[]).map(p => [p.id, +p.prix_achat||0]));
      const dernierAu = t => { const last = new Map(); for (const e of entries) if (new Date(e.created_at) < t) last.set(e.product_id, +e.stock_reel||0); return last; };
      const qa = dernierAu(tDebut), qb = dernierAu(tFin);
      // Seuls les produits inventoriés aux deux dates comptent (sinon un produit compté seulement en fin fausse la variation)
      const ids = [...qa.keys()].filter(id => qb.has(id) && prix.has(id));
      const valeur = q => ids.reduce((v, id) => v + q.get(id) * prix.get(id), 0);
      if (!stale) setStock({ debut:valeur(qa), fin:valeur(qb), n:ids.length });
    })();
    return () => { stale = true; };
  }, [restaurantId, debut, fin]);

  // Lecture d'un export de caisse (CSV / Excel)
  const handleFile = async f => {
    if (!f) return;
    if (f.size > MAX_FILE_SIZE) { toast("Fichier trop volumineux (5 Mo maximum)", "error"); return; }
    try {
      const XLSX = await import("xlsx");
      const wb = f.name.toLowerCase().endsWith(".csv")
        ? XLSX.read(await f.text(), { type:"string", raw:true })
        : XLSX.read(await f.arrayBuffer(), { type:"array" });
      const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { raw:true, defval:"" });
      if (!rows.length) { toast("Fichier vide", "error"); return; }
      const cols = Object.keys(rows[0]);
      const colMontant = guessCol(cols, /(total|montant|ca|chiffre).*(ht)|^ht$|montant ht/) || guessCol(cols, /total|montant|chiffre|^ca/);
      setFile({ name:f.name, rows, cols, colMontant, colDate: guessCol(cols, /date|jour/), ttc: /ttc/i.test(colMontant) });
    } catch { toast("Fichier illisible : exportez en CSV ou Excel", "error"); }
  };

  const fileTotal = useMemo(() => {
    if (!file?.colMontant) return null;
    let tot = 0, n = 0, hors = 0;
    for (const r of file.rows) {
      if (file.colDate) { const d = parseDate(r[file.colDate]); if (!d || d < debut || d > fin) { hors++; continue; } }
      tot += parseNum(r[file.colMontant]); n++;
    }
    return { tot: file.ttc ? tot / 1.1 : tot, n, hors };
  }, [file, debut, fin]);

  const num = v => { const t = String(v).replace(/[\s\u00a0\u202f€]/g, ""); return t === "" ? 0 : /^-?(\d+([.,]\d*)?|[.,]\d+)$/.test(t) ? parseFloat(t.replace(",", ".")) : NaN; };
  const caT = num(ca), acT = num(achats);
  const useStock = withStock && stock && stock.n > 0;
  const cout = acT + (useStock ? stock.debut - stock.fin : 0);
  const ratio = caT > 0 ? cout / caT : 0;
  const invalid = [caT, acT].some(n => isNaN(n) || n < 0);

  const reprendreFactures = async () => {
    const { data, error } = await supabase.from("scanned_invoices").select("total_ht").eq("restaurant_id", restaurantId).gte("date_facture", debut).lte("date_facture", fin);
    if (error) { toast("Factures scannées indisponibles", "error"); return; }
    const tot = (data||[]).reduce((a, r) => a + (+r.total_ht||0), 0);
    if (!data?.length) { toast("Aucune facture scannée sur la période"); return; }
    setAchats(String(Math.round(tot*100)/100));
    toast(`${data.length} facture${data.length>1?"s":""} reprise${data.length>1?"s":""}`);
  };

  const cloturer = async () => {
    if (!debut || !fin || debut > fin) { toast("Période invalide (dates manquantes ou fin avant début)", "error"); return; }
    if (invalid) { toast("Montant invalide", "error"); return; }
    if (caT <= 0) { toast("Saisissez le CA de la période", "error"); return; }
    setSaving(true);
    const r2 = n => Math.round(n*100)/100, r4 = n => Math.round(n*10000)/10000;
    const [, mm, dd] = fin.split("-");
    const row = { restaurant_id:restaurantId, periode:`Fin ${dd}/${mm}`, type:"hebdo",
      ca_sale:r2(caT), ca_sucre:0, cout_sale:r2(cout), cout_sucre:0, ratio_sale:r4(ratio), ratio_sucre:0 }; // colonnes « sale » = total du restaurant
    let { error } = await supabase.from("ca_history").insert({ ...row, date_debut:debut, date_fin:fin });
    if (error && (error.code === "PGRST204" || /date_debut|date_fin/.test(error.message||""))) ({ error } = await supabase.from("ca_history").insert(row));
    if (error) { toast("Clôture non enregistrée", "error"); setSaving(false); return; }
    const { error: e2 } = await supabase.from("restaurants").update({ ca_sale:row.ca_sale, ca_sucre:row.ca_sucre, ratio_sale:row.ratio_sale, ratio_sucre:row.ratio_sucre }).eq("id", restaurantId);
    if (file && fileTotal) await supabase.from("ca_imports").insert({ restaurant_id:restaurantId, date_debut:debut, date_fin:fin, ca_sale:r2(fileTotal.tot), ca_sucre:0, source:file.name }); // trace facultative, ignorée si la table manque
    toast(e2 ? "Clôture enregistrée, mais le tableau de bord n'a pas été mis à jour" : "Semaine clôturée", e2 ? "error" : undefined);
    setSaving(false);
    await onSaved?.();
  };

  const lab = { fontSize:11, fontWeight:700, color:C.textSec, display:"block", marginBottom:5, textTransform:"uppercase", letterSpacing:".5px" };
  const inp = { width:"100%", boxSizing:"border-box", padding:"11px 12px", borderRadius:10, border:`1.5px solid ${C.border}`, fontSize:16, fontWeight:700, outline:"none", background:"#fff" };
  const btn2 = { padding:"9px 14px", background:"#fff", color:C.brand, border:`1.5px solid ${C.brand}`, borderRadius:10, fontSize:13, fontWeight:700, cursor:"pointer" };
  const pct = r => r > 0 ? (r*100).toFixed(1)+" %" : "—";
  const colR = r => r <= 0 ? C.textSec : r <= objectif ? C.success : r <= objectif*1.4 ? C.warning : C.danger;

  return <div>
    <p style={{ margin:"0 0 14px", fontSize:13, color:C.textSec }}>Coût matière = achats + stock de début − stock de fin. Le ratio part dans l'historique et le tableau de bord.</p>
    <div style={{ display:"grid", gridTemplateColumns:"minmax(0,1fr) minmax(0,1fr)", gap:12, marginBottom:14 }}>
      <div><label style={lab} htmlFor="clo-debut">Du</label><input id="clo-debut" type="date" value={debut} onChange={e=>setPeriode([e.target.value, fin])} style={inp}/></div>
      <div><label style={lab} htmlFor="clo-fin">Au</label><input id="clo-fin" type="date" value={fin} onChange={e=>setPeriode([debut, e.target.value])} style={inp}/></div>
    </div>

    <div style={{ marginBottom:14 }}>
      <label style={lab} htmlFor="clo-ca">Chiffre d'affaires HT (€)</label>
      <input id="clo-ca" inputMode="decimal" value={ca} onChange={e=>setCa(e.target.value)} placeholder="0" style={inp}/>
    </div>

    <div style={{ background:C.bgSoft, borderRadius:10, padding:12, marginBottom:14 }}>
      <label style={{ ...btn2, display:"inline-block" }}>Importer un export de caisse (CSV / Excel)
        <input type="file" accept=".csv,.xlsx,.xls" style={{ display:"none" }} onChange={e=>{ handleFile(e.target.files[0]); e.target.value=""; }}/></label>
      {file && <div style={{ marginTop:10, fontSize:13 }}>
        <p style={{ margin:"0 0 8px", fontWeight:700 }}>{file.name} · {file.rows.length} lignes</p>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:8 }}>
          <div><label style={lab}>Colonne montant</label><select value={file.colMontant} onChange={e=>setFile(f=>({ ...f, colMontant:e.target.value }))} style={{ ...inp, fontWeight:500 }}><option value="">—</option>{file.cols.map(c=><option key={c}>{c}</option>)}</select></div>
          <div><label style={lab}>Colonne date</label><select value={file.colDate} onChange={e=>setFile(f=>({ ...f, colDate:e.target.value }))} style={{ ...inp, fontWeight:500 }}><option value="">(toutes les lignes)</option>{file.cols.map(c=><option key={c}>{c}</option>)}</select></div>
        </div>
        <label style={{ display:"flex", gap:8, alignItems:"center", marginBottom:8 }}><input type="checkbox" checked={file.ttc} onChange={e=>setFile(f=>({ ...f, ttc:e.target.checked }))}/> Montants TTC (TVA 10 % retirée)</label>
        {fileTotal && <div style={{ display:"flex", gap:10, alignItems:"center", flexWrap:"wrap" }}>
          <span>{fileTotal.n} ventes sur la période{fileTotal.hors ? ` (${fileTotal.hors} hors période ignorées)` : ""} : <b>{fmt(fileTotal.tot)} HT</b></span>
          <button style={btn2} onClick={()=>setCa(String(Math.round(fileTotal.tot*100)/100))}>Utiliser comme CA</button>
        </div>}
      </div>}
    </div>

    <div style={{ marginBottom:14 }}>
      <label style={lab} htmlFor="clo-ac">Achats HT (€)</label>
      <input id="clo-ac" inputMode="decimal" value={achats} onChange={e=>setAchats(e.target.value)} placeholder="Total des factures" style={inp}/>
    </div>
    <button style={{ ...btn2, marginBottom:14 }} onClick={reprendreFactures}>Reprendre les factures scannées</button>

    <div style={{ fontSize:13, marginBottom:14 }}>
      {stock && stock.n > 0
        ? <label style={{ display:"flex", gap:8, alignItems:"flex-start" }}><input type="checkbox" checked={withStock} onChange={e=>setWithStock(e.target.checked)} style={{ marginTop:2 }}/>
            <span>Inclure la variation de stock ({stock.n} produits inventoriés) : début {fmt(stock.debut)}, fin {fmt(stock.fin)}</span></label>
        : <span style={{ color:C.textSec }}>Pas d'inventaire avant et pendant la période : le coût = achats seuls.</span>}
    </div>

    <div style={{ background:C.bgSoft, borderRadius:10, padding:"10px 12px", marginBottom:16 }}>
      <p style={{ margin:0, fontSize:11, fontWeight:700, color:C.textSec, textTransform:"uppercase" }}>Coût matière / CA</p>
      <p style={{ margin:"4px 0 0", fontSize:20, fontWeight:800, color:colR(ratio) }}>{pct(ratio)}</p>
      <p style={{ margin:0, fontSize:12, color:C.textSec }}>Coût {fmt(cout)}</p>
    </div>
    <button onClick={cloturer} disabled={saving} style={{ padding:"11px 24px", background:C.brand, color:"#fff", border:"none", borderRadius:10, fontSize:14, fontWeight:700, cursor:"pointer", opacity:saving?.6:1 }}>
      {saving ? "Enregistrement..." : "Clôturer la période"}</button>
  </div>;
}
