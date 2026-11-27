import { useState } from "react";
import { supabase } from "../lib/supabase";
import { C, Icon } from "../ui";

// ── LOGIN ─────────────────────────────────────────────────────
const LAB={fontSize:11,fontWeight:700,color:C.textSec,textTransform:"uppercase",letterSpacing:".5px",display:"block",marginBottom:5};
const INP={width:"100%",boxSizing:"border-box",padding:"11px 14px",borderRadius:10,border:`1.5px solid ${C.border}`,fontSize:14,outline:"none"};
const BTN={padding:13,background:"linear-gradient(135deg,#4C7DF0,#3D6BE0)",color:"#fff",border:"none",borderRadius:10,fontSize:15,fontWeight:700,cursor:"pointer",marginTop:4,boxShadow:"0 4px 14px rgba(37,99,235,.4)"};
const LIEN={background:"none",border:"none",color:C.brand,fontSize:13,fontWeight:600,cursor:"pointer",padding:0};

function Cadre({children}){
  return<div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:"linear-gradient(135deg,#1A1214 0%,#3A2A2E 100%)",padding:20}}>
    <div style={{background:C.surface,borderRadius:20,padding:"40px 36px",width:"100%",maxWidth:380,boxShadow:"0 25px 60px rgba(0,0,0,.3)"}}>
      <div style={{textAlign:"center",marginBottom:28}}>
        <div style={{width:60,height:60,background:"linear-gradient(135deg,#4C7DF0,#1A1214)",borderRadius:18,display:"inline-flex",alignItems:"center",justifyContent:"center",marginBottom:14,boxShadow:"0 8px 24px rgba(37,99,235,.4)"}}>
          <span style={{color:"#fff",fontSize:26,fontWeight:800}}>P</span>
        </div>
        <h1 style={{margin:0,fontSize:28,fontWeight:800,color:C.text,letterSpacing:"-1px"}}>Pillot</h1>
        <p style={{margin:"6px 0 0",color:C.textSec,fontSize:14}}>La gestion de votre commerce, simplement</p>
      </div>
      {children}
    </div>
  </div>;
}

const Message=({type,children})=>children?<p role={type==="err"?"alert":"status"} style={{margin:0,color:type==="err"?C.danger:C.success,fontSize:13,display:"flex",alignItems:"flex-start",gap:6}}>{type==="err"&&<Icon n="alert" sz={14}/>}{children}</p>:null;

