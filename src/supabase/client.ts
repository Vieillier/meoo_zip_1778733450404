/**
 * Supabase 客户端。优先使用构建时注入的环境变量（见项目根目录 `.env.local`）。
 * 未配置时回退到 Meoo 嵌入网关或本地开发地址。
 */

import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

declare const process: {
  env: {
    VITE_SUPABASE_URL?: string;
    VITE_SUPABASE_ANON_KEY?: string;
    SUPABASE_URL?: string;
    SUPABASE_ANON_KEY?: string;
  };
};

declare global {
  interface ImportMetaEnv {
    VITE_SUPABASE_URL?: string;
    VITE_SUPABASE_ANON_KEY?: string;
    SUPABASE_URL?: string;
    SUPABASE_ANON_KEY?: string;
  }
}

const LEGACY_MEOO_ANON_KEY =
  'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJvbGUiOiJhbm9uIiwiaWF0IjoxNzc3ODk2NjIyLCJleHAiOjEzMjg4NTM2NjIyfQ.89Do5Sn4Uyeokzg-Iisk0Hw5aoR-nKpSvi8COzRzINg';

const DEFAULT_PUBLIC_SUPABASE_URL = 'https://aakexkggqspgpimfwlkn.supabase.co';
const DEFAULT_PUBLIC_ANON_KEY = 'sb_publishable_Bee1XtMi-nVORakNZqFhxw_EuvxtAVb';

export function getSupabaseUrl(): string {
  const envUrl = import.meta.env.VITE_SUPABASE_URL?.trim();
  if (envUrl) return envUrl;

  // 线上环境直接指向真实远端 Supabase 实例，不再回退到本地代理
  return DEFAULT_PUBLIC_SUPABASE_URL;
}

export function getSupabaseAnonKey(): string {
  const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();
  if (envKey) return envKey;
  return DEFAULT_PUBLIC_ANON_KEY || LEGACY_MEOO_ANON_KEY;
}

export const supabaseUrl = getSupabaseUrl();
export const supabaseAnonKey = getSupabaseAnonKey();

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
  },
});

export async function getAuthAccessToken(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token || null;
}

export async function waitForAuthAccessToken(timeoutMs = 5000, intervalMs = 200): Promise<string | null> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const token = await getAuthAccessToken();
    if (token) return token;
    await new Promise(resolve => setTimeout(resolve, intervalMs));
  }
  return null;
}

export async function getAuthHeaders(extra: Record<string, string> = {}) {
  const session = await supabase.auth.getSession();
  const accessToken = session.data.session?.access_token || await waitForAuthAccessToken();
  if (!accessToken) {
    throw new Error('未获取到有效访问令牌，请刷新页面后重试。');
  }
  return buildAuthHeaders(accessToken, extra);
}

export function buildAuthHeaders(accessToken: string | null, extra: Record<string, string> = {}) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...extra,
  };
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
  return headers;
}

/**
 * 直接获取并验证当前访问令牌
 * 异步调用 supabase.auth.getSession()，每次都获取最新会话
 * 不缓存结果，确保获取最新的Token
 * @returns 返回有效的访问令牌或null（表示需要重新登录）
 */
