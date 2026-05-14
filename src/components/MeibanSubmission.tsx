import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { getSupabaseUrl } from '../supabase/client';

interface MeibanSubmissionProps {
  userId: string;
  isPreviewMode?: boolean;
}

const STORAGE_KEY = 'meiban_draft';

export default function MeibanSubmission({ userId, isPreviewMode = false }: MeibanSubmissionProps) {
  const [companyNameCn, setCompanyNameCn] = useState('');
  const [companyNameEn, setCompanyNameEn] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  // 加载已保存的数据或草稿
  useEffect(() => {
    const loadData = async () => {
      try {
        // 先尝试从服务器加载
        const session = JSON.parse(localStorage.getItem('sb-session') || '{}');
        const accessToken = session.access_token;

        const response = await fetch(`${getSupabaseUrl()}/functions/v1/get-meiban`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: accessToken ? `Bearer ${accessToken}` : '',
          },
          body: JSON.stringify({ userId }),
        });

        if (response.ok) {
          const result = await response.json();
          if (result.success && result.data && result.data.length > 0) {
            const data = result.data[0];
            setCompanyNameCn(data.company_name_cn || '');
            setCompanyNameEn(data.company_name_en || '');
            setSaved(true);
            setLoading(false);
            return;
          }
        }

        // 从本地加载草稿
        const draft = localStorage.getItem(`${STORAGE_KEY}_${userId}`);
        if (draft) {
          const parsed = JSON.parse(draft);
          setCompanyNameCn(parsed.companyNameCn || '');
          setCompanyNameEn(parsed.companyNameEn || '');
        }
      } catch (error) {
        console.error('Error loading meiban data:', error);
      }
      setLoading(false);
    };

    loadData();
  }, [userId]);

  // 自动保存草稿
  useEffect(() => {
    if (!saved && !loading) {
      localStorage.setItem(`${STORAGE_KEY}_${userId}`, JSON.stringify({
        companyNameCn,
        companyNameEn,
      }));
    }
  }, [companyNameCn, companyNameEn, saved, loading, userId]);

  const handleSave = async () => {
    if (isPreviewMode) {
      alert('预览模式下无法保存');
      return;
    }

    if (!companyNameCn.trim()) {
      alert('请输入公司中文全称');
      return;
    }

    setSaving(true);
    try {
      const session = JSON.parse(localStorage.getItem('sb-session') || '{}');
      const accessToken = session.access_token;

      const response = await fetch(`${getSupabaseUrl()}/functions/v1/save-meiban`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: accessToken ? `Bearer ${accessToken}` : '',
        },
        body: JSON.stringify({
          userId,
          companyNameCn: companyNameCn.trim(),
          companyNameEn: companyNameEn.trim(),
        }),
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || '保存失败');
      }

      // 清除草稿
      localStorage.removeItem(`${STORAGE_KEY}_${userId}`);
      setSaved(true);
      alert('楣板资料保存成功');
    } catch (error: any) {
      alert('保存失败: ' + error.message);
    }
    setSaving(false);
  };

  const handleEdit = () => {
    setSaved(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-500">加载中...</div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      {isPreviewMode && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 mb-6">
          <div className="flex items-center gap-2">
            <i className="fas fa-eye text-orange-600"></i>
            <span className="text-orange-800 font-medium">预览模式 - 仅可查看界面，无法进行操作</span>
          </div>
        </div>
      )}

      {saved && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <i className="fas fa-check-circle text-green-600"></i>
              <span className="text-green-800 font-medium">楣板资料已保存</span>
            </div>
            <button
              onClick={handleEdit}
              disabled={isPreviewMode}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm disabled:opacity-50"
            >
              修改
            </button>
          </div>
        </div>
      )}

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-xl shadow-sm border border-gray-200 p-8"
      >
        <h2 className="text-2xl font-bold text-gray-800 text-center mb-8">楣 板 信 息</h2>

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              楣板名称 (中) <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={companyNameCn}
              onChange={(e) => setCompanyNameCn(e.target.value)}
              disabled={saved}
              placeholder="输入公司中文全称"
              maxLength={35}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              楣板名称 (英) <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={companyNameEn}
              onChange={(e) => setCompanyNameEn(e.target.value)}
              disabled={saved}
              placeholder="输入公司英文全称"
              maxLength={60}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
            />
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-sm text-yellow-800">
              <i className="fas fa-info-circle mr-2"></i>
              温馨提示：按照公司名称如实填写。填写规则为35个中文字符，60个大写英文字符。超过截至日期将无法登记。现场将以你的参展信息制作楣板。
            </p>
          </div>

          {!saved && (
            <div className="flex justify-center pt-4">
              <button
                onClick={handleSave}
                disabled={saving || !companyNameCn.trim() || isPreviewMode}
                className="px-12 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                {isPreviewMode ? '预览模式不可保存' : (saving ? '保存中...' : '保存楣板资料')}
              </button>
            </div>
          )}

          {!saved && (
            <div className="text-center text-sm text-gray-500">
              <i className="fas fa-info-circle mr-1"></i>
              您的填写内容会自动保存为草稿
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
