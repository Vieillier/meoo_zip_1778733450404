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
    const serviceRoleKey = Deno.env.get('PRIVATE_SERVICE_ROLE_KEY')!;
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    const authHeader = req.headers.get('authorization') || '';
    const accessToken = authHeader.startsWith('Bearer ') ? authHeader.substring(7).trim() : null;
    if (!accessToken) {
      return new Response(JSON.stringify({ error: '未提供有效的 Authorization Bearer Token' }), {
        status: 401,
        headers: corsHeaders,
      });
    }

    const { data: { user: authUser }, error: authError } = await supabaseAdmin.auth.getUser(accessToken);
    if (authError || !authUser) {
      console.error('Auth error:', authError);
      return new Response(JSON.stringify({ error: '无效或过期的身份凭证' }), {
        status: 401,
        headers: corsHeaders,
      });
    }

    const reviewerId = authUser.id;
    const { data: reviewerProfile, error: reviewerProfileError } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', reviewerId)
      .maybeSingle();
    
    if (reviewerProfileError || !reviewerProfile || !['reviewer', 'admin'].includes(reviewerProfile.role)) {
      return new Response(JSON.stringify({ error: '当前账号无权执行此操作' }), {
        status: 403,
        headers: corsHeaders,
      });
    }

    const body = await req.json();
    const { userId, displayName, phone, exhibitorName, hallNumber, boothNumber, boothArea, boothHeight, boothCategory, email } = body;

    // 更新 profiles 表
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .update({
        display_name: displayName,
        phone: phone
      })
      .eq('id', userId);

    if (profileError) {
      return new Response(JSON.stringify({ error: '更新用户资料失败: ' + profileError.message }), {
        status: 500,
        headers: corsHeaders,
      });
    }

    // 更新 exhibitor_booths 表
    // 先检查是否已有记录
    const { data: existingBooth, error: boothCheckError } = await supabaseAdmin
      .from('exhibitor_booths')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();

    if (boothCheckError && boothCheckError.code !== 'PGRST116') {
      return new Response(JSON.stringify({ error: '检查展位信息失败: ' + boothCheckError.message }), {
        status: 500,
        headers: corsHeaders,
      });
    }

    if (existingBooth) {
      // 更新已有的展位记录
      const { error: boothError } = await supabaseAdmin
        .from('exhibitor_booths')
        .update({
          exhibitor_name: exhibitorName,
          hall_number: hallNumber,
          booth_number: boothNumber,
          booth_area: boothArea,
          booth_height: boothHeight,
          booth_category: boothCategory,
          contact_phone: phone,
          email: email
        })
        .eq('user_id', userId);

      if (boothError) {
        return new Response(JSON.stringify({ error: '更新展位信息失败: ' + boothError.message }), {
          status: 500,
          headers: corsHeaders,
        });
      }
    } else {
      // 创建新的展位记录
      const { error: boothError } = await supabaseAdmin
        .from('exhibitor_booths')
        .insert({
          user_id: userId,
          exhibitor_name: exhibitorName,
          hall_number: hallNumber,
          booth_number: boothNumber,
          booth_area: boothArea,
          booth_height: boothHeight,
          booth_category: boothCategory,
          contact_phone: phone,
          email: email
        });

      if (boothError) {
        return new Response(JSON.stringify({ error: '创建展位信息失败: ' + boothError.message }), {
          status: 500,
          headers: corsHeaders,
        });
      }
    }

    return new Response(JSON.stringify({ success: true, message: '用户信息已更新' }), {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
    });
  } catch (error: any) {
    console.error('Cloud function error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }
});
