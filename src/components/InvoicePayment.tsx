import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '../supabase/client';

interface InvoiceInfo {
  company_name: string;
  tax_id: string;
  address: string;
  phone: string;
  bank_name: string;
  bank_account: string;
  payment_voucher_url: string | null;
}

interface InvoicePaymentProps {
  userId: string;
  boothNumber: string;
  isPreviewMode?: boolean;
}

const STORAGE_KEY = 'invoice_draft';
// 文件大小限制：5MB
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB in bytes

export default function InvoicePayment({ userId, boothNumber, isPreviewMode = false }: InvoicePaymentProps) {
  const [invoiceInfo, setInvoiceInfo] = useState<InvoiceInfo>({
    company_name: '',
    tax_id: '',
    address: '',
    phone: '',
    bank_name: '',
    bank_account: '',
    payment_voucher_url: null
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [hasSavedData, setHasSavedData] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);

  const fetchInvoiceInfo = async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('invoice_info')
        .select('*')
        .eq('booth_number', boothNumber)
        .maybeSingle();
      if (data) {
        setInvoiceInfo({
          company_name: data.company_name || '',
          tax_id: data.tax_id || '',
          address: data.address || '',
          phone: data.phone || '',
          bank_name: data.bank_name || '',
          bank_account: data.bank_account || '',
          payment_voucher_url: data.payment_voucher_url
        });
        setHasSavedData(true);
        localStorage.removeItem(`${STORAGE_KEY}_${boothNumber}`);
      } else {
        const draft = localStorage.getItem(`${STORAGE_KEY}_${boothNumber}`);
        if (draft) {
          const parsed = JSON.parse(draft);
          setInvoiceInfo({
            company_name: parsed.company_name || '',
            tax_id: parsed.tax_id || '',
            address: parsed.address || '',
            phone: parsed.phone || '',
            bank_name: parsed.bank_name || '',
            bank_account: parsed.bank_account || '',
            payment_voucher_url: parsed.payment_voucher_url || null
          });
        }
        setHasSavedData(false);
      }
    } catch (error) {
      console.error('Error fetching invoice info:', error);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (isPreviewMode || !boothNumber) return;
    fetchInvoiceInfo();
  }, [boothNumber, isPreviewMode]);

  useEffect(() => {
    if (!hasSavedData && !loading && boothNumber) {
      localStorage.setItem(`${STORAGE_KEY}_${boothNumber}`, JSON.stringify(invoiceInfo));
    }
  }, [invoiceInfo, hasSavedData, loading, boothNumber]);

  const handleSubmitInvoice = async () => {
    if (isPreviewMode) {
      alert('预览模式下无法保存');
      return;
    }

    if (!invoiceInfo.company_name || !invoiceInfo.tax_id) {
      alert('请填写必填项');
      return;
    }
    setSaving(true);
    const { data: existing } = await supabase
      .from('invoice_info')
      .select('id')
      .eq('booth_number', boothNumber)
      .maybeSingle();
    if (existing) {
      await supabase.from('invoice_info').update({
        ...invoiceInfo,
        updated_at: new Date().toISOString()
      }).eq('id', existing.id);
    } else {
      await supabase.from('invoice_info').insert({
        ...invoiceInfo,
        user_id: userId,
        booth_number: boothNumber
      });
    }
    setSaving(false);
    setHasSavedData(true);
    setIsEditMode(false);
    localStorage.removeItem(`${STORAGE_KEY}_${boothNumber}`);
    alert('开票信息已保存');
  };

  const handleEnableEditMode = () => {
    setIsEditMode(true);
  };

  const isImageFile = (file: File) => {
    return file.type.startsWith('image/');
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && isImageFile(file)) {
      // 检查文件大小
      if (file.size > MAX_FILE_SIZE) {
        alert(`文件大小超过限制！最大允许 5MB，当前文件大小 ${(file.size / 1024 / 1024).toFixed(2)}MB`);
        return;
      }
      setSelectedFile(file);
    } else if (file) {
      alert('仅支持图片类文件');
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && isImageFile(file)) {
      // 检查文件大小
      if (file.size > MAX_FILE_SIZE) {
        alert(`文件大小超过限制！最大允许 5MB，当前文件大小 ${(file.size / 1024 / 1024).toFixed(2)}MB`);
        return;
      }
      setSelectedFile(file);
    } else if (file) {
      alert('仅支持图片类文件');
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleUploadVoucher = async () => {
    if (isPreviewMode) {
      alert('预览模式下无法上传');
      return;
    }

    if (!selectedFile) {
      alert('请选择文件');
      return;
    }
    setUploading(true);
    try {
      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${boothNumber}_${Date.now()}.${fileExt}`;
      const arrayBuffer = await selectedFile.arrayBuffer();
      const { error: uploadError } = await supabase.storage
        .from('payment-vouchers')
        .upload(fileName, arrayBuffer, {
          contentType: selectedFile.type
        });
      if (uploadError) {
        alert('上传失败: ' + uploadError.message);
        setUploading(false);
        return;
      }
      const { data: urlData } = supabase.storage
        .from('payment-vouchers')
        .getPublicUrl(fileName);
      const { data: existing } = await supabase
        .from('invoice_info')
        .select('id')
        .eq('booth_number', boothNumber)
        .maybeSingle();
      if (existing) {
        await supabase.from('invoice_info').update({
          payment_voucher_url: urlData.publicUrl,
          updated_at: new Date().toISOString()
        }).eq('id', existing.id);
      } else {
        await supabase.from('invoice_info').insert({
          user_id: userId,
          booth_number: boothNumber,
          payment_voucher_url: urlData.publicUrl
        });
      }
      setInvoiceInfo(prev => ({ ...prev, payment_voucher_url: urlData.publicUrl }));
      setSelectedFile(null);
      setUploading(false);
      alert('付费凭证已上传');
    } catch (error: any) {
      alert('上传失败: ' + error.message);
      setUploading(false);
    }
  };

  return (
    <div className="space-y-8">
      {isPreviewMode && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
          <div className="flex items-center gap-2">
            <i className="fas fa-eye text-orange-600"></i>
            <span className="text-orange-800 font-medium">预览模式 - 仅可查看界面，无法进行操作</span>
          </div>
        </div>
      )}

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-xl shadow-sm p-6"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-800">开票信息</h3>
          <div className="flex items-center gap-3">
            {hasSavedData && !isEditMode && (
              <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                <i className="fas fa-check-circle mr-1"></i>已保存
              </span>
            )}
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">名称</label>
            <input
              type="text"
              value={invoiceInfo.company_name}
              onChange={(e) => setInvoiceInfo({ ...invoiceInfo, company_name: e.target.value })}
              disabled={hasSavedData && !isEditMode}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
              placeholder="请输入公司名称"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">纳税人识别号</label>
            <input
              type="text"
              value={invoiceInfo.tax_id}
              onChange={(e) => setInvoiceInfo({ ...invoiceInfo, tax_id: e.target.value })}
              disabled={hasSavedData && !isEditMode}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
              placeholder="请输入纳税人识别号"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">地址</label>
            <input
              type="text"
              value={invoiceInfo.address}
              onChange={(e) => setInvoiceInfo({ ...invoiceInfo, address: e.target.value })}
              disabled={hasSavedData && !isEditMode}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
              placeholder="请输入地址"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">电话</label>
            <input
              type="text"
              value={invoiceInfo.phone}
              onChange={(e) => setInvoiceInfo({ ...invoiceInfo, phone: e.target.value })}
              disabled={hasSavedData && !isEditMode}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
              placeholder="请输入电话"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">开户行</label>
            <input
              type="text"
              value={invoiceInfo.bank_name}
              onChange={(e) => setInvoiceInfo({ ...invoiceInfo, bank_name: e.target.value })}
              disabled={hasSavedData && !isEditMode}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
              placeholder="请输入开户行"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">账号</label>
            <input
              type="text"
              value={invoiceInfo.bank_account}
              onChange={(e) => setInvoiceInfo({ ...invoiceInfo, bank_account: e.target.value })}
              disabled={hasSavedData && !isEditMode}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
              placeholder="请输入银行账号"
            />
          </div>
        </div>
        <div className="mt-4 flex gap-2">
          {!hasSavedData || isEditMode ? (
            <>
              <button
                onClick={handleSubmitInvoice}
                disabled={saving || isPreviewMode}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {isPreviewMode ? '预览模式不可提交' : (saving ? '保存中...' : '确认提交')}
              </button>
              {hasSavedData && isEditMode && (
                <button
                  onClick={() => setIsEditMode(false)}
                  className="px-6 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
                >
                  取消
                </button>
              )}
            </>
          ) : (
            <button
              onClick={handleEnableEditMode}
              disabled={isPreviewMode}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              修改
            </button>
          )}
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-xl shadow-sm p-6"
      >
        <h3 className="text-lg font-bold text-gray-800 mb-4">付费凭证上传</h3>
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={`border-2 border-dashed rounded-xl p-8 text-center transition-all ${
            isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 bg-gray-50'
          }`}
        >
          <i className="fas fa-cloud-upload-alt text-4xl text-gray-400 mb-3"></i>
          <p className="text-gray-600 mb-2">拖拽文件到此处，或点击上传</p>
          <input
            type="file"
            onChange={handleFileSelect}
            className="hidden"
            id="voucher-upload"
            accept="image/*"
          />
          <label
            htmlFor="voucher-upload"
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors cursor-pointer"
          >
            选择文件
          </label>
        </div>
        {selectedFile && (
          <div className="mt-3 p-3 bg-blue-50 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-700">{selectedFile.name}</span>
              <button
                onClick={() => setSelectedFile(null)}
                className="text-red-500 hover:text-red-700"
              >
                <i className="fas fa-times"></i>
              </button>
            </div>
            <img
              src={URL.createObjectURL(selectedFile)}
              alt="预览"
              className="max-h-48 rounded-lg mx-auto"
            />
          </div>
        )}
        {invoiceInfo.payment_voucher_url && !selectedFile && (
          <div className="mt-3 p-3 bg-green-50 rounded-lg">
            <p className="text-sm text-green-700">已上传凭证</p>
            <a
              href={invoiceInfo.payment_voucher_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-blue-600 hover:underline"
            >
              查看已上传凭证
            </a>
          </div>
        )}
        <button
          onClick={handleUploadVoucher}
          disabled={uploading || !selectedFile || isPreviewMode}
          className="mt-4 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
        >
          {isPreviewMode ? '预览模式不可上传' : (uploading ? '上传中...' : '提交')}
        </button>
      </motion.div>
    </div>
  );
}
