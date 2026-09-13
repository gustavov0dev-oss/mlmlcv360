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
  refreshStock: () => Promise<boolean>;
  removeItem: (itemId: string) => void;
  updateQty: (itemId: string, qty: number) => void;
  clearCart: () => void;
  itemCount: number;
  subtotal: number;
}

const CartContext = createContext<CartStore>({
  items: [], refreshStock: async () => true, addItem: async () => false, removeItem: () => {}, updateQty: () => {}, clearCart: () => {},
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

  const addItem = useCallback(async (product: Product, variant?: ProductVariant, qty = 1) => {
    if (adding.current) return false;
    adding.current = true;
    try {
      const {data, error} = await supabase.from('products').select('*, variants:product_variants(*)').eq('id',product.id).single();
      if(error || !data) throw new Error('No pudimos verificar la disponibilidad. Inténtalo nuevamente.');
      const freshVariant = availableCartVariant(data,variant?.id,qty);
      const key = freshVariant?.id || product.id;
      const existing = current.current.find(i => (i.variant?.id || i.product.id) === key);
      const quantity = (existing?.quantity || 0) + Math.max(1,Math.floor(qty));
      availableCartVariant(data,freshVariant?.id,quantity);
      const freshProduct = {...product,...data};
      const price = freshVariant?.price ?? data.base_price;
      const next = existing ? current.current.map(i => i.id === existing.id ? {...i,product:freshProduct,variant:freshVariant,price,quantity} : i) : [...current.current,{id:`${product.id}-${key}-${Date.now()}`,product:freshProduct,variant:freshVariant,price,quantity}];
      current.current = next;
      setItems(next);
      return true;
    } catch(error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo agregar el producto.');
      return false;
    } finally { adding.current = false; }
  }, []);

  const refreshStock = useCallback(async () => {
    const snapshot = current.current;
    if(!snapshot.length) return true;
    const {data,error} = await supabase.from('products').select('*, variants:product_variants(*)').in('id',[...new Set(snapshot.map(i=>i.product.id))]);
    if(error){toast.error('No pudimos verificar el stock. Inténtalo nuevamente.');return false;}
    let changed=false;
    const next=snapshot.flatMap(item=>{
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
    current.current=next;setItems(next);
    if(changed)toast.info('Algunos productos ya no tienen la cantidad disponible. Conservamos tu carrito para que puedas revisarlo.');
    return !changed;
  }, []);

  const removeItem = useCallback((itemId: string) => {
    setItems(prev => prev.filter(i => i.id !== itemId));
  }, []);

  const updateQty = useCallback((itemId: string, qty: number) => {
    if (qty <= 0) { removeItem(itemId); return; }
    const item = current.current.find(i => i.id === itemId);
    if(item?.product.track_stock && qty > Number(item.variant?.stock ?? item.product.general_stock ?? 0)){toast.error('No hay más unidades disponibles.');return;}
    setItems(prev => prev.map(i => i.id === itemId ? { ...i, quantity: Math.floor(qty) } : i));
  }, [removeItem]);

  const clearCart = useCallback(() => setItems([]), []);

  const itemCount = items.reduce((s, i) => s + i.quantity, 0);
  const subtotal  = items.reduce((s, i) => s + i.price * i.quantity, 0);

  return (
    <CartContext.Provider value={{ items, addItem, refreshStock, removeItem, updateQty, clearCart, itemCount, subtotal }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  return useContext(CartContext);
}
