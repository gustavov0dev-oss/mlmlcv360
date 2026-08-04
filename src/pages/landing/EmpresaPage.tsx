import { useState } from 'react';
import { Reveal } from '@/components/landing/Reveal';
import { Link } from '@/lib/router';
import { useConfig } from '@/store/configStore';
import { ArrowRight, Rocket, Wallet, Network, TrendingUp, Award, Gift, CircleCheck as CheckCircle, ChevronDown, Users, Crown, Diamond, Star, Sparkles, Zap, Shield, Target, ChartBar as BarChart3, ShoppingBag } from 'lucide-react';
import { cn } from '@/lib/utils';

const rankIcons: Record<string, typeof Crown> = {
  Bronce: Star, Plata: Star, Oro: Star, Platino: Star, Diamante: Diamond, Corona: Crown,
};

const steps = [
  { icon: Users, title: 'Regístrate gratis', desc: 'Crea tu cuenta en menos de 2 minutos. Sin tarjeta de crédito ni compromisos.', step: '01' },
  { icon: Target, title: 'Elige tu plan', desc: 'Selecciona el plan que se ajuste a tus objetivos. Empieza gratis y escala cuando quieras.', step: '02' },
  { icon: Network, title: 'Construye tu red', desc: 'Invita afiliados con tu enlace de referido. El árbol genealógico se actualiza en tiempo real.', step: '03' },
  { icon: Wallet, title: 'Cobra tus comisiones', desc: 'Vende productos, sube de rango y cobra vía Yape, Plin o transferencia. Todo automático.', step: '04' },
];

const faqs = [
  { q: '¿Necesito experiencia previa para empezar?', a: 'No. La plataforma está diseñada para principiantes y expertos. Incluye tutoriales, guías y soporte para que empieces desde cero.' },
  { q: '¿Cuánto puedo ganar?', a: 'Depende de tu red y volumen de ventas. Las comisiones directas, binarias y de rango se acumulan. No hay límite de ingresos.' },
  { q: '¿Cuándo cobro mis comisiones?', a: 'Las comisiones se acreditan en menos de 60 segundos tras cada venta. Puedes retirarlas cuando quieras vía Yape, Plin o transferencia bancaria.' },
  { q: '¿Hay algún costo oculto?', a: 'No. Empiezas con una cuenta gratuita. Solo pagas si decides upgrading a un plan de pago, y siempre ves exactamente qué estás recibiendo.' },
  { q: '¿Puedo gestionar todo desde mi celular?', a: 'Sí. La plataforma es 100% responsive. Gestionas tu red, ves comisiones y realizas operaciones desde cualquier dispositivo.' },
  { q: '¿Qué pasa si no consigo afiliados?', a: 'Ofrecemos herramientas de marketing, scripts de venta y tutoriales para ayudarte. Además, nuestro equipo de soporte está disponible para guiarte.' },
];

