import {useState,type ReactNode} from 'react';
import {Search,ChevronLeft,ChevronRight} from 'lucide-react';

/** Keeps catalog-sized pack selectors bounded while preserving quantities outside each page. */
export default function PackProductList<T>({items,label,searchText,renderItem}:{items:T[];label:string;searchText:(item:T)=>string;renderItem:(item:T,index:number)=>ReactNode}) {
 const [query,setQuery]=useState('');
 const [page,setPage]=useState(0);
 const matches=items.map((item,index)=>({item,index})).filter(({item})=>searchText(item).toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()));
 const pages=Math.max(1,Math.ceil(matches.length/6));
 const current=Math.min(page,pages-1);
 return <div className="space-y-3">
  {items.length>6&&<label className="relative block"><Search className="absolute left-3 top-3 text-muted-foreground" size={18}/><input aria-label={label} placeholder="Buscar producto o presentación…" value={query} onChange={e=>{setQuery(e.target.value);setPage(0);}} className="w-full h-11 pl-10 pr-3 rounded-xl border border-border bg-background text-sm"/></label>}
  <div>{matches.slice(current*6,current*6+6).map(({item,index})=>renderItem(item,index))}</div>
  {!matches.length&&<p className="py-4 text-sm text-muted-foreground">No se encontraron productos.</p>}
  {matches.length>6&&<nav aria-label={`Páginas: ${label}`} className="flex items-center justify-between gap-3 text-sm pt-2"><span className="text-muted-foreground">{current*6+1}–{Math.min((current+1)*6,matches.length)} de {matches.length}</span><div className="flex items-center gap-2"><button type="button" aria-label="Página anterior" disabled={current===0} onClick={()=>setPage(current-1)} className="grid place-items-center w-10 h-10 rounded-lg border border-border disabled:opacity-40"><ChevronLeft size={16}/></button><span className="tabular-nums">{current+1} / {pages}</span><button type="button" aria-label="Página siguiente" disabled={current===pages-1} onClick={()=>setPage(current+1)} className="grid place-items-center w-10 h-10 rounded-lg border border-border disabled:opacity-40"><ChevronRight size={16}/></button></div></nav>}
 </div>;
}
