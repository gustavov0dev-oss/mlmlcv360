import { useState } from 'react';
import { Reveal } from '@/components/landing/Reveal';
import { Mail, MapPin, Send, CircleCheck as CheckCircle, ChevronDown, Zap, Phone } from 'lucide-react';
import { toast } from 'sonner';
import { useConfig } from '@/store/configStore';
import { cn } from '@/lib/utils';

export default function ContactoPage() {
  const { company } = useConfig();
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const companyName = company.company_name || 'MLM 360';
  const companyEmail = company.company_email || 'contacto@mlm360.pe';
  const companyPhone = company.company_phone || '';
  const companyAddress = company.company_address || '';
  const tagline = company.company_tagline || '';

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

  const channels = [
    ...(companyEmail ? [{ icon: Mail, label: 'Email', value: companyEmail, href: `mailto:${companyEmail}` }] : []),
    ...(companyPhone ? [{ icon: Phone, label: 'Teléfono', value: companyPhone, href: `tel:${cleanPhone(companyPhone)}` }] : []),
    ...(companyAddress ? [{ icon: MapPin, label: 'Dirección', value: companyAddress, href: '#mapa' }] : []),
  ];

  const faqs = [
    { q: `¿Cómo creo una cuenta en ${companyName}?`, a: 'Ve a la página de registro, completa tus datos y recibirás acceso inmediato al dashboard. No necesitas tarjeta de crédito.' },
    { q: '¿Cuánto tardan en acreditarse las comisiones?', a: 'Las comisiones se acreditan en menos de 60 segundos después de cada venta. Puedes verlas en tiempo real en tu dashboard.' },
    { q: '¿Qué métodos de pago aceptan?', a: 'Aceptamos Yape, Plin, tarjetas de crédito y transferencias bancarias. Para retiros, puedes usar Yape, Plin o transferencia bancaria.' },
    { q: '¿Puedo usar la plataforma desde mi celular?', a: 'Sí, la plataforma es 100% responsive. Puedes gestionar tu red, ver comisiones y realizar todas las operaciones desde tu móvil.' },
    { q: '¿Cómo contacto a soporte?', a: 'Puedes escribirnos por email o mediante el formulario de esta página. Respondemos en menos de 24 horas.' },
    { q: '¿Hay algún costo de permanencia?', a: 'No. Puedes empezar con una cuenta gratuita y escalar cuando tu negocio lo necesite. Sin contratos de permanencia.' },
  ];

  const faqLeft = faqs.slice(0, Math.ceil(faqs.length / 2));
  const faqRight = faqs.slice(Math.ceil(faqs.length / 2));

  const mapsQuery = encodeURIComponent(companyAddress || 'Lima, Peru');
  const mapsEmbed = `https://www.google.com/maps?q=${mapsQuery}&output=embed`;

  return (
    <>
      {/* ── Hero ── */}
      <section className="relative pt-28 pb-10 sm:pb-14 overflow-hidden">
        <div className="absolute inset-0 bg-grid opacity-[0.25] mask-fade-top pointer-events-none dark:opacity-[0.1]" />
        <div className="relative max-w-[1100px] mx-auto px-4 sm:px-6 lg:px-8">
          <Reveal>
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary/8 border border-primary/15 text-xs font-medium text-primary mb-5">
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
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
              {channels.map((ch, i) => (
                <Reveal key={ch.label} delay={i * 50}>
                  <a
                    href={ch.href}
                    target={ch.href.startsWith('http') ? '_blank' : undefined}
                    rel={ch.href.startsWith('http') ? 'noopener noreferrer' : undefined}
                    className="group flex items-center gap-4 border border-border/20 rounded-xl p-4 sm:p-5 transition-all hover:border-primary/30"
                  >
                    <div className="w-10 h-10 rounded-xl icon-primary flex items-center justify-center shrink-0">
                      <ch.icon className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs text-muted-foreground/60 mb-0.5">{ch.label}</div>
                      <div className="text-sm font-medium text-foreground leading-snug break-words">{ch.value}</div>
                    </div>
                  </a>
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Form + Map bento ── */}
      <section className="py-10 sm:py-14">
        <div className="max-w-[1100px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 lg:gap-6">
            {/* Form */}
            <div className="lg:col-span-3 border border-border/20 rounded-2xl p-6 sm:p-8">
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
                        className="w-full px-3.5 py-2.5 bg-muted/30 border border-border/40 rounded-lg text-sm text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all" placeholder="Tu nombre" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-muted-foreground mb-1.5">Email <span className="text-primary">*</span></label>
                      <input type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                        className="w-full px-3.5 py-2.5 bg-muted/30 border border-border/40 rounded-lg text-sm text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all" placeholder="tu@email.com" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1.5">Asunto</label>
                    <input type="text" value={form.subject} onChange={e => setForm(p => ({ ...p, subject: e.target.value }))}
                      className="w-full px-3.5 py-2.5 bg-muted/30 border border-border/40 rounded-lg text-sm text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all" placeholder="¿Sobre qué nos escribes?" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1.5">Mensaje <span className="text-primary">*</span></label>
                    <textarea rows={5} value={form.message} onChange={e => setForm(p => ({ ...p, message: e.target.value }))}
                      className="w-full px-3.5 py-2.5 bg-muted/30 border border-border/40 rounded-lg text-sm text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all resize-none" placeholder="Cuéntanos en qué podemos ayudarte..." />
                  </div>
                  <button type="submit" disabled={loading}
                    className="w-full bg-primary text-white py-3 rounded-lg font-semibold text-sm hover:bg-primary/90 transition-all flex items-center justify-center gap-2 disabled:opacity-50">
                    {loading ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Enviando...</> : <><Send className="w-4 h-4" /> Enviar mensaje</>}
                  </button>
                </form>
              )}
            </div>

            {/* Map */}
            {companyAddress && (
              <div id="mapa" className="lg:col-span-2 flex flex-col rounded-2xl overflow-hidden border border-border/20">
                <div className="p-5 sm:p-6">
                  <div className="flex items-center gap-2.5 mb-2">
                    <MapPin className="w-4 h-4 text-primary" />
                    <span className="text-xs font-semibold text-primary uppercase tracking-widest">Ubicación</span>
                  </div>
                  <h3 className="text-base font-bold text-foreground mb-1">Visítanos</h3>
                  <p className="text-sm text-muted-foreground/70 leading-relaxed">{companyAddress}</p>
                </div>
                <div className="flex-1 min-h-[200px] border-t border-border/20">
                  <iframe
                    title={`Ubicación ${companyName}`}
                    src={mapsEmbed}
                    className="w-full h-full min-h-[200px]"
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    allowFullScreen
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="py-16 sm:py-24">
        <div className="max-w-[1100px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-10 sm:mb-14">
            <span className="text-xs font-semibold text-primary uppercase tracking-widest mb-3 block">FAQ</span>
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-5">
              <div>
                <h2 className="text-3xl sm:text-4xl font-bold text-foreground tracking-tight mb-3">
                  Preguntas <span className="text-gradient-animated">frecuentes</span>
                </h2>
                <p className="text-muted-foreground/70 text-sm sm:text-base max-w-md">
                  Las dudas más comunes de nuestros afiliados. Si tienes más preguntas, escríbenos.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-8 lg:gap-x-12">
            <div>
              {faqLeft.map((faq) => {
                const i = faqs.indexOf(faq);
                return (
                  <div key={i} className={cn('border-b border-border/20', i === 0 && 'border-t border-border/20')}>
                    <button
                      onClick={() => setOpenFaq(openFaq === i ? null : i)}
                      className="w-full flex items-center justify-between py-5 text-left gap-4 group"
                    >
                      <span className={cn(
                        'text-sm sm:text-[15px] leading-snug transition-colors',
                        openFaq === i ? 'font-semibold text-foreground' : 'font-medium text-foreground/70 group-hover:text-foreground',
                      )}>
                        {faq.q}
                      </span>
                      <div className={cn(
                        'w-6 h-6 rounded-full flex items-center justify-center shrink-0 transition-all duration-200',
                        openFaq === i ? 'bg-primary/10 text-primary' : 'text-muted-foreground/40 group-hover:text-foreground/60',
                      )}>
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
                    <button
                      onClick={() => setOpenFaq(openFaq === i ? null : i)}
                      className="w-full flex items-center justify-between py-5 text-left gap-4 group"
                    >
                      <span className={cn(
                        'text-sm sm:text-[15px] leading-snug transition-colors',
                        openFaq === i ? 'font-semibold text-foreground' : 'font-medium text-foreground/70 group-hover:text-foreground',
                      )}>
                        {faq.q}
                      </span>
                      <div className={cn(
                        'w-6 h-6 rounded-full flex items-center justify-center shrink-0 transition-all duration-200',
                        openFaq === i ? 'bg-primary/10 text-primary' : 'text-muted-foreground/40 group-hover:text-foreground/60',
                      )}>
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
    </>
  );
}
