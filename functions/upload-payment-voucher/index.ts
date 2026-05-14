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
    const { fileData, fileName, boothId } = body;

    if (!fileData || !fileName || !boothId) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: corsHeaders,
      });
    }

    const bucketName = 'payment-vouchers';
    const filePath = `${boothId}/${Date.now()}_${fileName}`;

    const { data: bucketData, error: bucketError } = await supabaseAdmin.storage.getBucket(bucketName);
    if (bucketError && bucketError.message.includes('not found')) {
      await supabaseAdmin.storage.createBucket(bucketName, { public: true });
    }

    const base64Data = fileData.split(',')[1] || fileData;
    const binaryData = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));

    const { data, error } = await supabaseAdmin.storage
      .from(bucketName)
      .upload(filePath, binaryData, {
        contentType: 'application/octet-stream',
        upsert: true,
      });

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: corsHeaders,
      });
    }

    const { data: urlData } = supabaseAdmin.storage.from(bucketName).getPublicUrl(filePath);

    return new Response(JSON.stringify({
      success: true,
      url: urlData.publicUrl,
      path: filePath,
    }), { headers: corsHeaders });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: corsHeaders,
    });
  }
});
