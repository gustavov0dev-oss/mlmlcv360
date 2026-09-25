# Auditoría previa — packs MLM

## Existente y reutilizable
- Suscripciones: `plans`, `subscriptions`, `billing_contracts`, `plan_orders`, `payment_sessions`. No se cambiará su lógica.
- Catálogo: `products` (ya tiene `points`), `product_variants`, `product_commissions` (por nivel), `mlm_commissions_config` (rango/nivel).
- Compra: `cartStore.tsx` conserva carrito local; CheckoutPage llama `place_order`, luego `process-payment`; `complete_payment_session` confirma orders y transactions.
- Pedidos: `orders`, `order_items`, `order_tracking`; cambios administrativos de estado existentes. No hay reversión automática de stock/comisiones actualmente.
- Red: profiles.sponsor_id; ranks.min_affiliates/min_volume. useRanks calcula volumen aproximado como comisiones ×10, no existe saldo de puntos real. No se convertirá ese umbral monetario implícito a puntos ni se cambiarán rangos automáticamente.
- WhatsApp: WhatsAppSettings/whatsappContent/system_config.whatsapp_widget ya permiten varios contactos, mensajes, activación y orden. Solo falta acceso directo con un contacto.

## Modelos, servicios y archivos
Reutilizar Product, CartItem, Order en storeTypes, useDatabase/supabase, useConfig (moneda), cartAvailability, checkoutCart, cartStore, CheckoutPage, CartPage, process-payment, AdminPage/PlansManager, ProductFormPage y WhatsAppButton. Nuevos componentes de administración/selección de packs y reglas compartidas; migración SQL para validación y liquidación atómica.

## Cambios de datos propuestos
- Reutilizar products.points, añadir earning_type/earning_value opcionales (null conserva reglas existentes).
- Ampliar product_commissions.type con points_percentage.
- Nuevas tablas: mlm_packs (configuración y promoción), mlm_pack_products (relación producto/variante y función base/beneficio), order_packs (snapshot histórico), mlm_point_entries (volumen y puntos comisionados, sin dinero).
- Ampliar order_items con pack_id/snapshot de puntos/comisiones; orders con marcadores de stock y liquidación idempotente.
- RLS y permisos explícitos: packs activos públicos; escritura solo roles administrativos existentes; pedidos/puntos solo propietario o administrador.

## Flujo
Admin configura pack → cliente elige unidades/beneficio → carrito común → place_order recalcula precio/puntos/reglas y reserva stock atómicamente → pago existente → confirmación genera comisiones monetarias o puntos por separado. El pack sustituye las reglas de sus productos. La regla única del pack remunera al patrocinador directo; las compras normales conservan niveles. Snapshot conserva valores y beneficiario al comprar. Cancelar/reembolsar revierte una sola vez stock, entradas de puntos y comisiones del pedido.

## Riesgos
- place_order actual calcula comisiones antes del pago y no comprueba stock general; su devolución temprana puede dejar descuentos de stock parciales. Sustituir con validación transaccional y errores que revierten la transacción.
- No existe equivalencia puntos/dinero ni evaluación de rangos con puntos. Mostrar saldo real separado; conservar rangos y umbrales existentes.
- Producto con variantes requiere variante explícita dentro del pack.
- No permitir cupones generales sobre packs; conservador: carrito con packs no admite cupones.
- Cancelación administrativa no equivale a reembolso en pasarela: se conserva ese flujo, se revierten efectos internos al marcar cancelado/reembolsado, sin afirmar devolución bancaria.
- Pedidos históricos mantienen lógica histórica; marcadores nuevos solo se activan en compras nuevas.

## Verificación por etapas
Reglas de selección/precios/puntos; RLS; stock general/variantes y rollback; snapshot; confirmación repetida; reversión repetida; compilación y navegación del carrito existente.
