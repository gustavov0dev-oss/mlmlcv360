import { Landmark, Check } from 'lucide-react';

export type PaymentMethod = { id: string; slug: string; name: string; currency: string; ready?: boolean };
export const automaticPayment = (slug: string) => ['paypal', 'mercadopago'].includes(slug);
export function PaymentBrand({ slug }: { slug: string }) {
  return <span aria-hidden="true" className="flex h-10 w-16 shrink-0 items-center justify-center rounded-lg bg-white border border-black/5">
    {slug === 'paypal' ? <span className="text-sm font-extrabold italic text-[#003087]">Pay<span className="text-[#0070ba]">Pal</span></span> :
     slug === 'mercadopago' ? <span className="text-[11px] leading-3 font-bold text-[#009ee3] text-center">mercado<br/>pago</span> :
     slug === 'yape' ? <span className="text-xl font-bold italic text-[#742384]">yape</span> :
     slug === 'plin' ? <span className="text-xl font-bold text-[#009ac6]">plin</span> : <Landmark className="w-6 h-6 text-slate-600"/>}
  </span>;
}
export function PaymentMethods({ methods, value, onChange, membership = false, disabled = false }: {
  methods: PaymentMethod[]; value: string; onChange: (slug: string) => void; membership?: boolean; disabled?: boolean;
}) {
  return <fieldset disabled={disabled} className="space-y-2"><legend className="mb-3 text-base font-semibold">Método de pago</legend>
    {methods.filter(m => m.ready !== false).map(m => <label key={m.id || m.slug} className={`flex items-center gap-3 rounded-xl border p-3 cursor-pointer transition-colors ${value===m.slug?'border-primary/60 bg-primary/5':'border-border hover:bg-muted/40'} ${disabled?'opacity-60':''}`}>
      <input type="radio" name="payment-method" value={m.slug} checked={value===m.slug} onChange={()=>onChange(m.slug)} className="sr-only peer"/>
      <PaymentBrand slug={m.slug}/><span className="flex-1"><span className="block text-sm font-semibold">{m.name}</span><span className="block text-sm text-muted-foreground">{membership ? automaticPayment(m.slug) ? 'Renovación mensual automática' : 'Un mes · sin renovación automática' : automaticPayment(m.slug) ? 'Pago seguro en '+m.name : 'Transferencia con comprobante'} · {m.currency}</span></span>
      <span className="w-5 h-5 rounded-full border border-border flex items-center justify-center peer-focus-visible:ring-2 peer-focus-visible:ring-primary">{value===m.slug&&<Check className="w-3.5 h-3.5 text-primary"/>}</span>
    </label>)}
    {!methods.length&&<p className="text-sm text-muted-foreground">No hay métodos disponibles en este momento.</p>}
  </fieldset>;
}

export function PaymentCurrency({value,onChange,disabled=false}:{value:string;onChange:(value:string)=>void;disabled?:boolean}) {
 return <fieldset disabled={disabled} className="flex items-center gap-2"><legend className="text-sm text-muted-foreground mb-2">Moneda de pago</legend>{[['PEN','Soles · S/'],['USD','Dólares · US$']].map(([code,label])=><button key={code} type="button" aria-pressed={value===code} onClick={()=>onChange(code)} className={`rounded-lg border px-4 py-2 text-sm ${value===code?'border-primary text-primary bg-primary/5':'border-border text-muted-foreground'}`}>{label}</button>)}</fieldset>;
}
