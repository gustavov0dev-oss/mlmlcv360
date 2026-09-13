import { RegistrationForm } from './RegistrationForm';
import { useConfig } from '@/store/configStore';
import { PaymentCurrency } from '@/components/payments/PaymentMethods';
import { Link } from '@/lib/router';
export function GuestPlanCheckout({slug}:{slug:string}){
 const {plans,loading,showUsd,setShowUsd,exchangeRate}=useConfig();
 const plan=plans.find(p=>p.slug===slug&&p.is_active);const currency=showUsd?'USD':'PEN';
 if(loading)return <div className="min-h-[400px]" aria-busy="true"/>;
 if(!plan)return <p className="mt-5">Este plan no está disponible. <Link to="/planes" className="text-primary">Ver planes</Link></p>;
 const price=Number(plan.price);const amount=(plan.currency||'PEN')===currency?price:currency==='USD'?price/exchangeRate:price*exchangeRate;
 return <div className="mt-6 space-y-7"><section className="rounded-xl border border-border bg-card p-5"><div className="flex justify-between gap-5"><div><h2 className="font-semibold text-xl">{plan.name}</h2><p className="text-sm text-muted-foreground mt-1">{price>0?'Membresía mensual':'Acceso gratuito'}</p></div><p className="text-xl font-semibold tabular-nums whitespace-nowrap">{currency} {amount.toFixed(2)}</p></div>{price>0&&<div className="mt-5"><PaymentCurrency value={currency} onChange={v=>setShowUsd(v==='USD')}/></div>}<Link to="/planes" className="inline-block mt-4 text-sm text-primary">Cambiar plan</Link></section><div><h2 className="text-lg font-semibold mb-2">Tus datos para continuar</h2><p className="text-sm text-muted-foreground mb-5">Crea tu cuenta para guardar la compra. Después elegirás cómo pagar; tus beneficios se activarán al confirmar el pago.</p><RegistrationForm destination={price>0?`/pago?plan=${encodeURIComponent(slug)}`:'/dashboard'}/></div></div>;
}
