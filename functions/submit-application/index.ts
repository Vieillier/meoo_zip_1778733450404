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
    const { applications, userId, boothId } = body;

    if (!applications || !Array.isArray(applications) || !userId) {
      return new Response(JSON.stringify({ error: 'Invalid request body: applications array and userId required' }), {
        status: 400,
        headers: corsHeaders,
      });
    }

    const results = {
      success: 0,
      failed: 0,
      errors: [] as string[],
    };

    // 从数据库查找该用户的 booth
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

    if (!boothData) {
      return new Response(JSON.stringify({ error: 'No booth found for user' }), {
        status: 400,
        headers: corsHeaders,
      });
    }

    const actualBoothId = boothData.id;

    for (const app of applications) {
      try {
        const { category, content, status = 'submitted' } = app;

        if (!category) {
          results.errors.push(`跳过: 类别为空`);
          results.failed++;
          continue;
        }

        // 确保 content 是对象格式
        const contentData = typeof content === 'string' ? JSON.parse(content) : content;

        // 删除该用户该类别的旧申报
        const { error: deleteError } = await supabaseAdmin
          .from('exhibitor_applications')
          .delete()
          .eq('user_id', userId)
          .eq('category', category);

        if (deleteError) {
          console.error('Delete error:', deleteError);
        }

        // 插入新申报
        const { error: insertError } = await supabaseAdmin
          .from('exhibitor_applications')
          .insert({
            user_id: userId,
            booth_id: actualBoothId,
            category,
            content: contentData,
            status,
            payment_status: 'unpaid',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });

        if (insertError) {
          results.errors.push(`提交失败: ${category} - ${insertError.message}`);
          results.failed++;
        } else {
          results.success++;
        }
      } catch (error: any) {
        results.errors.push(`处理失败: ${error.message}`);
        results.failed++;
      }
    }

    return new Response(JSON.stringify({ success: true, results }), {
      headers: corsHeaders,
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: corsHeaders,
    });
  }
});
