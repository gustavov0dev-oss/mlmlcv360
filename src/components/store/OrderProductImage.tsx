import { useState, useEffect } from 'react';
import { Package } from 'lucide-react';
export function OrderProductImage({src,name}:{src?:string;name:string}) {
  const [failed,setFailed]=useState(false);
  useEffect(()=>setFailed(false),[src]);
  return <div className="w-11 h-11 rounded-lg bg-muted shrink-0 overflow-hidden flex items-center justify-center">
    {src&&!failed ? <img src={src} alt={name} loading="lazy" referrerPolicy="no-referrer" className="w-full h-full object-contain" onError={()=>setFailed(true)} /> : <Package aria-label="Imagen no disponible" className="w-5 h-5 text-muted-foreground" />}
  </div>;
}
