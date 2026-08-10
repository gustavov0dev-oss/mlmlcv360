// ─────────────────────────────────────────────────────────────────────────
// MIDDLEWARE: sirve meta tags OG/Twitter dinámicos a los bots de redes
// sociales (Facebook, WhatsApp, X, LinkedIn, Telegram, Discord, etc.)
//
// Estos bots NO ejecutan JavaScript, así que nunca ven lo que useSeo()
// aplica en tiempo de ejecución. Este middleware detecta su User-Agent,
// consulta la tabla `system_config` en Supabase (la misma que llena el
// Panel de Admin) y devuelve el HTML con las etiquetas ya correctas.
//
// Los visitantes humanos normales pasan de largo sin ningún cambio.
//
// Escrito con Request/Response/URL estándar (Web API) — NO usa `next/server`,
// porque este proyecto es Vite puro, no Next.js.
// ─────────────────────────────────────────────────────────────────────────

export const config = {
  matcher: [
    // Corre en todas las rutas de páginas, pero NO en archivos estáticos
    // (imágenes, css, js, fuentes, manifest, etc.)
    '/((?!api|_next|assets|.*\\.(?:js|css|png|jpg|jpeg|svg|ico|webp|json|txt|xml|woff|woff2)).*)',
  ],
};

// User-Agents conocidos de bots que generan vistas previas de enlaces
const BOT_UA_REGEX =
  /facebookexternalhit|Facebot|WhatsApp|Twitterbot|LinkedInBot|Slackbot|TelegramBot|Discordbot|redditbot|Pinterest|vkShare|Skype|W3C_Validator|Applebot|Googlebot|Bingbot|Yandex|SkypeUriPreview/i;

interface SystemConfigRow {
  key: string;
  value: string;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

async function fetchSeoConfig(): Promise<Record<string, string>> {
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) return {};

  const keys = [
    'company_name',
    'seo_title',
    'seo_description',
    'seo_keywords',
    'seo_og_image',
    'website_url',
    'tagline',
    'slogan',
  ];

  const filter = keys.map((k) => `"${k}"`).join(',');
  const url = `${supabaseUrl}/rest/v1/system_config?key=in.(${filter})&select=key,value`;

  try {
    const res = await fetch(url, {
      headers: {
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${supabaseAnonKey}`,
      },
    });
    if (!res.ok) return {};
    const rows: SystemConfigRow[] = await res.json();
    const map: Record<string, string> = {};
    rows.forEach((r) => {
      map[r.key] = r.value;
    });
    return map;
  } catch {
    return {};
  }
}

function setTag(html: string, selectorRegex: RegExp, tagHtml: string): string {
  if (selectorRegex.test(html)) return html.replace(selectorRegex, tagHtml);
  return html.replace('</head>', `  ${tagHtml}\n  </head>`);
}

export default async function middleware(request: Request) {
  const userAgent = request.headers.get('user-agent') || '';
  const isBot = BOT_UA_REGEX.test(userAgent);

  // Si no es un bot conocido, no tocamos nada — sigue el flujo normal.
  if (!isBot) {
    return;
  }

  const requestUrl = new URL(request.url);
  const origin = requestUrl.origin;

  const config = await fetchSeoConfig();

  const companyName = config.company_name || 'MLM 360';
  const title = config.seo_title || `${companyName} - Sistema Empresarial Premium`;
  const description =
    config.seo_description ||
    'Sistema MLM empresarial premium. Gestiona tu red de afiliados y comisiones.';
  const ogImage = config.seo_og_image || '';
  const pageUrl = `${origin}${requestUrl.pathname}`;

  // Trae el index.html real que ya sirve Vercel (el build estático)
  const htmlRes = await fetch(`${origin}/index.html`);
  let html = await htmlRes.text();

  html = html.replace(/<title>.*?<\/title>/, `<title>${escapeHtml(title)}</title>`);

  html = setTag(
    html,
    /<meta\s+name="description"[^>]*>/,
    `<meta name="description" content="${escapeHtml(description)}" />`,
  );
  html = setTag(
    html,
    /<meta\s+property="og:title"[^>]*>/,
    `<meta property="og:title" content="${escapeHtml(title)}" />`,
  );
  html = setTag(
    html,
    /<meta\s+property="og:description"[^>]*>/,
    `<meta property="og:description" content="${escapeHtml(description)}" />`,
  );
  html = setTag(
    html,
    /<meta\s+property="og:site_name"[^>]*>/,
    `<meta property="og:site_name" content="${escapeHtml(companyName)}" />`,
  );
  html = setTag(
    html,
    /<meta\s+property="og:url"[^>]*>/,
    `<meta property="og:url" content="${escapeHtml(pageUrl)}" />`,
  );
  if (ogImage) {
    html = setTag(
      html,
      /<meta\s+property="og:image"[^>]*>/,
      `<meta property="og:image" content="${escapeHtml(ogImage)}" />`,
    );
  }
  html = setTag(
    html,
    /<meta\s+name="twitter:title"[^>]*>/,
    `<meta name="twitter:title" content="${escapeHtml(title)}" />`,
  );
  html = setTag(
    html,
    /<meta\s+name="twitter:description"[^>]*>/,
    `<meta name="twitter:description" content="${escapeHtml(description)}" />`,
  );
  if (ogImage) {
    html = setTag(
      html,
      /<meta\s+name="twitter:image"[^>]*>/,
      `<meta name="twitter:image" content="${escapeHtml(ogImage)}" />`,
    );
  }

  return new Response(html, {
    status: 200,
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'public, max-age=0, s-maxage=300',
    },
  });
}
