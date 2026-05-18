import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase/client';
import { motion } from 'framer-motion';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      let targetEmail = username;
      let targetPassword = password;

      if (!username.includes('@')) {
        targetEmail = `${username}@test.com`;
        targetPassword = `${password}_secure`;
      }

      console.log('[Auth] 正在向 Supabase 发起线上验证:', targetEmail);
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

      // Step 3: 等待Supabase Auth会话可用
      let sessionResult = await supabase.auth.getSession();
      let session = sessionResult.data?.session;
      let attempts = 0;
      const maxAttempts = 10;
      
      while ((!session || !session.user || !session.access_token) && attempts < maxAttempts) {
        console.log('[Auth] 等待会话保存... 尝试', attempts + 1, '/', maxAttempts);
        await new Promise((r) => setTimeout(r, 200));
        sessionResult = await supabase.auth.getSession();
        session = sessionResult.data?.session;
        attempts += 1;
      }

      console.log('[Auth] ✓ 会话验证完毕');
      console.log('[Auth] 会话有效:', !!session?.user);
      console.log('[Auth] Access Token存在:', !!session?.access_token);
      console.log('[Auth] 用户ID:', session?.user?.id);
      console.log('[Auth] 尝试次数:', attempts);

      if (!session || !session.user || !session.access_token) {
        console.error('[Auth] ✗ 会话验证失败');
        console.error('[Auth] 会话对象:', session);
        setError('登录后会话验证失败，请重试');
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
      switch (role) {
        case 'admin':
          console.log('[Auth] 导航到: /admin');
          navigate('/admin');
          break;
        case 'reviewer':
          console.log('[Auth] 导航到: /reviewer');
          navigate('/reviewer');
          break;
        case 'standard_exhibitor':
          console.log('[Auth] 导航到: /exhibitor/standard');
          navigate('/exhibitor/standard');
          break;
        case 'custom_exhibitor':
          console.log('[Auth] 导航到: /exhibitor/custom');
          navigate('/exhibitor/custom');
          break;
        default:
          console.log('[Auth] 导航到: / (默认)');
          navigate('/');
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
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
              placeholder="请输入密码"
              required
            />
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

        <div className="mt-6 text-xs text-gray-400 text-center">
          <p>测试账号：</p>
          <p>管理员: admin / admin123</p>
          <p>审图员: reviewer01 / pwd123</p>
          <p>标摊展商: 17700000000 / 80F77</p>
          <p>特装展商: 18800000000 / 80F88</p>
        </div>
      </motion.div>
    </div>
  );
}
