import { Link } from '@/lib/router';
import { useConfig } from '@/store/configStore';
import {
  Rocket,
  ArrowRight,
  GraduationCap,
  Home,
  Briefcase,
  ShieldCheck,
  Headphones,
  Users,
  Lightbulb,
  TrendingUp,
  Check,
  X as XIcon,
} from 'lucide-react';

const values = [
  { icon: ShieldCheck, title: 'Transparencia', desc: 'Sin letra pequeña ni comisiones escondidas.' },
  { icon: Lightbulb, title: 'Innovación', desc: 'Tecnología que resuelve lo que otros MLM ignoran.' },
  { icon: Users, title: 'Comunidad', desc: 'Creces acompañado, no solo.' },
  { icon: TrendingUp, title: 'Crecimiento real', desc: 'Resultados medibles, no promesas vacías.' },
];

const profiles = [
  { icon: Rocket, title: 'Emprendedores en potencia', desc: 'Quieres construir algo propio sin arriesgar un capital grande.' },
  { icon: GraduationCap, title: 'Estudiantes', desc: 'Buscas un ingreso flexible que se adapte a tu horario de clases.' },
  { icon: Home, title: 'Trabajo desde casa', desc: 'Quieres generar ingresos sin salir de tu casa, en tus tiempos libres.' },
  { icon: Briefcase, title: 'Profesionales', desc: 'Buscas un ingreso adicional fuera de tu trabajo actual.' },
];

const comparisonRows = [
  { label: 'Tu ingreso depende solo de tus horas trabajadas', traditional: true, cluv: false },
  { label: 'Puedes ganar por el esfuerzo de todo tu equipo', traditional: false, cluv: true },
  { label: 'Tú decides tus propios horarios', traditional: false, cluv: true },
  { label: 'El negocio es tuyo, no de un jefe', traditional: false, cluv: true },
  { label: 'Necesitas años para subir de puesto', traditional: true, cluv: false },
  { label: 'Puedes empezar hoy mismo, sin experiencia previa', traditional: false, cluv: true },
];

const commitments = [
  { icon: GraduationCap, title: 'Capacitación continua', desc: 'Guías, tutoriales y mentoría para que nunca estés perdido.' },
  { icon: Headphones, title: 'Soporte real', desc: 'Personas respondiendo tus dudas, no un bot que da vueltas.' },
  { icon: ShieldCheck, title: 'Transparencia total', desc: 'Ves exactamente cómo y cuándo se calcula cada comisión.' },
  { icon: Users, title: 'Comunidad activa', desc: 'Una red de afiliados que comparte lo que le funciona.' },
];

