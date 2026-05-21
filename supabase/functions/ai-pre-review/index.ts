/**
 * AI 初审 Edge Function（多模态视觉版本）
 *
 * 功能：基于 RAG 向量搜索 + 阿里云百炼多模态视觉大模型，对展位图纸进行智能初审
 *
 * 业务逻辑：
 * 1. 接收前端传入的 booth_id
 * 2. 查询展位基本信息（展位号、面积、高度、类别等）
 * 3. 从 Storage 存储桶获取该展位的图纸图片 URL
 * 4. 调用向量搜索函数 match_guide_documents，检索最相关的 3 条审图规范
 * 5. 将展位信息 + 图纸图片 URL + 规范文本喂给多模态视觉大模型（qwen-vl-max）
 * 6. AI 真正"看着"图纸进行审查（检查结构、材料、尺寸等细节）
 * 7. 返回结构化的审查建议（通过/驳回 + 详细理由）
 *
 * 注意：AI 结果仅作为"建议草稿"，不直接修改数据库，由人类审图员最终决策
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

// CORS 头配置
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// 阿里云百炼多模态 API 配置
const DASHSCOPE_VL_API_URL = 'https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation';

// 类型定义
interface BoothInfo {
  booth_number: string;
  hall_number?: string;
  booth_area?: number;
  booth_height?: number;
  booth_category?: string;
  exhibitor_name?: string;
}

interface GuideDocument {
  content: string;
  sections: string[];
  similarity: number;
}

interface DrawingFile {
  file_path: string;
  file_url: string;
}

interface AIReviewResult {
  suggestion: '通过' | '驳回';
  reason: string;
}

serve(async (req) => {
  // 处理 CORS 预检请求
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // ========== 1. 验证请求和参数 ==========
    const { booth_id } = await req.json();

    if (!booth_id) {
      return new Response(
        JSON.stringify({ error: '缺少必需参数: booth_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[AI初审] 开始处理展位: ${booth_id}`);

    // ========== 2. 初始化 Supabase 客户端 ==========
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const dashscopeApiKey = Deno.env.get('DASHSCOPE_API_KEY');

    if (!dashscopeApiKey) {
      throw new Error('未配置 DASHSCOPE_API_KEY 环境变量');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // ========== 3. 查询展位基本信息 ==========
    const { data: boothData, error: boothError } = await supabase
      .from('exhibitor_booths')
      .select('booth_number, hall_number, booth_area, booth_height, booth_category, exhibitor_name')
      .eq('id', booth_id)
      .single();

    if (boothError || !boothData) {
      console.error('[AI初审] 查询展位信息失败:', boothError);
      return new Response(
        JSON.stringify({ error: '展位信息不存在' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const boothInfo: BoothInfo = boothData;
    console.log('[AI初审] 展位信息:', boothInfo);

    // ========== 4. 查询该展位的图纸文件 ==========
    const { data: drawingFiles, error: drawingError } = await supabase
      .from('drawing_submissions')
      .select('file_path')
      .eq('booth_id', booth_id)
      .order('created_at', { ascending: false });

    if (drawingError) {
      console.error('[AI初审] 查询图纸文件失败:', drawingError);
    }

    // 获取图纸的公网 URL
    const drawingUrls: DrawingFile[] = [];
    if (drawingFiles && drawingFiles.length > 0) {
      for (const file of drawingFiles) {
        const { data: urlData } = supabase.storage
          .from('drawing-files')
          .getPublicUrl(file.file_path);

        if (urlData?.publicUrl) {
          drawingUrls.push({
            file_path: file.file_path,
            file_url: urlData.publicUrl
          });
        }
      }
    }

    console.log(`[AI初审] 找到 ${drawingUrls.length} 个图纸文件`);

    if (drawingUrls.length === 0) {
      console.warn('[AI初审] 该展位未上传图纸，将仅基于文字信息审查');
    }

    // ========== 5. 构建查询向量（使用展位关键信息） ==========
    const queryText = `展位类别：${boothInfo.booth_category || '未知'}，展位面积：${boothInfo.booth_area || 0}平方米，展位高度：${boothInfo.booth_height || 0}米`;

    console.log('[AI初审] 查询文本:', queryText);

    // 调用通义千问生成查询向量
    const embeddingResponse = await fetch('https://dashscope.aliyuncs.com/api/v1/services/embeddings/text-embedding/text-embedding', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${dashscopeApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'text-embedding-v2',
        input: {
          texts: [queryText]
        }
      })
    });

    if (!embeddingResponse.ok) {
      const errorText = await embeddingResponse.text();
      console.error('[AI初审] 生成向量失败:', errorText);
      throw new Error(`生成查询向量失败: ${embeddingResponse.status}`);
    }

    const embeddingResult = await embeddingResponse.json();
    const queryEmbedding = embeddingResult.output.embeddings[0].embedding;

    console.log('[AI初审] 查询向量维度:', queryEmbedding.length);

    // ========== 6. 调用向量搜索函数，检索相关规范 ==========
    const { data: guideDocuments, error: searchError } = await supabase
      .rpc('match_guide_documents', {
        query_embedding: queryEmbedding,
        match_threshold: 0.5,
        match_count: 3
      });

    if (searchError) {
      console.error('[AI初审] 向量搜索失败:', searchError);
      throw new Error(`向量搜索失败: ${searchError.message}`);
    }

    console.log(`[AI初审] 检索到 ${guideDocuments?.length || 0} 条相关规范`);

    // ========== 7. 构建多模态 AI 提示词 ==========
    const guideContext = guideDocuments && guideDocuments.length > 0
      ? guideDocuments.map((doc: GuideDocument, index: number) =>
          `【规范${index + 1}】（相关度: ${(doc.similarity * 100).toFixed(1)}%）\n${doc.content}`
        ).join('\n\n')
      : '暂无相关规范';

    // 构建多模态消息内容
    const messageContent: any[] = [];

    // 添加文字说明
    const textPrompt = `你是一位严谨的展会图纸初审助手。请根据提供的展位信息、图纸图片和审图规范，给出初步审查建议。

**展位信息**：
- 展位号：${boothInfo.booth_number}
- 展馆：${boothInfo.hall_number || '未提供'}
- 展商名称：${boothInfo.exhibitor_name || '未提供'}
- 展位类别：${boothInfo.booth_category || '未提供'}
- 展位面积：${boothInfo.booth_area || '未提供'} 平方米
- 展位高度：${boothInfo.booth_height || '未提供'} 米

**相关审图规范**：
${guideContext}

**审查要求**：
1. 仔细查看图纸图片，检查结构设计、材料使用、尺寸标注等细节
2. 对照审图规范，检查是否存在违规情况（例如：螺栓数量不足、高度超标、材料不符等）
3. 如果图纸不清晰或信息不足，应建议"驳回"并要求补充材料
4. 必须明确指出违反了哪条规范（如果有）

**输出格式**：
你必须返回一个 JSON 对象，格式如下：
{
  "suggestion": "通过" 或 "驳回",
  "reason": "详细的审查意见，需标明具体违反的规范条款或图纸中发现的问题"
}`;

    messageContent.push({
      type: 'text',
      text: textPrompt
    });

    // 添加图纸图片（如果有）
    if (drawingUrls.length > 0) {
      console.log('[AI初审] 添加图纸图片到请求中...');
      for (const drawing of drawingUrls.slice(0, 5)) { // 最多处理前5张图片
        messageContent.push({
          type: 'image_url',
          image_url: {
            url: drawing.file_url
          }
        });
      }
    } else {
      // 如果没有图纸，添加提示
      messageContent.push({
        type: 'text',
        text: '\n⚠️ 注意：该展位未上传图纸文件，仅能基于文字信息进行初步审查。建议要求展商补充完整图纸。'
      });
    }

    console.log('[AI初审] 开始调用多模态视觉大模型...');

    // ========== 8. 调用阿里云百炼多模态视觉大模型 ==========
    const aiResponse = await fetch(DASHSCOPE_VL_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${dashscopeApiKey}`,
        'Content-Type': 'application/json',
        'X-DashScope-SSE': 'disable' // 禁用流式输出
      },
      body: JSON.stringify({
        model: 'qwen-vl-max', // 使用多模态视觉大模型
        input: {
          messages: [
            {
              role: 'user',
              content: messageContent
            }
          ]
        },
        parameters: {
          result_format: 'message'
        }
      })
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('[AI初审] 调用多模态模型失败:', errorText);
      throw new Error(`调用多模态模型失败: ${aiResponse.status}`);
    }

    const aiResult = await aiResponse.json();

    // 百炼多模态 API 的响应格式
    let rawText = '';
    const aiContent = aiResult.output?.choices?.[0]?.message?.content || aiResult.output?.text;

    if (Array.isArray(aiContent)) {
      // 如果是数组，提取 text 字段
      rawText = aiContent.map((item: any) => item.text || '').join('\n');
    } else if (typeof aiContent === 'string') {
      rawText = aiContent;
    } else if (aiContent && typeof aiContent === 'object') {
      rawText = (aiContent as any).text || JSON.stringify(aiContent);
    }

    if (!rawText) {
      console.error('[AI初审] AI 响应格式异常:', JSON.stringify(aiResult));
      throw new Error('AI 响应格式异常');
    }

    console.log('[AI初审] AI 原始响应文本:', rawText);

    // ========== 9. 解析 AI 返回的 JSON ==========
    let reviewResult: AIReviewResult;
    try {
      // 尝试直接解析 JSON
      reviewResult = JSON.parse(rawText);

      // 验证返回格式
      if (!reviewResult.suggestion || !reviewResult.reason) {
        throw new Error('AI 返回格式不完整');
      }

      // 规范化 suggestion 字段
      if (!['通过', '驳回'].includes(reviewResult.suggestion)) {
        console.warn('[AI初审] AI 返回了非标准建议:', reviewResult.suggestion);
        reviewResult.suggestion = '驳回'; // 默认保守处理
      }

    } catch (parseError) {
      console.error('[AI初审] 解析 AI 响应失败:', parseError);

      // 尝试从文本中提取 JSON
      const jsonMatch = rawText.match(/\{[\s\S]*"suggestion"[\s\S]*"reason"[\s\S]*\}/);
      if (jsonMatch) {
        try {
          reviewResult = JSON.parse(jsonMatch[0]);
          console.log('[AI初审] 从文本中成功提取 JSON');
        } catch {
          // 降级处理：返回保守建议
          reviewResult = {
            suggestion: '驳回',
            reason: 'AI 初审系统暂时无法给出明确建议，请人工审核。原始响应：' + rawText.substring(0, 200)
          };
        }
      } else {
        // 降级处理：返回保守建议
        reviewResult = {
          suggestion: '驳回',
          reason: 'AI 初审系统暂时无法给出明确建议，请人工审核。'
        };
      }
    }

    console.log('[AI初审] 最终审查结果:', reviewResult);

    // ========== 10. 返回结果给前端 ==========
    return new Response(
      JSON.stringify({
        success: true,
        booth_id,
        booth_info: boothInfo,
        drawing_files_count: drawingUrls.length,
        ai_review: reviewResult,
        matched_guides_count: guideDocuments?.length || 0,
        timestamp: new Date().toISOString()
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('[AI初审] 处理失败:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : '未知错误',
        timestamp: new Date().toISOString()
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
