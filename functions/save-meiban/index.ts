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
    const { userId, companyNameCn, companyNameEn } = body;

    if (!userId || !companyNameCn) {
      return new Response(JSON.stringify({ error: 'userId and companyNameCn are required' }), {
        status: 400,
        headers: corsHeaders,
      });
    }

    // 查找用户的 booth
    const { data: boothData, error: boothError } = await supabaseAdmin
      .from('exhibitor_booths')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();

    if (boothError) {
      return new Response(JSON.stringify({ error: 'Failed to find booth: ' + boothError.message }), {
        status: 500,
        headers: corsHeaders,
      });
    }

    const boothId = boothData?.id || null;

    // 检查是否已存在
    const { data: existing } = await supabaseAdmin
      .from('meiban_info')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();

    let result;
    if (existing) {
      // 更新
      result = await supabaseAdmin
        .from('meiban_info')
        .update({
          company_name_cn: companyNameCn,
          company_name_en: companyNameEn,
          booth_id: boothId,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId);
    } else {
      // 插入
      result = await supabaseAdmin
        .from('meiban_info')
        .insert({
          user_id: userId,
          booth_id: boothId,
          company_name_cn: companyNameCn,
          company_name_en: companyNameEn,
        });
    }

    if (result.error) {
      return new Response(JSON.stringify({ error: 'Failed to save meiban info: ' + result.error.message }), {
        status: 500,
        headers: corsHeaders,
      });
    }

    return new Response(JSON.stringify({ success: true, message: 'Meiban info saved successfully' }), {
      headers: corsHeaders,
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: corsHeaders,
    });
  }
});
