import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { supabase } from '../supabase/client';
import { loginUser } from '../utils/auth';
import type { Session, User } from '@supabase/supabase-js';
import type { Tables } from '../supabase/types';

type Profile = Tables<'profiles'>;
type ExhibitorBooth = Tables<'exhibitor_booths'>;

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  booth: ExhibitorBooth | null;
  allBooths: ExhibitorBooth[];
  loading: boolean;
  login: (username: string, password: string) => Promise<{ error: Error | null }>;
  logout: () => Promise<void>;
  refreshBooth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [booth, setBooth] = useState<ExhibitorBooth | null>(null);
  const [allBooths, setAllBooths] = useState<ExhibitorBooth[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchProfileAndBooth = async (userId: string) => {
    // 并发获取 profile 和当前用户的单个 booth，显著提升登录和首屏加载速度
    const [profileResult, boothResult] = await Promise.all([
      supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle(),
      supabase
        .from('exhibitor_booths')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle()
    ]);

    const profileData = profileResult.data;
    setProfile(profileData);

    if (profileData) {
      if (profileData.role === 'admin' || profileData.role === 'reviewer') {
        // 如果是管理员/审图员，再异步获取所有展位
        const { data } = await supabase
          .from('exhibitor_booths')
          .select('*')
          .order('created_at', { ascending: false });
        setAllBooths(data || []);
        setBooth(null);
      } else {
        const boothData = boothResult.data;
        setBooth(boothData);
        setAllBooths(boothData ? [boothData] : []);
      }
    }
    return profileData;
  };

  const refreshBooth = async () => {
    if (user && profile) {
      // 刷新时也可以使用并发优化
      const [profileResult, boothResult] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).maybeSingle(),
        profile.role === 'admin' || profile.role === 'reviewer'
          ? supabase.from('exhibitor_booths').select('*').order('created_at', { ascending: false })
          : supabase.from('exhibitor_booths').select('*').eq('user_id', user.id).maybeSingle()
      ]);

      setProfile(profileResult.data);
      if (profile.role === 'admin' || profile.role === 'reviewer') {
        setAllBooths((boothResult.data as ExhibitorBooth[]) || []);
        setBooth(null);
      } else {
        const b = boothResult.data as ExhibitorBooth;
        setBooth(b);
        setAllBooths(b ? [b] : []);
      }
    }
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, newSession) => {
        console.log('[Auth] onAuthStateChange', event, { session: newSession });
        setSession(newSession);
        setUser(newSession?.user ?? null);
        if (newSession?.user) {
          setTimeout(async () => {
            await fetchProfileAndBooth(newSession.user.id);
          }, 0);
        } else {
          console.warn('[Auth] No active session on auth state change; protected routes should remain locked.');
          setProfile(null);
          setBooth(null);
          setAllBooths([]);
        }
        setLoading(false);
      }
    );

    supabase.auth.getSession().then(async ({ data: { session: existingSession } }) => {
      console.log('[Auth] initial getSession', { session: existingSession });
      setSession(existingSession);
      setUser(existingSession?.user ?? null);
      if (existingSession?.user) {
        await fetchProfileAndBooth(existingSession.user.id);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const login = async (username: string, password: string) => {
    const { error } = await loginUser(username, password);
    return { error };
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
    setBooth(null);
    setAllBooths([]);
  };

  return (
    <AuthContext.Provider value={{
      user, session, profile, booth, allBooths, loading,
      login, logout, refreshBooth
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
