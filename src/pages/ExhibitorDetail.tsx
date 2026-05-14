import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { supabase } from '../supabase/client';
import { useAuth } from '../contexts/AuthContext';
import type { Tables } from '../supabase/types';

type Booth = Tables<'exhibitor_booths'>;
type Profile = Tables<'profiles'>;

interface ExhibitorData {
  profile: Profile;
  booth: Booth | null;
}

export default function ExhibitorDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { profile: currentUser } = useAuth();
  const [data, setData] = useState<ExhibitorData | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState<Partial<Booth>>({});

  useEffect(() => {
    if (!id) return;
    fetchExhibitorData();
  }, [id]);

  const fetchExhibitorData = async () => {
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (!profile) {
      setLoading(false);
      return;
    }

    const { data: booth } = await supabase
      .from('exhibitor_booths')
      .select('*')
      .eq('user_id', id)
      .maybeSingle();

    setData({ profile, booth });
    if (booth) setFormData(booth);
    setLoading(false);
  };

  const handleSave = async () => {
    if (!data || !id) return;

    if (data.booth) {
      await supabase
        .from('exhibitor_booths')
        .update(formData)
        .eq('id', data.booth.id);
    } else {
      await supabase
        .from('exhibitor_booths')
        .insert({
          ...formData,
          user_id: id,
          exhibitor_name: data.profile.display_name || data.profile.username
        });
    }

    setEditing(false);
    fetchExhibitorData();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 mb-4">展商不存在</p>
          <button
            onClick={() => navigate(-1)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg"
          >
            返回
          </button>
        </div>
      </div>
    );
  }

  const isReviewer = currentUser?.role === 'reviewer' || currentUser?.role === 'admin';

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-800"
          >
            <i className="fas fa-arrow-left"></i>
            返回
          </button>
          {isReviewer && (
            <button
              onClick={() => setEditing(!editing)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              {editing ? '取消' : '编辑'}
            </button>
          )}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl shadow-lg p-8"
        >
          <h1 className="text-2xl font-bold text-gray-800 mb-6">
            {data.profile.display_name || data.profile.username}
          </h1>

          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-gray-700 border-b pb-2">基本信息</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-gray-500">账号</label>
                  <p className="font-medium">{data.profile.username}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">角色</label>
                  <p className="font-medium">{data.profile.role}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">电话</label>
                  <p className="font-medium">{data.profile.phone || '-'}</p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-gray-700 border-b pb-2">展位信息</h2>
              {editing ? (
                <div className="grid grid-cols-2 gap-4">
                  <input
                    type="text"
                    placeholder="展馆号"
                    value={formData.hall_number || ''}
                    onChange={(e) => setFormData({ ...formData, hall_number: e.target.value })}
                    className="px-3 py-2 border rounded-lg"
                  />
                  <input
                    type="text"
                    placeholder="展位号"
                    value={formData.booth_number || ''}
                    onChange={(e) => setFormData({ ...formData, booth_number: e.target.value })}
                    className="px-3 py-2 border rounded-lg"
                  />
                  <input
                    type="number"
                    placeholder="展位面积"
                    value={formData.booth_area || ''}
                    onChange={(e) => setFormData({ ...formData, booth_area: parseFloat(e.target.value) })}
                    className="px-3 py-2 border rounded-lg"
                  />
                  <input
                    type="number"
                    placeholder="展位高度"
                    value={formData.booth_height || ''}
                    onChange={(e) => setFormData({ ...formData, booth_height: parseFloat(e.target.value) })}
                    className="px-3 py-2 border rounded-lg"
                  />
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-gray-500">展馆号</label>
                    <p className="font-medium">{data.booth?.hall_number || '-'}</p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-500">展位号</label>
                    <p className="font-medium">{data.booth?.booth_number || '-'}</p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-500">展位面积</label>
                    <p className="font-medium">{data.booth?.booth_area ? `${data.booth.booth_area}m²` : '-'}</p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-500">展位高度</label>
                    <p className="font-medium">{data.booth?.booth_height ? `${data.booth.booth_height}m` : '-'}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {editing && (
            <div className="mt-6 flex gap-4">
              <button
                onClick={handleSave}
                className="flex-1 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                保存
              </button>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
