import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../supabase/client';

interface DrawingReviewProps {
  boothNumber: string;
  exhibitorName?: string;
  onClose: () => void;
}

interface DrawingState {
  urls: string[];
  status: 'pending' | 'approved' | 'rejected';
  comment: string;
}

interface DrawingsData {
  [key: string]: DrawingState;
}

interface HistoryRecord {
  id: string;
  drawing_type: string;
  file_url: string;
  uploaded_at: string;
  review_round: number;
}

const DRAWING_TYPES = [
  { key: 'effect_drawing', label: '多角度效果图', dbField: 'effect_drawing' },
  { key: 'elevation_grid', label: '立面网格图', dbField: 'elevation_grid_drawing' },
  { key: 'plan_drawing', label: '平面图', dbField: 'plan_drawing' },
  { key: 'structure_drawing', label: '内部结构图', dbField: 'structure_drawing' },
  { key: 'material_drawing', label: '材质图', dbField: 'material_drawing' },
  { key: 'power_system', label: '配电系统图', dbField: 'electrical_system_drawing' },
  { key: 'utility_position', label: '水电气网点位设施位置图', dbField: 'utility_position_drawing' },
  { key: 'fire_facility', label: '消防设施布局图', dbField: 'fire_facility_drawing' }
];

const DB_TO_KEY_MAP: Record<string, string> = {
  'effect_drawing': 'effect_drawing',
  'elevation_grid_drawing': 'elevation_grid',
  'plan_drawing': 'plan_drawing',
  'structure_drawing': 'structure_drawing',
  'material_drawing': 'material_drawing',
  'electrical_system_drawing': 'power_system',
  'utility_position_drawing': 'utility_position',
  'fire_facility_drawing': 'fire_facility'
};

