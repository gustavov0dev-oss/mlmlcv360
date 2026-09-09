import { LoadingRegion, StableRegion } from '@/components/ui/loading-region';
import { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from '@/lib/router';
import { ContactInbox } from '@/components/admin/ContactInbox';
import {useContactNotifications} from '@/hooks/useContactNotifications';
import { useAuthStore } from '@/store/authStore';
import { useConfig } from '@/store/configStore';
import { supabase } from '@/lib/backend/client';
import { contactDefaults,contactTabs,contactKey,contactLabels,parseContactSection,type ContactTab } from '@/lib/contactContent';
import { type OpportunitySection } from '@/lib/opportunityContent';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { Save,RefreshCw,Plus,Trash2,ArrowUp,ArrowDown,Lock } from 'lucide-react';
const inputClass='w-full px-3 py-2.5 bg-muted border border-border rounded-lg text-sm text-foreground outline-none focus:border-primary';
export default function ContactoAdminPage(){
 const {user}=useAuthStore(); const {refresh}=useConfig();
 const isAdmin=user?.role==='admin'||user?.role==='super_admin';
 const [params]=useSearchParams();
 const requestedTab=params.get('tab');
 const notifications=useContactNotifications(isAdmin);
 const [tab,setTab]=useState<ContactTab|'messages'>(requestedTab==='messages'?'messages':'hero');
 useEffect(()=>{if(requestedTab==='messages')setTab('messages');},[requestedTab]);
 const [sections,setSections]=useState(contactDefaults());
 const [dirty,setDirty]=useState<Set<ContactTab>>(new Set());
 const [loading,setLoading]=useState(true);const [failed,setFailed]=useState(false);const [saving,setSaving]=useState(false);
 const load=useCallback(async()=>{if(!isAdmin)return;setLoading(true);setFailed(false);try{
  const {data,error}=await supabase.from('system_config').select('key,value').in('key',[...contactTabs.map(({id})=>contactKey(id)),'company_name','company_email','contact_email','company_phone','phone','company_address','address','company_tagline']);
  if(error||!data)throw error;const config=Object.fromEntries(data.map(row=>[row.key,row.value]));const next=contactDefaults(config);
  for(const {id} of contactTabs)next[id]=parseContactSection(config[contactKey(id)],next[id]);setSections(next);setDirty(new Set());
 }catch{setFailed(true);toast.error('No se pudo cargar Contacto.');}finally{setLoading(false);}},[isAdmin]);
 useEffect(()=>{void load();},[load]);
 const edit=(next:OpportunitySection)=>{if(tab==='messages')return;setSections(previous=>({...previous,[tab]:next}));setDirty(previous=>new Set([...previous,tab]));};
 const save=async()=>{if(tab==='messages'||saving||failed)return;const section=sections[tab];
  if(tab==='channels'&&section.text.email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(section.text.email)){toast.error('Revisa el email de contacto.');return;}
  if(tab==='faq'&&section.items.some(item=>!item.title?.trim()||!item.desc?.trim())){toast.error('Completa cada pregunta y respuesta.');return;}
  if(tab==='form'&&['name_label','email_label','message_label','submit_label','success_title'].some(key=>!section.text[key].trim())){toast.error('Completa las etiquetas obligatorias y los textos de envío.');return;}
  setSaving(true);try{const {data,error}=await supabase.from('system_config').upsert({key:contactKey(tab),value:JSON.stringify(section),updated_at:new Date().toISOString()},{onConflict:'key'}).select('key').single();if(error||!data)throw error;setDirty(previous=>{const next=new Set(previous);next.delete(tab);return next;});await refresh();toast.success('Sección guardada. Ya está disponible en Contacto.');}catch{toast.error('No se pudo guardar. Tus cambios siguen en el formulario.');}finally{setSaving(false);}};
 if(!isAdmin)return <div className="py-16 text-center text-muted-foreground"><Lock className="w-10 h-10 mx-auto mb-3"/>Sin permisos de administrador.</div>;
 const section=tab==='messages'?null:sections[tab];
 return <StableRegion className="space-y-6 max-w-4xl">
  <div className="flex flex-col sm:flex-row sm:justify-between gap-4"><div><h1 className="text-2xl font-bold text-foreground">Página Contacto</h1><p className="text-sm text-muted-foreground mt-0.5">Administra el contenido y revisa los mensajes recibidos.</p></div><button disabled={loading||saving||dirty.size>0} onClick={load} className="flex items-center gap-2 px-3 py-2 border border-border rounded-xl text-sm disabled:opacity-50"><RefreshCw className={cn('w-4 h-4',loading&&'animate-spin')}/>Actualizar</button></div>
  <Link to="/contacto" className="text-sm font-medium text-primary hover:underline">Ver página Contacto</Link>
  <div className="flex gap-1 p-1 bg-muted rounded-xl overflow-x-auto">{[...contactTabs,{id:'messages' as const,label:'Mensajes'}].map(({id,label})=><button key={id} disabled={saving} onClick={()=>setTab(id)} className={cn('px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap',tab===id?"text-primary font-semibold":"text-muted-foreground")}>{label}{id==='messages'&&notifications.count>0&&<span className="ml-2 bg-primary text-primary-foreground rounded-full px-1.5 text-xs">{notifications.count}</span>}{id!=='messages'&&dirty.has(id)&&' •'}</button>)}</div>
  {tab==='messages'?<ContactInbox/>:loading?<LoadingRegion className="min-h-[24rem]" />:failed?<p role="alert" className="text-destructive text-sm">No se pudo cargar el contenido. Pulsa Actualizar para reintentar.</p>:section&&<fieldset disabled={saving} className="space-y-5">
   <div className="bg-card border border-border rounded-xl p-5 sm:p-6 space-y-5"><h2 className="font-bold text-sm">Textos de la sección</h2>{Object.entries(section.text).map(([key,value])=><div key={key}><label htmlFor={`contact-editor-${key}`} className="block text-xs font-semibold mb-1.5">{contactLabels[key]||key}</label>{['subtitle','success_description'].includes(key)?<textarea id={`contact-editor-${key}`} value={value} onChange={e=>edit({...section,text:{...section.text,[key]:e.target.value}})} rows={3} className={inputClass}/>:<input id={`contact-editor-${key}`} value={value} onChange={e=>edit({...section,text:{...section.text,[key]:e.target.value}})} className={inputClass}/>}</div>)}{tab==='channels'&&<p className="text-xs text-muted-foreground">Estos datos se muestran en Contacto. Deja vacío un dato para ocultar ese canal.</p>}{tab==='map'&&<p className="text-xs text-muted-foreground">Si la ubicación está vacía se usa la dirección de contacto. Si ambas están vacías, el mapa se oculta.</p>}{tab==='form'&&<p className="text-xs text-muted-foreground">Los envíos se reciben en la pestaña Mensajes de este panel.</p>}</div>
   {tab==='faq'&&<div className="space-y-3"><div className="flex justify-between items-center"><p className="text-sm text-muted-foreground">{section.items.filter(item=>item.is_active).length} visibles</p><button onClick={()=>edit({...section,items:[...section.items,{id:crypto.randomUUID(),is_active:true,title:'',desc:''}]})} className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm"><Plus className="w-4 h-4"/>Agregar pregunta</button></div>{section.items.map((item,index)=><div key={item.id} className="bg-card border border-border rounded-xl p-5 space-y-4"><div className="flex justify-between gap-3"><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={item.is_active} onChange={e=>edit({...section,items:section.items.map(row=>row.id===item.id?{...row,is_active:e.target.checked}:row)})}/>Visible</label><div className="flex gap-1">{[-1,1].map(delta=><button key={delta} aria-label={delta<0?'Subir pregunta':'Bajar pregunta'} disabled={index+delta<0||index+delta>=section.items.length} onClick={()=>{const items=[...section.items];[items[index],items[index+delta]]=[items[index+delta],items[index]];edit({...section,items});}} className="p-2 rounded-lg hover:bg-muted disabled:opacity-30">{delta<0?<ArrowUp className="w-4 h-4"/>:<ArrowDown className="w-4 h-4"/>}</button>)}<button aria-label="Quitar pregunta del borrador" onClick={()=>edit({...section,items:section.items.filter(row=>row.id!==item.id)})} className={["p-2 text-destructive hover:bg-destructive/10 rounded-lg", "dashboard-action dashboard-action-danger"].filter(Boolean).join(' ')}><Trash2 className="w-4 h-4"/></button></div></div>{(['title','desc'] as const).map(key=><label key={key} className="block text-xs font-semibold">{key==='title'?'Pregunta':'Respuesta'}<textarea rows={key==='title'?2:3} className={`${inputClass} mt-1.5`} value={item[key]} onChange={e=>edit({...section,items:section.items.map(row=>row.id===item.id?{...row,[key]:e.target.value}:row)})}/></label>)}</div>)}</div>}
   <div className="flex justify-between items-center border-t border-border pt-4 gap-4"><p className="text-xs text-muted-foreground">{dirty.has(tab)?'Cambios pendientes. Guarda para publicarlos.':'Sin cambios pendientes.'}</p><button onClick={save} disabled={saving||!dirty.has(tab)} className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm disabled:opacity-50"><Save className="w-4 h-4"/>Guardar sección</button></div>
  </fieldset>}
 </StableRegion>;
}
