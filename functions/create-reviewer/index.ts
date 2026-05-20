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
    console.log('=== create-reviewer function started ===');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('PRIVATE_SERVICE_ROLE_KEY')!;
    console.log('Supabase URL:', supabaseUrl);

    const authHeader = req.headers.get('authorization') || '';
    const accessToken = authHeader.startsWith('Bearer ') ? authHeader.substring(7).trim() : null;
    console.log('Access token present:', !!accessToken);

    if (!accessToken) {
      console.error('No access token provided');
      return new Response(JSON.stringify({ error: '未提供有效的 Authorization Bearer Token' }), {
        status: 401,
        headers: corsHeaders,
      });
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    // 验证当前用户是否为管理员
    console.log('Verifying user authentication...');
    const { data: { user: authUser }, error: authError } = await supabaseAdmin.auth.getUser(accessToken);
    console.log('Auth user:', authUser?.id, 'Auth error:', authError);

    if (authError || !authUser) {
      console.error('Auth error:', authError);
      return new Response(JSON.stringify({ error: '无效或过期的身份凭证，请重新登录。' }), {
        status: 401,
        headers: corsHeaders,
      });
    }

    const adminId = authUser.id;
    console.log('Admin ID:', adminId);

    const { data: adminProfile, error: adminProfileError } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', adminId)
      .maybeSingle();

    console.log('Admin profile:', adminProfile, 'Error:', adminProfileError);

    if (adminProfileError || !adminProfile || adminProfile.role !== 'admin') {
      console.error('Admin check failed - Profile:', adminProfile, 'Error:', adminProfileError);
      return new Response(JSON.stringify({ error: '当前账号无权执行此操作，只有管理员可以创建审图员。' }), {
        status: 403,
        headers: corsHeaders,
      });
    }

    const body = await req.json();
    const { username, password, displayName } = body;
    console.log('Request body - username:', username, 'displayName:', displayName);

    // 验证必填字段
    if (!username || !password || !displayName) {
      console.error('Missing required fields');
      return new Response(JSON.stringify({ error: '缺少必填字段：username, password, displayName' }), {
        status: 400,
        headers: corsHeaders,
      });
    }

    // 验证账号格式（只允许字母、数字、下划线）
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      console.error('Invalid username format:', username);
      return new Response(JSON.stringify({ error: '账号只能包含字母、数字和下划线' }), {
        status: 400,
        headers: corsHeaders,
      });
    }

    // 验证密码长度
    if (password.length < 2) {
      console.error('Password too short:', password.length);
      return new Response(JSON.stringify({ error: '密码至少需要 2 个字符' }), {
        status: 400,
        headers: corsHeaders,
      });
    }

    // 规范化密码
    const normalizedPassword = normalizeReviewerPassword(password);
    const email = generateVirtualEmail(username);
    console.log('Normalized password length:', normalizedPassword.length, 'Email:', email);

    // 1. 创建 auth 用户
    console.log('Creating auth user...');
    const { data: authData, error: createAuthError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: normalizedPassword,
      email_confirm: true,
    });

    console.log('Auth user created:', authData?.user?.id, 'Error:', createAuthError);

    if (createAuthError) {
      console.error('Create auth user error:', createAuthError);
      return new Response(JSON.stringify({ error: '创建审图员失败: ' + createAuthError.message }), {
        status: 400,
        headers: corsHeaders,
      });
    }

    if (!authData.user) {
      console.error('No user returned from createUser');
      return new Response(JSON.stringify({ error: '创建审图员失败：未返回用户信息' }), {
        status: 500,
        headers: corsHeaders,
      });
    }

    // 2. 创建 profile 记录
    console.log('Creating profile record for user:', authData.user.id);
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .upsert({
        id: authData.user.id,
        username,
        display_name: displayName,
        role: 'reviewer',
      }, { onConflict: 'id' });

    console.log('Profile creation result - Error:', profileError);

    if (profileError) {
      console.error('Create profile error:', profileError);
      // 如果 profile 创建失败，删除已创建的 auth 用户
      console.log('Deleting auth user due to profile creation failure...');
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      return new Response(JSON.stringify({ error: '创建审图员失败: ' + profileError.message }), {
        status: 400,
        headers: corsHeaders,
      });
    }

    console.log('=== create-reviewer function completed successfully ===');
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