export default function EmpresaPage() {
  const { company } = useConfig();
  const companyName = company.company_name || 'MLM 360';

  return (
    <>
      {/* ── Hero ── */}
      <section className="relative pt-28 pb-10 sm:pb-12 overflow-hidden">
        <div className="absolute inset-0 bg-grid opacity-[0.25] mask-fade-top pointer-events-none dark:opacity-[0.1]" />
        <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[400px] rounded-full bg-primary/8 blur-[130px] pointer-events-none" />
        <div className="relative max-w-[1100px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="inline-flex items-center gap-2 text-xs font-semibold text-primary uppercase tracking-widest mb-5">
            <Rocket className="w-3.5 h-3.5" />
            Oportunidad de negocio
          </div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground tracking-tight mb-4 leading-[1.1] max-w-2xl">
            Esto no es un empleo. <span className="text-gradient-animated">Es tu negocio.</span>
          </h1>
          <p className="text-base sm:text-lg text-muted-foreground/80 max-w-xl leading-relaxed">
            {companyName} te da la estructura, la tecnología y el respaldo para construir un ingreso propio, a tu ritmo y sin jefes.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 mt-7">
            <Link
              to="/registro"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-foreground/90 text-background font-semibold rounded-xl hover:opacity-90 transition-opacity text-sm"
            >
              Quiero empezar <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              to="/planes"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 border border-border/40 text-foreground font-medium rounded-xl hover:border-primary/40 hover:text-primary transition-colors text-sm"
            >
              Ver planes
            </Link>
          </div>
        </div>
      </section>

      {/* ── Video presentación ── */}
      <section className="py-10 sm:py-14">
        <div className="max-w-[1100px] mx-auto px-4 sm:px-6 lg:px-8">
          <span className="text-xs font-semibold text-primary uppercase tracking-widest mb-3 block">Conócenos</span>
          <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground tracking-tight mb-2">
            Mira de qué se trata <span className="text-gradient-animated">la oportunidad</span>
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground/80 max-w-xl mb-6">
            Unos minutos para entender cómo funciona el negocio y por qué miles ya están construyendo su red.
          </p>

          <div className="relative w-full aspect-video border border-border/40 rounded-lg overflow-hidden bg-black">
            <iframe
              src="https://www.youtube.com/embed/29Pthrvd-fM"
              title={`Presentación ${companyName}`}
              className="absolute inset-0 w-full h-full border-0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              loading="lazy"
            />
          </div>
        </div>
      </section>

      {/* ── Quiénes somos ── */}
      <section className="py-10 sm:py-14">
        <div className="max-w-[1100px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-14 items-start">
            <div>
              <span className="text-xs font-semibold text-primary uppercase tracking-widest mb-3 block">Quiénes somos</span>
              <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground tracking-tight mb-4">
                Una plataforma construida <span className="text-gradient-animated">para que ganes tú</span>
              </h2>
              <p className="text-sm sm:text-base text-muted-foreground/80 leading-relaxed mb-4">
                {companyName} nació para resolver un problema real: la mayoría de sistemas MLM son opacos, lentos para pagar y difíciles de entender. Construimos la tecnología que nosotros mismos quisiéramos usar como afiliados.
              </p>
              <p className="text-sm sm:text-base text-muted-foreground/80 leading-relaxed">
                Sin letra pequeña, sin comisiones escondidas y sin depender de un equipo de soporte que nunca responde.
              </p>
            </div>
            <div className="divide-y divide-border/20">
              {values.map((v) => (
                <div key={v.title} className="flex items-start gap-3.5 py-4 first:pt-0 last:pb-0">
                  <v.icon className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  <div>
                    <div className="text-sm font-semibold text-foreground mb-0.5">{v.title}</div>
                    <div className="text-xs text-muted-foreground/70 leading-relaxed">{v.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── ¿Para quién es esta oportunidad? ── */}
      <section className="py-10 sm:py-14">
        <div className="max-w-[1100px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <span className="text-xs font-semibold text-primary uppercase tracking-widest mb-3 block">¿Para quién es?</span>
            <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground tracking-tight mb-2">
              Esta oportunidad es <span className="text-gradient-animated">para ti si...</span>
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground/80 max-w-xl">
              No necesitas experiencia previa. Solo las ganas de construir algo propio.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-border/20">
            {profiles.map((p) => (
              <div
                key={p.title}
                className="py-6 sm:py-0 sm:px-8 first:pt-0 sm:first:pl-0 last:pb-0 sm:last:pr-0"
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <p.icon className="w-4 h-4 text-primary" />
                  </div>
                  <h3 className="font-bold text-foreground text-sm">{p.title}</h3>
                </div>
                <p className="text-xs text-muted-foreground/70 leading-relaxed">{p.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Empleo tradicional vs Cluv360 ── */}
      <section className="py-10 sm:py-14">
        <div className="max-w-[1100px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <span className="text-xs font-semibold text-primary uppercase tracking-widest mb-3 block">La diferencia</span>
            <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground tracking-tight mb-2">
              Empleo tradicional <span className="text-muted-foreground/40">vs</span>{' '}
              <span className="text-gradient-animated">{companyName}</span>
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground/80 max-w-xl">
              La diferencia no es solo el dinero. Es quién controla tu tiempo.
            </p>
          </div>

          {/* Wrapper relativo: una sola línea vertical absoluta cruza header + filas, solo en sm+ */}
          <div className="relative">
            <div className="hidden sm:block absolute inset-y-0 right-[140px] border-l border-border/20 pointer-events-none" />

            {/* Header */}
            <div className="grid grid-cols-[1fr_56px_56px] sm:grid-cols-[1fr_140px_140px] gap-x-3 sm:gap-x-8 pb-3 border-b border-border/30">
              <span className="text-[11px] font-semibold text-muted-foreground/60 uppercase tracking-wider flex items-center">
                Aspecto
              </span>
              <span className="text-[11px] font-semibold text-muted-foreground/60 uppercase tracking-wider flex items-center justify-center">
                Empleo
              </span>
              <span className="text-[11px] font-semibold text-primary uppercase tracking-wider flex items-center justify-center sm:pl-8">
                {companyName}
              </span>
            </div>

            {comparisonRows.map((row) => (
              <div
                key={row.label}
                className="grid grid-cols-[1fr_56px_56px] sm:grid-cols-[1fr_140px_140px] gap-x-3 sm:gap-x-8 py-3.5 border-b border-border/20 last:border-b-0"
              >
                <span className="text-xs sm:text-sm font-medium text-foreground/85 leading-snug pr-1 flex items-center">
                  {row.label}
                </span>
                <span className="flex items-center justify-center">
                  {row.traditional ? (
                    <Check className="w-4 h-4 text-muted-foreground/50" />
                  ) : (
                    <XIcon className="w-4 h-4 text-muted-foreground/25" />
                  )}
                </span>
                <span className="flex items-center justify-center sm:pl-8">
                  {row.cluv ? (
                    <Check className="w-4 h-4 text-primary" />
                  ) : (
                    <XIcon className="w-4 h-4 text-muted-foreground/25" />
                  )}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Nuestro compromiso ── */}
      <section className="py-10 sm:py-14">
        <div className="max-w-[1100px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <span className="text-xs font-semibold text-primary uppercase tracking-widest mb-3 block">Nuestro compromiso</span>
            <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground tracking-tight mb-2">
              No te dejamos <span className="text-gradient-animated">solo</span>
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground/80 max-w-xl">
              Construir una red toma esfuerzo. Nosotros ponemos las herramientas y el respaldo.
            </p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-y sm:divide-y-0 divide-border/20">
            {commitments.map((c) => (
              <div
                key={c.title}
                className="px-4 py-6 sm:px-6 sm:py-0 first:pl-0 sm:first:pl-0 last:pr-0 [&:nth-child(2)]:pr-0 sm:[&:nth-child(2)]:pr-6 [&:nth-child(3)]:pl-0 sm:[&:nth-child(3)]:pl-6"
              >
                <c.icon className="w-4.5 h-4.5 text-primary mb-3" />
                <div className="text-sm font-semibold text-foreground mb-1">{c.title}</div>
                <div className="text-xs text-muted-foreground/70 leading-relaxed">{c.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}