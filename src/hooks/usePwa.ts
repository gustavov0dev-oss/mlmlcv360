import { useEffect } from 'react';
import { useConfig } from '@/store/configStore';

const DEFAULT_THEME = '#C79B3B';
const DEFAULT_BG = '#ffffff';
const FALLBACK_ICON_192 =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 192 192'%3E%3Crect width='192' height='192' rx='32' fill='%23C79B3B'/%3E%3Ctext x='96' y='124' font-size='86' font-family='system-ui,sans-serif' font-weight='bold' fill='white' text-anchor='middle'%3EM%3C/text%3E%3C/svg%3E";
const FALLBACK_ICON_512 =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 512 512'%3E%3Crect width='512' height='512' rx='80' fill='%23C79B3B'/%3E%3Ctext x='256' y='324' font-size='230' font-family='system-ui,sans-serif' font-weight='bold' fill='white' text-anchor='middle'%3EM%3C/text%3E%3C/svg%3E";

function buildIcons(iconValue: string | undefined) {
  const icon = (iconValue || '').trim();
  const isSvg = icon.toLowerCase().startsWith('<svg');
  const isUrl = icon.startsWith('http') || icon.startsWith('/') || icon.startsWith('data:');

  if (isSvg) {
    const enc = encodeURIComponent(icon);
    return [
      { src: `data:image/svg+xml,${enc}`, sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
      { src: `data:image/svg+xml,${enc}`, sizes: 'any', type: 'image/svg+xml', purpose: 'maskable' },
    ];
  }
  if (isUrl) {
    return [
      { src: icon, sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: icon, sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: icon, sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ];
  }
  return [
    { src: FALLBACK_ICON_192, sizes: '192x192', type: 'image/svg+xml', purpose: 'any' },
    { src: FALLBACK_ICON_512, sizes: '512x512', type: 'image/svg+xml', purpose: 'any' },
  ];
}

function buildScreenshots(company: Record<string, string>) {
  const out: { src: string; sizes: string; type: string; form_factor: 'narrow' | 'wide' }[] = [];
  const add = (raw: string, formFactor: 'narrow' | 'wide') => {
    const v = (raw || '').trim();
    if (!v) return;
    const urls = v.split(',').map((s) => s.trim()).filter(Boolean);
    for (const url of urls) {
      const type = url.toLowerCase().endsWith('.png') ? 'image/png' : url.toLowerCase().endsWith('.jpg') || url.toLowerCase().endsWith('.jpeg') ? 'image/jpeg' : 'image/png';
      out.push({
        src: url,
        sizes: formFactor === 'narrow' ? '1080x1920' : '1920x1080',
        type,
        form_factor: formFactor,
      });
    }
  };
  add(company.pwa_screenshot_mobile, 'narrow');
  add(company.pwa_screenshot_desktop, 'wide');
  return out;
}

export function usePwa() {
  const { company } = useConfig();

  useEffect(() => {
    const name = company.pwa_name || `${company.company_name || 'MLM 360'} - Sistema Empresarial`;
    const shortName = company.pwa_short_name || company.company_name || 'MLM 360';
    const description = company.pwa_description || 'Sistema MLM empresarial para gestionar redes de afiliados y comisiones.';
    const themeColor = company.pwa_theme_color || DEFAULT_THEME;
    const bgColor = company.pwa_background_color || DEFAULT_BG;
    const icon = company.pwa_icon || company.favicon_value || company.logo_value || '';

    const manifest = {
      name,
      short_name: shortName,
      description,
      start_url: '/',
      scope: '/',
      display: 'standalone',
      orientation: 'any',
      background_color: bgColor,
      theme_color: themeColor,
      categories: ['business', 'finance', 'productivity'],
      lang: 'es-PE',
      icons: buildIcons(icon),
      screenshots: buildScreenshots(company),
    };

    // Use data URL instead of blob URL for better PWA install support across browsers
    const manifestStr = JSON.stringify(manifest);
    const url = `data:application/manifest+json,${encodeURIComponent(manifestStr)}`;

    let link = document.head.querySelector('link[rel="manifest"]') as HTMLLinkElement | null;
    if (!link) {
      link = document.createElement('link');
      link.rel = 'manifest';
      document.head.appendChild(link);
    }
    link.href = url;

    let themeMeta = document.head.querySelector('meta[name="theme-color"]') as HTMLMetaElement | null;
    if (!themeMeta) {
      themeMeta = document.createElement('meta');
      themeMeta.name = 'theme-color';
      document.head.appendChild(themeMeta);
    }
    themeMeta.content = themeColor;

    // Register service worker for PWA installability
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }

    return () => {
      // data URLs don't need revocation
    };
  }, [company]);
}
