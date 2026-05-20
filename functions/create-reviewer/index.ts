import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const PASSWORD_SUFFIX = '_secure';

function normalizeReviewerPassword(password: string): string {
  return password.length >= 6 ? password : `${password}${PASSWORD_SUFFIX}`;
}

function generateVirtualEmail(username: string): string {
  return `${username}@test.com`;
}

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

    const authHeader = req.headers.get('authorization') || '';
    const accessToken = authHeader.startsWith('Bearer ') ? authHeader.substring(7).trim() : null;
    
    if (!accessToken) {
      return new Response(JSON.stringify({ error: '未提供有效的 Authorization Bearer Token' }), {
        status: 401,
        headers: corsHeaders,
      });
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    // 验证当前用户是否为管理员
    const { data: { user: authUser }, error: authError } = await supabaseAdmin.auth.getUser(accessToken);
    if (authError || !authUser) {
      console.error('Auth error:', authError);
      return new Response(JSON.stringify({ error: '无效或过期的身份凭证，请重新登录。' }), {
        status: 401,
        headers: corsHeaders,
      });
    }

    const adminId = authUser.id;
    const { data: adminProfile, error: adminProfileError } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', adminId)
      .maybeSingle();

    if (adminProfileError || !adminProfile || adminProfile.role !== 'admin') {
      console.error('Admin check error:', adminProfileError, 'Profile:', adminProfile);
      return new Response(JSON.stringify({ error: '当前账号无权执行此操作，只有管理员可以创建审图员。' }), {
        status: 403,
        headers: corsHeaders,
      });
    }

    const body = await req.json();
    const { username, password, displayName } = body;

    // 验证必填字段
    if (!username || !password || !displayName) {
      return new Response(JSON.stringify({ error: '缺少必填字段：username, password, displayName' }), {
        status: 400,
        headers: corsHeaders,
      });
    }

    // 规范化密码
    const normalizedPassword = normalizeReviewerPassword(password);
    const email = generateVirtualEmail(username);

    // 1. 创建 auth 用户
    const { data: authData, error: createAuthError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: normalizedPassword,
      email_confirm: true,
    });

    if (createAuthError) {
      console.error('Create auth user error:', createAuthError);
      return new Response(JSON.stringify({ error: '创建审图员失败: ' + createAuthError.message }), {
        status: 400,
        headers: corsHeaders,
      });
    }

    if (!authData.user) {
      return new Response(JSON.stringify({ error: '创建审图员失败：未返回用户信息' }), {
        status: 500,
        headers: corsHeaders,
      });
    }

    // 2. 创建 profile 记录
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .insert({
        id: authData.user.id,
        username,
        display_name: displayName,
        role: 'reviewer',
      });

    if (profileError) {
      console.error('Create profile error:', profileError);
      // 如果 profile 创建失败，删除已创建的 auth 用户
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      return new Response(JSON.stringify({ error: '创建审图员失败: ' + profileError.message }), {
        status: 400,
        headers: corsHeaders,
      });
    }

    return new Response(JSON.stringify({
      success: true,
      message: '审图员创建成功',
      reviewer: {
        id: authData.user.id,
        username,
        displayName,
        email,
      },
    }), {
      status: 200,
      headers: corsHeaders,
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
