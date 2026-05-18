import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

Deno.serve(async (req) => {
  const allowedOrigins = ['https://drawextestone.netlify.app'];
  const origin = req.headers.get('origin');
  const corsOrigin = origin && allowedOrigins.includes(origin) ? origin : '*';
  const corsHeaders = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': corsOrigin,
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
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

    const authHeader = req.headers.get('authorization') || '';
    const accessToken = authHeader.startsWith('Bearer ') ? authHeader.substring(7).trim() : null;
    if (!accessToken) {
      return new Response(JSON.stringify({ error: '未提供有效的 Authorization Bearer Token' }), {
        status: 401,
        headers: corsHeaders,
      });
    }

    const supabaseUser = createClient(supabaseUrl, serviceRoleKey);
    const { data: authInfo, error: authInfoError } = await supabaseUser.auth.getUser(accessToken);
    if (authInfoError || !authInfo?.user) {
      console.error('Authorization token validation failed:', authInfoError?.message ?? '未知错误');
      return new Response(JSON.stringify({ error: '无效或过期的身份凭证' }), {
        status: 401,
        headers: corsHeaders,
      });
    }

    const reviewerId = authInfo.user.id;
    const { data: reviewerProfile, error: reviewerProfileError } = await supabaseUser
      .from('profiles')
      .select('role')
      .eq('id', reviewerId)
      .maybeSingle();
    
    if (reviewerProfileError || !reviewerProfile || !['reviewer', 'admin'].includes(reviewerProfile.role)) {
      console.error('Unauthorized function caller:', { reviewerId, reviewerProfile, reviewerProfileError });
      return new Response(JSON.stringify({ error: '当前账号无权访问此数据' }), {
        status: 403,
        headers: corsHeaders,
      });
    }

    // 使用 service role 权限查询所有展商数据
    const { data: profiles, error: profileError } = await supabaseUser
      .from('profiles')
      .select('*')
      .in('role', ['standard_exhibitor', 'custom_exhibitor']);

    if (profileError) {
      console.error('Failed to fetch profiles:', profileError);
      return new Response(JSON.stringify({ error: '获取展商列表失败: ' + profileError.message }), {
        status: 500,
        headers: corsHeaders,
      });
    }

    // 获取所有展位信息
    const { data: booths, error: boothError } = await supabaseUser
      .from('exhibitor_booths')
      .select('*');

    if (boothError) {
      console.error('Failed to fetch booths:', boothError);
      return new Response(JSON.stringify({ error: '获取展位信息失败: ' + boothError.message }), {
        status: 500,
        headers: corsHeaders,
      });
    }

    // 合并数据
    const exhibitors = profiles.map((p: any) => {
      const booth = booths?.find((b: any) => b.user_id === p.id);
      return {
        id: p.id,
        username: p.username,
        password: booth?.booth_number || p.username,
        displayName: p.display_name || p.username,
        role: p.role,
        phone: p.phone ?? undefined,
        email: booth?.email ?? undefined,
        exhibitorName: booth?.exhibitor_name ?? undefined,
        hallNumber: booth?.hall_number ?? undefined,
        boothNumber: booth?.booth_number ?? undefined,
        boothArea: booth?.booth_area ?? undefined,
        boothHeight: booth?.booth_height ?? undefined,
        boothCategory: booth?.booth_category,
      };
    });

    return new Response(JSON.stringify({ success: true, exhibitors }), {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
    });
  } catch (error: any) {
    console.error('Cloud function error:', error);
    return new Response(JSON.stringify({ error: error.message, stack: error.stack }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }
});
