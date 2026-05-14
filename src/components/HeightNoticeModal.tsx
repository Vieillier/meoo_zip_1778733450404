import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import html2pdf from 'html2pdf.js';

interface HeightNoticeData {
  recipientUnit: string;
  recipient: string;
  recipientPhone: string;
  recipientEmail: string;
  boothNumber: string;
  reviewServiceProvider: string;
  sender: string;
  senderPhone: string;
  senderEmail: string;
  date: string;
  feeAmount: number;
  companyName: string;
  companyAddress: string;
  companyPhone: string;
  companyBank: string;
  companyAccount: string;
}

interface BoothApplications {
  hall_number: string;
  booth_number: string;
  exhibitor_name: string;
  booth_area?: number;
  booth_height?: number;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  booth: BoothApplications | null;
  feeRules: any;
}

export default function HeightNoticeModal({ isOpen, onClose, booth, feeRules }: Props) {
  const pdfRef = useRef<HTMLDivElement>(null);
  const [data, setData] = useState<HeightNoticeData>({
    recipientUnit: '',
    recipient: '',
    recipientPhone: '',
    recipientEmail: '',
    boothNumber: '',
    reviewServiceProvider: '',
    sender: '',
    senderPhone: '',
    senderEmail: '',
    date: new Date().toLocaleDateString('zh-CN'),
    feeAmount: 0,
    companyName: '',
    companyAddress: '',
    companyPhone: '',
    companyBank: '',
    companyAccount: ''
  });

  useEffect(() => {
    if (booth && feeRules) {
      const heightReviewFee = (booth.booth_height || 0) >= 4.5 ? feeRules.height_review_fee : 0;
      setData(prev => ({
        ...prev,
        boothNumber: booth.booth_number || '',
        feeAmount: heightReviewFee
      }));
    }
  }, [booth, feeRules]);

  const handleDownloadPDF = () => {
    if (pdfRef.current) {
      const opt = {
        margin: 10,
        filename: `超高审图缴费通知单_${data.boothNumber}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      };
      html2pdf().set(opt).from(pdfRef.current).save();
    }
  };

  if (!isOpen || !booth) return null;

  return (
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
        className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto"
      >
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-800">生成超高审图缴费通知单</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <i className="fas fa-times text-xl"></i>
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="col-span-2">
              <h3 className="font-medium text-gray-800 mb-3 border-b pb-2">收件信息</h3>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">收件单位</label>
              <input
                type="text"
                value={data.recipientUnit}
                onChange={(e) => setData({ ...data, recipientUnit: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                placeholder="请输入收件单位"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">收件人</label>
              <input
                type="text"
                value={data.recipient}
                onChange={(e) => setData({ ...data, recipient: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                placeholder="请输入收件人"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">电话</label>
              <input
                type="text"
                value={data.recipientPhone}
                onChange={(e) => setData({ ...data, recipientPhone: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                placeholder="请输入电话"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">E-mail</label>
              <input
                type="email"
                value={data.recipientEmail}
                onChange={(e) => setData({ ...data, recipientEmail: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                placeholder="请输入邮箱"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">展位号</label>
              <input
                type="text"
                value={data.boothNumber}
                disabled
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-600 cursor-not-allowed"
              />
            </div>

            <div className="col-span-2 mt-4">
              <h3 className="font-medium text-gray-800 mb-3 border-b pb-2">发件信息</h3>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">审图服务商</label>
              <input
                type="text"
                value={data.reviewServiceProvider}
                onChange={(e) => setData({ ...data, reviewServiceProvider: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                placeholder="请输入审图服务商"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">发件人</label>
              <input
                type="text"
                value={data.sender}
                onChange={(e) => setData({ ...data, sender: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                placeholder="请输入发件人"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">电话</label>
              <input
                type="text"
                value={data.senderPhone}
                onChange={(e) => setData({ ...data, senderPhone: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                placeholder="请输入电话"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">E-mail</label>
              <input
                type="email"
                value={data.senderEmail}
                onChange={(e) => setData({ ...data, senderEmail: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                placeholder="请输入邮箱"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">日期</label>
              <input
                type="text"
                value={data.date}
                onChange={(e) => setData({ ...data, date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>

            <div className="col-span-2 mt-4">
              <h3 className="font-medium text-gray-800 mb-3 border-b pb-2">费用信息</h3>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">审图费用</label>
              <input
                type="number"
                value={data.feeAmount}
                onChange={(e) => setData({ ...data, feeAmount: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>

            <div className="col-span-2 mt-4">
              <h3 className="font-medium text-gray-800 mb-3 border-b pb-2">公司信息</h3>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">公司名称</label>
              <input
                type="text"
                value={data.companyName}
                onChange={(e) => setData({ ...data, companyName: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                placeholder="请输入公司名称"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">公司地址</label>
              <input
                type="text"
                value={data.companyAddress}
                onChange={(e) => setData({ ...data, companyAddress: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                placeholder="请输入公司地址"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">电话</label>
              <input
                type="text"
                value={data.companyPhone}
                onChange={(e) => setData({ ...data, companyPhone: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                placeholder="请输入电话"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">开户银行</label>
              <input
                type="text"
                value={data.companyBank}
                onChange={(e) => setData({ ...data, companyBank: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                placeholder="请输入开户银行"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">银行账户</label>
              <input
                type="text"
                value={data.companyAccount}
                onChange={(e) => setData({ ...data, companyAccount: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                placeholder="请输入银行账户"
              />
            </div>
          </div>

          <div className="flex justify-end gap-4">
            <button
              onClick={onClose}
              className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
            >
              取消
            </button>
            <button
              onClick={handleDownloadPDF}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <i className="fas fa-download mr-2"></i>下载PDF
            </button>
          </div>

          <div ref={pdfRef} style={{ position: 'absolute', left: '-9999px', top: 0 }}>
            <div style={{ padding: '40px', fontFamily: 'SimSun, serif', fontSize: '12pt', lineHeight: '1.6' }}>
              <h1 style={{ textAlign: 'center', fontSize: '18pt', fontWeight: 'bold', marginBottom: '30px' }}>
                超高审图缴费通知单
              </h1>

              <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '20px' }}>
                <tbody>
                  <tr>
                    <td style={{ padding: '8px', width: '15%', fontWeight: 'bold' }}>收件单位：</td>
                    <td style={{ padding: '8px', borderBottom: '1px solid #000', width: '35%' }}>{data.recipientUnit}</td>
                    <td style={{ padding: '8px', width: '15%', fontWeight: 'bold' }}>收件人：</td>
                    <td style={{ padding: '8px', borderBottom: '1px solid #000', width: '35%' }}>{data.recipient}</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '8px', fontWeight: 'bold' }}>电话：</td>
                    <td style={{ padding: '8px', borderBottom: '1px solid #000' }}>{data.recipientPhone}</td>
                    <td style={{ padding: '8px', fontWeight: 'bold' }}>E-mail：</td>
                    <td style={{ padding: '8px', borderBottom: '1px solid #000' }}>{data.recipientEmail}</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '8px', fontWeight: 'bold' }}>展位号：</td>
                    <td style={{ padding: '8px', borderBottom: '1px solid #000' }} colSpan={3}>{data.boothNumber}</td>
                  </tr>
                </tbody>
              </table>

              <div style={{ marginBottom: '20px' }}>
                <p style={{ marginBottom: '10px' }}>根据贵公司的报图，审图费用如下：</p>
                <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #000' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f0f0f0' }}>
                      <th style={{ border: '1px solid #000', padding: '10px', textAlign: 'center', width: '60%' }}>项目</th>
                      <th style={{ border: '1px solid #000', padding: '10px', textAlign: 'center', width: '40%' }}>金额</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td style={{ border: '1px solid #000', padding: '10px', textAlign: 'center' }}>超高审图费</td>
                      <td style={{ border: '1px solid #000', padding: '10px', textAlign: 'center' }}>¥{data.feeAmount}</td>
                    </tr>
                    <tr>
                      <td style={{ border: '1px solid #000', padding: '10px', textAlign: 'center', fontWeight: 'bold' }}>合计</td>
                      <td style={{ border: '1px solid #000', padding: '10px', textAlign: 'center', fontWeight: 'bold' }}>¥{data.feeAmount}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <p style={{ fontWeight: 'bold', marginBottom: '10px' }}>注意事项：</p>
                <p>1. 请在收到通知单后5个工作日内完成缴费。</p>
                <p>2. 缴费时请备注展位号和展商名称。</p>
                <p>3. 逾期未缴费将影响展位搭建进度。</p>
                <p>4. 如有疑问请联系审图服务商。</p>
              </div>

              <div style={{ marginTop: '30px' }}>
                <p style={{ fontWeight: 'bold', marginBottom: '10px' }}>公司信息：</p>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <tbody>
                    <tr>
                      <td style={{ padding: '8px', width: '20%' }}>公司名称：</td>
                      <td style={{ padding: '8px', borderBottom: '1px solid #000' }}>{data.companyName}</td>
                    </tr>
                    <tr>
                      <td style={{ padding: '8px' }}>公司地址：</td>
                      <td style={{ padding: '8px', borderBottom: '1px solid #000' }}>{data.companyAddress}</td>
                    </tr>
                    <tr>
                      <td style={{ padding: '8px' }}>电话：</td>
                      <td style={{ padding: '8px', borderBottom: '1px solid #000' }}>{data.companyPhone}</td>
                    </tr>
                    <tr>
                      <td style={{ padding: '8px' }}>开户银行：</td>
                      <td style={{ padding: '8px', borderBottom: '1px solid #000' }}>{data.companyBank}</td>
                    </tr>
                    <tr>
                      <td style={{ padding: '8px' }}>银行账户：</td>
                      <td style={{ padding: '8px', borderBottom: '1px solid #000' }}>{data.companyAccount}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div style={{ marginTop: '40px', textAlign: 'right' }}>
                <p>审图服务商：{data.reviewServiceProvider}</p>
                <p>发件人：{data.sender}</p>
                <p>电话：{data.senderPhone}</p>
                <p>E-mail：{data.senderEmail}</p>
                <p>日期：{data.date}</p>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
