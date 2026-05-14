import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getSupabaseUrl, supabase } from '../supabase/client';
import PaymentNoticeModal from './PaymentNoticeModal';

interface ApplicationItem {
  item: string;
  spec: string;
  quantity: number;
  unit: string;
  price: number;
  deposit: number;
}

interface ApplicationData {
  items: ApplicationItem[];
  confirmed: boolean;
}

interface ApplicationRecord {
  id: string;
  user_id: string;
  booth_id: string;
  category: 'furniture' | 'network' | 'electricity' | 'water' | 'gas';
  content: ApplicationData;
  payment_status: 'unpaid' | 'paid' | 'refunded';
  created_at: string;
  updated_at: string;
  booth?: {
    hall_number: string;
    booth_number: string;
    exhibitor_name: string;
    booth_area?: number;
    booth_height?: number;
  };
  user?: {
    username: string;
    display_name: string;
  };
  hasApplication: boolean;
}

interface BoothApplications {
  user_id: string;
  booth_id: string;
  hall_number: string;
  booth_number: string;
  exhibitor_name: string;
  booth_area?: number;
  booth_height?: number;
  applications: ApplicationRecord[];
  totalCategories: number;
  hasApplicationCategories: number;
  payment_status: 'unpaid' | 'paid' | 'refunded';
}

interface FeeRules {
  management_fee_per_sqm: number;
  deposit_0_50: number;
  deposit_51_100: number;
  deposit_over_100: number;
  height_review_fee: number;
}

interface FixedFeeStatus {
  management_fee: 'unpaid' | 'paid';
  deposit: 'unpaid' | 'paid';
  height_review_fee: 'unpaid' | 'paid';
}

const CATEGORY_LABELS: Record<string, string> = {
  furniture: '家具',
  network: '网络',
  electricity: '电',
  water: '水',
  gas: '气'
};

const PAYMENT_STATUS_LABELS: Record<string, { label: string; color: string }> = {
  unpaid: { label: '未缴费', color: 'bg-red-100 text-red-700' },
  paid: { label: '已缴费', color: 'bg-green-100 text-green-700' },
  refunded: { label: '已退款', color: 'bg-gray-100 text-gray-700' }
};

interface FilterState {
  hallNumber: string;
  boothNumber: string;
  category: string;
  content: string;
  paymentStatus: string;
  dateRange: string;
  showOnlyApplications: boolean;
  heightStatus: string;
}

