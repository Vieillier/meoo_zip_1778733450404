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

export const DEFAULT_ACCOUNTS: UserAccount[] = [
  {
    id: '1',
    username: 'admin',
    password: 'admin123',
    displayName: '管理员',
    role: 'admin'
  },
  {
    id: '2',
    username: 'reviewer01',
    password: 'pwd123',
    displayName: '审图员01',
    role: 'reviewer'
  },
  {
    id: '3',
    username: '17700000000',
    password: '80F77',
    displayName: '标摊展商联系人',
    role: 'standard_exhibitor',
    phone: '17700000000',
    email: '987654321@qq.com',
    exhibitorName: '标摊有限公司',
    hallNumber: '8.1',
    boothNumber: '80F77',
    boothArea: 9,
    boothHeight: 4,
    boothCategory: '标摊'
  },
  {
    id: '4',
    username: '18800000000',
    password: '80F88',
    displayName: '特装联系人',
    role: 'custom_exhibitor',
    phone: '18800000000',
    email: 'tezhuang@163.com',
    exhibitorName: '特装有限公司',
    hallNumber: '8.1',
    boothNumber: '80F88',
    boothArea: 9,
    boothHeight: 4.5,
    boothCategory: '特装'
  },
  {
    id: '5',
    username: '19900000000',
    password: '80F99',
    displayName: '超高联系人',
    role: 'custom_exhibitor',
    phone: '19900000000',
    email: 'chaogao@163.com',
    exhibitorName: '超高有限公司',
    hallNumber: '8.1',
    boothNumber: '80F99',
    boothArea: 9,
    boothHeight: 5,
    boothCategory: '特装'
  }
];

const STORAGE_KEY = 'review_platform_accounts';
const DATA_VERSION_KEY = 'review_platform_data_version';
const CURRENT_DATA_VERSION = '2';

function isAccountComplete(account: UserAccount): boolean {
  return !!(
    account.exhibitorName &&
    account.hallNumber &&
    account.boothNumber &&
    account.boothArea !== undefined &&
    account.boothHeight !== undefined &&
    account.boothCategory &&
    account.phone &&
    account.email
  );
}

function shouldResetData(storedAccounts: UserAccount[]): boolean {
  const exhibitorAccounts = storedAccounts.filter(a => a.role === 'standard_exhibitor' || a.role === 'custom_exhibitor');
  if (exhibitorAccounts.length === 0) return false;
  return exhibitorAccounts.some(a => !isAccountComplete(a));
}

export function getAccounts(): UserAccount[] {
  const stored = localStorage.getItem(STORAGE_KEY);
  const storedVersion = localStorage.getItem(DATA_VERSION_KEY);

  if (stored && storedVersion === CURRENT_DATA_VERSION) {
    const parsed = JSON.parse(stored);
    if (!shouldResetData(parsed)) {
      return parsed;
    }
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_ACCOUNTS));
  localStorage.setItem(DATA_VERSION_KEY, CURRENT_DATA_VERSION);
  return DEFAULT_ACCOUNTS;
}

export function updateAccount(updatedAccount: UserAccount): void {
  const accounts = getAccounts();
  const index = accounts.findIndex(a => a.id === updatedAccount.id);
  if (index !== -1) {
    accounts[index] = updatedAccount;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(accounts));
  }
}

export function updatePassword(username: string, newPassword: string): boolean {
  const accounts = getAccounts();
  const account = accounts.find(a => a.username === username);
  if (account) {
    account.password = newPassword;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(accounts));
    return true;
  }
  return false;
}

export function addAccount(account: UserAccount): void {
  const accounts = getAccounts();
  accounts.push(account);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(accounts));
}

export function deleteAccount(id: string): void {
  const accounts = getAccounts();
  const filtered = accounts.filter(a => a.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
}

export function validateLogin(username: string, password: string): UserAccount | null {
  const accounts = getAccounts();
  return accounts.find(a => a.username === username && a.password === password) || null;
}

export function getAccountByUsername(username: string): UserAccount | null {
  const accounts = getAccounts();
  return accounts.find(a => a.username === username) || null;
}

export function canManageUser(currentRole: UserRole, targetRole: UserRole): boolean {
  if (currentRole === 'admin') return true;
  if (currentRole === 'reviewer') {
    return targetRole === 'standard_exhibitor' || targetRole === 'custom_exhibitor';
  }
  return false;
}

export function getManageableRoles(currentRole: UserRole): UserRole[] {
  if (currentRole === 'admin') {
    return ['admin', 'reviewer', 'standard_exhibitor', 'custom_exhibitor'];
  }
  if (currentRole === 'reviewer') {
    return ['standard_exhibitor', 'custom_exhibitor'];
  }
  return [];
}

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
  const accounts = getAccounts();
  const newAccounts: UserAccount[] = [];
  let success = 0;
  let failed = 0;

  data.forEach(row => {
    if (!row.contactPhone || !row.boothNumber) {
      failed++;
      return;
    }

    const existingIndex = accounts.findIndex(a => a.username === row.contactPhone);
    const boothCategory: BoothCategory = row.boothHeight && row.boothHeight > 4 ? '特装' : '标摊';
    const role: UserRole = boothCategory === '特装' ? 'custom_exhibitor' : 'standard_exhibitor';

    const account: UserAccount = {
      id: existingIndex >= 0 ? accounts[existingIndex].id : Date.now().toString() + Math.random().toString(36).substr(2, 9),
      username: row.contactPhone,
      password: row.boothNumber,
      displayName: row.contactName || row.exhibitorName || '展商',
      role,
      phone: row.contactPhone,
      email: row.email || '',
      exhibitorName: row.exhibitorName || '',
      hallNumber: row.hallNumber || '',
      boothNumber: row.boothNumber,
      boothArea: row.boothArea || 9,
      boothHeight: row.boothHeight || 4,
      boothCategory
    };

    if (existingIndex >= 0) {
      accounts[existingIndex] = account;
    } else {
      accounts.push(account);
      newAccounts.push(account);
    }
    success++;
  });

  localStorage.setItem(STORAGE_KEY, JSON.stringify(accounts));
  return { success, failed, accounts: newAccounts };
}
