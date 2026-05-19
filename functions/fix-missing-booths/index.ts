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

    const { data: authInfo, error: authInfoError } = await supabaseAdmin.auth.getUser(accessToken);
    if (authInfoError || !authInfo?.user) {
      return new Response(JSON.stringify({ error: '无效或过期的身份凭证' }), {
        status: 401,
        headers: corsHeaders,
      });
    }

    const reviewerId = authInfo.user.id;
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

    // 获取所有展商账号
    const { data: profiles, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .in('role', ['standard_exhibitor', 'custom_exhibitor']);

    if (profileError) {
      return new Response(JSON.stringify({ error: '获取展商列表失败: ' + profileError.message }), {
        status: 500,
        headers: corsHeaders,
      });
    }

    // 获取所有已有的展位记录
    const { data: booths, error: boothError } = await supabaseAdmin
      .from('exhibitor_booths')
      .select('user_id');

    if (boothError) {
      return new Response(JSON.stringify({ error: '获取展位信息失败: ' + boothError.message }), {
        status: 500,
        headers: corsHeaders,
      });
    }

    const existingUserIds = new Set(booths?.map((b: any) => b.user_id) || []);
    const missingProfiles = profiles.filter((p: any) => !existingUserIds.has(p.id));

    console.log(`[Fix Booths] 发现 ${missingProfiles.length} 个缺失展位信息的账号`);

    if (missingProfiles.length === 0) {
      return new Response(JSON.stringify({ success: true, fixed: 0, message: '所有账号都已有展位信息' }), {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      });
    }

    // 为缺失的账号创建展位记录
    const boothsToCreate = missingProfiles.map((p: any) => ({
      user_id: p.id,
      booth_number: p.username, // 展位号等于用户名（电话号码）
      exhibitor_name: p.display_name || p.username,
      hall_number: '',
      booth_area: 9,
      booth_height: 4,
      booth_category: '标摊',
      contact_phone: p.phone || p.username,
      email: ''
    }));

    const { error: insertError } = await supabaseAdmin
      .from('exhibitor_booths')
      .insert(boothsToCreate);

    if (insertError) {
      return new Response(JSON.stringify({ error: '创建展位信息失败: ' + insertError.message }), {
        status: 500,
        headers: corsHeaders,
      });
    }

    return new Response(JSON.stringify({ 
      success: true, 
      fixed: missingProfiles.length,
      message: `已为 ${missingProfiles.length} 个账号创建展位信息`
    }), {
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
