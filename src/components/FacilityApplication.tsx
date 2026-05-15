import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  FURNITURE_DATA,
  NETWORK_DATA,
  ELECTRICITY_DATA,
  WATER_DATA,
  GAS_DATA,
  CATEGORY_LABELS,
  ApplicationItem,
  ApplicationData,
} from '../constants/facilityData';
import { getSupabaseUrl, getAuthAccessToken } from '../supabase/client';

interface FacilityTableProps {
  title: string;
  data: { item: string; spec: string; unit: string; price: number; deposit: number }[];
  items: ApplicationItem[];
  onChange: (items: ApplicationItem[]) => void;
  confirmed: boolean;
  onConfirm: () => void;
  onDecline: () => void;
  readOnly?: boolean;
}

function FacilityTable({
  title,
  data,
  items,
  onChange,
  confirmed,
  onConfirm,
  onDecline,
  readOnly = false,
}: FacilityTableProps) {
  const handleQuantityChange = (index: number, quantity: number) => {
    if (readOnly || confirmed) return;
    const newItems = [...items];
    const item = data[index];
    const existingIndex = newItems.findIndex((i) => i.item === item.item);

    if (quantity > 0) {
      if (existingIndex >= 0) {
        newItems[existingIndex].quantity = quantity;
      } else {
        newItems.push({
          item: item.item,
          spec: item.spec,
          unit: item.unit,
          price: item.price,
          deposit: item.deposit,
          quantity,
        });
      }
    } else if (existingIndex >= 0) {
      newItems.splice(existingIndex, 1);
    }

    onChange(newItems);
  };

  const getQuantity = (itemName: string) => {
    const item = items.find((i) => i.item === itemName);
    return item?.quantity || 0;
  };

  const totalAmount = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const totalDeposit = items.reduce((sum, item) => sum + item.deposit * item.quantity, 0);

  if (confirmed) {
    return (
      <div className="bg-gray-50 rounded-xl p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-800">{title}</h3>
          <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm">已确认</span>
        </div>
        {items.length > 0 ? (
          <div className="space-y-2">
            {items.map((item) => (
              <div key={item.item} className="flex justify-between text-sm">
                <span>{item.item} x {item.quantity}</span>
                <span className="text-gray-600">¥{item.price * item.quantity}</span>
              </div>
            ))}
            <div className="border-t pt-2 mt-2 flex justify-between font-semibold">
              <span>合计</span>
              <span>¥{totalAmount} (押金: ¥{totalDeposit})</span>
            </div>
          </div>
        ) : (
          <p className="text-gray-500">不申报</p>
        )}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
      <h3 className="text-lg font-bold text-gray-800 mb-4">{title}</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-3 py-2 text-left font-medium text-gray-700">费用项目</th>
              <th className="px-3 py-2 text-left font-medium text-gray-700">规格</th>
              <th className="px-3 py-2 text-left font-medium text-gray-700">单位</th>
              <th className="px-3 py-2 text-left font-medium text-gray-700">单价</th>
              <th className="px-3 py-2 text-left font-medium text-gray-700">押金</th>
              <th className="px-3 py-2 text-left font-medium text-gray-700">申报数量</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {data.map((item, index) => (
              <tr key={item.item} className="hover:bg-gray-50">
                <td className="px-3 py-2 text-gray-900">{item.item}</td>
                <td className="px-3 py-2 text-gray-600">{item.spec}</td>
                <td className="px-3 py-2 text-gray-600">{item.unit}</td>
                <td className="px-3 py-2 text-gray-900">¥{item.price}</td>
                <td className="px-3 py-2 text-gray-600">¥{item.deposit}</td>
                <td className="px-3 py-2">
                  <input
                    type="number"
                    min="0"
                    value={getQuantity(item.item)}
                    onChange={(e) => handleQuantityChange(index, parseInt(e.target.value) || 0)}
                    className="w-20 px-2 py-1 border border-gray-300 rounded text-center"
                    disabled={readOnly}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex justify-end mt-4 pt-4 border-t">
        <span className="text-lg font-semibold">小计: ¥{totalAmount} (押金: ¥{totalDeposit})</span>
      </div>
      <div className="flex justify-center gap-4 mt-6">
        <button
          onClick={onConfirm}
          disabled={readOnly}
          className="px-8 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
        >
          确认
        </button>
        <button
          onClick={onDecline}
          disabled={readOnly}
          className="px-8 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors disabled:opacity-50"
        >
          不申报
        </button>
      </div>
    </div>
  );
}

interface FacilityApplicationProps {
  userId: string;
  exhibitorName?: string;
  hallNumber?: string;
  boothNumber?: string;
  onSubmit: () => void;
  isPreviewMode?: boolean;
}

const STORAGE_KEY = 'facility_application_draft';

export default function FacilityApplication({ userId, exhibitorName, hallNumber, boothNumber, onSubmit, isPreviewMode = false }: FacilityApplicationProps) {
  const [applications, setApplications] = useState<Record<string, ApplicationData>>({
    furniture: { category: 'furniture', items: [], confirmed: false },
    network: { category: 'network', items: [], confirmed: false },
    electricity: { category: 'electricity', items: [], confirmed: false },
    water: { category: 'water', items: [], confirmed: false },
    gas: { category: 'gas', items: [], confirmed: false },
  });
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitted, setSubmitted] = useState(false);

  // 从 localStorage 加载草稿
  const loadDraft = useCallback(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY}_${userId}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        setApplications(parsed);
      }
    } catch (error) {
      console.error('Error loading draft:', error);
    }
  }, [userId]);

  // 保存到 localStorage
  const saveDraft = useCallback(() => {
    try {
      localStorage.setItem(`${STORAGE_KEY}_${userId}`, JSON.stringify(applications));
    } catch (error) {
      console.error('Error saving draft:', error);
    }
  }, [applications, userId]);

  // 检查是否已提交过
  const checkExistingApplications = useCallback(async () => {
    try {
      const accessToken = await getAuthAccessToken();

      const response = await fetch(`${getSupabaseUrl()}/functions/v1/get-applications`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': accessToken ? `Bearer ${accessToken}` : ''
        },
        body: JSON.stringify({
          filters: { showOnlyApplications: true }
        })
      });

      if (!response.ok) {
        throw new Error('Failed to fetch applications');
      }

      const result = await response.json();
      if (result.success && result.data) {
        // 过滤出当前用户的申报记录
        const userApps = result.data.filter((app: any) => app.user_id === userId && app.hasApplication);
        if (userApps.length > 0) {
          setSubmitted(true);
          // 加载已提交的数据
          const loadedApps: Record<string, ApplicationData> = {
            furniture: { category: 'furniture', items: [], confirmed: true },
            network: { category: 'network', items: [], confirmed: true },
            electricity: { category: 'electricity', items: [], confirmed: true },
            water: { category: 'water', items: [], confirmed: true },
            gas: { category: 'gas', items: [], confirmed: true },
          };
          userApps.forEach((app: any) => {
            if (loadedApps[app.category]) {
              loadedApps[app.category].items = app.content?.items || [];
              loadedApps[app.category].confirmed = true;
            }
          });
          setApplications(loadedApps);
        }
      }
    } catch (error) {
      console.error('Error checking existing applications:', error);
    }
  }, [userId]);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await checkExistingApplications();
      if (!submitted) {
        loadDraft();
      }
      setLoading(false);
    };
    init();
  }, [checkExistingApplications, loadDraft, submitted]);

  // 自动保存草稿
  useEffect(() => {
    if (!submitted && !loading) {
      saveDraft();
    }
  }, [applications, saveDraft, submitted, loading]);

  const updateApplication = (category: string, items: ApplicationItem[]) => {
    if (submitted) return;
    setApplications((prev) => ({
      ...prev,
      [category]: { ...prev[category], items },
    }));
  };

  const confirmApplication = (category: string) => {
    if (submitted) return;
    setApplications((prev) => ({
      ...prev,
      [category]: { ...prev[category], confirmed: true },
    }));
  };

  const declineApplication = (category: string) => {
    if (submitted) return;
    setApplications((prev) => ({
      ...prev,
      [category]: { ...prev[category], items: [], confirmed: true },
    }));
  };

  const allConfirmed = Object.values(applications).every((app) => app.confirmed);

  const handleSubmit = async () => {
    if (isPreviewMode) {
      alert('预览模式下无法提交申报');
      return;
    }

    if (!allConfirmed) {
      alert('请先确认所有申报区域');
      return;
    }

    setSubmitting(true);
    try {
      const accessToken = await getAuthAccessToken();

      const applicationsToSubmit = Object.values(applications)
        .filter((app) => app.items.length > 0)
        .map((app) => ({
          category: app.category,
          content: { items: app.items, confirmed: true },
          status: 'submitted',
        }));

      if (applicationsToSubmit.length === 0) {
        // 即使没有申报内容，也提交空记录表示已确认
        const emptySubmit = Object.values(applications).map((app) => ({
          category: app.category,
          content: { items: [], confirmed: true },
          status: 'submitted',
        }));

        const response = await fetch(`${getSupabaseUrl()}/functions/v1/submit-application`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: accessToken ? `Bearer ${accessToken}` : '',
          },
          body: JSON.stringify({
            applications: emptySubmit,
            userId,
          }),
        });

        if (!response.ok) {
          const result = await response.json();
          throw new Error(result.error || '提交失败');
        }
      } else {
        const response = await fetch(`${getSupabaseUrl()}/functions/v1/submit-application`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: accessToken ? `Bearer ${accessToken}` : '',
          },
          body: JSON.stringify({
            applications: applicationsToSubmit,
            userId,
          }),
        });

        if (!response.ok) {
          const result = await response.json();
          throw new Error(result.error || '提交失败');
        }
      }

      // 清除草稿
      localStorage.removeItem(`${STORAGE_KEY}_${userId}`);
      setSubmitted(true);
      alert('申报提交成功');
      onSubmit();
    } catch (error: any) {
      alert('提交失败: ' + error.message);
    }
    setSubmitting(false);
  };

  const handleReset = async () => {
    if (isPreviewMode) {
      alert('预览模式下无法重置申报');
      return;
    }

    if (!confirm('确定要重新填写申报吗？这将删除您已提交的所有申报记录，且无法恢复。')) return;

    setSubmitting(true);
    try {
      const accessToken = await getAuthAccessToken();

      // 调用 Edge Function 删除数据库中的申报记录
      const response = await fetch(`${getSupabaseUrl()}/functions/v1/delete-applications`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: accessToken ? `Bearer ${accessToken}` : '',
        },
        body: JSON.stringify({ userId }),
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || '删除失败');
      }

      // 清除 localStorage 中的草稿
      localStorage.removeItem(`${STORAGE_KEY}_${userId}`);

      // 重置状态
      setSubmitted(false);
      const resetApps: Record<string, ApplicationData> = {
        furniture: { category: 'furniture', items: [], confirmed: false },
        network: { category: 'network', items: [], confirmed: false },
        electricity: { category: 'electricity', items: [], confirmed: false },
        water: { category: 'water', items: [], confirmed: false },
        gas: { category: 'gas', items: [], confirmed: false },
      };
      setApplications(resetApps);

      alert('申报记录已清除，请重新填写');
    } catch (error: any) {
      alert('重置失败: ' + error.message);
    }
    setSubmitting(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-500">加载中...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {isPreviewMode && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 mb-6">
          <div className="flex items-center gap-2">
            <i className="fas fa-eye text-orange-600"></i>
            <span className="text-orange-800 font-medium">预览模式 - 仅可查看界面，无法进行操作</span>
          </div>
        </div>
      )}

      {submitted && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <i className="fas fa-check-circle text-green-600"></i>
              <span className="text-green-800 font-medium">您已完成设施申报</span>
            </div>
            <button
              onClick={handleReset}
              disabled={isPreviewMode}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm disabled:opacity-50"
            >
              重新填写
            </button>
          </div>
        </div>
      )}

      <FacilityTable
        title="展具申请"
        data={FURNITURE_DATA}
        items={applications.furniture.items}
        onChange={(items) => updateApplication('furniture', items)}
        confirmed={applications.furniture.confirmed}
        onConfirm={() => confirmApplication('furniture')}
        onDecline={() => declineApplication('furniture')}
        readOnly={submitted}
      />

      <FacilityTable
        title="网点申请"
        data={NETWORK_DATA}
        items={applications.network.items}
        onChange={(items) => updateApplication('network', items)}
        confirmed={applications.network.confirmed}
        onConfirm={() => confirmApplication('network')}
        onDecline={() => declineApplication('network')}
        readOnly={submitted}
      />

      <FacilityTable
        title="用电申请"
        data={ELECTRICITY_DATA}
        items={applications.electricity.items}
        onChange={(items) => updateApplication('electricity', items)}
        confirmed={applications.electricity.confirmed}
        onConfirm={() => confirmApplication('electricity')}
        onDecline={() => declineApplication('electricity')}
        readOnly={submitted}
      />

      <FacilityTable
        title="用水申请"
        data={WATER_DATA}
        items={applications.water.items}
        onChange={(items) => updateApplication('water', items)}
        confirmed={applications.water.confirmed}
        onConfirm={() => confirmApplication('water')}
        onDecline={() => declineApplication('water')}
        readOnly={submitted}
      />

      <FacilityTable
        title="用气申请"
        data={GAS_DATA}
        items={applications.gas.items}
        onChange={(items) => updateApplication('gas', items)}
        confirmed={applications.gas.confirmed}
        onConfirm={() => confirmApplication('gas')}
        onDecline={() => declineApplication('gas')}
        readOnly={submitted}
      />

      {!submitted && (
        <div className="flex justify-center pt-6">
          <button
            onClick={handleSubmit}
            disabled={!allConfirmed || submitting || isPreviewMode}
            className={`px-12 py-3 rounded-lg font-medium transition-colors ${
              allConfirmed && !isPreviewMode
                ? 'bg-green-600 text-white hover:bg-green-700'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            {isPreviewMode ? '预览模式不可提交' : (submitting ? '提交中...' : '提交申报')}
          </button>
        </div>
      )}

      {!submitted && (
        <div className="text-center text-sm text-gray-500 mt-4">
          <i className="fas fa-info-circle mr-1"></i>
          您的填写内容会自动保存，切换页面后不会丢失
        </div>
      )}
    </div>
  );
}
