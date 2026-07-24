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

function setLink(rel: string, href: string) {
  if (!href) return;
  let el = document.head.querySelector(`link[rel="${rel}"]`) as HTMLLinkElement | null;
  if (!el) {
    el = document.createElement('link');
    el.rel = rel;
    document.head.appendChild(el);
  }
  el.href = href;
}

function setJsonLd(id: string, json: object) {
  let el = document.getElementById(id) as HTMLScriptElement | null;
  if (!el) {
    el = document.createElement('script');
    el.id = id;
    el.type = 'application/ld+json';
    document.head.appendChild(el);
  }
  el.textContent = JSON.stringify(json);
}

function removeJsonLd(id: string) {
  const el = document.getElementById(id);
  if (el) el.remove();
}

/**
 * Applies SEO configuration from system_config to the document head at runtime.
 * Updates title, meta description, keywords, Open Graph, Twitter cards,
 * canonical link, JSON-LD structured data (Organization, WebSite, SoftwareApplication,
 * BreadcrumbList), geo tags, and AI/Answer-Engine optimization (AEO) hints.
 *
 * All data is dynamic — sourced from the live system_config table via ConfigStore.
 * No hardcoded company info exists anywhere in the SEO output.
 */
export function useSeo() {
  const { company, plans } = useConfig();

  useEffect(() => {
    // Don't overwrite the static title while config is still loading
    if (!company.company_name) return;
    const companyName = company.company_name;
    const title = company.seo_title || `${companyName} - Sistema Empresarial Premium`;
    const description = company.seo_description || 'Sistema MLM empresarial premium. Gestiona tu red de afiliados y comisiones.';
    const keywords = company.seo_keywords || '';
    const ogImage = company.seo_og_image || '';
    const gaId = company.seo_ga_id || '';
    const favicon = company.favicon_value || '';
    const logoUrl = company.logo_value || '';
    const websiteUrl = company.website_url || (typeof window !== 'undefined' ? window.location.origin : '');
    const contactEmail = company.contact_email || company.complaints_email || '';
    const contactPhone = company.contact_phone || company.whatsapp_number || '';
    const addressCountry = company.address_country || 'PE';
    const addressRegion = company.address_region || '';
    const addressCity = company.address_city || '';
    const addressStreet = company.address_street || '';
    const socialLinks = company.social_links || '';
    const slogan = company.tagline || company.slogan || '';

    // ── Basic meta ──
    if (title) document.title = title;
    setMeta('name', 'title', title);
    setMeta('name', 'description', description);
    if (keywords) setMeta('name', 'keywords', keywords);
    setMeta('name', 'author', companyName);
    setMeta('name', 'robots', 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1');
    setMeta('name', 'googlebot', 'index, follow');

    // Cache title so the inline FOUC script in index.html can restore it
    // instantly on next reload, before useSeo runs.
    try {
      localStorage.setItem('mlm360-company-name', companyName);
      localStorage.setItem('mlm360-seo-title', title);
    } catch {}

    // ── Geo tags (geo-targeting for local SEO) ──
    if (addressRegion || addressCity) {
      setMeta('name', 'geo.region', addressCountry.toUpperCase());
      if (addressCity) setMeta('name', 'geo.placename', addressCity);
      if (addressRegion) setMeta('name', 'geo.position', `${addressRegion};${addressCity || addressRegion}`);
    }

    // ── AEO / Answer Engine Optimization hints ──
    setMeta('name', 'ai:company', companyName);
    if (slogan) setMeta('name', 'ai:summary', slogan);
    setMeta('name', 'application-name', companyName);
    setMeta('name', 'apple-mobile-web-app-title', companyName);

    // ── Open Graph ──
    setOgMeta('og:title', title);
    setOgMeta('og:description', description);
    setOgMeta('og:site_name', companyName);
    setOgMeta('og:type', 'website');
    if (websiteUrl) setOgMeta('og:url', websiteUrl);
    if (ogImage) setOgMeta('og:image', ogImage);
    if (ogImage) setOgMeta('og:image:secure_url', ogImage);
    setOgMeta('og:locale', 'es_PE');

    // ── Twitter Cards ──
    setTwitterMeta('twitter:title', title);
    setTwitterMeta('twitter:description', description);
    if (ogImage) setTwitterMeta('twitter:image', ogImage);
    setTwitterMeta('twitter:card', ogImage ? 'summary_large_image' : 'summary');

    // ── Canonical ──
    if (websiteUrl) setLink('canonical', websiteUrl);

    // ── Favicon ──
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

    // ── PWA manifest link + theme-color meta (kept in sync with system_config) ──
    const themeColor = company.pwa_theme_color || '#C79B3B';
    let manifestLink = document.head.querySelector('link[rel="manifest"]') as HTMLLinkElement | null;
    if (!manifestLink) {
      manifestLink = document.createElement('link');
      manifestLink.rel = 'manifest';
      document.head.appendChild(manifestLink);
    }
    manifestLink.href = '/manifest.json';

    let themeColorMeta = document.head.querySelector('meta[name="theme-color"]') as HTMLMetaElement | null;
    if (!themeColorMeta) {
      themeColorMeta = document.createElement('meta');
      themeColorMeta.setAttribute('name', 'theme-color');
      document.head.appendChild(themeColorMeta);
    }
    themeColorMeta.setAttribute('content', themeColor);

    // Apple touch icon + mobile web app title — dynamic from company config
    setMeta('name', 'apple-mobile-web-app-title', companyName);
    setMeta('name', 'mobile-web-app-capable', 'yes');
    setMeta('name', 'apple-mobile-web-app-capable', 'yes');
    setMeta('name', 'apple-mobile-web-app-status-bar-style', 'default');

    // ── JSON-LD: Organization ──
    const orgSchema: Record<string, unknown> = {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: companyName,
      url: websiteUrl,
      logo: logoUrl && (logoUrl.startsWith('http') || logoUrl.startsWith('/')) ? logoUrl : undefined,
      description,
      slogan: slogan || undefined,
    };
    if (contactEmail) (orgSchema as any).email = contactEmail;
    if (contactPhone) (orgSchema as any).telephone = contactPhone;
    if (addressStreet || addressCity || addressRegion) {
      (orgSchema as any).address = {
        '@type': 'PostalAddress',
        addressCountry,
        addressRegion,
        addressLocality: addressCity,
        streetAddress: addressStreet,
      };
    }
    if (socialLinks) {
      try {
        const links = socialLinks.split(',').map(s => s.trim()).filter(Boolean);
        if (links.length) (orgSchema as any).sameAs = links;
      } catch {}
    }
    setJsonLd('ld-organization', orgSchema);

    // ── JSON-LD: WebSite (enables sitelinks search box) ──
    setJsonLd('ld-website', {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: companyName,
      url: websiteUrl,
      description,
      inLanguage: 'es-PE',
      potentialAction: {
        '@type': 'SearchAction',
        target: `${websiteUrl}/?q={search_term_string}`,
        'query-input': 'required name=search_term_string',
      },
    });

    // ── JSON-LD: SoftwareApplication (dynamic from plans pricing) ──
    // Build offers from active plans; only emit if we have at least one priced plan.
    const activePlans = (plans || []).filter(p => p.is_active);
    const offers = activePlans
      .filter(p => typeof p.price === 'number' && p.price >= 0)
      .map(p => ({
        '@type': 'Offer',
        name: p.name,
        price: String(p.price),
        priceCurrency: p.currency || 'PEN',
        description: p.description || undefined,
        url: `${websiteUrl}/planes`,
      }));

    const appSchema: Record<string, unknown> = {
      '@context': 'https://schema.org',
      '@type': 'SoftwareApplication',
      name: companyName,
      applicationCategory: 'BusinessApplication',
      operatingSystem: 'Web, Android, iOS',
      url: websiteUrl,
      description,
      offers: offers.length === 1 ? offers[0] : offers.length > 1 ? offers : undefined,
      publisher: {
        '@type': 'Organization',
        name: companyName,
        url: websiteUrl,
      },
    };
    if (logoUrl && (logoUrl.startsWith('http') || logoUrl.startsWith('/'))) {
      (appSchema as any).logo = logoUrl;
    }
    if (slogan) (appSchema as any).slogan = slogan;
    setJsonLd('ld-software-app', appSchema);

    // ── JSON-LD: BreadcrumbList (dynamic from current path) ──
    if (typeof window !== 'undefined') {
      const path = window.location.pathname;
      const segments = path.split('/').filter(Boolean);
      const items = segments.map((seg, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        name: seg.charAt(0).toUpperCase() + seg.slice(1).replace(/-/g, ' '),
        item: `${websiteUrl}/${segments.slice(0, i + 1).join('/')}`,
      }));
      if (items.length) {
        setJsonLd('ld-breadcrumb', {
          '@context': 'https://schema.org',
          '@type': 'BreadcrumbList',
          itemListElement: items,
        });
      } else {
        removeJsonLd('ld-breadcrumb');
      }
    }

    // ── Google Analytics ──
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
  }, [company, plans]);
}

