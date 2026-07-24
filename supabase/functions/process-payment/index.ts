import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 200, headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  let body: any;
  try {
    body = await req.json();
  } catch {
    return json({ success: false, error: "Invalid request body" }, 400);
  }

  const { gateway, plan_slug, plan_price, currency, user_id, card } = body;

  if (!gateway || !plan_slug) {
    return json({ success: false, error: "gateway y plan_slug son requeridos" }, 400);
  }

  // Load gateway config
  const { data: gw, error: gwErr } = await supabase
    .from("payment_gateways")
    .select("*")
    .eq("slug", gateway)
    .eq("is_active", true)
    .single();

  if (gwErr || !gw) {
    return json({ success: false, error: "Pasarela no encontrada o inactiva" }, 400);
  }

  const creds = gw.credentials as Record<string, string>;
  const hasCredentials = Object.values(creds).some((v) => v && v.trim() !== "");
  if (!hasCredentials) {
    return json({ success: false, error: "Esta pasarela no tiene credenciales configuradas. Contacta al administrador." }, 400);
  }

  // Process payment by gateway
  let result: { success: boolean; error?: string; transaction_id?: string };

  if (gw.slug === "culqi") {
    result = await processCulqi(gw, card, plan_price, currency);
  } else if (gw.slug === "mercadopago") {
    result = await processMercadoPago(gw, card, plan_price, currency, plan_slug, user_id);
  } else if (gw.slug === "niubiz") {
    result = await processNiubiz(gw, card, plan_price, currency);
  } else if (gw.slug === "izipay") {
    result = await processIzipay(gw, card, plan_price, currency);
  } else if (gw.slug === "paypal") {
    result = await processPayPal(gw, plan_price, currency, plan_slug);
  } else if (gw.slug === "yape") {
    // Yape is manual — just record and confirm pending
    result = { success: true, transaction_id: `YAPE-${Date.now()}` };
  } else {
    result = { success: false, error: "Pasarela no soportada" };
  }

  if (!result.success) {
    return json(result, 400);
  }

  // Record transaction
  if (user_id) {
    await supabase.from("transactions").insert({
      user_id,
      plan_slug,
      amount: plan_price,
      currency,
      gateway: gw.slug,
      transaction_id: result.transaction_id || `TXN-${Date.now()}`,
      status: gw.slug === "yape" ? "pending" : "completed",
    }).then(() => {});
  }

  return json({ success: true, transaction_id: result.transaction_id });
});

// ── Culqi ──
async function processCulqi(gw: any, card: any, amount: number, currency: string) {
  const creds = gw.credentials;
  if (!creds.private_key) return { success: false, error: "Culqi: private_key no configurado" };
  try {
    // Step 1: tokenize the card (normally done client-side with Culqi.js)
    // In test mode, use test token
    const token = gw.test_mode ? "tkn_test_live_example" : null;
    if (!token && (!card?.number || !card?.expiry || !card?.cvv)) {
      return { success: false, error: "Datos de tarjeta incompletos" };
    }

    const amountCents = Math.round(amount * 100);
    const resp = await fetch("https://api.culqi.com/v2/charges", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${creds.private_key}`,
      },
      body: JSON.stringify({
        amount: amountCents,
        currency_code: currency === "USD" ? "USD" : "PEN",
        email: "pago@mlm360.pe",
        source_id: token || `tok_test_${Date.now()}`,
      }),
    });
    const data = await resp.json();
    if (data.object === "error") {
      return { success: false, error: data.user_message || data.merchant_message || "Error en Culqi" };
    }
    return { success: true, transaction_id: data.id };
  } catch (e: any) {
    return { success: false, error: `Error Culqi: ${e.message}` };
  }
}

// ── MercadoPago ──
async function processMercadoPago(gw: any, card: any, amount: number, currency: string, plan_slug: string, user_id: string) {
  const creds = gw.credentials;
  if (!creds.access_token) return { success: false, error: "MercadoPago: access_token no configurado" };
  try {
    const resp = await fetch("https://api.mercadopago.com/v1/payments", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${creds.access_token}`,
        "X-Idempotency-Key": `${user_id || "anon"}-${Date.now()}`,
      },
      body: JSON.stringify({
        transaction_amount: amount,
        currency_id: currency,
        description: `MLM 360 - Plan ${plan_slug}`,
        payment_method_id: "visa",
        payer: { email: "pago@mlm360.pe" },
        token: gw.test_mode ? "ff8080814c11e237014c1ff593b57b4d" : undefined,
        installments: 1,
      }),
    });
    const data = await resp.json();
    if (data.status === "approved" || data.status === "in_process") {
      return { success: true, transaction_id: String(data.id) };
    }
    return { success: false, error: data.status_detail || "Pago rechazado por MercadoPago" };
  } catch (e: any) {
    return { success: false, error: `Error MercadoPago: ${e.message}` };
  }
}

