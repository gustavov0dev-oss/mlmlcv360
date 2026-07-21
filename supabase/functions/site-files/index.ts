import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface ConfigMap { [key: string]: string }

async function loadConfig(): Promise<ConfigMap> {
  const { data, error } = await supabase
    .from('system_config')
    .select('key, value');
  if (error || !data) return {};
  const map: ConfigMap = {};
  for (const row of data as Array<{ key: string; value: string }>) {
    map[row.key] = row.value;
  }
  return map;
}

function firstNonEmpty(...values: Array<string | undefined | null>): string {
  for (const v of values) {
    if (v && v.trim()) return v.trim();
  }
  return '';
}

function buildManifest(cfg: ConfigMap): string {
  const name = firstNonEmpty(cfg.company_name, cfg.pwa_name, 'MLM 360');
  const shortName = firstNonEmpty(cfg.pwa_short_name, cfg.company_short_name, name);
  const description = firstNonEmpty(
    cfg.pwa_description,
    cfg.seo_description,
    cfg.tagline,
    cfg.slogan,
    'Sistema MLM empresarial premium.',
  );
  const themeColor = firstNonEmpty(cfg.pwa_theme_color, cfg.theme_color, '#C79B3B');
  const backgroundColor = firstNonEmpty(cfg.pwa_background_color, '#ffffff');
  const lang = firstNonEmpty(cfg.pwa_lang, 'es-PE');
  const startUrl = firstNonEmpty(cfg.pwa_start_url, '/');
  const scope = firstNonEmpty(cfg.pwa_scope, '/');
  const display = firstNonEmpty(cfg.pwa_display, 'standalone');
  const orientation = firstNonEmpty(cfg.pwa_orientation, 'any');
  const categoriesRaw = firstNonEmpty(cfg.pwa_categories, 'business, finance, productivity');
  const categories = categoriesRaw.split(',').map(s => s.trim()).filter(Boolean);

  // Icons: prefer configured favicon/logo; fall back to inline SVG generated from first letter
  const iconSrc = firstNonEmpty(cfg.favicon_value, cfg.logo_value, cfg.pwa_icon);
  const letter = (name.charAt(0) || 'M').toUpperCase();
  const icons: Array<{ src: string; sizes: string; type: string; purpose?: string }> = [];

  if (iconSrc && (iconSrc.startsWith('http') || iconSrc.startsWith('/'))) {
    icons.push(
      { src: iconSrc, sizes: '192x192', type: 'image/png', purpose: 'any maskable' },
      { src: iconSrc, sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
    );
  } else {
    const svg192 = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 192 192'%3E%3Crect width='192' height='192' rx='32' fill='${encodeURIComponent(themeColor)}'/%3E%3Ctext x='96' y='124' font-size='86' font-family='system-ui,sans-serif' font-weight='bold' fill='white' text-anchor='middle'%3E${letter}%3C/text%3E%3C/svg%3E`;
    const svg512 = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 512 512'%3E%3Crect width='512' height='512' rx='80' fill='${encodeURIComponent(themeColor)}'/%3E%3Ctext x='256' y='324' font-size='230' font-family='system-ui,sans-serif' font-weight='bold' fill='white' text-anchor='middle'%3E${letter}%3C/text%3E%3C/svg%3E`;
    icons.push(
      { src: svg192, sizes: '192x192', type: 'image/svg+xml', purpose: 'any maskable' },
      { src: svg512, sizes: '512x512', type: 'image/svg+xml', purpose: 'any maskable' },
    );
  }

  const manifest: Record<string, unknown> = {
    name,
    short_name: shortName,
    description,
    start_url: startUrl,
    scope,
    display,
    orientation,
    background_color: backgroundColor,
    theme_color: themeColor,
    categories: categories.length ? categories : ['business', 'finance', 'productivity'],
    lang,
    icons,
  };

  return JSON.stringify(manifest, null, 2);
}

function buildRobots(cfg: ConfigMap): string {
  const websiteUrl = firstNonEmpty(cfg.website_url, cfg.seo_canonical_url, 'https://mlm360.pe');
  const disallowRaw = firstNonEmpty(cfg.robots_disallow, '/dashboard, /login, /registro, /reset-password, /checkout, /carrito, /favoritos, /pedidos, /admin');
  const disallowLines = disallowRaw
    .split(',')
    .map(s => s.trim())
    .filter(Boolean)
    .map(p => `Disallow: ${p.startsWith('/') ? p : `/${p}`}`)
    .join('\n');

  const allowRaw = firstNonEmpty(cfg.robots_allow, '/');
  const allowLines = allowRaw
    .split(',')
    .map(s => s.trim())
    .filter(Boolean)
    .map(p => `Allow: ${p.startsWith('/') ? p : `/${p}`}`)
    .join('\n');

  const sitemapLine = `Sitemap: ${websiteUrl.replace(/\/$/, '')}/sitemap.xml`;

  return [
    'User-agent: *',
    allowLines,
    disallowLines,
    sitemapLine,
  ].filter(Boolean).join('\n') + '\n';
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

async function buildSitemap(cfg: ConfigMap): Promise<string> {
  const websiteUrl = firstNonEmpty(cfg.website_url, cfg.seo_canonical_url, 'https://mlm360.pe').replace(/\/$/, '');

  // Static landing routes
  const staticRoutes: Array<{ path: string; changefreq: string; priority: string }> = [
    { path: '/', changefreq: 'weekly', priority: '1.0' },
    { path: '/nosotros', changefreq: 'monthly', priority: '0.8' },
    { path: '/planes', changefreq: 'weekly', priority: '0.9' },
    { path: '/empresa', changefreq: 'monthly', priority: '0.7' },
    { path: '/blog', changefreq: 'weekly', priority: '0.6' },
    { path: '/contacto', changefreq: 'monthly', priority: '0.7' },
    { path: '/tienda', changefreq: 'weekly', priority: '0.9' },
    { path: '/libro-reclamaciones', changefreq: 'monthly', priority: '0.5' },
  ];

  const urls: Array<string> = [];

  for (const r of staticRoutes) {
    urls.push(`  <url>
    <loc>${websiteUrl}${r.path}</loc>
    <changefreq>${r.changefreq}</changefreq>
    <priority>${r.priority}</priority>
  </url>`);
  }

  // Dynamic blog posts
  try {
    const { data: posts } = await supabase
      .from('blog_posts')
      .select('slug, updated_at, published_at')
      .eq('status', 'published');
    if (posts && Array.isArray(posts)) {
      for (const p of posts as Array<{ slug: string; updated_at?: string; published_at?: string }>) {
        const lastmod = (p.updated_at || p.published_at || '').slice(0, 10);
        urls.push(`  <url>
    <loc>${websiteUrl}/blog/${escapeXml(p.slug)}</loc>
    <changefreq>weekly</changefreq>
    <priority>0.6</priority>${lastmod ? `\n    <lastmod>${lastmod}</lastmod>` : ''}
  </url>`);
      }
    }
  } catch { /* table may not exist */ }

  // Dynamic products
  try {
    const { data: products } = await supabase
      .from('products')
      .select('slug, updated_at')
      .eq('is_active', true);
    if (products && Array.isArray(products)) {
      for (const p of products as Array<{ slug: string; updated_at?: string }>) {
        const lastmod = (p.updated_at || '').slice(0, 10);
        urls.push(`  <url>
    <loc>${websiteUrl}/tienda/${escapeXml(p.slug)}</loc>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>${lastmod ? `\n    <lastmod>${lastmod}</lastmod>` : ''}
  </url>`);
      }
    }
  } catch { /* table may not exist */ }

  // Dynamic legal pages
  try {
    const { data: legal } = await supabase
      .from('legal_pages')
      .select('slug, updated_at')
      .eq('is_published', true);
    if (legal && Array.isArray(legal)) {
      for (const l of legal as Array<{ slug: string; updated_at?: string }>) {
        const lastmod = (l.updated_at || '').slice(0, 10);
        urls.push(`  <url>
    <loc>${websiteUrl}/legal/${escapeXml(l.slug)}</loc>
    <changefreq>monthly</changefreq>
    <priority>0.5</priority>${lastmod ? `\n    <lastmod>${lastmod}</lastmod>` : ''}
  </url>`);
      }
    }
  } catch { /* table may not exist */ }

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join('\n')}
</urlset>
`;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  const url = new URL(req.url);
  const path = url.pathname;

  try {
    const cfg = await loadConfig();

    if (path.endsWith('/manifest.json') || path === '/manifest.json') {
      return new Response(buildManifest(cfg), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/manifest+json; charset=utf-8',
          'Cache-Control': 'public, max-age=300',
        },
      });
    }

    if (path.endsWith('/robots.txt') || path === '/robots.txt') {
      return new Response(buildRobots(cfg), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'text/plain; charset=utf-8',
          'Cache-Control': 'public, max-age=300',
        },
      });
    }

    if (path.endsWith('/sitemap.xml') || path === '/sitemap.xml') {
      const xml = await buildSitemap(cfg);
      return new Response(xml, {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/xml; charset=utf-8',
          'Cache-Control': 'public, max-age=300',
        },
      });
    }

    return new Response(JSON.stringify({ error: 'Not found', path }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Internal error', detail: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
