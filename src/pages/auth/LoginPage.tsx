import {useState} from 'react';
import {Link,Navigate,useNavigate} from '@/lib/router';
import {useBackend} from '@/lib/backend';
import {supabase} from '@/lib/backend/client';
import {useAuthStore} from '@/store/authStore';
import {authDestination} from '@/lib/authDestination';
import {AuthLayout,authInput,authButton} from '@/components/auth/AuthLayout';
import {GoogleButton,AuthDivider} from '@/components/auth/GoogleButton';
import {Eye,EyeOff} from 'lucide-react';
export default function LoginPage(){
 const backend=useBackend();const {user,fetchProfile}=useAuthStore();const navigate=useNavigate();const destination=authDestination();
 const [email,setEmail]=useState(()=>localStorage.getItem('remembered_email')||''),[password,setPassword]=useState(''),[show,setShow]=useState(false),[remember,setRemember]=useState(()=>!!localStorage.getItem('remembered_email'));
 const [forgot,setForgot]=useState(false),[sent,setSent]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('');
 if(user)return <Navigate to={destination}/>;
 const submit=async(e:React.FormEvent)=>{e.preventDefault();setBusy(true);setError('');try{
 if(forgot){const result=await backend.auth.resetPassword(email.trim());if(result.error)throw new Error('No pudimos enviar el enlace. Intenta nuevamente.');setSent(true);return;}
 const result=await backend.auth.signIn(email.trim(),password);if(result.error||!result.session)throw new Error('Correo o contraseña incorrectos.');
 if(remember)localStorage.setItem('remembered_email',email.trim());else localStorage.removeItem('remembered_email');
 await fetchProfile(result.session.user.id);navigate(destination);
 }catch(e){setError(e instanceof Error?e.message:'No pudimos continuar.');}finally{setBusy(false)}};
 return <AuthLayout title={forgot?'Recupera tu contraseña':'Bienvenido de nuevo'}>
 {!forgot&&<><GoogleButton disabled={busy} onClick={async()=>{const {error}=await supabase.auth.signInWithOAuth({provider:'google',options:{redirectTo:window.location.origin+'/login?next='+encodeURIComponent(destination)}});if(error)setError('No pudimos conectar con Google.');}}/><AuthDivider/></>}
 {sent?<p role="status" className="text-sm text-muted-foreground">Si el correo está registrado, recibirás un enlace para cambiar tu contraseña.</p>:<form onSubmit={submit} className="space-y-4" aria-busy={busy}>
 {forgot&&<p className="text-sm text-muted-foreground">Te enviaremos un enlace para crear una nueva contraseña.</p>}
 <label className="block text-sm font-medium">Correo electrónico<input required type="email" autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)} className={authInput}/></label>
 {!forgot&&<><label className="block text-sm font-medium">Contraseña<div className="relative"><input required type={show?'text':'password'} autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)} className={authInput+' pr-12'}/><button type="button" aria-label={show?'Ocultar contraseña':'Mostrar contraseña'} onClick={()=>setShow(!show)} className="absolute right-2 top-1.5 p-2 text-muted-foreground">{show?<EyeOff size={20}/>:<Eye size={20}/>}</button></div></label><div className="flex flex-wrap items-center justify-between gap-2 text-sm"><label className="flex items-center gap-2"><input type="checkbox" checked={remember} onChange={e=>setRemember(e.target.checked)} className="accent-primary"/>Recordarme</label><button type="button" className="text-primary" onClick={()=>{setForgot(true);setError('');}}>¿Olvidaste tu contraseña?</button></div></>}
 {error&&<p role="alert" className="text-sm text-red-500">{error}</p>}<button disabled={busy} className={authButton}>{busy?'Un momento…':forgot?'Enviar enlace':'Ingresar'}</button>
 </form>}
 <div className="mt-5 text-center text-sm text-muted-foreground">{forgot?<button onClick={()=>{setForgot(false);setSent(false);setError('');}} className="text-primary font-medium">Volver a ingresar</button>:<>¿No tienes cuenta? <Link to={'/registro?next='+encodeURIComponent(destination)} className="text-primary font-medium">Crear cuenta</Link></>}</div>
 </AuthLayout>;
}