export async function getValidAccessToken(): Promise<string | null> {
  try {
    console.log('[TokenValidation] ==========================================');
    console.log('[TokenValidation] 步骤1: 异步获取当前会话');
    
    // 直接异步调用getSession()，每次都从Supabase Auth会话存储读取最新会话
    // 注意：这是异步操作，不会返回缓存的旧会话
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    
    console.log('[TokenValidation] getSession()调用完毕');
    console.log('[TokenValidation] 返回状态 - error:', sessionError?.message);
    console.log('[TokenValidation] 返回状态 - session:', !!sessionData?.session);

    if (sessionError) {
      console.error('[TokenValidation] ✗ getSession失败:', sessionError.message);
      console.log('[TokenValidation] 诊断: 可能是网络错误或Supabase连接问题');
      return null;
    }

    const session = sessionData?.session;

    if (!session) {
      console.error('[TokenValidation] ✗ 会话不存在');
      console.log('[TokenValidation] 诊断原因:');
      console.log('[TokenValidation]   - 用户未登录');
      console.log('[TokenValidation]   - Supabase会话存储中没有会话数据');
      console.log('[TokenValidation]   - 会话已过期');
      console.log('[TokenValidation] 解决方案: 用户需要重新登录');
      return null;
    }

    if (!session.user) {
      console.error('[TokenValidation] ✗ 会话中不存在用户信息');
      return null;
    }

    if (!session.access_token) {
      console.error('[TokenValidation] ✗ 会话中不存在Access Token');
      console.log('[TokenValidation] 会话对象:', {
        user_id: session.user?.id,
        expires_at: session.expires_at,
        has_access_token: !!session.access_token,
        has_refresh_token: !!session.refresh_token,
      });
      return null;
    }

    // 验证Token是否过期
    console.log('[TokenValidation] 步骤2: 验证Token有效性');
    const expiresAtMs = (session.expires_at || 0) * 1000;
    const nowMs = Date.now();
    
    console.log('[TokenValidation] Token过期时间 (Unix ms):', expiresAtMs);
    console.log('[TokenValidation] 当前时间 (Unix ms):', nowMs);
    console.log('[TokenValidation] Token过期日期:', new Date(expiresAtMs).toISOString());
    console.log('[TokenValidation] 当前日期:', new Date(nowMs).toISOString());

    if (expiresAtMs <= nowMs) {
      console.error('[TokenValidation] ✗ Access Token已过期');
      console.log('[TokenValidation] 已过期', Math.floor((nowMs - expiresAtMs) / 1000), '秒');
      console.log('[TokenValidation] 诊断: 需要刷新Token或重新登录');
      return null;
    }

    const timeUntilExpiry = expiresAtMs - nowMs;
    const secondsUntilExpiry = Math.floor(timeUntilExpiry / 1000);
    
    console.log('[TokenValidation] ✓ Token有效');
    console.log('[TokenValidation] 距离过期还有:', secondsUntilExpiry, '秒 (' + Math.ceil(secondsUntilExpiry / 60) + '分钟)');
    console.log('[TokenValidation] Access Token长度:', session.access_token.length);
    console.log('[TokenValidation] 用户ID:', session.user.id);
    console.log('[TokenValidation] ==========================================');
    console.log('[TokenValidation] ✓ Token验证成功！返回有效Token');
    
    return session.access_token;
  } catch (error: any) {
    console.error('[TokenValidation] ✗ Token验证过程异常:');
    console.error('[TokenValidation] 错误类型:', error?.constructor?.name);
    console.error('[TokenValidation] 错误消息:', error?.message);
    console.error('[TokenValidation] 错误堆栈:', error?.stack);
    return null;
  }
}

/**
 * 强制刷新Token（如果可能）并验证
 * 注意：此函数可能因为refresh_token缺失而失败，应作为可选步骤
 * @returns 返回有效的访问令牌或null
 */
export async function refreshAndValidateToken(): Promise<string | null> {
  try {
    console.log('[TokenValidation] 尝试刷新Token...');
    
    // 尝试刷新Token，但不要因为失败而放弃
    const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
    
    if (refreshError) {
      console.warn('[TokenValidation] Token刷新失败 - 这是正常的，将使用当前会话:', refreshError.message);
      // 继续使用当前会话，不中止流程
    } else if (refreshData?.session) {
      console.log('[TokenValidation] Token已成功刷新');
    }

    // 获取当前有效的Token（刷新成功则是新Token，失败则是原Token）
    return await getValidAccessToken();
  } catch (error: any) {
    console.error('[TokenValidation] 刷新过程异常，回退到获取当前Token:', error);
    // 如果刷新失败，尝试直接获取当前Token
    return await getValidAccessToken();
  }
}

/**
 * 获取有效的Token，失败时抛出错误
 * 用于关键操作
 */
export async function getValidToken(): Promise<string> {
  const token = await getValidAccessToken();
  if (!token) {
    throw new Error('无法获取有效的身份凭证，请重新登录审图员账号。');
  }
  return token;
}
