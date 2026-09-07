import { useState, useEffect, useRef } from 'react';
import { Mail, MapPin, Send, CircleCheck as CheckCircle, ChevronDown, Zap, Phone } from 'lucide-react';
import { toast } from 'sonner';
import { useConfig } from '@/store/configStore';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/backend/client';
import { contactDefaults, contactTabs, contactKey, parseContactSection, validContactMessage } from '@/lib/contactContent';

function Highlight({text,mark}:{text:string;mark:string}) { const i=mark?text.indexOf(mark):-1; return i<0?<>{text}</>:<>{text.slice(0,i)}<span className="text-gradient-animated">{mark}</span>{text.slice(i+mark.length)}</>; }

export default function ContactoPage() {
  const { company, refresh } = useConfig();
  const content = contactDefaults(company);
  let invalid = false;
  for(const {id} of contactTabs) { try { content[id]=parseContactSection(company[contactKey(id)],content[id]); } catch { invalid=true; } }
  const {hero,channels:details,form:formText,map,faq:faqText}=content;
  const submissionId=useRef(crypto.randomUUID());
  const submitting=useRef(false);
  useEffect(()=>{ void refresh(); const focus=()=>{void refresh();}; window.addEventListener('focus',focus); return ()=>window.removeEventListener('focus',focus); },[refresh]);
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const companyEmail=details.text.email;
  const companyPhone=details.text.phone;
  const companyAddress=details.text.address;
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if(submitting.current)return;
    if(!validContactMessage(form)) { toast.error('Revisa el nombre, email y mensaje.'); return; }
    submitting.current=true; setLoading(true);
    try {
      const {error}=await supabase.from('contact_messages').insert({id:submissionId.current,name:form.name.trim(),email:form.email.trim(),subject:form.subject.trim(),message:form.message.trim()});
      if(error && error.code!=='23505')throw error;
      setSent(true); toast.success(formText.text.success_title);
    } catch { toast.error('No se pudo enviar el mensaje. Tus datos siguen en el formulario; inténtalo de nuevo.'); }
    finally { submitting.current=false; setLoading(false); }
  };

  const cleanPhone = (phone: string) => phone.replace(/[^0-9]/g, '');

  const channels = [
    ...(companyEmail ? [{ icon: Mail, label: details.text.email_label, value: companyEmail, href: `mailto:${companyEmail}` }] : []),
    ...(companyPhone ? [{ icon: Phone, label: details.text.phone_label, value: companyPhone, href: `tel:${cleanPhone(companyPhone)}` }] : []),
    ...(companyAddress ? [{ icon: MapPin, label: details.text.address_label, value: companyAddress, href: '#mapa' }] : []),
  ];

  const faqs = faqText.items.filter(item=>item.is_active).map(item=>({...item,q:item.title,a:item.desc}));

  const faqLeft = faqs.slice(0, Math.ceil(faqs.length / 2));
  const faqRight = faqs.slice(Math.ceil(faqs.length / 2));

  const mapsQuery = encodeURIComponent(map.text.query || companyAddress);
  const mapsEmbed = `https://www.google.com/maps?q=${mapsQuery}&output=embed`;

  if(invalid)return <section className="pt-28 px-6" role="alert">No se pudo cargar Contacto. <button onClick={()=>{void refresh();}} className="text-primary underline">Reintentar</button></section>;
  return (
    <>
      {/* ── Hero ── */}
      <section className="relative pt-28 pb-14 sm:pb-16 overflow-hidden">
        <div className="absolute inset-0 bg-grid opacity-[0.25] mask-fade-top pointer-events-none dark:opacity-[0.1]" />
        <div className="relative max-w-[1100px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="inline-flex items-center gap-2 text-xs font-semibold text-primary uppercase tracking-widest mb-5">
            <Zap className="w-3.5 h-3.5" />
            {hero.text.badge}
          </div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground tracking-tight mb-4 leading-[1.1]">
            <Highlight text={hero.text.title} mark={hero.text.highlight}/>
          </h1>
          <p className="text-base sm:text-lg text-muted-foreground/70 max-w-xl leading-relaxed">
            {hero.text.subtitle}
          </p>
        </div>
      </section>

      {/* ── Canales de contacto ── */}
      {channels.length > 0 && (
        <section className="py-8 sm:py-10">
          <div className="max-w-[1100px] mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col sm:flex-row divide-y sm:divide-y-0 sm:divide-x divide-border/20">
              {channels.map((ch) => (
                <a
                  key={ch.label}
                  href={ch.href}
                  target={ch.href.startsWith('http') ? '_blank' : undefined}
                  rel={ch.href.startsWith('http') ? 'noopener noreferrer' : undefined}
                  className="group flex items-center gap-3.5 py-4 sm:py-0 sm:px-6 first:pl-0 last:pr-0 flex-1 min-w-0"
                >
                  <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <ch.icon className="w-4 h-4 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] font-medium text-muted-foreground/50 uppercase tracking-wide mb-0.5">{ch.label}</p>
                    <p className="text-sm font-medium text-foreground leading-snug break-words [overflow-wrap:anywhere] group-hover:text-primary">{ch.value}</p>
                  </div>
                </a>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Form + Map ── */}
      <section className="py-14 sm:py-20">
        <div className="max-w-[1100px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-10 lg:gap-12">
            {/* Form */}
            <div className="lg:col-span-3 flex flex-col">
              <h2 className="text-lg font-bold text-foreground mb-1">{formText.text.title}</h2>
              <p className="text-sm text-muted-foreground/60 mb-6">{formText.text.subtitle}</p>

              {sent ? (
                <div className="py-12 flex-1 flex flex-col justify-center">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                    <CheckCircle className="w-5 h-5 text-primary" />
                  </div>
                  <h3 className="font-bold text-foreground mb-2">{formText.text.success_title}</h3>
                  <p className="text-sm text-muted-foreground mb-5">{formText.text.success_description}</p>
                  <button onClick={() => { submissionId.current=crypto.randomUUID(); setSent(false); setForm({ name: '', email: '', subject: '', message: '' }); }}
                    className="text-sm text-primary font-medium self-start">{formText.text.another_label}</button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="flex-1 flex flex-col gap-4"><fieldset disabled={loading} className="contents">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="contact-name" className="block text-xs font-medium text-muted-foreground mb-1.5">{formText.text.name_label} <span className="text-primary">*</span></label>
                      <input type="text" id="contact-name" maxLength={120} required value={form.name} onChange={e => setForm(p => { submissionId.current=crypto.randomUUID(); return ({ ...p, name: e.target.value }); })}
                        className="w-full px-3.5 py-2.5 bg-muted/30 border border-border/40 rounded-lg text-sm text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary/20" placeholder={formText.text.name_placeholder} />
                    </div>
                    <div>
                      <label htmlFor="contact-email" className="block text-xs font-medium text-muted-foreground mb-1.5">{formText.text.email_label} <span className="text-primary">*</span></label>
                      <input type="email" id="contact-email" maxLength={254} required value={form.email} onChange={e => setForm(p => { submissionId.current=crypto.randomUUID(); return ({ ...p, email: e.target.value }); })}
                        className="w-full px-3.5 py-2.5 bg-muted/30 border border-border/40 rounded-lg text-sm text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary/20" placeholder={formText.text.email_placeholder} />
                    </div>
                  </div>
                  <div>
                    <label htmlFor="contact-subject" className="block text-xs font-medium text-muted-foreground mb-1.5">{formText.text.subject_label}</label>
                    <input type="text" id="contact-subject" maxLength={200} value={form.subject} onChange={e => setForm(p => { submissionId.current=crypto.randomUUID(); return ({ ...p, subject: e.target.value }); })}
                      className="w-full px-3.5 py-2.5 bg-muted/30 border border-border/40 rounded-lg text-sm text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary/20" placeholder={formText.text.subject_placeholder} />
                  </div>
                  <div className="flex-1 flex flex-col">
                    <label htmlFor="contact-message" className="block text-xs font-medium text-muted-foreground mb-1.5">{formText.text.message_label} <span className="text-primary">*</span></label>
                    <textarea id="contact-message" maxLength={5000} required value={form.message} onChange={e => setForm(p => { submissionId.current=crypto.randomUUID(); return ({ ...p, message: e.target.value }); })}
                      className="w-full flex-1 min-h-[120px] px-3.5 py-2.5 bg-muted/30 border border-border/40 rounded-lg text-sm text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 resize-none" placeholder={formText.text.message_placeholder} />
                  </div>
                  <div className="flex pt-2">
                    <button type="submit" disabled={loading}
                      className="w-full sm:w-auto sm:ml-auto inline-flex items-center justify-center gap-2 bg-primary text-white px-6 py-3 sm:py-2.5 rounded-lg font-semibold text-sm disabled:opacity-50">
                      {loading ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> {formText.text.sending_label}</> : <><Send className="w-4 h-4" /> {formText.text.submit_label}</>}
                    </button>
                  </div>
                </fieldset></form>
              )}
            </div>

            {/* Map */}
            {(map.text.query || companyAddress) && (
              <div id="mapa" className="lg:col-span-2 lg:pl-12 lg:border-l lg:border-border/20 flex flex-col">
                <div className="flex-1 min-h-[240px] rounded-lg overflow-hidden">
                  <iframe
                    title={map.text.title}
                    src={mapsEmbed}
                    className="w-full h-full"
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    allowFullScreen
                  />
                </div>
                <div className="flex items-start justify-between gap-3 pt-4">
                  <p className="text-sm font-medium text-foreground leading-snug">{companyAddress}</p>
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${mapsQuery}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0 text-xs font-semibold text-primary whitespace-nowrap pt-0.5"
                  >
                    {map.text.directions_label}
                  </a>
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
            <span className="text-xs font-semibold text-primary uppercase tracking-widest mb-3 block">{faqText.text.badge}</span>
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-5">
              <div>
                <h2 className="text-3xl sm:text-4xl font-bold text-foreground tracking-tight mb-3">
                  <Highlight text={faqText.text.title} mark={faqText.text.highlight}/>
                </h2>
                <p className="text-muted-foreground/70 text-sm sm:text-base max-w-md">
                  {faqText.text.subtitle}
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 lg:divide-x lg:divide-border/20 lg:gap-x-12">
            <div className="lg:pr-12">
              {faqLeft.map((faq) => {
                const i = faqs.indexOf(faq);
                return (
                  <div key={faq.id} className="border-b border-border/20">
                    <button
                      aria-expanded={openFaq === i} onClick={() => setOpenFaq(openFaq === i ? null : i)}
                      className="w-full flex items-center justify-between py-5 text-left gap-4"
                    >
                      <span className={cn(
                        'text-sm sm:text-[15px] leading-snug',
                        openFaq === i ? 'font-semibold text-foreground' : 'font-medium text-foreground/70',
                      )}>
                        {faq.q}
                      </span>
                      <div className={cn(
                        'w-6 h-6 rounded-full flex items-center justify-center shrink-0',
                        openFaq === i ? 'bg-primary/10 text-primary' : 'text-muted-foreground/40',
                      )}>
                        <ChevronDown className={cn('w-3.5 h-3.5', openFaq === i && 'rotate-180')} />
                      </div>
                    </button>
                    {openFaq === i && (
                      <div className="pb-5">
                        <p className="text-sm sm:text-[15px] text-muted-foreground leading-relaxed">{faq.a}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="lg:pl-12">
              {faqRight.map((faq) => {
                const i = faqs.indexOf(faq);
                return (
                  <div key={faq.id} className="border-b border-border/20">
                    <button
                      aria-expanded={openFaq === i} onClick={() => setOpenFaq(openFaq === i ? null : i)}
                      className="w-full flex items-center justify-between py-5 text-left gap-4"
                    >
                      <span className={cn(
                        'text-sm sm:text-[15px] leading-snug',
                        openFaq === i ? 'font-semibold text-foreground' : 'font-medium text-foreground/70',
                      )}>
                        {faq.q}
                      </span>
                      <div className={cn(
                        'w-6 h-6 rounded-full flex items-center justify-center shrink-0',
                        openFaq === i ? 'bg-primary/10 text-primary' : 'text-muted-foreground/40',
                      )}>
                        <ChevronDown className={cn('w-3.5 h-3.5', openFaq === i && 'rotate-180')} />
                      </div>
                    </button>
                    {openFaq === i && (
                      <div className="pb-5">
                        <p className="text-sm sm:text-[15px] text-muted-foreground leading-relaxed">{faq.a}</p>
                      </div>
                    )}
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