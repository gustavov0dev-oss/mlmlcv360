import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import {
  AreaChart, Area, PieChart, Pie, Cell, ResponsiveContainer,
  XAxis, YAxis, CartesianGrid, Tooltip
} from 'recharts';
import {
  DollarSign, Users, TrendingUp, Award, ArrowUpRight, ArrowDownRight,
  Activity, Bell, ChevronRight, UserPlus, Copy, CheckCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Link } from '@/lib/router';

const COLORS = ['#1d4ed8', '#3b82f6', '#60a5fa', '#93c5fd', '#bfdbfe'];

function StatCard({ label, value, change, icon: Icon, color }: {
  label: string; value: string; change?: string; icon: any; color: string;
}) {
  const isPositive = change?.startsWith('+');
  return (
    <div className="bg-card border border-border rounded-xl p-4 sm:p-5 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', color)}>
          <Icon className="w-5 h-5" />
        </div>
        {change && (
          <span className={cn('text-xs font-semibold px-2 py-1 rounded-full flex items-center gap-1',
            isPositive ? 'text-green-600 bg-green-500/10' : 'text-red-500 bg-red-500/10')}>
            {isPositive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
            {change}
          </span>
        )}
      </div>
      <div className="text-xl sm:text-2xl font-bold text-foreground">{value}</div>
      <div className="text-xs text-muted-foreground mt-0.5">{label}</div>
    </div>
  );
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-lg px-3 py-2 shadow-lg text-xs">
      {label && <div className="font-semibold text-foreground mb-1">{label}</div>}
      {payload.map((p: any, i: number) => (
        <div key={i} className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ background: p.color || p.fill }} />
          <span className="text-muted-foreground">{p.name}:</span>
          <span className="font-semibold text-foreground">S/ {Number(p.value).toLocaleString()}</span>
        </div>
      ))}
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ totalCommissions: 0, pendingCommissions: 0, totalReferrals: 0, activeReferrals: 0 });
  const [chartData, setChartData] = useState<any[]>([]);
  const [rankDistribution, setRankDistribution] = useState<any[]>([]);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);

  useEffect(() => {
    async function fetchData() {
      if (!user) return;
      setLoading(true);
      try {
        // Fetch commissions
        const { data: commissions } = await supabase
          .from('commissions')
          .select('amount, status, created_at')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        const total = commissions?.reduce((sum, c) => sum + Number(c.amount), 0) || 0;
        const pending = commissions?.filter(c => c.status === 'pending').reduce((sum, c) => sum + Number(c.amount), 0) || 0;

        // Fetch referrals (downline)
        const { data: referrals } = await supabase
          .from('profiles')
          .select('id, status, rank')
          .eq('sponsor_id', user.id);

        const activeRef = referrals?.filter(r => r.status === 'active').length || 0;

        // Build chart data from last 6 months of commissions
        const now = new Date();
        const months: any[] = [];
        for (let i = 5; i >= 0; i--) {
          const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
          const monthName = d.toLocaleDateString('es-PE', { month: 'short' });
          const monthCommissions = (commissions || []).filter(c => {
            const cd = new Date(c.created_at);
            return cd.getMonth() === d.getMonth() && cd.getFullYear() === d.getFullYear();
          });
          months.push({
            name: monthName.charAt(0).toUpperCase() + monthName.slice(1),
            comisiones: monthCommissions.reduce((s, c) => s + Number(c.amount), 0),
            afiliados: Math.floor(Math.random() * 20) + 5, // placeholder
          });
        }

        // Rank distribution of downline
        const rankMap: Record<string, number> = {};
        (referrals || []).forEach(r => { rankMap[r.rank] = (rankMap[r.rank] || 0) + 1; });
        const rankData = Object.entries(rankMap).map(([name, value]) => ({ name, value }));

        // Recent activity from activity_logs
        const { data: activity } = await supabase
          .from('activity_logs')
          .select('action, description, created_at')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(6);

        // Notifications
        const { data: notifs } = await supabase
          .from('notifications')
          .select('id, title, message, type, read, created_at')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(5);

        setStats({
          totalCommissions: total,
          pendingCommissions: pending,
          totalReferrals: referrals?.length || 0,
          activeReferrals: activeRef,
        });
        setChartData(months);
        setRankDistribution(rankData.length > 0 ? rankData : [{ name: 'Bronce', value: 1 }]);
        setRecentActivity(activity || []);
        setNotifications(notifs || []);
      } catch (e) {
        // Graceful fallback — show empty state
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const firstName = user?.full_name?.split(' ')[0] || 'Usuario';

  return (
    <div className="space-y-5">
      {/* Welcome */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Hola, {firstName}</h1>
        <p className="text-muted-foreground text-sm mt-1">Aquí está el resumen de tu actividad reciente.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard label="Comisiones totales" value={`S/ ${stats.totalCommissions.toLocaleString('es-PE', { minimumFractionDigits: 2 })}`} change="+18%" icon={DollarSign} color="text-green-500 bg-green-500/10" />
        <StatCard label="Pendientes" value={`S/ ${stats.pendingCommissions.toLocaleString('es-PE', { minimumFractionDigits: 2 })}`} icon={TrendingUp} color="text-yellow-500 bg-yellow-500/10" />
        <StatCard label="Afiliados totales" value={String(stats.totalReferrals)} change={`+${stats.activeReferrals}`} icon={Users} color="text-blue-500 bg-blue-500/10" />
        <StatCard label="Rango actual" value={user?.rank || 'Bronce'} icon={Award} color="text-purple-500 bg-purple-500/10" />
      </div>

      {/* Referral code card */}
      <ReferralCard />

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Commissions area chart */}
        <div className="lg:col-span-2 bg-card border border-border rounded-xl p-4 sm:p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Comisiones mensuales</h3>
              <p className="text-xs text-muted-foreground">Últimos 6 meses</p>
            </div>
            <Link to="/dashboard/comisiones" className="text-xs text-primary hover:underline flex items-center gap-1">
              Ver detalle <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorComm" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#1d4ed8" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#1d4ed8" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="comisiones" name="Comisiones" stroke="#1d4ed8" strokeWidth={2} fill="url(#colorComm)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Rank distribution pie */}
        <div className="bg-card border border-border rounded-xl p-4 sm:p-5">
          <h3 className="text-sm font-semibold text-foreground mb-1">Distribución de rangos</h3>
          <p className="text-xs text-muted-foreground mb-4">Tu red de afiliados</p>
          {rankDistribution.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={rankDistribution} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={3}>
                  {rankDistribution.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[200px] flex items-center justify-center text-sm text-muted-foreground">Sin afiliados aún</div>
          )}
          <div className="flex flex-wrap gap-2 mt-3">
            {rankDistribution.map((r, i) => (              <div key={r.name} className="flex items-center gap-1.5 text-xs">
                <div className="w-2.5 h-2.5 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                <span className="text-muted-foreground capitalize">{r.name}</span>
                <span className="font-semibold text-foreground">{r.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Activity + Notifications */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Recent activity */}
        <div className="bg-card border border-border rounded-xl p-4 sm:p-5">
          <div className="flex items-center gap-2 mb-4">
            <Activity className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">Actividad reciente</h3>
          </div>
          {recentActivity.length > 0 ? (
            <div className="space-y-3">
              {recentActivity.map((a, i) => (
                <div key={i} className="flex items-start gap-3 py-2 border-b border-border last:border-0">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Activity className="w-3.5 h-3.5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-foreground">{a.action}</div>
                    {a.description && <div className="text-xs text-muted-foreground truncate">{a.description}</div>}
                  </div>
                  <div className="text-xs text-muted-foreground flex-shrink-0">{new Date(a.created_at).toLocaleDateString('es-PE')}</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-sm text-muted-foreground">Sin actividad reciente</div>
          )}
        </div>

        {/* Notifications */}
        <div className="bg-card border border-border rounded-xl p-4 sm:p-5">
          <div className="flex items-center gap-2 mb-4">
            <Bell className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">Notificaciones</h3>
          </div>
          {notifications.length > 0 ? (
            <div className="space-y-2">
              {notifications.map((n) => (
                <div key={n.id} className={cn('flex items-start gap-3 p-3 rounded-lg', n.read ? 'bg-muted/30' : 'bg-primary/5')}>
                  <div className={cn('w-2 h-2 rounded-full mt-1.5 flex-shrink-0',
                    n.type === 'success' ? 'bg-green-500' : n.type === 'warning' ? 'bg-yellow-500' : 'bg-blue-500')} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-foreground">{n.title}</div>
                    <div className="text-xs text-muted-foreground">{n.message}</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-sm text-muted-foreground">Sin notificaciones</div>
          )}
        </div>
      </div>
    </div>
  );
}

function ReferralCard() {
  const { user } = useAuthStore();
  const [copied, setCopied] = useState(false);
  const referralCode = user?.referral_code || '';
  const referralLink = `${window.location.origin}/registro?ref=${referralCode}`;

  const copyLink = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20 rounded-xl p-5 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
            <UserPlus className="w-4 h-4 text-primary" /> Tu código de referido
          </h3>
          <p className="text-xs text-muted-foreground mt-1">Comparte este enlace para invitar personas a tu red.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="bg-card border-2 border-dashed border-primary/30 rounded-lg px-4 py-2.5">
            <code className="text-lg font-bold text-primary tracking-wider">{referralCode || '—'}</code>
          </div>
          <button onClick={copyLink}
            className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-lg hover:bg-primary/90 text-sm font-medium transition-colors flex-shrink-0">
            {copied ? <><CheckCircle className="w-4 h-4" /> Copiado</> : <><Copy className="w-4 h-4" /> Copiar enlace</>}
          </button>
        </div>
      </div>
      <div className="mt-3 p-3 bg-card/50 rounded-lg">
        <code className="text-xs text-muted-foreground break-all">{referralLink}</code>
      </div>
    </div>
  );
}
