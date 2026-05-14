import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Document, Paragraph, Table, TableCell, TableRow, WidthType, AlignmentType, BorderStyle, HeadingLevel, Packer } from 'docx';
import { saveAs } from 'file-saver';

interface PaymentNoticeItem {
  name: string;
  spec: string;
  quantity: number;
  unit: string;
  price: number;
  deposit: number;
  amount: number;
  remark: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  booth: any;
  feeRules: any;
}

const CATEGORY_LABELS: Record<string, string> = {
  furniture: '家具', network: '网络', electricity: '电', water: '水', gas: '气'
};

export default function PaymentNoticeModal({ isOpen, onClose, booth, feeRules }: Props) {
  const isHighBooth = (booth?.booth_height || 0) >= 4.5;

  const [serviceData, setServiceData] = useState({
    exhibitionName: '', reviewNumber: '', hallNumber: '', boothNumber: '', exhibitorName: '',
    items: [] as PaymentNoticeItem[], subtotal: 0, total: 0,
    receiverName: '', bankAccount: '', bankName: '', unionPayNumber: '', bankCode: ''
  });

  const [heightData, setHeightData] = useState({
    recipientUnit: '', recipient: '', recipientPhone: '', recipientEmail: '',
    reviewServiceProvider: '', sender: '', senderPhone: '', senderEmail: '',
    date: new Date().toLocaleDateString('zh-CN'), feeAmount: 0,
    companyName: '', companyAddress: '', companyPhone: '', companyBank: '', companyAccount: ''
  });

  useEffect(() => {
    if (booth) {
      const items: PaymentNoticeItem[] = [];
      let subtotal = 0;
      booth.applications?.forEach((app: any) => {
        if (app.hasApplication && app.content?.items) {
          app.content.items.forEach((item: any) => {
            const amount = (item.price * item.quantity) + (item.deposit * item.quantity);
            items.push({ name: item.item, spec: item.spec || '-', quantity: item.quantity, unit: item.unit, price: item.price, deposit: item.deposit, amount, remark: CATEGORY_LABELS[app.category] || '' });
            subtotal += amount;
          });
        }
      });
      if (booth.booth_area && feeRules) {
        const managementFee = booth.booth_area * feeRules.management_fee_per_sqm;
        items.push({ name: '管理费', spec: `${booth.booth_area}㎡`, quantity: 1, unit: '项', price: managementFee, deposit: 0, amount: managementFee, remark: '固定费用' });
        subtotal += managementFee;
        let depositAmount = booth.booth_area <= 50 ? feeRules.deposit_0_50 : booth.booth_area <= 100 ? feeRules.deposit_51_100 : feeRules.deposit_over_100;
        items.push({ name: '押金', spec: `${booth.booth_area}㎡`, quantity: 1, unit: '项', price: depositAmount, deposit: 0, amount: depositAmount, remark: '固定费用' });
        subtotal += depositAmount;
      }
      setServiceData({ exhibitionName: '', reviewNumber: '', hallNumber: booth.hall_number || '', boothNumber: booth.booth_number || '', exhibitorName: booth.exhibitor_name || '', items, subtotal, total: subtotal, receiverName: '', bankAccount: '', bankName: '', unionPayNumber: '', bankCode: '' });
      if (isHighBooth && feeRules) {
        setHeightData(prev => ({ ...prev, feeAmount: feeRules.height_review_fee || 0 }));
      }
    }
  }, [booth, feeRules, isHighBooth]);

  const downloadServiceWord = async () => {
    const doc = new Document({
      sections: [{
        properties: { page: { margin: { top: 1000, right: 1000, bottom: 1000, left: 1000 } } },
        children: [
          new Paragraph({ text: '展会服务缴费通知单', heading: HeadingLevel.HEADING_1, alignment: AlignmentType.CENTER, spacing: { after: 400 } }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({ children: [new TableCell({ children: [new Paragraph('展览名称：')] }), new TableCell({ children: [new Paragraph(serviceData.exhibitionName)] }), new TableCell({ children: [new Paragraph('审图编号：')] }), new TableCell({ children: [new Paragraph(serviceData.reviewNumber)] })] }),
              new TableRow({ children: [new TableCell({ children: [new Paragraph('展馆：')] }), new TableCell({ children: [new Paragraph(serviceData.hallNumber)] }), new TableCell({ children: [new Paragraph('展位：')] }), new TableCell({ children: [new Paragraph(serviceData.boothNumber)] })] }),
              new TableRow({ children: [new TableCell({ children: [new Paragraph('展商名称：')] }), new TableCell({ children: [new Paragraph(serviceData.exhibitorName)], columnSpan: 3 })] })
            ]
          }),
          new Paragraph({ text: '', spacing: { after: 200 } }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({ children: ['序号', '项目', '规格', '数量', '单位', '单价', '押金', '金额', '备注'].map(t => new TableCell({ children: [new Paragraph({ text: t, alignment: AlignmentType.CENTER })] })) }),
              ...serviceData.items.map((item, i) => new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ text: String(i + 1), alignment: AlignmentType.CENTER })] }),
                  new TableCell({ children: [new Paragraph(item.name)] }),
                  new TableCell({ children: [new Paragraph(item.spec)] }),
                  new TableCell({ children: [new Paragraph({ text: String(item.quantity), alignment: AlignmentType.CENTER })] }),
                  new TableCell({ children: [new Paragraph({ text: item.unit, alignment: AlignmentType.CENTER })] }),
                  new TableCell({ children: [new Paragraph({ text: `¥${item.price}`, alignment: AlignmentType.RIGHT })] }),
                  new TableCell({ children: [new Paragraph({ text: `¥${item.deposit}`, alignment: AlignmentType.RIGHT })] }),
                  new TableCell({ children: [new Paragraph({ text: `¥${item.amount}`, alignment: AlignmentType.RIGHT })] }),
                  new TableCell({ children: [new Paragraph(item.remark)] })
                ]
              })),
              new TableRow({ children: [new TableCell({ children: [new Paragraph('')], columnSpan: 7 }), new TableCell({ children: [new Paragraph({ text: `小计：¥${serviceData.subtotal}`, alignment: AlignmentType.RIGHT })] }), new TableCell({ children: [new Paragraph('')] })] }),
              new TableRow({ children: [new TableCell({ children: [new Paragraph('')], columnSpan: 7 }), new TableCell({ children: [new Paragraph({ text: `总计：¥${serviceData.total}`, alignment: AlignmentType.RIGHT, bold: true })] }), new TableCell({ children: [new Paragraph('')] })] })
            ]
          }),
          new Paragraph({ text: '', spacing: { after: 200 } }),
          new Paragraph({ text: '注意事项：', bold: true }),
          new Paragraph('1. 请在规定时间内完成缴费，逾期将产生滞纳金。'),
          new Paragraph('2. 缴费后请保留凭证，以备查验。'),
          new Paragraph('3. 如有疑问，请联系展会服务中心。'),
          new Paragraph({ text: '', spacing: { after: 200 } }),
          new Paragraph({ text: '收款信息：', bold: true }),
          new Paragraph(`收款户名：${serviceData.receiverName}`),
          new Paragraph(`银行账号：${serviceData.bankAccount}`),
          new Paragraph(`开户银行：${serviceData.bankName}`),
          new Paragraph(`联行号：${serviceData.unionPayNumber}`),
          new Paragraph(`银行代码：${serviceData.bankCode}`)
        ]
      }]
    });
    const blob = await Packer.toBlob(doc);
    saveAs(blob, `展会服务缴费通知单_${serviceData.boothNumber}.docx`);
  };

  const downloadHeightWord = async () => {
    const doc = new Document({
      sections: [{
        properties: { page: { margin: { top: 1000, right: 1000, bottom: 1000, left: 1000 } } },
        children: [
          new Paragraph({ text: '超高审图缴费通知单', heading: HeadingLevel.HEADING_1, alignment: AlignmentType.CENTER, spacing: { after: 400 } }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({ children: [new TableCell({ children: [new Paragraph('收件单位：')] }), new TableCell({ children: [new Paragraph(heightData.recipientUnit)] }), new TableCell({ children: [new Paragraph('收件人：')] }), new TableCell({ children: [new Paragraph(heightData.recipient)] })] }),
              new TableRow({ children: [new TableCell({ children: [new Paragraph('电话：')] }), new TableCell({ children: [new Paragraph(heightData.recipientPhone)] }), new TableCell({ children: [new Paragraph('E-mail：')] }), new TableCell({ children: [new Paragraph(heightData.recipientEmail)] })] }),
              new TableRow({ children: [new TableCell({ children: [new Paragraph('展位号：')] }), new TableCell({ children: [new Paragraph(booth?.booth_number || '')], columnSpan: 3 })] })
            ]
          }),
          new Paragraph({ text: '', spacing: { after: 200 } }),
          new Paragraph('根据贵公司的报图，审图费用如下：'),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({ children: [new TableCell({ children: [new Paragraph({ text: '项目', alignment: AlignmentType.CENTER })] }), new TableCell({ children: [new Paragraph({ text: '金额', alignment: AlignmentType.CENTER })] })] }),
              new TableRow({ children: [new TableCell({ children: [new Paragraph({ text: '超高审图费', alignment: AlignmentType.CENTER })] }), new TableCell({ children: [new Paragraph({ text: `¥${heightData.feeAmount}`, alignment: AlignmentType.CENTER })] })] }),
              new TableRow({ children: [new TableCell({ children: [new Paragraph({ text: '合计', alignment: AlignmentType.CENTER, bold: true })] }), new TableCell({ children: [new Paragraph({ text: `¥${heightData.feeAmount}`, alignment: AlignmentType.CENTER, bold: true })] })] })
            ]
          }),
          new Paragraph({ text: '', spacing: { after: 200 } }),
          new Paragraph({ text: '注意事项：', bold: true }),
          new Paragraph('1. 请在收到通知单后5个工作日内完成缴费。'),
          new Paragraph('2. 缴费时请备注展位号和展商名称。'),
          new Paragraph('3. 逾期未缴费将影响展位搭建进度。'),
          new Paragraph('4. 如有疑问请联系审图服务商。'),
          new Paragraph({ text: '', spacing: { after: 200 } }),
          new Paragraph({ text: '公司信息：', bold: true }),
          new Paragraph(`公司名称：${heightData.companyName}`),
          new Paragraph(`公司地址：${heightData.companyAddress}`),
          new Paragraph(`电话：${heightData.companyPhone}`),
          new Paragraph(`开户银行：${heightData.companyBank}`),
          new Paragraph(`银行账户：${heightData.companyAccount}`),
          new Paragraph({ text: '', spacing: { after: 200 } }),
          new Paragraph({ text: `审图服务商：${heightData.reviewServiceProvider}`, alignment: AlignmentType.RIGHT }),
          new Paragraph({ text: `发件人：${heightData.sender}`, alignment: AlignmentType.RIGHT }),
          new Paragraph({ text: `电话：${heightData.senderPhone}`, alignment: AlignmentType.RIGHT }),
          new Paragraph({ text: `E-mail：${heightData.senderEmail}`, alignment: AlignmentType.RIGHT }),
          new Paragraph({ text: `日期：${heightData.date}`, alignment: AlignmentType.RIGHT })
        ]
      }]
    });
    const blob = await Packer.toBlob(doc);
    saveAs(blob, `超高审图缴费通知单_${booth?.booth_number}.docx`);
  };

  const updateServiceItem = (index: number, field: keyof PaymentNoticeItem, value: any) => {
    const newItems = [...serviceData.items];
    newItems[index] = { ...newItems[index], [field]: value };
    if (field === 'price' || field === 'quantity' || field === 'deposit') {
      newItems[index].amount = (newItems[index].price * newItems[index].quantity) + (newItems[index].deposit * newItems[index].quantity);
    }
    const subtotal = newItems.reduce((sum, item) => sum + item.amount, 0);
    setServiceData({ ...serviceData, items: newItems, subtotal, total: subtotal });
  };

  if (!isOpen || !booth) return null;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className={`bg-white rounded-2xl shadow-2xl w-full ${isHighBooth ? 'max-w-7xl' : 'max-w-4xl'} max-h-[90vh] overflow-y-auto`}>
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-800">{isHighBooth ? '生成缴费通知单（超高展位）' : '生成缴费通知单'}</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><i className="fas fa-times text-xl"></i></button>
          </div>

          <div className={`grid ${isHighBooth ? 'grid-cols-2 gap-6' : 'grid-cols-1'}`}>
            <div className="border rounded-lg p-4">
              <h3 className="font-bold text-lg text-gray-800 mb-4 text-center border-b pb-2">展会服务缴费通知单</h3>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="block text-xs text-gray-500">展览名称</label><input type="text" value={serviceData.exhibitionName} onChange={e => setServiceData({...serviceData, exhibitionName: e.target.value})} className="w-full px-2 py-1 border rounded text-sm" /></div>
                  <div><label className="block text-xs text-gray-500">审图编号</label><input type="text" value={serviceData.reviewNumber} onChange={e => setServiceData({...serviceData, reviewNumber: e.target.value})} className="w-full px-2 py-1 border rounded text-sm" /></div>
                  <div><label className="block text-xs text-gray-500">展馆 <span className="text-blue-600">(自动)</span></label><input type="text" value={serviceData.hallNumber} disabled className="w-full px-2 py-1 border rounded text-sm bg-gray-100" /></div>
                  <div><label className="block text-xs text-gray-500">展位 <span className="text-blue-600">(自动)</span></label><input type="text" value={serviceData.boothNumber} disabled className="w-full px-2 py-1 border rounded text-sm bg-gray-100" /></div>
                  <div className="col-span-2"><label className="block text-xs text-gray-500">展商名称 <span className="text-blue-600">(自动)</span></label><input type="text" value={serviceData.exhibitorName} disabled className="w-full px-2 py-1 border rounded text-sm bg-gray-100" /></div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full border text-xs">
                    <thead className="bg-gray-100"><tr><th className="border px-2 py-1">序号</th><th className="border px-2 py-1">项目</th><th className="border px-2 py-1">规格</th><th className="border px-2 py-1">数量</th><th className="border px-2 py-1">单价</th><th className="border px-2 py-1">金额</th></tr></thead>
                    <tbody>{serviceData.items.map((item, i) => (<tr key={i}><td className="border px-2 py-1 text-center">{i+1}</td><td className="border px-2 py-1"><input value={item.name} onChange={e => updateServiceItem(i, 'name', e.target.value)} className="w-full px-1 border rounded" /></td><td className="border px-2 py-1">{item.spec}</td><td className="border px-2 py-1 text-center">{item.quantity}</td><td className="border px-2 py-1 text-right">¥{item.price}</td><td className="border px-2 py-1 text-right font-medium">¥{item.amount}</td></tr>))}</tbody>
                  </table>
                </div>
                <div className="flex justify-end gap-4 text-sm"><span>小计: ¥{serviceData.subtotal}</span><span className="font-bold">总计: ¥{serviceData.total}</span></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="block text-xs text-gray-500">收款户名</label><input type="text" value={serviceData.receiverName} onChange={e => setServiceData({...serviceData, receiverName: e.target.value})} className="w-full px-2 py-1 border rounded text-sm" /></div>
                  <div><label className="block text-xs text-gray-500">银行账号</label><input type="text" value={serviceData.bankAccount} onChange={e => setServiceData({...serviceData, bankAccount: e.target.value})} className="w-full px-2 py-1 border rounded text-sm" /></div>
                  <div><label className="block text-xs text-gray-500">开户银行</label><input type="text" value={serviceData.bankName} onChange={e => setServiceData({...serviceData, bankName: e.target.value})} className="w-full px-2 py-1 border rounded text-sm" /></div>
                  <div><label className="block text-xs text-gray-500">联行号</label><input type="text" value={serviceData.unionPayNumber} onChange={e => setServiceData({...serviceData, unionPayNumber: e.target.value})} className="w-full px-2 py-1 border rounded text-sm" /></div>
                </div>
                <button onClick={downloadServiceWord} className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"><i className="fas fa-download mr-2"></i>下载Word</button>
              </div>
            </div>

            {isHighBooth && (
              <div className="border rounded-lg p-4">
                <h3 className="font-bold text-lg text-gray-800 mb-4 text-center border-b pb-2">超高审图缴费通知单</h3>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className="block text-xs text-gray-500">收件单位</label><input type="text" value={heightData.recipientUnit} onChange={e => setHeightData({...heightData, recipientUnit: e.target.value})} className="w-full px-2 py-1 border rounded text-sm" /></div>
                    <div><label className="block text-xs text-gray-500">收件人</label><input type="text" value={heightData.recipient} onChange={e => setHeightData({...heightData, recipient: e.target.value})} className="w-full px-2 py-1 border rounded text-sm" /></div>
                    <div><label className="block text-xs text-gray-500">电话</label><input type="text" value={heightData.recipientPhone} onChange={e => setHeightData({...heightData, recipientPhone: e.target.value})} className="w-full px-2 py-1 border rounded text-sm" /></div>
                    <div><label className="block text-xs text-gray-500">展位号 <span className="text-blue-600">(自动)</span></label><input type="text" value={booth.booth_number} disabled className="w-full px-2 py-1 border rounded text-sm bg-gray-100" /></div>
                    <div><label className="block text-xs text-gray-500">审图服务商</label><input type="text" value={heightData.reviewServiceProvider} onChange={e => setHeightData({...heightData, reviewServiceProvider: e.target.value})} className="w-full px-2 py-1 border rounded text-sm" /></div>
                    <div><label className="block text-xs text-gray-500">发件人</label><input type="text" value={heightData.sender} onChange={e => setHeightData({...heightData, sender: e.target.value})} className="w-full px-2 py-1 border rounded text-sm" /></div>
                    <div><label className="block text-xs text-gray-500">审图费用 <span className="text-blue-600">(自动)</span></label><input type="number" value={heightData.feeAmount} disabled className="w-full px-2 py-1 border rounded text-sm bg-gray-100" /></div>
                    <div><label className="block text-xs text-gray-500">日期</label><input type="text" value={heightData.date} onChange={e => setHeightData({...heightData, date: e.target.value})} className="w-full px-2 py-1 border rounded text-sm" /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className="block text-xs text-gray-500">公司名称</label><input type="text" value={heightData.companyName} onChange={e => setHeightData({...heightData, companyName: e.target.value})} className="w-full px-2 py-1 border rounded text-sm" /></div>
                    <div><label className="block text-xs text-gray-500">公司地址</label><input type="text" value={heightData.companyAddress} onChange={e => setHeightData({...heightData, companyAddress: e.target.value})} className="w-full px-2 py-1 border rounded text-sm" /></div>
                    <div><label className="block text-xs text-gray-500">电话</label><input type="text" value={heightData.companyPhone} onChange={e => setHeightData({...heightData, companyPhone: e.target.value})} className="w-full px-2 py-1 border rounded text-sm" /></div>
                    <div><label className="block text-xs text-gray-500">开户银行</label><input type="text" value={heightData.companyBank} onChange={e => setHeightData({...heightData, companyBank: e.target.value})} className="w-full px-2 py-1 border rounded text-sm" /></div>
                    <div className="col-span-2"><label className="block text-xs text-gray-500">银行账户</label><input type="text" value={heightData.companyAccount} onChange={e => setHeightData({...heightData, companyAccount: e.target.value})} className="w-full px-2 py-1 border rounded text-sm" /></div>
                  </div>
                  <button onClick={downloadHeightWord} className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm"><i className="fas fa-download mr-2"></i>下载Word</button>
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-4 mt-6 pt-4 border-t">
            <button onClick={onClose} className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300">关闭</button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
