import { useEffect, useState } from 'react';
import { supabase } from '@/lib/backend/client';
import { planTerms } from '@/lib/planTerms';
import { useConfig } from '@/store/configStore';

export function useAssignedPlan(userId?: string) {
  const { plans } = useConfig();
  const [record, setRecord] = useState<{ userId: string; subscription: any } | null>(null);
  useEffect(() => {
    let alive = true;
    setRecord(null);
    if (!userId) return;
    const refresh = () => { void supabase.from('subscriptions').select('*').eq('user_id', userId).maybeSingle().then(({ data, error }) => {
      if (alive) setRecord({ userId, subscription: error ? null : data });
    }); };
    refresh();
    window.addEventListener('focus', refresh);
    return () => { alive = false; window.removeEventListener('focus', refresh); };
  }, [userId]);
  const sub = record?.userId === userId ? record?.subscription : null;
  const plan = plans.find(p => p.id === sub?.plan_id || p.slug === sub?.plan_slug);
  return plan && planTerms(sub, plan).active ? plan : null;
}
