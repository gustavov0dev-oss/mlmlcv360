import Navbar from '@/components/landing/Navbar';
import Footer from '@/components/landing/Footer';
import { Reveal } from '@/components/landing/Reveal';
import { Link } from '@/lib/router';
import { useConfig } from '@/store/configStore';
import { ArrowRight, Target, Eye, Shield, Users, Award, Zap, HandHeart, BadgeCheck, Lock, Cpu, Cloud, Database, Wallet, Network, ShoppingBag, ChartBar as BarChart3, Bell, Sparkles, CircleCheck as CheckCircle, TrendingUp, Globe, Crown, Diamond, Star } from 'lucide-react';
import { cn } from '@/lib/utils';

const values = [
  { icon: Shield, title: 'Transparencia', desc: 'Cada comisión, volumen y rango es rastreable en tiempo real. Nada oculto, nada manual.', color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
  { icon: HandHeart, title: 'Comunidad', desc: 'Construimos herramientas para que los afiliados crezcan juntos, no en competencia.', color: 'text-rose-500', bg: 'bg-rose-500/10' },
  { icon: Zap, title: 'Innovación', desc: 'Tecnología de punta: comisiones instantáneas, árbol genealógico interactivo y más.', color: 'text-amber-500', bg: 'bg-amber-500/10' },
  { icon: BadgeCheck, title: 'Cumplimiento', desc: 'Operamos bajo normativa legal peruana con pasarelas de pago certificadas.', color: 'text-blue-500', bg: 'bg-blue-500/10' },
];

const offerings = [
  { icon: Wallet, title: 'Comisiones automáticas', desc: 'Directas, binarias, bonos de rango y residuales. Todo calculado y acreditado en tiempo real.', color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
  { icon: Network, title: 'Red genealógica visual', desc: 'Árbol binario y matriz interactivo con zoom, filtros y exportación.', color: 'text-primary', bg: 'bg-primary/10' },
  { icon: Award, title: 'Sistema de rangos', desc: '6 rangos con bonos exclusivos, desde Bronce hasta Corona. Cada nivel desbloquea nuevos ingresos.', color: 'text-amber-500', bg: 'bg-amber-500/10' },
  { icon: ShoppingBag, title: 'Tienda integrada', desc: 'Productos físicos y digitales con comisiones por cada venta. Inventario y envíos automatizados.', color: 'text-blue-500', bg: 'bg-blue-500/10' },
  { icon: BarChart3, title: 'Reportes en tiempo real', desc: 'Dashboard con métricas de volumen, comisiones, red activa y crecimiento mensual.', color: 'text-sky-500', bg: 'bg-sky-500/10' },
  { icon: Bell, title: 'Alertas y notificaciones', desc: 'Recibe notificaciones instantáneas de comisiones, nuevos afiliados y cambios de rango.', color: 'text-rose-500', bg: 'bg-rose-500/10' },
];

const benefits = [
  { title: 'Para afiliados', items: [
    'Comisiones acreditadas en menos de 60 segundos',
    'Cobro vía Yape, Plin o transferencia bancaria',
    'App móvil para gestionar tu red desde cualquier lugar',
    'Tutoriales, guías y soporte personalizado',
    'Sistema de rangos con bonos crecientes',
  ]},
  { title: 'Para negocios', items: [
    'Panel de administración completo para tu empresa',
    'Gestión de productos, planes y configuración global',
    'Reportes detallados de volumen, comisiones y crecimiento',
    'Pasarelas de pago locales e internacionales',
    'Cumplimiento legal y seguridad de datos',
  ]},
];

const techStack = [
  { icon: Cpu, label: 'React + TypeScript', desc: 'Frontend moderno y tipado' },
  { icon: Database, label: 'PostgreSQL + Supabase', desc: 'Base de datos escalable' },
  { icon: Cloud, label: 'Edge Functions', desc: 'Procesamiento en tiempo real' },
  { icon: Lock, label: 'Row Level Security', desc: 'Seguridad a nivel de base de datos' },
];

const securityFeatures = [
  { icon: Lock, title: 'Cifrado de extremo a extremo', desc: 'Tus datos y transacciones protegidos con cifrado de nivel bancario.' },
  { icon: Shield, title: 'Row Level Security', desc: 'Cada afiliado solo accede a sus propios datos. Seguridad a nivel de base de datos.' },
  { icon: BadgeCheck, title: 'Cumplimiento legal', desc: 'Operamos bajo normativa peruana con pasarelas de pago certificadas.' },
  { icon: Cloud, title: 'Alta disponibilidad', desc: 'Infraestructura en la nube con 99.9% de uptime garantizado.' },
];

const milestones = [
  { year: '2024', title: 'Nacimiento de Cluv360', desc: 'La plataforma nace con una misión: profesionalizar el MLM en Perú.' },
  { year: '2025', title: 'Comisiones instantáneas', desc: 'Primer sistema en Perú con acreditación de comisiones en menos de 60 segundos.' },
  { year: '2025', title: 'Yape y Plin integrados', desc: 'Pasarelas de pago locales para que cada afiliado cobre como prefiera.' },
  { year: '2025', title: 'Expansión LATAM', desc: 'Iniciamos operaciones en Colombia, Ecuador y Bolivia.' },
];

const rankIcons: Record<string, typeof Crown> = { Bronce: Star, Plata: Star, Oro: Star, Platino: Star, Diamante: Diamond, Corona: Crown };

export default function EmpresaPage() {
  const { company, ranks, plans, currencySymbol } = useConfig();

  const activeRanks = ranks.filter(r => r.is_active);
  const activePlans = plans.filter(p => p.is_active);
  const companyName = company.company_name || 'MLM 360';
  const companyEmail = company.company_email || 'contacto@mlm360.pe';
  const companyPhone = company.company_phone || '+51 916 085 797';
  const companyAddress = company.company_address || 'Av. Javier Prado Este 100, San Isidro, Lima, Perú';
  const companyRuc = company.company_ruc || '73983766';
  const commissionDirect = company.commission_direct || '7';
  const commissionBinary = company.commission_binary || '4';
  const commissionUnilevel = company.commission_unilevel || '2';

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="relative pt-28 pb-12 sm:pb-16 overflow-hidden">
        <div className="absolute inset-0 bg-dub-grid opacity-20 mask-fade-top" />
        <div className="relative max-w-[1100px] mx-auto px-4 sm:px-6 lg:px-8">
          <nav aria-label="breadcrumb" className="sr-only">
            <Link to="/">Inicio</Link> / <span>Empresa</span>
          </nav>

          <Reveal>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/8 border border-primary/15 text-xs font-medium text-primary mb-5">
              <Sparkles className="w-3.5 h-3.5" />
              Sobre {companyName}
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground tracking-tight mb-4 leading-[1.05] max-w-3xl">
              Profesionalizamos el MLM<br className="hidden sm:block" /> en <span className="text-gradient-animated">Latinoamérica</span>
            </h1>
            <p className="text-base sm:text-lg text-muted-foreground/70 max-w-xl leading-relaxed">
              {companyName} es la plataforma todo-en-uno para redes de afiliados: comisiones automáticas, árbol genealógico interactivo, tienda integrada y rangos con bonos.
            </p>
          </Reveal>
        </div>
      </section>

      {/* ── Stats ────────────────────────────────────────────────────────── */}
      <section className="py-8 border-y border-border/40 bg-muted/20">
        <div className="max-w-[1100px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {[
              { value: `${activeRanks.length}`, label: 'Rangos activos', icon: Award },
              { value: `${activePlans.length}`, label: 'Planes disponibles', icon: TrendingUp },
              { value: `${commissionDirect}%`, label: 'Comisión directa', icon: Wallet },
              { value: '<60s', label: 'Acreditación', icon: Zap },
            ].map((s, i) => (
              <Reveal key={s.label} delay={i * 50}>
                <div className="text-center">
                  <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-primary/10 mb-2">
                    <s.icon className="w-5 h-5 text-primary" />
                  </div>
                  <div className="text-2xl sm:text-3xl font-bold text-foreground">{s.value}</div>
                  <div className="text-xs sm:text-sm text-muted-foreground">{s.label}</div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Quiénes somos ────────────────────────────────────────────────── */}
      <section className="py-14 sm:py-16">
        <div className="max-w-[1100px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">
            <Reveal>
              <div>
                <span className="text-xs font-semibold text-primary uppercase tracking-widest mb-2 block">Quiénes somos</span>
                <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-4 leading-tight">Una plataforma construida por y para afiliados</h2>
                <div className="space-y-3 text-sm sm:text-base text-muted-foreground/70 leading-relaxed">
                  <p>Somos un equipo de líderes MLM, ingenieros y diseñadores que vimos la necesidad de una plataforma profesional en Latinoamérica. Una que no solo calcule comisiones, sino que empodere a cada afiliado con herramientas reales.</p>
                  <p>{companyName} nació para eliminar lo que más frustra a los afiliados: comisiones manuales, reportes desfasados y sistemas opacos. Hoy, miles de afiliados gestionan su red con transparencia total.</p>
                </div>
              </div>
            </Reveal>
            <Reveal delay={100}>
              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                {[
                  { icon: Users, label: 'Plataforma', val: '100% responsive', color: 'bg-primary/10 text-primary' },
                  { icon: Globe, label: 'Operación', val: 'Perú y LATAM', color: 'bg-blue-500/10 text-blue-500' },
                  { icon: Wallet, label: 'Comisión directa', val: `${commissionDirect}%`, color: 'bg-emerald-500/10 text-emerald-500' },
                  { icon: Award, label: 'Rangos', val: `${activeRanks.length} niveles`, color: 'bg-amber-500/10 text-amber-500' },
                ].map((item, i) => (
                  <div key={i} className="bg-card border border-border/50 rounded-2xl p-4 sm:p-5 card-lift">
                    <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center mb-3', item.color)}>
                      <item.icon className="w-4.5 h-4.5" />
                    </div>
                    <div className="text-lg font-bold text-foreground">{item.label}</div>
                    <div className="text-xs text-muted-foreground/60 mt-0.5">{item.val}</div>
                  </div>
                ))}
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ── Mission / Vision ─────────────────────────────────────────────── */}
      <section className="py-14 sm:py-16 bg-muted/20 border-y border-border/40">
        <div className="max-w-[1100px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            <Reveal>
              <div className="bg-card border border-border/50 rounded-2xl p-6 sm:p-8 h-full card-lift">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                  <Target className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-lg font-bold text-foreground mb-2">Misión</h3>
                <p className="text-sm text-muted-foreground/70 leading-relaxed">
                  Dar a cada afiliado las herramientas profesionales para construir una red sostenible, con transparencia total y comisiones que se acrediten en tiempo real.
                </p>
              </div>
            </Reveal>
            <Reveal delay={80}>
              <div className="bg-card border border-border/50 rounded-2xl p-6 sm:p-8 h-full card-lift">
                <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center mb-4">
                  <Eye className="w-6 h-6 text-amber-500" />
                </div>
                <h3 className="text-lg font-bold text-foreground mb-2">Visión</h3>
                <p className="text-sm text-muted-foreground/70 leading-relaxed">
                  Ser la plataforma MLM líder en Latinoamérica para 2027, con presencia en 10 países y más de 100,000 afiliados activos creciendo con nosotros.
                </p>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ── Qué ofrece Cluv360 ───────────────────────────────────────────── */}
      <section className="py-14 sm:py-16">
        <div className="max-w-[1100px] mx-auto px-4 sm:px-6 lg:px-8">
          <Reveal className="text-center mb-10">
            <span className="text-xs font-semibold text-primary uppercase tracking-widest mb-2 block">Qué ofrecemos</span>
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground">Todo lo que necesitas en un solo lugar</h2>
            <p className="text-sm text-muted-foreground/60 mt-2 max-w-lg mx-auto">Una plataforma completa para gestionar tu red de afiliados de principio a fin.</p>
          </Reveal>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {offerings.map((item, i) => (
              <Reveal key={item.title} delay={i * 40}>
                <div className="bg-card border border-border/50 rounded-2xl p-5 sm:p-6 h-full card-lift">
                  <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center mb-4', item.bg)}>
                    <item.icon className={cn('w-5 h-5', item.color)} />
                  </div>
                  <h3 className="text-sm font-bold text-foreground mb-1.5">{item.title}</h3>
                  <p className="text-xs sm:text-sm text-muted-foreground/60 leading-relaxed">{item.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Rangos reales (from DB) ───────────────────────────────────────── */}
      <section className="py-14 sm:py-16 bg-muted/20 border-y border-border/40">
        <div className="max-w-[1100px] mx-auto px-4 sm:px-6 lg:px-8">
          <Reveal className="text-center mb-10">
            <span className="text-xs font-semibold text-primary uppercase tracking-widest mb-2 block">Sistema de rangos</span>
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground">Del Bronce a la Corona</h2>
            <p className="text-sm text-muted-foreground/60 mt-2 max-w-lg mx-auto">Cada rango desbloquea bonos exclusivos. Estos son los rangos configurados en la plataforma.</p>
          </Reveal>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {activeRanks.map((rank, i) => {
              const RankIcon = rankIcons[rank.name] || Star;
              return (
                <Reveal key={rank.id} delay={i * 40}>
                  <div className="bg-card border border-border/50 rounded-2xl p-4 text-center card-lift h-full flex flex-col">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
                      <RankIcon className={cn('w-5 h-5', rank.color || 'text-primary')} />
                    </div>
                    <div className="text-sm font-bold text-foreground">{rank.name}</div>
                    <div className="text-xs text-muted-foreground/50 mt-0.5 mb-2">{rank.min_affiliates} afiliados</div>
                    <div className="mt-auto pt-2 border-t border-border/30">
                      <div className="text-xs text-muted-foreground/50">Bono</div>
                      <div className="text-sm font-bold text-primary">{currencySymbol} {Number(rank.bonus).toLocaleString()}</div>
                    </div>
                  </div>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Benefits ─────────────────────────────────────────────────────── */}
      <section className="py-14 sm:py-16">
        <div className="max-w-[1100px] mx-auto px-4 sm:px-6 lg:px-8">
          <Reveal className="text-center mb-10">
            <span className="text-xs font-semibold text-primary uppercase tracking-widest mb-2 block">Beneficios</span>
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground">Diseñado para afiliados y negocios</h2>
          </Reveal>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            {benefits.map((benefit, i) => (
              <Reveal key={benefit.title} delay={i * 80}>
                <div className="bg-card border border-border/50 rounded-2xl p-6 sm:p-8 h-full">
                  <h3 className="text-lg font-bold text-foreground mb-4">{benefit.title}</h3>
                  <ul className="space-y-3">
                    {benefit.items.map((item, j) => (
                      <li key={j} className="flex items-start gap-3">
                        <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                        <span className="text-sm text-muted-foreground/70 leading-relaxed">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Comisiones reales (from DB) ───────────────────────────────────── */}
      <section className="py-14 sm:py-16 bg-muted/20 border-y border-border/40">
        <div className="max-w-[1100px] mx-auto px-4 sm:px-6 lg:px-8">
          <Reveal className="text-center mb-10">
            <span className="text-xs font-semibold text-primary uppercase tracking-widest mb-2 block">Comisiones</span>
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground">Sistema de comisiones configurado</h2>
            <p className="text-sm text-muted-foreground/60 mt-2 max-w-lg mx-auto">Tres tipos de comisión activos en la plataforma, acreditados en tiempo real.</p>
          </Reveal>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { label: 'Comisión directa', value: `${commissionDirect}%`, desc: 'Por cada venta de tu red directa', icon: Wallet, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
              { label: 'Comisión binaria', value: `${commissionBinary}%`, desc: 'Sobre el volumen de tu pata menor', icon: Network, color: 'text-primary', bg: 'bg-primary/10' },
              { label: 'Comisión unilevel', value: `${commissionUnilevel}%`, desc: 'Por niveles de profundidad', icon: TrendingUp, color: 'text-amber-500', bg: 'bg-amber-500/10' },
            ].map((item, i) => (
              <Reveal key={item.label} delay={i * 60}>
                <div className="bg-card border border-border/50 rounded-2xl p-6 text-center card-lift">
                  <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-4', item.bg)}>
                    <item.icon className={cn('w-6 h-6', item.color)} />
                  </div>
                  <div className="text-3xl font-bold text-foreground mb-1">{item.value}</div>
                  <div className="text-sm font-medium text-foreground">{item.label}</div>
                  <div className="text-xs text-muted-foreground/50 mt-1">{item.desc}</div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Values ───────────────────────────────────────────────────────── */}
      <section className="py-14 sm:py-16">
        <div className="max-w-[1100px] mx-auto px-4 sm:px-6 lg:px-8">
          <Reveal className="text-center mb-10">
            <span className="text-xs font-semibold text-primary uppercase tracking-widest mb-2 block">Valores</span>
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground">Lo que nos define</h2>
          </Reveal>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {values.map((v, i) => (
              <Reveal key={v.title} delay={i * 50}>
                <div className="bg-card border border-border/50 rounded-2xl p-5 h-full card-lift">
                  <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center mb-3', v.bg)}>
                    <v.icon className={cn('w-5 h-5', v.color)} />
                  </div>
                  <h3 className="text-sm font-bold text-foreground mb-1.5">{v.title}</h3>
                  <p className="text-xs text-muted-foreground/60 leading-relaxed">{v.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Technology ────────────────────────────────────────────────────── */}
      <section className="py-14 sm:py-16 bg-muted/20 border-y border-border/40">
        <div className="max-w-[1100px] mx-auto px-4 sm:px-6 lg:px-8">
          <Reveal className="text-center mb-10">
            <span className="text-xs font-semibold text-primary uppercase tracking-widest mb-2 block">Tecnología</span>
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground">Construido con tecnología de punta</h2>
            <p className="text-sm text-muted-foreground/60 mt-2 max-w-lg mx-auto">Infraestructura moderna, escalable y segura.</p>
          </Reveal>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {techStack.map((tech, i) => (
              <Reveal key={tech.label} delay={i * 50}>
                <div className="bg-card border border-border/50 rounded-2xl p-5 text-center card-lift">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
                    <tech.icon className="w-5 h-5 text-primary" />
                  </div>
                  <div className="text-sm font-bold text-foreground">{tech.label}</div>
                  <div className="text-xs text-muted-foreground/60 mt-0.5">{tech.desc}</div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Security ──────────────────────────────────────────────────────── */}
      <section className="py-14 sm:py-16">
        <div className="max-w-[1100px] mx-auto px-4 sm:px-6 lg:px-8">
          <Reveal className="text-center mb-10">
            <span className="text-xs font-semibold text-primary uppercase tracking-widest mb-2 block">Seguridad y confianza</span>
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground">Tus datos y tu dinero, protegidos</h2>
          </Reveal>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {securityFeatures.map((feat, i) => (
              <Reveal key={feat.title} delay={i * 50}>
                <div className="bg-card border border-border/50 rounded-2xl p-5 sm:p-6 flex items-start gap-4 card-lift">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0">
                    <feat.icon className="w-5 h-5 text-emerald-500" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-foreground mb-1">{feat.title}</h3>
                    <p className="text-xs sm:text-sm text-muted-foreground/60 leading-relaxed">{feat.desc}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Timeline ──────────────────────────────────────────────────────── */}
      <section className="py-14 sm:py-16 bg-muted/20 border-y border-border/40">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <Reveal className="text-center mb-10">
            <span className="text-xs font-semibold text-primary uppercase tracking-widest mb-2 block">Trayectoria</span>
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground">Nuestro camino</h2>
          </Reveal>

          <div className="relative">
            <div className="absolute left-4 sm:left-1/2 top-0 bottom-0 w-px bg-border/60 sm:-translate-x-1/2" />
            <div className="space-y-8">
              {milestones.map((m, i) => (
                <Reveal key={m.year + m.title} delay={i * 50}>
                  <div className={cn('relative flex items-start gap-4 sm:gap-0', i % 2 === 0 ? 'sm:flex-row' : 'sm:flex-row-reverse')}>
                    <div className="absolute left-4 sm:left-1/2 sm:-translate-x-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-primary ring-4 ring-background z-10 mt-1.5" />
                    <div className="pl-10 sm:pl-0 sm:w-1/2 sm:px-6">
                      <div className="bg-card border border-border/50 rounded-xl p-4 card-lift">
                        <span className="text-xs font-bold text-primary">{m.year}</span>
                        <h3 className="text-sm font-bold text-foreground mt-1 mb-1">{m.title}</h3>
                        <p className="text-xs text-muted-foreground/60">{m.desc}</p>
                      </div>
                    </div>
                    <div className="hidden sm:block sm:w-1/2" />
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Legal ─────────────────────────────────────────────────────────── */}
      <section className="py-14 sm:py-16">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <Reveal className="text-center mb-8">
            <span className="text-xs font-semibold text-primary uppercase tracking-widest mb-2 block">Legal</span>
            <h2 className="text-2xl font-bold text-foreground">Empresa registrada</h2>
          </Reveal>
          <Reveal delay={50}>
            <div className="bg-card border border-border/50 rounded-2xl p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground text-xs uppercase tracking-wide block mb-1">Razón social</span>
                  <div className="font-medium text-foreground">{companyName}</div>
                </div>
                <div>
                  <span className="text-muted-foreground text-xs uppercase tracking-wide block mb-1">RUC</span>
                  <div className="font-medium text-foreground">{companyRuc}</div>
                </div>
                <div className="sm:col-span-2">
                  <span className="text-muted-foreground text-xs uppercase tracking-wide block mb-1">Dirección</span>
                  <div className="font-medium text-foreground">{companyAddress}</div>
                </div>
                <div>
                  <span className="text-muted-foreground text-xs uppercase tracking-wide block mb-1">Email</span>
                  <div className="font-medium text-foreground">{companyEmail}</div>
                </div>
                <div>
                  <span className="text-muted-foreground text-xs uppercase tracking-wide block mb-1">Teléfono</span>
                  <div className="font-medium text-foreground">{companyPhone}</div>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── CTA ───────────────────────────────────────────────────────────── */}
      <section className="py-14 sm:py-16 bg-muted/20 border-t border-border/40">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-xl sm:text-2xl font-bold text-foreground mb-2">Únete a la revolución del MLM</h2>
          <p className="text-sm text-muted-foreground mb-5">Crea tu cuenta gratuita y empieza a construir tu red hoy.</p>
          <Link to="/registro" className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-white font-semibold rounded-xl hover:bg-primary/90 transition-all text-sm">
            Crear cuenta gratis <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
}
