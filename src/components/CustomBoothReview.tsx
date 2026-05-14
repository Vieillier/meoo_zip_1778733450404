import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../supabase/client';
import QualificationReview from './QualificationReview';
import DrawingReview from './DrawingReview';
import { Document, Paragraph, TextRun, Packer, AlignmentType } from 'docx';
import { saveAs } from 'file-saver';

interface BoothRecord {
  id: string;
  user_id: string;
  exhibitor_name: string;
  hall_number: string;
  booth_number: string;
  booth_area: number;
  booth_height: number;
  booth_category: '标摊' | '特装';
  contact_name: string;
  contact_phone: string;
  email: string;
  created_at: string;
  need_screen?: boolean;
  screen_specification?: string;
  builder_name?: string;
  builder_contact_name?: string;
  builder_contact_phone?: string;
  builder_contact_email?: string;
}

interface FilterState {
  hallNumber: string;
  boothNumber: string;
  exhibitorName: string;
  heightType: '' | '不超高' | '超高';
}

export default function CustomBoothReview() {
  const [booths, setBooths] = useState<BoothRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<FilterState>({
    hallNumber: '',
    boothNumber: '',
    exhibitorName: '',
    heightType: ''
  });
  const [selectedBooth, setSelectedBooth] = useState<BoothRecord | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showQualificationModal, setShowQualificationModal] = useState(false);
  const [showDrawingModal, setShowDrawingModal] = useState(false);

  const fetchCustomBooths = async () => {
    setLoading(true);
    try {
      const { data: boothsData, error: boothsError } = await supabase
        .from('exhibitor_booths')
        .select('*')
        .eq('booth_category', '特装')
        .order('created_at', { ascending: false });

      if (boothsError) throw boothsError;

      const boothNumbers = boothsData?.map(b => b.booth_number) || [];
      
      const { data: boothInfoData } = await supabase
        .from('booth_info')
        .select('*')
        .in('booth_number', boothNumbers);

      const { data: builderInfoData } = await supabase
        .from('builder_info')
        .select('*')
        .in('booth_number', boothNumbers);

      const mergedData = boothsData?.map(booth => {
        const boothInfo = boothInfoData?.find(info => info.booth_number === booth.booth_number);
        const builderInfo = builderInfoData?.find(info => info.booth_number === booth.booth_number);
        return {
          ...booth,
          need_screen: boothInfo?.need_screen || false,
          screen_specification: boothInfo?.screen_specification || '',
          builder_name: builderInfo?.builder_name || '',
          builder_contact_name: builderInfo?.contact_name || '',
          builder_contact_phone: builderInfo?.contact_phone || '',
          builder_contact_email: builderInfo?.contact_email || ''
        };
      });

      setBooths(mergedData || []);
    } catch (error) {
      console.error('Error fetching custom booths:', error);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchCustomBooths();
  }, []);

  const getHeightType = (height: number | null | undefined): '不超高' | '超高' | '未填写' => {
    if (height === null || height === undefined) return '未填写';
    return height >= 4.5 ? '超高' : '不超高';
  };

  const filteredBooths = booths.filter(booth => {
    if (filters.hallNumber && booth.hall_number !== filters.hallNumber) return false;
    if (filters.boothNumber && !booth.booth_number?.includes(filters.boothNumber)) return false;
    if (filters.exhibitorName && !booth.exhibitor_name?.toLowerCase().includes(filters.exhibitorName.toLowerCase())) return false;
    if (filters.heightType) {
      const heightType = getHeightType(booth.booth_height);
      if (heightType !== filters.heightType) return false;
    }
    return true;
  });

  const uniqueHallNumbers = Array.from(new Set(booths.map(b => b.hall_number).filter(Boolean)));

  const getHeightTypeBadgeColor = (heightType: string) => {
    if (heightType === '超高') return 'bg-red-100 text-red-700';
    if (heightType === '不超高') return 'bg-green-100 text-green-700';
    return 'bg-gray-100 text-gray-700';
  };

  const generateReviewCertificate = async (booth: BoothRecord) => {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth() + 1;
    const day = today.getDate();
    const dateStr = `${year}年${month}月${day}日`;
    const validStart = `${year}年${month}月${day}日`;
    const validEnd = `${year}年${month + 3}月${day}日`;

    const doc = new Document({
      sections: [{
        properties: {
          page: {
            margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 }
          }
        },
        children: [
          new Paragraph({
            text: 'XXX结构审核意见书',
            alignment: AlignmentType.CENTER,
            spacing: { after: 400 },
            children: [
              new TextRun({
                text: 'XXX结构审核意见书',
                bold: true,
                size: 36
              })
            ]
          }),
          new Paragraph({
            spacing: { after: 200 },
            children: [
              new TextRun({ text: '参展商：', size: 24 }),
              new TextRun({ text: booth.exhibitor_name || '', size: 24 })
            ]
          }),
          new Paragraph({
            spacing: { after: 200 },
            children: [
              new TextRun({ text: '展位号：', size: 24 }),
              new TextRun({ text: booth.booth_number || '', size: 24 })
            ]
          }),
          new Paragraph({
            spacing: { after: 200 },
            children: [
              new TextRun({ text: '搭建商：', size: 24 }),
              new TextRun({ text: booth.builder_name || '', size: 24 })
            ]
          }),
          new Paragraph({
            spacing: { after: 200 },
            children: [
              new TextRun({ text: '展台类型：□室内     □室外      □单层      双层', size: 24 })
            ]
          }),
          new Paragraph({
            spacing: { after: 300 },
            children: [
              new TextRun({
                text: `该展台提供的终版审核资料（设计图纸、说明文案等）经具备中华人民共和国一级注册结构工程师资质的人员审核，各项结构数据均符合相关结构设计标准及大会相关要求。请严格依照审核后的图纸及相关设计要求完成搭建工作。在搭建过程中若发现结构安全性问题或与审核资料不符的情况，我司有权停止施工，并提出整改意见。`,
                size: 22
              })
            ]
          }),
          new Paragraph({
            spacing: { after: 400 },
            children: [
              new TextRun({
                text: `该审核意见书有效期：${validStart}至${validEnd}。`,
                size: 22
              })
            ]
          }),
          new Paragraph({
            alignment: AlignmentType.RIGHT,
            spacing: { before: 600, after: 100 },
            children: [
              new TextRun({ text: '审图公司盖章', size: 24 })
            ]
          }),
          new Paragraph({
            alignment: AlignmentType.RIGHT,
            children: [
              new TextRun({ text: dateStr, size: 24 })
            ]
          })
        ]
      }]
    });

    const blob = await Packer.toBlob(doc);
    saveAs(blob, `审图通过证_${booth.booth_number}_${booth.exhibitor_name}.docx`);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-xl font-bold text-gray-800 mb-4">特装展位审图</h2>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">展馆号</label>
            <select
              value={filters.hallNumber}
              onChange={(e) => setFilters({ ...filters, hallNumber: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">全部</option>
              {uniqueHallNumbers.map(hall => (
                <option key={hall} value={hall}>{hall}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">展位号</label>
            <input
              type="text"
              value={filters.boothNumber}
              onChange={(e) => setFilters({ ...filters, boothNumber: e.target.value })}
              placeholder="输入展位号"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">展商名称</label>
            <input
              type="text"
              value={filters.exhibitorName}
              onChange={(e) => setFilters({ ...filters, exhibitorName: e.target.value })}
              placeholder="搜索展商..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">展位高度类型</label>
            <select
              value={filters.heightType}
              onChange={(e) => setFilters({ ...filters, heightType: e.target.value as '' | '不超高' | '超高' })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">全部</option>
              <option value="不超高">不超高（&lt;4.5米）</option>
              <option value="超高">超高（&ge;4.5米）</option>
            </select>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setFilters({
              hallNumber: '',
              boothNumber: '',
              exhibitorName: '',
              heightType: ''
            })}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            重置筛选
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">加载中...</div>
        ) : filteredBooths.length === 0 ? (
          <div className="p-8 text-center text-gray-500">暂无特装展位记录</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">展馆号</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">展位号</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">展商名称</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">展位面积</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">高度类型</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">联系人</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">联系电话</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredBooths.map((booth) => {
                  const heightType = getHeightType(booth.booth_height);
                  return (
                    <motion.tr
                      key={booth.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="hover:bg-gray-50"
                    >
                      <td className="px-4 py-3 text-sm text-gray-900">{booth.hall_number || '-'}</td>
                      <td className="px-4 py-3 text-sm text-gray-900 font-medium">{booth.booth_number || '-'}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{booth.exhibitor_name || '-'}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {booth.booth_area ? `${booth.booth_area} m²` : '-'}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span className={`inline-flex items-center px-2 py-1 rounded text-xs ${getHeightTypeBadgeColor(heightType)}`}>
                          {heightType}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">{booth.contact_name || '-'}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{booth.contact_phone || '-'}</td>
                      <td className="px-4 py-3 text-sm space-x-2">
                        <button
                          onClick={() => { setSelectedBooth(booth); setShowDetailModal(true); }}
                          className="px-3 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700 transition-colors"
                        >
                          查看详情
                        </button>
                        <button
                          onClick={() => { setSelectedBooth(booth); setShowQualificationModal(true); }}
                          className="px-3 py-1 bg-purple-600 text-white rounded text-xs hover:bg-purple-700 transition-colors"
                        >
                          资质审核
                        </button>
                        <button
                          onClick={() => { setSelectedBooth(booth); setShowDrawingModal(true); }}
                          className="px-3 py-1 bg-orange-600 text-white rounded text-xs hover:bg-orange-700 transition-colors"
                        >
                          图纸审核
                        </button>
                        <button
                          onClick={() => generateReviewCertificate(booth)}
                          className="px-3 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700 transition-colors"
                        >
                          下载审图通过证
                        </button>
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <AnimatePresence>
        {showDetailModal && selectedBooth && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-gray-800">特装展位详情</h2>
                  <button
                    onClick={() => setShowDetailModal(false)}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <i className="fas fa-times text-xl"></i>
                  </button>
                </div>

                <div className="space-y-6">
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 uppercase mb-3">基础信息</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <label className="text-xs text-gray-500 uppercase">展商名称</label>
                        <p className="text-lg font-semibold text-gray-800">{selectedBooth.exhibitor_name || '-'}</p>
                      </div>
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <label className="text-xs text-gray-500 uppercase">展馆号</label>
                        <p className="text-lg font-semibold text-gray-800">{selectedBooth.hall_number || '-'}</p>
                      </div>
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <label className="text-xs text-gray-500 uppercase">展位号</label>
                        <p className="text-lg font-semibold text-blue-600">{selectedBooth.booth_number || '-'}</p>
                      </div>
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <label className="text-xs text-gray-500 uppercase">展位面积</label>
                        <p className="text-lg font-semibold text-gray-800">
                          {selectedBooth.booth_area ? `${selectedBooth.booth_area} m²` : '-'}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm font-medium text-gray-500 uppercase mb-3">展位信息</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <label className="text-xs text-gray-500 uppercase">高度类型</label>
                        <p className="text-lg font-semibold">
                          <span className={`inline-flex items-center px-2 py-1 rounded text-sm ${getHeightTypeBadgeColor(getHeightType(selectedBooth.booth_height))}`}>
                            {getHeightType(selectedBooth.booth_height)}
                          </span>
                        </p>
                      </div>
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <label className="text-xs text-gray-500 uppercase">展位高度</label>
                        <p className="text-lg font-semibold text-gray-800">
                          {selectedBooth.booth_height ? `${selectedBooth.booth_height} m` : '-'}
                        </p>
                      </div>
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <label className="text-xs text-gray-500 uppercase">电子屏幕需求</label>
                        <p className="text-lg font-semibold text-gray-800">
                          {selectedBooth.need_screen ? '需要' : '不需要'}
                        </p>
                      </div>
                      {selectedBooth.need_screen && selectedBooth.screen_specification && (
                        <div className="bg-gray-50 p-4 rounded-lg">
                          <label className="text-xs text-gray-500 uppercase">屏幕规格</label>
                          <p className="text-lg font-semibold text-gray-800">{selectedBooth.screen_specification}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm font-medium text-gray-500 uppercase mb-3">搭建商信息</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <label className="text-xs text-gray-500 uppercase">搭建商名称</label>
                        <p className="text-lg font-semibold text-gray-800">{selectedBooth.builder_name || '-'}</p>
                      </div>
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <label className="text-xs text-gray-500 uppercase">联系人</label>
                        <p className="text-lg font-semibold text-gray-800">{selectedBooth.builder_contact_name || '-'}</p>
                      </div>
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <label className="text-xs text-gray-500 uppercase">联系电话</label>
                        <p className="text-lg font-semibold text-gray-800">{selectedBooth.builder_contact_phone || '-'}</p>
                      </div>
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <label className="text-xs text-gray-500 uppercase">联系邮箱</label>
                        <p className="text-lg font-semibold text-gray-800">{selectedBooth.builder_contact_email || '-'}</p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm font-medium text-gray-500 uppercase mb-3">联系人信息</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <label className="text-xs text-gray-500 uppercase">联系人</label>
                        <p className="text-lg font-semibold text-gray-800">{selectedBooth.contact_name || '-'}</p>
                      </div>
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <label className="text-xs text-gray-500 uppercase">联系电话</label>
                        <p className="text-lg font-semibold text-gray-800">{selectedBooth.contact_phone || '-'}</p>
                      </div>
                      <div className="bg-gray-50 p-4 rounded-lg col-span-2">
                        <label className="text-xs text-gray-500 uppercase">联系邮箱</label>
                        <p className="text-lg font-semibold text-gray-800">{selectedBooth.email || '-'}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end mt-6">
                  <button
                    onClick={() => setShowDetailModal(false)}
                    className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                  >
                    关闭
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showQualificationModal && selectedBooth && (
          <QualificationReview
            boothNumber={selectedBooth.booth_number}
            exhibitorName={selectedBooth.exhibitor_name}
            onClose={() => setShowQualificationModal(false)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showDrawingModal && selectedBooth && (
          <DrawingReview
            boothNumber={selectedBooth.booth_number}
            exhibitorName={selectedBooth.exhibitor_name}
            onClose={() => setShowDrawingModal(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
