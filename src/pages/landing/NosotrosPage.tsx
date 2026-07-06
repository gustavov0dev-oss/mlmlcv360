import Navbar from '@/components/landing/Navbar';
import Footer from '@/components/landing/Footer';
import { Link } from '@/lib/router';
import { ArrowRight, Target, Award, HeartHandshake, Users, TrendingUp, Globe, Rocket, Zap, Building2, MapPin, Phone, Mail } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useConfig } from '@/store/configStore';

const timeline = [
  { year: '2020', title: 'Fundación', desc: 'Lima, Perú. Un equipo de 3 personas con una visión.', icon: Rocket, active: true },
  { year: '2021', title: 'Validación', desc: '+1,000 afiliados. Primeros pagos de comisiones.', icon: TrendingUp, active: true },
  { year: '2022', title: 'Expansión regional', desc: 'Presencia en Colombia, Ecuador y Bolivia.', icon: Globe, active: true },
  { year: '2023', title: 'Tienda MLM', desc: 'Marketplace propio con +200 productos.', icon: Building2, active: true },
  { year: '2024', title: 'Liderazgo', desc: '+12,000 afiliados. S/2.8M en comisiones.', icon: Award, active: true },
  { year: '2025', title: 'Escalado', desc: 'Meta: 20 países y 50,000 afiliados.', icon: Zap, active: false },
];

const team = [
  { name: 'Carlos Mendoza', role: 'CEO & Fundador', bio: '10 años en MLM, ex-director comercial de multinacional.', img: 'https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg?auto=compress&cs=tinysrgb&w=300' },
  { name: 'Ana Rodríguez', role: 'CTO', bio: 'Ex-Amazon, especialista en sistemas escalables.', img: 'https://images.pexels.com/photos/1181690/pexels-photo-1181690.jpeg?auto=compress&cs=tinysrgb&w=300' },
  { name: 'Luis García', role: 'Director Comercial', bio: 'Experto en redes de afiliados, +500 entrenamientos.', img: 'https://images.pexels.com/photos/1043471/pexels-photo-1043471.jpeg?auto=compress&cs=tinysrgb&w=300' },
  { name: 'María Torres', role: 'Head of Growth', bio: 'Especialista en adquisición y retención de usuarios.', img: 'https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?auto=compress&cs=tinysrgb&w=300' },
];

const values = [
  { icon: Target, title: 'Misión', text: 'Democratizar las oportunidades de negocio en Latinoamérica mediante tecnología MLM de vanguardia que empodera a cualquier persona.', color: 'text-blue-500', bg: 'bg-blue-500/10' },
  { icon: Award, title: 'Visión', text: 'Ser la plataforma MLM empresarial líder en Latinoamérica para 2028, con presencia en 20 países y 50,000 afiliados activos.', color: 'text-amber-500', bg: 'bg-amber-500/10' },
  { icon: HeartHandshake, title: 'Valores', text: 'Transparencia radical. Integridad sin compromisos. Innovación constante. Éxito compartido con cada afiliado.', color: 'text-green-500', bg: 'bg-green-500/10' },
];

