import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '../supabase/client';

interface BoothInfoProps {
  boothNumber: string;
  isPreviewMode?: boolean;
}

interface BoothInfoData {
  need_screen: boolean;
  screen_specification: string;
}

export default function BoothInfo({ boothNumber, isPreviewMode = false }: BoothInfoProps) {
  const [boothInfo, setBoothInfo] = useState<BoothInfoData>({
    need_screen: false,
    screen_specification: ''
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isLocked, setIsLocked] = useState(false);

  const fetchBoothInfo = async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('booth_info')
        .select('*')
        .eq('booth_number', boothNumber)
        .maybeSingle();
      if (data) {
        setBoothInfo({
          need_screen: data.need_screen || false,
          screen_specification: data.screen_specification || ''
        });
        setIsLocked(true);
      }
    } catch (error) {
      console.error('Error fetching booth info:', error);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (isPreviewMode) {
      setBoothInfo({
        need_screen: true,
        screen_specification: '测试预览'
      });
      setIsLocked(true);
      setLoading(false);
    } else {
      fetchBoothInfo();
    }
  }, [boothNumber, isPreviewMode]);

  const handleSubmit = async () => {
    if (isPreviewMode) {
      alert('预览模式下无法保存');
      return;
    }
    setSaving(true);
    try {
      const { data: existing } = await supabase
        .from('booth_info')
        .select('id')
        .eq('booth_number', boothNumber)
        .maybeSingle();
      if (existing) {
        await supabase.from('booth_info').update({
          need_screen: boothInfo.need_screen,
          screen_specification: boothInfo.need_screen ? boothInfo.screen_specification : null,
          updated_at: new Date().toISOString()
        }).eq('id', existing.id);
      } else {
        await supabase.from('booth_info').insert({
          booth_number: boothNumber,
          need_screen: boothInfo.need_screen,
          screen_specification: boothInfo.need_screen ? boothInfo.screen_specification : null
        });
      }
      setIsLocked(true);
      alert('展位信息已保存');
    } catch (error) {
      alert('保存失败');
    }
    setSaving(false);
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
      className="bg-white rounded-xl shadow-sm p-6"
    >
      {isPreviewMode && (
        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-sm text-yellow-700"><i className="fas fa-eye mr-2"></i>预览模式 - 仅可查看，不可操作</p>
        </div>
      )}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-gray-800">展位信息</h3>
        {isLocked && (
          <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm">
            已提交
          </span>
        )}
      </div>

      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">电子屏幕需求</label>
          <div className="flex gap-4">
            <button
              onClick={() => !isLocked && setBoothInfo({ ...boothInfo, need_screen: true })}
              disabled={isLocked}
              className={`px-4 py-2 rounded-lg border transition-colors ${
                boothInfo.need_screen
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-700 border-gray-300'
              } ${isLocked ? 'opacity-50 cursor-not-allowed' : 'hover:border-blue-500'}`}
            >
              需要电子屏幕
            </button>
            <button
              onClick={() => !isLocked && setBoothInfo({ ...boothInfo, need_screen: false, screen_specification: '' })}
              disabled={isLocked}
              className={`px-4 py-2 rounded-lg border transition-colors ${
                !boothInfo.need_screen
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-700 border-gray-300'
              } ${isLocked ? 'opacity-50 cursor-not-allowed' : 'hover:border-blue-500'}`}
            >
              不需要电子屏幕
            </button>
          </div>
        </div>

        {boothInfo.need_screen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: isLocked ? 0.6 : 1, height: 'auto' }}
            className="overflow-hidden"
          >
            <label className="block text-sm font-medium text-gray-700 mb-1">屏幕规格描述</label>
            <textarea
              value={boothInfo.screen_specification}
              onChange={(e) => setBoothInfo({ ...boothInfo, screen_specification: e.target.value })}
              placeholder="请输入屏幕规格描述"
              rows={3}
              disabled={isLocked}
              className={`w-full px-3 py-2 border border-gray-300 rounded-lg ${
                isLocked
                  ? 'bg-gray-100 text-gray-500 cursor-not-allowed'
                  : 'focus:ring-2 focus:ring-blue-500'
              }`}
            />
          </motion.div>
        )}

        {isLocked ? (
          <button
            onClick={handleEdit}
            disabled={isPreviewMode}
            className="px-6 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50"
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
