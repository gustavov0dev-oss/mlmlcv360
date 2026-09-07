import { useCallback, useEffect, useState } from 'react';
import { Link } from '@/lib/router';
import { useAuthStore } from '@/store/authStore';
import { useConfig } from '@/store/configStore';
import { supabase } from '@/lib/backend/client';
import { AboutIcon, ABOUT_ICON_OPTIONS } from '@/components/landing/AboutIcon';
import { DeleteConfirmDialog } from '@/components/admin/DeleteConfirmDialog';
import { opportunityDefaults, opportunityTabs, opportunityKey, opportunityFieldLabels, parseOpportunitySection, opportunityVideoUrl, type OpportunityTab, type OpportunitySection, type OpportunityItem } from '@/lib/opportunityContent';
import { safeAboutUrl } from '@/lib/aboutContent';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { Save, RefreshCw, Plus, Trash2, ArrowUp, ArrowDown, Lock } from 'lucide-react';

const inputClass = 'w-full px-3 py-2.5 bg-muted border border-border rounded-lg text-sm text-foreground outline-none focus:border-primary transition-colors';
export default function OportunidadAdminPage() {
 const { user } = useAuthStore();
 const { refresh } = useConfig();
 const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';
 const [tab, setTab] = useState<OpportunityTab>('hero');
 const [sections, setSections] = useState(opportunityDefaults());
 const [loading, setLoading] = useState(true);
 const [failed, setFailed] = useState(false);
 const [saving, setSaving] = useState(false);
 const [dirty, setDirty] = useState<Set<OpportunityTab>>(new Set());
 const [deleteId, setDeleteId] = useState<string | null>(null);
 const load = useCallback(async () => {
  if (!isAdmin) return;
  setLoading(true); setFailed(false);
  try {
   const {data,error} = await supabase.from('system_config').select('key,value').in('key', ['company_name', ...opportunityTabs.map(({id}) => opportunityKey(id))]);
   if (error || !data) throw error;
   const config = Object.fromEntries(data.map(row => [row.key,row.value]));
   const next = opportunityDefaults(config.company_name || 'MLM 360');
   for (const {id} of opportunityTabs) next[id] = parseOpportunitySection(config[opportunityKey(id)],next[id]);
   setSections(next); setDirty(new Set());
  } catch { setFailed(true); toast.error('No se pudo cargar Oportunidad. Inténtalo de nuevo.'); }
  finally { setLoading(false); }
 },[isAdmin]);
 useEffect(() => { void load(); },[load]);
 const edit = (next: OpportunitySection) => { setSections(previous => ({...previous,[tab]:next})); setDirty(previous => new Set([...previous,tab])); };
 const section = sections[tab];
 const editItem = (id: string, patch: Partial<OpportunityItem>) => edit({...section,items:section.items.map(item => item.id === id ? {...item,...patch} : item)});
 const move = (index:number,delta:number) => { const items=[...section.items]; const target=index+delta; if(target<0 || target>=items.length)return; [items[index],items[target]]=[items[target],items[index]]; edit({...section,items}); };
 const save = async () => {
  if(saving || loading || failed || !isAdmin)return;
  if(tab==='hero' && ['primary','secondary'].some(key=>section.text[`${key}_label`].trim() && !safeAboutUrl(section.text[`${key}_url`]))) { toast.error('Usa una ruta / o un enlace http(s) válido para los botones.'); return; }
  if(tab==='video' && section.text.video_url.trim() && !opportunityVideoUrl(section.text.video_url)) { toast.error('Introduce un enlace válido de YouTube o Vimeo.'); return; }
  if(section.items.some(item=> !(tab==='comparison'?item.label:item.title)?.trim())) { toast.error('Completa el título de cada elemento.'); return; }
  setSaving(true);
  try {
   const {data,error} = await supabase.from('system_config').upsert({key:opportunityKey(tab),value:JSON.stringify(section),updated_at:new Date().toISOString()},{onConflict:'key'}).select('key').single();
   if(error || !data)throw error;
   setDirty(previous=>{const next=new Set(previous);next.delete(tab);return next;});
   await refresh(); toast.success('Sección guardada. Ya está disponible en Oportunidad.');
  } catch { toast.error('No se pudo guardar. Tus cambios siguen en el formulario.'); }
  finally { setSaving(false); }
 };
 if(!isAdmin)return <div className="py-16 text-center text-muted-foreground"><Lock className="w-10 h-10 mx-auto mb-3"/>Sin permisos de administrador.</div>;
 return <div className="space-y-6 max-w-4xl">
  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"><div><h1 className="text-2xl font-bold text-foreground">Página Oportunidad</h1><p className="text-sm text-muted-foreground mt-0.5">Administra textos, video, botones, tarjetas y comparación.</p></div><button disabled={loading || saving || dirty.size>0} title={dirty.size ? 'Guarda los cambios pendientes antes de actualizar' : 'Actualizar'} onClick={load} className="flex items-center gap-2 px-3 py-2 border border-border rounded-xl text-sm hover:bg-muted disabled:opacity-50"><RefreshCw className={cn('w-4 h-4',loading&&'animate-spin')}/>Actualizar</button></div>
  <Link to="/oportunidad" className="inline-flex text-sm font-medium text-primary hover:underline">Ver página Oportunidad</Link>
  <div className="flex gap-1 p-1 bg-muted rounded-xl overflow-x-auto">{opportunityTabs.map(({id,label})=><button key={id} disabled={saving} onClick={()=>setTab(id)} className={cn('px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap',tab===id?'bg-card text-foreground shadow-sm':'text-muted-foreground hover:text-foreground')}>{label}{dirty.has(id)&&' •'}</button>)}</div>
  {loading ? <div role="status" className="h-48 animate-pulse bg-muted rounded-xl" aria-label="Cargando contenido"/> : failed ? <div role="alert" className="border border-destructive/30 rounded-xl p-4 text-destructive text-sm">No se pudo cargar el contenido. Pulsa Actualizar para reintentar.</div> : <fieldset disabled={saving} className="space-y-5">
   <div className="bg-card border border-border rounded-xl p-5 sm:p-6 space-y-5"><h2 className="font-bold text-sm">Textos de la sección</h2>
    {Object.entries(section.text).map(([key,value])=><div key={key}><label htmlFor={`opportunity-${key}`} className="block text-xs font-semibold mb-1.5">{opportunityFieldLabels[key] || key}</label>{['subtitle','description'].includes(key)?<textarea id={`opportunity-${key}`} rows={3} value={value} onChange={e=>edit({...section,text:{...section.text,[key]:e.target.value}})} className={inputClass}/>:<input id={`opportunity-${key}`} value={value} onChange={e=>edit({...section,text:{...section.text,[key]:e.target.value}})} className={inputClass}/>} {key==='highlight'&&<p className="text-xs text-muted-foreground mt-1">Escribe una parte exacta del título para conservar el efecto de color.</p>}{key.endsWith('_label')&&tab==='hero'&&<p className="text-xs text-muted-foreground mt-1">Déjalo vacío para ocultar el botón.</p>}{key==='video_url'&&<p className="text-xs text-muted-foreground mt-1">Déjalo vacío para ocultar el video.</p>}</div>)}
   </div>
   {!['hero','video'].includes(tab)&&<div className="space-y-3">
    <div className="flex justify-between items-center gap-3"><p className="text-sm text-muted-foreground">{section.items.filter(item=>item.is_active).length} visibles · {section.items.length} total</p><button onClick={()=>edit({...section,items:[...section.items,tab==='comparison'?{id:crypto.randomUUID(),is_active:true,label:'',traditional:false,cluv:true}:{id:crypto.randomUUID(),is_active:true,title:'',desc:'',icon:'Rocket'}]})} className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-semibold"><Plus className="w-4 h-4"/>Agregar</button></div>
    {section.items.length===0&&<p className="border border-border rounded-xl p-6 text-sm text-muted-foreground">Sin elementos. Agrega uno para mostrarlo en la página.</p>}
    {section.items.map((item,index)=><div key={item.id} className="bg-card border border-border rounded-xl p-4 sm:p-5 space-y-4">
     <div className="flex items-center justify-between gap-3"><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={item.is_active} onChange={e=>editItem(item.id,{is_active:e.target.checked})}/>{item.is_active?'Visible':'Oculto'}</label><div className="flex gap-1"><button aria-label="Subir elemento" disabled={index===0} onClick={()=>move(index,-1)} className="p-2 hover:bg-muted rounded-lg disabled:opacity-30"><ArrowUp className="w-4 h-4"/></button><button aria-label="Bajar elemento" disabled={index===section.items.length-1} onClick={()=>move(index,1)} className="p-2 hover:bg-muted rounded-lg disabled:opacity-30"><ArrowDown className="w-4 h-4"/></button><button aria-label="Eliminar elemento" onClick={()=>setDeleteId(item.id)} className="p-2 hover:bg-destructive/10 text-destructive rounded-lg"><Trash2 className="w-4 h-4"/></button></div></div>
     <label className="block text-xs font-semibold">{tab==='comparison'?'Aspecto':'Título'}<input className={`${inputClass} mt-1.5`} value={(tab==='comparison'?item.label:item.title)||''} onChange={e=>editItem(item.id,tab==='comparison'?{label:e.target.value}:{title:e.target.value})}/></label>
     {tab==='comparison'?<div className="flex flex-wrap gap-6">{(['traditional','cluv'] as const).map(key=><label key={key} className="flex gap-2 items-center text-sm"><input type="checkbox" checked={!!item[key]} onChange={e=>editItem(item.id,{[key]:e.target.checked})}/>{section.text[`${key}_label`]}: {item[key]?'Sí':'No'}</label>)}</div>:<><label className="block text-xs font-semibold">Descripción<textarea className={`${inputClass} mt-1.5`} rows={2} value={item.desc||''} onChange={e=>editItem(item.id,{desc:e.target.value})}/></label><label className="flex items-center gap-3 text-sm"><AboutIcon name={item.icon||'Rocket'} className="w-4 h-4 text-primary"/>Icono<select className={inputClass} value={item.icon} onChange={e=>editItem(item.id,{icon:e.target.value})}>{ABOUT_ICON_OPTIONS.map(icon=><option key={icon}>{icon}</option>)}</select></label></>}
    </div>)}
   </div>}
   <div className="flex items-center justify-between gap-4 border-t border-border pt-4"><p className="text-xs text-muted-foreground">{dirty.has(tab)?'Cambios pendientes. Guarda para publicarlos.':'Sección sin cambios pendientes.'}</p><button onClick={save} disabled={saving || !dirty.has(tab)} className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-semibold disabled:opacity-50">{saving?<RefreshCw className="w-4 h-4 animate-spin"/>:<Save className="w-4 h-4"/>}Guardar sección</button></div>
  </fieldset>}
  <DeleteConfirmDialog open={!!deleteId} onOpenChange={open=>{if(!open)setDeleteId(null);}} title="Eliminar elemento" description="El elemento se quitará cuando guardes esta sección." onConfirm={()=>{edit({...section,items:section.items.filter(item=>item.id!==deleteId)});setDeleteId(null);}}/>
 </div>;
}