// Connexion, création de compte et mot de passe oublié.
export default function Login(){
  const [mode,setMode]=useState("connexion"),[nom,setNom]=useState(""),[email,setEmail]=useState(""),[pwd,setPwd]=useState("");
  const [loading,setLoading]=useState(false),[err,setErr]=useState(""),[ok,setOk]=useState("");
  const changer=m=>{setMode(m);setErr("");setOk("");};
  const go=async()=>{
    if(loading)return;
    setErr("");setOk("");
    if(!email.trim())return setErr("Indiquez votre e-mail");
    setLoading(true);
    if(mode==="connexion"){
      const{error}=await supabase.auth.signInWithPassword({email:email.trim(),password:pwd});
      if(error)setErr(error.message?.includes("not confirmed")?"Confirmez d'abord votre e-mail (lien reçu à l'inscription)":"E-mail ou mot de passe incorrect");
    }else if(mode==="inscription"){
      if(pwd.length<8){setLoading(false);return setErr("Le mot de passe doit faire au moins 8 caractères");}
      const{data,error}=await supabase.auth.signUp({email:email.trim(),password:pwd,options:{data:{name:nom.trim()},emailRedirectTo:window.location.origin}});
      if(error)setErr(error.message?.includes("registered")?"Un compte existe déjà avec cet e-mail":"Inscription impossible, réessayez");
      else if(!data.session)setOk("Compte créé. Ouvrez le lien reçu par e-mail pour l'activer, puis connectez-vous.");
    }else{
      const{error}=await supabase.auth.resetPasswordForEmail(email.trim(),{redirectTo:window.location.origin});
      if(error)setErr("Envoi impossible, réessayez dans quelques minutes");
      else setOk("Si un compte existe avec cet e-mail, un lien pour choisir un nouveau mot de passe vient d'être envoyé.");
    }
    setLoading(false);
  };
  const titre={connexion:"Se connecter",inscription:"Créer mon compte",oubli:"Recevoir le lien"}[mode];
  return<Cadre>
    <form onSubmit={e=>{e.preventDefault();go();}} style={{display:"flex",flexDirection:"column",gap:12}}>
      {mode==="inscription"&&<div><label style={LAB} htmlFor="l-nom">Votre prénom et nom</label>
        <input id="l-nom" value={nom} onChange={e=>setNom(e.target.value)} autoComplete="name" placeholder="Camille Martin" style={INP}/></div>}
      <div><label style={LAB} htmlFor="l-email">E-mail</label>
        <input id="l-email" type="email" value={email} onChange={e=>setEmail(e.target.value)} autoComplete="email" placeholder="votre@email.com" style={INP}/></div>
      {mode!=="oubli"&&<div><label style={LAB} htmlFor="l-pwd">Mot de passe</label>
        <input id="l-pwd" type="password" value={pwd} onChange={e=>setPwd(e.target.value)} autoComplete={mode==="inscription"?"new-password":"current-password"} placeholder={mode==="inscription"?"8 caractères minimum":"••••••••"} style={INP}/></div>}
      {mode==="oubli"&&<p style={{margin:0,fontSize:13,color:C.textSec}}>Nous vous envoyons un lien pour choisir un nouveau mot de passe.</p>}
      <Message type="err">{err}</Message>
      <Message type="ok">{ok}</Message>
      <button type="submit" disabled={loading} style={{...BTN,opacity:loading?.7:1}}>{loading?"Un instant...":titre}</button>
    </form>
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:10,marginTop:18}}>
      {mode==="connexion"&&<>
        <button onClick={()=>changer("oubli")} style={{...LIEN,color:C.textSec,fontWeight:500}}>Mot de passe oublié ?</button>
        <p style={{margin:0,fontSize:13,color:C.textSec}}>Nouveau sur Pillot ? <button onClick={()=>changer("inscription")} style={LIEN}>Créer un compte</button></p>
      </>}
      {mode!=="connexion"&&<button onClick={()=>changer("connexion")} style={LIEN}>J'ai déjà un compte</button>}
    </div>
  </Cadre>;
}

// Après le lien « mot de passe oublié » : choisir le nouveau mot de passe.
export function NouveauMotDePasse({onFini,onAnnuler}){
  const [pwd,setPwd]=useState(""),[pwd2,setPwd2]=useState(""),[loading,setLoading]=useState(false),[err,setErr]=useState("");
  const go=async()=>{
    if(loading)return;
    if(pwd.length<8)return setErr("Le mot de passe doit faire au moins 8 caractères");
    if(pwd!==pwd2)return setErr("Les deux mots de passe sont différents");
    setLoading(true);setErr("");
    const{error}=await supabase.auth.updateUser({password:pwd});
    setLoading(false);
    if(error)return setErr(error.code==="same_password"?"Choisissez un mot de passe différent de l'ancien":error.code==="weak_password"?"Mot de passe trop simple, ajoutez des chiffres ou des lettres":"Changement impossible, redemandez un lien");
    onFini?.();
  };
  return<Cadre>
    <form onSubmit={e=>{e.preventDefault();go();}} style={{display:"flex",flexDirection:"column",gap:12}}>
      <h2 style={{margin:0,fontSize:17,fontWeight:800}}>Nouveau mot de passe</h2>
      <div><label style={LAB} htmlFor="n-pwd">Mot de passe</label>
        <input id="n-pwd" type="password" value={pwd} onChange={e=>setPwd(e.target.value)} autoComplete="new-password" placeholder="8 caractères minimum" style={INP}/></div>
      <div><label style={LAB} htmlFor="n-pwd2">Encore une fois</label>
        <input id="n-pwd2" type="password" value={pwd2} onChange={e=>setPwd2(e.target.value)} autoComplete="new-password" style={INP}/></div>
      <Message type="err">{err}</Message>
      <button type="submit" disabled={loading} style={{...BTN,opacity:loading?.7:1}}>{loading?"Un instant...":"Enregistrer"}</button>
      <button type="button" onClick={onAnnuler} style={{...LIEN,alignSelf:"center"}}>Garder mon mot de passe actuel</button>
    </form>
  </Cadre>;
}
