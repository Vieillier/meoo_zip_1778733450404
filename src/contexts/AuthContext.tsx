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

  const fetchProfile = async (userId: string) => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();
    setProfile(data);
    return data;
  };

  const fetchBooth = async (userId: string, userRole: string) => {
    if (userRole === 'admin' || userRole === 'reviewer') {
      const { data } = await supabase
        .from('exhibitor_booths')
        .select('*')
        .order('created_at', { ascending: false });
      setAllBooths(data || []);
      setBooth(null);
    } else {
      const { data } = await supabase
        .from('exhibitor_booths')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();
      setBooth(data);
      setAllBooths(data ? [data] : []);
    }
  };

  const refreshBooth = async () => {
    if (user && profile) {
      await fetchBooth(user.id, profile.role);
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
            const profileData = await fetchProfile(newSession.user.id);
            if (profileData) {
              await fetchBooth(newSession.user.id, profileData.role);
            }
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
        const profileData = await fetchProfile(existingSession.user.id);
        if (profileData) {
          await fetchBooth(existingSession.user.id, profileData.role);
        }
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
