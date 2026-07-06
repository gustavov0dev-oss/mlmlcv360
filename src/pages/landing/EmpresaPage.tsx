import Navbar from '@/components/landing/Navbar';
import Footer from '@/components/landing/Footer';
import { Link } from '@/lib/router';
import { ChevronRight, Server, Shield, Globe, Database, CircleCheck as CheckCircle, CreditCard } from 'lucide-react';
import { useConfig } from '@/store/configStore';

const techStack = [
  { icon: Server, name: 'Infraestructura', value: 'AWS', desc: 'Cloud global' },
  { icon: Database, name: 'Base de datos', value: 'PostgreSQL', desc: '3 réplicas' },
  { icon: Globe, name: 'CDN', value: 'Cloudflare', desc: '200+ nodos' },
  { icon: Shield, name: 'Seguridad', value: 'SSL/TLS', desc: 'End-to-end' },
];

const certifications = ['ISO 27001', 'PCI DSS', 'SSL Certificate', 'GDPR Ready'];

const gateways = [
  { name: 'Yape', status: 'Activo' },
  { name: 'Plin', status: 'Activo' },
  { name: 'Niubiz', status: 'Activo' },
  { name: 'Izipay', status: 'Activo' },
];

export default function EmpresaPage() {
  const { company } = useConfig();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <main className="flex-1">
        {/* Breadcrumb */}
        <div className="border-b border-border">
          <div className="max-w-6xl mx-auto px-6 py-4">
            <nav className="flex items-center gap-2 text-sm text-muted-foreground">
              <Link to="/" className="hover:text-foreground">Inicio</Link>
              <ChevronRight className="w-4 h-4" />
              <span className="text-foreground font-medium">Empresa</span>
            </nav>
          </div>
        </div>

        {/* Header */}
        <section className="border-b border-border">
          <div className="max-w-6xl mx-auto px-6 py-12">
            <div className="grid lg:grid-cols-2 gap-8">
              <div className="space-y-4">
                <h1 className="text-4xl lg:text-5xl font-bold text-foreground">Infraestructura empresarial</h1>
                <p className="text-lg text-muted-foreground">Tecnología, certificaciones y Compliance detrás de MLM 360. Diseñado para escalar.</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { value: '12K+', label: 'Afiliados' },
                  { value: '99.97%', label: 'Uptime 2024' },
                  { value: 'S/ 2.8M', label: 'Comisiones' },
                  { value: '8', label: 'Países' },
                ].map((s) => (
                  <div key={s.label} className="bg-muted/50 rounded-xl p-5">
                    <div className="text-2xl font-bold text-foreground">{s.value}</div>
                    <div className="text-sm text-muted-foreground">{s.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Tech Stack */}
        <section className="border-b border-border">
          <div className="max-w-6xl mx-auto px-6 py-12">
            <h2 className="text-xl font-bold text-foreground mb-6">Stack tecnológico</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {techStack.map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.name} className="bg-card border border-border rounded-xl p-5">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Icon className="w-4 h-4 text-primary" />
                      </div>
                      <div className="text-sm text-muted-foreground">{item.name}</div>
                    </div>
                    <div className="text-lg font-bold text-foreground">{item.value}</div>
                    <div className="text-xs text-muted-foreground">{item.desc}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Certifications & Gateways */}
        <section className="border-b border-border">
          <div className="max-w-6xl mx-auto px-6 py-12">
            <div className="grid lg:grid-cols-2 gap-10">
              {/* Certifications */}
              <div>
                <h2 className="text-xl font-bold text-foreground mb-6">Certificaciones</h2>
                <div className="grid grid-cols-2 gap-3">
                  {certifications.map((cert) => (
                    <div key={cert} className="flex items-center gap-2 bg-card border border-border rounded-lg px-4 py-3">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      <span className="text-sm font-medium text-foreground">{cert}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Payment Gateways */}
              <div>
                <h2 className="text-xl font-bold text-foreground mb-6">Pasarelas de pago</h2>
                <div className="grid grid-cols-2 gap-3">
                  {gateways.map((gw) => (
                    <div key={gw.name} className="flex items-center justify-between bg-card border border-border rounded-lg px-4 py-3">
                      <div className="flex items-center gap-2">
                        <CreditCard className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm font-medium text-foreground">{gw.name}</span>
                      </div>
                      <span className="text-xs bg-green-500/10 text-green-600 px-2 py-0.5 rounded-full">{gw.status}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Legal Info */}
        <section className="border-b border-border">
          <div className="max-w-6xl mx-auto px-6 py-12">
            <h2 className="text-xl font-bold text-foreground mb-6">Información legal</h2>
            <div className="bg-card border border-border rounded-xl p-6">
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Razón social</div>
                  <div className="text-sm font-medium text-foreground">{company.company_name || 'MLM 360 Peru S.A.C.'}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground mb-1">RUC</div>
                  <div className="text-sm font-medium text-foreground">20601234567</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Dirección</div>
                  <div className="text-sm font-medium text-foreground">{company.company_address || 'Av. Javier Prado Este 4200, San Isidro'}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Email</div>
                  <div className="text-sm font-medium text-foreground">{company.company_email || 'contacto@mlm360.pe'}</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-12">
          <div className="max-w-6xl mx-auto px-6">
            <div className="bg-muted/50 rounded-xl p-8 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-foreground">¿Soluciones enterprise?</h2>
                <p className="text-sm text-muted-foreground">Contáctanos para integraciones personalizadas.</p>
              </div>
              <Link to="/contacto" className="px-5 py-2.5 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 transition whitespace-nowrap">
                Contactar ventas
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
