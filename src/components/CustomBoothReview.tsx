import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../supabase/client';
import QualificationReview from './QualificationReview';
import DrawingReview from './DrawingReview';
import { saveAs } from 'file-saver';
import JSZip from 'jszip';

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
  submitted_at?: string | null;
  qualification_review_status?: '待审' | '已通过' | '未通过' | '-';
  drawing_review_status?: '待审' | '已通过' | '未通过' | '-';
}

type ReviewStatusFilter = '' | '待审' | '已通过' | '未通过' | '-';

interface FilterState {
  hallNumber: string;
  boothNumber: string;
  exhibitorName: string;
  heightType: '' | '不超高' | '超高';
  sortByTime: '' | 'asc' | 'desc';
  qualificationStatus: ReviewStatusFilter;
  drawingStatus: ReviewStatusFilter;
}

export default function CustomBoothReview() {
  const [booths, setBooths] = useState<BoothRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<FilterState>({
    hallNumber: '',
    boothNumber: '',
    exhibitorName: '',
    heightType: '',
    sortByTime: '',
    qualificationStatus: '',
    drawingStatus: ''
  });
  const [selectedBooth, setSelectedBooth] = useState<BoothRecord | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showQualificationModal, setShowQualificationModal] = useState(false);
  const [showDrawingModal, setShowDrawingModal] = useState(false);
  const [hallNumberDropdown, setHallNumberDropdown] = useState(false);
  const [heightTypeDropdown, setHeightTypeDropdown] = useState(false);
  const [submitTimeDropdown, setSubmitTimeDropdown] = useState(false);
  const [qualificationStatusDropdown, setQualificationStatusDropdown] = useState(false);
  const [drawingStatusDropdown, setDrawingStatusDropdown] = useState(false);

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

      if (boothNumbers.length === 0) {
        setBooths([]);
        setLoading(false);
        return;
      }

      // 并行查询，减少等待时间
      const [boothInfoResult, builderInfoResult, drawingDocsResult, qualificationDocsResult] = await Promise.all([
        supabase.from('booth_info').select('booth_number, need_screen, screen_specification').in('booth_number', boothNumbers),
        supabase.from('builder_info').select('booth_number, builder_name, contact_name, contact_phone, contact_email').in('booth_number', boothNumbers),
        supabase.from('drawing_documents').select('booth_number, submitted_at, is_submitted, last_reviewed_at, effect_drawing_urls, effect_drawing_status, elevation_grid_drawing_status, plan_drawing_status, structure_drawing_status, material_drawing_status, electrical_system_drawing_status, utility_position_drawing_status, fire_facility_drawing_status').in('booth_number', boothNumbers),
        supabase.from('qualification_documents').select('booth_number, is_submitted, last_reviewed_at, business_license_urls, business_license_status, application_letter_status, entrustment_letter_status, safety_responsibility_status, volume_commitment_status, violation_handling_status, insurance_policy_status, equipment_rental_status, electrician_certificate_status').in('booth_number', boothNumbers)
      ]);

      const boothInfoData = boothInfoResult.data;
      const builderInfoData = builderInfoResult.data;
      const drawingDocsData = drawingDocsResult.data;
      const qualificationDocsData = qualificationDocsResult.data;

      const getQualificationReviewStatus = (qualDoc: any): '待审' | '已通过' | '未通过' | '-' => {
        if (!qualDoc) return '-';
        // 检查是否有上传文件（至少有一个 urls 字段非空）
        const hasUploads = qualDoc.business_license_urls?.length > 0;
        if (!hasUploads) return '-';
        // 所有状态字段
        const statuses = [
          qualDoc.business_license_status, qualDoc.application_letter_status,
          qualDoc.entrustment_letter_status, qualDoc.safety_responsibility_status,
          qualDoc.volume_commitment_status, qualDoc.violation_handling_status,
          qualDoc.insurance_policy_status, qualDoc.equipment_rental_status,
          qualDoc.electrician_certificate_status
        ];
        const allApproved = statuses.every(s => s === 'approved');
        if (allApproved) return '已通过';
        // 审图员从未提交过审核意见
        if (!qualDoc.last_reviewed_at) return '待审';
        return '未通过';
      };

      const getDrawingReviewStatus = (drawDoc: any): '待审' | '已通过' | '未通过' | '-' => {
        if (!drawDoc) return '-';
        // 检查是否有上传文件
        const hasUploads = drawDoc.effect_drawing_urls?.length > 0;
        if (!hasUploads) return '-';
        // 所有状态字段
        const statuses = [
          drawDoc.effect_drawing_status, drawDoc.elevation_grid_drawing_status,
          drawDoc.plan_drawing_status, drawDoc.structure_drawing_status,
          drawDoc.material_drawing_status, drawDoc.electrical_system_drawing_status,
          drawDoc.utility_position_drawing_status, drawDoc.fire_facility_drawing_status
        ];
        const allApproved = statuses.every(s => s === 'approved');
        if (allApproved) return '已通过';
        // 审图员从未提交过审核意见
        if (!drawDoc.last_reviewed_at) return '待审';
        return '未通过';
      };

      const mergedData = boothsData?.map(booth => {
        const boothInfo = boothInfoData?.find(info => info.booth_number === booth.booth_number);
        const builderInfo = builderInfoData?.find(info => info.booth_number === booth.booth_number);
        const drawingDoc = drawingDocsData?.find(doc => doc.booth_number === booth.booth_number);
        const qualificationDoc = qualificationDocsData?.find(doc => doc.booth_number === booth.booth_number);
        return {
          ...booth,
          need_screen: boothInfo?.need_screen || false,
          screen_specification: boothInfo?.screen_specification || '',
          builder_name: builderInfo?.builder_name || '',
          builder_contact_name: builderInfo?.contact_name || '',
          builder_contact_phone: builderInfo?.contact_phone || '',
          builder_contact_email: builderInfo?.contact_email || '',
          submitted_at: drawingDoc?.submitted_at || null,
          qualification_review_status: getQualificationReviewStatus(qualificationDoc),
          drawing_review_status: getDrawingReviewStatus(drawingDoc)
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
    if (filters.qualificationStatus && booth.qualification_review_status !== filters.qualificationStatus) return false;
    if (filters.drawingStatus && booth.drawing_review_status !== filters.drawingStatus) return false;
    return true;
  }).sort((a, b) => {
    // 时间排序
    if (filters.sortByTime) {
      const timeA = a.submitted_at ? new Date(a.submitted_at).getTime() : 0;
      const timeB = b.submitted_at ? new Date(b.submitted_at).getTime() : 0;

      if (filters.sortByTime === 'asc') {
        // 顺序：未提交的排在最前面，然后按时间从早到晚
        if (!a.submitted_at && !b.submitted_at) return 0;
        if (!a.submitted_at) return -1;
        if (!b.submitted_at) return 1;
        return timeA - timeB;
      } else {
        // 倒序：按时间从晚到早，未提交的排在最后
        if (!a.submitted_at && !b.submitted_at) return 0;
        if (!a.submitted_at) return 1;
        if (!b.submitted_at) return -1;
        return timeB - timeA;
      }
    }
    return 0;
  });

  const uniqueHallNumbers = Array.from(new Set(booths.map(b => b.hall_number).filter(Boolean)));

  const getHeightTypeBadgeColor = (heightType: string) => {
    if (heightType === '超高') return 'bg-red-100 text-red-700';
    if (heightType === '不超高') return 'bg-green-100 text-green-700';
    return 'bg-gray-100 text-gray-700';
  };

  const getReviewStatusBadge = (status: '待审' | '已通过' | '未通过' | '-' | undefined) => {
    switch (status) {
      case '已通过': return 'bg-green-100 text-green-700';
      case '未通过': return 'bg-red-100 text-red-700';
      case '待审': return 'bg-yellow-100 text-yellow-700';
      default: return 'bg-gray-100 text-gray-500';
    }
  };

  const formatSubmittedTime = (time: string | null | undefined) => {
    if (!time) return '未提交';
    const date = new Date(time);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}`;
  };

  const downloadAllDrawings = async () => {
    try {
      alert('正在准备下载，请稍候...');
      const zip = new JSZip();

      // 获取所有特装展位的图纸数据
      const { data: drawingsData, error: drawingsError } = await supabase
        .from('drawing_documents')
        .select('*')
        .in('booth_number', booths.map(b => b.booth_number));

      if (drawingsError) throw drawingsError;

      // 分类：已全部通过 vs 未全部通过
      const passedBooths: typeof drawingsData = [];
      const unpassedBooths: typeof drawingsData = [];

      drawingsData?.forEach((drawing: any) => {
        const isAllPassed = [
          drawing.effect_drawing_status,
          drawing.elevation_grid_drawing_status,
          drawing.plan_drawing_status,
          drawing.structure_drawing_status,
          drawing.material_drawing_status,
          drawing.electrical_system_drawing_status,
          drawing.utility_position_drawing_status,
          drawing.fire_facility_drawing_status
        ].every(status => status === 'approved');

        if (isAllPassed) {
          passedBooths.push(drawing);
        } else {
          unpassedBooths.push(drawing);
        }
      });

      // 处理已全部通过的展商
      if (passedBooths.length > 0) {
        const passedFolder = zip.folder('已全部通过的展商');
        for (const drawing of passedBooths) {
          const boothFolder = passedFolder?.folder(`${drawing.booth_number}_${drawing.exhibitor_name || '未命名'}`);

          // 下载所有图纸文件
          const drawingTypes = [
            { key: 'effect_drawing_urls', label: '多角度效果图' },
            { key: 'elevation_grid_drawing_urls', label: '立面网格图' },
            { key: 'plan_drawing_urls', label: '平面图' },
            { key: 'structure_drawing_urls', label: '内部结构图' },
            { key: 'material_drawing_urls', label: '材质图' },
            { key: 'electrical_system_drawing_urls', label: '配电系统图' },
            { key: 'utility_position_drawing_urls', label: '水电气网点位设施位置图' },
            { key: 'fire_facility_drawing_urls', label: '消防设施布局图' }
          ];

          for (const drawingType of drawingTypes) {
            const urls = drawing[drawingType.key] || [];
            if (urls.length > 0) {
              const typeFolder = boothFolder?.folder(drawingType.label);
              for (let i = 0; i < urls.length; i++) {
                try {
                  const response = await fetch(urls[i]);
                  const blob = await response.blob();
                  const fileName = `${drawingType.label}_${i + 1}${getFileExtension(urls[i])}`;
                  typeFolder?.file(fileName, blob);
                } catch (error) {
                  console.error(`Failed to download ${urls[i]}:`, error);
                }
              }
            }
          }
        }
      }

      // 处理未全部通过的展商
      if (unpassedBooths.length > 0) {
        const unpassedFolder = zip.folder('未全部通过的展商');
        for (const drawing of unpassedBooths) {
          const boothFolder = unpassedFolder?.folder(`${drawing.booth_number}_${drawing.exhibitor_name || '未命名'}`);

          // 下载所有图纸文件
          const drawingTypes = [
            { key: 'effect_drawing_urls', label: '多角度效果图' },
            { key: 'elevation_grid_drawing_urls', label: '立面网格图' },
            { key: 'plan_drawing_urls', label: '平面图' },
            { key: 'structure_drawing_urls', label: '内部结构图' },
            { key: 'material_drawing_urls', label: '材质图' },
            { key: 'electrical_system_drawing_urls', label: '配电系统图' },
            { key: 'utility_position_drawing_urls', label: '水电气网点位设施位置图' },
            { key: 'fire_facility_drawing_urls', label: '消防设施布局图' }
          ];

          for (const drawingType of drawingTypes) {
            const urls = drawing[drawingType.key] || [];
            if (urls.length > 0) {
              const typeFolder = boothFolder?.folder(drawingType.label);
              for (let i = 0; i < urls.length; i++) {
                try {
                  const response = await fetch(urls[i]);
                  const blob = await response.blob();
                  const fileName = `${drawingType.label}_${i + 1}${getFileExtension(urls[i])}`;
                  typeFolder?.file(fileName, blob);
                } catch (error) {
                  console.error(`Failed to download ${urls[i]}:`, error);
                }
              }
            }
          }
        }
      }

      // 生成 ZIP 文件
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      saveAs(zipBlob, `特装展位图纸_${new Date().toISOString().split('T')[0]}.zip`);
      alert('下载完成！');
    } catch (error) {
      console.error('Error downloading drawings:', error);
      alert('下载失败: ' + (error as Error).message);
    }
  };

  const getFileExtension = (url: string): string => {
    try {
      const urlObj = new URL(url);
      const pathname = urlObj.pathname;
      const match = pathname.match(/\.[^.]+$/);
      return match ? match[0] : '.pdf';
    } catch {
      return '.pdf';
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-xl font-bold text-gray-800 mb-4">特装展位审图</h2>

        <div className="grid grid-cols-2 md:grid-cols-2 gap-4 mb-6">
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
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setFilters({
              hallNumber: '',
              boothNumber: '',
              exhibitorName: '',
              heightType: '',
              sortByTime: '',
              qualificationStatus: '',
              drawingStatus: ''
            })}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            重置筛选
          </button>
          <button
            onClick={downloadAllDrawings}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <i className="fas fa-download"></i>
            一键下载图纸
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
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 relative">
                    <div className="flex items-center gap-2">
                      展馆号
                      <div className="relative">
                        <button
                          onClick={() => setHallNumberDropdown(!hallNumberDropdown)}
                          className="text-gray-500 hover:text-gray-700 transition-colors"
                          title="筛选展馆号"
                        >
                          <i className="fas fa-chevron-down text-xs"></i>
                        </button>
                        {hallNumberDropdown && (
                          <div className="absolute top-full left-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-10 min-w-max">
                            <button
                              onClick={() => {
                                setFilters({ ...filters, hallNumber: '' });
                                setHallNumberDropdown(false);
                              }}
                              className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 first:rounded-t-lg"
                            >
                              全部
                            </button>
                            {uniqueHallNumbers.map(hall => (
                              <button
                                key={hall}
                                onClick={() => {
                                  setFilters({ ...filters, hallNumber: hall });
                                  setHallNumberDropdown(false);
                                }}
                                className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 last:rounded-b-lg"
                              >
                                {hall}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">展位号</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">展商名称</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">展位面积</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 relative">
                    <div className="flex items-center gap-2">
                      高度类型
                      <div className="relative">
                        <button
                          onClick={() => setHeightTypeDropdown(!heightTypeDropdown)}
                          className="text-gray-500 hover:text-gray-700 transition-colors"
                          title="筛选高度类型"
                        >
                          <i className="fas fa-chevron-down text-xs"></i>
                        </button>
                        {heightTypeDropdown && (
                          <div className="absolute top-full right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-10 min-w-max">
                            <button
                              onClick={() => {
                                setFilters({ ...filters, heightType: '' });
                                setHeightTypeDropdown(false);
                              }}
                              className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 first:rounded-t-lg"
                            >
                              全部
                            </button>
                            <button
                              onClick={() => {
                                setFilters({ ...filters, heightType: '不超高' });
                                setHeightTypeDropdown(false);
                              }}
                              className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                            >
                              不超高（&lt;4.5米）
                            </button>
                            <button
                              onClick={() => {
                                setFilters({ ...filters, heightType: '超高' });
                                setHeightTypeDropdown(false);
                              }}
                              className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 last:rounded-b-lg"
                            >
                              超高（&ge;4.5米）
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 relative">
                    <div className="flex items-center gap-2">
                      提交时间
                      <div className="relative">
                        <button
                          onClick={() => setSubmitTimeDropdown(!submitTimeDropdown)}
                          className="text-gray-500 hover:text-gray-700 transition-colors"
                          title="筛选提交时间"
                        >
                          <i className="fas fa-chevron-down text-xs"></i>
                        </button>
                        {submitTimeDropdown && (
                          <div className="absolute top-full right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-10 min-w-max">
                            <button
                              onClick={() => {
                                setFilters({ ...filters, sortByTime: '' });
                                setSubmitTimeDropdown(false);
                              }}
                              className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 first:rounded-t-lg"
                            >
                              默认
                            </button>
                            <button
                              onClick={() => {
                                setFilters({ ...filters, sortByTime: 'desc' });
                                setSubmitTimeDropdown(false);
                              }}
                              className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                            >
                              时间倒序（最新在前）
                            </button>
                            <button
                              onClick={() => {
                                setFilters({ ...filters, sortByTime: 'asc' });
                                setSubmitTimeDropdown(false);
                              }}
                              className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 last:rounded-b-lg"
                            >
                              时间顺序（最早在前）
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 relative">
                    <div className="flex items-center gap-2">
                      资质审查情况
                      <div className="relative">
                        <button
                          onClick={() => setQualificationStatusDropdown(!qualificationStatusDropdown)}
                          className="text-gray-500 hover:text-gray-700 transition-colors"
                          title="筛选资质审查情况"
                        >
                          <i className="fas fa-chevron-down text-xs"></i>
                        </button>
                        {qualificationStatusDropdown && (
                          <div className="absolute top-full right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-10 min-w-max">
                            {(['', '待审', '已通过', '未通过', '-'] as ReviewStatusFilter[]).map((opt) => (
                              <button
                                key={opt || 'all'}
                                onClick={() => {
                                  setFilters({ ...filters, qualificationStatus: opt });
                                  setQualificationStatusDropdown(false);
                                }}
                                className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 first:rounded-t-lg last:rounded-b-lg"
                              >
                                {opt || '全部'}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 relative">
                    <div className="flex items-center gap-2">
                      图纸审查情况
                      <div className="relative">
                        <button
                          onClick={() => setDrawingStatusDropdown(!drawingStatusDropdown)}
                          className="text-gray-500 hover:text-gray-700 transition-colors"
                          title="筛选图纸审查情况"
                        >
                          <i className="fas fa-chevron-down text-xs"></i>
                        </button>
                        {drawingStatusDropdown && (
                          <div className="absolute top-full right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-10 min-w-max">
                            {(['', '待审', '已通过', '未通过', '-'] as ReviewStatusFilter[]).map((opt) => (
                              <button
                                key={opt || 'all'}
                                onClick={() => {
                                  setFilters({ ...filters, drawingStatus: opt });
                                  setDrawingStatusDropdown(false);
                                }}
                                className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 first:rounded-t-lg last:rounded-b-lg"
                              >
                                {opt || '全部'}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </th>
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
                      <td className="px-4 py-3 text-sm text-gray-900">
                        <span className={booth.submitted_at ? 'text-gray-900' : 'text-gray-400'}>
                          {formatSubmittedTime(booth.submitted_at)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span className={`inline-flex items-center px-2 py-1 rounded text-xs ${getReviewStatusBadge(booth.qualification_review_status)}`}>
                          {booth.qualification_review_status || '-'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span className={`inline-flex items-center px-2 py-1 rounded text-xs ${getReviewStatusBadge(booth.drawing_review_status)}`}>
                          {booth.drawing_review_status || '-'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">{booth.contact_name || '-'}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{booth.contact_phone || '-'}</td>
                      <td className="px-4 py-3 text-sm space-y-2">
                        <div className="flex flex-col gap-2">
                          <button
                            onClick={() => { setSelectedBooth(booth); setShowDetailModal(true); }}
                            className="w-full px-3 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700 transition-colors whitespace-nowrap"
                          >
                            查看详情
                          </button>
                          <button
                            onClick={() => { setSelectedBooth(booth); setShowQualificationModal(true); }}
                            className="w-full px-3 py-1 bg-purple-600 text-white rounded text-xs hover:bg-purple-700 transition-colors whitespace-nowrap"
                          >
                            资质审核
                          </button>
                          <button
                            onClick={() => { setSelectedBooth(booth); setShowDrawingModal(true); }}
                            className="w-full px-3 py-1 bg-orange-600 text-white rounded text-xs hover:bg-orange-700 transition-colors whitespace-nowrap"
                          >
                            图纸审核
                          </button>
                        </div>
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
