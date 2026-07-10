import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const STATUS_LABELS: Record<string, string> = {
  pendiente:  "Pendiente de revisión",
  en_proceso: "En proceso",
  resuelto:   "Resuelto",
  cerrado:    "Cerrado",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 200, headers: corsHeaders });

  try {
    const supabaseUrl  = Deno.env.get("SUPABASE_URL")!;
    const serviceKey   = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendKey    = Deno.env.get("RESEND_API_KEY") ?? "";
    const fromEmail    = Deno.env.get("EMAIL_FROM") ?? "noreply@tudominio.com";

    const db = createClient(supabaseUrl, serviceKey);
    const body = await req.json();
    const { complaint_id, event, new_status, response_text } = body as {
      complaint_id: string;
      event: "status_change" | "response";
      new_status?: string;
      response_text?: string;
    };

    if (!complaint_id || !event) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch complaint
    const { data: complaint, error: fetchErr } = await db
      .from("complaints_book")
      .select("correlativo, nombre, apellido, email, tipo, status, respuesta")
      .eq("id", complaint_id)
      .maybeSingle();

    if (fetchErr || !complaint) {
      return new Response(JSON.stringify({ error: "Complaint not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch company name
    const { data: cfgRows } = await db
      .from("system_config")
      .select("key, value")
      .in("key", ["company_name"]);
    const cfg: Record<string, string> = {};
    (cfgRows ?? []).forEach((r: { key: string; value: string }) => { cfg[r.key] = r.value; });
    const companyName = cfg.company_name || "Nuestra Empresa";

    const toEmail     = complaint.email;
    const fullName    = `${complaint.nombre ?? ""} ${complaint.apellido ?? ""}`.trim();
    const correlativo = complaint.correlativo ?? complaint_id;

    let subject = "";
    let html = "";

    if (event === "status_change" && new_status) {
      const statusLabel = STATUS_LABELS[new_status] ?? new_status;
      subject = `[${companyName}] Actualización de tu reclamo #${correlativo}`;
      html = buildEmail({
        companyName,
        fullName,
        correlativo,
        title: "Tu reclamo fue actualizado",
        bodyHtml: `
          <p>Hola <strong>${fullName}</strong>,</p>
          <p>El estado de tu ${complaint.tipo ?? "reclamo"} ha cambiado:</p>
          <div style="margin:20px 0;padding:16px 20px;background:#f4f4f5;border-radius:10px;border-left:4px solid #3b82f6;">
            <strong>Estado actual:</strong> ${statusLabel}
          </div>
          <p>Puedes consultar el estado completo de tu reclamo en cualquier momento ingresando el código <strong>${correlativo}</strong> en nuestro Libro de Reclamaciones.</p>
        `,
      });
    } else if (event === "response" && response_text) {
      subject = `[${companyName}] Respuesta a tu reclamo #${correlativo}`;
      html = buildEmail({
        companyName,
        fullName,
        correlativo,
        title: "Hemos respondido a tu reclamo",
        bodyHtml: `
          <p>Hola <strong>${fullName}</strong>,</p>
          <p>Hemos dado respuesta a tu ${complaint.tipo ?? "reclamo"} con código <strong>${correlativo}</strong>:</p>
          <div style="margin:20px 0;padding:16px 20px;background:#f0fdf4;border-radius:10px;border-left:4px solid #22c55e;">
            ${response_text.replace(/\n/g, "<br/>")}
          </div>
          <p>Gracias por contactarnos. Si tienes más consultas, no dudes en escribirnos.</p>
        `,
      });
    } else {
      return new Response(JSON.stringify({ ok: true, message: "No email needed" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!resendKey) {
      console.warn("RESEND_API_KEY not configured — email skipped");
      return new Response(JSON.stringify({ ok: true, message: "No RESEND_API_KEY configured, email skipped" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const emailRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Authorization": `Bearer ${resendKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: `${companyName} <${fromEmail}>`, to: [toEmail], subject, html }),
    });

    if (!emailRes.ok) {
      const err = await emailRes.text();
      console.error("Resend error:", err);
      return new Response(JSON.stringify({ ok: false, error: err }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (e) {
    console.error("complaint-notify error:", e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function buildEmail({ companyName, fullName, correlativo, title, bodyHtml }: {
  companyName: string; fullName: string; correlativo: string; title: string; bodyHtml: string;
}) {
  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f8fafc;margin:0;padding:0;">
  <div style="max-width:560px;margin:40px auto;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e2e8f0;box-shadow:0 4px 24px rgba(0,0,0,.06);">
    <div style="background:#0f172a;padding:28px 32px;text-align:center;">
      <p style="color:#94a3b8;font-size:13px;margin:0 0 4px;">Libro de Reclamaciones</p>
      <h1 style="color:#ffffff;font-size:22px;font-weight:700;margin:0;">${companyName}</h1>
    </div>
    <div style="padding:32px;">
      <h2 style="font-size:18px;font-weight:700;color:#0f172a;margin:0 0 20px;">${title}</h2>
      ${bodyHtml}
      <div style="margin-top:28px;padding:14px 18px;background:#f1f5f9;border-radius:10px;text-align:center;">
        <p style="font-size:12px;color:#64748b;margin:0 0 4px;">Código de seguimiento</p>
        <p style="font-size:22px;font-weight:900;color:#0f172a;letter-spacing:3px;font-family:monospace;margin:0;">${correlativo}</p>
      </div>
    </div>
    <div style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:20px 32px;text-align:center;">
      <p style="font-size:12px;color:#94a3b8;margin:0;">Este correo fue enviado automáticamente por ${companyName}. Por favor no respondas a este mensaje.</p>
    </div>
  </div>
</body></html>`;
}
