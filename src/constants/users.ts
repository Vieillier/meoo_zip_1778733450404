export type UserRole = 'admin' | 'reviewer' | 'standard_exhibitor' | 'custom_exhibitor';
export type BoothCategory = '标摊' | '特装';

export interface UserAccount {
  id: string;
  username: string;
  password: string;
  displayName: string;
  role: UserRole;
  phone?: string;
  email?: string;
  exhibitorName?: string;
  hallNumber?: string;
  boothNumber?: string;
  boothArea?: number;
  boothHeight?: number;
  boothCategory?: BoothCategory;
}

export const ROLE_LABELS: Record<UserRole, string> = {
  admin: '管理员',
  reviewer: '审图员',
  standard_exhibitor: '标摊展商',
  custom_exhibitor: '特装展商'
};

export const ROLE_ROUTES: Record<UserRole, string> = {
  admin: '/admin',
  reviewer: '/reviewer',
  standard_exhibitor: '/exhibitor/standard',
  custom_exhibitor: '/exhibitor/custom'
};

export const BOOTH_CATEGORY_MAP: Record<UserRole, BoothCategory> = {
  standard_exhibitor: '标摊',
  custom_exhibitor: '特装',
  admin: '标摊',
  reviewer: '标摊'
};

/**
 * 权限管理函数 - 判断当前用户是否可以管理目标用户
 * @param currentRole 当前用户角色
 * @param targetRole 目标用户角色
 * @returns 是否可以管理
 */
export function canManageUser(currentRole: UserRole, targetRole: UserRole): boolean {
  if (currentRole === 'admin') return true;
  if (currentRole === 'reviewer') {
    return targetRole === 'standard_exhibitor' || targetRole === 'custom_exhibitor';
  }
  return false;
}

/**
 * 获取当前用户可管理的角色列表
 * @param currentRole 当前用户角色
 * @returns 可管理的角色列表
 */
export function getManageableRoles(currentRole: UserRole): UserRole[] {
  if (currentRole === 'admin') {
    return ['admin', 'reviewer', 'standard_exhibitor', 'custom_exhibitor'];
  }
  if (currentRole === 'reviewer') {
    return ['standard_exhibitor', 'custom_exhibitor'];
  }
  return [];
}

/**
 * ⚠️ 说明：以下所有accountSUPABASE数据库操作的函数
 * 
 * 本项目已完全迁移到生产环境（GitHub + Netlify + Supabase）。
 * localStorage Mock数据库已禁用。所有账户、用户数据现在均通过Supabase API存取。
 * 
 * 如需进行用户管理操作，请在App.tsx中直接调用Supabase SDK：
 * 
 * const { supabase } = await import('./supabase/client');
 * 
 * // 获取所有用户
 * const { data: profiles } = await supabase
 *   .from('profiles')
 *   .select('*');
 * 
 * // 创建新用户
 * const { data, error } = await supabase.auth.admin.createUser({ ... });
 * 
 * // 删除用户
 * const { error } = await supabase.auth.admin.deleteUser(userId);
 * 
 * // 更新用户
 * const { error } = await supabase
 *   .from('profiles')
 *   .update({ ... })
 *   .eq('id', userId);
 */

/**
 * ❌ 已弃用：getAccounts()
 * 原因：localStorage Mock数据库已禁用
 * 替代方案：使用Supabase查询profiles表
 * @deprecated 使用 supabase.from('profiles').select('*') 替代
 */
export function getAccounts(): UserAccount[] {
  console.warn('[DEPRECATED] getAccounts() 已弃用，localStorage Mock数据库不再支持');
  console.warn('[HINT] 请使用 Supabase API 替代：supabase.from("profiles").select("*")');
  return [];
}

/**
 * ❌ 已弃用：updateAccount()
 * 原因：localStorage Mock数据库已禁用
 * 替代方案：使用Supabase更新profiles表
 * @deprecated 使用 supabase.from('profiles').update(...).eq('id', ...) 替代
 */
