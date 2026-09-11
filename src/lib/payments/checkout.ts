export function continuePayment(payment: { redirect_url?: string; session_id?: string; contract_id?: string }) {
  // Navigate only once the provider has supplied its URL; never open a blank popup.
  if (payment.redirect_url) {
    const target = new URL(payment.redirect_url);
    if (target.protocol !== 'https:' || !/(^|\.)(paypal\.com|mercadopago\.com(?:\.[a-z]{2})?)$/.test(target.hostname)) throw new Error('El enlace de pago no es válido.');
    window.location.assign(target.href);
  } else if (payment.contract_id || payment.session_id) {
    window.location.assign(`/pago?${payment.contract_id?'subscription='+payment.contract_id:'session='+payment.session_id}`);
  } else throw new Error('No se pudo preparar el pago. Inténtalo nuevamente.');
}
