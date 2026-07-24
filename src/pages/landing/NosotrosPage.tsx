import Navbar from '@/components/landing/Navbar';
import Footer from '@/components/landing/Footer';
import { Link } from '@/lib/router';
import { ArrowRight, Target, Award, HeartHandshake, Users, TrendingUp, Globe, Rocket, Zap, Building2, MapPin, Phone, Mail, Sparkles, Shield, Lock, Cpu, Cloud, Database, CircleCheck as CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useConfig } from '@/store/configStore';

const timeline = [
  { year: '2020', title: 'Fundacion', desc: 'Lima, Peru. Un equipo de 3 personas con una vision: democratizar el MLM.', icon: Rocket, iconClass: 'icon-sky' },
  { year: '2021', title: 'Validacion', desc: '+1,000 afiliados. Primeros pagos de comisiones automatizadas.', icon: TrendingUp, iconClass: 'icon-emerald' },
  { year: '2022', title: 'Expansion regional', desc: 'Presencia en Colombia, Ecuador y Bolivia. +5,000 afiliados.', icon: Globe, iconClass: 'icon-blue' },
  { year: '2023', title: 'Tienda MLM', desc: 'Marketplace propio con +200 productos y comisiones integradas.', icon: Building2, iconClass: 'icon-amber' },
  { year: '2024', title: 'Liderazgo', desc: '+12,000 afiliados. S/2.8M en comisiones pagadas. 8 paises.', icon: Award, iconClass: 'icon-primary' },
];

const team = [
  { name: 'Carlos Mendoza', role: 'CEO & Fundador', bio: '10 años en MLM, ex-director comercial de multinacional.', img: 'https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg?auto=compress&cs=tinysrgb&w=400' },
  { name: 'Ana Rodriguez', role: 'CTO', bio: 'Ex-Amazon, especialista en sistemas escalables.', img: 'https://images.pexels.com/photos/1181690/pexels-photo-1181690.jpeg?auto=compress&cs=tinysrgb&w=400' },
  { name: 'Luis Garcia', role: 'Director Comercial', bio: 'Experto en redes de afiliados, +500 entrenamientos.', img: 'https://images.pexels.com/photos/1043471/pexels-photo-1043471.jpeg?auto=compress&cs=tinysrgb&w=400' },
  { name: 'Maria Torres', role: 'Head of Growth', bio: 'Especialista en adquisicion y retencion de usuarios.', img: 'https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?auto=compress&cs=tinysrgb&w=400' },
];

const infra = [
  { icon: Cloud, title: 'Cloud nativo', desc: 'Infraestructura serverless en Supabase Edge Functions con auto-scaling.', iconClass: 'icon-blue' },
  { icon: Shield, title: 'Seguridad bancaria', desc: 'Cifrado AES-256, RLS por usuario y auditoria de transacciones.', iconClass: 'icon-emerald' },
  { icon: Database, title: 'PostgreSQL + RLS', desc: 'Base de datos transaccional con Row Level Security en cada tabla.', iconClass: 'icon-primary' },
  { icon: Cpu, title: 'Calculo en tiempo real', desc: 'Motor de comisiones binario + unilevel con triggers PostgreSQL.', iconClass: 'icon-amber' },
  { icon: Lock, title: 'Cumplimiento legal', desc: 'INDECOPI, facturacion electronica y retenciones automaticas.', iconClass: 'icon-violet' },
  { icon: Zap, title: '99.9% uptime', desc: 'Monitoreo proactivo, failover automatico y backups cada hora.', iconClass: 'icon-sky' },
];

const statsItems = [
  { value: '12,540+', label: 'Afiliados activos', icon: Users, iconClass: 'icon-blue' },
  { value: 'S/ 2.8M+', label: 'Comisiones pagadas', icon: TrendingUp, iconClass: 'icon-emerald' },
  { value: '8 paises', label: 'Presencia regional', icon: Globe, iconClass: 'icon-primary' },
  { value: '+340%', label: 'Crecimiento anual', icon: Zap, iconClass: 'icon-amber' },
];

