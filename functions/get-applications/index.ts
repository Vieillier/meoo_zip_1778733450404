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
    const { filters = {}, includeAllExhibitors = true } = body;

    // 首先获取所有展商信息
    const { data: booths, error: boothsError } = await supabaseAdmin
      .from('exhibitor_booths')
      .select('*');

    if (boothsError) {
      return new Response(JSON.stringify({ error: 'Booths query failed: ' + boothsError.message }), {
        status: 500,
        headers: corsHeaders,
      });
    }

    // 获取所有用户信息
    const { data: profiles, error: profilesError } = await supabaseAdmin
      .from('profiles')
      .select('id, username, display_name');

    if (profilesError) {
      return new Response(JSON.stringify({ error: 'Profiles query failed: ' + profilesError.message }), {
        status: 500,
        headers: corsHeaders,
      });
    }

    // 构建用户信息映射
    const userMap = new Map();
    profiles?.forEach((user: any) => {
      userMap.set(user.id, user);
    });

    // 获取所有申报记录
    const { data: applications, error: appsError } = await supabaseAdmin
      .from('exhibitor_applications')
      .select('*');

    if (appsError) {
      return new Response(JSON.stringify({ error: 'Applications query failed: ' + appsError.message }), {
        status: 500,
        headers: corsHeaders,
      });
    }

    // 构建展商申报状态映射
    const boothApplications = new Map();
    applications?.forEach((app: any) => {
      const key = `${app.user_id}_${app.category}`;
      boothApplications.set(key, app);
    });

    // 为每个展商构建完整的申报状态
    const result: any[] = [];
    const categories = ['furniture', 'network', 'electricity', 'water', 'gas'];

    booths?.forEach((booth: any) => {
      const userId = booth.user_id;
      const boothId = booth.id;
      const user = userMap.get(userId);

      categories.forEach((category) => {
        const key = `${userId}_${category}`;
        const existingApp = boothApplications.get(key);

        if (existingApp) {
          // 有申报记录
          result.push({
            id: existingApp.id,
            user_id: userId,
            booth_id: boothId,
            category: category,
            content: existingApp.content,
            payment_status: existingApp.payment_status,
            created_at: existingApp.created_at,
            updated_at: existingApp.updated_at,
            booth: {
              hall_number: booth.hall_number,
              booth_number: booth.booth_number,
              exhibitor_name: booth.exhibitor_name,
              booth_area: booth.booth_area,
              booth_height: booth.booth_height,
            },
            user: {
              username: user?.username || '',
              display_name: user?.display_name || '',
            },
            hasApplication: true,
          });
        } else if (includeAllExhibitors) {
          // 没有申报记录，显示为未申报
          result.push({
            id: `${userId}_${category}`,
            user_id: userId,
            booth_id: boothId,
            category: category,
            content: { items: [], confirmed: false },
            payment_status: 'unpaid',
            created_at: null,
            updated_at: null,
            booth: {
              hall_number: booth.hall_number,
              booth_number: booth.booth_number,
              exhibitor_name: booth.exhibitor_name,
              booth_area: booth.booth_area,
              booth_height: booth.booth_height,
            },
            user: {
              username: user?.username || '',
              display_name: user?.display_name || '',
            },
            hasApplication: false,
          });
        }
      });
    });

    // 应用前端筛选
    let filteredResult = result;
    if (filters.hallNumber) {
      filteredResult = filteredResult.filter((r: any) => r.booth?.hall_number === filters.hallNumber);
    }
    if (filters.boothNumber) {
      filteredResult = filteredResult.filter((r: any) => r.booth?.booth_number === filters.boothNumber);
    }
    if (filters.category) {
      filteredResult = filteredResult.filter((r: any) => r.category === filters.category);
    }
    if (filters.paymentStatus) {
      filteredResult = filteredResult.filter((r: any) => r.payment_status === filters.paymentStatus);
    }
    if (filters.showOnlyApplications) {
      filteredResult = filteredResult.filter((r: any) => r.hasApplication);
    }

    // 排序：有申报的在前，按时间倒序
    filteredResult.sort((a: any, b: any) => {
      if (a.hasApplication && !b.hasApplication) return -1;
      if (!a.hasApplication && b.hasApplication) return 1;
      if (a.created_at && b.created_at) {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
      return 0;
    });

    return new Response(JSON.stringify({ success: true, data: filteredResult }), {
      headers: corsHeaders,
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: corsHeaders,
    });
  }
});
