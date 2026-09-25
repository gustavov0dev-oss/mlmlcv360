/** Recorded paid periods are authoritative. Only normalize the old free-plan sentinel. */
export function planTerms(subscription:any,plan:any,now=Date.now()){
 const free=!!plan&&(plan.is_free||Number(plan.price)===0);
 const start=subscription?.current_period_start?Date.parse(subscription.current_period_start):NaN;
 let end=subscription?.current_period_end?Date.parse(subscription.current_period_end):NaN;
 const days=Number(plan?.trial_days)||0;
 if(free&&subscription?.gateway==='free'&&Number.isFinite(start)&&days>0&&(!Number.isFinite(end)||end-start>50*365.25*86400000))end=start+days*86400000;
 const expired=subscription?.status==='expired'||(Number.isFinite(end)&&end<=now);
 const active=subscription?.status==='active'&&!expired;
 return {free,start,end,days,expired,active,remaining:Number.isFinite(end)?Math.max(0,Math.ceil((end-now)/86400000)):null,status:expired?'Vencido':subscription?.status==='cancelled'?'Cancelado':subscription?.status==='pending'?'Pendiente':subscription?.status==='suspended'?'Suspendido':active?'Activo':'Sin membresía'};
}
