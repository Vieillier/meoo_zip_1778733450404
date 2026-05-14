import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    });
  }

  const corsHeaders = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  };

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    const body = await req.json();
    const { boothId, feeType, paymentStatus } = body;

    if (!boothId || !feeType || !paymentStatus) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: corsHeaders,
      });
    }

    const validFeeTypes = ['management', 'deposit', 'heightReview'];
    if (!validFeeTypes.includes(feeType)) {
      return new Response(JSON.stringify({ error: 'Invalid feeType' }), {
        status: 400,
        headers: corsHeaders,
      });
    }

    const columnMap: Record<string, string> = {
      management: 'management_fee_paid',
      deposit: 'deposit_paid',
      heightReview: 'height_review_fee_paid',
    };

    const { data: existing } = await supabaseAdmin
      .from('booth_fixed_fees')
      .select('id')
      .eq('booth_id', boothId)
      .maybeSingle();

    if (existing) {
      await supabaseAdmin
        .from('booth_fixed_fees')
        .update({
          [columnMap[feeType]]: paymentStatus === 'paid',
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id);
    } else {
      await supabaseAdmin.from('booth_fixed_fees').insert({
        booth_id: boothId,
        [columnMap[feeType]]: paymentStatus === 'paid',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: corsHeaders,
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: corsHeaders,
    });
  }
});
