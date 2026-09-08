import {useCallback,useEffect,useRef,useState} from 'react';
import {useNavigate,useSearchParams} from '@/lib/router';
import {supabase} from '@/lib/backend/client';
import {useAuthStore} from '@/store/authStore';
import {RichTextEditor} from '@/components/ui/rich-text-editor';
import {contactInboxChanged} from '@/hooks/useContactNotifications';
import {ArrowLeft,Mail,Reply,Save,Send,RefreshCw,CheckCheck} from 'lucide-react';
import {toast} from 'sonner';
import {cn} from '@/lib/utils';

interface Message {id:string;name:string;email:string;subject:string;message:string;status:'new'|'read'|'replied';created_at:string;replied_at:string|null}
interface ReplyRow {id:string;contact_message_id:string;author_id:string;subject:string;body_html:string;body_text:string;state:'draft'|'sending'|'sent'|'failed'|'unknown';attempted_at:string|null;error_code:string|null;created_at:string;sent_at:string|null}
const replyColumns='id,contact_message_id,author_id,subject,body_html,body_text,state,attempted_at,error_code,created_at,sent_at';
// Preserve unsaved edits during dashboard navigation; never persist contact data in browser storage.
const pendingDrafts=new Map<string,{subject:string;html:string;draftId:string}>();
const labels={new:'Nuevo',read:'Leído',replied:'Respondido'};
const replyLabels={draft:'Borrador',sending:'Enviando',sent:'Enviado al servicio de correo',failed:'No enviado',unknown:'Envío por verificar'};
const inputClass='w-full px-3 py-2.5 bg-muted border border-border rounded-lg text-sm text-foreground focus:outline-none focus:border-primary';
function plainText(html:string){const doc=new DOMParser().parseFromString(html,'text/html');return doc.body.textContent?.replace(/\u00a0/g,' ').trim()||'';}
const errorText:Record<string,string>={email_not_configured:'Falta configurar el correo de salida. Tu borrador está guardado.',provider_rejected:'El servicio de correo rechazó el envío. Revisa el remitente y la configuración antes de reintentar.',delivery_unknown:'No se pudo confirmar el envío. Reintenta esta misma respuesta para verificarla sin duplicarla.',delivery_record_pending:'El correo fue aceptado, pero falta confirmar el registro. Reintenta esta misma respuesta.',manual_review_required:'Este envío necesita revisión antes de volver a enviarlo. No crees una copia hasta confirmar si llegó.',sending:'El envío sigue en curso. Espera un minuto antes de verificarlo.',reply_changed_or_busy:'La respuesta cambió o está en proceso. Vuelve a abrir el mensaje.'};

