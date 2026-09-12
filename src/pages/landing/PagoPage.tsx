import { useEffect, useState } from 'react';
import { Link, useSearchParams } from '@/lib/router';
import { useDatabase } from '@/lib/backend';
import { supabase } from '@/lib/backend/client';
import { useAuthStore } from '@/store/authStore';
import { useConfig } from '@/store/configStore';
import { PaymentMethods, PaymentBrand, PaymentCurrency, automaticPayment } from '@/components/payments/PaymentMethods';
import { continuePayment } from '@/lib/payments/checkout';
import { ArrowLeft, CheckCircle, ShieldCheck, Info } from 'lucide-react';

export default function PagoPage() {
 const db=useDatabase();const [params]=useSearchParams();const {user,fetchProfile}=useAuthStore();const {exchangeRate,showUsd,setShowUsd}=useConfig();
 const [methods,setMethods]=useState<any[]>([]);const [selected,setSelected]=useState(params.get('method')||'');
 const [session,setSession]=useState<any>(null);const [contract,setContract]=useState<any>(null);const [plan,setPlan]=useState<any>(null);
 const [payerEmail,setPayerEmail]=useState(user?.email||'');
 const [pending,setPending]=useState<any>(null);
 const [busy,setBusy]=useState(false);const [loaded,setLoaded]=useState(false);const [error,setError]=useState('');const [notice,setNotice]=useState('');
 const currency=showUsd?'USD':'PEN';const setCurrency=(value:string)=>setShowUsd(value==='USD');
 const [reference,setReference]=useState('');const [file,setFile]=useState<File|null>(null);
 const sessionId=params.get('session'),contractId=params.get('subscription'),planSlug=params.get('plan'),orderId=params.get('order');const cancelled=params.get('cancel')==='1';
 const invoke=async(name:string,body:any)=>{const {data,error}=await db.invoke<any>(name,{body});if(error||!data?.success)throw new Error(data?.error||'No pudimos conectar. Inténtalo de nuevo.');return data;};
 const refresh=async()=>{
  if(contractId){const d=await invoke('subscription-billing',{action:'verify',contract_id:contractId});setContract(d.contract);if(d.contract.paid_until&&user)await fetchProfile(user.id);}
  if(sessionId){const d=await invoke('process-payment',{action:'verify',session_id:sessionId});const {data,error}=await db.select<any>('payment_sessions',{filter:{id:sessionId},single:true});if(error)throw new Error('No pudimos cargar este pago.');setSession(data);if(d.status==='paid'&&user)await fetchProfile(user.id);}
 };
 useEffect(()=>{if(!user)return;let active=true;setLoaded(false);setError('');
  (async()=>{
   const d=await invoke('process-payment',{action:'methods'});if(!active)return;setMethods(d.methods.filter((m:any)=>m.ready));
   if(planSlug){const {data}=await db.select<any>('billing_contracts',{filter:{user_id:user.id},order:{column:'created_at',ascending:false}});if(active)setPending((data||[]).find((c:any)=>['pending','active','suspended'].includes(c.status))||null);}
   if(planSlug||orderId){const {data,error}=await db.select<any>(orderId?'orders':'plans',{filter:orderId?{id:orderId,user_id:user.id}:{slug:planSlug,is_active:true},single:true});if(error)throw new Error('No pudimos encontrar el pedido o plan.');if(active)setPlan(data);}
   if(cancelled){
    if(sessionId){const {data}=await db.select<any>('payment_sessions',{filter:{id:sessionId},single:true});if(active)setSession(data);}
    if(contractId){const {data}=await db.select<any>('billing_contracts',{filter:{id:contractId},single:true});if(active)setContract(data);}
   }else if(sessionId||contractId)await refresh();
  })().catch(e=>active&&setError(e.message)).finally(()=>active&&setLoaded(true));return()=>{active=false};
 },[user?.id,sessionId,contractId,planSlug,orderId,cancelled]);
 const compatibleMethods=methods.filter(m=>m.currency===currency);
 const method=(!!(sessionId||contractId)?methods:compatibleMethods).find(m=>m.slug===(session?.gateway||contract?.gateway||selected));
 const isOrder=!!(orderId||session?.order_id);const returning=!!(sessionId||contractId);const record=session||contract;
 const paid=session?.status==='paid'||!!(contract?.paid_until&&new Date(contract.paid_until)>new Date());
 const auto=!!planSlug&&automaticPayment(selected);
 const base=Number(plan?.price??plan?.total??0);const quoted=plan?.currency!==currency?(plan?.currency==='PEN'?base/exchangeRate:base*exchangeRate):base;
 const back=isOrder?'/dashboard/pedidos':'/dashboard/mi-plan';
 const start=async()=>{if(!method)return;setBusy(true);setError('');try{const d=await invoke(auto?'subscription-billing':'process-payment',auto?{action:'create',gateway:selected,plan_slug:planSlug,payer_email:payerEmail}:{gateway:selected,plan_slug:planSlug,order_id:orderId});continuePayment(d);}catch(e:any){setError(e.message);setBusy(false)}};
 const verify=async()=>{setBusy(true);setError('');try{await refresh();setNotice('Estado actualizado directamente con la pasarela.');}catch(e:any){setError(e.message)}finally{setBusy(false)}};
 const upload=async()=>{if(!file||!user||!reference.trim())return;setBusy(true);setError('');try{
  if(file.size>5*1024*1024)throw new Error('El archivo debe pesar menos de 5 MB.');
  if(!['image/jpeg','image/png','image/webp','application/pdf'].includes(file.type))throw new Error('Adjunta una imagen o PDF.');
  const path=`${user.id}/${crypto.randomUUID()}.${file.type==='application/pdf'?'pdf':file.type.split('/')[1]}`;
  const {error}=await supabase.storage.from('payment-receipts').upload(path,file);if(error)throw new Error('No se pudo subir el comprobante.');
  await invoke('process-payment',{action:'receipt',session_id:session.id,path,reference});setSession({...session,status:'review'});
 }catch(e:any){setError(e.message)}finally{setBusy(false)}};
 let accounts:any[]=[];try{accounts=JSON.parse(method?.credentials?.accounts||'[]')}catch{}
 const button='inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-primary text-white font-semibold text-sm hover:bg-primary/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary disabled:opacity-50';
 return <main className="max-w-3xl mx-auto w-full px-5 pt-28 md:pt-32 pb-16">
  <Link to={back} className="inline-flex items-center gap-2 text-sm text-muted-foreground mb-7"><ArrowLeft className="w-4 h-4"/>{isOrder?'Mis pedidos':'Mi plan'}</Link>
  <h1 className="text-2xl font-bold mb-2">{returning?paid?'Pago confirmado':'Estado de tu pago':isOrder?'Completa tu pedido':pending?'Completa tu autorización':'Activa tu membresía'}</h1>
  {!user?<p className="mt-5"><Link to="/login" className="text-primary">Inicia sesión</Link> para continuar.</p>:<div className="mt-6 space-y-6" aria-busy={busy}>
   {error&&<p role="alert" className="text-red-500 text-sm">{error}</p>}
   {notice&&<p role="status" className="text-muted-foreground text-sm">{notice}</p>}
   {cancelled&&!paid&&<div role="status" className="flex gap-3 rounded-xl bg-muted/50 p-4"><Info className="w-5 h-5 shrink-0 text-primary"/><p className="text-sm">Saliste del pago sin completarlo. {isOrder?'Tu pedido sigue pendiente; puedes retomarlo cuando quieras.':'Tu membresía anterior no ha cambiado.'}</p></div>}
   {!returning&&<>
    {!pending&&<div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4 py-3 min-h-[96px]"><div><p className="font-semibold">{plan?.name||plan?.order_number||'Preparando el resumen…'}</p><p className="text-sm text-muted-foreground">{auto?'Mensual · cancela futuras renovaciones cuando quieras':isOrder?'Un solo pago':'Un mes de acceso'}</p></div><p className="text-xl font-semibold whitespace-nowrap tabular-nums text-right min-w-[140px]">{loaded&&plan?`${currency} ${quoted.toFixed(2)}`:''}{auto&&<span className="text-sm font-normal text-muted-foreground">/mes</span>}</p></div>}
    {pending&&<section className="rounded-xl border border-border bg-card p-5 space-y-4"><div className="flex items-center gap-3"><PaymentBrand slug={pending.gateway}/><div className="min-w-0"><h2 className="font-semibold">{pending.status==='pending'?'Autorización pendiente':'Suscripción existente'}</h2><p className="text-sm text-muted-foreground">{pending.plan_slug} · {pending.currency} {Number(pending.amount).toFixed(2)} / mes</p></div></div><p className="text-sm text-muted-foreground">{pending.status==='pending'?'Aún falta completar la autorización. Retómala para continuar, o descártala si prefieres otro método.':'Gestiona la renovación y la fecha de tus beneficios desde Mi Plan.'}</p><div className="flex flex-wrap gap-3"><Link className={button} to={`/pago?subscription=${pending.id}`}>{pending.status==='pending'?'Continuar autorización':'Ver suscripción'}</Link>{pending.status==='pending'&&<button className="px-4 py-3 rounded-xl border border-border text-sm" disabled={busy} onClick={async()=>{setBusy(true);setError('');try{await invoke('subscription-billing',{action:'cancel',contract_id:pending.id});setPending(null);setSelected('');setNotice('Autorización descartada. Elige cómo quieres pagar.');}catch(e:any){setError(e.message)}finally{setBusy(false)}}}>Descartar y elegir otro método</button>}</div></section>}
    {!pending&&<>
    {loaded&&<PaymentCurrency value={currency} disabled={busy} onChange={value=>{setCurrency(value);setSelected('');}}/>}
    {loaded&&<PaymentMethods methods={compatibleMethods} value={selected} onChange={setSelected} membership={!!planSlug} disabled={busy}/>}
    {auto&&selected==='mercadopago'&&<label className="block text-sm">Correo de tu cuenta de Mercado Pago Perú<input type="email" autoComplete="email" value={payerEmail} onChange={e=>setPayerEmail(e.target.value)} className="block w-full mt-2 rounded-lg border border-border bg-muted p-3"/><span className="block text-sm text-muted-foreground mt-2">Debe corresponder a tu cuenta compradora de Perú. Puede ser distinto del correo con el que ingresas aquí.</span></label>}
    {method&&<p className="text-sm text-muted-foreground">{auto?`Autorizarás el cobro de ${method.currency} ${quoted.toFixed(2)} cada mes en ${method.name}. Puedes cancelar la renovación desde Mi Plan y conservar el acceso hasta la fecha pagada.`:automaticPayment(selected)?`Continuarás de forma segura en ${method.name}, en esta misma pestaña.`:'Al continuar verás los datos para transferir y adjuntar tu comprobante.'}</p>}
    <button className={button+' w-full'} disabled={!loaded||busy||!method||!plan||!!(pending&&(pending.status!=='pending'||pending.plan_slug!==planSlug||pending.gateway!==selected))} onClick={start}>{busy?`Conectando con ${method?.name}…`:auto?`Suscribirme con ${method?.name||''}`:method?`Continuar con ${method.name}`:'Selecciona un método'}</button>
    <p className="flex items-center justify-center gap-2 text-sm text-muted-foreground"><ShieldCheck className="w-4 h-4"/>Tus datos de tarjeta se ingresan en la pasarela.</p>
    </>}
   </>}
   {returning&&record&&<>
    <div className="flex items-center gap-3"><PaymentBrand slug={record.gateway}/><div><p className="font-semibold">{method?.name||record.gateway}</p><p className="text-lg">{record.currency} {Number(record.amount).toFixed(2)}{contract&&<span className="text-sm text-muted-foreground">/mes</span>}</p></div></div>
    {paid?<div role="status" className="space-y-3"><CheckCircle className="w-7 h-7 text-emerald-500"/><p>{isOrder?'Tu pedido está pagado. Puedes seguir su estado desde Mis pedidos.':`Tu membresía está activa.${contract?.paid_until?' Beneficios hasta el '+new Date(contract.paid_until).toLocaleDateString('es-PE')+'.':''}`}</p><Link to={back} className={button}>{isOrder?'Ver mis pedidos':'Ver mi membresía'}</Link></div>:
     session?.status==='review'?<p role="status">Recibimos tu comprobante. Te avisaremos en las notificaciones cuando termine la revisión.</p>:
     session?.status==='rejected'?<p role="alert">El comprobante fue rechazado. Contacta con soporte para revisar el pago.</p>:
     contract?.status==='cancelled'?<p role="status">La autorización mensual se canceló. No habrá nuevas renovaciones.</p>:
     session&&!automaticPayment(session.gateway)?<div className="space-y-5"><p className="text-sm text-muted-foreground">Transfiere el importe indicado y adjunta tu comprobante.</p>
      {session.gateway==='transfer'?accounts.map((a:any,i:number)=><div key={i} className="space-y-1"><p className="font-semibold">{a.bank} · {a.currency||'PEN'}</p><p>{a.holder}</p><p className="font-mono text-sm">Cuenta: {a.number}</p>{a.cci&&<p className="font-mono text-sm">CCI: {a.cci}</p>}</div>):<div><p>{method?.credentials?.merchant_name}</p><p className="text-xl font-semibold">{method?.credentials?.phone_number}</p></div>}
      <div className="grid sm:grid-cols-2 gap-5"><label className="text-sm">Número de operación<input value={reference} onChange={e=>setReference(e.target.value)} maxLength={100} className="block w-full mt-2 rounded-lg border border-border bg-background p-3"/></label><label className="text-sm">Comprobante · imagen o PDF, hasta 5 MB<input type="file" accept="image/jpeg,image/png,image/webp,application/pdf" onChange={e=>setFile(e.target.files?.[0]||null)} className="block mt-2 w-full text-sm"/></label></div><button onClick={upload} disabled={busy||!file||!reference.trim()} className={button}>{busy?'Enviando…':'Enviar comprobante'}</button></div>:
     <div className="space-y-4"><p className="text-sm text-muted-foreground">{contract?.status==='active'?'Autorización recibida. Esperamos la confirmación del primer cobro para activar tus beneficios.':'Tu pago aún no está confirmado.'}</p><div className="flex flex-wrap gap-3">{record.checkout_url&&(!contract||contract.status==='pending')&&<a href={record.checkout_url} className={button}>Retomar pago</a>}<button onClick={verify} disabled={busy} className="px-5 py-3 border border-border rounded-xl text-sm">{busy?'Consultando…':'Actualizar estado'}</button></div></div>}
   </>}
  </div>}
 </main>;
}