export default function ApplicationOverview() {
  const [applications, setApplications] = useState<ApplicationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<FilterState>({
    hallNumber: '',
    boothNumber: '',
    category: '',
    content: '',
    paymentStatus: '',
    dateRange: '',
    showOnlyApplications: false,
    heightStatus: ''
  });
  const [selectedBooth, setSelectedBooth] = useState<BoothApplications | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [updatingPayment, setUpdatingPayment] = useState<string | null>(null);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [invoiceInfo, setInvoiceInfo] = useState<any>(null);
  const [loadingInvoice, setLoadingInvoice] = useState(false);
  const [feeRules, setFeeRules] = useState<FeeRules | null>(null);
  const [fixedFeeStatus, setFixedFeeStatus] = useState<FixedFeeStatus>({
    management_fee: 'unpaid',
    deposit: 'unpaid',
    height_review_fee: 'unpaid'
  });
  const [showPaymentNoticeModal, setShowPaymentNoticeModal] = useState(false);

  useEffect(() => {
    fetchFeeRules();
    fetchApplications();
  }, []);

  const fetchFeeRules = async () => {
    const { data } = await supabase.from('fee_rules').select('*').eq('id', 1).maybeSingle();
    if (data) {
      setFeeRules(data as FeeRules);
    }
  };

  const fetchApplications = async () => {
    setLoading(true);
    try {
      const session = JSON.parse(localStorage.getItem('sb-session') || '{}');
      const accessToken = session.access_token;
      const response = await fetch(`${getSupabaseUrl()}/functions/v1/get-applications`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': accessToken ? `Bearer ${accessToken}` : ''
        },
        body: JSON.stringify({ filters })
      });
      if (!response.ok) throw new Error('Failed to fetch applications');
      const result = await response.json();
      if (result.success) setApplications(result.data || []);
    } catch (error) {
      console.error('Error fetching applications:', error);
    }
    setLoading(false);
  };

  const getBoothPaymentStatus = (apps: ApplicationRecord[]): 'unpaid' | 'paid' | 'refunded' => {
    const hasApps = apps.filter(a => a.hasApplication);
    if (hasApps.length === 0) return 'unpaid';
    const allPaid = hasApps.every(a => a.payment_status === 'paid');
    if (allPaid) return 'paid';
    const anyPaid = hasApps.some(a => a.payment_status === 'paid');
    return anyPaid ? 'paid' : 'unpaid';
  };

  const groupedByBooth = useMemo(() => {
    const groups = new Map<string, BoothApplications>();
    applications.forEach(app => {
      const key = `${app.booth?.hall_number}_${app.booth?.booth_number}`;
      if (!groups.has(key)) {
        groups.set(key, {
          user_id: app.user_id,
          booth_id: app.booth_id,
          hall_number: app.booth?.hall_number || '',
          booth_number: app.booth?.booth_number || '',
          exhibitor_name: app.booth?.exhibitor_name || '',
          booth_area: app.booth?.booth_area,
          booth_height: app.booth?.booth_height,
          applications: [],
          totalCategories: 0,
          hasApplicationCategories: 0,
          payment_status: 'unpaid'
        });
      }
      const booth = groups.get(key)!;
      booth.applications.push(app);
      booth.totalCategories++;
      if (app.hasApplication) booth.hasApplicationCategories++;
    });
    groups.forEach(booth => {
      booth.payment_status = getBoothPaymentStatus(booth.applications);
    });
    return Array.from(groups.values());
  }, [applications]);

  const getManagementFee = (area?: number) => {
    if (!area || !feeRules) return 0;
    return area * feeRules.management_fee_per_sqm;
  };

  const getDeposit = (area?: number) => {
    if (!area || !feeRules) return 0;
    if (area <= 50) return feeRules.deposit_0_50;
    if (area <= 100) return feeRules.deposit_51_100;
    return feeRules.deposit_over_100;
  };

  const getHeightReviewFee = (height?: number) => {
    if (!height || !feeRules || height < 4.5) return 0;
    return feeRules.height_review_fee;
  };

  const getTotalAmount = (content: ApplicationData) => {
    if (!content?.items) return 0;
    return content.items.reduce((sum, item) => sum + (item.price * item.quantity) + (item.deposit * item.quantity), 0);
  };

  const getBoothTotalAmount = (booth: BoothApplications) => {
    const appsTotal = booth.applications.filter(a => a.hasApplication).reduce((sum, app) => sum + getTotalAmount(app.content), 0);
    const fixedTotal = getManagementFee(booth.booth_area) + getDeposit(booth.booth_area) + getHeightReviewFee(booth.booth_height);
    return appsTotal + fixedTotal;
  };

  const getBoothPaidAmount = (booth: BoothApplications) => {
    const appsPaid = booth.applications.filter(a => a.hasApplication && a.payment_status === 'paid').reduce((sum, app) => sum + getTotalAmount(app.content), 0);
    const fixedPaid = (fixedFeeStatus.management_fee === 'paid' ? getManagementFee(booth.booth_area) : 0) +
                      (fixedFeeStatus.deposit === 'paid' ? getDeposit(booth.booth_area) : 0) +
                      (fixedFeeStatus.height_review_fee === 'paid' ? getHeightReviewFee(booth.booth_height) : 0);
    return appsPaid + fixedPaid;
  };

  const handleUpdateFixedFeeStatus = (feeType: keyof FixedFeeStatus, status: 'paid' | 'unpaid') => {
    setFixedFeeStatus(prev => ({ ...prev, [feeType]: status }));
  };

  const handleViewInvoice = async (booth: BoothApplications) => {
    setLoadingInvoice(true);
    setShowInvoiceModal(true);
    try {
      const session = JSON.parse(localStorage.getItem('sb-session') || '{}');
      const accessToken = session.access_token;
      const response = await fetch(`${getSupabaseUrl()}/functions/v1/get-invoice-info`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': accessToken ? `Bearer ${accessToken}` : ''
        },
        body: JSON.stringify({ boothId: booth.booth_id, boothNumber: booth.booth_number })
      });
      if (!response.ok) throw new Error('Failed to fetch invoice info');
      const result = await response.json();
      setInvoiceInfo(result.data);
    } catch (error) {
      console.error('Error fetching invoice:', error);
      setInvoiceInfo(null);
    }
    setLoadingInvoice(false);
  };

  const filteredBooths = groupedByBooth.filter(booth => {
    if (filters.hallNumber && booth.hall_number !== filters.hallNumber) return false;
    if (filters.boothNumber && booth.booth_number !== filters.boothNumber) return false;
    if (filters.showOnlyApplications && booth.hasApplicationCategories === 0) return false;
    if (filters.paymentStatus && booth.payment_status !== filters.paymentStatus) return false;
    if (filters.heightStatus) {
      const isHigh = (booth.booth_height || 0) >= 4.5;
      if (filters.heightStatus === 'high' && !isHigh) return false;
      if (filters.heightStatus === 'normal' && isHigh) return false;
    }
    if (filters.category) {
      const hasCategory = booth.applications.some(app => app.hasApplication && app.category === filters.category);
      if (!hasCategory) return false;
    }
    if (filters.dateRange) {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const hasDateMatch = booth.applications.some(app => {
        if (!app.created_at) return false;
        const appDate = new Date(app.created_at);
        if (filters.dateRange === 'today') {
          return appDate >= today;
        } else if (filters.dateRange === 'week') {
          const weekAgo = new Date(today);
          weekAgo.setDate(weekAgo.getDate() - 7);
          return appDate >= weekAgo;
        } else if (filters.dateRange === 'month') {
          const monthAgo = new Date(today);
          monthAgo.setMonth(monthAgo.getMonth() - 1);
          return appDate >= monthAgo;
        }
        return true;
      });
      if (!hasDateMatch) return false;
    }
    return true;
  });

  const uniqueHallNumbers = Array.from(new Set(groupedByBooth.map(b => b.hall_number).filter(Boolean)));
  const uniqueBoothNumbers = Array.from(new Set(groupedByBooth.map(b => b.booth_number).filter(Boolean)));

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-800">申报情况概览</h2>
          <button onClick={fetchApplications} disabled={loading} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50">
            <i className={`fas fa-sync-alt ${loading ? 'fa-spin' : ''}`}></i> 刷新
          </button>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">展馆号</label>
            <select value={filters.hallNumber} onChange={(e) => setFilters({ ...filters, hallNumber: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg">
              <option value="">全部</option>
              {uniqueHallNumbers.map(hall => <option key={hall} value={hall}>{hall}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">展位号</label>
            <select value={filters.boothNumber} onChange={(e) => setFilters({ ...filters, boothNumber: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg">
              <option value="">全部</option>
              {uniqueBoothNumbers.map(booth => <option key={booth} value={booth}>{booth}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">申报类别</label>
            <select value={filters.category} onChange={(e) => setFilters({ ...filters, category: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg">
              <option value="">全部</option>
              <option value="electricity">电</option>
              <option value="furniture">家具</option>
              <option value="network">网络</option>
              <option value="water">水</option>
              <option value="gas">气</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">申报时间</label>
            <select value={filters.dateRange} onChange={(e) => setFilters({ ...filters, dateRange: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg">
              <option value="">全部</option>
              <option value="today">今天</option>
              <option value="week">本周</option>
              <option value="month">本月</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">缴费状态</label>
            <select value={filters.paymentStatus} onChange={(e) => setFilters({ ...filters, paymentStatus: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg">
              <option value="">全部</option>
              <option value="unpaid">未缴费</option>
              <option value="paid">已缴费</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">超高/不超高</label>
            <select value={filters.heightStatus} onChange={(e) => setFilters({ ...filters, heightStatus: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg">
              <option value="">全部</option>
              <option value="high">超高</option>
              <option value="normal">不超高</option>
            </select>
          </div>
          <div className="flex items-end">
            <button
              onClick={() => setFilters({
                hallNumber: '',
                boothNumber: '',
                category: '',
                content: '',
                paymentStatus: '',
                dateRange: '',
                showOnlyApplications: false,
                heightStatus: ''
              })}
              className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors border border-gray-300"
            >
              重置筛选
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {loading ? <div className="p-8 text-center text-gray-500">加载中...</div> : filteredBooths.length === 0 ? <div className="p-8 text-center text-gray-500">暂无记录</div> : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">展馆号</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">展位号</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">展商名称</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">申报类别</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">申报时间</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">缴费状态</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredBooths.map((booth) => (
                  <motion.tr key={`${booth.hall_number}_${booth.booth_number}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-900">{booth.hall_number || '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-900 font-medium">{booth.booth_number || '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">{booth.exhibitor_name || '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {booth.hasApplicationCategories > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {booth.applications
                            .filter(app => app.hasApplication)
                            .map(app => (
                              <span key={app.category} className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-blue-50 text-blue-700 border border-blue-100">
                                {CATEGORY_LABELS[app.category]}
                              </span>
                            ))}
                        </div>
                      ) : '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">{booth.applications.length > 0 && booth.applications[0].created_at ? new Date(booth.applications[0].created_at).toLocaleDateString('zh-CN') : '-'}</td>
                    <td className="px-4 py-3 text-sm">
                      <span className={`inline-flex items-center px-2 py-1 rounded text-xs ${PAYMENT_STATUS_LABELS[booth.payment_status]?.color || 'bg-gray-100'}`}>
                        {PAYMENT_STATUS_LABELS[booth.payment_status]?.label || booth.payment_status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm space-x-1">
                      <button onClick={() => { setSelectedBooth(booth); setShowDetailModal(true); }} className="px-3 py-1.5 bg-blue-600 text-white rounded text-xs hover:bg-blue-700">查看详情</button>
                      <button onClick={() => handleViewInvoice(booth)} className="px-3 py-1.5 bg-green-600 text-white rounded text-xs hover:bg-green-700">查看开票信息</button>
                      <button onClick={() => { setSelectedBooth(booth); setShowPaymentNoticeModal(true); }} className="px-3 py-1.5 bg-purple-600 text-white rounded text-xs hover:bg-purple-700">生成缴费通知单</button>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <AnimatePresence>
        {showDetailModal && selectedBooth && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-gray-800">申报详情 - {selectedBooth.exhibitor_name || selectedBooth.booth_number}</h2>
                  <button onClick={() => setShowDetailModal(false)} className="text-gray-400 hover:text-gray-600"><i className="fas fa-times text-xl"></i></button>
                </div>

                <div className="grid grid-cols-7 gap-4 mb-6 bg-gray-50 p-4 rounded-lg">
                  <div><label className="text-xs text-gray-500">展馆号</label><p className="font-medium">{selectedBooth.hall_number || '-'}</p></div>
                  <div><label className="text-xs text-gray-500">展位号</label><p className="font-medium">{selectedBooth.booth_number || '-'}</p></div>
                  <div><label className="text-xs text-gray-500">展商名称</label><p className="font-medium">{selectedBooth.exhibitor_name || '-'}</p></div>
                  <div><label className="text-xs text-gray-500">展位面积</label><p className="font-medium">{selectedBooth.booth_area ? `${selectedBooth.booth_area}m²` : '-'}</p></div>
                  <div><label className="text-xs text-gray-500">展位高度</label><p className="font-medium">{selectedBooth.booth_height ? `${selectedBooth.booth_height}m` : '-'}</p></div>
                  <div><label className="text-xs text-gray-500">申报类别数</label><p className="font-medium">{selectedBooth.hasApplicationCategories}/5</p></div>
                  <div><label className="text-xs text-gray-500">缴费状态</label><p className="font-medium">{PAYMENT_STATUS_LABELS[selectedBooth.payment_status]?.label}</p></div>
                </div>

                <div className="space-y-6">
                  {selectedBooth.applications.filter(app => app.hasApplication).map((app) => (
                    <div key={app.category} className="border rounded-lg overflow-hidden">
                      <div className="bg-gray-100 px-4 py-3 flex items-center justify-between">
                        <h3 className="font-medium text-gray-800">{CATEGORY_LABELS[app.category]}申报</h3>
                        <div className="flex items-center gap-3">
                          <span className="text-sm text-gray-600">合计: ¥{getTotalAmount(app.content)}</span>
                          <span className={`inline-flex items-center px-2 py-1 rounded text-xs ${PAYMENT_STATUS_LABELS[app.payment_status]?.color || 'bg-gray-100'}`}>{PAYMENT_STATUS_LABELS[app.payment_status]?.label || app.payment_status}</span>
                        </div>
                      </div>
                      <div className="p-4">
                        {app.content?.items && app.content.items.length > 0 ? (
                          <table className="w-full">
                            <thead className="bg-gray-50">
                              <tr>
                                <th className="px-3 py-2 text-left text-xs font-medium text-gray-600">申报物品</th>
                                <th className="px-3 py-2 text-left text-xs font-medium text-gray-600">规格</th>
                                <th className="px-3 py-2 text-left text-xs font-medium text-gray-600">数量</th>
                                <th className="px-3 py-2 text-left text-xs font-medium text-gray-600">单价</th>
                                <th className="px-3 py-2 text-left text-xs font-medium text-gray-600">押金</th>
                                <th className="px-3 py-2 text-left text-xs font-medium text-gray-600">小计</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                              {app.content.items.map((item, index) => (
                                <tr key={index} className="hover:bg-gray-50">
                                  <td className="px-3 py-2 text-sm text-gray-900">{item.item}</td>
                                  <td className="px-3 py-2 text-sm text-gray-600">{item.spec || '-'}</td>
                                  <td className="px-3 py-2 text-sm text-gray-900">{item.quantity} {item.unit}</td>
                                  <td className="px-3 py-2 text-sm text-gray-900">¥{item.price}</td>
                                  <td className="px-3 py-2 text-sm text-gray-900">¥{item.deposit}</td>
                                  <td className="px-3 py-2 text-sm font-medium text-gray-900">¥{(item.price * item.quantity) + (item.deposit * item.quantity)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        ) : (
                          <div className="text-center text-gray-500 py-4">暂无申报物品详情</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-6 border rounded-lg overflow-hidden">
                  <div className="bg-gray-100 px-4 py-3"><h3 className="font-medium text-gray-800">固定费用</h3></div>
                  <div className="p-4 space-y-4">
                    <div className="flex items-center justify-between py-2 border-b">
                      <div>
                        <span className="font-medium text-gray-800">管理费</span>
                        <span className="text-sm text-gray-500 ml-2">({selectedBooth.booth_area || 0}㎡ × ¥{feeRules?.management_fee_per_sqm || 0}/㎡)</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-blue-600">¥{getManagementFee(selectedBooth.booth_area)}</span>
                        <span className={`inline-flex items-center px-2 py-1 rounded text-xs ${PAYMENT_STATUS_LABELS[fixedFeeStatus.management_fee]?.color}`}>{PAYMENT_STATUS_LABELS[fixedFeeStatus.management_fee]?.label}</span>
                        <button onClick={() => handleUpdateFixedFeeStatus('management_fee', fixedFeeStatus.management_fee === 'paid' ? 'unpaid' : 'paid')} className={`px-2 py-1 text-white rounded text-xs ${fixedFeeStatus.management_fee === 'paid' ? 'bg-orange-500 hover:bg-orange-600' : 'bg-green-600 hover:bg-green-700'}`}>{fixedFeeStatus.management_fee === 'paid' ? '撤销缴费' : '标记缴费'}</button>
                      </div>
                    </div>
                    <div className="flex items-center justify-between py-2 border-b">
                      <div>
                        <span className="font-medium text-gray-800">押金</span>
                        <span className="text-sm text-gray-500 ml-2">({selectedBooth.booth_area && selectedBooth.booth_area <= 50 ? '0-50㎡' : selectedBooth.booth_area && selectedBooth.booth_area <= 100 ? '51-100㎡' : '大于100㎡'}档位)</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-blue-600">¥{getDeposit(selectedBooth.booth_area)}</span>
                        <span className={`inline-flex items-center px-2 py-1 rounded text-xs ${PAYMENT_STATUS_LABELS[fixedFeeStatus.deposit]?.color}`}>{PAYMENT_STATUS_LABELS[fixedFeeStatus.deposit]?.label}</span>
                        <button onClick={() => handleUpdateFixedFeeStatus('deposit', fixedFeeStatus.deposit === 'paid' ? 'unpaid' : 'paid')} className={`px-2 py-1 text-white rounded text-xs ${fixedFeeStatus.deposit === 'paid' ? 'bg-orange-500 hover:bg-orange-600' : 'bg-green-600 hover:bg-green-700'}`}>{fixedFeeStatus.deposit === 'paid' ? '撤销缴费' : '标记缴费'}</button>
                      </div>
                    </div>
                    {(selectedBooth.booth_height || 0) >= 4.5 && (
                      <div className="flex items-center justify-between py-2 border-b">
                        <div>
                          <span className="font-medium text-gray-800">超高审图费</span>
                          <span className="text-sm text-gray-500 ml-2">(展位高度≥4.5m)</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-bold text-blue-600">¥{getHeightReviewFee(selectedBooth.booth_height)}</span>
                          <span className={`inline-flex items-center px-2 py-1 rounded text-xs ${PAYMENT_STATUS_LABELS[fixedFeeStatus.height_review_fee]?.color}`}>{PAYMENT_STATUS_LABELS[fixedFeeStatus.height_review_fee]?.label}</span>
                          <button onClick={() => handleUpdateFixedFeeStatus('height_review_fee', fixedFeeStatus.height_review_fee === 'paid' ? 'unpaid' : 'paid')} className={`px-2 py-1 text-white rounded text-xs ${fixedFeeStatus.height_review_fee === 'paid' ? 'bg-orange-500 hover:bg-orange-600' : 'bg-green-600 hover:bg-green-700'}`}>{fixedFeeStatus.height_review_fee === 'paid' ? '撤销缴费' : '标记缴费'}</button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-8">
                      <div className="text-lg font-bold text-gray-800">展位总费用: <span className="text-blue-600">¥{getBoothTotalAmount(selectedBooth)}</span></div>
                      <div className="text-lg font-bold text-gray-800">已缴费额: <span className="text-green-600">¥{getBoothPaidAmount(selectedBooth)}</span></div>
                      <div className="text-lg font-bold text-gray-800">剩余缴费额: <span className="text-red-600">¥{getBoothTotalAmount(selectedBooth) - getBoothPaidAmount(selectedBooth)}</span></div>
                    </div>
                    <button onClick={() => setShowDetailModal(false)} className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300">关闭</button>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showInvoiceModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-gray-800">开票信息</h2>
                  <button onClick={() => setShowInvoiceModal(false)} className="text-gray-400 hover:text-gray-600"><i className="fas fa-times text-xl"></i></button>
                </div>
                {loadingInvoice ? (
                  <div className="p-8 text-center text-gray-500">加载中...</div>
                ) : invoiceInfo ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <label className="text-xs text-gray-500 block mb-1">公司名称</label>
                        <p className="font-medium text-gray-800">{invoiceInfo.company_name || '-'}</p>
                      </div>
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <label className="text-xs text-gray-500 block mb-1">税号</label>
                        <p className="font-medium text-gray-800">{invoiceInfo.tax_id || '-'}</p>
                      </div>
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <label className="text-xs text-gray-500 block mb-1">地址</label>
                        <p className="font-medium text-gray-800">{invoiceInfo.address || '-'}</p>
                      </div>
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <label className="text-xs text-gray-500 block mb-1">电话</label>
                        <p className="font-medium text-gray-800">{invoiceInfo.phone || '-'}</p>
                      </div>
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <label className="text-xs text-gray-500 block mb-1">开户行</label>
                        <p className="font-medium text-gray-800">{invoiceInfo.bank_name || '-'}</p>
                      </div>
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <label className="text-xs text-gray-500 block mb-1">银行账号</label>
                        <p className="font-medium text-gray-800">{invoiceInfo.bank_account || '-'}</p>
                      </div>
                    </div>
                    {invoiceInfo.payment_voucher_url && (
                      <div className="mt-4">
                        <label className="text-xs text-gray-500 block mb-2">付款凭证</label>
                        <a href={invoiceInfo.payment_voucher_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                          <i className="fas fa-file-image mr-2"></i>查看凭证
                        </a>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-8 text-center text-gray-500">
                    <i className="fas fa-inbox text-4xl mb-3 text-gray-300"></i>
                    <p>暂无开票信息</p>
                  </div>
                )}
                <div className="mt-6 pt-4 border-t flex justify-end">
                  <button onClick={() => setShowInvoiceModal(false)} className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300">关闭</button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <PaymentNoticeModal
        isOpen={showPaymentNoticeModal}
        onClose={() => setShowPaymentNoticeModal(false)}
        booth={selectedBooth}
        feeRules={feeRules}
      />
    </div>
  );
}