export function ContactInbox(){
 const [params]=useSearchParams();
 const navigate=useNavigate();
 const linkedId=params.get('message');
 const [selected,setSelected]=useState<string|null>(linkedId);
 const [rows,setRows]=useState<Message[]>([]);
 const [filter,setFilter]=useState('all');const [page,setPage]=useState(0);const [more,setMore]=useState(false);
 const [loading,setLoading]=useState(true);const [failed,setFailed]=useState(false);
 useEffect(()=>{setSelected(linkedId);},[linkedId]);
 const load=useCallback(async()=>{setLoading(true);setFailed(false);try{let query=supabase.from('contact_messages').select('id,name,email,subject,message,status,created_at,replied_at').order('created_at',{ascending:false}).order('id').range(page*20,page*20+20);if(filter!=='all')query=query.eq('status',filter);const {data,error}=await query;if(error||!data)throw error;setRows(data.slice(0,20));setMore(data.length>20);}catch{setFailed(true);}finally{setLoading(false);}},[filter,page]);
 useEffect(()=>{void load();},[load]);
 if(selected)return <ContactThread key={selected} id={selected} onBack={()=>{setSelected(null);navigate('/dashboard/admin/contacto?tab=messages',{replace:true});void load();}}/>;
 return <div className="space-y-4">
  <div className="flex flex-wrap justify-between gap-3 items-center"><h2 className="font-bold text-lg">Mensajes recibidos</h2><button onClick={load} disabled={loading} className="inline-flex items-center gap-2 text-sm text-primary"><RefreshCw className={cn('w-4 h-4',loading&&'animate-spin')}/>Actualizar</button></div>
  <div className="flex flex-wrap gap-2">{[['all','Todos'],['new','Nuevos'],['read','Leídos'],['replied','Respondidos']].map(([value,label])=><button key={value} onClick={()=>{setFilter(value);setPage(0);}} className={cn('px-3 py-1.5 rounded-lg border text-sm',filter===value?'bg-primary/10 border-primary/30 text-primary':'border-border text-muted-foreground')}>{label}</button>)}</div>
  {loading?<p role="status" className="text-sm text-muted-foreground py-8">Cargando mensajes...</p>:failed?<p role="alert" className="text-destructive text-sm">No se pudo cargar la bandeja. Pulsa Actualizar.</p>:rows.length===0?<div className="p-10 text-center border border-border rounded-xl text-muted-foreground"><Mail className="w-8 h-8 mx-auto mb-3 opacity-40"/>No hay mensajes en esta vista.</div>:<div className="border border-border rounded-xl overflow-hidden divide-y divide-border">{rows.map(row=><button key={row.id} onClick={()=>setSelected(row.id)} className="w-full p-4 sm:p-5 flex gap-4 text-left hover:bg-muted/40 transition-colors"><div className={cn('w-9 h-9 rounded-full shrink-0 flex items-center justify-center',row.status==='new'?'bg-primary/15 text-primary':'bg-muted text-muted-foreground')}><Mail className="w-4 h-4"/></div><div className="flex-1 min-w-0"><div className="flex flex-wrap justify-between gap-2"><span className="font-semibold text-sm truncate">{row.name}</span><span className={cn('text-xs font-medium',row.status==='new'?'text-primary':'text-muted-foreground')}>{labels[row.status]}</span></div><p className="text-sm truncate">{row.subject||'Sin asunto'}</p><p className="text-sm text-muted-foreground truncate mt-1">{row.message}</p><p className="text-xs text-muted-foreground mt-2">{new Date(row.created_at).toLocaleString('es-PE')}</p></div></button>)}</div>}
  <div className="flex justify-between text-sm"><button disabled={page===0||loading} onClick={()=>setPage(value=>value-1)} className="disabled:opacity-30">Anterior</button><span>Página {page+1}</span><button disabled={!more||loading} onClick={()=>setPage(value=>value+1)} className="disabled:opacity-30">Siguiente</button></div>
 </div>;
}

