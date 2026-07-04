import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { useConfig, formatPrice } from '@/store/configStore';
import { cn } from '@/lib/utils';
import { TrendingUp, Star, Crown, Target, CircleCheck as CheckCircle, Medal, Gem, Disc, Award as AwardIcon } from 'lucide-react';

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  medal: Medal, gem: Gem, disc: Disc, crown: Crown, star: Star, award: AwardIcon,
  bronze: Medal, silver: Medal, gold: Medal, platinum: Disc, diamond: Gem,
};

function RankIcon({ icon, className }: { icon?: string; className?: string }) {
  if (!icon) return <Medal className={className} />;
  // If it's a single emoji character, render it as text
  if (icon.length <= 4 && !icon.includes('.')) return <span className={className}>{icon}</span>;
  // If it matches a Lucide icon name
  const Comp = iconMap[icon.toLowerCase()];
  if (Comp) return <Comp className={className} />;
  // If it's an SVG path or URL, render as image
  if (icon.startsWith('http') || icon.startsWith('/')) return <img src={icon} alt="" className={className} />;
  // Default: render as text (emoji)
  return <span className={className}>{icon}</span>;
}

export default function RanksPage() {
  const { user } = useAuthStore();
  const { ranks, currency, currencySymbol, exchangeRate } = useConfig();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ affiliates: 0, volume: 0, totalCommissions: 0 });

  useEffect(() => {
    async function fetchStats() {
      if (!user) return;
      setLoading(true);
      const { data: referrals } = await supabase
        .from('profiles').select('id').eq('sponsor_id', user.id);
      const { data: commissions } = await supabase
        .from('commissions').select('amount').eq('user_id', user.id);
      const totalCommissions = commissions?.reduce((s, c) => s + Number(c.amount), 0) || 0;
      setStats({
        affiliates: referrals?.length || 0,
        volume: totalCommissions * 10,
        totalCommissions,
      });
      setLoading(false);
    }
    fetchStats();
  }, [user]);

  const currentRankIndex = ranks.findIndex(r => r.slug === user?.rank);
  const currentRank = ranks[currentRankIndex] || ranks[0];
  const nextRank = ranks[currentRankIndex + 1];

  const affProgress = nextRank ? Math.min(100, (stats.affiliates / nextRank.min_affiliates) * 100) : 100;
  const volProgress = nextRank ? Math.min(100, (stats.volume / nextRank.min_volume) * 100) : 100;

  if (loading || ranks.length === 0) {
    return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Sistema de Rangos</h1>
        <p className="text-muted-foreground text-sm mt-1">Tu progreso y los rangos disponibles.</p>
      </div>

      {/* Current rank + progress */}
      <div className="bg-card border border-border rounded-xl p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-5">
          <div className={cn('w-16 h-16 rounded-2xl flex items-center justify-center flex-shrink-0 border-2', currentRank.bg_color, currentRank.border_color)}>
            <RankIcon icon={currentRank.icon} className={cn('w-8 h-8', currentRank.color)} />
          </div>
          <div className="flex-1">
            <div className="text-xs text-muted-foreground uppercase tracking-wide">Tu rango actual</div>
            <div className={cn('text-xl font-bold', currentRank.color)}>{currentRank.name}</div>
            <div className="text-sm text-muted-foreground">Bono mensual: <span className="font-bold text-foreground">{formatPrice(currentRank.bonus, currency, currencySymbol, exchangeRate)}</span></div>
          </div>
          {nextRank && (
            <div className="text-right">
              <div className="text-xs text-muted-foreground">Siguiente</div>
              <div className={cn('text-sm font-bold flex items-center gap-1.5 justify-end', nextRank.color)}>
                <RankIcon icon={nextRank.icon} className="w-4 h-4" /> {nextRank.name}
              </div>
            </div>
          )}
        </div>

        {nextRank ? (
          <div className="space-y-4 pt-4 border-t border-border">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-medium text-foreground flex items-center gap-1.5"><Target className="w-3.5 h-3.5" /> Afiliados requeridos</span>
                <span className="text-xs text-muted-foreground">{stats.affiliates} / {nextRank.min_affiliates}</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-primary rounded-full transition-all duration-500" style={{ width: `${affProgress}%` }} />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-medium text-foreground flex items-center gap-1.5"><TrendingUp className="w-3.5 h-3.5" /> Volumen requerido</span>
                <span className="text-xs text-muted-foreground">{formatPrice(stats.volume, currency, currencySymbol, exchangeRate)} / {formatPrice(nextRank.min_volume, currency, currencySymbol, exchangeRate)}</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-green-500 rounded-full transition-all duration-500" style={{ width: `${volProgress}%` }} />
              </div>
            </div>
          </div>
        ) : (
          <div className="pt-4 border-t border-border text-center py-4">
            <Crown className="w-8 h-8 text-yellow-400 mx-auto mb-2" />
            <p className="text-sm font-semibold text-foreground">¡Has alcanzado el rango máximo!</p>
          </div>
        )}
      </div>

      {/* All ranks */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {ranks.map((rank, i) => {
          const isCurrent = rank.slug === user?.rank;
          const isAchieved = i <= currentRankIndex;
          return (
            <div key={rank.id} className={cn(
              'bg-card border-2 rounded-xl p-5 transition-all',
              isCurrent ? 'border-primary shadow-lg shadow-primary/10' : isAchieved ? rank.border_color : 'border-border opacity-60'
            )}>
              <div className="flex items-center justify-between mb-3">
                <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center', rank.bg_color)}>
                  <RankIcon icon={rank.icon} className="w-6 h-6" />
                </div>
                {isCurrent && <span className="text-xs font-bold px-2 py-1 rounded-full bg-primary text-white">ACTUAL</span>}
                {isAchieved && !isCurrent && <CheckCircle className="w-4 h-4 text-green-500" />}
              </div>
              <h3 className={cn('text-base font-bold', rank.color)}>{rank.name}</h3>
              <div className="text-sm text-foreground font-bold mt-1">Bono: {formatPrice(rank.bonus, currency, currencySymbol, exchangeRate)}/mes</div>
              <div className="mt-3 pt-3 border-t border-border space-y-1.5 text-xs text-muted-foreground">
                <div className="flex items-center gap-2"><Star className="w-3 h-3" /> {rank.min_affiliates} afiliados</div>
                <div className="flex items-center gap-2"><TrendingUp className="w-3 h-3" /> {formatPrice(rank.min_volume, currency, currencySymbol, exchangeRate)} en volumen</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
