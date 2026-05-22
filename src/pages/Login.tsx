import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase/client';
import { motion } from 'framer-motion';
import { useAuth } from '../App';
import { UserRole, ROLE_ROUTES } from '../constants/users';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const { enterPreviewMode } = useAuth();

  const handlePreview = (role: UserRole) => {
    enterPreviewMode(role);
    navigate(ROLE_ROUTES[role] || '/');
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      let targetEmail = username;
      let targetPassword = password;

      if (!username.includes('@')) {
        targetEmail = `${username}@test.com`;
        // 重要：只有当用户输入的原始密码 < 6 位时，才添加 _secure 后缀
        // 这与创建账号时的逻辑保持一致
        if (password.length < 6) {
          targetPassword = `${password}_secure`;
        }
      }

      console.log('[Auth] 正在向 Supabase 发起线上验证:', targetEmail);
      console.log('[Auth] 原始密码长度:', password.length);
      console.log('[Auth] 是否添加后缀:', password.length < 6 ? '是' : '否');
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: targetEmail,
        password: targetPassword,
      });

      if (signInError) {
        console.error('[Auth] ✗ signInWithPassword失败:', signInError);
        if (signInError.message.includes('Invalid login credentials')) {
          console.error('[Auth] 诊断: 账号或密码错误，或该账户不存在');
        } else if (signInError.message.includes('400')) {
          console.error('[Auth] 诊断: 请求参数有问题，检查邮箱或密码格式');
        }
        setError(`登录失败: ${signInError.message}`);
        setLoading(false);
        return;
      }

      if (!data?.session) {
        console.error('[Auth] ✗ 登录成功但未返回会话');
        setError('登录后会话未能建立，请重试');
        setLoading(false);
        return;
      }

      console.log('[Auth] ✓ signInWithPassword成功，已获取session');
      console.log('[Auth] Session用户ID:', data.session.user?.id);
      console.log('[Auth] 第3步: 验证会话是否已经成功建立');

      // Step 3: 直接使用登录返回的会话数据，无需轮询等待，显著提升登录速度
      const session = data?.session;

      if (!session || !session.user || !session.access_token) {
        console.error('[Auth] ✗ 会话无效');
        setError('登录后会话创建失败，请重试');
        setLoading(false);
        return;
      }

      console.log('[Auth] ✓ 会话有效，开始获取用户角色');
      const userId = session.user.id;

      // Step 4: 获取用户角色
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single();

      if (profileError) {
        console.error('[Auth] ✗ 获取用户角色失败:', profileError);
        setError('获取用户信息失败，请重试');
        setLoading(false);
        return;
      }

      const role = profile?.role;
      console.log('[Auth] ✓ 获取用户角色成功:', role);
      console.log('[Auth] ==========================================');
      console.log('[Auth] 登录流程完成，准备导航');

      // Step 5: 根据角色导航
      setLoading(false); // 重要：在导航前设置 loading 为 false

      switch (role) {
        case 'admin':
          console.log('[Auth] 导航到: /admin');
          navigate('/admin', { replace: true });
          break;
        case 'reviewer':
          console.log('[Auth] 导航到: /reviewer');
          navigate('/reviewer', { replace: true });
          break;
        case 'standard_exhibitor':
          console.log('[Auth] 导航到: /exhibitor/standard');
          navigate('/exhibitor/standard', { replace: true });
          break;
        case 'custom_exhibitor':
          console.log('[Auth] 导航到: /exhibitor/custom');
          navigate('/exhibitor/custom', { replace: true });
          break;
        default:
          console.log('[Auth] 导航到: / (默认)');
          navigate('/', { replace: true });
      }
    } catch (err: any) {
      console.error('[Auth] ✗ 登录异常:', err);
      setError(`登录异常: ${err?.message || '未知错误'}`);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md"
      >
        <h1 className="text-2xl font-bold text-center text-gray-800 mb-2">审图平台</h1>
        <p className="text-center text-gray-500 mb-6">请登录您的账号</p>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">账号</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
              placeholder="请输入账号"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">密码</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                placeholder="请输入密码"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors"
                title={showPassword ? '隐藏密码' : '显示密码'}
              >
                {showPassword ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-4.803m5.596-3.856a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0M15 12a3 3 0 11-6 0 3 3 0 016 0zm6 0c0 1.657-.672 3.157-1.757 4.243A6 6 0 0121 12a6 6 0 00-6-6 5.999 5.999 0 00-4.243 1.757M9 19.414l3.414-3.414m4.243-4.243l3.414 3.414" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {error && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-red-500 text-sm text-center"
            >
              {error}
            </motion.div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition font-medium"
          >
            {loading ? '登录中...' : '登录'}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-gray-200">
          <p className="text-center text-sm text-gray-500 mb-4">测试账号预览（只读沙箱）</p>
          <div className="grid grid-cols-3 gap-3">
            <button
              type="button"
              onClick={() => handlePreview('reviewer')}
              className="px-3 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors text-sm font-medium"
            >
              审图员预览
            </button>
            <button
              type="button"
              onClick={() => handlePreview('standard_exhibitor')}
              className="px-3 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors text-sm font-medium"
            >
              标摊展商预览
            </button>
            <button
              type="button"
              onClick={() => handlePreview('custom_exhibitor')}
              className="px-3 py-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors text-sm font-medium"
            >
              特装展商预览
            </button>
          </div>
          <p className="mt-4 text-xs text-gray-400 text-center">
            该模式为只读演示沙箱，不会调用 Supabase 登录，也不会执行增删改操作。
          </p>
        </div>
      </motion.div>
    </div>
  );
}
