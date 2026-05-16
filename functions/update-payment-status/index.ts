import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

Deno.serve(async (req) => {
  const allowedOrigins = ['https://drawextestone.netlify.app'];
  const origin = req.headers.get('origin');
  const corsOrigin = origin && allowedOrigins.includes(origin) ? origin : '*';
  const corsHeaders = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': corsOrigin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Credentials': corsOrigin !== '*' ? 'true' : 'false',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin',
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    const body = await req.json();
    const { boothId, applicationId, paymentStatus } = body;

    if (!paymentStatus) {
      return new Response(JSON.stringify({ error: 'Missing paymentStatus' }), {
        status: 400,
        headers: corsHeaders,
      });
    }

    if (applicationId) {
      const { error } = await supabaseAdmin
        .from('exhibitor_applications')
        .update({ payment_status: paymentStatus, updated_at: new Date().toISOString() })
        .eq('id', applicationId);

      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: corsHeaders,
        });
      }

      return new Response(JSON.stringify({ success: true, message: 'Payment status updated for application' }), {
        headers: corsHeaders,
      });
    }

    if (boothId) {
      const { error } = await supabaseAdmin
        .from('exhibitor_applications')
        .update({ payment_status: paymentStatus, updated_at: new Date().toISOString() })
        .eq('booth_id', boothId);

      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: corsHeaders,
        });
      }

      return new Response(JSON.stringify({ success: true, message: 'Payment status updated for booth' }), {
        headers: corsHeaders,
      });
    }

    return new Response(JSON.stringify({ error: 'Missing boothId or applicationId' }), {
      status: 400,
      headers: corsHeaders,
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: corsHeaders,
    });
  }
});
