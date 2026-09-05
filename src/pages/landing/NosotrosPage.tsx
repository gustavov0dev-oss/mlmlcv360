import { Link } from '@/lib/router';
import { ArrowRight, Target, Award, HeartHandshake, Globe, Rocket, TrendingUp, Building2, Sparkles, Shield, Lock, Cpu, Cloud, Database, Zap } from 'lucide-react';
import { useConfig } from '@/store/configStore';
import { cn } from '@/lib/utils';

const timeline = [
  { year: '2020', title: 'Fundacion', desc: 'Lima, Peru. Un equipo de 3 personas con una vision: democratizar el MLM.', icon: Rocket },
  { year: '2021', title: 'Validacion', desc: '+1,000 afiliados. Primeros pagos de comisiones automatizadas.', icon: TrendingUp },
  { year: '2022', title: 'Expansion regional', desc: 'Presencia en Colombia, Ecuador y Bolivia. +5,000 afiliados.', icon: Globe },
  { year: '2023', title: 'Tienda MLM', desc: 'Marketplace propio con +200 productos y comisiones integradas.', icon: Building2 },
  { year: '2024', title: 'Liderazgo', desc: '+12,000 afiliados. S/2.8M en comisiones pagadas. 8 paises.', icon: Award },
];

const infra = [
  { icon: Cloud, title: 'Cloud nativo', desc: 'Infraestructura serverless en Supabase Edge Functions con auto-scaling.' },
  { icon: Shield, title: 'Seguridad bancaria', desc: 'Cifrado AES-256, RLS por usuario y auditoria de transacciones.' },
  { icon: Database, title: 'PostgreSQL + RLS', desc: 'Base de datos transaccional con Row Level Security en cada tabla.' },
  { icon: Cpu, title: 'Calculo en tiempo real', desc: 'Motor de comisiones binario + unilevel con triggers PostgreSQL.' },
  { icon: Lock, title: 'Cumplimiento legal', desc: 'INDECOPI, facturacion electronica y retenciones automaticas.' },
  { icon: Zap, title: '99.9% uptime', desc: 'Monitoreo proactivo, failover automatico y backups cada hora.' },
];

const founders = [
  {
    name: 'Jhonatan Arias',
    role: 'CEO Fundador',
    bio: 'Especialista en innovacion y tecnologia digital, enfocado en la creacion de soluciones modernas que integren negocios, emprendimiento y transformacion digital.',
    img: 'https://cluv360.com/wp-content/uploads/2026/05/JA2-980x1472.png',
  },
  {
    name: 'Yesenia Cure',
    role: 'CEO & Cofundadora',
    bio: 'Lider enfocada en el crecimiento organizacional y el desarrollo estrategico de la compania, impulsando oportunidades que generen bienestar y prosperidad.',
    img: 'https://cluv360.com/wp-content/uploads/2026/05/YC-980x1472.png',
  },
  {
    name: 'Cirilo Jara',
    role: 'CEO & Cofundador',
    bio: 'Ejecutivo orientado al liderazgo comercial y la expansion empresarial, con foco en crecimiento sostenible y fortalecimiento de la red de negocios.',
    img: 'https://cluv360.com/wp-content/uploads/2026/05/CJ-980x1472.png',
  },
];

const values = [
  { icon: Target, label: 'Mision', text: 'Democratizar las oportunidades de negocio en Latinoamerica mediante tecnologia MLM de vanguardia que empodera a cualquier persona.' },
  { icon: Award, label: 'Vision', text: 'Ser la plataforma MLM empresarial lider en Latinoamerica para 2028, con presencia en 20 paises y 50,000 afiliados activos.' },
  { icon: HeartHandshake, label: 'Valores', text: 'Transparencia radical. Integridad sin compromisos. Innovacion constante. Exito compartido con cada afiliado.' },
];