export default function NosotrosPage() {
  const { company } = useConfig();
  const companyName = company.company_name || 'MLM 360';

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* ── HERO ────────────────────────────────────────────────────────────── */}
      <section className="pt-10 pb-20 relative overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-primary/4 rounded-full blur-[120px]" />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-10">
            <Link to="/" className="hover:text-foreground transition-colors">Inicio</Link>
            <span className="text-border">/</span>
            <span className="text-foreground font-medium">Nosotros</span>
          </nav>

          <div className="grid lg:grid-cols-2 gap-14 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-primary/10 border border-primary/20 rounded-full text-xs font-bold text-primary mb-6">
                <Building2 className="w-3.5 h-3.5" />
                <span>Sobre {companyName}</span>
              </div>

              <h1 className="text-4xl sm:text-5xl font-bold text-foreground leading-[1.1]tracking-tight mb-6">
                Empoderamos a<br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-blue-500">emprendedores latinos</span>
              </h1>

              <p className="text-muted-foreground text-base sm:text-lg leading-relaxed mb-8 max-w-lg">
                Desde Lima, Perú, construimos tecnología que genera libertad financiera real. Nuestra plataforma automatiza lo difícil para que te enfoques en lo importante: tu red.
              </p>

              <div className="flex flex-wrap gap-3">
                <Link to="/registro" className="inline-flex items-center gap-2 px-5 py-3 bg-primary text-white font-semibold rounded-xl hover:bg-primary/90 transition-all text-sm">
                  Únete hoy <ArrowRight className="w-4 h-4" />
                </Link>
                <Link to="/contacto" className="inline-flex items-center gap-2 px-5 py-3 bg-muted border border-border text-foreground font-medium rounded-xl hover:border-primary/40 transition-all text-sm">
                  Contáctanos
                </Link>
              </div>
            </div>

            {/* Stats grid */}
            <div className="grid grid-cols-2 gap-4">
              {[
                { value: '12,540+', label: 'Afiliados activos', icon: Users, color: 'text-blue-500', bg: 'bg-blue-500/10' },
                { value: 'S/ 2.8M', label: 'Comisiones pagadas', icon: TrendingUp, color: 'text-green-500', bg: 'bg-green-500/10' },
                { value: '8 países', label: 'Presencia regional', icon: Globe, color: 'text-primary', bg: 'bg-primary/10' },
                { value: '+340%', label: 'Crecimiento anual', icon: Zap, color: 'text-amber-500', bg: 'bg-amber-500/10' },
              ].map((s, i) => (
                <div key={s.label} className={cn(
                  'bg-card border border-border rounded-2xl p-5 hover:border-primary/30 transition-all',
                  i === 1 && 'bg-primary/5 border-primary/20'
                )}>
                  <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center mb-3', s.bg)}>
                    <s.icon className={cn('w-4 h-4', s.color)} />
                  </div>
                  <div className="text-2xl font-bold text-foreground leading-tight">{s.value}</div>
                  <div className="text-xs text-muted-foreground mt-1">{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── VALUES ──────────────────────────────────────────────────────────── */}
      <section className="py-20 bg-muted/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {values.map(v => (
              <div key={v.title} className="bg-card border border-border rounded-2xl p-6 hover:border-primary/30 transition-all hover:translate-y-[-2px]">
                <div className={cn('w-11 h-11 rounded-xl flex items-center justify-center mb-4', v.bg)}>
                  <v.icon className={cn('w-5 h-5', v.color)} />
                </div>
                <h3 className={cn('font-bold text-lg mb-2', v.color)}>{v.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{v.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TIMELINE ────────────────────────────────────────────────────────── */}
      <section className="py-24">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-3">Nuestra historia</h2>
            <p className="text-muted-foreground text-sm">De una idea a la plataforma MLM líder en Latinoamérica.</p>
          </div>

          <div className="relative">
            {/* Vertical line */}
            <div className="absolute left-6 md:left-1/2 top-0 bottom-0 w-px bg-border md:-ml-px" />

            <div className="space-y-6">
              {timeline.map((item, i) => (
                <div key={item.year} className={cn(
                  'relative flex items-start gap-5',
                  i % 2 === 0 ? 'md:flex-row' : 'md:flex-row-reverse'
                )}>
                  {/* Dot */}
                  <div className={cn(
                    'w-12 h-12 rounded-xl border-2 flex items-center justify-center shrink-0 z-10 bg-background',
                    item.active
                      ? 'border-primary bg-primary/10'
                      : 'border-dashed border-border bg-muted/50'
                  )}>
                    <item.icon className={cn('w-5 h-5', item.active ? 'text-primary' : 'text-muted-foreground/50')} />
                  </div>

                  {/* Content card */}
                  <div className={cn(
                    'flex-1 bg-card border border-border rounded-xl p-5',
                    i % 2 === 0 ? 'md:text-right' : 'md:text-left'
                  )}>
                    <div className="text-xs font-bold text-primary uppercase tracking-widest mb-1">{item.year}</div>
                    <h3 className="font-bold text-foreground text-base mb-1">{item.title}</h3>
                    <p className="text-sm text-muted-foreground">{item.desc}</p>
                  </div>

                  {/* Spacer for alternate layout on desktop */}
                  <div className="hidden md:block flex-1" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── TEAM ───────────────────────────────────────────────────────────── */}
      <section className="py-24 bg-muted/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-3">El equipo detrás de {companyName}</h2>
            <p className="text-muted-foreground text-sm max-w-md mx-auto">Combinamos experiencia en MLM, tecnología y crecimiento para construir la mejor plataforma.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {team.map(member => (
              <div key={member.name} className="bg-card border border-border rounded-2xl overflow-hidden hover:border-primary/30 transition-all hover:translate-y-[-2px] group">
                <div className="aspect-[4/3] overflow-hidden bg-muted relative">
                  <img src={member.img} alt={member.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  <div className="absolute inset-0 bg-gradient-to-t from-card via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <div className="p-5">
                  <h3 className="font-bold text-foreground text-base leading-tight">{member.name}</h3>
                  <div className="text-xs font-semibold text-primary uppercase tracking-wide mt-0.5 mb-2">{member.role}</div>
                  <p className="text-xs text-muted-foreground leading-relaxed">{member.bio}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── COMPANY INFO ────────────────────────────────────────────────────── */}
      <section className="py-24">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-3">Información legal</h2>
            <p className="text-muted-foreground text-sm">Empresa registrada con transparencia total.</p>
          </div>

          <div className="bg-card border border-border rounded-2xl overflow-hidden">
            <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-border">
              <div className="p-6 space-y-5">
                <div>
                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Razón social</div>
                  <div className="font-semibold text-foreground">{company.razon_social || 'MLM 360 S.A.C.'}</div>
                </div>
                <div>
                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">RUC</div>
                  <div className="font-semibold text-foreground">{company.ruc || '20603456789'}</div>
                </div>
                <div>
                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">País de origen</div>
                  <div className="font-semibold text-foreground">Perú</div>
                </div>
              </div>
              <div className="p-6 space-y-5">
                <div>
                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1 flex items-center gap-1.5"><MapPin className="w-3 h-3" /> Dirección</div>
                  <div className="font-semibold text-foreground leading-relaxed">{company.address || 'Av. Javier Prado Este 100, San Isidro, Lima, Perú'}</div>
                </div>
                <div>
                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1 flex items-center gap-1.5"><Mail className="w-3 h-3" /> Email</div>
                  <div className="font-semibold text-foreground">{company.contact_email || 'contacto@mlm360.pe'}</div>
                </div>
                <div>
                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1 flex items-center gap-1.5"><Phone className="w-3 h-3" /> Teléfono</div>
                  <div className="font-semibold text-foreground">{company.phone || '+51 916 085 797'}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA ─────────────────────────────────────────────────────────────── */}
      <section className="py-24 bg-muted/20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative rounded-3xl overflow-hidden bg-foreground">
            <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[size:32px_32px]" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[180px] bg-primary/20 rounded-full blur-[80px]" />

            <div className="relative px-8 py-14 text-center">
              <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4">Sé parte de nuestra historia</h2>
              <p className="text-white/60 max-w-md mx-auto mb-8 text-sm">
                Únete a +12,540 emprendedores que ya construyen su futuro con {companyName}.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <Link to="/registro" className="inline-flex items-center gap-2 px-6 py-3 bg-white text-foreground font-semibold rounded-xl hover:bg-white/90 transition-all text-sm">
                  Crear cuenta gratis <ArrowRight className="w-4 h-4" />
                </Link>
                <Link to="/empresa" className="inline-flex items-center gap-2 px-6 py-3 bg-white/10 border border-white/20 text-white font-medium rounded-xl hover:bg-white/15 transition-all text-sm">
                  Ver infraestructura
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
