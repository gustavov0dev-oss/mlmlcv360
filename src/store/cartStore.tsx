import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import type { Product, ProductVariant, CartItem } from '@/lib/storeTypes';

interface CartStore {
  items: CartItem[];
  addItem: (product: Product, variant?: ProductVariant, qty?: number) => void;
  removeItem: (itemId: string) => void;
  updateQty: (itemId: string, qty: number) => void;
  clearCart: () => void;
  itemCount: number;
  subtotal: number;
}

const CartContext = createContext<CartStore>({
  items: [], addItem: () => {}, removeItem: () => {}, updateQty: () => {}, clearCart: () => {},
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
  const [items, setItems] = useState<CartItem[]>(loadCart);

  useEffect(() => {
    localStorage.setItem(LS_KEY, JSON.stringify(items));
  }, [items]);

  const addItem = useCallback((product: Product, variant?: ProductVariant, qty = 1) => {
    const price = variant?.price ?? product.base_price;
    setItems(prev => {
      const key = variant ? variant.id : product.id;
      const existing = prev.find(i => (i.variant?.id ?? i.product.id) === key);
      if (existing) {
        return prev.map(i =>
          (i.variant?.id ?? i.product.id) === key
            ? { ...i, quantity: i.quantity + qty }
            : i
        );
      }
      return [...prev, {
        id: `${product.id}-${variant?.id ?? 'base'}-${Date.now()}`,
        product, variant, quantity: qty, price,
      }];
    });
  }, []);

  const removeItem = useCallback((itemId: string) => {
    setItems(prev => prev.filter(i => i.id !== itemId));
  }, []);

  const updateQty = useCallback((itemId: string, qty: number) => {
    if (qty <= 0) { removeItem(itemId); return; }
    setItems(prev => prev.map(i => i.id === itemId ? { ...i, quantity: qty } : i));
  }, [removeItem]);

  const clearCart = useCallback(() => setItems([]), []);

  const itemCount = items.reduce((s, i) => s + i.quantity, 0);
  const subtotal  = items.reduce((s, i) => s + i.price * i.quantity, 0);

  return (
    <CartContext.Provider value={{ items, addItem, removeItem, updateQty, clearCart, itemCount, subtotal }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  return useContext(CartContext);
}
