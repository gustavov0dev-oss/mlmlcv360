import { Link } from '@/lib/router';
import { useConfig } from '@/store/configStore';
import { Rocket, ArrowRight, Check, X as XIcon } from 'lucide-react';

import { useEffect, type ReactNode } from 'react';
import { AboutIcon } from '@/components/landing/AboutIcon';
import { opportunityDefaults, opportunityKey, opportunityTabs, parseOpportunitySection, opportunityVideoUrl } from '@/lib/opportunityContent';
import { safeAboutUrl } from '@/lib/aboutContent';

function Highlight({ text, mark }: { text: string; mark: string }) {
 const i = mark ? text.indexOf(mark) : -1;
 return i < 0 ? <>{text}</> : <>{text.slice(0,i)}<span className="text-gradient-animated">{mark}</span>{text.slice(i+mark.length)}</>;
}

function OpportunityLink({ to, children, className }: { to: string; children: ReactNode; className: string }) {
 return to.startsWith('/') ? <Link to={to} className={className}>{children}</Link> : <a href={to} className={className}>{children}</a>;
}

export default function OportunidadPage() {
  const { company, refresh } = useConfig();
  const content = opportunityDefaults(company.company_name || 'MLM 360');
  let invalid = false;
  for (const {id} of opportunityTabs) {
    try { content[id] = parseOpportunitySection(company[opportunityKey(id)], content[id]); }
    catch { invalid = true; }
  }
  const { hero, video, story, profiles: audience, comparison, commitments: support } = content;
  const values = story.items.filter(item => item.is_active);
  const profiles = audience.items.filter(item => item.is_active);
  const comparisonRows = comparison.items.filter(item => item.is_active);
  const commitments = support.items.filter(item => item.is_active);
  const videoUrl = opportunityVideoUrl(video.text.video_url);
  useEffect(() => {
    void refresh();
    const onFocus = () => { void refresh(); };
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [refresh]);
  if (invalid) return <section className="pt-28 pb-14 max-w-[1100px] mx-auto px-6" role="alert">No se pudo cargar la información de Oportunidad. <button className="text-primary underline" onClick={() => { void refresh(); }}>Reintentar</button></section>;

  return (
    <>
      {/* ── Hero ── */}
      <section className="relative pt-28 pb-10 sm:pb-12 overflow-hidden">
        <div className="absolute inset-0 bg-grid opacity-[0.25] mask-fade-top pointer-events-none dark:opacity-[0.1]" />
        <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[400px] rounded-full bg-primary/8 blur-[130px] pointer-events-none" />
        <div className="relative max-w-[1100px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="inline-flex items-center gap-2 text-xs font-semibold text-primary uppercase tracking-widest mb-5">
            <Rocket className="w-3.5 h-3.5" />
            {hero.text.badge}
          </div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground tracking-tight mb-4 leading-[1.1] max-w-2xl">
            <Highlight text={hero.text.title} mark={hero.text.highlight} />
          </h1>
          <p className="text-base sm:text-lg text-muted-foreground/80 max-w-xl leading-relaxed">
            {hero.text.subtitle}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 mt-7">
            {hero.text.primary_label && safeAboutUrl(hero.text.primary_url) && <OpportunityLink
              to={safeAboutUrl(hero.text.primary_url)}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-foreground/90 text-background font-semibold rounded-xl hover:opacity-90 transition-opacity text-sm"
            >
              {hero.text.primary_label} <ArrowRight className="w-4 h-4" />
            </OpportunityLink>}
            {hero.text.secondary_label && safeAboutUrl(hero.text.secondary_url) && <OpportunityLink
              to={safeAboutUrl(hero.text.secondary_url)}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 border border-border/40 text-foreground font-medium rounded-xl hover:border-primary/40 hover:text-primary transition-colors text-sm"
            >
              {hero.text.secondary_label}
            </OpportunityLink>}
          </div>
        </div>
      </section>

      {/* ── Video presentación ── */}
      <section className="py-10 sm:py-14">
        <div className="max-w-[1100px] mx-auto px-4 sm:px-6 lg:px-8">
          <span className="text-xs font-semibold text-primary uppercase tracking-widest mb-3 block">{video.text.badge}</span>
          <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground tracking-tight mb-2">
            <Highlight text={video.text.title} mark={video.text.highlight} />
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground/80 max-w-xl mb-6">
            {video.text.subtitle}
          </p>

          {videoUrl && (<div className="relative w-full aspect-video border border-border/40 rounded-lg overflow-hidden bg-black">
            <iframe
              src={videoUrl}
              title={video.text.video_title}
              className="absolute inset-0 w-full h-full border-0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              loading="lazy"
            />
          </div>)}
        </div>
      </section>

      {/* ── Quiénes somos ── */}
      <section className="py-10 sm:py-14">
        <div className="max-w-[1100px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-14 items-start">
            <div>
              <span className="text-xs font-semibold text-primary uppercase tracking-widest mb-3 block">{story.text.badge}</span>
              <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground tracking-tight mb-4">
                <Highlight text={story.text.title} mark={story.text.highlight} />
              </h2>
              <p className="text-sm sm:text-base text-muted-foreground/80 leading-relaxed mb-4">
                {story.text.subtitle}
              </p>
              <p className="text-sm sm:text-base text-muted-foreground/80 leading-relaxed">
                {story.text.description}
              </p>
            </div>
            <div className="divide-y divide-border/20">
              {values.map((v) => (
                <div key={v.id} className="flex items-start gap-3.5 py-4 first:pt-0 last:pb-0">
                  <AboutIcon name={v.icon || 'Sparkles'} className="w-4 h-4 text-primary shrink-0 mt-0.5" />
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
            <span className="text-xs font-semibold text-primary uppercase tracking-widest mb-3 block">{audience.text.badge}</span>
            <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground tracking-tight mb-2">
              <Highlight text={audience.text.title} mark={audience.text.highlight} />
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground/80 max-w-xl">
              {audience.text.subtitle}
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-border/20">
            {profiles.map((p) => (
              <div
                key={p.id}
                className="py-6 sm:py-0 sm:px-8 first:pt-0 sm:first:pl-0 last:pb-0 sm:last:pr-0"
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <AboutIcon name={p.icon || 'Sparkles'} className="w-4 h-4 text-primary" />
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
            <span className="text-xs font-semibold text-primary uppercase tracking-widest mb-3 block">{comparison.text.badge}</span>
            <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground tracking-tight mb-2">
              {comparison.text.left_title} <span className="text-muted-foreground/40">{comparison.text.versus}</span>{' '}
              <span className="text-gradient-animated">{comparison.text.right_title}</span>
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground/80 max-w-xl">
              {comparison.text.subtitle}
            </p>
          </div>

          {/* Wrapper relativo: una sola línea vertical absoluta cruza header + filas, solo en sm+ */}
          <div className="relative">
            <div className="hidden sm:block absolute inset-y-0 right-[140px] border-l border-border/20 pointer-events-none" />

            {/* Header */}
            <div className="grid grid-cols-[1fr_56px_56px] sm:grid-cols-[1fr_140px_140px] gap-x-3 sm:gap-x-8 pb-3 border-b border-border/30">
              <span className="text-[11px] font-semibold text-muted-foreground/60 uppercase tracking-wider flex items-center">
                {comparison.text.aspect_label}
              </span>
              <span className="text-[11px] font-semibold text-muted-foreground/60 uppercase tracking-wider flex items-center justify-center">
                {comparison.text.traditional_label}
              </span>
              <span className="text-[11px] font-semibold text-primary uppercase tracking-wider flex items-center justify-center sm:pl-8">
                {comparison.text.cluv_label}
              </span>
            </div>

            {comparisonRows.map((row) => (
              <div
                key={row.id}
                className="grid grid-cols-[1fr_56px_56px] sm:grid-cols-[1fr_140px_140px] gap-x-3 sm:gap-x-8 py-3.5 border-b border-border/20 last:border-b-0"
              >
                <span className="text-xs sm:text-sm font-medium text-foreground/85 leading-snug pr-1 flex items-center">
                  {row.label}
                </span>
                <span className="flex items-center justify-center" aria-label={row.traditional ? 'Sí' : 'No'}>
                  {row.traditional ? (
                    <Check className="w-4 h-4 text-muted-foreground/50" />
                  ) : (
                    <XIcon className="w-4 h-4 text-muted-foreground/25" />
                  )}
                </span>
                <span className="flex items-center justify-center sm:pl-8" aria-label={row.cluv ? 'Sí' : 'No'}>
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
            <span className="text-xs font-semibold text-primary uppercase tracking-widest mb-3 block">{support.text.badge}</span>
            <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground tracking-tight mb-2">
              <Highlight text={support.text.title} mark={support.text.highlight} />
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground/80 max-w-xl">
              {support.text.subtitle}
            </p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-y sm:divide-y-0 divide-border/20">
            {commitments.map((c) => (
              <div
                key={c.id}
                className="px-4 py-6 sm:px-6 sm:py-0 first:pl-0 sm:first:pl-0 last:pr-0 [&:nth-child(2)]:pr-0 sm:[&:nth-child(2)]:pr-6 [&:nth-child(3)]:pl-0 sm:[&:nth-child(3)]:pl-6"
              >
                <AboutIcon name={c.icon || 'Sparkles'} className="w-4.5 h-4.5 text-primary mb-3" />
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