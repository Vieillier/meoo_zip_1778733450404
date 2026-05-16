import { supabase } from '../supabase/client';
import type { Session, User } from '@supabase/supabase-js';

export type UserRole = 'admin' | 'reviewer' | 'standard_exhibitor' | 'custom_exhibitor';

export interface UserProfile {
  id: string;
  username: string;
  display_name: string | null;
  role: UserRole;
  phone: string | null;
  avatar_url: string | null;
}

export interface AuthState {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
}

const VIRTUAL_EMAIL_DOMAIN = 'review.local';
const PASSWORD_SUFFIX = '_secure';

function generateVirtualEmail(username: string): string {
  return `${username.toLowerCase().replace(/[^a-z0-9]/g, '_')}@${VIRTUAL_EMAIL_DOMAIN}`;
}

export function normalizeExhibitorPassword(password: string): string {
  return password.length >= 6 ? password : `${password}${PASSWORD_SUFFIX}`;
}

export async function loginUser(username: string, password: string): Promise<{ session: Session | null; error: Error | null }> {
  const email = generateVirtualEmail(username);
  const normalizedPassword = normalizeExhibitorPassword(password);
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password: normalizedPassword,
  });
  return { session: data?.session || null, error };
}

export async function logoutUser(): Promise<{ error: Error | null }> {
  const { error } = await supabase.auth.signOut();
  return { error };
}

export async function getCurrentUser(): Promise<{ user: User | null; profile: UserProfile | null; error: Error | null }> {
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return { user: null, profile: null, error: authError };
  }
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();
  return { user, profile, error: profileError };
}

export function getRoleDisplayName(role: UserRole): string {
  const roleMap: Record<UserRole, string> = {
    admin: '管理员',
    reviewer: '审图员',
    standard_exhibitor: '标摊展商',
    custom_exhibitor: '特装展商',
  };
  return roleMap[role] || role;
}

export function isAdmin(role: UserRole): boolean {
  return role === 'admin';
}

export function isReviewer(role: UserRole): boolean {
  return role === 'reviewer';
}

export function isExhibitor(role: UserRole): boolean {
  return role === 'standard_exhibitor' || role === 'custom_exhibitor';
}

export function canManageUsers(role: UserRole): boolean {
  return role === 'admin' || role === 'reviewer';
}

export function canManageAllUsers(role: UserRole): boolean {
  return role === 'admin';
}
