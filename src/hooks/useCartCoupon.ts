import { useState, useEffect, useCallback } from 'react';
import { useDatabase } from '@/lib/backend';
import type { Coupon } from '@/lib/storeTypes';
const KEY = 'mlm360_cart_coupon';
export function useCartCoupon(subtotal: number, disabled=false) {
 const database = useDatabase();
 const [coupon, update] = useState<Coupon | null>(null);
 const [code, setCode] = useState(() => { try { return localStorage.getItem(KEY) || ''; } catch { return ''; } });
 const [validating, setValidating] = useState(!!code);
 const setCoupon = useCallback((value: Coupon | null) => {
  if(disabled&&value)return;
  update(value); setCode(value?.code || '');
  try { if(value) localStorage.setItem(KEY,value.code); else localStorage.removeItem(KEY); } catch {}
 }, [disabled]);
 useEffect(() => {
  let current=true;
  if(disabled || !code || subtotal <= 0) { update(null); setValidating(false); return; }
  setValidating(true);
  database.select<Coupon>('coupons',{filter:{code,status:'active'},maybeSingle:true}).then(({data,error})=>{
   if(!current)return;
   setValidating(false);
   if(error){update(null);return;}
   const c=data as Coupon|null;
   const valid=c && (!c.expires_at || new Date(c.expires_at).getTime()>Date.now()) && (!c.usage_limit || c.used_count<c.usage_limit) && subtotal >= (c.min_order_amount || 0);
   update(valid ? c : null);
  });
  return()=>{current=false;};
 },[code,subtotal,database,disabled]);
 return {coupon,setCoupon,savedCode:code,validating};
}
