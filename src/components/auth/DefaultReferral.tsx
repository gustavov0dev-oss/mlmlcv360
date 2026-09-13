import {useEffect,useState} from 'react';
import {supabase} from '@/lib/backend/client';
import {useAuthStore} from '@/store/authStore';
export function DefaultReferral(){
 const {user,fetchProfile}=useAuthStore();const [allowed,setAllowed]=useState(false),[code,setCode]=useState(''),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
 useEffect(()=>{if(user)void supabase.from('account_onboarding').select('default_referral').eq('user_id',user.id).maybeSingle().then(({data})=>setAllowed(data?.default_referral===true));},[user?.id]);
 if(!allowed&&!message)return null;
 return <section className="bg-card border border-border rounded-xl p-5"><h2 className="font-semibold">Quién te invitó</h2>{allowed&&<><p className="text-sm text-muted-foreground mt-2">Ingresaste con el referido de la empresa. Puedes reemplazarlo por el código de quien te invitó. Este cambio se realiza una sola vez.</p><form className="flex flex-wrap gap-3 mt-4" onSubmit={async e=>{e.preventDefault();if(!user)return;setBusy(true);const {error}=await supabase.rpc('change_default_referral',{p_code:code});setMessage(error?error.message:'Referido actualizado.');if(!error){setAllowed(false);await fetchProfile(user.id);}setBusy(false);}}><label className="sr-only" htmlFor="new-referral">Código de referido</label><input id="new-referral" required value={code} onChange={e=>setCode(e.target.value.toUpperCase())} className="border border-border rounded-lg bg-background p-3"/><button disabled={busy} className="rounded-lg px-4 py-3 bg-primary text-primary-foreground">Guardar referido</button></form></>}{message&&<p role="status" className="text-sm mt-3">{message}</p>}</section>;
}