function StatsCarousel() {
  const items = [...statsItems, ...statsItems];
  return (
    <div className="relative overflow-hidden py-8">
      <div className="absolute left-0 top-0 bottom-0 w-20 bg-gradient-to-r from-background to-transparent z-10 pointer-events-none" />
      <div className="absolute right-0 top-0 bottom-0 w-20 bg-gradient-to-l from-background to-transparent z-10 pointer-events-none" />
      <div className="flex animate-marquee-left">
        {items.map((s, i) => (
          <div key={i} className="flex items-center gap-4 px-8 shrink-0">
            <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center', s.iconClass)}>
              <s.icon className="w-6 h-6" />
            </div>
            <div>
              <div className="text-2xl font-bold text-foreground leading-tight">{s.value}</div>
              <div className="text-sm text-muted-foreground">{s.label}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function NosotrosPage() {
  const { company } = useConfig();
  const companyName = company.company_name || 'MLM 360';

  return (
    <div className="min-h-screen bg-background overflow-x-hidden flex flex-col">
      <Navbar />

      {/* HERO */}
      <section className="pt-28 pb-20">
        <div className="px-6 sm:px-8">
          <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-10 max-w-2xl mx-auto">
            <Link to="/" className="hover:text-foreground transition-colors">Inicio</Link>
            <span className="text-border">/</span>
            <span className="text-foreground font-medium">Nosotros</span>
          </nav>

          <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary/10 border border-primary/20 rounded-full text-xs font-medium text-primary mb-6">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Desde Lima para Latinoamerica</span>
          </div>

          <h1 className="text-4xl sm:text-5xl font-bold text-foreground leading-[1.05] tracking-tight mb-6 max-w-3xl">
            Empoderamos a{' '}
            <span className="text-gradient-animated">emprendedores</span>{' '}
            latinos
          </h1>

          <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mb-9 leading-relaxed">
            Construimos tecnologia que genera libertad financiera real. Nuestra plataforma automatiza lo dificil para que te enfoques en lo importante: tu red.
          </p>

          <div className="flex flex-wrap gap-3">
            <Link to="/registro" className="inline-flex items-center gap-2 px-6 py-3 bg-foreground/90 backdrop-blur-sm text-background font-medium rounded-lg hover:bg-foreground/80 active:scale-[0.98] transition-all text-sm">
              Unete hoy <ArrowRight className="w-4 h-4" />
            </Link>
            <Link to="/contacto" className="inline-flex items-center gap-2 px-6 py-3 bg-card/70 backdrop-blur-sm border border-border text-foreground font-medium rounded-lg hover:border-foreground/30 transition-all text-sm">
              Contactanos
            </Link>
          </div>
        </div>
      </section>

      {/* STATS CAROUSEL */}
      <div className="border-y border-border bg-muted/20">
        <StatsCarousel />
      </div>

      {/* MISION / VISION / VALORES */}
      <section className="py-20">
        <div className="px-6 sm:px-8">
          <div className="text-center mb-14">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary/10 border border-primary/20 rounded-full mb-4">
              <Sparkles className="w-3.5 h-3.5 text-primary" />
              <span className="text-xs font-semibold text-primary">Nuestro norte</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-3 tracking-tight">
              Lo que nos <span className="text-gradient-animated">define</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-5xl mx-auto">
            {[
              { icon: Target, title: 'Mision', text: 'Democratizar las oportunidades de negocio en Latinoamerica mediante tecnologia MLM de vanguardia que empodera a cualquier persona.', iconClass: 'icon-blue' },
              { icon: Award, title: 'Vision', text: 'Ser la plataforma MLM empresarial lider en Latinoamerica para 2028, con presencia en 20 paises y 50,000 afiliados activos.', iconClass: 'icon-amber' },
              { icon: HeartHandshake, title: 'Valores', text: 'Transparencia radical. Integridad sin compromisos. Innovacion constante. Exito compartido con cada afiliado.', iconClass: 'icon-emerald' },
            ].map((v) => (
              <div key={v.title} className="bg-card/70 backdrop-blur-sm border border-border rounded-xl p-8 h-full card-lift hover:border-foreground/20">
                <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center mb-5', v.iconClass)}>
                  <v.icon className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-xl mb-3 text-foreground">{v.title}</h3>
                <p className="text-muted-foreground leading-relaxed text-sm">{v.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TIMELINE */}
      <section className="py-20 border-t border-border">
        <div className="px-6 sm:px-8">
          <div className="text-center mb-16">
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-3 tracking-tight">
              Nuestra <span className="text-gradient-animated">historia</span>
            </h2>
            <p className="text-muted-foreground">De una idea a la plataforma MLM lider en Latinoamerica.</p>
          </div>

          <div className="relative max-w-3xl mx-auto">
            <div className="absolute left-6 top-0 bottom-0 w-px bg-border" />
            <div className="space-y-6">
              {timeline.map((item) => (
                <div key={item.year} className="relative flex items-start gap-6">
                  <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center shrink-0 z-10', item.iconClass)}>
                    <item.icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 bg-card/60 backdrop-blur-sm border border-border rounded-xl p-6 card-lift hover:border-foreground/20">
                    <div className="text-xs font-semibold text-primary uppercase tracking-wider mb-2">{item.year}</div>
                    <h3 className="font-bold text-lg text-foreground mb-2">{item.title}</h3>
                    <p className="text-sm text-muted-foreground">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* INFRASTRUCTURE */}
      <section className="py-20 border-t border-border">
        <div className="px-6 sm:px-8">
          <div className="text-center mb-14">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary/10 border border-primary/20 rounded-full mb-4">
              <Cpu className="w-3.5 h-3.5 text-primary" />
              <span className="text-xs font-semibold text-primary">Infraestructura</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-3 tracking-tight">
              Tecnologia <span className="text-gradient-animated">de nivel empresarial</span>
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">Construido sobre las mejores herramientas. Cada componente es production-ready.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-5xl mx-auto">
            {infra.map((item) => (
              <div key={item.title} className="bg-card/60 backdrop-blur-sm border border-border rounded-xl p-6 h-full card-lift hover:border-foreground/20">
                <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center mb-4', item.iconClass)}>
                  <item.icon className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-foreground mb-2">{item.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TEAM */}
      <section className="py-20 border-t border-border">
        <div className="px-6 sm:px-8">
          <div className="text-center mb-14">
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-3 tracking-tight">
              El equipo detras de <span className="text-gradient-animated">{companyName}</span>
            </h2>
            <p className="text-muted-foreground max-w-md mx-auto">Combinamos experiencia en MLM, tecnologia y crecimiento.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 max-w-5xl mx-auto">
            {team.map((member) => (
              <div key={member.name} className="bg-card/70 backdrop-blur-sm border border-border rounded-xl overflow-hidden card-lift hover:border-foreground/20">
                <div className="aspect-[4/3] overflow-hidden bg-muted">
                  <img src={member.img} alt={member.name} className="w-full h-full object-cover" />
                </div>
                <div className="p-5">
                  <h3 className="font-bold text-foreground leading-tight">{member.name}</h3>
                  <div className="text-xs font-semibold text-primary uppercase tracking-wide mt-0.5 mb-3">{member.role}</div>
                  <p className="text-xs text-muted-foreground leading-relaxed">{member.bio}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* COMPANY INFO */}
      <section className="py-20 border-t border-border">
        <div className="px-6 sm:px-8 max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-3 tracking-tight">
              Informacion <span className="text-gradient-animated">legal</span>
            </h2>
            <p className="text-muted-foreground">Empresa registrada con transparencia total.</p>
          </div>

          <div className="bg-card/70 backdrop-blur-sm border border-border rounded-xl overflow-hidden">
            <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-border">
              <div className="p-8 space-y-6">
                <div>
                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Razon social</div>
                  <div className="font-bold text-lg text-foreground">{company.razon_social || 'MLM 360 S.A.C.'}</div>
                </div>
                <div>
                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">RUC</div>
                  <div className="font-bold text-lg text-foreground">{company.ruc || '20603456789'}</div>
                </div>
                <div>
                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Pais de origen</div>
                  <div className="font-bold text-lg text-foreground">Peru</div>
                </div>
              </div>
              <div className="p-8 space-y-6">
                <div>
                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-2"><MapPin className="w-3.5 h-3.5" /> Direccion</div>
                  <div className="font-semibold text-foreground leading-relaxed">{company.address || 'Av. Javier Prado Este 100, San Isidro, Lima, Peru'}</div>
                </div>
                <div>
                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-2"><Mail className="w-3.5 h-3.5" /> Email</div>
                  <div className="font-semibold text-foreground">{company.contact_email || 'contacto@mlm360.pe'}</div>
                </div>
                <div>
                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-2"><Phone className="w-3.5 h-3.5" /> Telefono</div>
                  <div className="font-semibold text-foreground">{company.phone || '+51 916 085 797'}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative py-32 overflow-hidden section-dark">
        <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-b from-background to-transparent z-20 pointer-events-none" />
        <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-background to-transparent z-20 pointer-events-none" />
        <div className="absolute inset-0 bg-grid opacity-50 mask-fade-center" />
        <div className="absolute top-[-30%] left-[-10%] w-[60%] h-[70%] bg-gradient-to-br from-primary/20 via-blue-500/10 to-transparent rounded-full blur-[100px]" />
        <div className="absolute top-[10%] right-[-20%] w-[50%] h-[60%] bg-gradient-to-bl from-blue-500/15 via-primary/8 to-transparent rounded-full blur-[100px]" />

        <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-muted/50 backdrop-blur-sm border border-border/60 rounded-full text-xs font-medium text-muted-foreground mb-8">
            <Zap className="w-3.5 h-3.5 text-primary" />
            <span>Sin tarjeta de credito requerida</span>
          </div>
          <h2 className="text-4xl sm:text-5xl font-bold text-foreground dark:text-white mb-6 leading-[1.1] tracking-tight">
            Se parte de nuestra <span className="text-gradient-animated">historia</span>
          </h2>
          <p className="text-xl text-muted-foreground dark:text-white/50 max-w-lg mx-auto mb-10 leading-relaxed">
            Unete a emprendedores que ya construyen su futuro con {companyName}.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/registro" className="inline-flex items-center gap-2 px-8 py-4 bg-foreground/90 backdrop-blur-sm text-background font-medium rounded-lg hover:bg-foreground/80 active:scale-[0.98] transition-all shadow-2xl text-base">
              Crear cuenta gratis <ArrowRight className="w-5 h-5" />
            </Link>
            <Link to="/empresa" className="inline-flex items-center gap-2 px-8 py-4 bg-muted/50 backdrop-blur-sm border border-border/60 text-foreground font-medium rounded-lg hover:bg-muted/60 transition-all text-base">
              Ver infraestructura
            </Link>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-8 mt-12 text-sm text-muted-foreground/60 dark:text-white/40">
            <span className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-muted-foreground/80 dark:text-white/60" /> Cuenta gratuita</span>
            <span className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-muted-foreground/80 dark:text-white/60" /> Sin permanencia</span>
            <span className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-muted-foreground/80 dark:text-white/60" /> Soporte 24/7</span>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
