import { useState } from 'react';
import { useStorage } from '@/lib/backend';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { directVideoUrl, videoEmbed, formatVideoDuration } from '@/lib/newsContent';
import { toast } from 'sonner';
export function NewsVideoInput({value,onChange,onBusy}:{value:string;onChange:(url:string,duration:string)=>void;onBusy:(busy:boolean)=>void}) {
 const storage=useStorage(); const [busy,setBusy]=useState(false);const [mode,setMode]=useState('link');
 return <div className="space-y-3"><p className="text-sm font-medium">Video</p><div className="flex gap-4">{[['link','Desde un enlace'],['file','Subir archivo']].map(([id,label])=><button type="button" key={id} disabled={busy} onClick={()=>setMode(id)} className={`text-sm ${mode===id?'text-primary font-semibold':'text-muted-foreground'}`}>{label}</button>)}</div>
 {mode==='link'?<Input aria-label="Enlace del video" type="url" value={value} onChange={e=>onChange(e.target.value,'')} placeholder="YouTube, Vimeo o enlace a un archivo MP4 / WebM"/>:<label className="block border border-dashed border-border rounded-lg p-5 text-center text-sm cursor-pointer">{busy?'Subiendo video…':'Seleccionar video · MP4 o WebM · hasta 50 MB'}<input type="file" className="sr-only" accept="video/mp4,video/webm" disabled={busy} onChange={async e=>{
 const file=e.target.files?.[0];e.target.value='';if(!file)return;
 if(!['video/mp4','video/webm'].includes(file.type)||file.size>50*1024*1024){toast.error('Selecciona un video MP4 o WebM de hasta 50 MB');return;}
 setBusy(true);onBusy(true);try{const result=await storage.upload('novedades-videos',`${crypto.randomUUID()}.${file.type.split('/')[1]}`,file,{contentType:file.type});if(!result.success||!result.url)throw new Error();onChange(result.url,'');toast.success('Video subido');}catch{toast.error('No se pudo subir el video. Inténtalo de nuevo.');}finally{setBusy(false);onBusy(false);}
 }}/></label>}
 {directVideoUrl(value)?<video key={value} src={value} controls preload="metadata" className="w-full max-h-64 rounded-lg bg-black" onLoadedMetadata={e=>onChange(value,formatVideoDuration(e.currentTarget.duration))}/>:videoEmbed(value)?<iframe title="Vista previa del video" src={videoEmbed(value)} className="w-full aspect-video max-h-64 rounded-lg" allowFullScreen/>:null}
 {value&&<Button type="button" variant="ghost" size="sm" disabled={busy} onClick={()=>onChange('','')}>Quitar video</Button>}
 <p className="text-xs text-muted-foreground">La duración se detecta en archivos de video. YouTube y Vimeo muestran su duración dentro del reproductor.</p></div>;
}
