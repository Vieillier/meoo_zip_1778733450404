/**
 * Supabase 客户端。优先使用构建时注入的环境变量（见项目根目录 `.env.local`）。
 * 未配置时回退到 Meoo 嵌入网关或本地开发地址。
 */

import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

declare const process: { env: { SUPABASE_URL?: string; SUPABASE_ANON_KEY?: string } };

const LEGACY_MEOO_ANON_KEY =
  'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJvbGUiOiJhbm9uIiwiaWF0IjoxNzc3ODk2NjIyLCJleHAiOjEzMjg4NTM2NjIyfQ.89Do5Sn4Uyeokzg-Iisk0Hw5aoR-nKpSvi8COzRzINg';

export function getSupabaseUrl(): string {
  const envUrl = process.env.SUPABASE_URL?.trim();
  if (envUrl) return envUrl;
  const meooUrl = (window as any).MEOO_CONFIG?.meoo_app_access_url;
  if (meooUrl) {
    return `${meooUrl}/sb-api`;
  }
  return 'http://localhost:3015/sb-api';
}

export function getSupabaseAnonKey(): string {
  const envKey = process.env.SUPABASE_ANON_KEY?.trim();
  if (envKey) return envKey;
  return LEGACY_MEOO_ANON_KEY;
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
 * 强制刷新并验证访问令牌，确保Token有效且未过期
 * 用于关键操作（如数据导入）前的Token验证
 * @returns 返回有效的访问令牌或null（表示需要重新登录）
 */
export async function refreshAndValidateToken(): Promise<string | null> {
  try {
    console.log('[TokenValidation] 开始刷新Token...');
    
    // Step 1: 尝试刷新Token
    const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
    
    if (refreshError) {
      console.warn('[TokenValidation] Token刷新返回错误:', refreshError.message);
      // 如果刷新失败，继续尝试使用现有Token
    } else if (refreshData?.session) {
      console.log('[TokenValidation] Token已成功刷新');
    }

    // Step 2: 获取当前会话
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.error('[TokenValidation] 获取会话失败:', sessionError.message);
      return null;
    }

    if (!session?.access_token) {
      console.error('[TokenValidation] 会话不存在或Access Token为空');
      return null;
    }

    // Step 3: 验证Token是否过期
    if (session.expires_at) {
      const expiresAtMs = session.expires_at * 1000;
      const nowMs = Date.now();
      const timeUntilExpiry = expiresAtMs - nowMs;
      
      console.log('[TokenValidation] Token过期时间:', new Date(expiresAtMs).toISOString());
      console.log('[TokenValidation] 当前时间:', new Date(nowMs).toISOString());
      console.log('[TokenValidation] 距离过期还有:', Math.floor(timeUntilExpiry / 1000), '秒');
      
      // 如果Token即将在5分钟内过期，尝试刷新
      if (timeUntilExpiry < 5 * 60 * 1000) {
        console.log('[TokenValidation] Token即将过期，强制刷新...');
        const { data: forceRefreshData, error: forceRefreshError } = await supabase.auth.refreshSession();
        
        if (forceRefreshError || !forceRefreshData?.session?.access_token) {
          console.error('[TokenValidation] 强制刷新Token失败');
          return null;
        }
        
        console.log('[TokenValidation] Token强制刷新成功');
        return forceRefreshData.session.access_token;
      }
      
      // 如果Token已经过期
      if (expiresAtMs <= nowMs) {
        console.error('[TokenValidation] Token已过期');
        return null;
      }
    }

    console.log('[TokenValidation] Token验证成功，Token长度:', session.access_token.length);
    return session.access_token;
  } catch (error: any) {
    console.error('[TokenValidation] 验证过程中发生异常:', error);
    return null;
  }
}

/**
 * 获取有效的Token，必要时刷新，失败时抛出错误
 * 用于关键操作
 */
export async function getValidToken(): Promise<string> {
  const token = await refreshAndValidateToken();
  if (!token) {
    throw new Error('无法获取有效的身份凭证，请重新登录审图员账号。');
  }
  return token;
}
