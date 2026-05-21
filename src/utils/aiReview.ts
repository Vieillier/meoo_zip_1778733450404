/**
 * AI 初审前端调用示例
 * 
 * 使用场景：在审图员界面添加"一键AI初审"按钮
 */

import { supabase } from './supabase/client';

// ========== 类型定义 ==========
interface AIReviewResult {
  suggestion: '通过' | '驳回';
  reason: string;
}

interface AIReviewResponse {
  success: boolean;
  booth_id: string;
  booth_info: {
    booth_number: string;
    hall_number?: string;
    booth_area?: number;
    booth_height?: number;
    booth_category?: string;
    exhibitor_name?: string;
  };
  ai_review: AIReviewResult;
  matched_guides_count: number;
  timestamp: string;
  error?: string;
}

// ========== 调用 AI 初审函数 ==========
export async function callAIPreReview(boothId: string): Promise<AIReviewResponse> {
  try {
    console.log('[前端] 调用 AI 初审，展位ID:', boothId);

    // 调用 Edge Function
    const { data, error } = await supabase.functions.invoke('ai-pre-review', {
      body: { booth_id: boothId }
    });

    if (error) {
      console.error('[前端] AI 初审调用失败:', error);
      throw new Error(error.message || 'AI 初审调用失败');
    }

    console.log('[前端] AI 初审结果:', data);
    return data as AIReviewResponse;

  } catch (error) {
    console.error('[前端] AI 初审异常:', error);
    throw error;
  }
}

// ========== React 组件示例 ==========
/**
 * 使用示例（在审图员界面中）：
 * 
 * import { callAIPreReview } from './utils/aiReview';
 * 
 * function ReviewerPanel({ boothId }: { boothId: string }) {
 *   const [aiResult, setAiResult] = useState<AIReviewResult | null>(null);
 *   const [loading, setLoading] = useState(false);
 * 
 *   const handleAIReview = async () => {
 *     setLoading(true);
 *     try {
 *       const response = await callAIPreReview(boothId);
 *       if (response.success) {
 *         setAiResult(response.ai_review);
 *         // 可以自动填充到审查意见框
 *         setReviewComment(response.ai_review.reason);
 *         setReviewStatus(response.ai_review.suggestion === '通过' ? 'approved' : 'rejected');
 *       }
 *     } catch (error) {
 *       alert('AI 初审失败，请稍后重试');
 *     } finally {
 *       setLoading(false);
 *     }
 *   };
 * 
 *   return (
 *     <div>
 *       <button onClick={handleAIReview} disabled={loading}>
 *         {loading ? '🤖 AI 分析中...' : '🤖 一键AI初审'}
 *       </button>
 *       
 *       {aiResult && (
 *         <div className={`ai-suggestion ${aiResult.suggestion === '通过' ? 'success' : 'warning'}`}>
 *           <h4>AI 初审建议：{aiResult.suggestion}</h4>
 *           <p>{aiResult.reason}</p>
 *           <small>⚠️ 此为 AI 建议，请人工复核后决策</small>
 *         </div>
 *       )}
 *     </div>
 *   );
 * }
 */

// ========== 批量 AI 初审示例 ==========
export async function batchAIReview(boothIds: string[]): Promise<AIReviewResponse[]> {
  const results: AIReviewResponse[] = [];
  
  for (const boothId of boothIds) {
    try {
      const result = await callAIPreReview(boothId);
      results.push(result);
      
      // 避免频繁调用，添加延迟
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      console.error(`[前端] 展位 ${boothId} AI 初审失败:`, error);
      results.push({
        success: false,
        booth_id: boothId,
        error: error instanceof Error ? error.message : '未知错误',
        booth_info: {} as any,
        ai_review: { suggestion: '驳回', reason: 'AI 初审失败' },
        matched_guides_count: 0,
        timestamp: new Date().toISOString()
      });
    }
  }
  
  return results;
}

// ========== 导出 ==========
export type { AIReviewResult, AIReviewResponse };
