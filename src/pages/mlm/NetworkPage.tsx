import {
  useState, useRef, useEffect, useMemo, WheelEvent,
  PointerEvent as RPointerEvent, TouchEvent as RTouchEvent,
} from 'react';
import { useAuthStore } from '@/store/authStore';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { Users, UserPlus, RefreshCw, ZoomIn, ZoomOut, Maximize2, List, Network, Search, X, Loader as Loader2, Copy, CircleCheck as CheckCircle, Link2, Medal, Award, Gem, Disc, Crown, ChevronRight, Move, CreditCard as Edit2, Trash2, Eye, Send, Mail, UserCheck, TrendingDown, TriangleAlert as AlertTriangle, Star, Plus } from 'lucide-react';
import { useNetwork, type Profile } from '@/modules/mlm';
import { Skeleton } from '@/components/ui/skeleton';

// ─── Types ────────────────────────────────────────────────────────────────────
interface NetProfile extends Profile {
  children?: NetProfile[];
  depth?: number;
  subtreeSize?: number;
}

type ViewMode = 'tree' | 'list';
type AddMode = 'new' | 'existing' | 'invite';

// ─── Rank config ─────────────────────────────────────────────────────────────
const RANKS: Record<string, { label: string; color: string; bg: string; ring: string; Icon: React.FC<any> }> = {
  bronze:   { label: 'Bronce',   color: '#b45309', bg: '#451a03', ring: '#b45309', Icon: Medal },
  silver:   { label: 'Plata',    color: '#64748b', bg: '#1e293b', ring: '#64748b', Icon: Medal },
  gold:     { label: 'Oro',      color: '#ca8a04', bg: '#422006', ring: '#ca8a04', Icon: Award },
  platinum: { label: 'Platino',  color: '#94a3b8', bg: '#1e293b', ring: '#94a3b8', Icon: Disc  },
  diamond:  { label: 'Diamante', color: '#22d3ee', bg: '#083344', ring: '#22d3ee', Icon: Gem   },
  crown:    { label: 'Corona',   color: '#f59e0b', bg: '#451a03', ring: '#f59e0b', Icon: Crown },
};

const PLAN_COLORS: Record<string, string> = {
  free:   '#6b7280',
  inicio: '#3b82f6',
  pro:    '#8b5cf6',
  elite:  '#f59e0b',
};

// ─── Tree build / layout ──────────────────────────────────────────────────────
const NODE_W   = 148;
const NODE_H   = 88;
const H_GAP    = 32;
const V_GAP    = 72;

function buildTree(profiles: Profile[], rootId: string): NetProfile {
  const map = new Map<string, NetProfile>();
  profiles.forEach(p => map.set(p.id, { ...p, children: [], depth: 0, subtreeSize: 1 }));

  profiles.forEach(p => {
    if (p.sponsor_id && p.id !== rootId) {
      const parent = map.get(p.sponsor_id);
      const child  = map.get(p.id);
      if (parent && child) parent.children!.push(child);
    }
  });

  function annotate(node: NetProfile, d: number, seen: Set<string> = new Set()): number {
    if (seen.has(node.id)) return 0;
    seen.add(node.id);
    node.depth = d;
    node.subtreeSize = 1 + (node.children || []).reduce((s, c) => s + annotate(c, d + 1, seen), 0);
    return node.subtreeSize;
  }
  const root = map.get(rootId) || {
    ...profiles[0] || { id: rootId, username: '?', full_name: 'Raíz', email: '', role: 'user' as const,
      status: 'active' as const, rank: 'bronze' as const, plan: 'free', created_at: '', updated_at: '' },
    children: [],
    depth: 0,
    subtreeSize: 1,
  };
  annotate(root, 0);
  return root;
}

interface Pos { x: number; y: number }
const nodePositions = new Map<string, Pos>();

function layout(node: NetProfile, depth = 0, xOffset = 0): number {
  const y = depth * (NODE_H + V_GAP);
  const children = node.children || [];

  if (children.length === 0) {
    nodePositions.set(node.id, { x: xOffset + NODE_W / 2, y });
    return NODE_W;
  }

  let totalW = 0;
  children.forEach((child, i) => {
    const w = layout(child, depth + 1, xOffset + totalW + (i > 0 ? H_GAP : 0));
    totalW += w + (i > 0 ? H_GAP : 0);
  });
  nodePositions.set(node.id, { x: xOffset + totalW / 2, y });
  return totalW;
}

function collectNodes(node: NetProfile): NetProfile[] {
  return [node, ...(node.children || []).flatMap(collectNodes)];
}

function collectEdges(node: NetProfile): Array<{ from: string; to: string; pos: NetProfile }> {
  const edges: Array<{ from: string; to: string; pos: NetProfile }> = [];
  (node.children || []).forEach(c => {
    edges.push({ from: node.id, to: c.id, pos: c });
    edges.push(...collectEdges(c));
  });
  return edges;
}

function flatList(node: NetProfile, depth = 0): Array<NetProfile & { depth: number }> {
  return [{ ...node, depth }, ...(node.children || []).flatMap(c => flatList(c, depth + 1))];
}

function countTree(node: NetProfile): number {
  return node.subtreeSize || 1;
}

// ─── Initials avatar ──────────────────────────────────────────────────────────
function Avatar({
  p, size = 40, className = '',
}: { p: { full_name?: string; username?: string; avatar_url?: string; rank?: string }; size?: number; className?: string }) {
  const name   = p.full_name || p.username || '?';
  const initials = name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
  const rc = RANKS[p.rank || 'bronze'] || RANKS.bronze;

  if (p.avatar_url) {
    return (
      <img
        src={p.avatar_url}
        alt={name}
        style={{ width: size, height: size }}
        className={cn('rounded-full object-cover flex-shrink-0', className)}
      />
    );
  }
  return (
    <div
      style={{ width: size, height: size, background: rc.bg + '33', border: `2px solid ${rc.ring}33` }}
      className={cn('rounded-full flex items-center justify-center flex-shrink-0 font-bold text-foreground', className)}
    >
      <span style={{ fontSize: size * 0.35 }}>{initials}</span>
    </div>
  );
}

