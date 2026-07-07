import { useState } from 'react';
import Navbar from '@/components/landing/Navbar';
import Footer from '@/components/landing/Footer';
import { Reveal } from '@/components/landing/Reveal';
import { Link } from '@/lib/router';
import { Mail, MapPin, Send, CircleCheck as CheckCircle, ArrowRight, Clock, MessageCircle, Building2, Globe } from 'lucide-react';
import { toast } from 'sonner';
import { useConfig } from '@/store/configStore';
import { cn } from '@/lib/utils';

export default function ContactoPage() {
  const { company } = useConfig();
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.message) {
      toast.error('Completa todos los campos');
      return;
    }
    setLoading(true);
    await new Promise(r => setTimeout(r, 1000));
    setLoading(false);
    setSent(true);
    toast.success('Mensaje enviado');
  };

  const channels = [
    { icon: Mail, label: 'Email', value: company.contact_email || 'hola@cluv360.pe', href: `mailto:${company.contact_email || 'hola@cluv360.pe'}`, color: 'text-primary', bg: 'bg-primary/10' },
    { icon: MessageCircle, label: 'WhatsApp', value: company.phone || '+51 987 654 321', href: `https://wa.me/${(company.phone || '+51987654321').replace(/[^0-9]/g, '')}`, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
    { icon: MapPin, label: 'Dirección', value: company.address || 'Av. Javier Prado Este 4200, San Isidro, Lima', href: '#mapa', color: 'text-rose-500', bg: 'bg-rose-500/10' },
  ];

  const departments = [
    { icon: MessageCircle, label: 'Soporte general', email: 'soporte@cluv360.pe', desc: 'Dudas sobre tu cuenta, pagos y plataforma', color: 'bg-primary/10 text-primary' },
    { icon: Building2, label: 'Ventas empresariales', email: 'ventas@cluv360.pe', desc: 'Para empresas con más de 500 afiliados', color: 'bg-amber-500/10 text-amber-600 dark:text-amber-400' },
    { icon: Globe, label: 'Alianzas', email: 'alianzas@cluv360.pe', desc: 'Integraciones y partnerships', color: 'bg-blue-500/10 text-blue-500' },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <section className="relative pt-12 pb-10 sm:pt-16 sm:pb-12 overflow-hidden">
        <div className="absolute inset-0 bg-dub-grid opacity-20 mask-fade-center" />
        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
            <Link to="/" className="hover:text-foreground transition-colors">Inicio</Link>
            <span className="text-muted-foreground/40">/</span>
            <span className="text-foreground font-medium">Contacto</span>
          </nav>

          <Reveal>
            <span className="text-xs font-semibold text-primary uppercase tracking-widest mb-3 block">Contacto</span>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground tracking-tight mb-3">
              ¿En qué podemos ayudarte?
            </h1>
            <p className="text-base sm:text-lg text-muted-foreground/70 max-w-xl">
              Nuestro equipo responde en menos de 24 horas. Elige el canal que prefieras.
            </p>
          </Reveal>
        </div>
      </section>

      {/* ── Contact channels ───────────────────────────────────────────────── */}
      <section className="pb-8">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
            {channels.map(ch => (
              <a key={ch.label} href={ch.href} target={ch.href.startsWith('http') ? '_blank' : undefined} rel={ch.href.startsWith('http') ? 'noopener noreferrer' : undefined}
                className="group bg-card border border-border/60 rounded-2xl p-5 hover:border-primary/30 hover:shadow-md transition-all">
                <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center mb-3', ch.bg)}>
                  <ch.icon className={cn('w-5 h-5', ch.color)} />
                </div>
                <div className="text-xs text-muted-foreground/60 mb-1">{ch.label}</div>
                <div className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">{ch.value}</div>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* ── Form + Info ───────────────────────────────────────────────────── */}
      <section className="py-10 sm:py-12">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 lg:gap-8">
            {/* Form */}
            <div className="lg:col-span-3">
              <div className="bg-card border border-border/60 rounded-2xl p-6 sm:p-8">
                <h2 className="text-lg font-bold text-foreground mb-1">Envíanos un mensaje</h2>
                <p className="text-sm text-muted-foreground/60 mb-6">Te responderemos lo antes posible.</p>

                {sent ? (
                  <div className="text-center py-12">
                    <div className="w-14 h-14 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-4">
                      <CheckCircle className="w-7 h-7 text-emerald-500" />
                    </div>
                    <h3 className="font-bold text-foreground mb-2">Mensaje enviado</h3>
                    <p className="text-sm text-muted-foreground mb-5">Te responderemos en menos de 24 horas.</p>
                    <button onClick={() => { setSent(false); setForm({ name: '', email: '', subject: '', message: '' }); }}
                      className="text-sm text-primary font-medium hover:underline">Enviar otro mensaje</button>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-muted-foreground mb-1.5">Nombre</label>
                        <input type="text" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                          className="w-full px-3.5 py-2.5 bg-muted/40 border border-border/60 rounded-lg text-sm outline-none focus:border-primary focus:bg-card transition-all" placeholder="Tu nombre" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-muted-foreground mb-1.5">Email</label>
                        <input type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                          className="w-full px-3.5 py-2.5 bg-muted/40 border border-border/60 rounded-lg text-sm outline-none focus:border-primary focus:bg-card transition-all" placeholder="tu@email.com" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-muted-foreground mb-1.5">Asunto</label>
                      <input type="text" value={form.subject} onChange={e => setForm(p => ({ ...p, subject: e.target.value }))}
                        className="w-full px-3.5 py-2.5 bg-muted/40 border border-border/60 rounded-lg text-sm outline-none focus:border-primary focus:bg-card transition-all" placeholder="¿Sobre qué nos escribes?" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-muted-foreground mb-1.5">Mensaje</label>
                      <textarea rows={5} value={form.message} onChange={e => setForm(p => ({ ...p, message: e.target.value }))}
                        className="w-full px-3.5 py-2.5 bg-muted/40 border border-border/60 rounded-lg text-sm outline-none focus:border-primary focus:bg-card transition-all resize-none" placeholder="Cuéntanos en qué podemos ayudarte..." />
                    </div>
                    <button type="submit" disabled={loading}
                      className="w-full bg-primary text-white py-3 rounded-lg font-semibold text-sm hover:bg-primary/90 transition-all flex items-center justify-center gap-2 disabled:opacity-50">
                      {loading ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Enviando...</> : <><Send className="w-4 h-4" /> Enviar mensaje</>}
                    </button>
                  </form>
                )}
              </div>
            </div>

            {/* Info sidebar */}
            <div className="lg:col-span-2 space-y-4">
              {/* Hours */}
              <div className="bg-card border border-border/60 rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Clock className="w-4 h-4 text-primary" />
                  <h3 className="text-sm font-bold text-foreground">Horario de atención</h3>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Lunes a Viernes</span>
                    <span className="font-medium text-foreground">9:00 - 18:00</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Sábados</span>
                    <span className="font-medium text-foreground">9:00 - 13:00</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Domingos</span>
                    <span className="font-medium text-muted-foreground/50">Cerrado</span>
                  </div>
                </div>
              </div>

              {/* Departments */}
              <div className="bg-card border border-border/60 rounded-2xl p-5">
                <h3 className="text-sm font-bold text-foreground mb-3">Departamentos</h3>
                <div className="space-y-3">
                  {departments.map(dept => (
                    <a key={dept.label} href={`mailto:${dept.email}`} className="group flex items-start gap-3 hover:bg-muted/40 -mx-2 px-2 py-1.5 rounded-lg transition-all">
                      <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center shrink-0', dept.color)}>
                        <dept.icon className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">{dept.label}</div>
                        <div className="text-xs text-muted-foreground/60 truncate">{dept.email}</div>
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Map ────────────────────────────────────────────────────────────── */}
      <section id="mapa" className="py-10 sm:py-12 bg-muted/20 border-y border-border/40">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <Reveal>
            <div className="text-center mb-6">
              <span className="text-xs font-semibold text-primary uppercase tracking-widest mb-2 block">Ubicación</span>
              <h2 className="text-xl sm:text-2xl font-bold text-foreground mb-1">Visítanos</h2>
              <p className="text-sm text-muted-foreground/60">{company.address || 'Av. Javier Prado Este 4200, San Isidro, Lima, Perú'}</p>
            </div>
          </Reveal>

          <Reveal>
            <div className="rounded-2xl overflow-hidden border border-border/60 shadow-lg">
              <iframe
                title="Ubicación Cluv360"
                src="https://www.openstreetmap.org/export/embed.html?bbox=-77.0375%2C-12.0915%2C-77.0275%2C-12.0815&layer=mapnik&marker=-12.0865%2C-77.0325"
                className="w-full h-[300px] sm:h-[400px]"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── CTA ────────────────────────────────────────────────────────────── */}
      <section className="py-14 sm:py-16">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-xl sm:text-2xl font-bold text-foreground mb-2">¿Listo para empezar?</h2>
          <p className="text-sm text-muted-foreground mb-5">Crea tu cuenta gratuita y comienza a construir tu red hoy mismo.</p>
          <Link to="/registro" className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-white font-semibold rounded-xl hover:bg-primary/90 transition-all text-sm">
            Crear cuenta gratis <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
}
