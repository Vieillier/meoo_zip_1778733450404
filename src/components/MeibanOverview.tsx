import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import * as XLSX from 'xlsx';
import { getSupabaseUrl, getAuthHeaders } from '../supabase/client';

interface MeibanRecord {
  id: string;
  user_id: string;
  company_name_cn: string;
  company_name_en: string;
  created_at: string;
  booth?: {
    hall_number: string;
    booth_number: string;
    exhibitor_name: string;
  };
}

interface FilterState {
  hallNumber: string;
  boothNumber: string;
}

export default function MeibanOverview() {
  const [records, setRecords] = useState<MeibanRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<FilterState>({
    hallNumber: '',
    boothNumber: '',
  });

  const fetchRecords = async () => {
    setLoading(true);
    try {
      const headers = await getAuthHeaders();

      const response = await fetch(`${getSupabaseUrl()}/functions/v1/get-meiban`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ filters: {} }),
      });

      if (!response.ok) throw new Error('Failed to fetch');
      const result = await response.json();
      if (result.success) setRecords(result.data || []);
    } catch (error) {
      console.error('Error:', error);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchRecords();
  }, []);

  const filteredRecords = records.filter((r) => {
    if (filters.hallNumber && r.booth?.hall_number !== filters.hallNumber) return false;
    if (filters.boothNumber && r.booth?.booth_number !== filters.boothNumber) return false;
    return true;
  });

  const uniqueHallNumbers = Array.from(new Set(records.map((r) => r.booth?.hall_number).filter(Boolean)));
  const uniqueBoothNumbers = Array.from(new Set(records.map((r) => r.booth?.booth_number).filter(Boolean)));

  const handleExport = () => {
    const data = filteredRecords.map((r) => ({
      展馆号: r.booth?.hall_number || '-',
      展位号: r.booth?.booth_number || '-',
      展商名称: r.booth?.exhibitor_name || '-',
      楣板中文: r.company_name_cn,
      楣板英文: r.company_name_en || '-',
      提交时间: new Date(r.created_at).toLocaleString('zh-CN'),
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '楣板信息');
    XLSX.writeFile(wb, `楣板信息_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-800">楣板信息</h2>
          <div className="flex gap-2">
            <button
              onClick={fetchRecords}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {loading ? '刷新中...' : '刷新'}
            </button>
            <button
              onClick={handleExport}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              导出Excel
            </button>
          </div>
        </div>

        <div className="flex gap-4 mb-4">
          <select
            value={filters.hallNumber}
            onChange={(e) => setFilters({ ...filters, hallNumber: e.target.value })}
            className="px-3 py-2 border border-gray-300 rounded-lg"
          >
            <option value="">全部展馆</option>
            {uniqueHallNumbers.map((h) => (
              <option key={h} value={h}>{h}</option>
            ))}
          </select>
          <select
            value={filters.boothNumber}
            onChange={(e) => setFilters({ ...filters, boothNumber: e.target.value })}
            className="px-3 py-2 border border-gray-300 rounded-lg"
          >
            <option value="">全部展位</option>
            {uniqueBoothNumbers.map((b) => (
              <option key={b} value={b}>{b}</option>
            ))}
          </select>
          <button
            onClick={() => setFilters({ hallNumber: '', boothNumber: '' })}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
          >
            重置
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">加载中...</div>
        ) : filteredRecords.length === 0 ? (
          <div className="p-8 text-center text-gray-500">暂无记录</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">展馆号</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">展位号</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">展商名称</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">楣板中文</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">楣板英文</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">提交时间</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredRecords.map((r) => (
                  <motion.tr key={r.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm">{r.booth?.hall_number || '-'}</td>
                    <td className="px-4 py-3 text-sm font-medium">{r.booth?.booth_number || '-'}</td>
                    <td className="px-4 py-3 text-sm">{r.booth?.exhibitor_name || '-'}</td>
                    <td className="px-4 py-3 text-sm">{r.company_name_cn}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{r.company_name_en || '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{new Date(r.created_at).toLocaleString('zh-CN')}</td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
