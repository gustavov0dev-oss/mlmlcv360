import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

export interface Plan {
  id: string;
  name: string;
  slug: string;
  description: string;
  price: number;
  currency: string;
  features: string[];
  badge: string | null;
  is_popular: boolean;
  is_active: boolean;
  is_free: boolean;
  sort_order: number;
  trial_days: number;
}

export interface Rank {
  id: string;
  name: string;
  slug: string;
  description: string;
  icon: string;
  color: string;
  bg_color: string;
  border_color: string;
  bonus: number;
  min_affiliates: number;
  min_volume: number;
  sort_order: number;
  is_active: boolean;
}

interface TaxConfig {
  enabled: boolean;
  rate: number;
  includedInPrice: boolean;
  name: string;
}

interface ConfigState {
  plans: Plan[];
  ranks: Rank[];
  currency: string;
  currencySymbol: string;
  exchangeRate: number;
  company: Record<string, string>;
  tax: TaxConfig;
  loading: boolean;
  showUsd: boolean;
  setShowUsd: (v: boolean) => void;
  refresh: () => Promise<void>;
}

const ConfigContext = createContext<ConfigState>({
  plans: [],
  ranks: [],
  currency: 'PEN',
  currencySymbol: 'S/',
  exchangeRate: 3.72,
  company: {},
  tax: { enabled: false, rate: 18, includedInPrice: true, name: 'IGV' },
  loading: true,
  showUsd: false,
  setShowUsd: () => {},
  refresh: async () => {},
});

export function ConfigProvider({ children }: { children: ReactNode }) {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [ranks, setRanks] = useState<Rank[]>([]);
  const [currency, setCurrency] = useState('PEN');
  const [currencySymbol, setCurrencySymbol] = useState('S/');
  const [exchangeRate, setExchangeRate] = useState(3.72);
  const [company, setCompany] = useState<Record<string, string>>({});
  const [tax, setTax] = useState<TaxConfig>({ enabled: false, rate: 18, includedInPrice: true, name: 'IGV' });
  const [loading, setLoading] = useState(true);
  const [showUsd, setShowUsd] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const withTimeout = (p: PromiseLike<any>): Promise<any> =>
        Promise.race([
          Promise.resolve(p),
          new Promise<any>((_, rej) => setTimeout(() => rej(new Error('timeout')), 5000)),
        ]);

      const [plansRes, ranksRes, configRes] = await Promise.allSettled([
        withTimeout(supabase.from('plans').select('*').order('sort_order')),
        withTimeout(supabase.from('ranks').select('*').order('sort_order')),
        withTimeout(supabase.from('system_config').select('key, value')),
      ]);

      if (plansRes.status === 'fulfilled' && plansRes.value.data) {
        setPlans(plansRes.value.data.map((p: any) => ({
          ...p,
          features: Array.isArray(p.features) ? p.features : (() => { try { return JSON.parse(p.features || '[]'); } catch { return []; } })(),
        })));
      }
      if (ranksRes.status === 'fulfilled' && ranksRes.value.data) {
        setRanks(ranksRes.value.data as Rank[]);
      }
      if (configRes.status === 'fulfilled' && configRes.value.data) {
        const map: Record<string, string> = {};
        configRes.value.data.forEach((r: any) => { map[r.key] = r.value; });
        if (map.default_currency) setCurrency(map.default_currency);
        if (map.currency_symbol) setCurrencySymbol(map.currency_symbol);
        const rate = parseFloat(map.exchange_rate_usd || '3.72');
        if (!isNaN(rate) && rate > 0) setExchangeRate(rate);
        setCompany(map);
        setTax({
          enabled: map.igv_enabled === 'true',
          rate: parseFloat(map.igv_rate || '18') || 18,
          includedInPrice: map.igv_included_in_price !== 'false',
          name: map.tax_name || 'IGV',
        });
      }
    } catch {
      // Non-fatal: use defaults already set in state
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();

    const plansChannel = supabase.channel('plans-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'plans' }, () => refresh())
      .subscribe();

    const ranksChannel = supabase.channel('ranks-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ranks' }, () => refresh())
      .subscribe();

    const configChannel = supabase.channel('config-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'system_config' }, () => refresh())
      .subscribe();

    return () => {
      supabase.removeChannel(plansChannel);
      supabase.removeChannel(ranksChannel);
      supabase.removeChannel(configChannel);
    };
  }, [refresh]);

  return (
    <ConfigContext.Provider value={{ plans, ranks, currency, currencySymbol, exchangeRate, company, tax, loading, showUsd, setShowUsd, refresh }}>
      {children}
    </ConfigContext.Provider>
  );
}

export function useConfig() {
  return useContext(ConfigContext);
}

export function formatPrice(amount: number, currency: string, symbol: string, rate: number) {
  if (currency === 'USD') {
    const usd = Math.round(amount / rate);
    return `USD ${usd}`;
  }
  return `${symbol} ${amount}`;
}