export function updateAccount(updatedAccount: UserAccount): void {
  console.warn('[DEPRECATED] updateAccount() 已弃用，localStorage Mock数据库不再支持');
  console.warn('[HINT] 请使用 Supabase API 替代：supabase.from("profiles").update(...).eq("id", ...)');
}

/**
 * ❌ 已弃用：updatePassword()
 * 原因：localStorage Mock数据库已禁用
 * 替代方案：使用Supabase Admin API更新用户密码
 * @deprecated 使用 supabase.auth.admin.updateUserById(...) 替代
 */
export function updatePassword(username: string, newPassword: string): boolean {
  console.warn('[DEPRECATED] updatePassword() 已弃用，localStorage Mock数据库不再支持');
  console.warn('[HINT] 请使用 Supabase Admin API 替代：supabase.auth.admin.updateUserById(...)');
  return false;
}

/**
 * ❌ 已弃用：addAccount()
 * 原因：localStorage Mock数据库已禁用
 * 替代方案：使用Supabase创建新用户
 * @deprecated 使用 supabase.auth.admin.createUser(...) 替代
 */
export function addAccount(account: UserAccount): void {
  console.warn('[DEPRECATED] addAccount() 已弃用，localStorage Mock数据库不再支持');
  console.warn('[HINT] 请使用 Supabase API 替代：supabase.auth.admin.createUser(...) 和 supabase.from("profiles").insert(...)');
}

/**
 * ❌ 已弃用：deleteAccount()
 * 原因：localStorage Mock数据库已禁用
 * 替代方案：使用Supabase删除用户
 * @deprecated 使用 supabase.auth.admin.deleteUser(...) 替代
 */
export function deleteAccount(id: string): void {
  console.warn('[DEPRECATED] deleteAccount() 已弃用，localStorage Mock数据库不再支持');
  console.warn('[HINT] 请使用 Supabase Admin API 替代：supabase.auth.admin.deleteUser(...)');
}

/**
 * ❌ 已弃用：validateLogin()
 * 原因：localStorage Mock数据库已禁用
 * 替代方案：使用Supabase Auth API进行身份验证
 * @deprecated 使用 supabase.auth.signInWithPassword(...) 替代
 */
export function validateLogin(username: string, password: string): UserAccount | null {
  console.warn('[DEPRECATED] validateLogin() 已弃用，localStorage Mock数据库不再支持');
  console.warn('[HINT] 请使用 Supabase Auth API 替代：supabase.auth.signInWithPassword(...)');
  return null;
}

/**
 * ❌ 已弃用：getAccountByUsername()
 * 原因：localStorage Mock数据库已禁用
 * 替代方案：使用Supabase查询profiles表
 * @deprecated 使用 supabase.from('profiles').select('*').eq('username', ...) 替代
 */
export function getAccountByUsername(username: string): UserAccount | null {
  console.warn('[DEPRECATED] getAccountByUsername() 已弃用，localStorage Mock数据库不再支持');
  console.warn('[HINT] 请使用 Supabase API 替代：supabase.from("profiles").select("*").eq("username", ...)');
  return null;
}

/**
 * ❌ 已弃用：importExhibitorsFromTable()
 * 原因：localStorage Mock数据库已禁用
 * 替代方案：使用Excel导入流程通过Netlify Edge Function
 * @deprecated 使用前端Excel导入组件通过create_exhibitor云函数替代
 */
export function importExhibitorsFromTable(data: Array<{
  contactPhone: string;
  boothNumber: string;
  contactName?: string;
  exhibitorName?: string;
  hallNumber?: string;
  boothArea?: number;
  boothHeight?: number;
  email?: string;
}>): { success: number; failed: number; accounts: UserAccount[] } {
  console.warn('[DEPRECATED] importExhibitorsFromTable() 已弃用，localStorage Mock数据库不再支持');
  console.warn('[HINT] 使用前端Excel导入组件，通过Netlify Edge Function的create_exhibitor函数处理');
  return { success: 0, failed: data.length, accounts: [] };
}
