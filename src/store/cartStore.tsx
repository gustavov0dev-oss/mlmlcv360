import type {PackSelection,PackQuote} from '@/lib/mlmPacks';
import {useConfig} from '@/store/configStore';
import { checkoutSnapshots, forgetCheckout, subtractPurchased } from '@/lib/checkoutCart';
import { useAuthStore } from '@/store/authStore';
import { availableCartVariant } from '@/lib/cartAvailability';
import { supabase } from '@/lib/backend/client';
import { toast } from 'sonner';
import { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import type { Product, ProductVariant, CartItem } from '@/lib/storeTypes';

interface CartStore {
  items: CartItem[];
  addItem: (product: Product, variant?: ProductVariant, qty?: number) => Promise<boolean>;
  addPack: (selection:PackSelection) => Promise<boolean>;
  refreshStock: () => Promise<boolean>;
  removeItem: (itemId: string) => void;
  updateQty: (itemId: string, qty: number) => void;
  clearCart: () => void;
  itemCount: number;
  subtotal: number;
}

const CartContext = createContext<CartStore>({
  items: [], addPack:async()=>false, refreshStock: async () => true, addItem: async () => false, removeItem: () => {}, updateQty: () => {}, clearCart: () => {},
  itemCount: 0, subtotal: 0,
});

const LS_KEY = 'mlm360_cart';

function loadCart(): CartItem[] {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const {user}=useAuthStore();
  const {exchangeRate}=useConfig();
  const [items, setItems] = useState<CartItem[]>(loadCart);

  const current = useRef(items);
  current.current = items;
  const adding = useRef(false);

  useEffect(() => {
    localStorage.setItem(LS_KEY, JSON.stringify(items));
  }, [items]);

  useEffect(()=>{
    if(!user)return;
    let active=true,checking=false;
    const reconcile=async()=>{
      if(checking)return;checking=true;
      try{
        const snapshots=checkoutSnapshots().filter(s=>s.userId===user.id);
        if(!snapshots.length)return;
        const {data,error}=await supabase.from('orders').select('id,payment_status').eq('user_id',user.id).in('id',snapshots.map(s=>s.orderId));
        if(error||!active)return;
        for(const order of data||[]){if(order.payment_status!=='paid')continue;
          const snapshot=checkoutSnapshots().find(s=>s.orderId===order.id&&s.userId===user.id);
          if(!snapshot)continue;
          const next=subtractPurchased(current.current,snapshot.items);
          current.current=next;localStorage.setItem(LS_KEY,JSON.stringify(next));setItems(next);forgetCheckout(order.id);
        }
      }finally{checking=false;}
    };
    void reconcile();const timer=setInterval(reconcile,30000);window.addEventListener('focus',reconcile);
    return()=>{active=false;clearInterval(timer);window.removeEventListener('focus',reconcile);};
  },[user?.id]);

  const validateCombinedStock=async(candidate:CartItem[])=>{
    const demand=candidate.flatMap(i=>i.pack?i.pack.lines.map(l=>({product_id:l.product_id,variant_id:l.variant_id,quantity:l.quantity})): [{product_id:i.product.id,variant_id:i.variant?.id,quantity:i.quantity}]);
    const ids=[...new Set(demand.map(d=>d.product_id))];
    if(!ids.length)return;
    const {data,error}=await supabase.from('products').select('*,variants:product_variants(*)').in('id',ids);
    if(error)throw new Error('No pudimos verificar las existencias.');
    const sums=new Map<string,number>();
    for(const row of demand){const key=row.variant_id||row.product_id;const total=(sums.get(key)||0)+row.quantity;sums.set(key,total);const product=data?.find(p=>p.id===row.product_id);if(!product)throw new Error('Producto no disponible');availableCartVariant(product,row.variant_id||undefined,total);}
  };

  const addItem = useCallback(async (product: Product, variant?: ProductVariant, qty = 1) => {
    if (adding.current) return false;
    adding.current = true;
    try {
      const {data, error} = await supabase.from('products').select('*, variants:product_variants(*)').eq('id',product.id).single();
      if(error || !data) throw new Error('No pudimos verificar la disponibilidad. Inténtalo nuevamente.');
      const freshVariant = availableCartVariant(data,variant?.id,qty);
      const key = freshVariant?.id || product.id;
      const existing = current.current.find(i => !i.pack && (i.variant?.id || i.product.id) === key);
      const quantity = (existing?.quantity || 0) + Math.max(1,Math.floor(qty));
      availableCartVariant(data,freshVariant?.id,quantity);
      const freshProduct = {...product,...data};
      const price = freshVariant?.price ?? data.base_price;
      const next = existing ? current.current.map(i => i.id === existing.id ? {...i,product:freshProduct,variant:freshVariant,price,quantity} : i) : [...current.current,{id:`${product.id}-${key}-${Date.now()}`,product:freshProduct,variant:freshVariant,price,quantity}];
      await validateCombinedStock(next);
      current.current = next;
      setItems(next);
      return true;
    } catch(error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo agregar el producto.');
      return false;
    } finally { adding.current = false; }
  }, []);

  const addPack = useCallback(async(selection:PackSelection)=>{
    if(adding.current)return false;adding.current=true;
    try {const {data,error}=await supabase.rpc('quote_mlm_pack',{p_selection:selection});if(error)throw error;
      const pack=data as PackQuote;
      const product={id:pack.pack_id,name:pack.name,slug:'packs',images:[{url:pack.image_url||pack.lines[0]?.image_url||''}],is_digital:pack.lines.every(l=>l.is_digital),currency:'PEN',status:'active',track_stock:false,points:pack.points} as Product;
      const next=[...current.current,{id:crypto.randomUUID(),product,quantity:1,price:pack.price*(pack.currency==='USD'?exchangeRate:1),pack}];
      await validateCombinedStock(next);
      current.current=next;setItems(next);return true;
    }catch(e:any){toast.error(e.message||'No se pudo agregar el pack');return false;}finally{adding.current=false;}
  },[exchangeRate]);

  const refreshStock = useCallback(async () => {
    const snapshot = current.current;
    if(!snapshot.length) return true;
    const quotes=new Map<string,PackQuote>();
    try {
      await Promise.all([
        validateCombinedStock(snapshot),
        ...snapshot.filter(i=>i.pack).map(async item=>{
          const r=await supabase.rpc('quote_mlm_pack',{p_selection:item.pack!.selection});
          if(r.error)throw new Error(item.product.name+': '+r.error.message);
          quotes.set(item.id,r.data);
        })
      ]);
    }catch(e:any){toast.error(e.message||'No pudimos verificar tu carrito.');return false;}
    const ids=[...new Set(snapshot.filter(i=>!i.pack).map(i=>i.product.id))];
    const {data,error} = ids.length?await supabase.from('products').select('*, variants:product_variants(*)').in('id',ids):{data:[],error:null};
    if(error){toast.error('No pudimos verificar el stock. Inténtalo nuevamente.');return false;}
    let changed=false;
    const next=snapshot.flatMap(item=>{
      if(item.pack){const pack=quotes.get(item.id)!;return [{...item,pack,price:pack.price*(pack.currency==='USD'?exchangeRate:1)}];}
      const product=data?.find(p=>p.id===item.product.id);
      const variant=item.variant?product?.variants?.find((v:ProductVariant)=>v.id===item.variant!.id&&v.status==='active'):undefined;
      if(!product||product.status!=='active'||(item.variant&&!variant)){changed=true;return [item];}
      const available=product.track_stock?Number(variant?.stock??product.general_stock??0):item.quantity;
      if(available<=0){changed=true;return [item];}
      const quantity=item.quantity;if(quantity>available)changed=true;
      return [{...item,product:{...item.product,...product},variant,quantity}];
    });
    // Do not overwrite a cart changed while the request was running.
    if(current.current!==snapshot) return false;
    try{await validateCombinedStock(next);}catch(e:any){toast.error(e.message);return false;}
    if(current.current!==snapshot)return false;
    current.current=next;setItems(next);
    if(changed)toast.info('Algunos productos ya no tienen la cantidad disponible. Conservamos tu carrito para que puedas revisarlo.');
    return !changed;
  }, [exchangeRate]);

  const removeItem = useCallback((itemId: string) => {
    const next=current.current.filter(i=>i.id!==itemId);current.current=next;setItems(next);
  }, []);

  const updateQty = useCallback((itemId: string, qty: number) => {
    if (qty <= 0) { removeItem(itemId); return; }
    const item = current.current.find(i => i.id === itemId);
    if(item?.pack){toast.info('Para cambiar la selección, quita el pack y vuelve a elegir sus productos.');return;}
    const occupied=current.current.filter(i=>i.id!==itemId).reduce((n,i)=>n+(i.pack?i.pack.lines.filter(l=>(l.variant_id||l.product_id)===(item?.variant?.id||item?.product.id)).reduce((a,l)=>a+l.quantity,0):(i.variant?.id||i.product.id)===(item?.variant?.id||item?.product.id)?i.quantity:0),0);
    if(item?.product.track_stock && qty+occupied > Number(item.variant?.stock ?? item.product.general_stock ?? 0)){toast.error('No hay más unidades disponibles.');return;}
    const next=current.current.map(i => i.id === itemId ? { ...i, quantity: Math.floor(qty) } : i);current.current=next;setItems(next);
  }, [removeItem]);

  const clearCart = useCallback(() => setItems([]), []);

  const itemCount = items.reduce((s, i) => s + i.quantity, 0);
  const subtotal  = items.reduce((s, i) => s + i.price * i.quantity, 0);

  return (
    <CartContext.Provider value={{ items, addItem, addPack, refreshStock, removeItem, updateQty, clearCart, itemCount, subtotal }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  return useContext(CartContext);
}
