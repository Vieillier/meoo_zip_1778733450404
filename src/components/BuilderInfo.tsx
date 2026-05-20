import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '../supabase/client';

interface BuilderInfoProps {
  boothNumber: string;
  isPreviewMode?: boolean;
}

interface BuilderInfoData {
  builder_name: string;
  contact_name: string;
  contact_phone: string;
  contact_email: string;
}

export default function BuilderInfo({ boothNumber, isPreviewMode = false }: BuilderInfoProps) {
  const [builderInfo, setBuilderInfo] = useState<BuilderInfoData>({
    builder_name: '',
    contact_name: '',
    contact_phone: '',
    contact_email: ''
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isLocked, setIsLocked] = useState(false);

  const fetchBuilderInfo = async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('builder_info')
        .select('*')
        .eq('booth_number', boothNumber)
        .maybeSingle();
      if (data) {
        setBuilderInfo({
          builder_name: data.builder_name || '',
          contact_name: data.contact_name || '',
          contact_phone: data.contact_phone || '',
          contact_email: data.contact_email || ''
        });
        setIsLocked(true);
      }
    } catch (error) {
      console.error('Error fetching builder info:', error);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (isPreviewMode) {
      setBuilderInfo({
        builder_name: '测试预览',
        contact_name: '测试预览',
        contact_phone: '测试预览',
        contact_email: '测试预览'
      });
      setIsLocked(true);
      setLoading(false);
    } else {
      fetchBuilderInfo();
    }
  }, [boothNumber, isPreviewMode]);

  const handleSubmit = async () => {
    if (isPreviewMode) {
      alert('预览模式下无法保存');
      return;
    }
    if (!builderInfo.builder_name) {
      alert('请填写搭建商名称');
      return;
    }
    setSaving(true);
    try {
      const { data: existing } = await supabase
        .from('builder_info')
        .select('id')
        .eq('booth_number', boothNumber)
        .maybeSingle();

      if (existing) {
        const { error: updateError } = await supabase
          .from('builder_info')
          .update({
            ...builderInfo,
            updated_at: new Date().toISOString()
          })
          .eq('id', existing.id);

        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase
          .from('builder_info')
          .insert({
            ...builderInfo,
            booth_number: boothNumber
          });

        if (insertError) throw insertError;
      }

      setIsLocked(true);
      setSaving(false);
      alert('搭建商信息已保存');
    } catch (error) {
      console.error('保存搭建商信息失败:', error);
      setSaving(false);
      alert('保存失败: ' + (error instanceof Error ? error.message : '未知错误'));
    }
  };

  const handleEdit = () => {
    if (isPreviewMode) {
      alert('预览模式下无法修改');
      return;
    }
    setIsLocked(false);
  };

  if (loading) {
    return <div className="text-center py-8 text-gray-500">加载中...</div>;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-white rounded-xl shadow-sm p-6 ${isLocked ? 'border-l-4 border-green-500' : ''}`}
    >
      {isPreviewMode && (
        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-sm text-yellow-700"><i className="fas fa-eye mr-2"></i>预览模式 - 仅可查看，不可操作</p>
        </div>
      )}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-gray-800">搭建商信息</h3>
        {isLocked && (
          <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
            已提交
          </span>
        )}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">搭建商名称</label>
          <input
            type="text"
            value={builderInfo.builder_name}
            onChange={(e) => setBuilderInfo({ ...builderInfo, builder_name: e.target.value })}
            disabled={isLocked}
            className={`w-full px-3 py-2 border rounded-lg transition-all ${
              isLocked
                ? 'bg-gray-100 text-gray-600 border-gray-200 cursor-not-allowed opacity-70'
                : 'border-gray-300 focus:ring-2 focus:ring-blue-500'
            }`}
            placeholder="请输入搭建商名称"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">联系人</label>
          <input
            type="text"
            value={builderInfo.contact_name}
            onChange={(e) => setBuilderInfo({ ...builderInfo, contact_name: e.target.value })}
            disabled={isLocked}
            className={`w-full px-3 py-2 border rounded-lg transition-all ${
              isLocked
                ? 'bg-gray-100 text-gray-600 border-gray-200 cursor-not-allowed opacity-70'
                : 'border-gray-300 focus:ring-2 focus:ring-blue-500'
            }`}
            placeholder="请输入联系人"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">联系方式</label>
          <input
            type="text"
            value={builderInfo.contact_phone}
            onChange={(e) => setBuilderInfo({ ...builderInfo, contact_phone: e.target.value })}
            disabled={isLocked}
            className={`w-full px-3 py-2 border rounded-lg transition-all ${
              isLocked
                ? 'bg-gray-100 text-gray-600 border-gray-200 cursor-not-allowed opacity-70'
                : 'border-gray-300 focus:ring-2 focus:ring-blue-500'
            }`}
            placeholder="请输入联系方式"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">联系人邮箱</label>
          <input
            type="email"
            value={builderInfo.contact_email}
            onChange={(e) => setBuilderInfo({ ...builderInfo, contact_email: e.target.value })}
            disabled={isLocked}
            className={`w-full px-3 py-2 border rounded-lg transition-all ${
              isLocked
                ? 'bg-gray-100 text-gray-600 border-gray-200 cursor-not-allowed opacity-70'
                : 'border-gray-300 focus:ring-2 focus:ring-blue-500'
            }`}
            placeholder="请输入联系人邮箱"
          />
        </div>
      </div>
      <div className="mt-4">
        {isLocked ? (
          <button
            onClick={handleEdit}
            disabled={isPreviewMode}
            className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50"
          >
            {isPreviewMode ? '预览模式 - 无法修改' : '修改'}
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={saving || isPreviewMode}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {isPreviewMode ? '预览模式 - 无法保存' : saving ? '保存中...' : '确认并提交'}
          </button>
        )}
      </div>
    </motion.div>
  );
}
