import { useLayoutEffect, useRef, type HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

/** A quiet, accessible loading state with no decorative blocks or animation. */
export function LoadingRegion({className}:{className?:string}) {
  return <div className={cn('w-full',className)} role="status" aria-busy="true"><span className="sr-only">Cargando contenido…</span></div>;
}

/** Preserve the section footprint when data refreshes, without rendering extra markup. */
export function StableRegion({children,...props}:HTMLAttributes<HTMLDivElement>) {
  const ref=useRef<HTMLDivElement>(null);
  useLayoutEffect(()=>{
    const element=ref.current;
    if(!element)return;
    let height=0;
    const reserve=()=>{
      const next=Math.ceil(element.getBoundingClientRect().height);
      if(next>height){height=next;element.style.minHeight=`${height}px`;}
    };
    reserve();
    const observer=new ResizeObserver(reserve);
    observer.observe(element);
    return()=>observer.disconnect();
  },[]);
  return <div ref={ref} {...props}>{children}</div>;
}
