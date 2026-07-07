import Navbar from '@/components/landing/Navbar';
import Footer from '@/components/landing/Footer';
import { Reveal } from '@/components/landing/Reveal';
import { Link } from '@/lib/router';
import { ArrowRight, Target, Eye, Shield, Users, TrendingUp, Award, Globe, Zap, HandHeart, BadgeCheck } from 'lucide-react';
import { useConfig } from '@/store/configStore';
import { cn } from '@/lib/utils';

const values = [
  { icon: Shield, title: 'Transparencia', desc: 'Cada comisión, cada volumen y cada rango es rastreable en tiempo real. Nada oculto, nada manual.', color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
  { icon: HandHeart, title: 'Comunidad', desc: 'Construimos herramientas para que los afiliados crezcan juntos, no en competencia.', color: 'text-rose-500', bg: 'bg-rose-500/10' },
  { icon: Zap, title: 'Innovación', desc: 'Tecnología de punta: comisiones instantáneas, árbol genealógico interactivo y más.', color: 'text-amber-500', bg: 'bg-amber-500/10' },
  { icon: BadgeCheck, title: 'Cumplimiento', desc: 'Operamos bajo normativa legal peruana con pasarelas de pago certificadas.', color: 'text-blue-500', bg: 'bg-blue-500/10' },
];

const milestones = [
  { year: '2024', title: 'Nacimiento de Cluv360', desc: 'La plataforma nace con una misión: profesionalizar el MLM en Perú.' },
  { year: '2025', title: 'Comisiones instantáneas', desc: 'Primer sistema en Perú con acreditación de comisiones en menos de 60 segundos.' },
  { year: '2025', title: 'Yape y Plin integrados', desc: 'Pasarelas de pago locales para que cada afiliado cobre como prefiera.' },
  { year: '2025', title: 'Expansión LATAM', desc: 'Iniciamos operaciones en Colombia, Ecuador y Bolivia.' },
];

const team = [
  { name: 'Gustavo Ortiz', role: 'CEO & Fundador', bio: '15 años en MLM. Lideró redes de más de 50,000 afiliados.', avatar: 'https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=200' },
  { name: 'Carlos Torres', role: 'CTO', bio: 'Arquitecto del sistema de comisiones instantáneas.', avatar: 'https://images.pexels.com/photos/1222271/pexels-photo-1222271.jpeg?auto=compress&cs=tinysrgb&w=200' },
  { name: 'Ana Ríos', role: 'Directora de Operaciones', bio: 'Experta en soporte y onboarding de afiliados.', avatar: 'https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?auto=compress&cs=tinysrgb&w=200' },
  { name: 'María Torres', role: 'Coach de Liderazgo', bio: 'Formadora de líderes Diamante en toda Latinoamérica.', avatar: 'https://images.pexels.com/photos/415829/pexels-photo-415829.jpeg?auto=compress&cs=tinysrgb&w=200' },
];

const stats = [
  { value: '10K+', label: 'Afiliados activos', icon: Users },
  { value: '6', label: 'Rangos con bonos', icon: Award },
  { value: '4', label: 'Países LATAM', icon: Globe },
  { value: '<60s', label: 'Comisiones', icon: TrendingUp },
];

export default function EmpresaPage() {
  const { company } = useConfig();

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <section className="relative pt-12 pb-12 sm:pt-16 sm:pb-16 overflow-hidden">
        <div className="absolute inset-0 bg-dub-grid opacity-20 mask-fade-center" />
        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
            <Link to="/" className="hover:text-foreground transition-colors">Inicio</Link>
            <span className="text-muted-foreground/40">/</span>
            <span className="text-foreground font-medium">Empresa</span>
          </nav>

          <Reveal>
            <span className="text-xs font-semibold text-primary uppercase tracking-widest mb-3 block">Sobre nosotros</span>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground tracking-tight mb-4 max-w-2xl">
              Profesionalizamos el MLM en Latinoamérica
            </h1>
            <p className="text-base sm:text-lg text-muted-foreground/70 max-w-xl">
              Cluv360 es la plataforma todo-en-uno para redes de afiliados: comisiones automáticas, árbol genealógico interactivo, tienda integrada y rangos con bonos.
            </p>
          </Reveal>
        </div>
      </section>

      {/* ── Stats ──────────────────────────────────────────────────────────── */}
      <section className="py-8 border-y border-border/40 bg-muted/20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {stats.map(s => (
              <div key={s.label} className="text-center">
                <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-primary/10 mb-2">
                  <s.icon className="w-5 h-5 text-primary" />
                </div>
                <div className="text-2xl sm:text-3xl font-bold text-foreground">{s.value}</div>
                <div className="text-xs sm:text-sm text-muted-foreground">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Mission / Vision ───────────────────────────────────────────────── */}
      <section className="py-14 sm:py-16">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            <Reveal>
              <div className="bg-card border border-border/60 rounded-2xl p-6 sm:p-8 h-full">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                  <Target className="w-6 h-6 text-primary" />
                </div>
                <h2 className="text-lg font-bold text-foreground mb-2">Misión</h2>
                <p className="text-sm text-muted-foreground/70 leading-relaxed">
                  Dar a cada afiliado las herramientas profesionales para construir una red sostenible, con transparencia total y comisiones que se acrediten en tiempo real.
                </p>
              </div>
            </Reveal>
            <Reveal>
              <div className="bg-card border border-border/60 rounded-2xl p-6 sm:p-8 h-full">
                <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center mb-4">
                  <Eye className="w-6 h-6 text-amber-500" />
                </div>
                <h2 className="text-lg font-bold text-foreground mb-2">Visión</h2>
                <p className="text-sm text-muted-foreground/70 leading-relaxed">
                  Ser la plataforma MLM líder en Latinoamérica para 2027, con presencia en 10 países y más de 100,000 afiliados activos.
                </p>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ── Values ─────────────────────────────────────────────────────────── */}
      <section className="py-14 sm:py-16 bg-muted/20 border-y border-border/40">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <Reveal className="text-center mb-10">
            <span className="text-xs font-semibold text-primary uppercase tracking-widest mb-2 block">Valores</span>
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground">Lo que nos define</h2>
          </Reveal>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {values.map((v, i) => (
              <Reveal key={v.title} delay={i * 50}>
                <div className="bg-card border border-border/60 rounded-2xl p-5 h-full hover:border-primary/30 transition-colors">
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

      {/* ── Timeline ───────────────────────────────────────────────────────── */}
      <section className="py-14 sm:py-16">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <Reveal className="text-center mb-10">
            <span className="text-xs font-semibold text-primary uppercase tracking-widest mb-2 block">Trayectoria</span>
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground">Nuestro camino</h2>
          </Reveal>

          <div className="relative">
            {/* Vertical line */}
            <div className="absolute left-4 sm:left-1/2 top-0 bottom-0 w-px bg-border/60 sm:-translate-x-1/2" />

            <div className="space-y-8">
              {milestones.map((m, i) => (
                <Reveal key={m.year + m.title} delay={i * 50}>
                  <div className={cn('relative flex items-start gap-4 sm:gap-0', i % 2 === 0 ? 'sm:flex-row' : 'sm:flex-row-reverse')}>
                    {/* Dot */}
                    <div className="absolute left-4 sm:left-1/2 sm:-translate-x-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-primary ring-4 ring-background z-10 mt-1.5" />
                    {/* Content */}
                    <div className="pl-10 sm:pl-0 sm:w-1/2 sm:px-6">
                      <div className="bg-card border border-border/60 rounded-xl p-4">
                        <span className="text-xs font-bold text-primary">{m.year}</span>
                        <h3 className="text-sm font-bold text-foreground mt-1 mb-1">{m.title}</h3>
                        <p className="text-xs text-muted-foreground/60">{m.desc}</p>
                      </div>
                    </div>
                    {/* Spacer for the other half */}
                    <div className="hidden sm:block sm:w-1/2" />
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Team ───────────────────────────────────────────────────────────── */}
      <section className="py-14 sm:py-16 bg-muted/20 border-y border-border/40">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <Reveal className="text-center mb-10">
            <span className="text-xs font-semibold text-primary uppercase tracking-widest mb-2 block">Equipo</span>
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground">Liderazgo</h2>
            <p className="text-sm text-muted-foreground/60 mt-2 max-w-md mx-auto">Expertos en MLM, tecnología y soporte que hacen posible Cluv360.</p>
          </Reveal>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {team.map((member, i) => (
              <Reveal key={member.name} delay={i * 50}>
                <div className="bg-card border border-border/60 rounded-2xl p-5 text-center hover:border-primary/30 transition-colors">
                  <img src={member.avatar} alt={member.name} className="w-16 h-16 rounded-full mx-auto mb-3 object-cover" />
                  <h3 className="text-sm font-bold text-foreground">{member.name}</h3>
                  <p className="text-xs text-primary font-medium mb-2">{member.role}</p>
                  <p className="text-xs text-muted-foreground/60 leading-relaxed">{member.bio}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Legal ──────────────────────────────────────────────────────────── */}
      <section className="py-14 sm:py-16">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <Reveal className="text-center mb-8">
            <span className="text-xs font-semibold text-primary uppercase tracking-widest mb-2 block">Legal</span>
            <h2 className="text-2xl font-bold text-foreground">Empresa registrada</h2>
          </Reveal>

          <div className="bg-card border border-border/60 rounded-2xl p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground text-xs uppercase tracking-wide block mb-1">Razón social</span>
                <div className="font-medium text-foreground">{company.razon_social || 'MLM 360 S.A.C.'}</div>
              </div>
              <div>
                <span className="text-muted-foreground text-xs uppercase tracking-wide block mb-1">RUC</span>
                <div className="font-medium text-foreground">{company.ruc || '20603456789'}</div>
              </div>
              <div className="sm:col-span-2">
                <span className="text-muted-foreground text-xs uppercase tracking-wide block mb-1">Dirección</span>
                <div className="font-medium text-foreground">{company.address || 'Av. Javier Prado Este 4200, San Isidro, Lima, Perú'}</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA ────────────────────────────────────────────────────────────── */}
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
