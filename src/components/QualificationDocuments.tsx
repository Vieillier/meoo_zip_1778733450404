import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../supabase/client';
import { decode } from 'base64-arraybuffer';

interface QualificationDocumentsProps {
  boothNumber: string;
  isPreviewMode?: boolean;
}

interface DocumentState {
  business_license_urls: string[];
  application_letter_urls: string[];
  entrustment_letter_urls: string[];
  safety_responsibility_urls: string[];
  volume_commitment_urls: string[];
  violation_handling_urls: string[];
  insurance_policy_urls: string[];
  equipment_rental_urls: string[];
  electrician_certificate_urls: string[];
}

interface ReviewState {
  business_license_status: 'pending' | 'approved' | 'rejected';
  application_letter_status: 'pending' | 'approved' | 'rejected';
  entrustment_letter_status: 'pending' | 'approved' | 'rejected';
  safety_responsibility_status: 'pending' | 'approved' | 'rejected';
  volume_commitment_status: 'pending' | 'approved' | 'rejected';
  violation_handling_status: 'pending' | 'approved' | 'rejected';
  insurance_policy_status: 'pending' | 'approved' | 'rejected';
  equipment_rental_status: 'pending' | 'approved' | 'rejected';
  electrician_certificate_status: 'pending' | 'approved' | 'rejected';
  business_license_comment?: string;
  application_letter_comment?: string;
  entrustment_letter_comment?: string;
  safety_responsibility_comment?: string;
  volume_commitment_comment?: string;
  violation_handling_comment?: string;
  insurance_policy_comment?: string;
  equipment_rental_comment?: string;
  electrician_certificate_comment?: string;
}

const DOCUMENT_TYPES = [
  { key: 'business_license_urls', label: '施工单位营业执照副本' },
  { key: 'application_letter_urls', label: '特装展台搭建申请书' },
  { key: 'entrustment_letter_urls', label: '特装展台搭建委托书' },
  { key: 'safety_responsibility_urls', label: '特装展台施工安全责任书' },
  { key: 'volume_commitment_urls', label: '音量控制承诺书' },
  { key: 'violation_handling_urls', label: '违反施工管理规定的处理办法' },
  { key: 'insurance_policy_urls', label: '电子版第三者责任险保单' },
  { key: 'equipment_rental_urls', label: '电力设备租赁表' },
  { key: 'electrician_certificate_urls', label: '电工证复印件' }
];

const STATUS_CONFIG = {
  pending: { label: '待审核', color: 'bg-yellow-100 text-yellow-700', icon: 'fa-clock' },
  approved: { label: '审核通过', color: 'bg-green-100 text-green-700', icon: 'fa-check-circle' },
  rejected: { label: '审核未通过', color: 'bg-red-100 text-red-700', icon: 'fa-times-circle' }
};

