import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const PASSWORD_SUFFIX = '_secure';
function normalizeExhibitorPassword(password: string): string {
  return password.length >= 6 ? password : `${password}${PASSWORD_SUFFIX}`;
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
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    const body = await req.json();
    const { exhibitors } = body;

    if (!exhibitors || !Array.isArray(exhibitors)) {
      return new Response(JSON.stringify({ error: 'Invalid request body' }), {
        status: 400,
        headers: corsHeaders,
      });
    }

    const results = {
      added: 0,
      updated: 0,
      failed: 0,
      errors: [] as string[],
    };

    for (const item of exhibitors) {
      try {
        const contactPhone = String(item.contactPhone || item.phone || item.username || '');
        const username = contactPhone || String(item.username || '');
        const password = String(item.password || item.boothNumber || item.booth_number || '');
        const normalizedPassword = normalizeExhibitorPassword(password);
        const displayName = String(item.displayName || item.exhibitorName || '展商');
        const exhibitorName = String(item.exhibitorName || item.exhibitor_name || displayName);
        const contactName = String(item.contactName || item.contact_name || displayName);
        const hallNumber = String(item.hallNumber || item.hall_number || '');
        const boothNumber = String(item.boothNumber || item.booth_number || '');
        const boothArea = Number(item.boothArea ?? item.booth_area) || 9;
        const boothHeight = Number(item.boothHeight ?? item.booth_height) || 4;
        const boothCategory = String(item.boothCategory || item.booth_category || (boothHeight > 4 ? '特装' : '标摊'));
        const role = item.role === 'custom_exhibitor' ? 'custom_exhibitor' : boothCategory === '特装' ? 'custom_exhibitor' : 'standard_exhibitor';
        const phone = contactPhone || username;
        const email = String(item.email || item.contactEmail || item.contact_email || '');

        if (!username || !password) {
          results.errors.push(`跳过: 用户名或密码为空`);
          results.failed++;
          continue;
        }

        const userEmail = `${username.toLowerCase().replace(/[^a-z0-9]/g, '_')}@review.local`;

        // 检查 profiles 表中是否已存在
        const { data: existingProfiles, error: profileCheckError } = await supabaseAdmin
          .from('profiles')
          .select('id')
          .eq('username', username);

        if (profileCheckError) {
          results.errors.push(`检查用户失败: ${username} - ${profileCheckError.message}`);
          results.failed++;
          continue;
        }

        // 如果 profiles 表中有记录，更新密码和展位信息
        if (existingProfiles && existingProfiles.length > 0) {
          const userId = existingProfiles[0].id;

          // 更新用户密码（保持原始密码）
          const { error: updateAuthError } = await supabaseAdmin.auth.admin.updateUserById(
            userId,
            { password: normalizedPassword }
          );

          if (updateAuthError) {
            results.errors.push(`更新密码失败: ${username} - ${updateAuthError.message}`);
          }

          const { error: profileUpdateError } = await supabaseAdmin
            .from('profiles')
            .update({
              username,
              display_name: displayName,
              role,
              phone,
            })
            .eq('id', userId);

          if (profileUpdateError) {
            results.errors.push(`更新用户资料失败: ${username} - ${profileUpdateError.message}`);
          }

          const { error: boothError } = await supabaseAdmin
            .from('exhibitor_booths')
            .upsert({
              user_id: userId,
              exhibitor_name: exhibitorName,
              hall_number: hallNumber,
              booth_number: boothNumber,
              booth_area: boothArea,
              booth_height: boothHeight,
              booth_category: boothCategory,
              contact_name: contactName,
              contact_phone: phone,
              email: email,
            }, { onConflict: 'user_id' });

          if (boothError) {
            results.errors.push(`更新展位失败: ${username} - ${boothError.message}`);
            results.failed++;
          } else {
            results.updated++;
          }
          continue;
        }

        // 检查 auth.users 中是否已存在
        const { data: existingAuthUsers, error: authCheckError } = await supabaseAdmin
          .auth
          .admin
          .listUsers();

        const existingAuthUser = existingAuthUsers?.users?.find(
          (u: any) => u.email === userEmail
        );

        if (existingAuthUser) {
          const userId = existingAuthUser.id;

          // 创建 profile
          const { error: profileError } = await supabaseAdmin
            .from('profiles')
            .insert({
              id: userId,
              username: username,
              display_name: displayName,
              role: role,
              phone: phone,
            });

          if (profileError) {
            results.errors.push(`创建用户资料失败: ${username} - ${profileError.message}`);
            results.failed++;
            continue;
          }

          // 创建展位信息
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
              contact_name: contactName,
              contact_phone: phone,
              email: email,
            });

          if (boothError) {
            results.errors.push(`创建展位失败: ${username} - ${boothError.message}`);
            results.failed++;
          } else {
            results.added++;
          }
          continue;
        }

        // 创建新用户 - 使用原始密码
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
          email: userEmail,
          password: normalizedPassword,
          email_confirm: true,
          user_metadata: {
            username: username,
            display_name: displayName,
            role: role,
            phone: phone,
          },
        });

        if (authError || !authData.user) {
          results.errors.push(`创建用户失败: ${username} - ${authError?.message || 'Unknown error'}`);
          results.failed++;
          continue;
        }

        // 创建展位信息
        const { error: boothError } = await supabaseAdmin
          .from('exhibitor_booths')
          .insert({
            user_id: authData.user.id,
            exhibitor_name: exhibitorName,
            hall_number: hallNumber,
            booth_number: boothNumber,
            booth_area: boothArea,
            booth_height: boothHeight,
            booth_category: boothCategory,
            contact_name: contactName,
            contact_phone: phone,
            email: email,
          });

        if (boothError) {
          results.errors.push(`创建展位失败: ${username} - ${boothError.message}`);
          results.failed++;
        } else {
          results.added++;
        }
      } catch (error: any) {
        results.errors.push(`处理失败: ${item.username} - ${error.message}`);
        results.failed++;
      }
    }

    return new Response(JSON.stringify({ success: true, results }), {
      headers: corsHeaders,
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message, stack: error.stack }), {
      status: 500,
      headers: corsHeaders,
    });
  }
});
