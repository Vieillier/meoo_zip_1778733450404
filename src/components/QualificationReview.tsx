import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../supabase/client';

interface QualificationReviewProps {
  boothNumber: string;
  exhibitorName?: string;
  onClose: () => void;
}

interface DocumentState {
  urls: string[];
  status: 'pending' | 'approved' | 'rejected';
  comment: string;
}

interface DocumentsData {
  [key: string]: DocumentState;
}

const DOCUMENT_TYPES = [
  { key: 'business_license', label: '施工单位营业执照副本' },
  { key: 'application_letter', label: '特装展台搭建申请书' },
  { key: 'entrustment_letter', label: '特装展台搭建委托书' },
  { key: 'safety_responsibility', label: '特装展台施工安全责任书' },
  { key: 'volume_commitment', label: '音量控制承诺书' },
  { key: 'violation_handling', label: '违反施工管理规定的处理办法' },
  { key: 'insurance_policy', label: '电子版第三者责任险保单' },
  { key: 'equipment_rental', label: '电力设备租赁表' },
  { key: 'electrician_certificate', label: '电工证复印件' }
];

export default function QualificationReview({ boothNumber, exhibitorName, onClose }: QualificationReviewProps) {
  const [documents, setDocuments] = useState<DocumentsData>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [reviewRound, setReviewRound] = useState(0);
  const [lastReviewedAt, setLastReviewedAt] = useState<string | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  useEffect(() => {
    fetchDocuments();
  }, [boothNumber]);

  const fetchDocuments = async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('qualification_documents')
        .select('*')
        .eq('booth_number', boothNumber)
        .maybeSingle();

      if (data) {
        const docs: DocumentsData = {};
        DOCUMENT_TYPES.forEach(({ key }) => {
          docs[key] = {
            urls: data[`${key}_urls`] || [],
            status: data[`${key}_status`] || 'pending',
            comment: data[`${key}_comment`] || ''
          };
        });
        setDocuments(docs);
        setReviewRound(data.review_round || 0);
        setLastReviewedAt(data.last_reviewed_at);
        setIsSubmitted(data.is_submitted || false);
        
        const allApproved = DOCUMENT_TYPES.every(({ key }) => docs[key]?.status === 'approved');
        const hasReviewed = data.last_reviewed_at && !data.is_submitted;
        setIsLocked(hasReviewed || (allApproved && !data.is_submitted));
      }
    } catch (error) {
      console.error('Error fetching documents:', error);
    }
    setLoading(false);
  };

  const handleStatusChange = (key: string, status: 'approved' | 'rejected') => {
    if (isLocked) return;
    setDocuments(prev => ({
      ...prev,
      [key]: { ...prev[key], status }
    }));
  };

  const handleCommentChange = (key: string, comment: string) => {
    if (isLocked) return;
    setDocuments(prev => ({
      ...prev,
      [key]: { ...prev[key], comment }
    }));
  };

  const allApproved = () => {
    return DOCUMENT_TYPES.every(({ key }) => documents[key]?.status === 'approved');
  };

  const handleSubmit = async () => {
    if (isLocked) return;
    setSubmitting(true);
    try {
      const updateData: any = {};
      const allDocsApproved = allApproved();
      
      DOCUMENT_TYPES.forEach(({ key }) => {
        updateData[`${key}_status`] = documents[key]?.status || 'pending';
        updateData[`${key}_comment`] = documents[key]?.comment || '';
      });
      
      updateData.is_submitted = !allDocsApproved;
      updateData.last_reviewed_at = new Date().toISOString();

      const { data: existing } = await supabase
        .from('qualification_documents')
        .select('id')
        .eq('booth_number', boothNumber)
        .maybeSingle();

      if (existing) {
        await supabase
          .from('qualification_documents')
          .update(updateData)
          .eq('id', existing.id);
      }

      setIsLocked(true);
      alert(allDocsApproved ? '资质文件审核通过' : '审核意见已提交，等待展商整改');
      onClose();
    } catch (error) {
      alert('提交失败');
    }
    setSubmitting(false);
  };

  const getFileName = (url: string) => {
    const parts = url.split('/');
    return parts[parts.length - 1] || '文件';
  };

  const isImage = (url: string) => /\.(jpg|jpeg|png|gif|webp)$/i.test(url);

  if (loading) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl p-8 text-center">
          <p className="text-gray-500">加载中...</p>
        </div>
      </motion.div>
    );
  }

  const allDocsApproved = allApproved();
  const showApprovedState = allDocsApproved && !isSubmitted;

  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-gray-800">资质文件审核</h2>
                <p className="text-sm text-gray-500">{exhibitorName || boothNumber}</p>
              </div>
              <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                <i className="fas fa-times text-xl"></i>
              </button>
            </div>

            {reviewRound > 0 && (
              <div className="mb-4 bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-sm text-blue-800">
                  <i className="fas fa-info-circle mr-2"></i>
                  第 {reviewRound} 轮整改
                  {lastReviewedAt && ` | 上次审核: ${new Date(lastReviewedAt).toLocaleString()}`}
                </p>
              </div>
            )}

            {isLocked && !isSubmitted && !showApprovedState && (
              <div className="mb-4 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <p className="text-sm text-yellow-800">
                  <i className="fas fa-lock mr-2"></i>
                  审核已提交，等待展商整改申报后可再次审核
                </p>
              </div>
            )}

            {showApprovedState && (
              <div className="mb-4 bg-green-50 border border-green-200 rounded-lg p-3">
                <p className="text-sm text-green-800">
                  <i className="fas fa-check-circle mr-2"></i>
                  所有资质文件已通过审核
                </p>
              </div>
            )}

            <div className="space-y-4">
              {DOCUMENT_TYPES.map(({ key, label }) => {
                const doc = documents[key];
                const hasFiles = doc?.urls?.length > 0;
                
                return (
                  <div key={key} className={`border rounded-lg p-4 ${isLocked ? 'bg-gray-50' : 'bg-white border-gray-200'}`}>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium text-gray-800">{label}</h3>
                        {doc?.status === 'approved' && (
                          <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs">
                            <i className="fas fa-check mr-1"></i>已通过
                          </span>
                        )}
                        {doc?.status === 'rejected' && (
                          <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded text-xs">
                            <i className="fas fa-times mr-1"></i>未通过
                          </span>
                        )}
                      </div>
                      {hasFiles && !isLocked && (
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleStatusChange(key, 'approved')}
                            className={`px-3 py-1 rounded text-sm ${
                              doc?.status === 'approved'
                                ? 'bg-green-600 text-white'
                                : 'bg-gray-100 text-gray-700 hover:bg-green-100'
                            }`}
                          >
                            <i className="fas fa-check mr-1"></i>审核通过
                          </button>
                          <button
                            onClick={() => handleStatusChange(key, 'rejected')}
                            className={`px-3 py-1 rounded text-sm ${
                              doc?.status === 'rejected'
                                ? 'bg-red-600 text-white'
                                : 'bg-gray-100 text-gray-700 hover:bg-red-100'
                            }`}
                          >
                            <i className="fas fa-times mr-1"></i>审核未通过
                          </button>
                        </div>
                      )}
                    </div>

                    {hasFiles ? (
                      <div className="flex gap-2 overflow-x-auto pb-2">
                        {doc.urls.map((url, idx) => (
                          <div key={idx} className="flex-shrink-0">
                            {isImage(url) ? (
                              <img 
                                src={url} 
                                alt="" 
                                onClick={() => setPreviewImage(url)}
                                className="w-20 h-20 object-cover rounded-lg border cursor-pointer hover:opacity-80 transition-opacity" 
                              />
                            ) : (
                              <div className="flex items-center gap-1 px-2 py-1 bg-blue-50 rounded text-sm">
                                <i className="fas fa-file text-blue-500"></i>
                                <span className="text-blue-700">{getFileName(url)}</span>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-400">未上传文件</p>
                    )}

                    {doc?.status === 'rejected' && (
                      <div className="mt-3">
                        {isLocked ? (
                          <p className="text-sm text-red-600"><i className="fas fa-comment-alt mr-1"></i>审核意见：{doc.comment || '无'}</p>
                        ) : (
                          <textarea
                            value={doc.comment}
                            onChange={(e) => handleCommentChange(key, e.target.value)}
                            placeholder="请输入审核意见..."
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                            rows={2}
                          />
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="flex gap-4 mt-6">
              {!isLocked ? (
                <button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className={`flex-1 py-3 rounded-lg transition-colors disabled:opacity-50 ${
                    allDocsApproved
                      ? 'bg-green-600 text-white hover:bg-green-700'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                >
                  {submitting ? '提交中...' : allDocsApproved ? '资质文件审核通过' : '提交审核意见'}
                </button>
              ) : (
                <button
                  disabled
                  className="flex-1 py-3 bg-gray-300 text-gray-500 rounded-lg cursor-not-allowed"
                >
                  {showApprovedState ? '审核已通过' : '等待展商整改申报'}
                </button>
              )}
              <button
                onClick={onClose}
                className="flex-1 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                关闭
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>

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
    </>
  );
}
