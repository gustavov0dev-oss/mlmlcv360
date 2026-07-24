import { useState, useEffect } from 'react';
import { useDatabase } from '@/lib/backend';
import { useUIStore } from '@/store/uiStore';
import { MessageCircle, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function WhatsAppButton() {
  const database = useDatabase();
  const { mobileNavOpen } = useUIStore();
  const [loaded, setLoaded] = useState(false);
  const [config, setConfig] = useState({
    enabled: false,
    number: '+51987654321',
    message: 'Hola, vengo desde MLM 360 y quiero más información.',
    position: 'right' as 'right' | 'left',
  });
  const [showChat, setShowChat] = useState(false);

  useEffect(() => {
    const fetchConfig = async () => {
      const { data } = await database.select<{ key: string; value: string }>('system_config', {
        filter: { key: ['whatsapp_enabled', 'whatsapp_number', 'whatsapp_message', 'whatsapp_position'] },
      });
      const map: Record<string, string> = {};
      if (Array.isArray(data)) data.forEach((r) => { map[r.key] = r.value; });
      setConfig({
        enabled: map.whatsapp_enabled === 'true',
        number: map.whatsapp_number || '+51987654321',
        message: map.whatsapp_message || 'Hola, vengo desde MLM 360 y quiero más información.',
        position: ((map.whatsapp_position || 'right').replace('bottom-', '') as 'right' | 'left'),
      });
      setLoaded(true);
    };
    fetchConfig();
    const unsubscribe = database.subscribe('system_config', fetchConfig);
    return unsubscribe;
  }, [database]);

  // Render nothing until config is fetched — prevents flash on reload
  // Also hide when mobile nav is open to avoid z-index conflicts
  if (!loaded || !config.enabled || mobileNavOpen) return null;

  const openWhatsApp = () => {
    const cleanNumber = config.number.replace(/[^0-9]/g, '');
    window.open(`https://wa.me/${cleanNumber}?text=${encodeURIComponent(config.message)}`, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className={cn('fixed bottom-5 z-30 transition-all', config.position === 'right' ? 'right-5' : 'left-5')}>
      {showChat && (
        <div className={cn(
          'absolute bottom-16 w-72 bg-card border border-border rounded-xl shadow-2xl overflow-hidden animate-fade-in-up',
          config.position === 'right' ? 'right-0' : 'left-0'
        )}>
          <div className="bg-green-500 p-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                <MessageCircle className="w-4 h-4 text-white" />
              </div>
              <div>
                <div className="text-sm font-bold text-white">MLM 360</div>
                <div className="text-xs text-green-100">En línea ahora</div>
              </div>
            </div>
            <button onClick={() => setShowChat(false)} className="text-white/80 hover:text-white" aria-label="Cerrar">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="p-4">
            <div className="bg-muted rounded-xl p-3 mb-3">
              <p className="text-sm text-foreground">{config.message}</p>
            </div>
            <button onClick={openWhatsApp}
              className="w-full bg-green-500 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-green-600 transition-colors flex items-center justify-center gap-2">
              <MessageCircle className="w-4 h-4" /> Abrir WhatsApp
            </button>
          </div>
        </div>
      )}
      <button
        onClick={() => setShowChat(v => !v)}
        className="w-14 h-14 rounded-full bg-green-500 hover:bg-green-600 text-white shadow-lg shadow-green-500/30 flex items-center justify-center transition-all hover:scale-110 active:scale-95"
        aria-label="WhatsApp"
      >
        <MessageCircle className="w-6 h-6" />
      </button>
    </div>
  );
}
