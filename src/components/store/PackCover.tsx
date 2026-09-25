import {useState} from 'react';
import {Package} from 'lucide-react';
import type {MlmPack} from '@/lib/mlmPacks';

function CoverImage({src}:{src?:string}){
 const [failed,setFailed]=useState(false);
 return src&&!failed?<img src={src} alt="" loading="lazy" onError={()=>setFailed(true)} className="h-full w-full object-contain"/>:<Package className="h-10 w-10 text-neutral-400"/>;
}
export default function PackCover({pack}:{pack:MlmPack}){
 const products=Array.from(new Map(pack.products.filter(p=>p.role==='base').map(p=>[p.product_id,p])).values());
 const visible=products.slice(0,4);
 return <div className="relative aspect-square w-full overflow-hidden rounded-xl border border-border bg-white">
 {pack.image_url?<div className="flex h-full items-center justify-center p-4"><CoverImage key={pack.image_url} src={pack.image_url}/></div>:
 <div className={'grid h-full w-full gap-2 p-3 '+(visible.length===1?'grid-cols-1':visible.length===2?'grid-cols-2 grid-rows-1':'grid-cols-2 grid-rows-2')}>
 {visible.length?visible.map((p,i)=><div key={p.product_id} className={'flex min-h-0 min-w-0 items-center justify-center '+(visible.length===3&&i===0?'row-span-2':'')}><CoverImage src={p.product?.images?.[0]?.url}/></div>):<div className="col-span-2 row-span-2 flex items-center justify-center"><Package className="h-12 w-12 text-neutral-400"/></div>}
 </div>}
 {products.length>4&&<span className="absolute bottom-2 right-2 rounded-full bg-neutral-900 px-2.5 py-1 text-xs font-semibold text-white">+{products.length-4} productos</span>}
 </div>;
}
