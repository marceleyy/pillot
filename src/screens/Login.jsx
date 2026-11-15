import { useState } from "react";
import { supabase } from "../lib/supabase";
import { C, Icon } from "../ui";

// ── LOGIN ─────────────────────────────────────────────────────
export default function Login(){
  const [email,setEmail]=useState(""),[ pwd,setPwd]=useState(""),[ loading,setLoading]=useState(false),[ err,setErr]=useState("");
  const go=async()=>{setLoading(true);setErr("");const{error}=await supabase.auth.signInWithPassword({email,password:pwd});if(error)setErr("Email ou mot de passe incorrect");setLoading(false);};
  const inp={width:"100%",boxSizing:"border-box",padding:"11px 14px",borderRadius:10,border:`1.5px solid ${C.border}`,fontSize:14,outline:"none"};
  return<div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:"linear-gradient(135deg,#0F172A 0%,#1E3A5F 100%)",padding:20}}>
    <div style={{background:C.surface,borderRadius:20,padding:"40px 36px",width:"100%",maxWidth:380,boxShadow:"0 25px 60px rgba(0,0,0,.3)"}}>
      <div style={{textAlign:"center",marginBottom:32}}>
        <div style={{width:60,height:60,background:"linear-gradient(135deg,#2563EB,#0F172A)",borderRadius:18,display:"inline-flex",alignItems:"center",justifyContent:"center",marginBottom:14,boxShadow:"0 8px 24px rgba(37,99,235,.4)"}}>
          <span style={{color:"#fff",fontSize:26,fontWeight:800}}>P</span>
        </div>
        <h1 style={{margin:0,fontSize:28,fontWeight:800,color:C.text,letterSpacing:"-1px"}}>Pillot</h1>
        <p style={{margin:"6px 0 0",color:C.textSec,fontSize:14}}>pillot-restaurant.fr</p>
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:12}}>
        <div><label style={{fontSize:11,fontWeight:700,color:C.textSec,textTransform:"uppercase",letterSpacing:".5px",display:"block",marginBottom:5}}>Email</label>
          <input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="votre@email.com" style={inp} onFocus={e=>e.target.style.borderColor=C.brand} onBlur={e=>e.target.style.borderColor=C.border}/></div>
        <div><label style={{fontSize:11,fontWeight:700,color:C.textSec,textTransform:"uppercase",letterSpacing:".5px",display:"block",marginBottom:5}}>Mot de passe</label>
          <input type="password" value={pwd} onChange={e=>setPwd(e.target.value)} onKeyDown={e=>e.key==="Enter"&&go()} placeholder="••••••••" style={inp} onFocus={e=>e.target.style.borderColor=C.brand} onBlur={e=>e.target.style.borderColor=C.border}/></div>
        {err&&<p style={{margin:0,color:C.danger,fontSize:13,display:"flex",alignItems:"center",gap:6}}><Icon n="alert" sz={14}/>{err}</p>}
        <button onClick={go} disabled={loading} style={{padding:13,background:"linear-gradient(135deg,#2563EB,#1D4ED8)",color:"#fff",border:"none",borderRadius:10,fontSize:15,fontWeight:700,cursor:"pointer",opacity:loading?.7:1,marginTop:4,boxShadow:"0 4px 14px rgba(37,99,235,.4)"}}>
          {loading?"Connexion...":"Se connecter"}</button>
      </div>
    </div>
  </div>;
}
