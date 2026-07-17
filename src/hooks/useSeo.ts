import { useEffect } from 'react';
import { useConfig } from '@/store/configStore';

function setMeta(attr: 'name' | 'property', key: string, content: string) {
  if (!content) return;
  let el = document.head.querySelector(`meta[${attr}="${key}"]`) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function setTwitterMeta(key: string, content: string) {
  setMeta('name', key, content);
}

function setOgMeta(key: string, content: string) {
  setMeta('property', key, content);
}

/**
 * Applies SEO configuration from system_config to the document head at runtime.
 * Updates title, meta description, keywords, Open Graph, Twitter cards, and canonical link.
 */
export function useSeo() {
  const { company } = useConfig();

  useEffect(() => {
    const title = company.seo_title || `${company.company_name || 'MLM 360'} - Sistema Empresarial Premium`;
    const description = company.seo_description || 'Sistema MLM empresarial premium. Gestiona tu red de afiliados y comisiones.';
    const keywords = company.seo_keywords || '';
    const ogImage = company.seo_og_image || '';
    const gaId = company.seo_ga_id || '';
    const favicon = company.favicon_value || '';

    if (title) document.title = title;
    setMeta('name', 'title', title);
    setMeta('name', 'description', description);
    if (keywords) setMeta('name', 'keywords', keywords);

    setOgMeta('og:title', title);
    setOgMeta('og:description', description);
    setOgMeta('og:site_name', company.company_name || 'MLM 360');
    if (ogImage) setOgMeta('og:image', ogImage);

    setTwitterMeta('twitter:title', title);
    setTwitterMeta('twitter:description', description);
    if (ogImage) setTwitterMeta('twitter:image', ogImage);
    setTwitterMeta('twitter:card', ogImage ? 'summary_large_image' : 'summary');

    if (favicon) {
      let link = document.head.querySelector('link[rel="icon"]') as HTMLLinkElement | null;
      if (!link) {
        link = document.createElement('link');
        link.rel = 'icon';
        document.head.appendChild(link);
      }
      if (favicon.toLowerCase().startsWith('<svg')) {
        const blob = new Blob([favicon], { type: 'image/svg+xml' });
        link.href = URL.createObjectURL(blob);
      } else {
        link.href = favicon;
      }
    }

    // Inject Google Analytics if configured
    if (gaId && !document.getElementById('ga-script-src')) {
      const scriptSrc = document.createElement('script');
      scriptSrc.id = 'ga-script-src';
      scriptSrc.async = true;
      scriptSrc.src = `https://www.googletagmanager.com/gtag/js?id=${gaId}`;
      document.head.appendChild(scriptSrc);

      const scriptInit = document.createElement('script');
      scriptInit.id = 'ga-script-init';
      scriptInit.innerHTML = `
        window.dataLayer = window.dataLayer || [];
        function gtag(){dataLayer.push(arguments);}
        gtag('js', new Date());
        gtag('config', '${gaId}');
      `;
      document.head.appendChild(scriptInit);
    }
  }, [company]);
}