export default function EmpresaPage() {
  const { company, ranks, plans, currencySymbol } = useConfig();
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const activeRanks = ranks.filter(r => r.is_active);
  const activePlans = plans.filter(p => p.is_active);
  const companyName = company.company_name || 'MLM 360';
  const commissionDirect = company.commission_direct || '7';
  const commissionBinary = company.commission_binary || '4';
  const commissionUnilevel = company.commission_unilevel || '2';

  const faqLeft = faqs.slice(0, Math.ceil(faqs.length / 2));
  const faqRight = faqs.slice(Math.ceil(faqs.length / 2));

  const commissions = [
    { icon: Wallet, label: 'Directa', value: `${commissionDirect}%`, desc: 'Por cada venta de tu red directa', color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
    { icon: Network, label: 'Binaria', value: `${commissionBinary}%`, desc: 'Sobre el volumen de tu pata menor', color: 'text-primary', bg: 'bg-primary/10' },
    { icon: TrendingUp, label: 'Unilevel', value: `${commissionUnilevel}%`, desc: 'Por niveles de profundidad', color: 'text-amber-500', bg: 'bg-amber-500/10' },
  ];

  const whatYouGet = [
    { icon: BarChart3, title: 'Dashboard en tiempo real', desc: 'Métricas de volumen, comisiones y crecimiento a un clic.' },
    { icon: Network, title: 'Árbol genealógico interactivo', desc: 'Visualiza tu red con zoom, filtros y exportación.' },
    { icon: Wallet, title: 'Cobro instantáneo', desc: 'Yape, Plin o transferencia. Menos de 60 segundos.' },
    { icon: Award, title: 'Sistema de rangos y bonos', desc: 'Desde Bronce hasta Corona, cada nivel suma ingresos.' },
    { icon: ShoppingBag, title: 'Tienda integrada', desc: 'Productos físicos y digitales con comisión automática.' },
    { icon: Shield, title: 'Seguridad bancaria', desc: 'Cifrado de extremo a extremo y RLS en cada consulta.' },
  ];

  return (
    <>
      {/* ── Hero ── */}
      <section className="relative pt-28 pb-10 sm:pb-14 overflow-hidden">
        <div className="absolute inset-0 bg-grid opacity-[0.25] mask-fade-top pointer-events-none dark:opacity-[0.1]" />
        <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[400px] rounded-full bg-primary/8 blur-[130px] pointer-events-none" />
        <div className="relative max-w-[1100px] mx-auto px-4 sm:px-6 lg:px-8">
          <Reveal>
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary/8 border border-primary/15 text-xs font-medium text-primary mb-5">
              <Rocket className="w-3.5 h-3.5" />
              Oportunidad de negocio
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground tracking-tight mb-4 leading-[1.05] max-w-3xl">
              Construye tu red.<br className="hidden sm:block" /> <span className="text-gradient-animated">Cobra en segundos.</span>
            </h1>
            <p className="text-base sm:text-lg text-muted-foreground/70 max-w-xl leading-relaxed mb-7">
              {companyName} te da las herramientas profesionales para crecer tu red de afiliados: comisiones automáticas, tienda integrada y soporte real. Sin letra pequeña.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Link to="/registro" className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-primary text-white font-semibold rounded-xl hover:bg-primary/90 transition-all text-sm shadow-lg shadow-primary/20">
                Empezar gratis <ArrowRight className="w-4 h-4" />
              </Link>
              <Link to="/planes" className="inline-flex items-center justify-center gap-2 px-6 py-3 border border-border/40 text-foreground font-medium rounded-xl hover:bg-muted/50 transition-all text-sm">
                Ver planes
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── Stats bento ── */}
      <section className="pb-6">
        <div className="max-w-[1100px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {[
              { value: `${activeRanks.length}`, label: 'Rangos', icon: Award },
              { value: `${activePlans.length}`, label: 'Planes', icon: Target },
              { value: '<60s', label: 'Acreditación', icon: Zap },
              { value: '24/7', label: 'Soporte', icon: Shield },
            ].map((s, i) => (
              <Reveal key={s.label} delay={i * 50}>
                <div className="border border-border/20 rounded-xl p-4 sm:p-5 text-center">
                  <div className="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-primary/10 mb-2.5">
                    <s.icon className="w-4.5 h-4.5 text-primary" />
                  </div>
                  <div className="text-2xl font-bold text-foreground leading-none">{s.value}</div>
                  <div className="text-xs text-muted-foreground/60 mt-1">{s.label}</div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Cómo ganas (commissions bento) ── */}
      <section className="py-10 sm:py-14">
        <div className="max-w-[1100px] mx-auto px-4 sm:px-6 lg:px-8">
          <Reveal className="mb-8">
            <span className="text-xs font-semibold text-primary uppercase tracking-widest mb-2 block">Cómo ganas</span>
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground tracking-tight mb-2">Tres formas de <span className="text-gradient-animated">ingresar</span></h2>
            <p className="text-muted-foreground/70 text-sm sm:text-base max-w-md">Comisiones calculadas y acreditadas en tiempo real. Sin cálculos manuales.</p>
          </Reveal>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {commissions.map((c, i) => (
              <Reveal key={c.label} delay={i * 60}>
                <div className="border border-border/20 rounded-2xl p-6 h-full transition-all hover:border-border/40">
                  <div className={cn('w-11 h-11 rounded-xl flex items-center justify-center mb-4', c.bg)}>
                    <c.icon className={cn('w-5 h-5', c.color)} />
                  </div>
                  <div className="text-3xl font-bold text-foreground leading-none mb-1">{c.value}</div>
                  <div className="text-sm font-semibold text-foreground mb-1.5">{c.label}</div>
                  <div className="text-xs text-muted-foreground/60 leading-relaxed">{c.desc}</div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Cómo empezar (steps) ── */}
      <section className="py-10 sm:py-14 border-y border-border/20 bg-muted/15">
        <div className="max-w-[1100px] mx-auto px-4 sm:px-6 lg:px-8">
          <Reveal className="mb-8">
            <span className="text-xs font-semibold text-primary uppercase tracking-widest mb-2 block">Cómo empezar</span>
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground tracking-tight mb-2">En 4 pasos <span className="text-gradient-animated">simples</span></h2>
            <p className="text-muted-foreground/70 text-sm sm:text-base max-w-md">De cero a tu primera comisión en menos de un día.</p>
          </Reveal>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {steps.map((s, i) => (
              <Reveal key={s.title} delay={i * 60}>
                <div className="relative border border-border/20 rounded-2xl p-5 h-full">
                  <span className="absolute top-4 right-4 text-3xl font-bold text-primary/10 leading-none">{s.step}</span>
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                    <s.icon className="w-5 h-5 text-primary" />
                  </div>
                  <h3 className="font-bold text-foreground text-sm mb-1.5">{s.title}</h3>
                  <p className="text-xs text-muted-foreground/60 leading-relaxed">{s.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Qué recibes (bento grid) ── */}
      <section className="py-10 sm:py-14">
        <div className="max-w-[1100px] mx-auto px-4 sm:px-6 lg:px-8">
          <Reveal className="mb-8">
            <span className="text-xs font-semibold text-primary uppercase tracking-widest mb-2 block">Qué recibes</span>
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground tracking-tight mb-2">Todo incluido <span className="text-gradient-animated">desde el día 1</span></h2>
            <p className="text-muted-foreground/70 text-sm sm:text-base max-w-md">Herramientas profesionales que antes solo tenían las grandes empresas.</p>
          </Reveal>

          {/* Bento: first item large, rest smaller */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Large card spanning 2 cols on lg */}
            <Reveal className="lg:col-span-2 lg:row-span-1">
              <div className="border border-border/20 rounded-2xl p-6 sm:p-8 h-full bg-gradient-to-br from-primary/5 to-transparent">
                <div className="flex items-start gap-5">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <BarChart3 className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-foreground mb-2">Dashboard en tiempo real</h3>
                    <p className="text-sm text-muted-foreground/70 leading-relaxed mb-4">Métricas de volumen, comisiones, red activa y crecimiento mensual. Todo actualizado al instante, accesible desde cualquier dispositivo.</p>
                    <div className="flex flex-wrap gap-2">
                      {['Volumen', 'Comisiones', 'Red activa', 'Crecimiento'].map(tag => (
                        <span key={tag} className="px-2.5 py-1 rounded-full bg-primary/8 text-[11px] font-medium text-primary">{tag}</span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </Reveal>

            {/* Small cards */}
            {whatYouGet.slice(1).map((item, i) => (
              <Reveal key={item.title} delay={i * 50}>
                <div className="border border-border/20 rounded-2xl p-5 h-full transition-all hover:border-border/40">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-3.5">
                    <item.icon className="w-5 h-5 text-primary" />
                  </div>
                  <h3 className="font-bold text-foreground text-sm mb-1.5">{item.title}</h3>
                  <p className="text-xs text-muted-foreground/60 leading-relaxed">{item.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Rangos (from DB) ── */}
      {activeRanks.length > 0 && (
        <section className="py-10 sm:py-14 border-y border-border/20 bg-muted/15">
          <div className="max-w-[1100px] mx-auto px-4 sm:px-6 lg:px-8">
            <Reveal className="mb-8">
              <span className="text-xs font-semibold text-primary uppercase tracking-widest mb-2 block">Rangos</span>
              <h2 className="text-3xl sm:text-4xl font-bold text-foreground tracking-tight mb-2">Del Bronce a la <span className="text-gradient-animated">Corona</span></h2>
              <p className="text-muted-foreground/70 text-sm sm:text-base max-w-md">Cada rango desbloquea bonos exclusivos. Estos son los rangos activos en la plataforma.</p>
            </Reveal>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {activeRanks.map((rank, i) => {
                const RankIcon = rankIcons[rank.name] || Star;
                return (
                  <Reveal key={rank.id} delay={i * 40}>
                    <div className="border border-border/20 rounded-xl p-4 text-center h-full flex flex-col">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
                        <RankIcon className={cn('w-5 h-5', rank.color || 'text-primary')} />
                      </div>
                      <div className="text-sm font-bold text-foreground">{rank.name}</div>
                      <div className="text-xs text-muted-foreground/50 mt-0.5 mb-2">{rank.min_affiliates} afiliados</div>
                      <div className="mt-auto pt-2 border-t border-border/20">
                        <div className="text-[10px] text-muted-foreground/50">Bono</div>
                        <div className="text-sm font-bold text-primary">{currencySymbol} {Number(rank.bonus).toLocaleString()}</div>
                      </div>
                    </div>
                  </Reveal>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* ── Resultados ── */}
      <section className="py-10 sm:py-14">
        <div className="max-w-[1100px] mx-auto px-4 sm:px-6 lg:px-8">
          <Reveal className="mb-8">
            <span className="text-xs font-semibold text-primary uppercase tracking-widest mb-2 block">Resultados</span>
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground tracking-tight mb-2">Lo que puedes <span className="text-gradient-animated">lograr</span></h2>
            <p className="text-muted-foreground/70 text-sm sm:text-base max-w-md">Resultados reales de afiliados que empezaron desde cero.</p>
          </Reveal>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { value: '+1,200', label: 'Afiliados activos', desc: 'En la plataforma hoy', icon: Users, color: 'text-primary', bg: 'bg-primary/10' },
              { value: '<60s', label: 'Acreditación', desc: 'De cada comisión', icon: Zap, color: 'text-amber-500', bg: 'bg-amber-500/10' },
              { value: '99.9%', label: 'Uptime', desc: 'Plataforma disponible', icon: Shield, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
            ].map((r, i) => (
              <Reveal key={r.label} delay={i * 60}>
                <div className="border border-border/20 rounded-2xl p-6 h-full">
                  <div className={cn('w-11 h-11 rounded-xl flex items-center justify-center mb-4', r.bg)}>
                    <r.icon className={cn('w-5 h-5', r.color)} />
                  </div>
                  <div className="text-3xl font-bold text-foreground leading-none mb-1.5">{r.value}</div>
                  <div className="text-sm font-semibold text-foreground mb-0.5">{r.label}</div>
                  <div className="text-xs text-muted-foreground/60">{r.desc}</div>
                </div>
              </Reveal>
            ))}
          </div>

          {/* Highlight strip */}
          <Reveal delay={100}>
            <div className="mt-4 border border-border/20 rounded-2xl p-6 sm:p-8 bg-gradient-to-r from-primary/5 to-transparent flex flex-col sm:flex-row items-start sm:items-center gap-5 justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center shrink-0">
                  <Gift className="w-6 h-6 text-amber-500" />
                </div>
                <div>
                  <h3 className="font-bold text-foreground mb-0.5">Cuenta gratuita, sin permanencia</h3>
                  <p className="text-sm text-muted-foreground/60">Empieza hoy sin pagar nada. Escala cuando tu red lo necesite.</p>
                </div>
              </div>
              <Link to="/registro" className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-white font-semibold rounded-xl hover:bg-primary/90 transition-all text-sm shrink-0">
                Crear cuenta <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="py-16 sm:py-24 border-t border-border/20 bg-muted/15">
        <div className="max-w-[1100px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-10 sm:mb-14">
            <span className="text-xs font-semibold text-primary uppercase tracking-widest mb-3 block">FAQ</span>
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground tracking-tight mb-3">
              Preguntas <span className="text-gradient-animated">frecuentes</span>
            </h2>
            <p className="text-muted-foreground/70 text-sm sm:text-base max-w-md">
              Las dudas más comunes antes de empezar. Si tienes más, escríbenos.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-8 lg:gap-x-12">
            <div>
              {faqLeft.map((faq) => {
                const i = faqs.indexOf(faq);
                return (
                  <div key={i} className={cn('border-b border-border/20', i === 0 && 'border-t border-border/20')}>
                    <button onClick={() => setOpenFaq(openFaq === i ? null : i)}
                      className="w-full flex items-center justify-between py-5 text-left gap-4 group">
                      <span className={cn('text-sm sm:text-[15px] leading-snug transition-colors',
                        openFaq === i ? 'font-semibold text-foreground' : 'font-medium text-foreground/70 group-hover:text-foreground')}>
                        {faq.q}
                      </span>
                      <div className={cn('w-6 h-6 rounded-full flex items-center justify-center shrink-0 transition-all duration-200',
                        openFaq === i ? 'bg-primary/10 text-primary' : 'text-muted-foreground/40 group-hover:text-foreground/60')}>
                        <ChevronDown className={cn('w-3.5 h-3.5 transition-transform duration-300', openFaq === i && 'rotate-180')} />
                      </div>
                    </button>
                    <div className={cn('overflow-hidden transition-all duration-300 ease-in-out', openFaq === i ? 'max-h-96 pb-5' : 'max-h-0')}>
                      <p className="text-sm sm:text-[15px] text-muted-foreground leading-relaxed">{faq.a}</p>
                    </div>
                  </div>
                );
              })}
            </div>
            <div>
              {faqRight.map((faq) => {
                const i = faqs.indexOf(faq);
                const isFirst = faqRight[0] === faq;
                return (
                  <div key={i} className={cn('border-b border-border/20', isFirst && 'border-t border-border/20')}>
                    <button onClick={() => setOpenFaq(openFaq === i ? null : i)}
                      className="w-full flex items-center justify-between py-5 text-left gap-4 group">
                      <span className={cn('text-sm sm:text-[15px] leading-snug transition-colors',
                        openFaq === i ? 'font-semibold text-foreground' : 'font-medium text-foreground/70 group-hover:text-foreground')}>
                        {faq.q}
                      </span>
                      <div className={cn('w-6 h-6 rounded-full flex items-center justify-center shrink-0 transition-all duration-200',
                        openFaq === i ? 'bg-primary/10 text-primary' : 'text-muted-foreground/40 group-hover:text-foreground/60')}>
                        <ChevronDown className={cn('w-3.5 h-3.5 transition-transform duration-300', openFaq === i && 'rotate-180')} />
                      </div>
                    </button>
                    <div className={cn('overflow-hidden transition-all duration-300 ease-in-out', openFaq === i ? 'max-h-96 pb-5' : 'max-h-0')}>
                      <p className="text-sm sm:text-[15px] text-muted-foreground leading-relaxed">{faq.a}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="relative py-20 sm:py-28 overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-20 sm:h-28 bg-gradient-to-b from-background to-transparent z-20 pointer-events-none" />
        <div className="absolute bottom-0 left-0 right-0 h-20 sm:h-28 bg-gradient-to-t from-background to-transparent z-20 pointer-events-none" />
        <div className="absolute inset-0 bg-grid opacity-[0.15] mask-fade-center pointer-events-none" />
        <div className="absolute top-[-20%] left-1/2 -translate-x-1/2 w-[600px] h-[450px] rounded-full bg-primary/10 blur-[120px] pointer-events-none" />

        <div className="relative z-10 max-w-[680px] mx-auto px-4 sm:px-6 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-muted/30 border border-border/40 rounded-full text-xs font-medium text-muted-foreground dark:bg-white/5 dark:border-white/10 dark:text-white/55 mb-6 sm:mb-8 backdrop-blur-md">
            <Sparkles className="w-3.5 h-3.5 text-primary" />
            Sin tarjeta de crédito
          </div>
          <h2 className="text-4xl sm:text-5xl font-bold text-foreground mb-3 leading-[1.05] tracking-tight">
            Tu oportunidad no espera.
          </h2>
          <p className="text-2xl sm:text-3xl font-bold mb-4 text-gradient-animated">
            Empieza hoy mismo.
          </p>
          <p className="text-sm sm:text-base text-muted-foreground/70 max-w-md mx-auto mb-10 leading-relaxed">
            Únete a los afiliados que ya construyen libertad financiera con {companyName}.
          </p>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3">
            <Link to="/registro" className="inline-flex items-center justify-center gap-2 px-7 sm:px-9 py-4 bg-foreground text-background font-semibold rounded-xl hover:opacity-90 active:scale-[0.98] transition-all shadow-2xl shadow-black/20 text-base">
              Crear cuenta gratis <ArrowRight className="w-5 h-5" />
            </Link>
            <Link to="/contacto" className="inline-flex items-center justify-center gap-2 px-7 sm:px-9 py-4 bg-muted/30 border border-border/40 text-foreground dark:bg-white/5 dark:border-white/10 font-medium rounded-xl hover:bg-muted/50 transition-all backdrop-blur-md text-base">
              Hablar con un asesor
            </Link>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 text-xs sm:text-sm text-muted-foreground/55 mt-10">
            {['Cuenta gratuita', 'Sin permanencia', 'Cobro en 60s', 'Soporte 24/7'].map(t => (
              <span key={t} className="flex items-center gap-1.5"><CheckCircle className="w-3.5 h-3.5 text-muted-foreground/70" /> {t}</span>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
