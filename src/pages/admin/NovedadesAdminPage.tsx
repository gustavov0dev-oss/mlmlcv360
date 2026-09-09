import { useState, useRef } from 'react';
import { useDatabase, useStorage } from '@/lib/backend';
import { useAuthStore } from '@/store/authStore';
import { useNews } from '@/hooks/useNews';
import { newsSlug, newsPageDefaults, safeMediaUrl, safeNewsHtml, videoEmbed, directVideoUrl, readingTime, type NewsRow, type ContentItem } from '@/lib/newsContent';
import { NewsVideoInput } from '@/components/admin/NewsVideoInput';
import { RichTextEditor } from '@/components/ui/rich-text-editor';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { LoadingRegion } from '@/components/ui/loading-region';
import { DeleteConfirmDialog } from '@/components/admin/DeleteConfirmDialog';
import { Link } from '@/lib/router';
import { Plus, Pencil, Trash2, Newspaper, Upload } from 'lucide-react';
import { toast } from 'sonner';

function ImageField({label,value,onChange,onBusy}:{label:string;value:string;onChange:(v:string)=>void;onBusy:(v:boolean)=>void}) {
  const storage=useStorage(); const [uploading,setUploading]=useState(false);
  return <div className="space-y-2"><label className="block text-sm font-medium">{label}<Input type="url" value={value} onChange={e=>onChange(e.target.value)} placeholder="https://…" className="mt-2" /></label>
    <label className="flex items-center justify-center gap-2 border border-dashed border-border rounded-lg p-3 text-sm cursor-pointer hover:border-primary">
      <Upload className="w-4 h-4" />{uploading?'Subiendo…':'Subir imagen · JPG, PNG o WebP · máx. 2 MB'}
      <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" disabled={uploading} onChange={async e=>{
        const file=e.target.files?.[0]; e.target.value=''; if(!file)return;
        if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>2097152){toast.error('Selecciona JPG, PNG o WebP de hasta 2 MB');return;}
        setUploading(true);onBusy(true);
        try {const result=await storage.upload('novedades',`novedades/${crypto.randomUUID()}.${file.type.split('/')[1]}`,file,{contentType:file.type});if(!result.success||!result.url)throw new Error();onChange(result.url);toast.success('Imagen subida');}catch{toast.error('No se pudo subir la imagen. Inténtalo de nuevo.');}finally{setUploading(false);onBusy(false);}
      }}/>
    </label>{safeMediaUrl(value)&&<div className="flex gap-3 items-center"><img src={safeMediaUrl(value)} alt={`Vista previa: ${label}`} className="w-24 h-16 object-cover rounded-md"/><Button type="button" variant="ghost" size="sm" onClick={()=>onChange('')}>Quitar imagen</Button></div>}</div>;
}
const empty = ():ContentItem=>({slug:'',type:'article',category:'Noticias',title:'',excerpt:'',author:'',authorRole:'',authorAvatar:'',date:new Date().toLocaleDateString('es-PE',{day:'numeric',month:'short',year:'numeric'}),readTime:'',duration:'',views:0,image:'',featured:false,content:'',videoUrl:''});
export default function NovedadesAdminPage(){
  const {user}=useAuthStore();const database=useDatabase();const {rows,settings,loading,error,reload}=useNews(true);
  const baseline=useRef(''); const [discard,setDiscard]=useState(false); const [newCategory,setNewCategory]=useState(false);
  const [tab,setTab]=useState('posts');const [form,setForm]=useState<ContentItem|null>(null);const [editing,setEditing]=useState<NewsRow|null>(null);
  const [status,setStatus]=useState<'draft'|'published'>('draft');const [order,setOrder]=useState(0);const [busy,setBusy]=useState(false);const [uploads,setUploads]=useState(0);
  const [pageForm,setPageForm]=useState<typeof newsPageDefaults|null>(null);const [target,setTarget]=useState<NewsRow|null>(null);const [query,setQuery]=useState('');
  if(!user || !['admin','super_admin'].includes(user.role))return <p>Esta sección requiere permisos de administrador.</p>;
  const set=(key:keyof ContentItem,value:unknown)=>setForm(prev=>prev?{...prev,[key]:value}:prev);
  const snapshot=()=>JSON.stringify({form,status,order});
  const reset=()=>{setForm(null);setEditing(null);setDiscard(false);};
  const close=()=>{if(snapshot()!==baseline.current)setDiscard(true);else reset();};
  const save=async()=>{
    if(!form)return;
    if(!form.title.trim()||!newsSlug(form.slug)||!form.category.trim()){toast.error('Completa título, enlace y categoría');return;}
    if(status==='published'&&(!form.excerpt.trim()||(form.type!=='video'&&!form.content.replace(/<[^>]*>/g,'').trim())||!safeMediaUrl(form.image))){toast.error('Para publicar, añade resumen, contenido y una portada válida');return;}
    if((form.image&&!safeMediaUrl(form.image))||(form.authorAvatar&&!safeMediaUrl(form.authorAvatar))){toast.error('Las imágenes deben usar enlaces HTTPS');return;}
    if(form.videoUrl&&!videoEmbed(form.videoUrl)&&!directVideoUrl(form.videoUrl)){toast.error('Usa YouTube, Vimeo o un enlace HTTPS a MP4 / WebM');return;}
    if(status==='published'&&form.type==='video'&&!form.videoUrl){toast.error('Sube un video o pega su enlace para publicar');return;}
    setBusy(true);
    try {const data={...form,duration:directVideoUrl(form.videoUrl)?form.duration:'',readTime:form.type==='video'?'':readingTime(form.content),slug:newsSlug(form.slug),content:safeNewsHtml(form.content)};const payload={slug:data.slug,status,sort_order:order,data};const result=editing?await database.update<NewsRow>('novedades_posts',editing.id,payload):await database.insert<NewsRow>('novedades_posts',payload);if(result.error)throw new Error(result.error);toast.success(status==='draft'?'Borrador guardado':'Publicación guardada');setForm(null);setEditing(null);await reload();}catch(e){toast.error(String(e).includes('duplicate')?'Ese enlace ya existe. Elige otro.':'No se pudo guardar. Conservamos tus cambios para reintentar.');}finally{setBusy(false);}
  };
  return <div className="space-y-6 max-w-5xl">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h1 className="text-2xl font-bold flex items-center gap-2"><Newspaper className="w-6 h-6 text-primary"/>Novedades</h1><p className="text-sm text-muted-foreground mt-1">Artículos, noticias y videos de tu sitio.</p></div><Link to="/blog" className="text-sm text-primary">Ver página pública ↗</Link></div>
    <div className="flex gap-5 border-b border-border pb-3">{[['posts','Publicaciones'],['page','Textos de la página']].map(([key,label])=><button key={key} disabled={!!form||busy} onClick={()=>setTab(key)} className={`text-sm ${tab===key?'text-primary font-semibold':'text-muted-foreground'}`}>{label}</button>)}</div>
    {error&&<div role="alert" className="text-sm text-destructive">No se pudo cargar el contenido. <button onClick={()=>void reload()} className="underline">Reintentar</button></div>}
    {loading?<LoadingRegion className="min-h-[24rem]"/>:tab==='page'?<div className="rounded-xl border border-border p-5 space-y-4">
      {(Object.keys(newsPageDefaults) as (keyof typeof newsPageDefaults)[]).map(key=><label key={key} className="block text-sm space-y-2"><span>{{badge:'Etiqueta superior',title:'Título',highlight:'Texto destacado',subtitle:'Descripción'}[key]}</span><Input value={(pageForm||settings)[key]} onChange={e=>setPageForm({...pageForm||settings,[key]:e.target.value})}/></label>)}
      <Button disabled={busy||error||!pageForm} onClick={async()=>{setBusy(true);try{const r=await database.upsert('novedades_page',{id:'main',data:pageForm},'id');if(r.error)throw new Error();await reload();setPageForm(null);toast.success('Textos actualizados');}catch{toast.error('No se pudieron guardar los textos');}finally{setBusy(false);}}}>{busy?'Guardando…':'Guardar textos'}</Button>
    </div>:form?<div className="border border-border rounded-xl p-4 sm:p-6 space-y-5">
      <h2 className="text-lg font-semibold">{editing?'Editar publicación':'Nueva publicación'}</h2>
      <fieldset disabled={busy||uploads>0} className="space-y-5 min-w-0">
      <div className="grid sm:grid-cols-2 gap-4">{([['title','Título'],['slug','Enlace de la publicación'],] as const).map(([key,label])=><label key={key} className="text-sm space-y-2 block"><span>{label}</span><Input value={form[key]||''} onChange={e=>{set(key,e.target.value);if(key==='title'&&!editing)set('slug',newsSlug(e.target.value));}}/></label>)}</div>
      <label className="block text-sm space-y-2"><span>Categoría</span><select className="block w-full border border-border rounded-lg bg-background p-2" value={newCategory?'__new':form.category} onChange={e=>{if(e.target.value==='__new'){setNewCategory(true);set('category','');}else{setNewCategory(false);set('category',e.target.value);}}}>{[...new Set(['Noticias','Tutoriales','Estrategia','Rangos','Comisiones','Marketing',...rows.map(r=>r.data.category),...(form.category?[form.category]:[])])].map(cat=><option key={cat}>{cat}</option>)}<option value="__new">+ Nueva categoría</option></select>{newCategory&&<Input autoFocus aria-label="Nombre de la nueva categoría" placeholder="Nombre de la categoría" value={form.category} onChange={e=>set('category',e.target.value)}/>}</label>
      <p className="text-xs text-muted-foreground">{form.type==='video'?(directVideoUrl(form.videoUrl)&&form.duration?`Duración detectada: ${form.duration}`:'La duración se obtiene del video cuando está disponible.'):`Tiempo de lectura automático: ${readingTime(form.content)||'añade contenido'}`}</p>
      <details className="text-sm"><summary className="cursor-pointer text-muted-foreground">Autor y fecha</summary><div className="grid sm:grid-cols-3 gap-4 pt-3">{([['date','Fecha visible'],['author','Autor'],['authorRole','Cargo']] as const).map(([key,label])=><label key={key}>{label}<Input value={form[key]} onChange={e=>set(key,e.target.value)}/></label>)}</div></details>
      <div className="grid sm:grid-cols-3 gap-4"><label className="text-sm">Tipo<select className="block mt-2 w-full bg-background border border-border rounded-lg p-2" value={form.type} onChange={e=>set('type',e.target.value)}><option value="article">Artículo</option><option value="news">Noticia</option><option value="video">Video</option></select></label><label className="text-sm">Estado<select className="block mt-2 w-full bg-background border border-border rounded-lg p-2" value={status} onChange={e=>setStatus(e.target.value as 'draft'|'published')}><option value="draft">Borrador (oculto)</option><option value="published">Publicado</option></select></label><label className="text-sm">Orden<Input className="mt-2" type="number" value={order} onChange={e=>setOrder(Number(e.target.value))}/></label></div>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={!!form.featured} onChange={e=>set('featured',e.target.checked)}/>Destacar en la parte superior</label>
      <label className="block text-sm space-y-2"><span>Resumen</span><Textarea value={form.excerpt} onChange={e=>set('excerpt',e.target.value)} rows={3}/></label>
      <div className="grid md:grid-cols-2 gap-5"><ImageField label="Portada" value={form.image} onChange={v=>set('image',v)} onBusy={v=>setUploads(n=>n+(v?1:-1))}/><ImageField label="Foto del autor (opcional)" value={form.authorAvatar} onChange={v=>set('authorAvatar',v)} onBusy={v=>setUploads(n=>n+(v?1:-1))}/></div>
      {form.type==='video'&&<NewsVideoInput value={form.videoUrl} onChange={(url,duration)=>{set('videoUrl',url);set('duration',duration);}} onBusy={v=>setUploads(n=>n+(v?1:-1))}/>}
      <div><p className="text-sm font-medium mb-2">Contenido</p><RichTextEditor value={form.content} onChange={v=>set('content',v)} editable={!busy&&uploads===0}/></div>
      </fieldset><div className="flex justify-end gap-2 border-t border-border pt-4"><Button variant="outline" onClick={close} disabled={busy||uploads>0}>Cancelar</Button><Button onClick={()=>void save()} disabled={busy||uploads>0}>{busy?'Guardando…':status==='draft'?'Guardar borrador':'Guardar y publicar'}</Button></div>
    </div>:<>
      <div className="flex flex-wrap gap-3 justify-between"><Input aria-label="Buscar publicaciones" placeholder="Buscar publicaciones…" value={query} onChange={e=>setQuery(e.target.value)} className="max-w-sm"/><Button disabled={error} onClick={()=>{const next={...empty(),author:user.full_name||user.username,authorAvatar:user.avatar_url||''};setEditing(null);setForm(next);setNewCategory(false);setStatus('draft');setOrder(rows.length);baseline.current=JSON.stringify({form:next,status:'draft',order:rows.length});}}><Plus className="w-4 h-4 mr-2"/>Nueva publicación</Button></div>
      <div className="border border-border rounded-xl divide-y divide-border overflow-hidden">{rows.filter(r=>r.data.title.toLowerCase().includes(query.toLowerCase())).map(row=><div key={row.id} className="flex items-center gap-3 p-4"><img src={safeMediaUrl(row.data.image)||undefined} alt="" className="w-20 h-14 rounded-md object-cover bg-muted shrink-0"/><div className="flex-1 min-w-0"><p className="font-medium truncate">{row.data.title}</p><p className="text-xs text-muted-foreground mt-1">{row.status==='published'?'Publicado':'Borrador'} · {row.data.category}{row.data.featured?' · Destacado':''}</p></div><Button variant="ghost" size="icon" aria-label={`Editar ${row.data.title}`} onClick={()=>{const next={...empty(),...row.data,slug:row.slug};setEditing(row);setForm(next);setNewCategory(false);setStatus(row.status);setOrder(row.sort_order);baseline.current=JSON.stringify({form:next,status:row.status,order:row.sort_order});}}><Pencil className="w-4 h-4"/></Button><Button variant="ghost" size="icon" aria-label={`Eliminar ${row.data.title}`} onClick={()=>setTarget(row)}><Trash2 className="w-4 h-4 text-destructive"/></Button></div>)}{!rows.some(r=>r.data.title.toLowerCase().includes(query.toLowerCase()))&&<p className="text-sm text-muted-foreground p-10 text-center">No hay publicaciones para mostrar.</p>}</div>
    </>}
    <DeleteConfirmDialog open={discard} onOpenChange={setDiscard} title="¿Descartar los cambios?" description="Tienes cambios sin guardar en esta publicación." confirmText="Descartar cambios" cancelText="Seguir editando" onConfirm={reset}/>
    <DeleteConfirmDialog open={!!target} onOpenChange={v=>{if(!v)setTarget(null);}} title="Eliminar publicación" description={`Se eliminará «${target?.data.title}». Esta acción no se puede deshacer.`} loading={busy} onConfirm={async()=>{if(!target)return;setBusy(true);try{const r=await database.delete('novedades_posts',target.id);if(r.error)throw new Error();setTarget(null);await reload();toast.success('Publicación eliminada');}catch{toast.error('No se pudo eliminar');}finally{setBusy(false);}}}/>
  </div>;
}
