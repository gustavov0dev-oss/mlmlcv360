import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Medal } from 'lucide-react';
import { useConfig } from '@/store/configStore';

export function NetworkRankFilter({value,onChange}:{value:string;onChange:(value:string)=>void}) {
  const {ranks}=useConfig();
  const track=useRef<HTMLDivElement>(null);
  const [edges,setEdges]=useState({left:false,right:false});
  useEffect(()=>{
    const el=track.current;if(!el)return;
    const update=()=>setEdges({left:el.scrollLeft>2,right:el.scrollLeft+el.clientWidth<el.scrollWidth-2});
    update();el.addEventListener('scroll',update,{passive:true});
    const observer=new ResizeObserver(update);observer.observe(el);
    return()=>{observer.disconnect();el.removeEventListener('scroll',update);};
  },[ranks]);
  return <div className="relative min-w-0" aria-label="Rangos de la red">
    <div ref={track} aria-label="Filtrar por rango" className="flex gap-2 overflow-x-auto py-2 px-1 scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <button aria-pressed={value==='all'} onClick={()=>onChange('all')} className={`shrink-0 rounded-full border px-4 py-2 text-xs font-semibold transition-colors ${value==='all'?'bg-foreground text-background border-foreground':'border-border text-muted-foreground hover:bg-muted'}`}>Todos</button>
      {ranks.map(rank=>{const active=value===rank.slug;const accent=rank.color?.startsWith('#')?rank.color:'hsl(var(--primary))';return <button key={rank.id} aria-pressed={active} onClick={e=>{onChange(active?'all':rank.slug);e.currentTarget.scrollIntoView({behavior:'smooth',block:'nearest',inline:'nearest'});}} className="shrink-0 inline-flex items-center gap-2 whitespace-nowrap rounded-full border px-3.5 py-2 text-xs font-semibold transition-all hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary" style={{color:`color-mix(in srgb, ${accent} 65%, hsl(var(--foreground)))`,background:`color-mix(in srgb, ${accent} ${active?'22':'7'}%, hsl(var(--background)))`,borderColor:`color-mix(in srgb, ${accent} ${active?'80':'30'}%, hsl(var(--border)))`}}>
        {rank.icon?.startsWith('http')?<img src={rank.icon} alt="" className="size-3.5 object-contain"/>:rank.icon&&rank.icon.length<=4?<span aria-hidden="true">{rank.icon}</span>:<Medal className="size-3.5"/>}{rank.name}
      </button>;})}
    </div>
    {edges.left&&<div className="absolute inset-y-0 left-0 w-14 flex items-center bg-gradient-to-r from-background via-background/95 to-transparent pointer-events-none"><button aria-label="Rangos anteriores" onClick={()=>track.current?.scrollBy({left:-280,behavior:'smooth'})} className="pointer-events-auto size-7 grid place-items-center rounded-full bg-card border border-border shadow-sm hover:bg-muted"><ChevronLeft size={15}/></button></div>}
    {edges.right&&<div className="absolute inset-y-0 right-0 w-14 flex items-center justify-end bg-gradient-to-l from-background via-background/95 to-transparent pointer-events-none"><button aria-label="Más rangos" onClick={()=>track.current?.scrollBy({left:280,behavior:'smooth'})} className="pointer-events-auto size-7 grid place-items-center rounded-full bg-card border border-border shadow-sm hover:bg-muted"><ChevronRight size={15}/></button></div>}
  </div>;
}
