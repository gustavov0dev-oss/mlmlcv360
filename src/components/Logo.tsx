import { useMemo } from 'react';
import { Boxes } from 'lucide-react';
import { cn } from '@/lib/utils';

// ── SVG sanitisation ──────────────────────────────────────────────────────────

const SAFE_SVG_TAGS = new Set([
  'svg','g','path','circle','ellipse','rect','line','polyline','polygon',
  'text','tspan','defs','lineargradient','radialgradient','stop','clippath',
  'mask','use','symbol','title','desc','pattern',
]);

function sanitizeSvg(raw: string): string {
  return raw
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/<foreignObject[\s\S]*?<\/foreignObject>/gi, '')
    .replace(/<([a-zA-Z][a-zA-Z0-9]*)([^>]*)>/g, (match, tag) => {
      if (!SAFE_SVG_TAGS.has(tag.toLowerCase())) return '';
      // strip event handlers from kept tags
      const safe = match.replace(/\s+on\w+\s*=\s*["'][^"']*["']/gi, '');
      return safe;
    })
    .trim();
}

// ── Type detection ────────────────────────────────────────────────────────────

export type LogoType = 'svg' | 'img' | 'fallback';

export function detectLogoType(value: string): LogoType {
  const t = (value || '').trim();
  if (!t) return 'fallback';
  if (t.toLowerCase().startsWith('<svg')) return 'svg';
  if (t.startsWith('http://') || t.startsWith('https://') || t.startsWith('/')) return 'img';
  return 'fallback';
}

// ── Component ─────────────────────────────────────────────────────────────────

interface LogoProps {
  /** The raw logo value from system_config: SVG code, URL, or empty */
  value?: string;
  /** Text to show as fallback AND as alt text for images */
  fallbackText?: string;
  /** Tailwind size for the mark wrapper. Default: 'w-8 h-8' */
  size?: string;
  /** Pixel size for dynamic width (overrides Tailwind size) */
  pixelSize?: number;
  /** Pixel height — when set, width=pixelSize and height=pixelHeight (independent) */
  pixelHeight?: number;
  /** Extra className on the img tag */
  imgClass?: string;
}

/**
 * Renders the system logo from `value`.
 * - SVG string  → sanitised inline SVG
 * - URL / path  → <img>
 * - empty       → Boxes icon in a primary-coloured pill
 *
 * Never renders the raw string as visible text.
 */
export default function Logo({
  value = '',
  fallbackText = 'MLM 360',
  size = 'w-8 h-8',
  pixelSize,
  pixelHeight,
  imgClass,
}: LogoProps) {
  const type = useMemo(() => detectLogoType(value), [value]);
  const safeSvg = useMemo(() => (type === 'svg' ? sanitizeSvg(value) : ''), [type, value]);
  const pxStyle = pixelSize
    ? { width: `${pixelSize}px`, height: `${pixelHeight ?? pixelSize}px` }
    : {};

  if (type === 'svg') {
    return (
      <span
        className={cn(pixelSize ? '' : size, 'inline-flex items-center justify-center [&>svg]:w-full [&>svg]:h-full flex-shrink-0')}
        style={pxStyle}
        // sanitised above — no scripts, no event handlers
        dangerouslySetInnerHTML={{ __html: safeSvg }}
        aria-label={fallbackText}
        role="img"
      />
    );
  }

  if (type === 'img') {
    return (
      <img
        src={value.trim()}
        alt={fallbackText}
        className={cn(pixelSize ? '' : size, 'object-contain flex-shrink-0', imgClass)}
        style={pxStyle}
        onError={(e) => {
          const el = e.currentTarget;
          el.style.display = 'none';
          // reveal sibling fallback if present
          const fallback = el.nextElementSibling as HTMLElement | null;
          if (fallback) fallback.style.display = '';
        }}
      />
    );
  }

  // Fallback: branded icon box
  return (
    <div className={cn(pixelSize ? '' : size, 'rounded-lg bg-primary flex items-center justify-center flex-shrink-0')} style={pxStyle}>
      <Boxes className="w-[55%] h-[55%] text-primary-foreground" />
    </div>
  );
}

/**
 * Logo + optional text label side by side.
 * The text label is hidden automatically when a real logo (image or SVG) is set,
 * unless `forceText` is passed as true.
 */
export function LogoWithText({
  value = '',
  fallbackText = 'MLM 360',
  size = 'w-8 h-8',
  pixelSize,
  pixelHeight,
  textClass = 'text-lg font-bold text-foreground',
  forceText = false,
}: {
  value?: string;
  fallbackText?: string;
  size?: string;
  pixelSize?: number;
  pixelHeight?: number;
  textClass?: string;
  forceText?: boolean;
}) {
  const type = detectLogoType(value);
  const showLabel = forceText || type === 'fallback';

  return (
    <span className="flex items-center gap-2.5 min-w-0">
      <Logo value={value} fallbackText={fallbackText} size={size} pixelSize={pixelSize} pixelHeight={pixelHeight} />
      {showLabel && <span className={cn(textClass, 'truncate')}>{fallbackText}</span>}
    </span>
  );
}
