import { useAuth } from '../contexts/AuthContext';
import { motion } from 'framer-motion';

const roleLabels: Record<string, string> = {
  admin: '管理员',
  reviewer: '审图员',
  standard_exhibitor: '标摊展商',
  custom_exhibitor: '特装展商'
};

const roleColors: Record<string, string> = {
  admin: 'bg-red-100 text-red-700 border-red-200',
  reviewer: 'bg-blue-100 text-blue-700 border-blue-200',
  standard_exhibitor: 'bg-green-100 text-green-700 border-green-200',
  custom_exhibitor: 'bg-purple-100 text-purple-700 border-purple-200'
};

export default function Dashboard() {
  const { user, profile, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full"
      >
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <i className="fas fa-user text-white text-3xl"></i>
          </div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">登录成功</h1>
          <p className="text-gray-500">欢迎访问审图平台</p>
        </div>

        <div className="space-y-4 mb-8">
          <div className="bg-gray-50 rounded-lg p-4">
            <label className="text-xs text-gray-500 uppercase tracking-wide">账号</label>
            <p className="text-lg font-medium text-gray-800">{profile?.username || user?.email}</p>
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <label className="text-xs text-gray-500 uppercase tracking-wide">显示名称</label>
            <p className="text-lg font-medium text-gray-800">{profile?.display_name || '-'}</p>
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <label className="text-xs text-gray-500 uppercase tracking-wide">身份角色</label>
            <div className="mt-2">
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${roleColors[profile?.role || ''] || 'bg-gray-100 text-gray-700'}`}>
                {roleLabels[profile?.role || ''] || profile?.role}
              </span>
            </div>
          </div>

          {profile?.phone && (
            <div className="bg-gray-50 rounded-lg p-4">
              <label className="text-xs text-gray-500 uppercase tracking-wide">联系电话</label>
              <p className="text-lg font-medium text-gray-800">{profile.phone}</p>
            </div>
          )}
        </div>

        <button
          onClick={handleLogout}
          className="w-full py-3 px-4 bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800 text-white font-medium rounded-lg transition-all duration-200 flex items-center justify-center gap-2"
        >
          <i className="fas fa-sign-out-alt"></i>
          退出登录
        </button>
      </motion.div>
    </div>
  );
}
