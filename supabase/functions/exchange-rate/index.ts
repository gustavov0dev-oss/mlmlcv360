import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
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

  // Get fixer API key from system_config
  const { data: configRows } = await supabase
    .from("system_config")
    .select("key, value")
    .in("key", ["fixer_api_key", "exchange_rate_usd"]);

  const config: Record<string, string> = {};
  (configRows || []).forEach((r: any) => { config[r.key] = r.value; });

  const fixerKey = config.fixer_api_key;

  if (!fixerKey) {
    // No API key — return stored rate
    const storedRate = parseFloat(config.exchange_rate_usd) || 3.72;
    return json({ success: true, rate: storedRate, source: "stored", note: "Configure fixer_api_key in system_config for live rates" });
  }

  try {
    // Fixer.io API (free tier only allows base EUR)
    const resp = await fetch(
      `http://data.fixer.io/api/latest?access_key=${fixerKey}&symbols=USD,PEN`,
    );
    const data = await resp.json();

    if (!data.success) {
      const storedRate = parseFloat(config.exchange_rate_usd) || 3.72;
      return json({ success: true, rate: storedRate, source: "stored", fixer_error: data.error?.info });
    }

    // Calculate PEN/USD rate (via EUR as base)
    const penPerEur = data.rates.PEN;
    const usdPerEur = data.rates.USD;
    const penPerUsd = penPerEur / usdPerEur;
    const rate = Math.round(penPerUsd * 100) / 100;

    // Update stored rate in DB
    await supabase.from("system_config").upsert(
      { key: "exchange_rate_usd", value: rate.toString(), category: "currency", updated_at: new Date().toISOString() },
      { onConflict: "key" },
    );

    return json({ success: true, rate, source: "fixer.io" });
  } catch (e: any) {
    const storedRate = parseFloat(config.exchange_rate_usd) || 3.72;
    return json({ success: true, rate: storedRate, source: "stored", error: e.message });
  }
});
