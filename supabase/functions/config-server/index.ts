import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false }
});

const SENSITIVE_KEYS = new Set([
  'smtp_password',
  'smtp_user',
  'google_client_secret',
  'fixer_api_key',
  'ai_api_key',
  'api_key',
  'secret_key',
  'private_key',
  'access_token',
  'webhook_secret',
  'service_role_key',
]);

interface ConfigRequest {
  action: 'get' | 'get_all' | 'set' | 'get_sensitive';
  key?: string;
  value?: string;
  category?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'Missing authorization' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);

  if (authError || !user) {
    return new Response(JSON.stringify({ error: 'Invalid token' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  const isAdmin = profile?.role === 'super_admin' || profile?.role === 'admin';

  try {
    const body: ConfigRequest = req.method === 'POST' ? await req.json() : {
      action: new URL(req.url).searchParams.get('action') as ConfigRequest['action'] || 'get_all',
      key: new URL(req.url).searchParams.get('key') ?? undefined,
      category: new URL(req.url).searchParams.get('category') ?? undefined,
    };

    switch (body.action) {
      case 'get': {
        if (!body.key) {
          return new Response(JSON.stringify({ error: 'Missing key' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        const { data, error } = await supabase
          .from('system_config')
          .select('key, value, description, category, is_sensitive')
          .eq('key', body.key)
          .single();

        if (error) {
          return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        const isSensitive = data?.is_sensitive || SENSITIVE_KEYS.has(body.key);
        if (isSensitive && !isAdmin) {
          return new Response(JSON.stringify({ error: 'Forbidden: sensitive config' }), {
            status: 403,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        return new Response(JSON.stringify(data), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      case 'get_sensitive': {
        if (!body.key) {
          return new Response(JSON.stringify({ error: 'Missing key' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        if (!isAdmin) {
          return new Response(JSON.stringify({ error: 'Forbidden' }), {
            status: 403,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        const { data, error } = await supabase
          .from('system_config')
          .select('key, value')
          .eq('key', body.key)
          .single();

        if (error) {
          return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        return new Response(JSON.stringify(data), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      case 'get_all': {
        let query = supabase
          .from('system_config')
          .select('key, value, description, category, is_sensitive');

        if (body.category) {
          query = query.eq('category', body.category);
        }

        const { data, error } = await query;

        if (error) {
          return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        const sanitized = isAdmin ? data : data?.filter((item: any) => !item.is_sensitive && !SENSITIVE_KEYS.has(item.key));

        return new Response(JSON.stringify(sanitized), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      case 'set': {
        if (!body.key) {
          return new Response(JSON.stringify({ error: 'Missing key' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        if (!isAdmin) {
          return new Response(JSON.stringify({ error: 'Forbidden' }), {
            status: 403,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        const { error } = await supabase
          .from('system_config')
          .upsert(
            {
              key: body.key,
              value: body.value ?? '',
              category: body.category ?? 'general',
              updated_at: new Date().toISOString(),
              updated_by: user.id,
            },
            { onConflict: 'key' }
          );

        if (error) {
          return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      default:
        return new Response(JSON.stringify({ error: 'Invalid action' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Invalid request' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
