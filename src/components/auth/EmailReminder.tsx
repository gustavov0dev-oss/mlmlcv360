import {useEffect,useState} from 'react';
import {supabase} from '@/lib/backend/client';
import {useDatabase} from '@/lib/backend';
import {useAuthStore} from '@/store/authStore';
export function EmailReminder(){
 const {user}=useAuthStore();const db=useDatabase();const [pending,setPending]=useState(false),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[dismissed,setDismissed]=useState(false);
 const token=new URLSearchParams(window.location.search).get('verify_email');
 useEffect(()=>{if(user)void supabase.from('account_onboarding').select('email_verified_at').eq('user_id',user.id).maybeSingle().then(({data})=>setPending(!!data&&!data.email_verified_at));},[user?.id]);
 if(!pending||dismissed)return null;
 const run=async()=>{setBusy(true);setMessage('');const {data,error}=await db.invoke<any>('account-email',{body:token?{action:'verify',token}:{action:'send'}});setBusy(false);if(error||!data?.success){setMessage(data?.error||'El envío de correos aún no está disponible. Puedes continuar usando tu cuenta.');return;}if(data.verified){setPending(false);const url=new URL(window.location.href);url.searchParams.delete('verify_email');window.history.replaceState({},'',url.pathname+url.search);}else setMessage('Enlace enviado. Revisa tu bandeja de entrada.');};
 return <aside className="mx-4 mt-4 rounded-xl bg-primary/5 border border-primary/20 p-4 text-sm"><div className="flex flex-wrap items-center gap-3"><p className="flex-1 min-w-[200px]">Confirma tu correo para mantener actualizados los datos de tu cuenta. Puedes seguir usando la plataforma.</p><button disabled={busy} onClick={run} className="font-semibold text-primary px-3 py-2 rounded-lg focus-visible:outline focus-visible:outline-primary">{busy?'Un momento…':token?'Confirmar mi correo':'Enviar enlace'}</button><button onClick={()=>setDismissed(true)} className="text-muted-foreground px-3 py-2">Más tarde</button></div>{message&&<p role="status" className="mt-2">{message}</p>}</aside>;
}
