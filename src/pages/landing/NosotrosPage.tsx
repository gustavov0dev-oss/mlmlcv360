import { LoadingRegion } from '@/components/ui/loading-region';
import { Link } from '@/lib/router';
import { ArrowRight, ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useDatabase } from '@/lib/backend';
import { AboutIcon } from '@/components/landing/AboutIcon';
import { resolveAboutConfig, safeAboutUrl, type Founder, type TimelineItem, type InfraItem, type ValueItem } from '@/lib/aboutContent';
import { useConfig } from '@/store/configStore';
import { cn } from '@/lib/utils';

function HighlightedTitle({ text, highlight }: { text: string; highlight: string }) {
  const index = highlight ? text.indexOf(highlight) : -1;
  if (index < 0) return <>{text}</>;
  return <>{text.slice(0, index)}<span className="text-gradient-animated">{highlight}</span>{text.slice(index + highlight.length)}</>;
}

function AboutLink({ to, children, className }: { to: string; children: ReactNode; className: string }) {
  const url = safeAboutUrl(to);
  if (!url) return null;
  return url.startsWith('/') ? <Link to={url} className={className}>{children}</Link> : <a href={url} className={className}>{children}</a>;
}

export default function NosotrosPage() {
  const { company, refresh } = useConfig();
  const config = resolveAboutConfig(company);
  const database = useDatabase();
  const [founders, setFounders] = useState<Founder[]>([]);
  const [timeline, setTimeline] = useState<TimelineItem[]>([]);
  const historyRef = useRef<HTMLDivElement>(null);
  const [historyEdges, setHistoryEdges] = useState({ overflow: false, start: true, end: true });
  useEffect(() => {
    const track = historyRef.current;
    if (!track) return;
    const update = () => {
      const max = track.scrollWidth - track.clientWidth;
      setHistoryEdges({ overflow: max > 2, start: track.scrollLeft <= 2, end: track.scrollLeft >= max - 2 });
    };
    const observer = new ResizeObserver(update);
    observer.observe(track);
    Array.from(track.children).forEach(child => observer.observe(child));
    track.addEventListener('scroll', update, { passive: true });
    update();
    return () => { observer.disconnect(); track.removeEventListener('scroll', update); };
  }, [timeline]);
  const scrollHistory = (direction: number) => {
    const track = historyRef.current;
    if (!track) return;
    track.scrollBy({ left: direction * track.clientWidth * 0.8, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  };
  const [infra, setInfra] = useState<InfraItem[]>([]);
  const [values, setValues] = useState<ValueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let disposed = false;
    let request = 0;
    const load = async () => {
      const current = ++request;
      try {
        const options = { filter: { is_active: true }, order: [{ column: 'sort_order' }, { column: 'id' }] };
        const results = await Promise.all([
          database.select<Founder>('about_founders', options),
          database.select<TimelineItem>('about_timeline', options),
          database.select<InfraItem>('about_infrastructure', options),
          database.select<ValueItem>('about_values', options),
        ]);
        if (results.some(result => result.error || !Array.isArray(result.data))) throw new Error('load');
        if (disposed || current !== request) return;
        setFounders(results[0].data as Founder[]);
        setTimeline(results[1].data as TimelineItem[]);
        setInfra(results[2].data as InfraItem[]);
        setValues(results[3].data as ValueItem[]);
        setError(false);
      } catch {
        if (!disposed && current === request) setError(true);
      } finally {
        if (!disposed && current === request) setLoading(false);
      }
    };
    void load();
    const unsubscribes = ['about_founders', 'about_timeline', 'about_infrastructure', 'about_values'].map(table => database.subscribe(table, () => { void load(); }));
    const onFocus = () => { void load(); void refresh(); };
    window.addEventListener('focus', onFocus);
    return () => { disposed = true; unsubscribes.forEach(unsubscribe => unsubscribe()); window.removeEventListener('focus', onFocus); };
  }, [database, refresh, retry]);

  return (
    <>
      {/* HERO */}
      <section className="relative pt-28 pb-10 sm:pb-12 overflow-hidden">
        <div className="absolute inset-0 bg-grid opacity-[0.25] mask-fade-top pointer-events-none dark:opacity-[0.1]" />
        <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[400px] rounded-full bg-primary/8 blur-[130px] pointer-events-none" />
        <div className="relative max-w-[1100px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="inline-flex items-center gap-2 text-xs font-semibold text-primary uppercase tracking-widest mb-5">
            <Sparkles className="w-3.5 h-3.5" />
            {config.about_hero_badge}
          </div>

          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground tracking-tight mb-4 leading-[1.1] max-w-2xl">
            <HighlightedTitle text={config.about_hero_title} highlight={config.about_hero_highlight} />
          </h1>

          <p className="text-base sm:text-lg text-muted-foreground/80 max-w-xl leading-relaxed mb-10">
            {config.about_hero_subtitle}
          </p>

          <p className="text-sm sm:text-base text-muted-foreground/80 leading-relaxed max-w-2xl">
            {config.about_hero_description}
          </p>

          <div className="flex flex-col sm:flex-row gap-3 mt-7">
            {config.about_primary_label && <AboutLink
              to={config.about_primary_url}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-foreground/90 text-background font-semibold rounded-xl hover:opacity-90 transition-opacity text-sm"
            >
              {config.about_primary_label} <ArrowRight className="w-4 h-4" />
            </AboutLink>}
            {config.about_secondary_label && <AboutLink
              to={config.about_secondary_url}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 border border-border/40 text-foreground font-medium rounded-xl hover:border-primary/40 hover:text-primary transition-colors text-sm"
            >
              {config.about_secondary_label}
            </AboutLink>}
          </div>
        </div>
      </section>

      {loading && <LoadingRegion className="min-h-[17rem]" />}
      {error && <div className="max-w-[1100px] mx-auto px-4 sm:px-6 lg:px-8 py-8 text-sm text-muted-foreground" role="alert">No se pudo actualizar la información. <button className="text-primary underline" onClick={() => setRetry(value => value + 1)}>Reintentar</button></div>}
      {/* MISION / VISION / VALORES */}
      {values.length > 0 && (<section className="py-14 sm:py-20">
        <div className="max-w-[1100px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 sm:grid-cols-3 sm:gap-y-12 sm:-mx-8">
            {values.map((v, i) => (
              <div
                key={v.id}
                className={cn(
                  'py-8 sm:py-0 sm:px-8',
                  i > 0 && 'border-t sm:border-t-0 border-border/20',
                  i % 3 !== 0 && 'sm:border-l',
                )}
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <AboutIcon name={v.icon} className="w-4 h-4 text-primary" strokeWidth={1.75} />
                  </div>
                  <h3 className="font-bold text-lg text-foreground">{v.label}</h3>
                </div>
                <p className="text-muted-foreground leading-relaxed text-sm max-w-sm">{v.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>)}

      {/* TIMELINE */}
      {timeline.length > 0 && (<section className="py-14 sm:py-20">
        <div className="max-w-[1100px] mx-auto px-4 sm:px-6 lg:px-8">
          <span className="text-xs font-semibold text-primary uppercase tracking-widest mb-3 block">{config.about_timeline_badge}</span>
          <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground tracking-tight mb-2 max-w-xl">
            <HighlightedTitle text={config.about_timeline_title} highlight={config.about_timeline_highlight} />
          </h2>
          <div className="flex items-end justify-between gap-4 mb-8">
            <p className="text-sm sm:text-base text-muted-foreground/80 max-w-xl">{config.about_timeline_subtitle}</p>
            <div className={cn('flex gap-1 shrink-0', !historyEdges.overflow && 'invisible')} aria-hidden={!historyEdges.overflow}>
              <button type="button" aria-label="Ver hitos anteriores" aria-controls="about-history-track" disabled={!historyEdges.overflow || historyEdges.start} onClick={() => scrollHistory(-1)} className="w-10 h-10 flex items-center justify-center rounded-full text-muted-foreground hover:text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary disabled:opacity-25 disabled:pointer-events-none transition-colors"><ChevronLeft className="w-5 h-5" /></button>
              <button type="button" aria-label="Ver siguientes hitos" aria-controls="about-history-track" disabled={!historyEdges.overflow || historyEdges.end} onClick={() => scrollHistory(1)} className="w-10 h-10 flex items-center justify-center rounded-full text-muted-foreground hover:text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary disabled:opacity-25 disabled:pointer-events-none transition-colors"><ChevronRight className="w-5 h-5" /></button>
            </div>
          </div>
        </div>

        <div className="max-w-[1100px] mx-auto px-4 sm:px-6 lg:px-8 min-w-0">
          <div ref={historyRef} id="about-history-track" role="region" aria-label="Hitos de nuestra historia" tabIndex={0} className="flex gap-8 overflow-x-auto pb-4 snap-x snap-proximity max-w-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary/50">
            {timeline.map((item, i) => (
              <div
                key={item.id}
                className={
                  'shrink-0 w-[220px] sm:w-[240px] max-w-full break-words snap-start ' +
                  (i > 0 ? 'border-l border-border/20 pl-8' : '')
                }
              >
                <div className="flex items-center gap-2 mb-2.5">
                  <AboutIcon name={item.icon} className="w-4 h-4 text-primary shrink-0" strokeWidth={1.75} />
                  <span className="text-xs font-semibold text-muted-foreground/70 tabular-nums">{item.year}</span>
                </div>
                <h3 className="font-bold text-base text-foreground mb-1.5">{item.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>)}

      {/* INFRAESTRUCTURA */}
      {infra.length > 0 && (<section className="py-14 sm:py-20">
        <div className="max-w-[1100px] mx-auto px-4 sm:px-6 lg:px-8">
          <span className="text-xs font-semibold text-primary uppercase tracking-widest mb-3 block">{config.about_infrastructure_badge}</span>
          <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground tracking-tight mb-2 max-w-xl">
            <HighlightedTitle text={config.about_infrastructure_title} highlight={config.about_infrastructure_highlight} />
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground/80 max-w-xl mb-12">{config.about_infrastructure_subtitle}</p>

          <div className="grid grid-cols-1 sm:grid-cols-3 sm:gap-y-12 sm:-mx-8">
            {infra.map((item, i) => (
              <div
                key={item.id}
                className={cn(
                  'py-6 sm:py-8 sm:px-8 border-t sm:border-t-0 border-border/20',
                  i === 0 && 'border-t-0',
                  i % 3 !== 0 && 'sm:border-l sm:border-border/20',
                  i >= 3 && 'sm:border-t sm:border-border/20',
                )}
              >
                <div className="flex items-center gap-2.5 mb-2.5">
                  <AboutIcon name={item.icon} className="w-4.5 h-4.5 text-primary shrink-0" strokeWidth={1.75} />
                  <h3 className="font-bold text-foreground">{item.title}</h3>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>)}

      {/* FUNDADORES */}
      {founders.length > 0 && (<section className="py-14 sm:py-20">
        <div className="max-w-[1100px] mx-auto px-4 sm:px-6 lg:px-8">
          <span className="text-xs font-semibold text-primary uppercase tracking-widest mb-3 block">{config.about_founders_badge}</span>
          <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground tracking-tight mb-2 max-w-xl">
            <HighlightedTitle text={config.about_founders_title} highlight={config.about_founders_highlight} />
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground/80 max-w-xl mb-12">{config.about_founders_subtitle}</p>

          <div className="grid grid-cols-1 sm:grid-cols-3 sm:gap-y-12 sm:-mx-8">
            {founders.map((f, i) => (
              <div
                key={f.id}
                className={cn(
                  'py-8 sm:py-0 sm:px-8',
                  i > 0 && 'border-t sm:border-t-0 border-border/20',
                  i % 3 !== 0 && 'sm:border-l',
                )}
              >
                <div className="aspect-[4/5] overflow-hidden bg-muted mb-5">
                  <img src={f.image_url} loading="lazy" alt={f.name} className="w-full h-full object-cover" />
                </div>
                <h3 className="font-bold text-foreground leading-tight">{f.name}</h3>
                <div className="text-xs font-semibold text-primary uppercase tracking-wide mt-0.5 mb-3">{f.role}</div>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.bio}</p>
              </div>
            ))}
          </div>
        </div>
      </section>)}

      {/* INFORMACION LEGAL */}
      <section className="py-14 sm:py-20">
        <div className="max-w-[1100px] mx-auto px-4 sm:px-6 lg:px-8">
          <span className="text-xs font-semibold text-primary uppercase tracking-widest mb-3 block">{config.about_legal_badge}</span>
          <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground tracking-tight mb-2 max-w-xl">
            <HighlightedTitle text={config.about_legal_title} highlight={config.about_legal_highlight} />
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground/80 max-w-xl mb-12">{config.about_legal_subtitle}</p>

          <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-border/20">
            <div className="space-y-7 md:pr-10">
              <div>
                <div className="text-xs font-semibold text-muted-foreground/70 uppercase tracking-wide mb-2">{config.about_legal_label_razon_social}</div>
                <div className="font-bold text-lg text-foreground">{config.razon_social}</div>
              </div>
              <div>
                <div className="text-xs font-semibold text-muted-foreground/70 uppercase tracking-wide mb-2">{config.about_legal_label_ruc}</div>
                <div className="font-bold text-lg text-foreground">{config.ruc}</div>
              </div>
              <div>
                <div className="text-xs font-semibold text-muted-foreground/70 uppercase tracking-wide mb-2">{config.about_legal_label_address_country}</div>
                <div className="font-bold text-lg text-foreground">{config.address_country}</div>
              </div>
            </div>
            <div className="space-y-7 pt-7 md:pt-0 md:pl-10">
              <div>
                <div className="text-xs font-semibold text-muted-foreground/70 uppercase tracking-wide mb-2">{config.about_legal_label_address}</div>
                <div className="font-semibold text-foreground leading-relaxed">{config.address}</div>
              </div>
              <div>
                <div className="text-xs font-semibold text-muted-foreground/70 uppercase tracking-wide mb-2">{config.about_legal_label_contact_email}</div>
                <div className="font-semibold text-foreground">{config.contact_email}</div>
              </div>
              <div>
                <div className="text-xs font-semibold text-muted-foreground/70 uppercase tracking-wide mb-2">{config.about_legal_label_phone}</div>
                <div className="font-semibold text-foreground">{config.phone}</div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}