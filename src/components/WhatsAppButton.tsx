import {useEffect,useRef,useState} from 'react';
import {useDatabase} from '@/lib/backend';
import {useUIStore} from '@/store/uiStore';
import {X,ArrowUpRight} from 'lucide-react';
import {cn} from '@/lib/utils';
import {WhatsAppIcon} from '@/components/icons/WhatsAppIcon';
import {parseWhatsAppConfig,validWhatsAppNumber,whatsappKey,whatsappLink,type WhatsAppConfig} from '@/lib/whatsappContent';

export default function WhatsAppButton(){
 const database=useDatabase();const {mobileNavOpen}=useUIStore();
 const [config,setConfig]=useState<WhatsAppConfig|null>(null);const [open,setOpen]=useState(false);
 const root=useRef<HTMLDivElement>(null);const trigger=useRef<HTMLButtonElement>(null);const close=useRef<HTMLButtonElement>(null);
 useEffect(()=>{let alive=true;
  const fetchConfig=async()=>{const {data,error}=await database.select<{key:string;value:string}>('system_config',{filter:{key:[whatsappKey,'whatsapp_enabled','whatsapp_number','whatsapp_message','whatsapp_position']}});if(!alive||error||!Array.isArray(data))return;try{setConfig(parseWhatsAppConfig(Object.fromEntries(data.map(row=>[row.key,row.value]))));}catch{setConfig(null);}};
  void fetchConfig();const unsubscribe=database.subscribe('system_config',fetchConfig);window.addEventListener('focus',fetchConfig);window.addEventListener('whatsapp-config-updated',fetchConfig);return()=>{alive=false;unsubscribe();window.removeEventListener('focus',fetchConfig);window.removeEventListener('whatsapp-config-updated',fetchConfig);};
 },[database]);
 useEffect(()=>{if(mobileNavOpen)setOpen(false);},[mobileNavOpen]);
 useEffect(()=>{if(!open)return;close.current?.focus();const key=(event:KeyboardEvent)=>{if(event.key==='Escape'){setOpen(false);trigger.current?.focus();}};const outside=(event:PointerEvent)=>{if(!root.current?.contains(event.target as Node))setOpen(false);};document.addEventListener('keydown',key);document.addEventListener('pointerdown',outside);return()=>{document.removeEventListener('keydown',key);document.removeEventListener('pointerdown',outside);};},[open]);
 const contacts=config?.contacts.filter(row=>row.enabled&&validWhatsAppNumber(row.number)&&row.name.trim())||[];
 if(!config?.enabled||mobileNavOpen||!contacts.length)return null;
 return <div ref={root} className={cn('fixed z-30 bottom-[max(1.25rem,env(safe-area-inset-bottom))]',config.position==='left'?'left-4 sm:left-6':'right-4 sm:right-6')}>
  {open&&<section id="whatsapp-contacts" aria-labelledby="whatsapp-title" className={cn('absolute bottom-[4.5rem] w-[min(360px,calc(100vw-2rem))] max-h-[calc(100dvh-7rem)] flex flex-col bg-card border border-border rounded-2xl shadow-2xl overflow-hidden',config.position==='left'?'left-0':'right-0')}>
   <header className="bg-[#075e54] text-white p-5 shrink-0"><div className="flex justify-between items-start gap-3"><WhatsAppIcon className="w-7 h-7 shrink-0"/><button ref={close} onClick={()=>{setOpen(false);trigger.current?.focus();}} aria-label="Cerrar contactos de WhatsApp" className="p-1 rounded-md hover:bg-white/10 focus-visible:outline focus-visible:outline-2"><X className="w-5 h-5"/></button></div><h2 id="whatsapp-title" className="mt-3 font-semibold text-lg leading-snug break-words">{config.title}</h2><p className="mt-2 text-sm text-white/80 leading-relaxed break-words">{config.description}</p></header>
   <div className="overflow-y-auto p-3 space-y-2"><p className="px-2 py-1 text-xs text-muted-foreground">Selecciona un contacto</p>{contacts.map(row=><a key={row.id} href={whatsappLink(row)} target="_blank" rel="noopener noreferrer" aria-label={`Abrir WhatsApp con ${row.name} en una pestaña nueva`} className="group flex items-center gap-3 p-3 rounded-xl border border-border/60 hover:border-emerald-500/40 hover:bg-emerald-500/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-500 transition-colors"><span className="w-10 h-10 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shrink-0 grid place-items-center"><WhatsAppIcon className="w-5 h-5"/></span><span className="flex-1 min-w-0"><span className="block text-sm font-semibold text-foreground break-words">{row.name}</span>{row.description&&<span className="block text-xs text-muted-foreground mt-1 break-words">{row.description}</span>}</span><ArrowUpRight className="w-4 h-4 text-muted-foreground group-hover:text-emerald-600 shrink-0"/></a>)}</div>
   <p className="px-5 py-3 border-t border-border text-[11px] text-muted-foreground shrink-0">La conversación se abrirá en WhatsApp.</p>
  </section>}
  <button ref={trigger} onClick={()=>setOpen(value=>!value)} aria-label={open?'Cerrar WhatsApp':'Contactar por WhatsApp'} aria-expanded={open} aria-controls="whatsapp-contacts" className="w-14 h-14 bg-[#25D366] hover:bg-[#20bd5a] text-white rounded-full shadow-lg flex items-center justify-center transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald-500">{open?<X className="w-6 h-6"/>:<WhatsAppIcon className="w-7 h-7"/>}</button>
 </div>;
}
