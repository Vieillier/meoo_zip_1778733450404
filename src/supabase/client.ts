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
  if (data.session?.access_token) return data.session.access_token;
  console.warn('[Auth] No active Supabase access token available.');
  return null;
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

export function buildAuthHeaders(accessToken: string | null, extra: Record<string, string> = {}) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...extra,
  };
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
  return headers;
}
