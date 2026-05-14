import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '../supabase/client';

interface FeeRules {
  id: number;
  management_fee_per_sqm: number;
  deposit_0_50: number;
  deposit_51_100: number;
  deposit_over_100: number;
  height_review_fee: number;
}

interface FeeRulesConfigProps {
  isAdmin: boolean;
}

export default function FeeRulesConfig({ isAdmin }: FeeRulesConfigProps) {
  const [feeRules, setFeeRules] = useState<FeeRules>({
    id: 1,
    management_fee_per_sqm: 0,
    deposit_0_50: 0,
    deposit_51_100: 0,
    deposit_over_100: 0,
    height_review_fee: 0
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    fetchFeeRules();
  }, []);

  const fetchFeeRules = async () => {
    setLoading(true);
    const { data } = await supabase.from('fee_rules').select('*').eq('id', 1).maybeSingle();
    if (data) {
      setFeeRules(data as FeeRules);
    }
    setLoading(false);
  };

  const handleSave = async () => {
    if (!isAdmin) {
      alert('只有管理员可以修改收费规则');
      return;
    }
    setSaving(true);
    const { error } = await supabase.from('fee_rules').update({
      management_fee_per_sqm: feeRules.management_fee_per_sqm,
      deposit_0_50: feeRules.deposit_0_50,
      deposit_51_100: feeRules.deposit_51_100,
      deposit_over_100: feeRules.deposit_over_100,
      height_review_fee: feeRules.height_review_fee,
      updated_at: new Date().toISOString()
    }).eq('id', 1);
    if (error) {
      alert('保存失败: ' + error.message);
    } else {
      setIsEditing(false);
      alert('收费规则已保存');
    }
    setSaving(false);
  };

  if (loading) {
    return <div className="text-center py-4 text-gray-500">加载中...</div>;
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-xl shadow-sm p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-gray-800">本次展会收费规则配置</h3>
        {isAdmin && (
          <button
            onClick={() => isEditing ? handleSave() : setIsEditing(true)}
            disabled={saving}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {saving ? '保存中...' : isEditing ? '确认保存' : '编辑'}
          </button>
        )}
      </div>

      <div className="space-y-6">
        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="text-sm font-medium text-gray-700 mb-3">管理费配置</h4>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-gray-600">面积 × 管理费单价</span>
            <input
              type="number"
              value={feeRules.management_fee_per_sqm}
              onChange={(e) => setFeeRules({ ...feeRules, management_fee_per_sqm: parseFloat(e.target.value) || 0 })}
              disabled={!isEditing || !isAdmin}
              className="w-24 px-2 py-1 border border-gray-300 rounded text-center disabled:bg-gray-100 disabled:cursor-not-allowed"
              placeholder="单价"
            />
            <span className="text-gray-600">= 展位管理费</span>
          </div>
        </div>

        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="text-sm font-medium text-gray-700 mb-3">押金配置</h4>
          <div className="grid grid-cols-3 gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">0-50㎡</span>
              <input
                type="number"
                value={feeRules.deposit_0_50}
                onChange={(e) => setFeeRules({ ...feeRules, deposit_0_50: parseFloat(e.target.value) || 0 })}
                disabled={!isEditing || !isAdmin}
                className="flex-1 px-2 py-1 border border-gray-300 rounded text-center disabled:bg-gray-100 disabled:cursor-not-allowed"
                placeholder="押金"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">51-100㎡</span>
              <input
                type="number"
                value={feeRules.deposit_51_100}
                onChange={(e) => setFeeRules({ ...feeRules, deposit_51_100: parseFloat(e.target.value) || 0 })}
                disabled={!isEditing || !isAdmin}
                className="flex-1 px-2 py-1 border border-gray-300 rounded text-center disabled:bg-gray-100 disabled:cursor-not-allowed"
                placeholder="押金"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">大于100㎡</span>
              <input
                type="number"
                value={feeRules.deposit_over_100}
                onChange={(e) => setFeeRules({ ...feeRules, deposit_over_100: parseFloat(e.target.value) || 0 })}
                disabled={!isEditing || !isAdmin}
                className="flex-1 px-2 py-1 border border-gray-300 rounded text-center disabled:bg-gray-100 disabled:cursor-not-allowed"
                placeholder="押金"
              />
            </div>
          </div>
        </div>

        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="text-sm font-medium text-gray-700 mb-3">超高审图费</h4>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">展位高度≥4.5m收取</span>
            <input
              type="number"
              value={feeRules.height_review_fee}
              onChange={(e) => setFeeRules({ ...feeRules, height_review_fee: parseFloat(e.target.value) || 0 })}
              disabled={!isEditing || !isAdmin}
              className="w-32 px-2 py-1 border border-gray-300 rounded text-center disabled:bg-gray-100 disabled:cursor-not-allowed"
              placeholder="审图费"
            />
          </div>
        </div>
      </div>
    </motion.div>
  );
}
