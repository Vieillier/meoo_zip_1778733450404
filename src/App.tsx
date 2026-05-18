import { useState, useEffect, createContext, useContext, useRef, useCallback } from 'react';
import { HashRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import * as XLSX from 'xlsx';
import {
  UserRole,
  UserAccount,
  ROLE_LABELS,
  ROLE_ROUTES,
  canManageUser,
  getManageableRoles
} from './constants/users';
import { normalizeExhibitorPassword, generateVirtualEmail } from './utils/auth';
import ExhibitorDetailPage from './pages/ExhibitorDetail';
import Login from './pages/Login';

interface AuthContextType {
  user: UserAccount | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<{ error: Error | null }>;
  logout: () => void;
  accounts: UserAccount[];
  refreshAccounts: () => void;
  updateUserPassword: (username: string, newPassword: string) => Promise<boolean>;
  createUser: (account: Omit<UserAccount, 'id'>) => Promise<{ error: Error | null }>;
  removeUser: (id: string) => Promise<void>;
  editUser: (account: UserAccount) => Promise<void>;
  importUsers: (data: Array<{
    contactPhone: string;
    boothNumber: string;
    contactName?: string;
    exhibitorName?: string;
    hallNumber?: string;
    boothArea?: number;
    boothHeight?: number;
    email?: string;
  }>) => Promise<{ success: number; failed: number; accounts: UserAccount[] }>;
  getUserByUsername: (username: string) => Promise<UserAccount | null>;
  isPreviewMode: boolean;
  previewRole: UserRole | null;
  enterPreviewMode: (role: UserRole) => void;
  exitPreviewMode: () => void;
  authMode: 'supabase';
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};

function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserAccount | null>(null);
  const [accounts, setAccounts] = useState<UserAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [previewRole, setPreviewRole] = useState<UserRole | null>(null);
  const [authMode, setAuthMode] = useState<'supabase'>('supabase');

  const fetchAccountsFromDB = async () => {
    const { supabase } = await import('./supabase/client');

    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      // 如果没有会话，无法加载用户数据。必须重新登录。
      console.warn('[Auth] 无有效会话，无法加载用户数据');
      setAccounts([]);
      setLoading(false);
      return;
    }

    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('*');

    if (profileError || !profiles || profiles.length === 0) {
      console.warn('[Auth] 无法从Supabase加载用户数据:', profileError?.message);
      setAccounts([]);
      setLoading(false);
      return;
    }

    const { data: booths, error: boothError } = await supabase
      .from('exhibitor_booths')
      .select('*');

    const mappedAccounts: UserAccount[] = profiles.map((p: any) => {
      const booth = booths?.find((b: any) => b.user_id === p.id);
      return {
        id: p.id,
        username: p.username,
        password: booth?.booth_number || p.username,
        displayName: p.display_name || p.username,
        role: p.role as UserRole,
        phone: p.phone ?? undefined,
        email: booth?.email ?? undefined,
        exhibitorName: booth?.exhibitor_name ?? undefined,
        hallNumber: booth?.hall_number ?? undefined,
        boothNumber: booth?.booth_number ?? undefined,
        boothArea: booth?.booth_area ?? undefined,
        boothHeight: booth?.booth_height ?? undefined,
        boothCategory: booth?.booth_category as '标摊' | '特装'
      };
    });

    // CRITICAL: 不再混合本地Mock账户和Supabase数据
    // 现在只使用Supabase数据
    setAccounts(mappedAccounts);
    setLoading(false);
  };

  useEffect(() => {
    const initializeAuth = async () => {
      const { supabase } = await import('./supabase/client');
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (session?.user) {
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .maybeSingle();

        if (profile && !profileError) {
          const { data: booth } = await supabase
            .from('exhibitor_booths')
            .select('*')
            .eq('user_id', session.user.id)
            .maybeSingle();

          setUser({
            id: profile.id,
            username: profile.username,
            password: '',
            displayName: profile.display_name || profile.username,
            role: profile.role as UserRole,
            phone: profile.phone ?? undefined,
            email: booth?.email ?? undefined,
            exhibitorName: booth?.exhibitor_name ?? undefined,
            hallNumber: booth?.hall_number ?? undefined,
            boothNumber: booth?.booth_number ?? undefined,
            boothArea: booth?.booth_area ?? undefined,
            boothHeight: booth?.booth_height ?? undefined,
            boothCategory: booth?.booth_category as '标摊' | '特装'
          });
        } else {
          console.warn('Unable to restore authenticated user from persisted session.', {
            sessionError,
            profileError,
            userId: session.user.id,
          });
        }
      }

      await fetchAccountsFromDB();
    };

    initializeAuth();
  }, []);

  const refreshAccounts = () => {
    fetchAccountsFromDB();
  };

  const login = async (username: string, password: string) => {
    try {
      const { supabase } = await import('./supabase/client');
      
      // 1. 重新加回自动包装逻辑
      let targetEmail = username;
      let targetPassword = password;

      // 如果账号不包含 @ 符号（说明输入的是纯数字手机号/账号），就自动补齐
      if (!username.includes('@')) {
        targetEmail = `${username}@test.com`;
        targetPassword = `${password}_secure`;
      }

      console.log(`[Auth] 正在向 Supabase 发起线上验证: ${targetEmail}`);
      
      // 2. 将包装好的凭证发给 Supabase
      const { data, error } = await supabase.auth.signInWithPassword({
        email: targetEmail,
        password: targetPassword,
      });

      if (error) throw error;
      
      return { error: null };
    } catch (err: any) {
      console.error('[Auth] 真实登录失败:', err.message);
      return { error: err };
    }
  };

  const logout = async () => {
    const { supabase } = await import('./supabase/client');
    await supabase.auth.signOut();
    setUser(null);
    setAuthMode('supabase');
  };

  const updateUserPassword = async (username: string, newPassword: string) => {
    const { supabase } = await import('./supabase/client');
    const { data: user, error: userError } = await supabase
      .from('profiles')
      .select('id')
      .eq('username', username)
      .single();

    if (userError || !user?.id) {
      console.error('[Auth] 更新密码失败：无法找到用户', username, userError?.message);
      return false;
    }

    const userId = user.id;
    const { error: updateError } = await supabase.auth.admin.updateUserById(userId, {
      password: newPassword,
    });
    if (updateError) {
      console.error('[Auth] 更新密码失败', updateError.message);
      return false;
    }

    await refreshAccounts();
    return true;
  };

  const createUser = async (account: Omit<UserAccount, 'id'>) => {
    const { supabase } = await import('./supabase/client');
    const email = generateVirtualEmail(account.username);
    const normalizedPassword = normalizeExhibitorPassword(account.password);

    const { data: authData, error: signUpError } = await supabase.auth.signUp({
      email,
      password: normalizedPassword,
    });

    if (signUpError) {
      console.error('[Auth] 创建用户失败', signUpError.message);
      return { error: signUpError };
    }

    if (!authData?.user?.id) {
      console.error('[Auth] 创建用户失败：Supabase未返回user');
      return { error: new Error('Supabase未返回新用户ID') };
    }

    const userId = authData.user.id;
    const { error: profileError } = await supabase.from('profiles').insert({
      id: userId,
      username: account.username,
      display_name: account.displayName,
      role: account.role,
      phone: account.phone,
    });

    if (profileError) {
      console.error('[Auth] 创建用户失败：插入profile失败', profileError.message);
      return { error: profileError };
    }

    await fetchAccountsFromDB();
    return { error: null };
  };

  const removeUser = async (id: string) => {
    const { supabase } = await import('./supabase/client');
    const { error } = await supabase.auth.admin.deleteUser(id);
    if (error) {
      console.error('[Auth] 删除用户失败', error.message);
    }
    await refreshAccounts();
  };

  const editUser = async (account: UserAccount) => {
    const { supabase } = await import('./supabase/client');
    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        username: account.username,
        display_name: account.displayName,
        role: account.role,
        phone: account.phone,
      })
      .eq('id', account.id);

    if (profileError) {
      console.error('[Auth] 更新用户失败', profileError.message);
    }

    await refreshAccounts();
  };

  const importUsers = async (data: Array<{
    contactPhone: string;
    boothNumber: string;
    contactName?: string;
    exhibitorName?: string;
    hallNumber?: string;
    boothArea?: number;
    boothHeight?: number;
    email?: string;
  }>) => {
    // Excel导入逻辑已经由create_exhibitor云函数处理。
    // 这里保留空实现，用外部导入函数替代。
    console.warn('[Auth] importUsers() 已弃用，请使用create_exhibitor云函数导入数据');
    await refreshAccounts();
    return { success: 0, failed: data.length, accounts: [] };
  };

  const getUserByUsername = async (username: string) => {
    const { supabase } = await import('./supabase/client');
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('username', username)
      .single();
    if (error || !data) {
      console.error('[Auth] getUserByUsername失败', error?.message);
      return null;
    }
    return {
      id: data.id,
      username: data.username,
      password: '',
      displayName: data.display_name || data.username,
      role: data.role as UserRole,
      phone: data.phone ?? undefined,
      email: undefined,
      exhibitorName: undefined,
      hallNumber: undefined,
      boothNumber: undefined,
      boothArea: undefined,
      boothHeight: undefined,
      boothCategory: undefined,
    };
  };

  const enterPreviewMode = (role: UserRole) => {
    setIsPreviewMode(true);
    setPreviewRole(role);
  };

  const exitPreviewMode = () => {
    setIsPreviewMode(false);
    setPreviewRole(null);
  };

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      login,
      logout,
      accounts,
      refreshAccounts,
      updateUserPassword,
      createUser,
      removeUser,
      editUser,
      importUsers,
      getUserByUsername,
      isPreviewMode,
      previewRole,
      enterPreviewMode,
      exitPreviewMode,
      authMode
    }}>
      {children}
    </AuthContext.Provider>
  );
}