// ─── SVG Tree ─────────────────────────────────────────────────────────────────
function TreeCanvas({
  root, selfId, onNodeClick,
}: {
  root: NetProfile;
  selfId: string;
  onNodeClick: (n: NetProfile) => void;
}) {
  nodePositions.clear();
  layout(root);

  const allNodes = collectNodes(root);
  const allEdges = collectEdges(root);

  const xs    = allNodes.map(n => nodePositions.get(n.id)?.x || 0);
  const ys    = allNodes.map(n => nodePositions.get(n.id)?.y || 0);
  const minX  = Math.min(...xs) - NODE_W / 2;
  const maxX  = Math.max(...xs) + NODE_W / 2;
  const minY  = Math.min(...ys);
  const maxY  = Math.max(...ys) + NODE_H;
  const PAD   = 40;
  const W     = maxX - minX + PAD * 2;
  const H     = maxY - minY + PAD * 2;
  const ox    = -minX + PAD;
  const oy    = -minY + PAD;

  return (
    <svg width={W} height={H} style={{ display: 'block', minWidth: W }}>
      <defs>
        <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="2" stdDeviation="4" floodColor="rgba(0,0,0,0.18)" />
        </filter>
        <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="0" stdDeviation="6" floodColor="rgba(99,102,241,0.45)" />
        </filter>
      </defs>

      {allEdges.map(({ from, to }) => {
        const p1 = nodePositions.get(from);
        const p2 = nodePositions.get(to);
        if (!p1 || !p2) return null;
        const x1 = p1.x + ox;
        const y1 = p1.y + NODE_H + oy;
        const x2 = p2.x + ox;
        const y2 = p2.y + oy;
        const my = (y1 + y2) / 2;
        return (
          <path
            key={`${from}-${to}`}
            d={`M ${x1} ${y1} C ${x1} ${my}, ${x2} ${my}, ${x2} ${y2}`}
            fill="none"
            stroke="hsl(var(--border))"
            strokeWidth={1.5}
            opacity={0.6}
          />
        );
      })}

      {allNodes.map(node => {
        const pos = nodePositions.get(node.id);
        if (!pos) return null;
        const nx    = pos.x + ox - NODE_W / 2;
        const ny    = pos.y + oy;
        const rc    = RANKS[node.rank || 'bronze'] || RANKS.bronze;
        const isSelf = node.id === selfId;
        const plan  = node.plan || 'free';
        const planColor = PLAN_COLORS[plan] || PLAN_COLORS.free;
        const initials  = ((node.full_name || node.username || '?').split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase());

        return (
          <g
            key={node.id}
            transform={`translate(${nx}, ${ny})`}
            onClick={() => onNodeClick(node)}
            style={{ cursor: 'pointer' }}
            role="button"
            aria-label={node.full_name || node.username}
          >
            <rect
              x={0} y={0} width={NODE_W} height={NODE_H} rx={14}
              fill={isSelf ? rc.color + '12' : 'hsl(var(--card))'}
              stroke={isSelf ? rc.color : rc.color + '55'}
              strokeWidth={isSelf ? 2.5 : 1.5}
              filter={isSelf ? 'url(#glow)' : 'url(#shadow)'}
            />

            <clipPath id={`clip-${node.id}`}>
              <circle cx={28} cy={NODE_H / 2} r={20} />
            </clipPath>
            {node.avatar_url ? (
              <>
                <circle cx={28} cy={NODE_H / 2} r={21}
                  fill="none"
                  stroke={rc.color}
                  strokeWidth={2}
                />
                <image
                  href={node.avatar_url}
                  x={8} y={NODE_H / 2 - 20}
                  width={40} height={40}
                  clipPath={`url(#clip-${node.id})`}
                  preserveAspectRatio="xMidYMid slice"
                />
              </>
            ) : (
              <>
                <circle cx={28} cy={NODE_H / 2} r={21}
                  fill={rc.color + '20'}
                  stroke={rc.color}
                  strokeWidth={2}
                />
                <text x={28} y={NODE_H / 2 + 6} textAnchor="middle"
                  fontSize={15} fontWeight="800"
                  fill={rc.color}
                  style={{ pointerEvents: 'none' }}
                >
                  {initials}
                </text>
              </>
            )}

            <text x={60} y={28} fontSize={12} fontWeight="700"
              fill="hsl(var(--foreground))"
              style={{ pointerEvents: 'none' }}
            >
              {(node.full_name || node.username || 'Sin nombre').split(' ')[0].slice(0, 11)}
            </text>

            <text x={60} y={43} fontSize={10} fontWeight="600"
              fill={rc.color}
              style={{ pointerEvents: 'none' }}
            >
              {rc.label}
            </text>

            <rect x={60} y={50} width={50} height={14} rx={7}
              fill={planColor + '1a'}
            />
            <text x={85} y={61} textAnchor="middle" fontSize={8.5} fontWeight="700"
              fill={planColor}
              style={{ pointerEvents: 'none' }}
            >
              {plan.toUpperCase().slice(0, 7)}
            </text>

            {(node.children || []).length > 0 && (
              <g transform={`translate(${NODE_W - 20}, 4)`}>
                <circle cx={8} cy={8} r={9}
                  fill={rc.color + '25'}
                  stroke={rc.color + '66'}
                  strokeWidth={1}
                />
                <text x={8} y={12} textAnchor="middle" fontSize={9} fontWeight="800"
                  fill={rc.color}
                  style={{ pointerEvents: 'none' }}
                >
                  {(node.children || []).length}
                </text>
              </g>
            )}

            {isSelf && (
              <g transform={`translate(${NODE_W / 2 - 16}, -13)`}>
                <rect x={0} y={0} width={32} height={15} rx={7.5}
                  fill={rc.color}
                />
                <text x={16} y={11} textAnchor="middle" fontSize={8} fontWeight="900"
                  fill="white" style={{ pointerEvents: 'none' }}
                >TÚ</text>
              </g>
            )}

            <circle cx={NODE_W - 7} cy={NODE_H - 7} r={4.5}
              fill={node.status === 'active' ? '#22c55e' : node.status === 'suspended' ? '#ef4444' : '#f59e0b'}
              stroke="hsl(var(--card))"
              strokeWidth={1.5}
            />

            {node.binary_position && (
              <g transform={`translate(7, ${NODE_H - 17})`}>
                <rect x={0} y={0} width={30} height={12} rx={6}
                  fill={node.binary_position === 'left' ? '#3b82f618' : '#f9731618'}
                  stroke={node.binary_position === 'left' ? '#3b82f644' : '#f9731644'}
                  strokeWidth={1}
                />
                <text x={15} y={9} textAnchor="middle" fontSize={7.5} fontWeight="700"
                  fill={node.binary_position === 'left' ? '#3b82f6' : '#f97316'}
                  style={{ pointerEvents: 'none' }}
                >
                  {node.binary_position === 'left' ? 'IZQ' : 'DER'}
                </text>
              </g>
            )}
          </g>
        );
      })}
    </svg>
  );
}

