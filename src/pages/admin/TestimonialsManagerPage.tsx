import TestimonialsAdminPage from '@/pages/admin/TestimonialsAdminPage';
import RegionStatsAdminPage from '@/pages/admin/RegionStatsAdminPage';
import { useState } from 'react';
import { Quote, MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';

const TABS = [
  { id: 'testimonials', label: 'Testimonios', icon: Quote },
  { id: 'regions',      label: 'Ciudades',    icon: MapPin },
] as const;

type TabId = (typeof TABS)[number]['id'];

export default function TestimonialsManagerPage() {
  const [tab, setTab] = useState<TabId>('testimonials');

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-muted rounded-xl w-fit">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all',
              tab === t.id
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <t.icon className="w-3.5 h-3.5" />
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'testimonials' && <TestimonialsAdminPage />}
      {tab === 'regions'      && <RegionStatsAdminPage />}
    </div>
  );
}
