import { supabase } from '@/lib/backend/client';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate } from '@/lib/router';
import { useBackend, useDatabase } from '@/lib/backend';
import { useConfig } from '@/store/configStore';
import { Eye, EyeOff } from 'lucide-react';

const schema = z.object({
 first_name:z.string().trim().min(2,'Ingresa tu nombre').max(80),
 last_name:z.string().trim().min(2,'Ingresa tus apellidos').max(120),
 email:z.string().trim().email('Ingresa un correo válido'),
 password:z.string().min(8,'Usa al menos 8 caracteres'),
 referral_code:z.string().trim().max(40).optional(),
});
type Values=z.infer<typeof schema>;
export function RegistrationForm({destination='/dashboard', allowPlan=false}:{destination?:string;allowPlan?:boolean}) {
 const backend=useBackend();const db=useDatabase();const navigate=useNavigate();const {company,plans}=useConfig();
 const [busy,setBusy]=useState(false),[visible,setVisible]=useState(false),[error,setError]=useState(''),[plan,setPlan]=useState('');
 const required=company.register_referral_required==='true';
 const {register,handleSubmit,setError:fieldError,formState:{errors}}=useForm<Values>({resolver:zodResolver(schema),defaultValues:{referral_code:new URLSearchParams(window.location.search).get('ref')||''}});
 const target=plan?`/pago?plan=${encodeURIComponent(plan)}`:destination;
 const checkEmail=async(email:string)=>{
  const result=await db.rpc<{email_exists:boolean}>('check_user_exists',{p_email:email.trim(),p_username:''});
  if(result.error)throw new Error('No pudimos verificar tu correo. Vuelve a intentarlo.');
  const row=Array.isArray(result.data)?result.data[0]:result.data;
  if(row?.email_exists){fieldError('email',{message:'Este correo ya tiene una cuenta. Inicia sesión para continuar.'});return false;}return true;
 };
 const submit=async(values:Values)=>{setBusy(true);setError('');try{
  if(!await checkEmail(values.email))return;
  if(required&&!values.referral_code){fieldError('referral_code',{message:'Ingresa el código de quien te invitó.'});return;}
  sessionStorage.setItem('cluv-auth-next',target);
  const result=await backend.auth.signUp(values.email,values.password,{first_name:values.first_name,last_name:values.last_name,full_name:`${values.first_name} ${values.last_name}`,plan:'free',referral_code:values.referral_code||''});
  if(result.error)throw new Error(/already registered/i.test(result.error)?'Este correo ya tiene una cuenta. Inicia sesión.':/password/i.test(result.error)?'La contraseña debe tener al menos 8 caracteres.':'No pudimos crear tu cuenta. Revisa el código de referido e intenta nuevamente.');
  if(!result.session)throw new Error('Cuenta creada. Inicia sesión para continuar.');
  navigate(target);
 }catch(e){sessionStorage.removeItem('cluv-auth-next');setError(e instanceof Error?e.message:'No pudimos crear tu cuenta.');}finally{setBusy(false)}};
 const input='mt-2 w-full rounded-xl border border-border bg-background px-3 py-3 text-base focus:outline-none focus:ring-2 focus:ring-primary/50';
 return <form onSubmit={handleSubmit(submit)} className="space-y-5" aria-busy={busy}>
  <div className="grid sm:grid-cols-2 gap-4">{(['first_name','last_name'] as const).map(key=><label className="text-sm font-medium" key={key}>{key==='first_name'?'Nombre':'Apellidos'}<input autoComplete={key==='first_name'?'given-name':'family-name'} {...register(key)} className={input} aria-invalid={!!errors[key]}/>{errors[key]&&<span className="block mt-1 text-sm text-red-500">{errors[key]?.message}</span>}</label>)}</div>
  <label className="block text-sm font-medium">Correo electrónico<input type="email" autoComplete="email" {...register('email',{onBlur:e=>{if(z.string().email().safeParse(e.target.value).success)void checkEmail(e.target.value).catch(()=>{});}})} className={input} aria-invalid={!!errors.email}/>{errors.email&&<span role="alert" className="block mt-1 text-sm text-red-500">{errors.email.message}</span>}</label>
  <label className="block text-sm font-medium">Contraseña<div className="relative"><input type={visible?'text':'password'} autoComplete="new-password" {...register('password')} className={input+' pr-12'}/><button type="button" aria-label={visible?'Ocultar contraseña':'Mostrar contraseña'} onClick={()=>setVisible(!visible)} className="absolute right-2 top-3 p-2 text-muted-foreground">{visible?<EyeOff size={20}/>:<Eye size={20}/>}</button></div><span className="block mt-1 text-sm text-muted-foreground">{errors.password?.message||'Al menos 8 caracteres.'}</span></label>
  <label className="block text-sm font-medium">Código de referido <span className="font-normal text-muted-foreground">{required?'(obligatorio)':'(opcional)'}</span><input {...register('referral_code')} autoCapitalize="characters" className={input}/>{errors.referral_code?<span className="text-sm text-red-500">{errors.referral_code.message}</span>:!required&&<span className="block mt-1 text-sm text-muted-foreground">Si lo dejas vacío, ingresarás con el referido de la empresa. Podrás cambiarlo en tu perfil.</span>}</label>
  {allowPlan&&company.register_show_plans!=='false'&&<label className="block text-sm font-medium">Membresía <span className="text-muted-foreground font-normal">(opcional)</span><select value={plan} onChange={e=>setPlan(e.target.value)} className={input+' [color-scheme:light] dark:[color-scheme:dark]'}><option value="">Crear mi cuenta y elegir después</option>{plans.filter(p=>p.is_active&&Number(p.price)>0).map(p=><option key={p.slug} value={p.slug}>{p.name}</option>)}</select><span className="block mt-1 text-sm text-muted-foreground">Los beneficios del plan se activan al confirmar el pago.</span></label>}
  {error&&<p role="alert" className="text-sm text-red-500">{error}</p>}
  <p className="text-sm text-muted-foreground">Al crear tu cuenta aceptas los <Link to="/legal/terminos-y-condiciones" className="text-primary underline">términos y condiciones</Link>.</p>
  <button disabled={busy} className="w-full rounded-xl bg-primary text-primary-foreground px-4 py-3 font-semibold disabled:opacity-60">{busy?'Creando tu cuenta…':target.startsWith('/pago')?'Crear cuenta y continuar':'Crear mi cuenta'}</button>
  {company.google_oauth_enabled==='true'&&!required&&<button type="button" disabled={busy} className="w-full rounded-xl border border-border px-4 py-3 font-medium" onClick={async()=>{sessionStorage.setItem('cluv-auth-next',target);const {error}=await supabase.auth.signInWithOAuth({provider:'google',options:{redirectTo:window.location.origin+'/login?next='+encodeURIComponent(target)}});if(error)setError('No pudimos iniciar sesión con Google.');}}>Continuar con Google</button>}
  <p className="text-sm text-center text-muted-foreground">¿Ya tienes cuenta? <Link to={`/login?next=${encodeURIComponent(target)}`} className="text-primary font-medium">Inicia sesión</Link></p>
 </form>;
}
