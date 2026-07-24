import { cn } from '@/lib/utils';
import { ShoppingBag } from 'lucide-react';

interface FreeShippingBarProps {
  subtotal: number;
  threshold: number;
  currency?: string;
}

function fmt(n: number, c = 'PEN') {
  return c === 'USD' ? `$${n.toFixed(2)}` : `S/ ${n.toFixed(2)}`;
}

export default function FreeShippingBar({ subtotal, threshold, currency = 'PEN' }: FreeShippingBarProps) {
  const pct = Math.min((subtotal / threshold) * 100, 100);
  const remaining = Math.max(threshold - subtotal, 0);
  const achieved = subtotal >= threshold;

  return (
    <div className={cn(
      'rounded-xl p-3 border transition-colors',
      achieved ? 'bg-green-500/10 border-green-500/30' : 'bg-muted border-border'
    )}>
      <div className="flex items-center gap-2 mb-2">
        <ShoppingBag className={cn('w-4 h-4 flex-shrink-0', achieved ? 'text-green-500' : 'text-muted-foreground')} />
        <p className="text-xs font-semibold text-foreground">
          {achieved
            ? '¡Envío gratis aplicado!'
            : <>Agrega <strong className="text-primary">{fmt(remaining, currency)}</strong> más para envío gratis</>}
        </p>
      </div>
      <div className="h-1.5 bg-border rounded-full overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all duration-500', achieved ? 'bg-green-500' : 'bg-primary')}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
