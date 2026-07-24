import { useState, useEffect } from 'react';
import { useDatabase } from '@/lib/backend';
import { useConfig } from '@/store/configStore';
import { useNavigate } from '@/lib/router';
import { Package, Printer, Download, QrCode, Check, Building2, Mail, Phone, MapPin, Hash, Truck, CreditCard, FileText } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface OrderItem {
  id: string;
  product_name: string;
  variant_name?: string;
  sku?: string;
  quantity: number;
  unit_price: number;
  discount_amount: number;
  total: number;
  image_url?: string;
}

interface Order {
  id: string;
  order_number: string;
  status: string;
  payment_status: string;
  payment_method?: string;
  payment_reference?: string;
  subtotal: number;
  discount_amount: number;
  shipping_amount: number;
  tax_amount: number;
  total: number;
  currency: string;
  shipping_address: any;
  billing_address: any;
  coupon_code?: string;
  shipping_method_name?: string;
  notes?: string;
  tracking_number?: string;
  created_at: string;
  items: OrderItem[];
}

function fmt(n: number, c = 'PEN') { return c === 'USD' ? `$${n.toFixed(2)}` : `S/ ${n.toFixed(2)}`; }

export default function InvoicePage() {
  const database = useDatabase();
  const { company, tax } = useConfig();
  const navigate = useNavigate();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  const orderId = window.location.pathname.split('/').pop();

  useEffect(() => {
    if (!orderId) return;
    const load = async () => {
      const { data } = await database.select('orders', {
        select: '*, items:order_items(*)',
        filter: { id: orderId },
        maybeSingle: true,
      });
      if (data) setOrder(data as Order);
      setLoading(false);
    };
    load();
  }, [orderId]);

  const handlePrint = () => window.print();
  const handleDownload = () => toast.success('Descargando PDF...');

  if (loading) {
    return (
      <div className="min-h-screen bg-muted/30 py-6 px-4">
        <div className="max-w-4xl mx-auto space-y-4">
          <div className="flex justify-end gap-3 mb-4">
            <Skeleton className="h-10 w-28 rounded-xl" />
            <Skeleton className="h-10 w-36 rounded-xl" />
          </div>
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            <Skeleton className="h-32 w-full" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-0">
              <Skeleton className="h-32" />
              <Skeleton className="h-32" />
            </div>
            <div className="p-5 space-y-3">
              {Array.from({length:4}).map((_,i)=>(<div key={i} className="flex items-center gap-4"><Skeleton className="w-10 h-10 rounded-lg flex-shrink-0" /><div className="flex-1 space-y-1.5"><Skeleton className="h-4 w-48" /><Skeleton className="h-3 w-24" /></div><Skeleton className="h-4 w-20" /></div>))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center">
          <Package className="w-10 h-10 text-muted-foreground/40" />
        </div>
        <h2 className="text-xl font-bold text-foreground">Pedido no encontrado</h2>
        <button onClick={() => navigate('/dashboard/pedidos')} className="text-primary font-semibold hover:underline">Volver a pedidos</button>
      </div>
    );
  }

  const addr = order.shipping_address || {};
  const bill = order.billing_address || addr;
  const isFactura = bill.invoice_type === 'factura' || addr.invoice_type === 'factura';
  const docType = isFactura ? 'FACTURA ELECTRONICA' : 'BOLETA DE VENTA ELECTRONICA';
  const docSeries = isFactura ? 'F001' : 'B001';
  const docNumber = order.order_number?.slice(-6).padStart(6, '0') || '000001';

  return (
    <div className="min-h-screen bg-muted/30 print:bg-white py-6 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Actions - Hidden when printing */}
        <div className="flex justify-end gap-3 mb-4 print:hidden">
          <button onClick={handlePrint} className="flex items-center gap-2 px-4 py-2.5 bg-card border border-border rounded-xl text-sm font-semibold hover:bg-muted transition-colors">
            <Printer className="w-4 h-4" /> Imprimir
          </button>
          <button onClick={handleDownload} className="flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors shadow-md shadow-primary/20">
            <Download className="w-4 h-4" /> Descargar PDF
          </button>
        </div>

        {/* Invoice Document */}
        <div className="bg-card rounded-xl shadow-xl overflow-hidden print:shadow-none print:rounded-none border border-border">

          {/* ── Header ── */}
          <div className="bg-primary text-primary-foreground p-6 print:bg-white print:text-foreground print:border-b-2 print:border-primary">
            <div className="flex justify-between items-start gap-4">
              {/* Company Info */}
              <div className="space-y-1">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-primary-foreground/10 flex items-center justify-center print:bg-primary/10">
                    <Building2 className="w-6 h-6 print:text-primary" />
                  </div>
                  <div>
                    <h1 className="text-xl font-bold uppercase tracking-tight print:text-primary">{company.company_name || 'Mi Empresa'}</h1>
                    <p className="text-xs font-semibold opacity-90 print:text-muted-foreground">EMPRESA COMERCIAL</p>
                  </div>
                </div>
                <div className="text-xs opacity-80 space-y-0.5 pt-2 print:text-muted-foreground">
                  <p className="flex items-center gap-1.5"><MapPin className="w-3 h-3" /> {company.company_address || 'Direccion fiscal'}</p>
                  <p className="flex items-center gap-1.5"><Phone className="w-3 h-3" /> {company.company_phone || 'Telefono'}</p>
                  <p className="flex items-center gap-1.5"><Mail className="w-3 h-3" /> {company.company_email || 'correo@empresa.com'}</p>
                </div>
              </div>

              {/* Document Type */}
              <div className="text-right space-y-2">
                <div className="inline-block bg-primary-foreground/10 px-4 py-2 rounded-lg print:bg-primary print:text-white">
                  <p className="text-[10px] font-bold opacity-70 uppercase tracking-widest">Documento</p>
                  <p className="text-lg font-bold leading-tight">{docType}</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-mono font-bold tracking-wide">{docSeries}-{docNumber}</p>
                </div>
              </div>
            </div>
          </div>

          {/* ── Client & Document Info ── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-border print:bg-black">
            {/* Client */}
            <div className="bg-card p-5 space-y-3 print:bg-white">
              <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5" /> Datos del Cliente
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{isFactura ? 'Razon Social' : 'Nombre'}:</span>
                  <span className="font-semibold text-foreground">{bill.full_name || addr.full_name || 'Cliente'}</span>
                </div>
                {isFactura && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">RUC:</span>
                    <span className="font-mono font-semibold text-foreground">{bill.ruc || addr.ruc || '-'}</span>
                  </div>
                )}
                {!isFactura && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">DNI:</span>
                    <span className="font-mono font-semibold text-foreground">{bill.dni || '-'}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Direccion:</span>
                  <span className="font-medium text-foreground text-right max-w-[200px]">{addr.address || '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Ubicacion:</span>
                  <span className="text-foreground">{[addr.district, addr.city, addr.region].filter(Boolean).join(', ') || '-'}</span>
                </div>
              </div>
            </div>

            {/* Document Details */}
            <div className="bg-card p-5 space-y-3 print:bg-white">
              <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Hash className="w-3.5 h-3.5" /> Datos del Comprobante
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Pedido Nro:</span>
                  <span className="font-mono font-semibold text-foreground">#{order.order_number}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Fecha de Emision:</span>
                  <span className="font-semibold text-foreground">{new Date(order.created_at).toLocaleDateString('es-PE', { day: '2-digit', month: 'long', year: 'numeric' })}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Moneda:</span>
                  <span className="font-semibold text-foreground">{order.currency === 'USD' ? 'Dolares (USD)' : 'Soles (PEN)'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Forma de Pago:</span>
                  <span className="font-semibold text-foreground">{order.payment_method || 'Pendiente'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Estado:</span>
                  <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold',
                    order.payment_status === 'paid' ? 'bg-green-500/15 text-green-600 dark:text-green-400' : 'bg-amber-500/15 text-amber-600 dark:text-amber-400')}>
                    {order.payment_status === 'paid' && <Check className="w-3 h-3" />}
                    {order.payment_status === 'paid' ? 'Pagado' : 'Pendiente'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* ── Items Table ── */}
          <div className="p-5">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-border print:border-black">
                  <th className="text-left py-3 px-2 font-bold text-muted-foreground text-xs uppercase tracking-wider">Descripcion</th>
                  <th className="text-center py-3 px-2 font-bold text-muted-foreground text-xs uppercase tracking-wider w-16">Cant.</th>
                  <th className="text-right py-3 px-2 font-bold text-muted-foreground text-xs uppercase tracking-wider w-24">P. Unit.</th>
                  <th className="text-right py-3 px-2 font-bold text-muted-foreground text-xs uppercase tracking-wider w-24">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {order.items.map((item, idx) => (
                  <tr key={item.id} className={cn('border-b border-border/50', idx % 2 === 0 ? 'bg-muted/20' : '')}>
                    <td className="py-3 px-2">
                      <div className="flex items-center gap-3">
                        {item.image_url && <img src={item.image_url} alt="" className="w-10 h-10 rounded-lg object-cover print:hidden" />}
                        <div>
                          <p className="font-semibold text-foreground">{item.product_name}</p>
                          {item.variant_name && <p className="text-xs text-muted-foreground">{item.variant_name}</p>}
                          {item.sku && <p className="text-[10px] font-mono text-muted-foreground">SKU: {item.sku}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-2 text-center font-medium text-foreground">{item.quantity}</td>
                    <td className="py-3 px-2 text-right text-foreground">{fmt(item.unit_price, order.currency)}</td>
                    <td className="py-3 px-2 text-right font-bold text-foreground">{fmt(item.total, order.currency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* ── Totals ── */}
          <div className="border-t border-border print:border-black p-5 bg-muted/30 print:bg-white">
            <div className="flex justify-end">
              <div className="w-80 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal (sin {tax.name || 'IGV'})</span>
                  <span className="text-foreground">{fmt(order.subtotal - order.tax_amount, order.currency)}</span>
                </div>
                {order.discount_amount > 0 && (
                  <div className="flex justify-between text-sm text-green-600 dark:text-green-400">
                    <span>Descuento {order.coupon_code ? `(${order.coupon_code})` : ''}</span>
                    <span className="font-semibold">-{fmt(order.discount_amount, order.currency)}</span>
                  </div>
                )}
                {order.tax_amount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{tax.name || 'IGV'} ({tax.rate || 18}%)</span>
                    <span className="text-foreground">{fmt(order.tax_amount, order.currency)}</span>
                  </div>
                )}
                {order.shipping_amount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground flex items-center gap-1"><Truck className="w-3 h-3" /> Envio</span>
                    <span className="text-foreground">{fmt(order.shipping_amount, order.currency)}</span>
                  </div>
                )}
                <div className="flex justify-between text-lg font-bold border-t-2 border-border pt-3 mt-3 print:border-black">
                  <span className="text-foreground">TOTAL</span>
                  <span className="text-primary text-xl">{fmt(order.total, order.currency)}</span>
                </div>
                <p className="text-xs text-muted-foreground text-right pt-1">
                  Son: {new Intl.NumberFormat('es-PE', { style: 'currency', currency: order.currency }).format(order.total).replace(/[A-Z]{3}\s?/, '').trim()}
                </p>
              </div>
            </div>
          </div>

          {/* ── Payment Method & Shipping ── */}
          <div className="border-t border-border print:border-black p-5 grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <CreditCard className="w-3.5 h-3.5" /> Metodo de Pago
              </h4>
              <p className="text-sm font-semibold text-foreground">{order.payment_method || 'Pendiente de pago'}</p>
              {order.payment_reference && (
                <p className="text-xs text-muted-foreground font-mono">Ref: {order.payment_reference}</p>
              )}
            </div>
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Truck className="w-3.5 h-3.5" /> Envio
              </h4>
              <p className="text-sm font-semibold text-foreground">{order.shipping_method_name || 'Envio estandar'}</p>
              {order.tracking_number && (
                <p className="text-xs text-muted-foreground font-mono">Tracking: {order.tracking_number}</p>
              )}
            </div>
          </div>

          {/* ── QR & SUNAT Info ── */}
          <div className="border-t border-border print:border-black p-5 flex flex-col md:flex-row items-center gap-5 bg-muted/20 print:bg-white">
            <div className="flex-shrink-0">
              <div className="w-24 h-24 bg-white rounded-xl border border-border flex items-center justify-center print:border-black">
                <QrCode className="w-16 h-16 text-muted-foreground/30" />
              </div>
            </div>
            <div className="flex-1 text-center md:text-left space-y-2">
              <p className="text-xs font-bold text-foreground uppercase">Representacion Impresa del Comprobante Electronico</p>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Este documento puede ser verificado en <span className="font-semibold text-foreground">www.sunat.gob.pe</span> ingresando el RUC del emisor, el tipo y numero de comprobante, y la fecha de emision.
              </p>
              <p className="text-[11px] text-muted-foreground">
                Autorizado mediante Resolucion de Intendencia Nro. 123-2023/SUNAT
              </p>
            </div>
          </div>

          {/* ── Footer ── */}
          <div className="bg-primary/5 print:bg-white p-5 text-center border-t border-border print:border-black">
            <div className="inline-flex items-center gap-2 bg-white rounded-full px-4 py-2 shadow-sm print:shadow-none">
              <Check className="w-4 h-4 text-primary" />
              <span className="text-sm font-bold text-foreground">Gracias por su compra</span>
            </div>
            <p className="text-xs text-muted-foreground mt-3">
              {company.company_name || 'Mi Empresa'} | RUC: {company.company_ruc || '20123456789'}
            </p>
          </div>
        </div>
      </div>

      {/* Print Styles */}
      <style>{`
        @media print {
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .print\\:hidden { display: none !important; }
          @page { margin: 0.5cm; }
        }
      `}</style>
    </div>
  );
}