import FacilityApplication from './components/FacilityApplication';
import ApplicationOverview from './components/ApplicationOverview';
import CustomBoothReview from './components/CustomBoothReview';
import MeibanSubmission from './components/MeibanSubmission';
import MeibanOverview from './components/MeibanOverview';
import InvoicePayment from './components/InvoicePayment';
import BuilderInfo from './components/BuilderInfo';
import BoothInfo from './components/BoothInfo';
import QualificationDocuments from './components/QualificationDocuments';
import DrawingSubmission from './components/DrawingSubmission';
import FeeRulesConfig from './components/FeeRulesConfig';

function ExhibitorDashboard() {
  const { user, logout, isPreviewMode, previewRole, exitPreviewMode, loading: authLoading, authMode } = useAuth();
  const navigate = useNavigate();
  const [accountData, setAccountData] = useState<UserAccount | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'info' | 'facility' | 'meiban' | 'invoice' | 'qualification' | 'drawing'>('info');

  useEffect(() => {
    if (authLoading) return; // wait until auth initialization completes to avoid AuthSessionMissingError
    const fetchUserData = async () => {
      // 预览模式下使用模拟数据
      if (isPreviewMode && previewRole) {
        const isCustom = previewRole === 'custom_exhibitor';
        setAccountData({
          id: 'preview-id',
          username: '测试预览',
          password: '',
          displayName: '测试预览',
          role: previewRole,
          phone: '测试预览',
          email: '测试预览',
          exhibitorName: '测试预览',
          hallNumber: '测试预览',
          boothNumber: '测试预览',
          boothArea: 100,
          boothHeight: isCustom ? 5 : 4,
          boothCategory: isCustom ? '特装' : '标摊'
        });
        setLoading(false);
        return;
      }

      // CRITICAL: 移除本地认证模式处理。现在只支持Supabase认证。
      // 不再检查 authMode === 'local'

      // Supabase 认证模式下的数据加载
      const { supabase } = await import('./supabase/client');
      const { data: authData, error: authError } = await supabase.auth.getUser();

      if (authError || !authData?.user) {
        console.warn('Failed to get current Supabase user before loading exhibitor dashboard.', authError);
        setLoading(false);
        return;
      }

      const userId = authData.user.id;
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (profileError || !profile) {
        console.warn('No profile record found for current logged-in user.', {
          userId,
          profileError,
          expectedProfileFields: ['id', 'username', 'display_name', 'role', 'phone', 'avatar_url', 'created_at', 'updated_at']
        });
        setLoading(false);
        return;
      }

      const { data: booth } = await supabase
        .from('exhibitor_booths')
        .select('*')
        .eq('user_id', userId)
        .single();

      setAccountData({
        id: profile.id,
        username: profile.username,
        password: '',
        displayName: profile.display_name || profile.username,
        role: profile.role as UserRole,
        phone: profile.phone ?? undefined,
        email: booth?.email ?? undefined,
        exhibitorName: booth?.exhibitor_name ?? undefined,
        hallNumber: booth?.hall_number ?? undefined,
        boothNumber: booth?.booth_number ?? undefined,
        boothArea: booth?.booth_area ?? undefined,
        boothHeight: booth?.booth_height ?? undefined,
        boothCategory: booth?.booth_category as '标摊' | '特装'
      });
      setLoading(false);
    };

    fetchUserData();
  }, [user, isPreviewMode, previewRole, authLoading, authMode]);

  const handleLogout = () => {
    if (isPreviewMode) {
      exitPreviewMode();
    } else {
      logout();
    }
    navigate('/login');
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">加载中...</div>;
  }

  if (!accountData) {
    return <div className="min-h-screen flex items-center justify-center">未找到用户信息</div>;
  }

  const tabs = accountData.boothCategory === '特装'
    ? [
        { key: 'info', label: '基础信息' },
        { key: 'facility', label: '展位配套设施申请' },
        { key: 'qualification', label: '资质文件申报' },
        { key: 'drawing', label: '图纸申报' },
        { key: 'invoice', label: '开票信息及缴费' },
      ]
    : [
        { key: 'info', label: '基础信息' },
        { key: 'facility', label: '展位配套设施申请' },
        { key: 'meiban', label: '楣板信息提交' },
        { key: 'invoice', label: '开票信息及缴费' },
      ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-800">展商工作台</h1>
            {isPreviewMode && (
              <span className="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-sm font-medium">
                <i className="fas fa-eye mr-1"></i>预览模式
              </span>
            )}
          </div>
          <div className="flex gap-4 items-center">
            <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">
              {isPreviewMode ? '测试预览' : accountData.displayName}
            </span>
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
            >
              {isPreviewMode ? '退出预览' : '退出登录'}
            </button>
          </div>
        </div>

        <div className="flex gap-2 mb-6">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as typeof activeTab)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTab === tab.key
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'info' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl shadow-lg p-8"
          >
            <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
              <i className="fas fa-building text-blue-600"></i>
              基础信息
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="bg-gray-50 rounded-xl p-4">
                <label className="text-xs text-gray-500 uppercase tracking-wide">账号</label>
                <p className="text-lg font-semibold text-gray-800">{accountData.username}</p>
              </div>

              <div className="bg-gray-50 rounded-xl p-4">
                <label className="text-xs text-gray-500 uppercase tracking-wide">联系人姓名</label>
                <p className="text-lg font-semibold text-gray-800">{accountData.displayName}</p>
              </div>

              <div className="bg-gray-50 rounded-xl p-4">
                <label className="text-xs text-gray-500 uppercase tracking-wide">展位类别</label>
                <p className="text-lg font-semibold text-gray-800">
                  <span className={`inline-flex items-center px-2 py-1 rounded text-sm ${
                    accountData.boothCategory === '特装'
                      ? 'bg-purple-100 text-purple-700'
                      : 'bg-green-100 text-green-700'
                  }`}>
                    {accountData.boothCategory || '标摊'}
                  </span>
                </p>
              </div>

              <div className="bg-gray-50 rounded-xl p-4">
                <label className="text-xs text-gray-500 uppercase tracking-wide">展商名称</label>
                <p className="text-lg font-semibold text-gray-800">{accountData.exhibitorName || '-'}</p>
              </div>

              <div className="bg-gray-50 rounded-xl p-4">
                <label className="text-xs text-gray-500 uppercase tracking-wide">展馆号</label>
                <p className="text-lg font-semibold text-gray-800">{accountData.hallNumber || '-'}</p>
              </div>

              <div className="bg-gray-50 rounded-xl p-4">
                <label className="text-xs text-gray-500 uppercase tracking-wide">展位号</label>
                <p className="text-lg font-semibold text-blue-600">{accountData.boothNumber || '-'}</p>
              </div>

              <div className="bg-gray-50 rounded-xl p-4">
                <label className="text-xs text-gray-500 uppercase tracking-wide">展位面积</label>
                <p className="text-lg font-semibold text-gray-800">
                  {accountData.boothArea ? `${accountData.boothArea} m²` : '-'}
                </p>
              </div>

              <div className="bg-gray-50 rounded-xl p-4">
                <label className="text-xs text-gray-500 uppercase tracking-wide">展位高度</label>
                <p className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                  {accountData.boothHeight ? `${accountData.boothHeight} m` : '-'}
                  {accountData.boothHeight && (
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs ${
                      accountData.boothHeight >= 4.5
                        ? 'bg-red-100 text-red-700'
                        : 'bg-green-100 text-green-700'
                    }`}>
                      {accountData.boothHeight >= 4.5 ? '超高' : '不超高'}
                    </span>
                  )}
                </p>
              </div>

              <div className="bg-gray-50 rounded-xl p-4">
                <label className="text-xs text-gray-500 uppercase tracking-wide">联系人电话</label>
                <p className="text-lg font-semibold text-gray-800">{accountData.phone || '-'}</p>
              </div>

              <div className="bg-gray-50 rounded-xl p-4 md:col-span-2">
                <label className="text-xs text-gray-500 uppercase tracking-wide">联系邮箱</label>
                <p className="text-lg font-semibold text-gray-800">{accountData.email || '-'}</p>
              </div>
            </div>

            {accountData.boothCategory === '特装' && (
              <div className="mt-8 space-y-6">
                <BuilderInfo boothNumber={accountData.boothNumber || ''} isPreviewMode={isPreviewMode} />
                <BoothInfo boothNumber={accountData.boothNumber || ''} isPreviewMode={isPreviewMode} />
              </div>
            )}
          </motion.div>
        )}

        {activeTab === 'facility' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl shadow-lg p-8"
          >
            <h2 className="text-xl font-bold text-gray-800 mb-6">展位配套设施申请</h2>
            <FacilityApplication
              userId={accountData.id}
              exhibitorName={accountData.exhibitorName || accountData.displayName}
              hallNumber={accountData.hallNumber}
              boothNumber={accountData.boothNumber}
              onSubmit={() => alert('申报已提交')}
              isPreviewMode={isPreviewMode}
            />
          </motion.div>
        )}

        {activeTab === 'meiban' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl shadow-lg p-8"
          >
            <h2 className="text-xl font-bold text-gray-800 mb-6">楣板信息提交</h2>
            <MeibanSubmission userId={accountData.id} isPreviewMode={isPreviewMode} />
          </motion.div>
        )}

        {activeTab === 'qualification' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl shadow-lg p-8"
          >
            <h2 className="text-xl font-bold text-gray-800 mb-6">资质文件申报</h2>
            <QualificationDocuments boothNumber={accountData.boothNumber || ''} isPreviewMode={isPreviewMode} />
          </motion.div>
        )}

        {activeTab === 'drawing' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl shadow-lg p-8"
          >
            <h2 className="text-xl font-bold text-gray-800 mb-6">图纸申报</h2>
            <DrawingSubmission boothNumber={accountData.boothNumber || ''} isPreviewMode={isPreviewMode} />
          </motion.div>
        )}

        {activeTab === 'invoice' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl shadow-lg p-8"
          >
            <h2 className="text-xl font-bold text-gray-800 mb-6">开票信息及缴费</h2>
            <InvoicePayment userId={accountData.id} boothNumber={accountData.boothNumber || ''} isPreviewMode={isPreviewMode} />
          </motion.div>
        )}
      </div>
    </div>
  );
}

interface FilterState {
  exhibitorName: string;
  hallNumber: string;
  boothCategory: string;
  boothHeightRange: string;
}

interface PreviewAccount {
  id: string;
  username: string;
  password: string;
  displayName: string;
  role: UserRole;
  contactPhone: string;
  boothNumber: string;
  contactName?: string;
  exhibitorName?: string;
  hallNumber?: string;
  boothArea?: number;
  boothHeight?: number;
  boothCategory?: '标摊' | '特装';
  email?: string;
  phone?: string;
  isExisting: boolean;
}

function ExcelImportModal({
  onClose,
  onImport
}: {
  onClose: () => void;
  onImport: (result: { success: number; failed: number; updated: number }) => void;
}) {
  const { importUsers, accounts } = useAuth();
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSyncingAuth, setIsSyncingAuth] = useState(false);
  const [stage, setStage] = useState<'upload' | 'preview'>('upload');
  const [parsedData, setParsedData] = useState<PreviewAccount[]>([]);
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});
  const [fileName, setFileName] = useState('');
  const [rawExcelData, setRawExcelData] = useState<any[][]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const FIELD_OPTIONS = [
    { key: 'contactPhone', label: '联系人电话', required: true },
    { key: 'boothNumber', label: '展位号', required: true },
    { key: 'contactName', label: '联系人姓名', required: false },
    { key: 'exhibitorName', label: '展商名称', required: false },
    { key: 'hallNumber', label: '展馆号', required: false },
    { key: 'boothArea', label: '展位面积', required: false },
    { key: 'boothHeight', label: '展位高度', required: false },
    { key: 'email', label: '联系邮箱', required: false }
  ];

  const autoMapColumns = (headers: string[]): Record<string, string> => {
    const mapping: Record<string, string> = {};
    headers.forEach((header, index) => {
      const lowerHeader = header.toLowerCase().trim();
      for (const field of FIELD_OPTIONS) {
        if (
          lowerHeader.includes(field.label) ||
          lowerHeader === field.key.toLowerCase() ||
          (field.key === 'contactPhone' && (lowerHeader.includes('电话') || lowerHeader.includes('手机'))) ||
          (field.key === 'boothNumber' && (lowerHeader.includes('展位号') || lowerHeader.includes('展位编号'))) ||
          (field.key === 'contactName' && (lowerHeader.includes('姓名') || lowerHeader.includes('联系人'))) ||
          (field.key === 'exhibitorName' && (lowerHeader.includes('展商') || lowerHeader.includes('公司'))) ||
          (field.key === 'hallNumber' && (lowerHeader.includes('展馆') || lowerHeader.includes('展厅'))) ||
          (field.key === 'boothArea' && (lowerHeader.includes('面积'))) ||
          (field.key === 'boothHeight' && (lowerHeader.includes('高度'))) ||
          (field.key === 'email' && (lowerHeader.includes('邮箱') || lowerHeader.includes('邮件')))
        ) {
          mapping[index] = field.key;
          break;
        }
      }
    });
    return mapping;
  };

  const processFile = async (file: File) => {
    setIsProcessing(true);
    setFileName(file.name);
    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1, defval: '' }) as any[][];

      if (jsonData.length < 2) {
        alert('文件数据不足，请确保包含表头和数据行');
        setIsProcessing(false);
        return;
      }

      setRawExcelData(jsonData);
      const headers = jsonData[0].map((h: any) => String(h).trim());
      const autoMapping = autoMapColumns(headers);
      setColumnMapping(autoMapping);

      const dataRows = jsonData.slice(1);
      const previewAccounts: PreviewAccount[] = [];

      dataRows.forEach((row) => {
        const rowData: any = {};
        Object.entries(autoMapping).forEach(([colIndex, fieldKey]) => {
          const value = row[parseInt(colIndex)];
          if (fieldKey === 'boothArea' || fieldKey === 'boothHeight') {
            rowData[fieldKey] = parseFloat(value) || (fieldKey === 'boothArea' ? 9 : 4);
          } else {
            rowData[fieldKey] = value;
          }
        });

        if (rowData.contactPhone && rowData.boothNumber) {
          const existingAccount = accounts.find(a => a.username === rowData.contactPhone);
          const boothHeight = rowData.boothHeight || 4;
          const boothCategory: '标摊' | '特装' = boothHeight > 4 ? '特装' : '标摊';
          const role: UserRole = boothCategory === '特装' ? 'custom_exhibitor' : 'standard_exhibitor';

          previewAccounts.push({
            id: existingAccount ? existingAccount.id : Date.now().toString() + Math.random().toString(36).substr(2, 9),
            username: rowData.contactPhone,
            password: rowData.boothNumber,
            displayName: rowData.contactName || rowData.exhibitorName || '展商',
            role: role,
            contactPhone: rowData.contactPhone,
            boothNumber: rowData.boothNumber,
            contactName: rowData.contactName,
            exhibitorName: rowData.exhibitorName,
            hallNumber: rowData.hallNumber,
            boothArea: rowData.boothArea || 9,
            boothHeight: boothHeight,
            boothCategory: boothCategory,
            email: rowData.email,
            phone: rowData.contactPhone,
            isExisting: !!existingAccount
          });
        }
      });

      setParsedData(previewAccounts);
      setStage('preview');
    } catch (error) {
      alert('文件解析失败，请检查文件格式');
    }
    setIsProcessing(false);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && (file.name.endsWith('.xlsx') || file.name.endsWith('.xls') || file.name.endsWith('.csv'))) {
      processFile(file);
    } else {
      alert('请上传 .xlsx, .xls 或 .csv 格式的文件');
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

  const updatePreviewData = (index: number, field: keyof PreviewAccount, value: string | number) => {
    setParsedData(prev => prev.map((item, idx) => {
      if (idx !== index) return item;
      const updated = { ...item, [field]: value };
      if (field === 'contactPhone') {
        updated.username = String(value);
      }
      if (field === 'boothNumber') {
        updated.password = String(value);
      }
      if (field === 'contactName') {
        updated.displayName = String(value) || updated.exhibitorName || '展商';
      }
      if (field === 'exhibitorName') {
        updated.displayName = updated.contactName || String(value) || '展商';
      }
      if (field === 'boothHeight') {
        const height = parseFloat(String(value)) || 4;
        updated.boothHeight = height;
        updated.boothCategory = height > 4 ? '特装' : '标摊';
        updated.role = height > 4 ? 'custom_exhibitor' : 'standard_exhibitor';
      }
      return updated;
    }));
  };

  const handleActivate = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();

    if (parsedData.length === 0) return;

    setIsProcessing(true);
    setIsSyncingAuth(true);

    try {
      const { supabase, getValidAccessToken } = await import('./supabase/client');
      
      // Step 1: 直接获取当前有效的Token - 不依赖refreshSession()
      console.log('[Import] ==========================================');
      console.log('[Import] 开始导入流程...');
      console.log('[Import] 第1步: 获取有效的Access Token');
      
      let accessToken: string | null;
      try {
        accessToken = await getValidAccessToken();
        if (!accessToken) {
          console.error('[Import] 获取Token失败 - 可能原因：');
          console.error('[Import]   1. 用户未登录或会话已过期');
          console.error('[Import]   2. Supabase会话未正确建立或已丢失');
          console.error('[Import]   3. Token已过期，需要重新登录');
          throw new Error('审图员身份凭证无效，请重新登录审图员账号。');
        }
        console.log('[Import] ✓ 成功获取Token，长度:', accessToken.length);
      } catch (tokenError: any) {
        console.error('[Import] ✗ Token获取异常:', tokenError.message);
        throw tokenError;
      }

      // Step 2: 构建认证请求头
      console.log('[Import] 第2步: 构建请求头');
      const headers = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      };
      console.log('[Import] ✓ 请求头已准备，包含Authorization字段');
      console.log('[Import] ✓ Authorization: Bearer', accessToken.substring(0, 20) + '...');

      // Step 3: 准备导入数据
      console.log('[Import] 第3步: 准备导入数据');
      const payloadExhibitors = parsedData.map(item => ({
        ...item,
        email: item.email || generateVirtualEmail(String(item.username || item.contactPhone || '')),
        password: item.password || item.boothNumber || '',
      }));
      console.log('[Import] ✓ 已准备', payloadExhibitors.length, '条导入数据');

      // Step 4: 发送请求到云函数
      console.log('[Import] 第4步: 发送请求到create_exhibitor云函数...');
      let invokeResult: any;
      try {
        invokeResult = await supabase.functions.invoke('create_exhibitor', {
          body: JSON.stringify({ exhibitors: payloadExhibitors }),
          headers,
        });
        console.log('[Import] ✓ 云函数调用完成');
      } catch (invokeError: any) {
        console.error('[Import] ✗ 云函数调用异常:', invokeError);
        
        // 如果是认证相关错误，提示用户需要重新登录
        if (invokeError?.message?.includes('401') || invokeError?.message?.includes('Unauthorized')) {
          throw new Error('身份凭证在服务器端验证失败，请重新登录审图员账号。');
        }
        
        throw invokeError;
      }

      // Step 5: 解析响应
      console.log('[Import] 第5步: 解析响应...');
      const responseStatus = (invokeResult as any).status ?? 200;
      let result = (invokeResult as any).data;
      
      console.log('[Import] 响应状态码:', responseStatus);
      
      if (typeof result === 'string') {
        try {
          result = JSON.parse(result || '{}');
        } catch (parseError) {
          console.warn('[Import] 无法解析响应体为JSON:', parseError);
        }
      }

      // Step 6: 检查响应状态
      console.log('[Import] 第6步: 检查响应结果');
      if (responseStatus >= 400) {
        const errorMsg = result?.error || result?.message || `HTTP ${responseStatus}: 导入失败`;
        console.error('[Import] ✗ 服务器错误:', errorMsg);
        
        if (responseStatus === 401) {
          throw new Error('您的身份凭证在服务器端验证失败，请重新登录审图员账号。');
        }
        
        throw new Error(errorMsg);
      }

      if (!result || !result.results) {
        console.error('[Import] ✗ 响应无效：未返回有效结果');
        throw new Error('导入失败：服务器返回无效响应');
      }

      if (result.results.errors && result.results.errors.length > 0) {
        console.error('[Import] ✗ 部分数据导入失败:', result.results.errors);
        throw new Error('导入失败: ' + result.results.errors.join('; '));
      }

      console.log('[Import] ✓ 导入结果成功');
      console.log('[Import]   新增:', result.results.added);
      console.log('[Import]   更新:', result.results.updated);
      console.log('[Import]   失败:', result.results.failed);

      // Step 7: 更新本地状态
      const importData = parsedData.map(item => ({
        contactPhone: item.contactPhone,
        boothNumber: item.boothNumber,
        contactName: item.contactName,
        exhibitorName: item.exhibitorName,
        hallNumber: item.hallNumber,
        boothArea: item.boothArea,
        boothHeight: item.boothHeight,
        email: item.email
      }));
      importUsers(importData);

      setIsProcessing(false);
      setIsSyncingAuth(false);

      let message = '';
      if (result.results.added > 0) {
        message += `成功新增 ${result.results.added} 个账号`;
      }
      if (result.results.updated > 0) {
        message += (message ? '，' : '') + `更新 ${result.results.updated} 个已有账号`;
      }
      if (result.results.failed > 0) {
        message += (message ? '，' : '') + `失败 ${result.results.failed} 个`;
      }

      console.log('[Import] ==========================================');
      console.log('[Import] 导入流程完成！');
      alert(message || '导入完成');
      onImport({ success: result.results.added, failed: result.results.failed, updated: result.results.updated });
      onClose();
    } catch (error: any) {
      setIsProcessing(false);
      setIsSyncingAuth(false);
      
      console.error('[Import] ==========================================');
      console.error('[Import] ✗ 导入失败');
      console.error('[Import] 错误类型:', error?.constructor?.name);
      console.error('[Import] 错误消息:', error?.message);
      console.error('[Import] 错误详情:', error);
      console.error('[Import] ==========================================');
      
      // 处理Token相关错误的特殊提示
      let userMessage = error?.message || '导入失败，请稍后重试';
      
      if (error?.message?.includes('无法获取有效的身份凭证') || 
          error?.message?.includes('身份凭证') || 
          error?.message?.includes('重新登录')) {
        userMessage += '\n\n请在页面上方点击"重新登录"以刷新您的身份凭证。';
      }
      
      alert('导入失败: ' + userMessage);
    }
  };

  const newCount = parsedData.filter(item => !item.isExisting).length;
  const updateCount = parsedData.filter(item => item.isExisting).length;

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
        className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-y-auto"
      >
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-800">
              {stage === 'upload' ? '导入展商表格' : '数据预览与确认'}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <i className="fas fa-times text-xl"></i>
            </button>
          </div>

          {stage === 'upload' ? (
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              className={`border-2 border-dashed rounded-xl p-12 text-center transition-all ${
                isDragging
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-300 bg-gray-50 hover:border-gray-400'
              }`}
            >
              <div className="mb-4">
                <i className="fas fa-cloud-upload-alt text-5xl text-gray-400 mb-4"></i>
                <p className="text-lg text-gray-700 mb-2">拖拽文件到此处，或点击上传</p>
                <p className="text-sm text-gray-500">支持 .xlsx, .xls, .csv 格式</p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileSelect}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isProcessing}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {isProcessing ? '解析中...' : '选择文件'}
              </button>
            </div>
          ) : (
            <div>
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <i className="fas fa-file-excel text-green-600"></i>
                  <span className="font-medium">{fileName}</span>
                  <span className="text-sm text-gray-500">
                    共 {parsedData.length} 条记录
                  </span>
                </div>
                <div className="flex gap-4 text-sm">
                  <span className="text-blue-600">
                    <i className="fas fa-plus-circle mr-1"></i>
                    新增: {newCount} 个
                  </span>
                  <span className="text-orange-600">
                    <i className="fas fa-sync-alt mr-1"></i>
                    更新: {updateCount} 个
                  </span>
                </div>
              </div>

              <div className="mb-4 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <p className="text-sm text-yellow-800">
                  <i className="fas fa-info-circle mr-2"></i>
                  当前为预览模式，数据尚未写入系统。请核对无误后点击下方"一键激活并导入"按钮。
                </p>
              </div>

              <div className="mb-6 overflow-x-auto border rounded-lg max-h-[400px] overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-100 sticky top-0">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium text-gray-700">状态</th>
                      <th className="px-3 py-2 text-left font-medium text-gray-700">账号</th>
                      <th className="px-3 py-2 text-left font-medium text-gray-700">密码</th>
                      <th className="px-3 py-2 text-left font-medium text-gray-700">联系人姓名</th>
                      <th className="px-3 py-2 text-left font-medium text-gray-700">展位类别</th>
                      <th className="px-3 py-2 text-left font-medium text-gray-700">展商名称</th>
                      <th className="px-3 py-2 text-left font-medium text-gray-700">展馆号</th>
                      <th className="px-3 py-2 text-left font-medium text-gray-700">展位号</th>
                      <th className="px-3 py-2 text-left font-medium text-gray-700">展位面积</th>
                      <th className="px-3 py-2 text-left font-medium text-gray-700">展位高度</th>
                      <th className="px-3 py-2 text-left font-medium text-gray-700">联系人电话</th>
                      <th className="px-3 py-2 text-left font-medium text-gray-700">联系邮箱</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {parsedData.map((item, idx) => (
                      <tr key={idx} className={`hover:bg-gray-50 ${item.isExisting ? 'bg-orange-50' : ''}`}>
                        <td className="px-3 py-2">
                          {item.isExisting ? (
                            <span className="inline-flex items-center px-2 py-1 rounded text-xs bg-orange-100 text-orange-700">
                              <i className="fas fa-sync-alt mr-1"></i>更新
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-1 rounded text-xs bg-blue-100 text-blue-700">
                              <i className="fas fa-plus mr-1"></i>新增
                            </span>
                          )}
                        </td>
                        <td className="px-2 py-1">
                          <input
                            type="text"
                            value={item.username}
                            onChange={(e) => updatePreviewData(idx, 'contactPhone', e.target.value)}
                            className="w-28 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </td>
                        <td className="px-2 py-1">
                          <input
                            type="text"
                            value={item.password}
                            onChange={(e) => updatePreviewData(idx, 'boothNumber', e.target.value)}
                            className="w-24 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </td>
                        <td className="px-2 py-1">
                          <input
                            type="text"
                            value={item.contactName || ''}
                            onChange={(e) => updatePreviewData(idx, 'contactName', e.target.value)}
                            className="w-24 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="-"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <span className={`inline-flex items-center px-2 py-1 rounded text-xs ${
                            item.boothCategory === '特装'
                              ? 'bg-purple-100 text-purple-700'
                              : 'bg-green-100 text-green-700'
                          }`}>
                            {item.boothCategory || '标摊'}
                          </span>
                        </td>
                        <td className="px-2 py-1">
                          <input
                            type="text"
                            value={item.exhibitorName || ''}
                            onChange={(e) => updatePreviewData(idx, 'exhibitorName', e.target.value)}
                            className="w-32 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="-"
                          />
                        </td>
                        <td className="px-2 py-1">
                          <input
                            type="text"
                            value={item.hallNumber || ''}
                            onChange={(e) => updatePreviewData(idx, 'hallNumber', e.target.value)}
                            className="w-20 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="-"
                          />
                        </td>
                        <td className="px-2 py-1">
                          <input
                            type="text"
                            value={item.boothNumber}
                            onChange={(e) => updatePreviewData(idx, 'boothNumber', e.target.value)}
                            className="w-24 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </td>
                        <td className="px-2 py-1">
                          <input
                            type="number"
                            value={item.boothArea || 9}
                            onChange={(e) => updatePreviewData(idx, 'boothArea', parseFloat(e.target.value) || 9)}
                            className="w-20 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </td>
                        <td className="px-2 py-1">
                          <input
                            type="number"
                            step="0.1"
                            value={item.boothHeight || 4}
                            onChange={(e) => updatePreviewData(idx, 'boothHeight', parseFloat(e.target.value) || 4)}
                            className="w-20 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </td>
                        <td className="px-2 py-1">
                          <input
                            type="text"
                            value={item.phone || ''}
                            onChange={(e) => updatePreviewData(idx, 'contactPhone', e.target.value)}
                            className="w-28 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="-"
                          />
                        </td>
                        <td className="px-2 py-1">
                          <input
                            type="email"
                            value={item.email || ''}
                            onChange={(e) => updatePreviewData(idx, 'email', e.target.value)}
                            className="w-40 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="-"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {isSyncingAuth && (
                <div className="mb-3 text-sm text-yellow-700 bg-yellow-100 rounded-lg px-3 py-2">
                  正在同步身份，请稍候再点击“一键激活并导入”。
                </div>
              )}
              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={handleActivate}
                  disabled={isProcessing || isSyncingAuth || parsedData.length === 0}
                  className="flex-1 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed font-medium flex items-center justify-center gap-2"
                >
                  <i className="fas fa-check-circle"></i>
                  {isProcessing ? '激活中...' : '一键激活并导入'}
                </button>
                <button
                  onClick={() => { setStage('upload'); setParsedData([]); setColumnMapping({}); setFileName(''); setRawExcelData([]); }}
                  className="flex-1 py-3 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors font-medium"
                >
                  重新上传
                </button>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

function FilterDropdown({
  label,
  options,
  value,
  onChange,
  placeholder
}: {
  label: string;
  options: string[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const uniqueOptions = Array.from(new Set(options.filter(Boolean)));

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1 px-2 py-1 text-sm font-medium text-gray-700 hover:text-blue-600 transition-colors"
      >
        {label}
        <i className={`fas fa-chevron-down text-xs transition-transform ${isOpen ? 'rotate-180' : ''}`}></i>
        {value && <span className="ml-1 w-2 h-2 bg-blue-500 rounded-full"></span>}
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-20 min-w-[150px]"
          >
            <div className="p-2">
              <button
                onClick={() => { onChange(''); setIsOpen(false); }}
                className={`w-full text-left px-3 py-2 rounded text-sm hover:bg-gray-100 ${!value ? 'bg-blue-50 text-blue-600' : ''}`}
              >
                全部
              </button>
              {uniqueOptions.map((option) => (
                <button
                  key={option}
                  onClick={() => { onChange(option); setIsOpen(false); }}
                  className={`w-full text-left px-3 py-2 rounded text-sm hover:bg-gray-100 ${value === option ? 'bg-blue-50 text-blue-600' : ''}`}
                >
                  {option}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)}></div>
      )}
    </div>
  );
}

type ReviewerTab = 'users' | 'applications' | 'meiban' | 'customReview';

function UserManagementPage() {
  const { user, accounts, logout, updateUserPassword, createUser, removeUser, editUser, importUsers, refreshAccounts, isPreviewMode, exitPreviewMode } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<ReviewerTab>('users');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importData, setImportData] = useState('');
  const [importResult, setImportResult] = useState<{ success: number; failed: number } | null>(null);
  const [editingUser, setEditingUser] = useState<UserAccount | null>(null);
  const [filters, setFilters] = useState<FilterState>({
    exhibitorName: '',
    hallNumber: '',
    boothCategory: '',
    boothHeightRange: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [newUser, setNewUser] = useState({
    username: '',
    password: '',
    displayName: '',
    role: 'standard_exhibitor' as UserRole,
    phone: '',
    email: '',
    exhibitorName: '',
    hallNumber: '',
    boothNumber: '',
    boothArea: 9,
    boothHeight: 4,
    boothCategory: '标摊' as '标摊' | '特装'
  });

  const tabs = [
    { key: 'users' as ReviewerTab, label: '用户管理' },
    { key: 'applications' as ReviewerTab, label: '申报情况' },
    { key: 'meiban' as ReviewerTab, label: '楣板信息' },
    { key: 'customReview' as ReviewerTab, label: '特装审图' }
  ];

  const manageableRoles = user ? getManageableRoles(user.role) : [];
  const filteredAccounts = accounts.filter(a => {
    if (!manageableRoles.includes(a.role)) return false;
    if (filters.exhibitorName && a.exhibitorName !== filters.exhibitorName) return false;
    if (filters.hallNumber && a.hallNumber !== filters.hallNumber) return false;
    if (filters.boothCategory && a.boothCategory !== filters.boothCategory) return false;
    if (filters.boothHeightRange) {
      const height = a.boothHeight || 0;
      if (filters.boothHeightRange === '4.5米及以上' && height < 4.5) return false;
      if (filters.boothHeightRange === '4.5米以下' && height >= 4.5) return false;
    }
    return true;
  });

  const exhibitorNames = accounts.filter(a => manageableRoles.includes(a.role)).map(a => a.exhibitorName || '');
  const hallNumbers = accounts.filter(a => manageableRoles.includes(a.role)).map(a => a.hallNumber || '');
  const boothCategories = ['标摊', '特装'];
  const boothHeightRanges = ['4.5米及以上', '4.5米以下'];

  const handleLogout = () => {
    if (isPreviewMode) {
      exitPreviewMode();
    } else {
      logout();
    }
    navigate('/login');
  };

  const handleAddUser = async () => {
    if (!newUser.username || !newUser.password) return;
    const role: UserRole = newUser.boothCategory === '特装' ? 'custom_exhibitor' : 'standard_exhibitor';

    try {
      const { supabase } = await import('./supabase/client');
      const email = generateVirtualEmail(newUser.username);
      const normalizedPassword = normalizeExhibitorPassword(newUser.password);
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password: normalizedPassword,
        options: {
          data: {
            username: newUser.username,
            display_name: newUser.displayName,
            role: role,
            phone: newUser.phone
          }
        }
      });

      if (authError) {
        console.error('Sign up failed details:', authError);
        alert('创建用户失败: ' + (authError.message || '未知错误'));
        return;
      }

      if (authData.user) {
        await supabase.from('profiles').upsert({
          id: authData.user.id,
          username: newUser.username,
          display_name: newUser.displayName,
          role: role,
          phone: newUser.phone,
        }, { onConflict: 'id' });

        try {
          await supabase.from('exhibitor_booths').insert({
            user_id: authData.user.id,
            exhibitor_name: newUser.exhibitorName || newUser.displayName,
            hall_number: newUser.hallNumber,
            booth_number: newUser.boothNumber,
            booth_area: newUser.boothArea,
            booth_height: newUser.boothHeight,
            booth_category: newUser.boothCategory,
            contact_name: newUser.displayName,
            contact_phone: newUser.phone,
            email: newUser.email
          });
        } catch (boothInsertError: any) {
          console.error('Failed to insert exhibitor_booths record for new user:', boothInsertError);
          alert('创建用户成功，但写入展位信息失败，请联系管理员。');
          return;
        }
      } else {
        // Supabase signUp 可能在某些策略下没有返回 user 对象，但用户已创建
        const { data: profileRecord, error: profileLookupError } = await supabase
          .from('profiles')
          .select('id')
          .eq('username', newUser.username)
          .maybeSingle();

        if (!profileRecord?.id || profileLookupError) {
          console.error('Unable to resolve new user id after signUp:', profileLookupError);
          alert('用户已创建，但未能找到新用户记录，请联系管理员。');
          return;
        }

        try {
          await supabase.from('exhibitor_booths').insert({
            user_id: profileRecord.id,
            exhibitor_name: newUser.exhibitorName || newUser.displayName,
            hall_number: newUser.hallNumber,
            booth_number: newUser.boothNumber,
            booth_area: newUser.boothArea,
            booth_height: newUser.boothHeight,
            booth_category: newUser.boothCategory,
            contact_name: newUser.displayName,
            contact_phone: newUser.phone,
            email: newUser.email
          });
        } catch (boothInsertError: any) {
          console.error('Failed to insert exhibitor_booths record for resolved new user:', boothInsertError);
          alert('创建用户成功，但写入展位信息失败，请联系管理员。');
          return;
        }
      }

      createUser({ ...newUser, role });
      setShowAddModal(false);
      setNewUser({
        username: '',
        password: '',
        displayName: '',
        role: 'standard_exhibitor',
        phone: '',
        email: '',
        exhibitorName: '',
        hallNumber: '',
        boothNumber: '',
        boothArea: 9,
        boothHeight: 4,
        boothCategory: '标摊'
      });
    } catch (error) {
      alert('创建用户失败');
    }
  };

  const handleEditUser = async () => {
    if (!editingUser) return;

    try {
      const { supabase } = await import('./supabase/client');

      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          display_name: editingUser.displayName,
          phone: editingUser.phone
        })
        .eq('id', editingUser.id);

      if (profileError) {
        alert('更新用户信息失败: ' + profileError.message);
        return;
      }

      const { error: boothError } = await supabase
        .from('exhibitor_booths')
        .update({
          exhibitor_name: editingUser.exhibitorName,
          hall_number: editingUser.hallNumber,
          booth_number: editingUser.boothNumber,
          booth_area: editingUser.boothArea,
          booth_height: editingUser.boothHeight,
          booth_category: editingUser.boothCategory,
          contact_phone: editingUser.phone,
          email: editingUser.email
        })
        .eq('user_id', editingUser.id);

      if (boothError) {
        alert('更新展位信息失败: ' + boothError.message);
        return;
      }

      editUser(editingUser);
      setShowEditModal(false);
      setEditingUser(null);
      alert('用户信息已更新');
    } catch (error: any) {
      alert('更新失败: ' + error.message);
    }
  };

  const handleResetPassword = (username: string) => {
    const newPassword = prompt('请输入新密码:');
    if (newPassword) {
      updateUserPassword(username, newPassword);
      alert('密码已重置');
    }
  };

  const handleDeleteUser = async (id: string) => {
    if (!confirm('确定要删除此用户吗?')) return;

    const { supabase, getSupabaseUrl, getAuthHeaders } = await import('./supabase/client');
    const headers = await getAuthHeaders();

    try {
      const response = await fetch(`${getSupabaseUrl()}/functions/v1/delete-user`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ userId: id })
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || '删除失败');
      }

      removeUser(id);
      alert('用户已删除');
    } catch (error: any) {
      alert('删除失败: ' + error.message);
    }
  };

  const handleImport = async () => {
    try {
      const lines = importData.trim().split('\n');
      const headers = lines[0].split(/\t|,/).map(h => h.trim());
      const data: Array<{
        contactPhone: string;
        boothNumber: string;
        contactName?: string;
        exhibitorName?: string;
        hallNumber?: string;
        boothArea?: number;
        boothHeight?: number;
        email?: string;
      }> = [];

      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(/\t|,/).map(v => v.trim());
        if (values.length >= 2) {
          const row: any = {};
          headers.forEach((header, idx) => {
            const value = values[idx];
            if (header.includes('电话') || header.includes('手机') || header === '联系人电话') {
              row.contactPhone = value;
            } else if (header.includes('展位号') || header === 'boothNumber') {
              row.boothNumber = value;
            } else if (header.includes('姓名') || header === 'contactName') {
              row.contactName = value;
            } else if (header.includes('展商') || header === 'exhibitorName') {
              row.exhibitorName = value;
            } else if (header.includes('展馆') || header === 'hallNumber') {
              row.hallNumber = value;
            } else if (header.includes('面积') || header === 'boothArea') {
              row.boothArea = parseFloat(value) || 9;
            } else if (header.includes('高度') || header === 'boothHeight') {
              row.boothHeight = parseFloat(value) || 4;
            } else if (header.includes('邮箱') || header === 'email') {
              row.email = value;
            }
          });
          if (row.contactPhone && row.boothNumber) {
            data.push(row);
          }
        }
      }

      const result = await importUsers(data);
      setImportResult({ success: result.success, failed: result.failed });
      setImportData('');
      setTimeout(() => setImportResult(null), 3000);
    } catch (error) {
      alert('导入失败，请检查数据格式');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-2xl shadow-lg p-8 mb-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-800">
                {user?.role === 'admin' ? '管理员工作台' : '审图员工作台'}
              </h1>
              {isPreviewMode && (
                <span className="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-sm font-medium">
                  <i className="fas fa-eye mr-1"></i>预览模式
                </span>
              )}
            </div>
            <div className="flex gap-4">
              <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">
                {isPreviewMode ? '测试预览' : (user?.displayName || user?.username)}
              </span>
              <button
                onClick={handleLogout}
                className="px-4 py-1 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-sm"
              >
                {isPreviewMode ? '退出预览' : '退出登录'}
              </button>
            </div>
          </div>

          <div className="flex gap-2 mb-6">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  activeTab === tab.key
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {activeTab === 'applications' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <FeeRulesConfig isAdmin={user?.role === 'admin'} />
            <ApplicationOverview />
          </motion.div>
        )}

        {activeTab === 'meiban' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <MeibanOverview />
          </motion.div>
        )}

        {activeTab === 'customReview' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <CustomBoothReview />
          </motion.div>
        )}

        {activeTab === 'users' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl shadow-lg p-8"
          >
            <h2 className="text-xl font-bold text-gray-800 mb-6">用户管理</h2>

            <div className="mb-6 flex gap-4">
              <button
                onClick={() => setShowAddModal(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                新增用户
              </button>
              <button
                onClick={() => setShowImportModal(true)}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                导入展商表格
              </button>
            </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1200px]">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">账号</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">密码</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">联系人姓名</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                  <FilterDropdown
                    label="展位类别"
                    options={boothCategories}
                    value={filters.boothCategory}
                    onChange={(value) => setFilters({ ...filters, boothCategory: value })}
                  />
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                  <FilterDropdown
                    label="展商名称"
                    options={exhibitorNames}
                    value={filters.exhibitorName}
                    onChange={(value) => setFilters({ ...filters, exhibitorName: value })}
                  />
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                  <FilterDropdown
                    label="展馆号"
                    options={hallNumbers}
                    value={filters.hallNumber}
                    onChange={(value) => setFilters({ ...filters, hallNumber: value })}
                  />
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">展位号</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">展位面积</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                  <FilterDropdown
                    label="展位高度"
                    options={boothHeightRanges}
                    value={filters.boothHeightRange}
                    onChange={(value) => setFilters({ ...filters, boothHeightRange: value })}
                  />
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">联系人电话</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">联系邮箱</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredAccounts.map((account) => (
                <tr key={account.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm text-gray-900">{account.username}</td>
                  <td className="px-4 py-3 text-sm text-gray-900">{account.password}</td>
                  <td className="px-4 py-3 text-sm text-gray-900">{account.displayName}</td>
                  <td className="px-4 py-3 text-sm text-gray-900">
                    <span className={`inline-flex items-center px-2 py-1 rounded text-xs ${
                      account.boothCategory === '特装'
                        ? 'bg-purple-100 text-purple-700'
                        : 'bg-green-100 text-green-700'
                    }`}>
                      {account.boothCategory || ROLE_LABELS[account.role]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900">{account.exhibitorName || '-'}</td>
                  <td className="px-4 py-3 text-sm text-gray-900">{account.hallNumber || '-'}</td>
                  <td className="px-4 py-3 text-sm text-gray-900 font-medium text-blue-600">{account.boothNumber || '-'}</td>
                  <td className="px-4 py-3 text-sm text-gray-900">{account.boothArea ? `${account.boothArea}m²` : '-'}</td>
                  <td className="px-4 py-3 text-sm text-gray-900">{account.boothHeight ? `${account.boothHeight}m` : '-'}</td>
                  <td className="px-4 py-3 text-sm text-gray-900">{account.phone || '-'}</td>
                  <td className="px-4 py-3 text-sm text-gray-900">{account.email || '-'}</td>
                  <td className="px-4 py-3 text-sm space-x-2">
                    <button
                      onClick={() => handleResetPassword(account.username)}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      重置密码
                    </button>
                    <button
                      onClick={() => { setEditingUser(account); setShowEditModal(true); }}
                      className="text-green-600 hover:text-green-800"
                    >
                      编辑
                    </button>
                    {account.id !== user?.id && (
                      <button
                        onClick={() => handleDeleteUser(account.id)}
                        className="text-red-600 hover:text-red-800"
                      >
                        删除
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <AnimatePresence>
          {showAddModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-white p-6 rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
              >
                <h2 className="text-xl font-bold mb-4">新增用户</h2>
                <div className="grid grid-cols-2 gap-4">
                  <input
                    type="text"
                    placeholder="账号 (联系人电话)"
                    value={newUser.username}
                    onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                    className="px-4 py-2 border border-gray-300 rounded-lg"
                  />
                  <input
                    type="text"
                    placeholder="密码 (展位号)"
                    value={newUser.password}
                    onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                    className="px-4 py-2 border border-gray-300 rounded-lg"
                    minLength={1}
                  />
                  <input
                    type="text"
                    placeholder="联系人姓名"
                    value={newUser.displayName}
                    onChange={(e) => setNewUser({ ...newUser, displayName: e.target.value })}
                    className="px-4 py-2 border border-gray-300 rounded-lg"
                  />
                  <select
                    value={newUser.boothCategory}
                    onChange={(e) => setNewUser({ ...newUser, boothCategory: e.target.value as '标摊' | '特装' })}
                    className="px-4 py-2 border border-gray-300 rounded-lg"
                  >
                    <option value="标摊">标摊</option>
                    <option value="特装">特装</option>
                  </select>
                  <input
                    type="text"
                    placeholder="展商名称"
                    value={newUser.exhibitorName}
                    onChange={(e) => setNewUser({ ...newUser, exhibitorName: e.target.value })}
                    className="px-4 py-2 border border-gray-300 rounded-lg"
                  />
                  <input
                    type="text"
                    placeholder="展馆号"
                    value={newUser.hallNumber}
                    onChange={(e) => setNewUser({ ...newUser, hallNumber: e.target.value })}
                    className="px-4 py-2 border border-gray-300 rounded-lg"
                  />
                  <input
                    type="text"
                    placeholder="展位号"
                    value={newUser.boothNumber}
                    onChange={(e) => setNewUser({ ...newUser, boothNumber: e.target.value })}
                    className="px-4 py-2 border border-gray-300 rounded-lg"
                  />
                  <input
                    type="number"
                    placeholder="展位面积 (m²)"
                    value={newUser.boothArea}
                    onChange={(e) => setNewUser({ ...newUser, boothArea: parseFloat(e.target.value) || 9 })}
                    className="px-4 py-2 border border-gray-300 rounded-lg"
                  />
                  <input
                    type="number"
                    placeholder="展位高度 (m)"
                    value={newUser.boothHeight}
                    onChange={(e) => setNewUser({ ...newUser, boothHeight: parseFloat(e.target.value) || 4 })}
                    className="px-4 py-2 border border-gray-300 rounded-lg"
                  />
                  <input
                    type="text"
                    placeholder="联系人电话"
                    value={newUser.phone}
                    onChange={(e) => setNewUser({ ...newUser, phone: e.target.value })}
                    className="px-4 py-2 border border-gray-300 rounded-lg"
                  />
                  <input
                    type="email"
                    placeholder="联系邮箱"
                    value={newUser.email}
                    onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                    className="px-4 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div className="flex gap-4 mt-6">
                  <button
                    onClick={handleAddUser}
                    className="flex-1 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    确认
                  </button>
                  <button
                    onClick={() => setShowAddModal(false)}
                    className="flex-1 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
                  >
                    取消
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}

          {showEditModal && editingUser && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-white p-6 rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
              >
                <h2 className="text-xl font-bold mb-4">编辑用户</h2>
                <div className="grid grid-cols-2 gap-4">
                  <input
                    type="text"
                    placeholder="联系人姓名"
                    value={editingUser.displayName}
                    onChange={(e) => setEditingUser({ ...editingUser, displayName: e.target.value })}
                    className="px-4 py-2 border border-gray-300 rounded-lg"
                  />
                  <select
                    value={editingUser.boothCategory || '标摊'}
                    onChange={(e) => setEditingUser({ ...editingUser, boothCategory: e.target.value as '标摊' | '特装' })}
                    className="px-4 py-2 border border-gray-300 rounded-lg"
                  >
                    <option value="标摊">标摊</option>
                    <option value="特装">特装</option>
                  </select>
                  <input
                    type="text"
                    placeholder="展商名称"
                    value={editingUser.exhibitorName || ''}
                    onChange={(e) => setEditingUser({ ...editingUser, exhibitorName: e.target.value })}
                    className="px-4 py-2 border border-gray-300 rounded-lg"
                  />
                  <input
                    type="text"
                    placeholder="展馆号"
                    value={editingUser.hallNumber || ''}
                    onChange={(e) => setEditingUser({ ...editingUser, hallNumber: e.target.value })}
                    className="px-4 py-2 border border-gray-300 rounded-lg"
                  />
                  <input
                    type="text"
                    placeholder="展位号"
                    value={editingUser.boothNumber || ''}
                    onChange={(e) => setEditingUser({ ...editingUser, boothNumber: e.target.value })}
                    className="px-4 py-2 border border-gray-300 rounded-lg"
                  />
                  <input
                    type="number"
                    placeholder="展位面积"
                    value={editingUser.boothArea || ''}
                    onChange={(e) => setEditingUser({ ...editingUser, boothArea: parseFloat(e.target.value) || 0 })}
                    className="px-4 py-2 border border-gray-300 rounded-lg"
                  />
                  <input
                    type="number"
                    placeholder="展位高度"
                    value={editingUser.boothHeight || ''}
                    onChange={(e) => setEditingUser({ ...editingUser, boothHeight: parseFloat(e.target.value) || 0 })}
                    className="px-4 py-2 border border-gray-300 rounded-lg"
                  />
                  <input
                    type="text"
                    placeholder="联系人电话"
                    value={editingUser.phone || ''}
                    onChange={(e) => setEditingUser({ ...editingUser, phone: e.target.value })}
                    className="px-4 py-2 border border-gray-300 rounded-lg"
                  />
                  <input
                    type="email"
                    placeholder="联系邮箱"
                    value={editingUser.email || ''}
                    onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
                    className="px-4 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div className="flex gap-4 mt-6">
                  <button
                    onClick={handleEditUser}
                    className="flex-1 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    确认
                  </button>
                  <button
                    onClick={() => setShowEditModal(false)}
                    className="flex-1 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
                  >
                    取消
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}

          {showImportModal && (
            <ExcelImportModal
              onClose={() => { setShowImportModal(false); setImportResult(null); }}
              onImport={(result) => {
                setImportResult(result);
                alert(`已成功激活 ${result.success} 个展商账号，现在可以正常登录。`);
                setTimeout(() => setImportResult(null), 3000);
              }}
            />
          )}
        </AnimatePresence>
          </motion.div>
        )}
      </div>
    </div>
  );
}

function ProtectedRoute({ children, allowedRoles }: { children: React.ReactNode; allowedRoles?: UserRole[] }) {
  const { user, loading, isPreviewMode, previewRole } = useAuth();

  if (loading) return <div className="min-h-screen flex items-center justify-center">加载中...</div>;

  // 预览模式下允许访问
  if (isPreviewMode && previewRole) {
    if (allowedRoles && !allowedRoles.includes(previewRole)) {
      return <Navigate to="/login" replace />;
    }
    return children;
  }

  if (!user) return <Navigate to="/login" replace />;
  if (allowedRoles && !allowedRoles.includes(user.role)) return <Navigate to="/login" replace />;

  return children;
}

function App() {
  return (
    <AuthProvider>
      <HashRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route
            path="/admin"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <UserManagementPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/reviewer"
            element={
              <ProtectedRoute allowedRoles={['reviewer']}>
                <UserManagementPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/exhibitor/standard"
            element={
              <ProtectedRoute allowedRoles={['standard_exhibitor']}>
                <ExhibitorDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/exhibitor/custom"
            element={
              <ProtectedRoute allowedRoles={['custom_exhibitor']}>
                <ExhibitorDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/exhibitor/detail/:id"
            element={
              <ProtectedRoute allowedRoles={['admin', 'reviewer']}>
                <ExhibitorDetailPage />
              </ProtectedRoute>
            }
          />
        </Routes>
      </HashRouter>
    </AuthProvider>
  );
}

export default App;