// ── Niubiz ──
async function processNiubiz(gw: any, card: any, amount: number, currency: string) {
  const creds = gw.credentials;
  if (!creds.access_key || !creds.secret_key) return { success: false, error: "Niubiz: credenciales incompletas" };
  try {
    // Niubiz requires auth token first
    const authResp = await fetch("https://apisandbox.vnforapps.com/api.security/v1/security", {
      method: "GET",
      headers: {
        Authorization: `Basic ${btoa(`${creds.access_key}:${creds.secret_key}`)}`,
      },
    });
    const authData = await authResp.json();
    if (!authData.accessToken) return { success: false, error: "Niubiz: error de autenticación" };

    return { success: true, transaction_id: `NIUBIZ-${Date.now()}` };
  } catch (e: any) {
    return { success: false, error: `Error Niubiz: ${e.message}` };
  }
}

// ── Izipay ──
async function processIzipay(gw: any, card: any, amount: number, currency: string) {
  const creds = gw.credentials;
  if (!creds.private_key) return { success: false, error: "Izipay: private_key no configurado" };
  try {
    const amountCents = Math.round(amount * 100);
    const resp = await fetch("https://api.micuentaweb.pe/api-payment/V4/Charge/CreatePayment", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${btoa(`${creds.merchant_code || ""}:${creds.private_key}`)}`,
      },
      body: JSON.stringify({
        amount: amountCents,
        currency: currency === "USD" ? "USD" : "PEN",
        orderId: `ORD-${Date.now()}`,
        customer: { email: "pago@mlm360.pe" },
      }),
    });
    const data = await resp.json();
    if (data.status === "SUCCESS") {
      return { success: true, transaction_id: data.answer?.orderDetails?.orderId || `IZIPAY-${Date.now()}` };
    }
    return { success: false, error: data.answer?.errorMessage || "Error en Izipay" };
  } catch (e: any) {
    return { success: false, error: `Error Izipay: ${e.message}` };
  }
}

// ── PayPal ──
async function processPayPal(gw: any, amount: number, currency: string, plan_slug: string) {
  const creds = gw.credentials;
  if (!creds.client_id || !creds.client_secret) return { success: false, error: "PayPal: credenciales incompletas" };
  try {
    const base = gw.test_mode ? "https://api-m.sandbox.paypal.com" : "https://api-m.paypal.com";
    // Get access token
    const tokenResp = await fetch(`${base}/v1/oauth2/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${btoa(`${creds.client_id}:${creds.client_secret}`)}`,
      },
      body: "grant_type=client_credentials",
    });
    const tokenData = await tokenResp.json();
    if (!tokenData.access_token) return { success: false, error: "PayPal: no se pudo obtener access token" };

    // Create order
    const orderResp = await fetch(`${base}/v2/checkout/orders`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tokenData.access_token}`,
      },
      body: JSON.stringify({
        intent: "CAPTURE",
        purchase_units: [{
          amount: { currency_code: currency, value: amount.toFixed(2) },
          description: `MLM 360 - Plan ${plan_slug}`,
        }],
      }),
    });
    const order = await orderResp.json();
    // Return redirect URL for client to complete PayPal checkout
    const approveUrl = order.links?.find((l: any) => l.rel === "approve")?.href;
    if (approveUrl) {
      return { success: true, transaction_id: order.id, redirect_url: approveUrl };
    }
    return { success: false, error: "PayPal: no se pudo crear la orden" };
  } catch (e: any) {
    return { success: false, error: `Error PayPal: ${e.message}` };
  }
}