export default function DrawingReview({ boothNumber, exhibitorName, onClose }: DrawingReviewProps) {
  const [drawings, setDrawings] = useState<DrawingsData>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [reviewRound, setReviewRound] = useState(0);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isReviewed, setIsReviewed] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [aiReviewing, setAiReviewing] = useState(false);
  const [boothId, setBoothId] = useState<string | null>(null);

  useEffect(() => {
    fetchDrawings();
  }, [boothNumber]);

  const fetchDrawings = async () => {
    setLoading(true);
    try {
      // 获取 booth_id
      const { data: boothData } = await supabase
        .from('exhibitor_booths')
        .select('id')
        .eq('booth_number', boothNumber)
        .maybeSingle();

      if (boothData) {
        setBoothId(boothData.id);
      }

      const { data: docData } = await supabase
        .from('drawing_documents')
        .select('*')
        .eq('booth_number', boothNumber)
        .maybeSingle();

      const { data: historyData } = await supabase
        .from('drawing_history')
        .select('*')
        .eq('booth_number', boothNumber)
        .order('uploaded_at', { ascending: false });

      const docs: DrawingsData = {};

      DRAWING_TYPES.forEach(({ key, dbField }) => {
        docs[key] = {
          urls: [],
          status: 'pending',
          comment: ''
        };
      });

      if (docData) {
        DRAWING_TYPES.forEach(({ key, dbField }) => {
          docs[key] = {
            urls: docData[`${dbField}_urls`] || [],
            status: docData[`${dbField}_status`] || 'pending',
            comment: docData[`${dbField}_comment`] || ''
          };
        });
        setReviewRound(docData.review_round || 0);
        setIsSubmitted(docData.is_submitted || false);
        const hasPendingStatus = DRAWING_TYPES.some(({ key, dbField }) => docData[`${dbField}_status`] === 'pending');
        setIsReviewed(!!docData.last_reviewed_at && !hasPendingStatus);
      }

      if (historyData && historyData.length > 0) {
        historyData.forEach((record: HistoryRecord) => {
          const historyType = record.drawing_type.replace('_urls', '');
          const key = DB_TO_KEY_MAP[historyType];
          if (key && docs[key]) {
            const exists = docs[key].urls.some(url => url === record.file_url);
            if (!exists) {
              docs[key].urls.push(record.file_url);
            }
          }
        });
      }

      setDrawings(docs);
    } catch (error) {
      console.error('Error fetching drawings:', error);
    }
    setLoading(false);
  };

  const handleStatusChange = (key: string, status: 'approved' | 'rejected') => {
    setDrawings(prev => ({ ...prev, [key]: { ...prev[key], status } }));
  };

  const handleCommentChange = (key: string, comment: string) => {
    setDrawings(prev => ({ ...prev, [key]: { ...prev[key], comment } }));
  };

  const allReviewed = () => {
    return DRAWING_TYPES.every(({ key }) => drawings[key]?.status !== 'pending');
  };

  const handleSubmit = async () => {
    if (!allReviewed()) {
      alert('请完成所有图纸的审核');
      return;
    }
    setSubmitting(true);
    try {
      const updateData: any = {};
      const allApproved = DRAWING_TYPES.every(({ key }) => drawings[key]?.status === 'approved');

      DRAWING_TYPES.forEach(({ dbField, key }) => {
        updateData[`${dbField}_urls`] = drawings[key]?.urls || [];
        updateData[`${dbField}_status`] = drawings[key]?.status || 'pending';
        updateData[`${dbField}_comment`] = drawings[key]?.comment || '';
      });

      updateData.is_submitted = !allApproved;
      updateData.last_reviewed_at = new Date().toISOString();

      const { data: existing } = await supabase
        .from('drawing_documents')
        .select('id')
        .eq('booth_number', boothNumber)
        .maybeSingle();

      if (existing) {
        await supabase
          .from('drawing_documents')
          .update(updateData)
          .eq('id', existing.id);
      } else {
        await supabase
          .from('drawing_documents')
          .insert({ booth_number: boothNumber, ...updateData });
      }

      alert(allApproved ? '所有图纸审核通过' : '审核意见已提交，等待展商整改');
      onClose();
    } catch (error) {
      alert('提交失败');
    }
    setSubmitting(false);
  };

  const handleRejectAgain = async () => {
    if (!confirm('确认要驳回此次审核吗？展商将需要重新提交整改申报。')) {
      return;
    }
    setSubmitting(true);
    try {
      const { data: existing } = await supabase
        .from('drawing_documents')
        .select('id, review_round')
        .eq('booth_number', boothNumber)
        .maybeSingle();

      if (!existing) {
        alert('未找到审核记录');
        setSubmitting(false);
        return;
      }

      // 重置所有图纸状态为待审核，但保留审核意见供展商查看
      const updateData: any = {};
      DRAWING_TYPES.forEach(({ dbField }) => {
        updateData[`${dbField}_status`] = 'pending';
        // 保留审核意见，不清空，这样展商可以看到为什么被驳回
        // updateData[`${dbField}_comment`] = '';
      });

      updateData.is_submitted = true; // 展商需要重新提交
      updateData.last_reviewed_at = null; // 清空最后审核时间

      await supabase
        .from('drawing_documents')
        .update(updateData)
        .eq('id', existing.id);

      alert('已驳回此次审核，展商可重新提交整改申报');
      onClose();
    } catch (error) {
      alert('驳回失败: ' + (error as Error).message);
    }
    setSubmitting(false);
  };

  // 再次审查功能 - 解锁审核状态
  const handleReviewAgain = async () => {
    if (!confirm('确认要重新审查吗？这将解锁审核状态，允许您修改审核结果。')) {
      return;
    }

    setSubmitting(true);
    try {
      const { data: existing } = await supabase
        .from('drawing_documents')
        .select('id')
        .eq('booth_number', boothNumber)
        .maybeSingle();

      if (!existing) {
        alert('未找到审核记录');
        setSubmitting(false);
        return;
      }

      // 清空 last_reviewed_at，解锁审核状态
      await supabase
        .from('drawing_documents')
        .update({ last_reviewed_at: null })
        .eq('id', existing.id);

      // 重新加载数据
      await fetchDrawings();
      alert('已解锁审核状态，您可以重新审查');
    } catch (error) {
      alert('解锁失败: ' + (error as Error).message);
    }
    setSubmitting(false);
  };

  // AI 初审功能
  const handleAIReview = async () => {
    if (!boothId) {
      alert('无法获取展位信息');
      return;
    }

    if (!confirm('确认要使用 AI 初审功能吗？AI 将分析图纸并自动填写审核意见。')) {
      return;
    }

    setAiReviewing(true);
    try {
      console.log('[AI初审] 开始调用 AI 初审 API...');
      console.log('[AI初审] Booth ID:', boothId);

      // 获取当前会话的 access token
      const { data: { session } } = await supabase.auth.getSession();
      const accessToken = session?.access_token;

      if (!accessToken) {
        throw new Error('未获取到访问令牌，请重新登录');
      }

      // 构建 API URL（使用 supabase client 中的 URL）
      const apiUrl = `${supabase.supabaseUrl}/functions/v1/ai-pre-review`;
      console.log('[AI初审] API URL:', apiUrl);

      // 调用 AI 初审 Edge Function
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ booth_id: boothId })
      });

      console.log('[AI初审] API 响应状态:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[AI初审] API 调用失败:', errorText);
        throw new Error(`AI 初审失败 (${response.status}): ${errorText}`);
      }

      const result = await response.json();
      console.log('[AI初审] API 响应:', result);

      if (!result.success) {
        throw new Error(result.error || 'AI 初审失败');
      }

      const aiReview = result.ai_review;

      // 如果 AI 建议驳回，自动填写审核意见
      if (aiReview.suggestion === '驳回') {
        // 找到第一个有图纸的项目，将其标记为 rejected 并填写 AI 的理由
        const firstDrawingWithFiles = DRAWING_TYPES.find(({ key }) =>
          drawings[key]?.urls?.length > 0
        );

        if (firstDrawingWithFiles) {
          const updatedDrawings = { ...drawings };
          updatedDrawings[firstDrawingWithFiles.key] = {
            ...updatedDrawings[firstDrawingWithFiles.key],
            status: 'rejected',
            comment: `【AI 初审意见】\n${aiReview.reason}\n\n请审图员确认或修改此意见。`
          };
          setDrawings(updatedDrawings);

          alert(`AI 初审完成！\n\n建议：${aiReview.suggestion}\n\n已自动将"${firstDrawingWithFiles.label}"标记为不通过，并填写了审核意见。请审图员确认或修改。`);
        } else {
          alert(`AI 初审完成！\n\n建议：${aiReview.suggestion}\n理由：${aiReview.reason}\n\n但未找到已上传的图纸，请手动操作。`);
        }
      } else {
        // AI 建议通过
        alert(`AI 初审完成！\n\n建议：${aiReview.suggestion}\n理由：${aiReview.reason}\n\n请审图员根据实际情况进行最终审核。`);
      }

    } catch (error) {
      console.error('[AI初审] 错误:', error);
      alert('AI 初审失败: ' + (error as Error).message);
    } finally {
      setAiReviewing(false);
    }
  };

  const getFileName = (url: string) => url.split('/').pop() || '文件';
  const isImage = (url: string) => /\.(jpg|jpeg|png|gif|webp)$/i.test(url);

  if (loading) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl p-8 text-center"><p className="text-gray-500">加载中...</p></div>
      </motion.div>
    );
  }

  const allApproved = DRAWING_TYPES.every(({ key }) => drawings[key]?.status === 'approved');

  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-y-auto">
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-gray-800">图纸审核</h2>
                <p className="text-sm text-gray-500">{exhibitorName || boothNumber}</p>
              </div>
              <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><i className="fas fa-times text-xl"></i></button>
            </div>

            {reviewRound > 0 && (
              <div className="mb-4 bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-sm text-blue-800"><i className="fas fa-info-circle mr-2"></i>第 {reviewRound} 轮整改</p>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {DRAWING_TYPES.map(({ key, label }) => {
                const doc = drawings[key];
                const hasFiles = doc?.urls?.length > 0;
                return (
                  <div key={key} className="border border-gray-200 rounded-lg p-4 bg-white">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium text-gray-800">{label}</h3>
                        {doc?.status === 'approved' && <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs"><i className="fas fa-check mr-1"></i>通过</span>}
                        {doc?.status === 'rejected' && <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded text-xs"><i className="fas fa-times mr-1"></i>未通过</span>}
                      </div>
                      {!isReviewed && (
                        <div className="flex gap-2">
                          <button onClick={() => handleStatusChange(key, 'approved')} className={`px-3 py-1 rounded text-sm ${doc?.status === 'approved' ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-green-100'}`}><i className="fas fa-check mr-1"></i>通过</button>
                          <button onClick={() => handleStatusChange(key, 'rejected')} className={`px-3 py-1 rounded text-sm ${doc?.status === 'rejected' ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-red-100'}`}><i className="fas fa-times mr-1"></i>不通过</button>
                        </div>
                      )}
                    </div>

                    {hasFiles ? (
                      <div className="flex gap-2 overflow-x-auto pb-2">
                        {doc.urls.map((url, idx) => (
                          <div key={idx} className="flex-shrink-0">
                            {isImage(url) ? (
                              <img src={url} alt="" onClick={() => setPreviewImage(url)} className="w-24 h-24 object-cover rounded-lg border cursor-pointer hover:opacity-80 transition-opacity" />
                            ) : (
                              <div className="flex items-center gap-1 px-2 py-1 bg-blue-50 rounded text-sm"><i className="fas fa-file text-blue-500"></i><span className="text-blue-700">{getFileName(url)}</span></div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : <p className="text-sm text-gray-400">未上传文件</p>}

                    {doc?.status === 'rejected' && !isReviewed && (
                      <div className="mt-3">
                        <textarea value={doc.comment} onChange={(e) => handleCommentChange(key, e.target.value)} placeholder="请输入审核意见..." className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" rows={2} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="flex gap-4 mt-6">
              {!isReviewed ? (
                <>
                  <button
                    onClick={handleSubmit}
                    disabled={submitting || !allReviewed()}
                    className={`flex-1 py-3 rounded-lg transition-colors disabled:opacity-50 ${allApproved ? 'bg-green-600 text-white hover:bg-green-700' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
                  >
                    {submitting ? '提交中...' : allApproved ? '审核通过' : '提交审核意见'}
                  </button>
                  <button
                    onClick={handleAIReview}
                    disabled={aiReviewing || submitting || !boothId}
                    className="flex-1 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
                    title="使用 AI 分析图纸并自动填写审核意见"
                  >
                    {aiReviewing ? (
                      <>
                        <i className="fas fa-spinner fa-spin mr-2"></i>AI 分析中...
                      </>
                    ) : (
                      <>
                        <i className="fas fa-robot mr-2"></i>AI 初审
                      </>
                    )}
                  </button>
                </>
              ) : (
                <>
                  <div className="flex-1 py-3 bg-gray-100 text-gray-500 rounded-lg text-center">
                    <i className="fas fa-check-circle mr-2"></i>审核已完成
                  </div>
                  <button
                    onClick={handleReviewAgain}
                    disabled={submitting}
                    className="flex-1 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                    title="解锁审核状态，重新审查"
                  >
                    {submitting ? '处理中...' : (
                      <>
                        <i className="fas fa-redo mr-2"></i>再次审查
                      </>
                    )}
                  </button>
                  {allApproved && (
                    <button
                      onClick={handleRejectAgain}
                      disabled={submitting}
                      className="flex-1 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50"
                      title="驳回此次审核，展商需重新提交"
                    >
                      {submitting ? '处理中...' : '可再次驳回'}
                    </button>
                  )}
                </>
              )}
              <button onClick={onClose} className="flex-1 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300">关闭</button>
            </div>
          </div>
        </motion.div>
      </motion.div>

      <AnimatePresence>
        {previewImage && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setPreviewImage(null)} className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-[60] p-4 cursor-zoom-out">
            <motion.img initial={{ scale: 0.8 }} animate={{ scale: 1 }} exit={{ scale: 0.8 }} src={previewImage} alt="预览" className="max-w-full max-h-full rounded-lg" />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