// ─── Stats Bar ────────────────────────────────────────────────────────────────
function StatsBar({ tree }: { tree: NetProfile | null; profiles?: Profile[] }) {
  const all   = tree ? flatList(tree) : [];
  const total = all.length;
  const activos = all.filter(n => n.status === 'active').length;
  const directos = (tree?.children || []).length;
  const profundidad = all.reduce((m, n) => Math.max(m, n.depth || 0), 0);
  const byRank: Record<string, number> = {};
  all.forEach(n => { const r = n.rank || 'bronze'; byRank[r] = (byRank[r] || 0) + 1; });

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {[
        { label: 'Total en red', value: total, icon: Users, color: 'from-primary/20 to-primary/10', iconColor: 'text-primary' },
        { label: 'Activos',       value: activos, icon: UserCheck, color: 'from-green-500/20 to-green-600/10', iconColor: 'text-green-500' },
        { label: 'Directos',      value: directos, icon: Star, color: 'from-yellow-500/20 to-yellow-600/10', iconColor: 'text-yellow-500' },
        { label: 'Profundidad',   value: profundidad + 1, icon: TrendingDown, color: 'from-purple-500/20 to-purple-600/10', iconColor: 'text-purple-500' },
      ].map(s => (
        <div key={s.label} className={cn('relative bg-gradient-to-br rounded-xl p-4 border border-border overflow-hidden', s.color)}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">{s.label}</p>
              <p className="text-2xl font-bold text-foreground leading-none">{s.value}</p>
            </div>
            <div className={cn('w-10 h-10 rounded-xl bg-background/60 flex items-center justify-center', s.iconColor)}>
              <s.icon className="w-5 h-5" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Add Member Modal ─────────────────────────────────────────────────────────
function AddMemberModal({
  sponsorId,
  sponsorName,
  allProfiles,
  allowAssignExisting,
  onClose,
  onAdded,
  onAddReferral,
  onAssignExisting,
}: {
  sponsorId: string;
  sponsorName: string;
  allProfiles: Profile[];
  allowAssignExisting: boolean;
  onClose: () => void;
  onAdded: () => void;
  onAddReferral: (params: { sponsorId: string; fullName: string; email: string; username?: string; position?: 'left' | 'right' }) => Promise<{ success: boolean; error?: string }>;
  onAssignExisting: (params: { userId: string; sponsorId: string; position: 'left' | 'right' }) => Promise<{ success: boolean; error?: string }>;
}) {
  const { user } = useAuthStore();
  const [mode, setMode] = useState<AddMode>('new');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied]   = useState(false);
  const [form, setForm] = useState({ full_name: '', email: '', username: '', position: 'left' as 'left' | 'right' });
  const [existingQ, setExistingQ]  = useState('');
  const [existingId, setExistingId] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');

  const myCode = user?.referral_code || '';
  const inviteLink = myCode ? `${window.location.origin}/registro?ref=${myCode}` : '';

  useEffect(() => {
    if (mode !== 'new' || !form.full_name) return;
    const auto = form.full_name.toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '').slice(0, 24);
    setForm(p => ({ ...p, username: auto }));
  }, [form.full_name, mode]);

  const copyLink = async () => {
    if (!inviteLink) return;
    await navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
    toast.success('Enlace copiado');
  };

  const filteredExisting = useMemo(() => {
    const q = existingQ.toLowerCase();
    return allProfiles
      .filter(p => p.id !== sponsorId && !p.sponsor_id)
      .filter(p => !q || `${p.full_name || ''} ${p.username || ''} ${p.email || ''}`.toLowerCase().includes(q))
      .slice(0, 15);
  }, [allProfiles, sponsorId, existingQ]);

  const handleAddNew = async () => {
    if (!form.full_name.trim() || !form.email.trim()) { toast.error('Completa nombre y correo'); return; }
    setLoading(true);
    const result = await onAddReferral({
      sponsorId,
      fullName: form.full_name.trim(),
      email: form.email.trim().toLowerCase(),
      username: form.username || form.full_name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, ''),
      position: form.position,
    });
    if (result.success) {
      toast.success(`${form.full_name} agregado a la red. Contraseña: Temp123456!`);
      onAdded(); onClose();
    } else {
      toast.error(result.error || 'Error al crear el afiliado');
    }
    setLoading(false);
  };

  const handleAssignExisting = async () => {
    if (!existingId) { toast.error('Selecciona un usuario'); return; }
    setLoading(true);
    const result = await onAssignExisting({
      userId: existingId,
      sponsorId,
      position: form.position,
    });
    if (result.success) {
      toast.success('Usuario asignado a la red');
      onAdded(); onClose();
    } else {
      toast.error(result.error || 'Error al asignar el usuario');
    }
    setLoading(false);
  };

  const handleSendInvite = async () => {
    if (!inviteEmail.trim()) { toast.error('Ingresa un correo'); return; }
    setLoading(true);
    toast.success(`Invitación registrada para ${inviteEmail}. Comparte el enlace manualmente.`);
    setLoading(false);
    onClose();
  };

  const tabs: { id: AddMode; label: string; icon: React.FC<any> }[] = [
    { id: 'new',      label: 'Crear nuevo',   icon: UserPlus  },
    ...(allowAssignExisting ? [{ id: 'existing' as AddMode, label: 'Asignar existente', icon: UserCheck }] : []),
    { id: 'invite',   label: 'Invitar',        icon: Mail      },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-card border border-border rounded-t-3xl sm:rounded-xl w-full sm:max-w-lg shadow-2xl flex flex-col max-h-[90vh] z-10">

        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className="w-10 h-1 bg-muted-foreground/30 rounded-full" />
        </div>

        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div>
            <h3 className="text-base font-bold text-foreground">Agregar afiliado</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Patrocinador: <span className="text-foreground font-medium">{sponsorName}</span>
            </p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-xl bg-muted hover:bg-muted/80 flex items-center justify-center transition-colors">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        <div className="flex border-b border-border bg-muted/40 overflow-x-auto">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setMode(t.id)}
              className={cn(
                'flex-1 min-w-0 flex items-center justify-center gap-1.5 py-3 text-xs font-semibold transition-all whitespace-nowrap px-2',
                mode === t.id
                  ? 'border-b-2 border-primary text-primary bg-card'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <t.icon className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="hidden xs:block">{t.label}</span>
            </button>
          ))}
        </div>

        <div className="overflow-y-auto flex-1 p-5">

          {mode === 'new' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5">Nombre completo *</label>
                <input
                  value={form.full_name}
                  onChange={e => setForm(p => ({ ...p, full_name: e.target.value }))}
                  placeholder="Juan Pérez García"
                  className="w-full px-4 py-3 bg-muted border border-border rounded-xl text-sm text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-all"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5">Usuario</label>
                  <input
                    value={form.username}
                    onChange={e => setForm(p => ({ ...p, username: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '') }))}
                    placeholder="juan_perez"
                    className="w-full px-4 py-3 bg-muted border border-border rounded-xl text-sm font-mono text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5">Posición *</label>
                  <div className="flex gap-2 h-full">
                    {[{ v: 'left', label: 'Izq', color: 'blue' }, { v: 'right', label: 'Der', color: 'orange' }].map(pos => (
                      <button
                        key={pos.v}
                        onClick={() => setForm(p => ({ ...p, position: pos.v as 'left' | 'right' }))}
                        className={cn(
                          'flex-1 py-3 rounded-xl text-xs font-bold border-2 transition-all',
                          form.position === pos.v
                            ? pos.color === 'blue'
                              ? 'border-primary bg-primary/15 text-primary'
                              : 'border-orange-500 bg-orange-500/15 text-orange-600 dark:text-orange-400'
                            : 'border-border text-muted-foreground hover:border-muted-foreground/50',
                        )}
                      >
                        {pos.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5">Correo electrónico *</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                  placeholder="juan@ejemplo.com"
                  className="w-full px-4 py-3 bg-muted border border-border rounded-xl text-sm text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-all"
                />
              </div>
              <div className="flex items-start gap-2.5 bg-amber-500/8 border border-amber-500/20 rounded-xl p-3">
                <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-amber-700 dark:text-amber-400">
                  El afiliado recibirá la contraseña temporal <strong>Temp123456!</strong> — debe cambiarla al iniciar sesión.
                </p>
              </div>
              <button
                onClick={handleAddNew}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground py-3.5 rounded-xl text-sm font-bold hover:bg-primary/90 active:scale-[0.98] transition-all disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                Crear afiliado
              </button>
            </div>
          )}

          {mode === 'existing' && (
            <div className="space-y-4">
              <div className="bg-primary/8 border border-primary/20 rounded-xl p-3">
                <p className="text-xs text-primary">
                  Usuarios ya registrados sin patrocinador asignado. Asígnalos a la red de <strong>{sponsorName}</strong>.
                </p>
              </div>

              {existingId ? (
                <div className="flex items-center gap-3 bg-green-500/8 border border-green-500/20 rounded-xl p-3">
                  <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground">
                      {allProfiles.find(p => p.id === existingId)?.full_name || 'Usuario seleccionado'}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {allProfiles.find(p => p.id === existingId)?.email}
                    </p>
                  </div>
                  <button onClick={() => setExistingId('')} className="text-muted-foreground hover:text-red-500 transition-colors">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      value={existingQ}
                      onChange={e => setExistingQ(e.target.value)}
                      placeholder="Buscar por nombre o correo..."
                      className="w-full pl-9 pr-4 py-3 bg-muted border border-border rounded-xl text-sm text-foreground outline-none focus:border-primary transition-colors"
                    />
                  </div>
                  <div className="border border-border rounded-xl overflow-hidden max-h-52 overflow-y-auto divide-y divide-border">
                    {filteredExisting.length === 0 && (
                      <div className="px-4 py-6 text-center text-sm text-muted-foreground">
                        No hay usuarios disponibles para asignar
                      </div>
                    )}
                    {filteredExisting.map(p => (
                      <button
                        key={p.id}
                        onClick={() => { setExistingId(p.id); setExistingQ(''); }}
                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted text-left transition-colors"
                      >
                        <Avatar p={p} size={32} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{p.full_name || p.username}</p>
                          <p className="text-xs text-muted-foreground truncate">{p.email}</p>
                        </div>
                        <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-full',
                          RANKS[p.rank || 'bronze'] ? 'bg-muted' : 'bg-muted',
                        )} style={{ color: RANKS[p.rank || 'bronze']?.color || '#888' }}>
                          {RANKS[p.rank || 'bronze']?.label || p.rank}
                        </span>
                      </button>
                    ))}
                  </div>
                </>
              )}

              <div>
                <label className="block text-xs font-semibold text-foreground mb-2">Posición en el árbol</label>
                <div className="grid grid-cols-2 gap-2">
                  {[{ v: 'left', label: 'Izquierda', color: 'blue' }, { v: 'right', label: 'Derecha', color: 'orange' }].map(pos => (
                    <button
                      key={pos.v}
                      onClick={() => setForm(p => ({ ...p, position: pos.v as 'left' | 'right' }))}
                      className={cn(
                        'py-3 rounded-xl text-sm font-bold border-2 transition-all',
                        form.position === pos.v
                          ? pos.color === 'blue'
                            ? 'border-primary bg-primary/15 text-primary'
                            : 'border-orange-500 bg-orange-500/15 text-orange-600 dark:text-orange-400'
                          : 'border-border text-muted-foreground',
                      )}
                    >
                      {pos.label}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={handleAssignExisting}
                disabled={loading || !existingId}
                className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground py-3.5 rounded-xl text-sm font-bold hover:bg-primary/90 transition-all disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserCheck className="w-4 h-4" />}
                Asignar a la red
              </button>
            </div>
          )}

          {mode === 'invite' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-foreground mb-2 flex items-center gap-1.5">
                  <Link2 className="w-3.5 h-3.5 text-primary" /> Tu enlace de referido
                </label>
                {inviteLink ? (
                  <div className="bg-muted border border-border rounded-xl p-3 mb-2">
                    <p className="text-[11px] text-foreground break-all font-mono leading-relaxed">{inviteLink}</p>
                  </div>
                ) : (
                  <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-3 mb-2">
                    <p className="text-xs text-yellow-700 dark:text-yellow-400">No tienes código de referido aún. Contacta al administrador.</p>
                  </div>
                )}
                {inviteLink && (
                  <button
                    onClick={copyLink}
                    className={cn(
                      'w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-all',
                      copied
                        ? 'bg-green-500/15 text-green-600 border-2 border-green-500'
                        : 'bg-primary text-primary-foreground hover:bg-primary/90',
                    )}
                  >
                    {copied ? <><CheckCircle className="w-4 h-4" /> Copiado!</> : <><Copy className="w-4 h-4" /> Copiar enlace</>}
                  </button>
                )}
              </div>

              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-border" />
                <span className="text-xs text-muted-foreground">o enviar por correo</span>
                <div className="flex-1 h-px bg-border" />
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5">Correo del invitado</label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={e => setInviteEmail(e.target.value)}
                  placeholder="amigo@ejemplo.com"
                  className="w-full px-4 py-3 bg-muted border border-border rounded-xl text-sm text-foreground outline-none focus:border-primary transition-colors"
                />
              </div>
              <button
                onClick={handleSendInvite}
                disabled={loading || !inviteEmail.trim()}
                className="w-full flex items-center justify-center gap-2 border-2 border-border hover:bg-muted text-foreground py-3 rounded-xl text-sm font-semibold transition-all disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                Registrar invitación
              </button>
              <p className="text-xs text-muted-foreground text-center">
                Al registrarse con tu enlace aparecerá automáticamente en tu árbol.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Node Detail Drawer ───────────────────────────────────────────────────────
function NodeDrawer({
  node, allProfiles, isAdmin, onClose, onRefresh, onAddChild,
  onUpdateProfile, onUnlink, onMoveUser,
}: {
  node: NetProfile;
  allProfiles: Profile[];
  isAdmin: boolean;
  onClose: () => void;
  onRefresh: () => void;
  onAddChild: (sponsorId: string, name: string) => void;
  onUpdateProfile: (userId: string, updates: Partial<Profile>) => Promise<{ success: boolean; error?: string }>;
  onUnlink: (userId: string) => Promise<{ success: boolean; error?: string }>;
  onMoveUser: (params: { userId: string; newSponsorId: string; position: 'left' | 'right' }) => Promise<{ success: boolean; error?: string }>;
}) {
  const { user } = useAuthStore();
  const [tab, setTab] = useState<'info' | 'edit' | 'move' | 'delete'>('info');
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [delConfirm, setDelConfirm] = useState(false);
  const [sponsorQ, setSponsorQ] = useState('');
  const [newSponsorId, setNewSponsorId] = useState('');
  const [movePos, setMovePos] = useState<'left' | 'right'>('left');
  const [form, setForm] = useState({
    full_name:       node.full_name || '',
    rank:            node.rank || 'bronze',
    plan:            node.plan || 'free',
    status:          node.status || 'active',
    binary_position: node.binary_position || 'left',
    referral_code:   node.referral_code || '',
    invite_link:     node.invite_link || '',
  });

  const isSelf       = user?.id === node.id;
  const inviteLink   = node.referral_code ? `${window.location.origin}/registro?ref=${node.referral_code}` : '';
  const rc           = RANKS[node.rank || 'bronze'] || RANKS.bronze;
  const sponsorProfile = allProfiles.find(p => p.id === node.sponsor_id);

  const copyLink = async () => {
    if (!inviteLink) return;
    await navigator.clipboard.writeText(inviteLink);
    setCopied(true); setTimeout(() => setCopied(false), 2000);
    toast.success('Enlace copiado');
  };

  const save = async () => {
    setSaving(true);
    const updates: Record<string, any> = {
      full_name:       form.full_name,
      rank:            form.rank,
      plan:            form.plan,
      status:          form.status,
      binary_position: form.binary_position,
    };
    if (isAdmin) {
      if (form.referral_code.trim()) updates.referral_code = form.referral_code.trim().toUpperCase();
      updates.invite_link = form.invite_link.trim() || null;
    }
    const result = await onUpdateProfile(node.id, updates);
    if (result.success) {
      toast.success('Perfil actualizado');
      onRefresh(); onClose();
    } else {
      toast.error(result.error || 'Error');
    }
    setSaving(false);
  };

  const move = async () => {
    if (!newSponsorId) { toast.error('Selecciona un patrocinador'); return; }
    setSaving(true);
    const result = await onMoveUser({
      userId: node.id,
      newSponsorId,
      position: movePos,
    });
    if (result.success) {
      toast.success('Usuario movido');
      onRefresh(); onClose();
    } else {
      toast.error(result.error || 'Error');
    }
    setSaving(false);
  };

  const remove = async () => {
    setSaving(true);
    const result = await onUnlink(node.id);
    if (result.success) {
      toast.success('Usuario desvinculado de la red');
      onRefresh(); onClose();
    } else {
      toast.error(result.error || 'Error');
    }
    setSaving(false);
  };

  const filteredCandidates = useMemo(() => {
    const q = sponsorQ.toLowerCase();
    return allProfiles
      .filter(p => p.id !== node.id)
      .filter(p => !q || `${p.full_name || ''} ${p.username || ''} ${p.email || ''}`.toLowerCase().includes(q))
      .slice(0, 20);
  }, [allProfiles, node.id, sponsorQ]);

  const tabs = [
    { id: 'info'  as const, label: 'Detalle',  icon: Eye   },
    ...(isAdmin || isSelf ? [{ id: 'edit' as const, label: 'Editar', icon: Edit2 }] : []),
    ...(isAdmin ? [{ id: 'move' as const, label: 'Reubicar', icon: Move }] : []),
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-card border border-border rounded-t-3xl sm:rounded-xl w-full sm:max-w-md shadow-2xl flex flex-col max-h-[90vh] z-10">

        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className="w-10 h-1 bg-muted-foreground/30 rounded-full" />
        </div>

        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="flex items-center gap-3">
            <Avatar p={node} size={44} />
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-foreground">{node.full_name || node.username || 'Sin nombre'}</h3>
                {isSelf && <span className="text-[10px] bg-primary/15 text-primary px-2 py-0.5 rounded-full font-bold">TÚ</span>}
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs font-semibold" style={{ color: rc.color }}>{rc.label}</span>
                <span className="text-xs text-muted-foreground">·</span>
                <span className="text-xs text-muted-foreground capitalize">{node.plan}</span>
                <span className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ background: node.status === 'active' ? '#22c55e' : node.status === 'suspended' ? '#ef4444' : '#f59e0b' }}
                />
              </div>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-xl bg-muted hover:bg-muted/80 flex items-center justify-center transition-colors">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        <div className="flex border-b border-border">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                'flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-semibold transition-all',
                tab === t.id ? 'border-b-2 border-primary text-primary' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <t.icon className="w-3.5 h-3.5" /> {t.label}
            </button>
          ))}
        </div>

        <div className="overflow-y-auto flex-1 p-5 space-y-3">
          {tab === 'info' && (
            <>
              {[
                ['Nombre',          node.full_name || '—'],
                ['Usuario',         node.username ? `@${node.username}` : '—'],
                ['Correo',          node.email || '—'],
                ['Rango',           rc.label],
                ['Plan',            node.plan || '—'],
                ['Estado',          node.status || '—'],
                ['Posición',        node.binary_position === 'left' ? 'Izquierda' : node.binary_position === 'right' ? 'Derecha' : '—'],
                ['Patrocinador',    sponsorProfile?.full_name || (node.sponsor_id ? '...' : 'Raíz de red')],
                ['Referidos dir.',  String((node.children || []).length)],
                ['Código referido', node.referral_code || '—'],
                ['En red desde',    node.created_at ? new Date(node.created_at).toLocaleDateString('es-PE') : '—'],
              ].map(([k, v]) => (
                <div key={k as string} className="flex items-center justify-between py-2.5 border-b border-border/40 last:border-0">
                  <span className="text-xs text-muted-foreground">{k as string}</span>
                  <span className="text-xs font-semibold text-foreground text-right max-w-[60%] truncate">{v as string}</span>
                </div>
              ))}
              {inviteLink && (
                <div className="pt-3 space-y-2">
                  <label className="block text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <Link2 className="w-3.5 h-3.5 text-primary" /> Enlace de invitación
                  </label>
                  <div className="bg-muted rounded-xl p-3 border border-border">
                    <code className="text-[11px] text-foreground break-all">{inviteLink}</code>
                  </div>
                  <button
                    onClick={copyLink}
                    className={cn(
                      'w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-semibold transition-all border',
                      copied ? 'bg-green-500/10 border-green-500 text-green-600' : 'border-border hover:bg-muted text-foreground',
                    )}
                  >
                    {copied ? <><CheckCircle className="w-3.5 h-3.5" /> Copiado</> : <><Copy className="w-3.5 h-3.5" /> Copiar enlace</>}
                  </button>
                </div>
              )}
            </>
          )}

          {tab === 'edit' && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5">Nombre completo</label>
                <input value={form.full_name} onChange={e => setForm(p => ({ ...p, full_name: e.target.value }))}
                  className="w-full px-4 py-3 bg-muted border border-border rounded-xl text-sm text-foreground outline-none focus:border-primary transition-colors" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5">Rango</label>
                  <select value={form.rank} onChange={e => setForm(p => ({ ...p, rank: e.target.value as typeof form.rank }))}
                    className="w-full px-3 py-3 bg-muted border border-border rounded-xl text-sm text-foreground outline-none focus:border-primary">
                    {Object.entries(RANKS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5">Estado</label>
                  <select value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value as typeof form.status }))}
                    className="w-full px-3 py-3 bg-muted border border-border rounded-xl text-sm text-foreground outline-none focus:border-primary">
                    {(['active','suspended','pending','inactive'] as const).map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              {isAdmin && (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1.5">
                      Código referido
                      <span className="ml-1 text-muted-foreground font-normal">(dejar vacío = sin cambio)</span>
                    </label>
                    <input
                      value={form.referral_code}
                      onChange={e => setForm(p => ({ ...p, referral_code: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '') }))}
                      placeholder="ABCD001"
                      className="w-full px-4 py-3 bg-muted border border-border rounded-xl text-sm font-mono text-foreground outline-none focus:border-primary transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1.5">
                      Enlace personalizado
                      <span className="ml-1 text-muted-foreground font-normal">(vacío = usa código)</span>
                    </label>
                    <input
                      value={form.invite_link}
                      onChange={e => setForm(p => ({ ...p, invite_link: e.target.value }))}
                      placeholder="ABCD001"
                      className="w-full px-4 py-3 bg-muted border border-border rounded-xl text-sm text-foreground outline-none focus:border-primary transition-colors"
                    />
                  </div>
                </>
              )}
            </div>
          )}

          {tab === 'move' && (
            <div className="space-y-3">
              <div className="bg-primary/8 border border-primary/20 rounded-xl p-3">
                <p className="text-xs text-primary">
                  Reubicar <strong>{node.full_name || node.username}</strong> bajo un nuevo patrocinador. Sus referidos se mueven con él.
                </p>
              </div>
              {newSponsorId ? (
                <div className="flex items-center gap-3 bg-primary/8 border border-primary/20 rounded-xl p-3">
                  <CheckCircle className="w-5 h-5 text-primary flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-foreground">{allProfiles.find(p => p.id === newSponsorId)?.full_name}</p>
                  </div>
                  <button onClick={() => { setNewSponsorId(''); setSponsorQ(''); }} className="text-muted-foreground hover:text-red-500">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input value={sponsorQ} onChange={e => setSponsorQ(e.target.value)}
                      placeholder="Buscar nuevo patrocinador..."
                      className="w-full pl-9 pr-4 py-3 bg-muted border border-border rounded-xl text-sm text-foreground outline-none focus:border-primary transition-colors" />
                  </div>
                  <div className="border border-border rounded-xl overflow-hidden max-h-44 overflow-y-auto divide-y divide-border">
                    {filteredCandidates.map(c => (
                      <button key={c.id} onClick={() => setNewSponsorId(c.id)}
                        className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-muted text-left transition-colors">
                        <Avatar p={c} size={28} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{c.full_name || c.username}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </>
              )}
              <div>
                <label className="block text-xs font-semibold text-foreground mb-2">Posición</label>
                <div className="grid grid-cols-2 gap-2">
                  {[{ v: 'left', label: 'Izquierda', color: 'blue' }, { v: 'right', label: 'Derecha', color: 'orange' }].map(pos => (
                    <button key={pos.v} onClick={() => setMovePos(pos.v as 'left' | 'right')}
                      className={cn('py-3 rounded-xl text-sm font-bold border-2 transition-all',
                        movePos === pos.v
                          ? pos.color === 'blue' ? 'border-primary bg-primary/15 text-primary' : 'border-orange-500 bg-orange-500/15 text-orange-600 dark:text-orange-400'
                          : 'border-border text-muted-foreground',
                      )}>
                      {pos.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="px-5 py-4 border-t border-border flex-shrink-0 space-y-2">
          {tab === 'info' && !delConfirm && (
            <div className="space-y-2">
              {isAdmin && (
                <button
                  onClick={() => { onClose(); onAddChild(node.id, node.full_name || node.username || 'este nodo'); }}
                  className="w-full flex items-center justify-center gap-2 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30 py-2.5 rounded-xl text-sm font-bold transition-colors"
                >
                  <UserPlus className="w-4 h-4" /> Agregar afiliado aquí
                </button>
              )}
              <div className="flex gap-2">
                {isAdmin && (
                  <button onClick={() => setDelConfirm(true)}
                    className="flex items-center justify-center gap-1.5 border border-red-500/30 text-red-500 hover:bg-red-500/10 px-4 py-2.5 rounded-xl text-xs font-semibold transition-colors flex-shrink-0">
                    <Trash2 className="w-3.5 h-3.5" /> Desvincular
                  </button>
                )}
                <button onClick={onClose} className="flex-1 border border-border rounded-xl py-2.5 text-sm font-semibold hover:bg-muted transition-colors text-muted-foreground">
                  Cerrar
                </button>
              </div>
            </div>
          )}
          {tab === 'info' && delConfirm && (
            <div className="space-y-2">
              <p className="text-xs text-center text-muted-foreground px-2">
                ¿Desvincular a <strong className="text-foreground">{node.full_name || node.username}</strong> de la red?
                Sus referidos quedarán también desvinculados.
              </p>
              <div className="flex gap-2">
                <button onClick={() => setDelConfirm(false)} className="flex-1 border border-border rounded-xl py-2.5 text-xs font-semibold hover:bg-muted transition-colors">
                  Cancelar
                </button>
                <button onClick={remove} disabled={saving}
                  className="flex-1 bg-red-600 text-white rounded-xl py-2.5 text-xs font-semibold hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5">
                  {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />} Desvincular
                </button>
              </div>
            </div>
          )}
          {tab === 'edit' && (
            <div className="flex gap-2">
              <button onClick={onClose} className="flex-1 border border-border rounded-xl py-2.5 text-sm font-semibold hover:bg-muted transition-colors text-muted-foreground">Cancelar</button>
              <button onClick={save} disabled={saving}
                className="flex-1 bg-primary text-primary-foreground rounded-xl py-2.5 text-sm font-bold hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Edit2 className="w-4 h-4" />} Guardar
              </button>
            </div>
          )}
          {tab === 'move' && (
            <div className="flex gap-2">
              <button onClick={onClose} className="flex-1 border border-border rounded-xl py-2.5 text-sm font-semibold hover:bg-muted transition-colors text-muted-foreground">Cancelar</button>
              <button onClick={move} disabled={saving || !newSponsorId}
                className="flex-1 bg-primary text-white rounded-xl py-2.5 text-sm font-bold hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Move className="w-4 h-4" />} Reubicar
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── List View ────────────────────────────────────────────────────────────────
function ListView({
  tree, onSelect,
}: { tree: NetProfile; onSelect: (n: NetProfile) => void }) {
  const [q, setQ] = useState('');
  const all = flatList(tree);
  const filtered = q
    ? all.filter(n =>
        `${n.full_name || ''} ${n.username || ''} ${n.email || ''}`.toLowerCase().includes(q.toLowerCase()),
      )
    : all;

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="Buscar por nombre, usuario o correo..."
          className="w-full pl-10 pr-4 py-3 bg-muted border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-all"
        />
        {q && <button onClick={() => setQ('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
          <X className="w-4 h-4" />
        </button>}
      </div>
      <p className="text-xs text-muted-foreground">{filtered.length} miembros{q ? ` para "${q}"` : ''}</p>
      <div className="space-y-2 max-h-[520px] overflow-y-auto pr-1">
        {filtered.map(node => {
          const rc = RANKS[node.rank || 'bronze'] || RANKS.bronze;
          return (
            <button
              key={node.id}
              onClick={() => onSelect(node)}
              className="w-full flex items-center gap-3 p-3.5 bg-card border border-border rounded-xl hover:border-primary/40 hover:shadow-md transition-all text-left group"
            >
              <div className="relative flex-shrink-0">
                <Avatar p={node} size={40} />
                <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-card"
                  style={{ background: node.status === 'active' ? '#22c55e' : '#ef4444' }}
                />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-bold text-foreground">{node.full_name || node.username || 'Sin nombre'}</span>
                  <span className="text-xs font-semibold" style={{ color: rc.color }}>{rc.label}</span>
                </div>
                <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground flex-wrap">
                  {node.username && <span className="font-mono">@{node.username}</span>}
                  <span>·</span>
                  <span>Nivel {node.depth || 0}</span>
                  <span>·</span>
                  <span>{(node.children || []).length} ref.</span>
                  {node.binary_position && (
                    <span className="font-semibold" style={{ color: node.binary_position === 'left' ? '#3b82f6' : '#f97316' }}>
                      {node.binary_position === 'left' ? 'IZQ' : 'DER'}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex flex-col items-end gap-1 flex-shrink-0">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                  style={{ background: (PLAN_COLORS[node.plan] || '#6b7280') + '22', color: PLAN_COLORS[node.plan] || '#6b7280' }}>
                  {(node.plan || 'free').toUpperCase()}
                </span>
                <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/40 group-hover:text-primary transition-colors" />
              </div>
            </button>
          );
        })}
        {filtered.length === 0 && (
          <div className="text-center py-16 text-muted-foreground">
            <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">No se encontraron resultados</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function NetworkPage() {
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'super_admin' || user?.role === 'admin';

  const [viewMode, setViewMode]   = useState<ViewMode>('tree');
  const [selected, setSelected]   = useState<NetProfile | null>(null);
  const [addModal, setAddModal]   = useState(false);
  const [addSponsorId, setAddSponsorId] = useState('');
  const [addSponsorName, setAddSponsorName] = useState('');
  const [viewAllNet, setViewAllNet] = useState(false);
  const [rankFilter, setRankFilter] = useState('all');
  const [zoom, setZoom]   = useState(0.9);
  const [pan, setPan]     = useState({ x: 40, y: 40 });
  const isDragging = useRef(false);
  const dragOrigin = useRef({ x: 0, y: 0, px: 0, py: 0 });
  const pinchDist  = useRef(0);
  const canvasRef  = useRef<HTMLDivElement>(null);

  const {
    profiles,
    loading,
    refresh,
    addReferral,
    assignExistingUser,
    moveUser,
    updateProfile,
    unlinkUser,
    allowAssignExisting,
  } = useNetwork({
    userId: user?.id || '',
    isAdmin,
    viewAllNetwork: viewAllNet,
    maxDepth: 6,
  });

  const currentRootId = useMemo(() => {
    if (isAdmin && viewAllNet) {
      const root = profiles.find(p => !p.sponsor_id) || profiles.find(p => p.id === user?.id) || profiles[0];
      return root?.id || user?.id || '';
    }
    return user?.id || '';
  }, [profiles, user?.id, isAdmin, viewAllNet]);

  useEffect(() => { setZoom(0.9); setPan({ x: 40, y: 40 }); }, [currentRootId, viewAllNet, viewMode]);

  const tree = useMemo(() => {
    if (!currentRootId || profiles.length === 0) return null;
    const raw = buildTree(profiles, currentRootId);
    if (rankFilter === 'all') return raw;
    function filterRank(n: NetProfile): NetProfile | null {
      const fc = (n.children || []).map(filterRank).filter(Boolean) as NetProfile[];
      if (n.rank === rankFilter || fc.length > 0) return { ...n, children: fc };
      return null;
    }
    return filterRank(raw);
  }, [profiles, currentRootId, rankFilter]);

  const onPtrDown = (e: RPointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    isDragging.current = true;
    dragOrigin.current = { x: e.clientX, y: e.clientY, px: pan.x, py: pan.y };
  };
  const onPtrMove = (e: RPointerEvent<HTMLDivElement>) => {
    if (!isDragging.current) return;
    setPan({
      x: dragOrigin.current.px + e.clientX - dragOrigin.current.x,
      y: dragOrigin.current.py + e.clientY - dragOrigin.current.y,
    });
  };
  const onPtrUp = () => { isDragging.current = false; };

  const onTouchMove = (e: RTouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 2) {
      const d = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY,
      );
      if (pinchDist.current > 0) {
        const delta = (d - pinchDist.current) * 0.008;
        setZoom(z => Math.min(3, Math.max(0.2, z + delta)));
      }
      pinchDist.current = d;
    }
  };
  const onTouchEnd = () => { pinchDist.current = 0; };

  const onWheel = (e: WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    setZoom(z => Math.min(3, Math.max(0.2, z - e.deltaY * 0.0012)));
  };

  const resetView = () => { setZoom(0.9); setPan({ x: 40, y: 40 }); };
  const openAdd = (sponsorId: string, name: string) => {
    setAddSponsorId(sponsorId);
    setAddSponsorName(name);
    setAddModal(true);
  };

  if (loading) {
    return (
      <div className="space-y-5">
        {/* Header skeleton */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1.5">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-9 w-24 rounded-xl" />
            <Skeleton className="h-9 w-24 rounded-xl" />
            <Skeleton className="h-9 w-9 rounded-xl" />
          </div>
        </div>

        {/* 4 stat cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
              <Skeleton className="w-10 h-10 rounded-xl flex-shrink-0" />
              <div className="space-y-1.5 flex-1">
                <Skeleton className="h-6 w-12" />
                <Skeleton className="h-3 w-20" />
              </div>
            </div>
          ))}
        </div>

        {/* Tree canvas skeleton – simplified node/edge representation */}
        <div className="bg-card border border-border rounded-xl overflow-hidden" style={{ height: 480 }}>
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <Skeleton className="h-4 w-32" />
            <div className="flex gap-1">
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-8 w-8 rounded-lg" />)}
            </div>
          </div>
          <div className="relative w-full" style={{ height: 432 }}>
            {/* Root node */}
            <div className="absolute" style={{ left: '50%', top: 40, transform: 'translateX(-50%)' }}>
              <Skeleton className="w-16 h-16 rounded-full" />
              <Skeleton className="h-3 w-24 mt-2 mx-auto" />
            </div>
            {/* Connector line down */}
            <div className="absolute" style={{ left: '50%', top: 112, width: 2, height: 40, transform: 'translateX(-50%)', background: 'hsl(var(--border))' }} />
            {/* Level-2 horizontal line */}
            <div className="absolute" style={{ left: '20%', top: 152, width: '60%', height: 2, background: 'hsl(var(--border))' }} />
            {/* Level-2 nodes – 3 nodes */}
            {[20, 45, 70].map((left, i) => (
              <div key={i} className="absolute" style={{ left: `${left}%`, top: 154, transform: 'translateX(-50%)' }}>
                <div className="absolute" style={{ left: '50%', top: -2, width: 2, height: 30, transform: 'translateX(-50%)', background: 'hsl(var(--border))' }} />
                <div className="mt-7">
                  <Skeleton className="w-12 h-12 rounded-full" />
                  <Skeleton className="h-3 w-16 mt-1.5 mx-auto" />
                </div>
              </div>
            ))}
            {/* Level-3 hint nodes */}
            {[12, 28, 55, 65].map((left, i) => (
              <div key={i} className="absolute" style={{ left: `${left}%`, top: 260, transform: 'translateX(-50%)' }}>
                <Skeleton className="w-10 h-10 rounded-full opacity-50" />
                <Skeleton className="h-2 w-12 mt-1 mx-auto opacity-50" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const myName = user?.full_name || user?.username || 'Mi Red';

  return (
    <div className="space-y-5">

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Red Genealógica</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            {isAdmin && viewAllNet ? 'Vista completa de toda la red.' : `Red de ${myName}.`}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {isAdmin && (
            <button
              onClick={() => setViewAllNet(v => !v)}
              className={cn(
                'flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold border transition-all',
                viewAllNet
                  ? 'bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/25'
                  : 'border-border text-muted-foreground hover:bg-muted',
              )}
            >
              <Eye className="w-3.5 h-3.5" />
              {viewAllNet ? 'Red completa' : 'Ver toda la red'}
            </button>
          )}
          <button
            onClick={() => openAdd(user!.id, myName)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-primary text-primary-foreground rounded-xl text-xs font-bold hover:bg-primary/90 active:scale-95 transition-all shadow-md shadow-primary/25"
          >
            <UserPlus className="w-3.5 h-3.5" /> Agregar
          </button>
          <button
            onClick={refresh}
            className="p-2 border border-border rounded-xl hover:bg-muted text-muted-foreground transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <div className="flex items-center bg-muted rounded-xl p-1 gap-1">
            {(['tree', 'list'] as const).map(v => (
              <button
                key={v}
                onClick={() => setViewMode(v)}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all',
                  viewMode === v ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {v === 'tree' ? <><Network className="w-3.5 h-3.5" /> Árbol</> : <><List className="w-3.5 h-3.5" /> Lista</>}
              </button>
            ))}
          </div>
        </div>
      </div>

      <StatsBar tree={tree} profiles={profiles} />

      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setRankFilter('all')}
          className={cn('px-3.5 py-1.5 rounded-full text-xs font-bold transition-all border',
            rankFilter === 'all' ? 'bg-foreground text-background border-foreground' : 'border-border text-muted-foreground hover:border-foreground/40')}
        >
          Todos
        </button>
        {Object.entries(RANKS).map(([k, rc]) => (
          <button
            key={k}
            onClick={() => setRankFilter(rankFilter === k ? 'all' : k)}
            className={cn('flex items-center gap-1 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all border',
              rankFilter === k ? 'border-transparent' : 'border-border text-muted-foreground hover:border-muted-foreground/50')}
            style={rankFilter === k ? {
              background: rc.color + '22', color: rc.color, borderColor: rc.color + '66',
            } : {}}
          >
            <rc.Icon className="w-3 h-3" />
            {rc.label}
          </button>
        ))}
      </div>

      {!tree ? (
        <div className="flex flex-col items-center justify-center py-24 gap-5 bg-card border border-border rounded-xl">
          <div className="w-16 h-16 rounded-xl bg-muted flex items-center justify-center">
            <Network className="w-8 h-8 text-muted-foreground" />
          </div>
          <div className="text-center">
            <h3 className="text-base font-bold text-foreground">Tu red está vacía</h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-xs">Agrega tu primer afiliado para comenzar a construir tu red.</p>
          </div>
          <button
            onClick={() => openAdd(user!.id, myName)}
            className="flex items-center gap-2 px-5 py-3 bg-primary text-primary-foreground rounded-xl text-sm font-bold hover:bg-primary/90 transition-all shadow-lg shadow-primary/25"
          >
            <UserPlus className="w-4 h-4" /> Agregar primer afiliado
          </button>
        </div>
      ) : viewMode === 'tree' ? (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30 gap-2 flex-wrap">
            <p className="text-xs text-muted-foreground hidden sm:block">
              Arrastra · Scroll para zoom · Toca un nodo para ver detalle
            </p>
            <p className="text-xs text-muted-foreground sm:hidden">Arrastra · Pellizca · Toca</p>
            <div className="flex items-center gap-1.5 ml-auto">
              <button onClick={() => setZoom(z => Math.min(3, z + 0.15))}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-muted text-muted-foreground transition-colors border border-border">
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
              <div className="w-14 text-center text-xs font-mono text-muted-foreground tabular-nums select-none">
                {Math.round(zoom * 100)}%
              </div>
              <button onClick={() => setZoom(z => Math.max(0.2, z - 0.15))}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-muted text-muted-foreground transition-colors border border-border">
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <button onClick={resetView}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-muted text-muted-foreground transition-colors border border-border" title="Centrar">
                <Maximize2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div
            ref={canvasRef}
            className="overflow-hidden cursor-grab active:cursor-grabbing touch-none bg-[radial-gradient(circle_at_1px_1px,hsl(var(--muted-foreground)/0.08)_1px,transparent_0)] bg-[size:24px_24px]"
            style={{ height: 'clamp(320px, 55vh, 640px)' }}
            onPointerDown={onPtrDown}
            onPointerMove={onPtrMove}
            onPointerUp={onPtrUp}
            onPointerLeave={onPtrUp}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
            onWheel={onWheel}
          >
            <div
              style={{
                transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                transformOrigin: '0 0',
                willChange: 'transform',
                transition: isDragging.current ? 'none' : 'transform 0.05s ease-out',
              }}
            >
              <TreeCanvas
                root={tree}
                selfId={currentRootId}
                onNodeClick={n => setSelected(n)}
              />
            </div>
          </div>

          <div className="border-t border-border px-4 py-2 flex items-center justify-between text-xs text-muted-foreground bg-muted/20">
            <span>{countTree(tree)} nodo{countTree(tree) !== 1 ? 's' : ''} en el árbol</span>
            <button
              onClick={() => openAdd(user!.id, myName)}
              className="flex items-center gap-1 text-primary hover:text-primary/80 font-semibold transition-colors"
            >
              <Plus className="w-3.5 h-3.5" /> Agregar afiliado
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl p-4 sm:p-5">
          <ListView tree={tree} onSelect={setSelected} />
        </div>
      )}

      {addModal && (
        <AddMemberModal
          sponsorId={addSponsorId}
          sponsorName={addSponsorName}
          allProfiles={profiles}
          allowAssignExisting={allowAssignExisting && isAdmin}
          onClose={() => setAddModal(false)}
          onAdded={refresh}
          onAddReferral={addReferral}
          onAssignExisting={assignExistingUser}
        />
      )}

      {selected && (
        <NodeDrawer
          node={selected}
          allProfiles={profiles}
          isAdmin={isAdmin}
          onClose={() => setSelected(null)}
          onRefresh={() => { setSelected(null); refresh(); }}
          onAddChild={(sponsorId, sponsorName) => {
            setSelected(null);
            setAddSponsorId(sponsorId);
            setAddSponsorName(sponsorName);
            setAddModal(true);
          }}
          onUpdateProfile={updateProfile}
          onUnlink={unlinkUser}
          onMoveUser={moveUser}
        />
      )}
    </div>
  );
}
