import { useState, useEffect } from 'react';
import { useDatabase } from '@/lib/backend';
import { useNavigate } from '@/lib/router';
import { cn } from '@/lib/utils';
import type { Product } from '@/lib/storeTypes';
import { X, Package, Star, ShoppingCart } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { useCart } from '@/store/cartStore';
import Navbar from '@/components/landing/Navbar';
import Footer from '@/components/landing/Footer';

function fmt(n: number, c = 'PEN') { return c === 'USD' ? `$${n.toFixed(2)}` : `S/ ${n.toFixed(2)}`; }

export default function ComparePage() {
  const database = useDatabase();
  const navigate = useNavigate();
  const { addItem } = useCart();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ids = params.get('ids')?.split(',').filter(Boolean) || [];
    if (ids.length < 2) { navigate('/tienda'); return; }
    database.select<Product>('products', {
      select: '*, category:product_categories(id,name), variants:product_variants(*)',
      filter: [
        { column: 'id', operator: 'in', value: ids },
        { column: 'status', operator: 'eq', value: 'active' },
      ],
    }).then(({ data }) => { setProducts((data as Product[]) || []); setLoading(false); });
  }, [navigate]);

  const allSpecKeys = [...new Set(products.flatMap(p => Object.keys((p as any).specs || {})))];

  if (loading) return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <div className="pt-28 max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-9 w-24 rounded-xl" />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead><tr><th className="p-4"><Skeleton className="h-4 w-24" /></th>{Array.from({length:3}).map((_,i)=>(<th key={i} className="p-4"><Skeleton className="h-4 w-28 mx-auto" /></th>))}</tr></thead>
            <tbody>{Array.from({length:3}).map((_,i)=>(<tr key={i} className="border-b border-border"><td className="p-4"><Skeleton className="h-4 w-28" /></td>{Array.from({length:3}).map((_,j)=>(<td key={j} className="p-4"><Skeleton className="h-5 w-20 mx-auto" /></td>))}</tr>))}</tbody>
          </table>
        </div>
      </div>
      <Footer />
    </div>
  );

  if (products.length < 2) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <h2 className="text-xl font-bold">Selecciona al menos 2 productos</h2>
        <button onClick={() => navigate('/tienda')} className="px-5 py-2.5 bg-primary text-primary-foreground rounded-xl font-bold text-sm">Ir a la tienda</button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <div className="pt-28 max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-foreground">Comparar productos</h1>
          <button onClick={() => navigate('/tienda')} className="flex items-center gap-2 px-4 py-2 border border-border rounded-xl text-sm font-semibold hover:bg-muted transition-colors"><X className="w-4 h-4" /> Volver</button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left p-4 bg-muted/30 font-bold text-muted-foreground w-32">Caracteristica</th>
                {products.map(p => (
                  <th key={p.id} className="p-4 text-center min-w-[180px]">
                    <div className="group relative aspect-square bg-muted rounded-xl overflow-hidden mb-3">
                      {p.images?.[0]?.url ? <img src={p.images[0].url} alt={p.name} className="w-full h-full object-cover" /> : <Package className="w-12 h-12 text-muted-foreground/30 m-auto" />}
                      <button onClick={() => navigate(`/tienda/${p.slug}`)} className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                        <span className="text-white text-xs font-bold">Ver producto</span>
                      </button>
                    </div>
                    <button onClick={() => navigate(`/tienda/${p.slug}`)} className="text-sm font-bold text-foreground hover:text-primary line-clamp-2">{p.name}</button>
                    <div className="flex justify-center gap-1 mt-1">
                      {Array.from({ length: 5 }).map((_, i) => <Star key={i} className={cn('w-3 h-3', i < Math.round(p.avg_rating ?? 0) ? 'text-amber-400 fill-amber-400' : 'text-border')} />)}
                    </div>
                    <p className="text-lg font-bold text-primary mt-2">{fmt(p.base_price, p.currency)}</p>
                    <button onClick={() => { addItem(p); toast.success('Producto agregado'); }} className="mt-2 flex items-center gap-1 mx-auto px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-xs font-bold"><ShoppingCart className="w-3 h-3" /> Agregar</button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {/* Basic attributes */}
              <tr className="border-b border-border"><td className="p-4 bg-muted/30 font-semibold">Categoria</td>{products.map(p => <td key={p.id} className="p-4 text-center">{(p.category as any)?.name || '-'}</td>)}</tr>
              <tr className="border-b border-border"><td className="p-4 bg-muted/30 font-semibold">Precio</td>{products.map(p => <td key={p.id} className="p-4 text-center font-bold">{fmt(p.base_price, p.currency)}</td>)}</tr>
              <tr className="border-b border-border"><td className="p-4 bg-muted/30 font-semibold">Stock</td>{products.map(p => { const stock = (p.variants || []).reduce((s: number, v: any) => s + (v.stock || 0), 0); return <td key={p.id} className={cn('p-4 text-center', stock === 0 ? 'text-red-500' : stock <= 5 ? 'text-orange-500' : 'text-green-600')}>{stock}</td>; })}</tr>

              {/* Specs */}
              {allSpecKeys.map(key => (
                <tr key={key} className="border-b border-border">
                  <td className="p-4 bg-muted/30 font-semibold capitalize">{key}</td>
                  {products.map(p => <td key={p.id} className="p-4 text-center text-muted-foreground">{((p as any).specs as Record<string,string>)?.[key] || '-'}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <Footer />
    </div>
  );
}
