import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase/client';
import { loginUser } from '../utils/auth';
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
      const { session: authSession, error: authError } = await loginUser(username, password);
      const email = (username.toLowerCase().replace(/[^a-z0-9]/g, '_') || '') + '@test.com';
      console.log('[Auth] Login attempt:', { username, email, passwordLen: password.length, authError });

      if (authError) {
        console.error('[Auth] signInWithPassword failed:', authError);
        setError('登录失败：账号或密码错误，或邮箱尚未迁移至@test.com（请联系管理员）');
        setLoading(false);
        return;
      }

      // Ensure session is available/persisted before proceeding.
      let sessionResult = await supabase.auth.getSession();
      let session = sessionResult.data?.session;
      let attempts = 0;
      while ((!session || !session.user) && attempts < 10) {
        await new Promise((r) => setTimeout(r, 200));
        sessionResult = await supabase.auth.getSession();
        session = sessionResult.data?.session;
        attempts += 1;
      }
      console.log('Session saved:', !!session, {
        attempts,
        sessionUser: session?.user?.id ?? null,
        hasAccessToken: !!session?.access_token,
      });

      if (!session || !session.user) {
        setError('登录后会话未能建立，请重试');
        setLoading(false);
        return;
      }

      const userId = session.user.id;

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single();

      const role = profile?.role;
      switch (role) {
        case 'admin':
          navigate('/admin');
          break;
        case 'reviewer':
          navigate('/reviewer');
          break;
        case 'standard_exhibitor':
          navigate('/exhibitor/standard');
          break;
        case 'custom_exhibitor':
          navigate('/exhibitor/custom');
          break;
        default:
          navigate('/');
      }
    } catch {
      setError('登录失败，请重试');
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