export default function QualificationDocuments({ boothNumber, isPreviewMode = false }: QualificationDocumentsProps) {
  const [documents, setDocuments] = useState<DocumentState>({
    business_license_urls: [], application_letter_urls: [], entrustment_letter_urls: [],
    safety_responsibility_urls: [], volume_commitment_urls: [], violation_handling_urls: [],
    insurance_policy_urls: [], equipment_rental_urls: [], electrician_certificate_urls: []
  });
  const [reviewState, setReviewState] = useState<ReviewState>({
    business_license_status: 'pending', application_letter_status: 'pending', entrustment_letter_status: 'pending',
    safety_responsibility_status: 'pending', volume_commitment_status: 'pending', violation_handling_status: 'pending',
    insurance_policy_status: 'pending', equipment_rental_status: 'pending', electrician_certificate_status: 'pending'
  });
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [reviewRound, setReviewRound] = useState(0);
  const [lastReviewedAt, setLastReviewedAt] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const fetchDocuments = async () => {
    setLoading(true);
    try {
      const { data } = await supabase.from('qualification_documents').select('*').eq('booth_number', boothNumber).maybeSingle();
      if (data) {
        setDocuments({
          business_license_urls: data.business_license_urls || [], application_letter_urls: data.application_letter_urls || [],
          entrustment_letter_urls: data.entrustment_letter_urls || [], safety_responsibility_urls: data.safety_responsibility_urls || [],
          volume_commitment_urls: data.volume_commitment_urls || [], violation_handling_urls: data.violation_handling_urls || [],
          insurance_policy_urls: data.insurance_policy_urls || [], equipment_rental_urls: data.equipment_rental_urls || [],
          electrician_certificate_urls: data.electrician_certificate_urls || []
        });
        setReviewState({
          business_license_status: data.business_license_status || 'pending', application_letter_status: data.application_letter_status || 'pending',
          entrustment_letter_status: data.entrustment_letter_status || 'pending', safety_responsibility_status: data.safety_responsibility_status || 'pending',
          volume_commitment_status: data.volume_commitment_status || 'pending', violation_handling_status: data.violation_handling_status || 'pending',
          insurance_policy_status: data.insurance_policy_status || 'pending', equipment_rental_status: data.equipment_rental_status || 'pending',
          electrician_certificate_status: data.electrician_certificate_status || 'pending', business_license_comment: data.business_license_comment,
          application_letter_comment: data.application_letter_comment, entrustment_letter_comment: data.entrustment_letter_comment,
          safety_responsibility_comment: data.safety_responsibility_comment, volume_commitment_comment: data.volume_commitment_comment,
          violation_handling_comment: data.violation_handling_comment, insurance_policy_comment: data.insurance_policy_comment,
          equipment_rental_comment: data.equipment_rental_comment, electrician_certificate_comment: data.electrician_certificate_comment
        });
        setIsSubmitted(data.is_submitted || false);
        setIsEditMode(false);
        setReviewRound(data.review_round || 0);
        setLastReviewedAt(data.last_reviewed_at);
      }
    } catch (error) { console.error('Error fetching documents:', error); }
    setLoading(false);
  };

  useEffect(() => { fetchDocuments(); }, [boothNumber]);

  const allApproved = () => {
    return DOCUMENT_TYPES.every(({ key }) => reviewState[key.replace('_urls', '_status') as keyof ReviewState] === 'approved');
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => { resolve((reader.result as string).split(',')[1]); };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const uploadFile = async (file: File, docKey: string) => {
    setUploading(docKey);
    try {
      const base64 = await fileToBase64(file);
      const fileExt = file.name.split('.').pop();
      const fileName = `${boothNumber}/${docKey}/${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from('qualification-documents').upload(fileName, decode(base64), { contentType: file.type });
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from('qualification-documents').getPublicUrl(fileName);
      return urlData.publicUrl;
    } catch (error) {
      alert('上传失败: ' + (error as Error).message);
      return null;
    } finally { setUploading(null); }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>, docKey: string) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = await uploadFile(file, docKey);
    if (url) setDocuments(prev => ({ ...prev, [docKey]: [...prev[docKey as keyof DocumentState], url] }));
  };

  const handleDrop = useCallback(async (e: React.DragEvent, docKey: string) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (!file) return;
    const url = await uploadFile(file, docKey);
    if (url) setDocuments(prev => ({ ...prev, [docKey]: [...prev[docKey as keyof DocumentState], url] }));
  }, [boothNumber]);

  const handleDragOver = (e: React.DragEvent) => e.preventDefault();

  const removeFile = (docKey: string, index: number) => {
    setDocuments(prev => ({ ...prev, [docKey]: prev[docKey as keyof DocumentState].filter((_, i) => i !== index) }));
  };

  const handleSubmit = async () => {
    if (isPreviewMode) {
      alert('预览模式下无法提交');
      return;
    }

    try {
      const { data: existing } = await supabase.from('qualification_documents').select('id').eq('booth_number', boothNumber).maybeSingle();
      const payload = { ...documents, is_submitted: true, submitted_at: new Date().toISOString(), updated_at: new Date().toISOString() };
      if (existing) await supabase.from('qualification_documents').update(payload).eq('id', existing.id);
      else await supabase.from('qualification_documents').insert({ booth_number: boothNumber, ...documents, is_submitted: true, submitted_at: new Date().toISOString() });
      setIsSubmitted(true);
      setIsEditMode(false);
      alert('资质文件申报已提交，等待审核');
    } catch (error) { alert('提交失败'); }
  };

  const handleEnableEditMode = () => setIsEditMode(true);

  const handleSubmitRectification = async () => {
    if (isPreviewMode) {
      alert('预览模式下无法提交整改');
      return;
    }

    try {
      const { data: existing } = await supabase.from('qualification_documents').select('id').eq('booth_number', boothNumber).maybeSingle();
      if (existing) {
        await supabase.from('qualification_documents').update({
          ...documents, is_submitted: true, submitted_at: new Date().toISOString(), updated_at: new Date().toISOString(),
          review_round: reviewRound + 1, business_license_status: 'pending', application_letter_status: 'pending',
          entrustment_letter_status: 'pending', safety_responsibility_status: 'pending', volume_commitment_status: 'pending',
          violation_handling_status: 'pending', insurance_policy_status: 'pending', equipment_rental_status: 'pending',
          electrician_certificate_status: 'pending'
        }).eq('id', existing.id);
      }
      setIsEditMode(false);
      setReviewRound(prev => prev + 1);
      setReviewState(prev => ({ ...prev, business_license_status: 'pending', application_letter_status: 'pending', entrustment_letter_status: 'pending', safety_responsibility_status: 'pending', volume_commitment_status: 'pending', violation_handling_status: 'pending', insurance_policy_status: 'pending', equipment_rental_status: 'pending', electrician_certificate_status: 'pending' }));
      alert('整改申报已提交，等待审核');
    } catch (error) { alert('提交失败'); }
  };

  const getFileName = (url: string) => url.split('/').pop() || '文件';
  const isImage = (url: string) => /\.(jpg|jpeg|png|gif|webp)$/i.test(url);
  const getStatusKey = (docKey: string) => docKey.replace('_urls', '_status') as keyof ReviewState;
  const getCommentKey = (docKey: string) => docKey.replace('_urls', '_comment') as keyof ReviewState;
  const canEditDoc = (docKey: string) => {
    if (!isSubmitted) return true;
    if (isEditMode && reviewState[getStatusKey(docKey)] === 'rejected') return true;
    return false;
  };

  if (loading) return <div className="text-center py-8 text-gray-500">加载中...</div>;

  const allDocsApproved = allApproved();
  const finalApproved = allDocsApproved && !isSubmitted;

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-xl shadow-sm p-6">
      {isPreviewMode && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 mb-6">
          <div className="flex items-center gap-2">
            <i className="fas fa-eye text-orange-600"></i>
            <span className="text-orange-800 font-medium">预览模式 - 仅可查看界面，无法进行操作</span>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-bold text-gray-800">资质文件申报</h3>
          {reviewRound > 0 && <p className="text-sm text-gray-500 mt-1">第 {reviewRound} 轮整改</p>}
        </div>
        <div className="flex items-center gap-3">
          {isSubmitted && !isEditMode && lastReviewedAt && !allDocsApproved && (
            <button onClick={handleEnableEditMode} disabled={isPreviewMode} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50">
              开启修改模式
            </button>
          )}
          {isSubmitted && !isEditMode && !finalApproved && (
            <span className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-sm font-medium">等待审核</span>
          )}
          {finalApproved && (
            <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
              <i className="fas fa-check-circle mr-1"></i>所有资质文件已通过审核
            </span>
          )}
          {isEditMode && (
            <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">整改模式</span>
          )}
        </div>
      </div>

      <div className="space-y-6">
        {DOCUMENT_TYPES.map(({ key, label }) => {
          const status = reviewState[getStatusKey(key)];
          const comment = reviewState[getCommentKey(key)];
          const statusConfig = STATUS_CONFIG[status];
          const editable = canEditDoc(key);
          return (
            <div key={key} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm font-medium text-gray-700">{label}</label>
                {isSubmitted && (
                  <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs ${statusConfig.color}`}>
                    <i className={`fas ${statusConfig.icon}`}></i> {statusConfig.label}
                  </span>
                )}
              </div>
              {isEditMode && status === 'rejected' && comment && (
                <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-700"><i className="fas fa-comment-alt mr-2"></i>审图员意见：{comment}</p>
                </div>
              )}
              {!finalApproved && editable && !isPreviewMode && (
                <div onDrop={(e) => handleDrop(e, key)} onDragOver={handleDragOver} onClick={() => fileInputRefs.current[key]?.click()}
                  className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-colors mb-3">
                  <i className="fas fa-cloud-upload-alt text-3xl text-gray-400 mb-2"></i>
                  <p className="text-sm text-gray-600">将文件拖拽至此处，或点击上传</p>
                  <input ref={el => fileInputRefs.current[key] = el} type="file" onChange={(e) => handleFileSelect(e, key)} className="hidden" />
                  {uploading === key && <p className="text-sm text-blue-600 mt-2">上传中...</p>}
                </div>
              )}
              {isPreviewMode && (
                <div className="border-2 border-dashed border-gray-200 rounded-lg p-6 text-center bg-gray-50 mb-3">
                  <i className="fas fa-eye text-3xl text-gray-300 mb-2"></i>
                  <p className="text-sm text-gray-400">预览模式下不可上传</p>
                </div>
              )}
              <div className="flex items-center gap-2 overflow-x-auto pb-2">
                <span className="text-sm text-gray-500 whitespace-nowrap">已上传:</span>
                {documents[key as keyof DocumentState].length === 0 ? <span className="text-sm text-gray-400">(暂无文件)</span> : documents[key as keyof DocumentState].map((url, index) => (
                  <div key={index} className="flex-shrink-0">
                    {isImage(url) ? (
                      <div className="relative group">
                        <img src={url} alt={getFileName(url)} onClick={() => setPreviewImage(url)} className="w-20 h-20 object-cover rounded-lg border border-gray-200 cursor-pointer hover:opacity-80 transition-opacity" />
                        {!finalApproved && editable && <button onClick={() => removeFile(key, index)} className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"><i className="fas fa-times"></i></button>}
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 px-2 py-1 bg-blue-50 rounded text-sm whitespace-nowrap">
                        <i className="fas fa-file text-blue-500"></i>
                        <span className="text-blue-700">{getFileName(url)}</span>
                        {!finalApproved && editable && <button onClick={() => removeFile(key, index)} className="text-red-500 hover:text-red-700 ml-1"><i className="fas fa-times"></i></button>}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-6">
        {isPreviewMode ? (
          <button disabled className="px-6 py-2 bg-gray-300 text-gray-500 rounded-lg cursor-not-allowed">预览模式不可提交</button>
        ) : !isSubmitted && !finalApproved ? (
          <button onClick={handleSubmit} disabled={loading} className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50">确认提交所有申报</button>
        ) : isEditMode ? (
          <button onClick={handleSubmitRectification} disabled={loading} className="px-6 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50">提交整改申报</button>
        ) : finalApproved ? (
          <button disabled className="px-6 py-2 bg-gray-300 text-gray-500 rounded-lg cursor-not-allowed">审核已通过</button>
        ) : null}
      </div>

      <AnimatePresence>
        {previewImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setPreviewImage(null)}
            className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-[60] p-4 cursor-zoom-out"
          >
            <motion.img
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.8 }}
              src={previewImage}
              alt="预览"
              className="max-w-full max-h-full rounded-lg"
            />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
