import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/backend/client';
import type { ProductReview } from '@/lib/storeTypes';

export type ReviewFilters = { sort: 'helpful' | 'recent' | 'high' | 'low'; star: number; photos: boolean; verified: boolean };
const EMPTY = { total: 0, average: 0, verified: 0, stars: [0, 0, 0, 0, 0] };
const PAGE_SIZE = 12;

/** Cursor pagination keeps reads bounded even for products with a large review history. */
export function useProductReviews(productId?: string) {
  const [reviews, setReviews] = useState<ProductReview[]>([]);
  const [summary, setSummary] = useState(EMPTY);
  const [filters, setFilters] = useState<ReviewFilters>({ sort: 'helpful', star: 0, photos: false, verified: false });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [hasMore, setHasMore] = useState(false);
  const generation = useRef(0);
  const busy = useRef(false);
  const cursor = useRef<ProductReview | null>(null);

  const loadMore = useCallback(async () => {
    if (!productId || busy.current) return;
    busy.current = true;
    const request = generation.current;
    setLoading(true); setError('');
    try {
      const field = filters.sort === 'recent' ? 'created_at' : filters.sort === 'helpful' ? 'helpful_count' : 'rating';
      const ascending = filters.sort === 'low';
      const direction = ascending ? 'gt' : 'lt';
      let query = supabase.from('product_reviews')
        .select('*, profile:profiles(full_name,avatar_url), replies:product_review_replies(*)')
        .eq('product_id', productId).eq('status', 'approved')
        .order(field, { ascending, nullsFirst: false }).order('id', { ascending })
        .order('created_at', { referencedTable: 'replies', ascending: true })
        .order('id', { referencedTable: 'replies', ascending: true }).limit(3, { referencedTable: 'replies' }).limit(PAGE_SIZE + 1);
      if (filters.star) query = query.eq('rating', filters.star);
      if (filters.photos) query = query.neq('images', '[]');
      if (filters.verified) query = query.eq('verified_purchase', true);
      const last = cursor.current;
      if (last) {
        const value = last[field as keyof ProductReview];
        query = query.or(`${field}.${direction}.${value},and(${field}.eq.${value},id.${direction}.${last.id})`);
      }
      const [page, aggregate] = await Promise.all([
        query,
        last ? Promise.resolve(null) : supabase.rpc('product_review_summary', { p_product_id: productId }),
      ]);
      if (request !== generation.current) return;
      if (page.error || aggregate?.error) throw page.error || aggregate?.error;
      const rows = (page.data || []) as ProductReview[];
      const batch = rows.slice(0, PAGE_SIZE);
      setReviews(previous => last ? [...previous, ...batch.filter(r => !previous.some(p => p.id === r.id))] : batch);
      cursor.current = batch[batch.length - 1] || last;
      setHasMore(rows.length > PAGE_SIZE);
      if (aggregate?.data) setSummary(aggregate.data);
    } catch {
      if (request === generation.current) setError('No pudimos cargar las opiniones. Inténtalo de nuevo.');
    } finally {
      if (request === generation.current) { busy.current = false; setLoading(false); }
    }
  }, [productId, filters]);

  useEffect(() => {
    generation.current += 1; busy.current = false; cursor.current = null;
    setReviews([]); setHasMore(false); setError('');
    if (productId) void loadMore();
    return () => { generation.current += 1; };
  }, [loadMore, productId]);
  useEffect(() => { setSummary(EMPTY); }, [productId]);
  return { reviews, setReviews, summary, filters, setFilters, loading, error, hasMore, loadMore };
}
