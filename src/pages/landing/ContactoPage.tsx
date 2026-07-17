import { useState, useEffect } from 'react';
import Navbar from '@/components/landing/Navbar';
import Footer from '@/components/landing/Footer';
import { Reveal } from '@/components/landing/Reveal';
import { Link } from '@/lib/router';
import { Mail, MapPin, Send, CircleCheck as CheckCircle, ArrowRight, MessageCircle, ChevronDown, Zap, Phone } from 'lucide-react';
import { toast } from 'sonner';
import { useConfig } from '@/store/configStore';
import { supabase } from '@/lib/backend/client';
import { cn } from '@/lib/utils';

interface SocialLink {
  id: string;
  platform: string;
  url: string;
  icon: string;
  icon_svg?: string | null;
  is_active: boolean;
  sort_order: number;
}

export default function ContactoPage() {
  const { company } = useConfig();
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [socialLinks, setSocialLinks] = useState<SocialLink[]>([]);

  const companyName = company.company_name || 'MLM 360';
  const companyEmail = company.company_email || 'contacto@mlm360.pe';
  const companyPhone = company.company_phone || '';
  const companyAddress = company.company_address || '';
  const whatsappNumber = company.whatsapp_number || companyPhone;
  const whatsappEnabled = company.whatsapp_enabled !== 'false';
  const tagline = company.company_tagline || '';

  useEffect(() => {
    supabase
      .from('social_links')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true })
      .then(({ data }) => { if (data) setSocialLinks(data); });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.message) {
      toast.error('Completa los campos requeridos');
      return;
    }
    setLoading(true);
    await new Promise(r => setTimeout(r, 1200));
    setLoading(false);
    setSent(true);
    toast.success('Mensaje enviado correctamente');
  };

  const cleanPhone = (phone: string) => phone.replace(/[^0-9]/g, '');
  const cleanWa = (wa: string) => wa.replace(/[^0-9]/g, '');

  const channels = [
    ...(companyEmail ? [{ icon: Mail, label: 'Email', value: companyEmail, href: `mailto:${companyEmail}` }] : []),
    ...(companyPhone ? [{ icon: Phone, label: 'Teléfono', value: companyPhone, href: `tel:${cleanPhone(companyPhone)}` }] : []),
    ...(whatsappEnabled && whatsappNumber ? [{ icon: MessageCircle, label: 'WhatsApp', value: whatsappNumber, href: `https://wa.me/${cleanWa(whatsappNumber)}` }] : []),
    ...(companyAddress ? [{ icon: MapPin, label: 'Dirección', value: companyAddress, href: '#mapa' }] : []),
  ];

  const faqs = [
    { q: `¿Cómo creo una cuenta en ${companyName}?`, a: 'Ve a la página de registro, completa tus datos y recibirás acceso inmediato al dashboard. No necesitas tarjeta de crédito.' },
    { q: '¿Cuánto tardan en acreditarse las comisiones?', a: 'Las comisiones se acreditan en menos de 60 segundos después de cada venta. Puedes verlas en tiempo real en tu dashboard.' },
    { q: '¿Qué métodos de pago aceptan?', a: 'Aceptamos Yape, Plin, tarjetas de crédito y transferencias bancarias. Para retiros, puedes usar Yape, Plin o transferencia bancaria.' },
    { q: '¿Puedo usar la plataforma desde mi celular?', a: 'Sí, la plataforma es 100% responsive. Puedes gestionar tu red, ver comisiones y realizar todas las operaciones desde tu móvil.' },
    { q: '¿Cómo contacto a soporte?', a: 'Puedes escribirnos por WhatsApp, email o mediante el formulario de esta página. Respondemos en menos de 24 horas.' },
  ];

  const mapsQuery = encodeURIComponent(companyAddress || 'Lima, Peru');
  const mapsEmbed = `https://www.google.com/maps?q=${mapsQuery}&output=embed`;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      {/* ── Hero ── */}
      <section className="relative pt-28 pb-10 sm:pb-14 overflow-hidden">
        <div className="absolute inset-0 bg-dub-grid opacity-20 mask-fade-top" />
        <div className="relative max-w-[1100px] mx-auto px-4 sm:px-6 lg:px-8">
          <Reveal>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/8 border border-primary/15 text-xs font-medium text-primary mb-5">
              <Zap className="w-3.5 h-3.5" />
              Respondemos en menos de 24h
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground tracking-tight mb-4 leading-[1.05]">
              ¿En qué podemos<br className="hidden sm:block" /> <span className="text-gradient-animated">ayudarte?</span>
            </h1>
            <p className="text-base sm:text-lg text-muted-foreground/70 max-w-xl leading-relaxed">
              {tagline || 'Nuestro equipo está disponible para resolver tus dudas, escuchar tus sugerencias y ayudarte a crecer.'}
            </p>
          </Reveal>
        </div>
      </section>

      {/* ── Contact channels ── */}
      {channels.length > 0 && (
        <section className="pb-6">
          <div className="max-w-[1100px] mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              {channels.map((ch, i) => (
                <Reveal key={ch.label} delay={i * 50}>
                  <a
                    href={ch.href}
                    target={ch.href.startsWith('http') ? '_blank' : undefined}
                    rel={ch.href.startsWith('http') ? 'noopener noreferrer' : undefined}
                    className="group block bg-card border border-border/50 rounded-2xl p-4 sm:p-5 transition-all hover:border-primary/30 card-lift"
                  >
                    <div className="w-10 h-10 rounded-xl icon-primary flex items-center justify-center mb-3">
                      <ch.icon className="w-5 h-5" />
                    </div>
                    <div className="text-xs text-muted-foreground/60 mb-1">{ch.label}</div>
                    <div className="text-sm font-medium text-foreground leading-snug break-words">{ch.value}</div>
                  </a>
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Form + Info ── */}
      <section className="py-10 sm:py-14">
        <div className="max-w-[1100px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 lg:gap-8">
            {/* Form */}
            <div className="lg:col-span-3">
              <div className="bg-card border border-border/50 rounded-2xl p-6 sm:p-8 shadow-sm">
                <h2 className="text-lg font-bold text-foreground mb-1">Envíanos un mensaje</h2>
                <p className="text-sm text-muted-foreground/60 mb-6">Te responderemos lo antes posible.</p>

                {sent ? (
                  <div className="text-center py-12">
                    <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                      <CheckCircle className="w-7 h-7 text-primary" />
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
                        <label className="block text-xs font-medium text-muted-foreground mb-1.5">Nombre <span className="text-primary">*</span></label>
                        <input type="text" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                          className="w-full px-3.5 py-2.5 bg-muted/40 border border-border/60 rounded-lg text-sm text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 focus:bg-card transition-all" placeholder="Tu nombre" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-muted-foreground mb-1.5">Email <span className="text-primary">*</span></label>
                        <input type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                          className="w-full px-3.5 py-2.5 bg-muted/40 border border-border/60 rounded-lg text-sm text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 focus:bg-card transition-all" placeholder="tu@email.com" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-muted-foreground mb-1.5">Asunto</label>
                      <input type="text" value={form.subject} onChange={e => setForm(p => ({ ...p, subject: e.target.value }))}
                        className="w-full px-3.5 py-2.5 bg-muted/40 border border-border/60 rounded-lg text-sm text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 focus:bg-card transition-all" placeholder="¿Sobre qué nos escribes?" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-muted-foreground mb-1.5">Mensaje <span className="text-primary">*</span></label>
                      <textarea rows={5} value={form.message} onChange={e => setForm(p => ({ ...p, message: e.target.value }))}
                        className="w-full px-3.5 py-2.5 bg-muted/40 border border-border/60 rounded-lg text-sm text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 focus:bg-card transition-all resize-none" placeholder="Cuéntanos en qué podemos ayudarte..." />
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
              {/* Social links from DB */}
              {socialLinks.length > 0 && (
                <div className="bg-card border border-border/50 rounded-2xl p-5 shadow-sm">
                  <h3 className="text-sm font-bold text-foreground mb-4">Síguenos</h3>
                  <div className="flex flex-wrap gap-2">
                    {socialLinks.map(link => (
                      <a key={link.id} href={link.url} target="_blank" rel="noopener noreferrer" aria-label={link.platform}
                        className="w-10 h-10 rounded-xl bg-background border border-border flex items-center justify-center text-muted-foreground hover:text-primary hover:border-primary/30 hover:bg-primary/5 transition-colors">
                        <span className="text-sm font-medium capitalize">{link.platform.slice(0, 2)}</span>
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* WhatsApp quick action */}
              {whatsappEnabled && whatsappNumber && (
                <div className="bg-card border border-border/50 rounded-2xl p-5 shadow-sm">
                  <h3 className="text-sm font-bold text-foreground mb-4">Atención inmediata</h3>
                  <a href={`https://wa.me/${cleanWa(whatsappNumber)}`} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-3 p-3 rounded-xl bg-green-500/8 border border-green-500/20 hover:bg-green-500/12 transition-colors group">
                    <div className="w-10 h-10 rounded-xl bg-green-500/15 flex items-center justify-center shrink-0">
                      <MessageCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-foreground">Escríbenos por WhatsApp</div>
                      <div className="text-xs text-muted-foreground/60 truncate group-hover:text-green-600 dark:group-hover:text-green-400 transition-colors">{whatsappNumber}</div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-green-600 dark:group-hover:text-green-400 shrink-0 ml-auto" />
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ── Google Map ── */}
      {companyAddress && (
        <section id="mapa" className="py-10 sm:py-12 bg-muted/20 border-y border-border/40">
          <div className="max-w-[1100px] mx-auto px-4 sm:px-6 lg:px-8">
            <Reveal>
              <div className="text-center mb-6">
                <span className="text-xs font-semibold text-primary uppercase tracking-widest mb-2 block">Ubicación</span>
                <h2 className="text-xl sm:text-2xl font-bold text-foreground mb-1">Visítanos</h2>
                <p className="text-sm text-muted-foreground/60">{companyAddress}</p>
              </div>
            </Reveal>
            <Reveal delay={50}>
              <div className="rounded-2xl overflow-hidden border border-border/50 shadow-lg">
                <iframe
                  title={`Ubicación ${companyName}`}
                  src={mapsEmbed}
                  className="w-full h-[300px] sm:h-[400px]"
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  allowFullScreen
                />
              </div>
            </Reveal>
          </div>
        </section>
      )}

      {/* ── FAQ ── */}
      <section className="py-14 sm:py-16">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <Reveal className="text-center mb-8">
            <span className="text-xs font-semibold text-primary uppercase tracking-widest mb-2 block">FAQ</span>
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground">Preguntas frecuentes</h2>
            <p className="text-sm text-muted-foreground/60 mt-2">Las dudas más comunes de nuestros afiliados.</p>
          </Reveal>

          <div className="space-y-3">
            {faqs.map((faq, i) => (
              <Reveal key={i} delay={i * 30}>
                <div className="bg-card border border-border/50 rounded-xl overflow-hidden">
                  <button onClick={() => setOpenFaq(openFaq === i ? null : i)}
                    className="w-full flex items-center justify-between gap-4 p-4 sm:p-5 text-left hover:bg-muted/30 transition-colors">
                    <span className="text-sm font-medium text-foreground">{faq.q}</span>
                    <ChevronDown className={cn('w-4 h-4 text-muted-foreground shrink-0 transition-transform', openFaq === i && 'rotate-180')} />
                  </button>
                  <div className={cn('grid transition-all duration-300 ease-out', openFaq === i ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0')}>
                    <div className="overflow-hidden">
                      <p className="px-4 sm:px-5 pb-4 sm:pb-5 text-sm text-muted-foreground/70 leading-relaxed">{faq.a}</p>
                    </div>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-14 sm:py-16 bg-muted/20 border-t border-border/40">
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
