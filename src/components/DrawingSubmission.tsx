import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../supabase/client';
import { decode } from 'base64-arraybuffer';

interface DrawingSubmissionProps {
  boothNumber: string;
  isPreviewMode?: boolean;
}

interface DrawingState {
  effect_drawing_urls: string[];
  elevation_grid_drawing_urls: string[];
  plan_drawing_urls: string[];
  structure_drawing_urls: string[];
  material_drawing_urls: string[];
  electrical_system_drawing_urls: string[];
  utility_position_drawing_urls: string[];
  fire_facility_drawing_urls: string[];
}

interface ReviewState {
  effect_drawing_status: 'pending' | 'approved' | 'rejected';
  elevation_grid_drawing_status: 'pending' | 'approved' | 'rejected';
  plan_drawing_status: 'pending' | 'approved' | 'rejected';
  structure_drawing_status: 'pending' | 'approved' | 'rejected';
  material_drawing_status: 'pending' | 'approved' | 'rejected';
  electrical_system_drawing_status: 'pending' | 'approved' | 'rejected';
  utility_position_drawing_status: 'pending' | 'approved' | 'rejected';
  fire_facility_drawing_status: 'pending' | 'approved' | 'rejected';
  effect_drawing_comment?: string;
  elevation_grid_drawing_comment?: string;
  plan_drawing_comment?: string;
  structure_drawing_comment?: string;
  material_drawing_comment?: string;
  electrical_system_drawing_comment?: string;
  utility_position_drawing_comment?: string;
  fire_facility_drawing_comment?: string;
}

interface HistoryRecord {
  id: string;
  drawing_type: string;
  file_url: string;
  uploaded_at: string;
  review_round: number;
}

const DRAWING_TYPES = [
  { key: 'effect_drawing_urls', label: '多角度效果图' },
  { key: 'elevation_grid_drawing_urls', label: '立面网格图' },
  { key: 'plan_drawing_urls', label: '平面图' },
  { key: 'structure_drawing_urls', label: '内部结构图' },
  { key: 'material_drawing_urls', label: '材质图' },
  { key: 'electrical_system_drawing_urls', label: '配电系统图' },
  { key: 'utility_position_drawing_urls', label: '水电气网点位设施位置图' },
  { key: 'fire_facility_drawing_urls', label: '消防设施布局图' }
];

// 文件大小限制：5MB
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB in bytes

const STATUS_CONFIG = {
  pending: { label: '待审核', color: 'bg-yellow-100 text-yellow-700', icon: 'fa-clock' },
  approved: { label: '审核通过', color: 'bg-green-100 text-green-700', icon: 'fa-check-circle' },
  rejected: { label: '审核未通过', color: 'bg-red-100 text-red-700', icon: 'fa-times-circle' }
};

