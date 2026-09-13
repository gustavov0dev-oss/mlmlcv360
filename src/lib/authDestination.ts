/** Resolve the selected purchase without accepting external redirect URLs. */
export function authDestination(search = window.location.search, stored = sessionStorage.getItem('cluv-auth-next')): string {
 const params = new URLSearchParams(search);
 const safe=(value:string|null)=>!!value&&value.startsWith('/')&&!value.startsWith('//')&&!/[\\\r\n]/.test(value)&&!/^\/(login|registro)([/?#]|$)/.test(value);
 const next=params.get('next');
 if(safe(next))return next!;
 const plan=params.get('plan');
 if(plan)return `/pago?plan=${encodeURIComponent(plan)}`;
 return safe(stored)?stored!:'/dashboard';
}