function ContactThread({id,onBack}:{id:string;onBack:()=>void}){
 const {user}=useAuthStore();
 const cacheKey=`${user?.id}:${id}`;
 const [message,setMessage]=useState<Message|null>(null);const [history,setHistory]=useState<ReplyRow[]>([]);
 const [loading,setLoading]=useState(true);const [failed,setFailed]=useState(false);const [busy,setBusy]=useState(false);
 const [subject,setSubject]=useState('');const [html,setHtml]=useState('');const [dirty,setDirty]=useState(false);
 const [draftId,setDraftId]=useState(()=>crypto.randomUUID());const [configured,setConfigured]=useState<boolean|null>(null);
 const [checking,setChecking]=useState(false);const [checkResult,setCheckResult]=useState('');const checkLock=useRef(false);
 const [notice,setNotice]=useState('');const lock=useRef(false);const initialized=useRef(false);
 const load=useCallback(async()=>{
  try{const [{data:row,error},{data:replies,error:replyError}]=await Promise.all([supabase.from('contact_messages').select('id,name,email,subject,message,status,created_at,replied_at').eq('id',id).single(),supabase.from('contact_replies').select(replyColumns).eq('contact_message_id',id).order('created_at')]);
   if(error||replyError||!row||!replies)throw error||replyError;setMessage(row);setHistory(replies as ReplyRow[]);
   if(!initialized.current){const draft=replies.find(reply=>reply.author_id===user?.id&&reply.state==='draft');const pending=pendingDrafts.get(cacheKey);setSubject(pending?.subject??draft?.subject??`Re: ${row.subject||'Tu consulta'}`);setHtml(pending?.html??draft?.body_html??'');if(pending||draft)setDraftId(pending?.draftId??draft!.id);setDirty(!!pending);initialized.current=true;}
   if(row.status==='new'){const {error:markError}=await supabase.from('contact_messages').update({status:'read'}).eq('id',id).eq('status','new');if(!markError){setMessage({...row,status:'read'});contactInboxChanged();}}
   setFailed(false);
  }catch{setFailed(true);}finally{setLoading(false);}
 },[id,user?.id,cacheKey]);
 const checkConfiguration=useCallback(async(manual=false)=>{
  if(checkLock.current)return;checkLock.current=true;setChecking(true);setCheckResult('');
  const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),15000);
  try{
   const {data,error}=await supabase.functions.invoke('contact-reply',{method:'GET',signal:controller.signal});
   if(error||typeof data?.configured!=='boolean')throw new Error();
   setConfigured(data.configured);
   const result=data.configured?'Configuración detectada. Ya puedes intentar enviar respuestas.':'Comprobación completada: todavía falta configurar el correo de salida. Este botón revisa la configuración; no la activa.';
   setCheckResult(result);if(manual){if(data.configured)toast.success(result);else toast.info(result);}
  }catch{setConfigured(null);const result='No se pudo comprobar el correo. Revisa tu conexión y vuelve a intentarlo.';setCheckResult(result);if(manual)toast.error(result);}
  finally{clearTimeout(timer);checkLock.current=false;setChecking(false);}
 },[]);
 useEffect(()=>{void load();void checkConfiguration();},[load,checkConfiguration]);
 useEffect(()=>{if(!dirty)return;const warn=(event:BeforeUnloadEvent)=>{event.preventDefault();event.returnValue='';};window.addEventListener('beforeunload',warn);return()=>window.removeEventListener('beforeunload',warn);},[dirty]);
 useEffect(()=>{if(dirty)pendingDrafts.set(cacheKey,{subject,html,draftId});},[dirty,subject,html,draftId,cacheKey]);
 const saveDraft=async()=>{
  if(!user?.id||!subject.trim()||subject.length>250||html.length>50000||plainText(html).length>15000){throw new Error('Escribe un asunto y una respuesta de hasta 15 000 caracteres.');}
  const fields={subject:subject.trim(),body_html:html,body_text:plainText(html)};
  let {data,error}=await supabase.from('contact_replies').update({...fields,updated_at:new Date().toISOString()}).eq('id',draftId).select('id').maybeSingle();
  if(!error&&!data){({data,error}=await supabase.from('contact_replies').insert({id:draftId,contact_message_id:id,author_id:user.id,...fields}).select('id').single());}
  if(error||!data)throw new Error('No se pudo guardar el borrador. Conservamos el texto para que reintentes.');pendingDrafts.delete(cacheKey);setDirty(false);return data.id;
 };
 const persist=async()=>{if(lock.current)return;lock.current=true;setBusy(true);try{await saveDraft();await load();toast.success('Borrador guardado');}catch(error){toast.error((error as Error).message);}finally{lock.current=false;setBusy(false);}};
 const send=async(existingId?:string)=>{
  if(lock.current)return;lock.current=true;setBusy(true);setNotice('');
  try{const replyId=existingId||await saveDraft();const {data,error}=await supabase.functions.invoke('contact-reply',{body:{reply_id:replyId}});
   let code=data?.error;if(error&&!code){try{code=(await (error as {context:Response}).context.json()).error;}catch{code='delivery_unknown';}}
   if(error||code||data?.state!=='sent'){const text=errorText[code]||'No se pudo enviar. El borrador permanece guardado.';setNotice(text);toast.error(text);}
   else{toast.success('Respuesta enviada al servicio de correo');setHtml('');setDraftId(crypto.randomUUID());pendingDrafts.delete(cacheKey);setDirty(false);contactInboxChanged();}
   await load();
  }catch(error){setNotice((error as Error).message);toast.error((error as Error).message);}finally{lock.current=false;setBusy(false);}
 };
 const back=async()=>{if(busy)return;if(dirty){lock.current=true;setBusy(true);try{await saveDraft();onBack();}catch(error){toast.error((error as Error).message);}finally{lock.current=false;setBusy(false);}}else onBack();};
 if(loading)return <p role="status" className="py-8 text-muted-foreground">Cargando conversación...</p>;
 if(failed||!message)return <div role="alert" className="space-y-3"><p>No se pudo cargar el mensaje.</p><button onClick={load} className="text-primary text-sm">Reintentar</button><button onClick={onBack} className="ml-4 text-sm">Volver a la bandeja</button></div>;
 const unsent=history.filter(reply=>reply.state!=='draft'&&reply.state!=='sent'&&reply.author_id===user?.id);
 const canCompose=unsent.length===0;
 return <div className="space-y-5">
  <button onClick={back} disabled={busy} className="inline-flex gap-2 items-center text-sm text-primary"><ArrowLeft className="w-4 h-4"/>Volver a mensajes</button>
  <article className="bg-card border border-border rounded-xl p-5 sm:p-6 space-y-4"><div className="flex justify-between gap-4"><div className="min-w-0"><h2 className="font-bold text-lg break-words">{message.subject||'Sin asunto'}</h2><p className="text-sm text-muted-foreground break-words mt-1">{message.name} · {message.email}</p></div><span className="text-xs text-primary font-semibold shrink-0">{labels[message.status]}</span></div><p className="text-sm whitespace-pre-wrap break-words leading-relaxed">{message.message}</p><p className="text-xs text-muted-foreground">{new Date(message.created_at).toLocaleString('es-PE')}</p></article>
  {history.filter(reply=>reply.state!=='draft').map(reply=><article key={reply.id} className="border border-border rounded-xl p-5 space-y-3"><div className="flex flex-wrap justify-between gap-2"><h3 className="font-semibold text-sm inline-flex items-center gap-2"><Reply className="w-4 h-4"/>{reply.subject}</h3><span className={cn('text-xs font-medium',reply.state==='sent'?'text-emerald-600':'text-amber-600')}>{replyLabels[reply.state]}</span></div><p className="text-sm whitespace-pre-wrap break-words">{reply.body_text}</p><p className="text-xs text-muted-foreground">{new Date(reply.sent_at||reply.created_at).toLocaleString('es-PE')}</p>{reply.state!=='sent'&&reply.author_id===user?.id&&<button disabled={busy||configured!==true} onClick={()=>send(reply.id)} className="text-sm text-primary disabled:opacity-50">{reply.state==='failed'?'Reintentar envío':'Verificar / reintentar este envío'}</button>}</article>)}
  <div className={cn('border rounded-xl p-4 text-sm space-y-3',configured===true?'bg-emerald-500/10 border-emerald-500/20':'bg-amber-500/10 border-amber-500/20')} aria-busy={checking}>
   <p>{configured===true?'El correo de salida tiene una configuración disponible.':configured===false?'El correo de salida está pendiente de configuración. Puedes redactar y guardar borradores.':'Comprueba la disponibilidad del correo de salida.'}</p>
   <button type="button" disabled={checking} onClick={()=>void checkConfiguration(true)} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-primary/30 text-primary font-medium hover:bg-primary/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary disabled:opacity-60 disabled:cursor-wait"><RefreshCw className={cn('w-4 h-4',checking&&'animate-spin')}/>{checking?'Comprobando…':'Comprobar configuración'}</button>
   <p role="status" aria-live="polite" className="text-xs text-muted-foreground">{checking?'Consultando el servicio de correo…':checkResult}</p>
   {configured===false&&!checking&&<p className="text-xs text-muted-foreground">Para habilitar el envío, configura RESEND_API_KEY y EMAIL_FROM en los secretos de Supabase y vuelve a comprobar.</p>}
  </div>
  {notice&&<div role="alert" className="border border-amber-500/30 rounded-xl p-4 text-sm">{notice}</div>}
  {canCompose?<section className="bg-card border border-border rounded-xl p-5 sm:p-6 space-y-4"><div><h3 className="font-semibold inline-flex items-center gap-2"><Reply className="w-4 h-4 text-primary"/>Responder</h3><p className="text-sm text-muted-foreground mt-1">La respuesta se enviará a <strong>{message.email}</strong>.</p></div><fieldset disabled={busy} className="space-y-4"><label className="block text-sm font-medium">Asunto<input value={subject} maxLength={250} onChange={event=>{setSubject(event.target.value);setDirty(true);}} className={`${inputClass} mt-1.5`}/></label><div className={busy?'pointer-events-none opacity-60':''}><RichTextEditor editable={!busy} value={html} onChange={value=>{setHtml(value);setDirty(true);}} minHeight={220}/></div><div className="flex flex-wrap items-center justify-between gap-3"><span className="text-xs text-muted-foreground">{dirty?'Cambios sin guardar':history.some(reply=>reply.id===draftId)?'Borrador guardado':'Nueva respuesta'}</span><div className="flex gap-2"><button onClick={persist} disabled={busy||!subject.trim()} className="inline-flex items-center gap-2 border border-border rounded-lg px-4 py-2 text-sm disabled:opacity-50"><Save className="w-4 h-4"/>Guardar borrador</button><button onClick={()=>send()} disabled={busy||configured!==true||!plainText(html)} className="inline-flex items-center gap-2 bg-primary text-primary-foreground rounded-lg px-4 py-2 text-sm disabled:opacity-50">{busy?<RefreshCw className="w-4 h-4 animate-spin"/>:<Send className="w-4 h-4"/>}Enviar respuesta</button></div></div></fieldset></section>:<p className="text-sm text-muted-foreground inline-flex gap-2"><CheckCheck className="w-4 h-4"/>Verifica el envío pendiente antes de redactar otra respuesta.</p>}
 </div>;
}