export default function DrawingSubmission({ boothNumber, isPreviewMode = false }: DrawingSubmissionProps) {
  const [drawings, setDrawings] = useState<DrawingState>({
    effect_drawing_urls: [], elevation_grid_drawing_urls: [], plan_drawing_urls: [],
    structure_drawing_urls: [], material_drawing_urls: [], electrical_system_drawing_urls: [],
    utility_position_drawing_urls: [], fire_facility_drawing_urls: []
  });
  const [reviewState, setReviewState] = useState<ReviewState>({
    effect_drawing_status: 'pending', elevation_grid_drawing_status: 'pending', plan_drawing_status: 'pending',
    structure_drawing_status: 'pending', material_drawing_status: 'pending', electrical_system_drawing_status: 'pending',
    utility_position_drawing_status: 'pending', fire_facility_drawing_status: 'pending'
  });
  const [history, setHistory] = useState<HistoryRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [reviewRound, setReviewRound] = useState(0);
  const [lastReviewedAt, setLastReviewedAt] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const fetchDrawings = async () => {
    setLoading(true);
    try {
      // 并发获取图纸文档和历史记录，显著提升加载速度
      const [docResult, historyResult] = await Promise.all([
        supabase.from('drawing_documents').select('*').eq('booth_number', boothNumber).maybeSingle(),
        supabase.from('drawing_history').select('*').eq('booth_number', boothNumber).order('uploaded_at', { ascending: false })
      ]);

      const data = docResult.data;
      const historyData = historyResult.data;

      if (data) {
        setDrawings({
          effect_drawing_urls: data.effect_drawing_urls || [], elevation_grid_drawing_urls: data.elevation_grid_drawing_urls || [],
          plan_drawing_urls: data.plan_drawing_urls || [], structure_drawing_urls: data.structure_drawing_urls || [],
          material_drawing_urls: data.material_drawing_urls || [], electrical_system_drawing_urls: data.electrical_system_drawing_urls || [],
          utility_position_drawing_urls: data.utility_position_drawing_urls || [], fire_facility_drawing_urls: data.fire_facility_drawing_urls || []
        });
        setReviewState({
          effect_drawing_status: data.effect_drawing_status || 'pending', elevation_grid_drawing_status: data.elevation_grid_drawing_status || 'pending',
          plan_drawing_status: data.plan_drawing_status || 'pending', structure_drawing_status: data.structure_drawing_status || 'pending',
          material_drawing_status: data.material_drawing_status || 'pending', electrical_system_drawing_status: data.electrical_system_drawing_status || 'pending',
          utility_position_drawing_status: data.utility_position_drawing_status || 'pending', fire_facility_drawing_status: data.fire_facility_drawing_status || 'pending',
          effect_drawing_comment: data.effect_drawing_comment, elevation_grid_drawing_comment: data.elevation_grid_drawing_comment,
          plan_drawing_comment: data.plan_drawing_comment, structure_drawing_comment: data.structure_drawing_comment,
          material_drawing_comment: data.material_drawing_comment, electrical_system_drawing_comment: data.electrical_system_drawing_comment,
          utility_position_drawing_comment: data.utility_position_drawing_comment, fire_facility_drawing_comment: data.fire_facility_drawing_comment
        });
        setIsSubmitted(data.is_submitted || false);
        setIsEditMode(false);
        setReviewRound(data.review_round || 0);
        setLastReviewedAt(data.last_reviewed_at);
      }
      setHistory(historyData || []);
    } catch (error) { console.error('Error fetching drawings:', error); }
    setLoading(false);
  };

  useEffect(() => {
    if (isPreviewMode || !boothNumber) return;
    fetchDrawings();
  }, [boothNumber, isPreviewMode]);

  const hasBeenReviewed = () => !!lastReviewedAt;

  // 检查是否有驳回意见（即使 last_reviewed_at 为 null，也可能有驳回）
  const hasRejectionComments = () => {
    return DRAWING_TYPES.some(({ key }) => {
      const commentKey = getCommentKey(key);
      return reviewState[commentKey] && reviewState[commentKey].trim() !== '';
    });
  };

  const fileToBase64 = (file: File): Promise<string> => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  const uploadFile = async (file: File, docKey: string) => {
    if (isPreviewMode) {
      alert('预览模式下无法上传文件');
      return null;
    }

    // 检查文件大小
    if (file.size > MAX_FILE_SIZE) {
      alert(`文件大小超过限制！最大允许 5MB，当前文件大小 ${(file.size / 1024 / 1024).toFixed(2)}MB`);
      return null;
    }

    setUploading(docKey);
    try {
      const base64 = await fileToBase64(file);
      const fileExt = file.name.split('.').pop();
      const fileName = `drawings/${boothNumber}/${docKey}/${Date.now()}.${fileExt}`;
      // 使用 qualification-documents bucket 存储图纸文件
      const { error: uploadError } = await supabase.storage.from('qualification-documents').upload(fileName, decode(base64), { contentType: file.type });
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from('qualification-documents').getPublicUrl(fileName);
      const historyType = docKey.replace('_urls', '');
      await supabase.from('drawing_history').insert({ booth_number: boothNumber, drawing_type: historyType, file_url: urlData.publicUrl, review_round: reviewRound });
      return urlData.publicUrl;
    } catch (error) {
      alert('上传失败: ' + (error as Error).message);
      return null;
    } finally { setUploading(null); }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>, docKey: string) => {
    if (isPreviewMode) {
      alert('预览模式下无法上传文件');
      return;
    }
    const file = e.target.files?.[0];
    if (!file) return;
    const url = await uploadFile(file, docKey);
    if (url) setDrawings(prev => ({ ...prev, [docKey]: [...prev[docKey as keyof DrawingState], url] }));
  };

  const handleDrop = useCallback(async (e: React.DragEvent, docKey: string) => {
    e.preventDefault();
    if (isPreviewMode) {
      alert('预览模式下无法上传文件');
      return;
    }
    const file = e.dataTransfer.files[0];
    if (!file) return;
    const url = await uploadFile(file, docKey);
    if (url) setDrawings(prev => ({ ...prev, [docKey]: [...prev[docKey as keyof DrawingState], url] }));
  }, [boothNumber, reviewRound, isPreviewMode]);

  const handleDragOver = (e: React.DragEvent) => e.preventDefault();

  const removeFile = (docKey: string, index: number) => {
    if (isPreviewMode) {
      alert('预览模式下无法删除文件');
      return;
    }
    setDrawings(prev => ({ ...prev, [docKey]: prev[docKey as keyof DrawingState].filter((_, i) => i !== index) }));
  };

  const handleSubmit = async () => {
    if (isPreviewMode) {
      alert('预览模式下无法提交');
      return;
    }

    try {
      const { data: existing } = await supabase.from('drawing_documents').select('id').eq('booth_number', boothNumber).maybeSingle();

      // 直接使用当前的 drawings 状态，不需要合并历史记录
      const payload = {
        effect_drawing_urls: drawings.effect_drawing_urls || [],
        elevation_grid_drawing_urls: drawings.elevation_grid_drawing_urls || [],
        plan_drawing_urls: drawings.plan_drawing_urls || [],
        structure_drawing_urls: drawings.structure_drawing_urls || [],
        material_drawing_urls: drawings.material_drawing_urls || [],
        electrical_system_drawing_urls: drawings.electrical_system_drawing_urls || [],
        utility_position_drawing_urls: drawings.utility_position_drawing_urls || [],
        fire_facility_drawing_urls: drawings.fire_facility_drawing_urls || [],
        is_submitted: true,
        submitted_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      if (existing?.id) {
        const { error } = await supabase.from('drawing_documents').update(payload).eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('drawing_documents').insert({ booth_number: boothNumber, ...payload });
        if (error) throw error;
      }
      setIsSubmitted(true);
      setIsEditMode(false);
      await fetchDrawings();
      alert('图纸申报已提交，等待审核');
    } catch (error) {
      console.error('Submit error:', error);
      alert('提交失败: ' + (error as Error).message);
    }
  };

  const handleEnableEditMode = () => {
    if (isPreviewMode) {
      alert('预览模式下无法开启修改模式');
      return;
    }
    setIsEditMode(true);
  };

  const handleSubmitRectification = async () => {
    if (isPreviewMode) {
      alert('预览模式下无法提交整改');
      return;
    }

    try {
      const { data: existing } = await supabase.from('drawing_documents').select('id').eq('booth_number', boothNumber).maybeSingle();
      if (existing?.id) {
        const { error } = await supabase.from('drawing_documents').update({
          effect_drawing_urls: drawings.effect_drawing_urls,
          elevation_grid_drawing_urls: drawings.elevation_grid_drawing_urls,
          plan_drawing_urls: drawings.plan_drawing_urls,
          structure_drawing_urls: drawings.structure_drawing_urls,
          material_drawing_urls: drawings.material_drawing_urls,
          electrical_system_drawing_urls: drawings.electrical_system_drawing_urls,
          utility_position_drawing_urls: drawings.utility_position_drawing_urls,
          fire_facility_drawing_urls: drawings.fire_facility_drawing_urls,
          is_submitted: true, submitted_at: new Date().toISOString(), updated_at: new Date().toISOString(),
          review_round: reviewRound + 1, effect_drawing_status: 'pending', elevation_grid_drawing_status: 'pending',
          plan_drawing_status: 'pending', structure_drawing_status: 'pending', material_drawing_status: 'pending',
          electrical_system_drawing_status: 'pending', utility_position_drawing_status: 'pending', fire_facility_drawing_status: 'pending'
        }).eq('id', existing.id);
        if (error) throw error;
      }
      setIsEditMode(false);
      setReviewRound(prev => prev + 1);
      setReviewState(prev => ({ ...prev, effect_drawing_status: 'pending', elevation_grid_drawing_status: 'pending', plan_drawing_status: 'pending', structure_drawing_status: 'pending', material_drawing_status: 'pending', electrical_system_drawing_status: 'pending', utility_position_drawing_status: 'pending', fire_facility_drawing_status: 'pending' }));
      await fetchDrawings();
      alert('整改申报已提交，等待审核');
    } catch (error) {
      console.error('Rectification submit error:', error);
      alert('提交失败: ' + (error as Error).message);
    }
  };

  const getFileName = (url: string) => url.split('/').pop() || '文件';
  const isImage = (url: string) => /\.(jpg|jpeg|png|gif|webp)$/i.test(url);
  const getStatusKey = (docKey: string) => docKey.replace('_urls', '_status') as keyof ReviewState;
  const getCommentKey = (docKey: string) => docKey.replace('_urls', '_comment') as keyof ReviewState;
  const canEditDoc = (docKey: string) => {
    if (isPreviewMode) return false;
    if (!isSubmitted) return true;
    // 在整改模式下，允许编辑所有未通过的图纸（包括 pending 和 rejected）
    if (isEditMode) {
      const status = reviewState[getStatusKey(docKey)];
      return status !== 'approved';
    }
    return false;
  };
  const getHistoryForDoc = (docKey: string) => history.filter(h => h.drawing_type === docKey);

  if (loading) return <div className="text-center py-8 text-gray-500">加载中...</div>;

  const allApproved = DRAWING_TYPES.every(({ key }) => reviewState[getStatusKey(key)] === 'approved');
  const finalApproved = allApproved && !isSubmitted;

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-xl shadow-sm p-6">
      {isPreviewMode && (
        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-sm text-yellow-700"><i className="fas fa-eye mr-2"></i>预览模式 - 仅可查看，不可操作</p>
        </div>
      )}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-bold text-gray-800">图纸申报</h3>
          {reviewRound > 0 && <p className="text-sm text-gray-500 mt-1">第 {reviewRound} 轮整改</p>}
        </div>
        <div className="flex items-center gap-3">
          {isSubmitted && !isEditMode && (hasBeenReviewed() || hasRejectionComments()) && !allApproved && (
            <button onClick={handleEnableEditMode} disabled={isPreviewMode} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50">开启修改模式</button>
          )}
          {isSubmitted && !isEditMode && !finalApproved && <span className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-sm font-medium">等待审核</span>}
          {finalApproved && <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium"><i className="fas fa-check-circle mr-1"></i>所有图纸已通过审核</span>}
          {isEditMode && <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">整改模式</span>}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {DRAWING_TYPES.map(({ key, label }) => {
          const status = reviewState[getStatusKey(key)];
          const comment = reviewState[getCommentKey(key)];
          const statusConfig = STATUS_CONFIG[status];
          const editable = canEditDoc(key);
          const docHistory = getHistoryForDoc(key);
          return (
            <div key={key} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm font-medium text-gray-700">{label}</label>
                {isSubmitted && <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs ${statusConfig.color}`}><i className={`fas ${statusConfig.icon}`}></i> {statusConfig.label}</span>}
              </div>
              {isEditMode && status === 'rejected' && comment && <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg"><p className="text-sm text-red-700"><i className="fas fa-comment-alt mr-2"></i>审图员意见：{comment}</p></div>}
              {!finalApproved && editable && !isPreviewMode && (
                <div onDrop={(e) => handleDrop(e, key)} onDragOver={handleDragOver} onClick={() => fileInputRefs.current[key]?.click()} className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-colors mb-3">
                  <i className="fas fa-cloud-upload-alt text-3xl text-gray-400 mb-2"></i>
                  <p className="text-sm text-gray-600">将文件拖拽至此处，或点击上传</p>
                  <input ref={el => fileInputRefs.current[key] = el} type="file" accept="image/*,.pdf,.dwg" onChange={(e) => handleFileSelect(e, key)} className="hidden" />
                  {uploading === key && <p className="text-sm text-blue-600 mt-2">上传中...</p>}
                </div>
              )}
              {isPreviewMode && (
                <div className="border-2 border-dashed border-gray-200 rounded-lg p-6 text-center bg-gray-50 mb-3">
                  <i className="fas fa-eye text-3xl text-gray-300 mb-2"></i>
                  <p className="text-sm text-gray-400">预览模式 - 无法上传</p>
                </div>
              )}
              <div className="flex items-center gap-2 overflow-x-auto pb-2">
                <span className="text-sm text-gray-500 whitespace-nowrap">已上传:</span>
                {drawings[key as keyof DrawingState].length === 0 ? <span className="text-sm text-gray-400">(暂无文件)</span> : drawings[key as keyof DrawingState].map((url, index) => (
                  <div key={index} className="flex-shrink-0">
                    {isImage(url) ? (
                      <div className="relative group">
                        <img src={url} alt={getFileName(url)} onClick={() => setPreviewImage(url)} className="w-20 h-20 object-cover rounded-lg border border-gray-200 cursor-pointer hover:opacity-80 transition-opacity" />
                        {!finalApproved && editable && !isPreviewMode && <button onClick={() => removeFile(key, index)} className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"><i className="fas fa-times"></i></button>}
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 px-2 py-1 bg-blue-50 rounded text-sm whitespace-nowrap">
                        <i className="fas fa-file text-blue-500"></i>
                        <span className="text-blue-700">{getFileName(url)}</span>
                        {!finalApproved && editable && !isPreviewMode && <button onClick={() => removeFile(key, index)} className="text-red-500 hover:text-red-700 ml-1"><i className="fas fa-times"></i></button>}
                      </div>
                    )}
                  </div>
                ))}
              </div>
              {docHistory.length > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <p className="text-xs text-gray-500 mb-2">历史记录:</p>
                  <div className="flex items-center gap-2 overflow-x-auto">
                    {docHistory.map((h, idx) => (
                      <div key={idx} className="flex-shrink-0">
                        {isImage(h.file_url) ? (
                          <img src={h.file_url} alt="" onClick={() => setPreviewImage(h.file_url)} className="w-12 h-12 object-cover rounded border border-gray-200 cursor-pointer hover:opacity-80" />
                        ) : (
                          <div className="flex items-center gap-1 px-2 py-1 bg-gray-100 rounded text-xs"><i className="fas fa-file text-gray-500"></i><span className="text-gray-600">{getFileName(h.file_url)}</span></div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-6">
        {!isSubmitted && !finalApproved ? <button onClick={handleSubmit} disabled={loading || isPreviewMode} className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50">{isPreviewMode ? '预览模式 - 无法提交' : '确认提交所有图纸'}</button>
        : isEditMode ? <button onClick={handleSubmitRectification} disabled={loading || isPreviewMode} className="px-6 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50">{isPreviewMode ? '预览模式 - 无法提交' : '提交整改申报'}</button>
        : finalApproved ? <button disabled className="px-6 py-2 bg-gray-300 text-gray-500 rounded-lg cursor-not-allowed">审核已通过</button> : null}
      </div>

      <AnimatePresence>
        {previewImage && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setPreviewImage(null)} className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-[60] p-4 cursor-zoom-out">
            <motion.img initial={{ scale: 0.8 }} animate={{ scale: 1 }} exit={{ scale: 0.8 }} src={previewImage} alt="预览" className="max-w-full max-h-full rounded-lg" />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