export default function NosotrosPage() {
  const { company } = useConfig();
  const companyName = company.company_name || 'MLM 360';

  return (
    <>
      {/* HERO */}
      <section className="relative pt-28 pb-10 sm:pb-12 overflow-hidden">
        <div className="absolute inset-0 bg-grid opacity-[0.25] mask-fade-top pointer-events-none dark:opacity-[0.1]" />
        <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[400px] rounded-full bg-primary/8 blur-[130px] pointer-events-none" />
        <div className="relative max-w-[1100px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="inline-flex items-center gap-2 text-xs font-semibold text-primary uppercase tracking-widest mb-5">
            <Sparkles className="w-3.5 h-3.5" />
            Desde Lima para Latinoamerica
          </div>

          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground tracking-tight mb-4 leading-[1.1] max-w-2xl">
            Empoderamos a <span className="text-gradient-animated">emprendedores</span> latinos
          </h1>

          <p className="text-base sm:text-lg text-muted-foreground/80 max-w-xl leading-relaxed mb-10">
            Construimos tecnologia que genera libertad financiera real. Nuestra plataforma automatiza lo dificil para que te enfoques en lo importante: tu red.
          </p>

          <p className="text-sm sm:text-base text-muted-foreground/80 leading-relaxed max-w-2xl">
            {companyName} es una empresa orientada al desarrollo tecnologico, financiero y comercial, creada para construir un ecosistema digital que impulse la prosperidad de sus socios y embajadores. A traves de soluciones integradas -red social, billetera digital, comercio electronico, inversiones y proyectos inmobiliarios- buscamos generar oportunidades reales de desarrollo economico, con un modelo de crecimiento sostenible, global y de exito compartido.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 mt-7">
            <Link
              to="/registro"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-foreground/90 text-background font-semibold rounded-xl hover:opacity-90 transition-opacity text-sm"
            >
              Unete hoy <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              to="/contacto"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 border border-border/40 text-foreground font-medium rounded-xl hover:border-primary/40 hover:text-primary transition-colors text-sm"
            >
              Contactanos
            </Link>
          </div>
        </div>
      </section>

      {/* MISION / VISION / VALORES */}
      <section className="py-14 sm:py-20">
        <div className="max-w-[1100px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 sm:grid-cols-3 sm:-mx-8">
            {values.map((v, i) => (
              <div
                key={v.label}
                className={cn(
                  'py-8 sm:py-0 sm:px-8',
                  i > 0 && 'border-t sm:border-t-0 sm:border-l border-border/20',
                )}
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <v.icon className="w-4 h-4 text-primary" strokeWidth={1.75} />
                  </div>
                  <h3 className="font-bold text-lg text-foreground">{v.label}</h3>
                </div>
                <p className="text-muted-foreground leading-relaxed text-sm max-w-sm">{v.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TIMELINE */}
      <section className="py-14 sm:py-20">
        <div className="max-w-[1100px] mx-auto px-4 sm:px-6 lg:px-8">
          <span className="text-xs font-semibold text-primary uppercase tracking-widest mb-3 block">Nuestra historia</span>
          <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground tracking-tight mb-2 max-w-xl">
            De una idea a la plataforma <span className="text-gradient-animated">lider en Latinoamerica</span>
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground/80 max-w-xl mb-10">Los hitos que marcaron el crecimiento de {companyName}.</p>
        </div>

        <div className="relative">
          <div className="absolute left-0 top-0 bottom-4 w-8 sm:w-16 bg-gradient-to-r from-background to-transparent z-10 pointer-events-none" />
          <div className="absolute right-0 top-0 bottom-4 w-8 sm:w-16 bg-gradient-to-l from-background to-transparent z-10 pointer-events-none" />
          <div className="flex gap-8 overflow-x-auto pb-4 scrollbar-hide snap-x snap-mandatory max-w-[1100px] mx-auto px-4 sm:px-6 lg:px-8">
            {timeline.map((item, i) => (
              <div
                key={item.year}
                className={
                  'shrink-0 w-[220px] sm:w-[240px] snap-start ' +
                  (i > 0 ? 'border-l border-border/20 pl-8' : '')
                }
              >
                <div className="flex items-center gap-2 mb-2.5">
                  <item.icon className="w-4 h-4 text-primary shrink-0" strokeWidth={1.75} />
                  <span className="text-xs font-semibold text-muted-foreground/70 tabular-nums">{item.year}</span>
                </div>
                <h3 className="font-bold text-base text-foreground mb-1.5">{item.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* INFRAESTRUCTURA */}
      <section className="py-14 sm:py-20">
        <div className="max-w-[1100px] mx-auto px-4 sm:px-6 lg:px-8">
          <span className="text-xs font-semibold text-primary uppercase tracking-widest mb-3 block">Infraestructura</span>
          <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground tracking-tight mb-2 max-w-xl">
            Tecnologia <span className="text-gradient-animated">de nivel empresarial</span>
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground/80 max-w-xl mb-12">Construido sobre las mejores herramientas. Cada componente es production-ready.</p>

          <div className="grid grid-cols-1 sm:grid-cols-3 sm:-mx-8">
            {infra.map((item, i) => (
              <div
                key={item.title}
                className={cn(
                  'py-6 sm:py-8 sm:px-8 border-t sm:border-t-0 border-border/20',
                  i === 0 && 'border-t-0',
                  i % 3 !== 0 && 'sm:border-l sm:border-border/20',
                  i >= 3 && 'sm:border-t sm:border-border/20',
                )}
              >
                <div className="flex items-center gap-2.5 mb-2.5">
                  <item.icon className="w-4.5 h-4.5 text-primary shrink-0" strokeWidth={1.75} />
                  <h3 className="font-bold text-foreground">{item.title}</h3>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FUNDADORES */}
      <section className="py-14 sm:py-20">
        <div className="max-w-[1100px] mx-auto px-4 sm:px-6 lg:px-8">
          <span className="text-xs font-semibold text-primary uppercase tracking-widest mb-3 block">Liderazgo</span>
          <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground tracking-tight mb-2 max-w-xl">
            El equipo detras de <span className="text-gradient-animated">{companyName}</span>
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground/80 max-w-xl mb-12">Fundadores comprometidos con la transparencia y el crecimiento de cada socio.</p>

          <div className="grid grid-cols-1 sm:grid-cols-3 sm:-mx-8">
            {founders.map((f, i) => (
              <div
                key={f.name}
                className={cn(
                  'py-8 sm:py-0 sm:px-8',
                  i > 0 && 'border-t sm:border-t-0 sm:border-l border-border/20',
                )}
              >
                <div className="aspect-[4/5] overflow-hidden bg-muted mb-5">
                  <img src={f.img} alt={f.name} className="w-full h-full object-cover" />
                </div>
                <h3 className="font-bold text-foreground leading-tight">{f.name}</h3>
                <div className="text-xs font-semibold text-primary uppercase tracking-wide mt-0.5 mb-3">{f.role}</div>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.bio}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* INFORMACION LEGAL */}
      <section className="py-14 sm:py-20">
        <div className="max-w-[1100px] mx-auto px-4 sm:px-6 lg:px-8">
          <span className="text-xs font-semibold text-primary uppercase tracking-widest mb-3 block">Informacion legal</span>
          <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground tracking-tight mb-2 max-w-xl">
            Empresa registrada con <span className="text-gradient-animated">transparencia total</span>
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground/80 max-w-xl mb-12">Estos son nuestros datos oficiales de contacto y constitucion.</p>

          <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-border/20">
            <div className="space-y-7 md:pr-10">
              <div>
                <div className="text-xs font-semibold text-muted-foreground/70 uppercase tracking-wide mb-2">Razon social</div>
                <div className="font-bold text-lg text-foreground">{company.razon_social || 'CLUV360 S.A.'}</div>
              </div>
              <div>
                <div className="text-xs font-semibold text-muted-foreground/70 uppercase tracking-wide mb-2">RUC</div>
                <div className="font-bold text-lg text-foreground">{company.ruc || '20603456789'}</div>
              </div>
              <div>
                <div className="text-xs font-semibold text-muted-foreground/70 uppercase tracking-wide mb-2">Pais de origen</div>
                <div className="font-bold text-lg text-foreground">Peru</div>
              </div>
            </div>
            <div className="space-y-7 pt-7 md:pt-0 md:pl-10">
              <div>
                <div className="text-xs font-semibold text-muted-foreground/70 uppercase tracking-wide mb-2">Direccion</div>
                <div className="font-semibold text-foreground leading-relaxed">{company.address || 'Manuel Asencio Segura 211, Los Olivos, Lima, Peru'}</div>
              </div>
              <div>
                <div className="text-xs font-semibold text-muted-foreground/70 uppercase tracking-wide mb-2">Email</div>
                <div className="font-semibold text-foreground">{company.contact_email || 'info@cluv360.com'}</div>
              </div>
              <div>
                <div className="text-xs font-semibold text-muted-foreground/70 uppercase tracking-wide mb-2">Telefono</div>
                <div className="font-semibold text-foreground">{company.phone || '+51 916 085 797'}</div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}