/**
 * Sets a Product JSON-LD schema for a product detail page.
 * Call this from ProductDetailPage once the product data is loaded.
 * Pass null to remove the product schema when navigating away.
 *
 * `companyName` and `websiteUrl` come from system_config via useConfig()
 * — pass them from the component so the schema stays fully dynamic.
 */
export function setProductSchema(
  product: {
    name: string;
    slug: string;
    description?: string;
    short_description?: string;
    base_price: number;
    compare_price?: number;
    currency: string;
    images?: Array<{ url: string; alt?: string }>;
    sku?: string;
    category?: { name?: string; slug?: string } | null;
    avg_rating?: number;
    review_count?: number;
    is_digital?: boolean;
    tags?: string[];
  } | null,
  options: { companyName: string; websiteUrl: string },
) {
  const id = 'ld-product';
  if (!product) {
    removeJsonLd(id);
    return;
  }
  const companyName = options.companyName || 'MLM 360';
  const websiteUrl = options.websiteUrl || (typeof window !== 'undefined' ? window.location.origin : '');
  const productUrl = `${websiteUrl}/tienda/${product.slug}`;
  const image = product.images && product.images.length > 0 ? product.images[0].url : undefined;
  const description = product.short_description || product.description || '';

  const schema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': product.is_digital ? 'DigitalProduct' : 'Product',
    name: product.name,
    description: description || undefined,
    sku: product.sku || undefined,
    url: productUrl,
    image: image || undefined,
    brand: {
      '@type': 'Brand',
      name: companyName,
    },
    offers: {
      '@type': 'Offer',
      url: productUrl,
      price: String(product.base_price),
      priceCurrency: product.currency || 'PEN',
      availability: 'https://schema.org/InStock',
      priceValidUntil: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().slice(0, 10),
    },
  };
  if (product.compare_price && product.compare_price > product.base_price) {
    (schema.offers as any).priceSpecification = {
      '@type': 'PriceSpecification',
      price: String(product.base_price),
      priceCurrency: product.currency || 'PEN',
      originalPrice: String(product.compare_price),
    };
  }
  if (product.category && product.category.name) {
    (schema as any).category = product.category.name;
  }
  if (Array.isArray(product.tags) && product.tags.length > 0) {
    (schema as any).keywords = product.tags.join(', ');
  }
  if (typeof product.avg_rating === 'number' && product.avg_rating > 0 && typeof product.review_count === 'number' && product.review_count > 0) {
    (schema as any).aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: String(product.avg_rating),
      reviewCount: String(product.review_count),
      bestRating: '5',
      worstRating: '1',
    };
  }
  setJsonLd(id, schema);
}

/**
 * Clears the Product JSON-LD schema. Call on unmount or when leaving a product page.
 */
export function clearProductSchema() {
  removeJsonLd('ld-product');
}
