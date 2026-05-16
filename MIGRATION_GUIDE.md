# 审图员登录与 Excel 导入修复指南

## 问题根源

审图员登录报错 `Invalid login credentials` 和导入时显示"会话已过期"，根本原因是：

1. **邮箱格式不一致**：Supabase Auth 中的现有账户使用 `@review.local` 邮箱格式（如 `reviewer01@review.local`）
2. **登录代码已更新**：前端登录代码已改为使用新的虚拟邮箱格式 `@test.com`（如 `reviewer01@test.com`）
3. **格式不匹配导致登录失败**：当审图员用账号 `reviewer01` 登录时，前端生成 `reviewer01@test.com` 去验证，但数据库中的账户邮箱是 `reviewer01@review.local`，所以认证失败
4. **无有效会话导致导入失败**：登录失败后没有有效的 `session.access_token`，所以"一键激活并导入"报会话已过期

---

## 修复步骤

### 步骤 1：在 Supabase 数据库中运行邮箱迁移脚本

**重要**：必须以超级用户/Service Role 身份运行此脚本。

在 Supabase SQL Editor 中，或使用 psql 执行以下脚本：
[migrations/20260516_migrate_email_domain.sql](migrations/20260516_migrate_email_domain.sql)

该脚本会：
- 将所有 `@review.local` 邮箱改为 `@test.com`
- 更新 profiles 表中的 username 与邮箱前缀保持一致

**验证**：运行后，查询 auth.users 表中是否还有 `@review.local` 的邮箱：
```sql
SELECT id, email FROM auth.users WHERE email LIKE '%@review.local';
-- 应返回 0 行
```

---

### 步骤 2：确保部署环境已应用新代码

- 前端登录代码已使用 `generateVirtualEmail()` 生成 `@test.com` 邮箱（已自动更新）
- 云函数 `create_exhibitor` 已加入 Token 验证和权限检查（已自动更新）
- 虚拟邮箱域统一为 `@test.com`（已自动更新）

**对于 Netlify 部署**：确保重新部署以获取最新代码。

---

### 步骤 3：审图员重新登录

1. 清除浏览器缓存（可选但推荐）
2. 用你的账号（例如 `reviewer01`）和密码重新登录
3. 前端会自动生成 `reviewer01@test.com` 与 `密码_secure` 去验证
4. 如果仍报错，检查：
   - Supabase 中 auth.users 表是否已迁移邮箱
   - 密码是否正确（密码拼接规则：≥6位不变，<6位拼接 `_secure` 后缀）

---

### 步骤 4：验证"一键激活并导入"功能

1. 审图员成功登录后，进入用户管理 -> 数据预览与导入
2. 选择 Excel 文件，进行数据预览
3. 点击"一键激活并导入"
4. 打开浏览器开发者工具 (F12)，查看 Console 和 Network：
   - Console 应显示：
     ```
     [Import] Sending request to Edge Function...
     [Import] Response status: 200
     [Import] Response result: {success: true, results: {...}}
     ```
   - Network 的 `create-exhibitor` 请求应返回 HTTP 200

---

## 关键代码变更

### 虚拟邮箱域统一
- **前端** `src/utils/auth.ts`：`VIRTUAL_EMAIL_DOMAIN = 'test.com'`
- **后端** `functions/create-exhibitor/index.ts`：默认 `VIRTUAL_EMAIL_DOMAIN = 'test.com'`，可通过环境变量覆盖

### 登录流程
- `src/pages/Login.tsx`：错误提示已增强，明确指出邮箱迁移问题
- `src/utils/auth.ts`：`generateVirtualEmail()` 和 `normalizeExhibitorPassword()` 保持一致

### Excel 导入流程
- `src/App.tsx` `handleActivate()` 函数：
  - 强制检查 `session.access_token` 存在
  - 为每条记录附加虚拟邮箱和密码
  - 使用 `supabase.functions.invoke()` 并显式传递 Authorization 头

### 云函数权限校验
- `functions/create-exhibitor/index.ts`：
  - 强制验证 Authorization Bearer Token
  - 确认用户角色为 `reviewer` 或 `admin`
  - 拒绝无效或过期的 Token

---

## 故障排查

| 现象 | 原因 | 解决方案 |
|-----|------|--------|
| 登录报 `Invalid login credentials` | 邮箱未迁移或格式不一致 | 运行迁移脚本 [20260516_migrate_email_domain.sql](migrations/20260516_migrate_email_domain.sql) |
| 导入报"会话已过期" | 登录失败，无有效 session | 先修复登录问题，重新登录 |
| 导入报"当前账号无权执行此导入操作" | 用户角色不是 `reviewer` 或 `admin` | 检查 profiles 表中该用户的 role 字段 |
| 导入报 HTTP 400/422 | 记录中的邮箱或密码格式不对 | 检查 Excel 中账号和密码格式，确保账号是纯数字或合法字符 |

---

## 文件清单

已创建或修改的文件：

1. **迁移脚本**
   - `migrations/20260516_migrate_email_domain.sql` ✨ 新增 - 邮箱格式迁移
   - `migrations/20260516_add_reviewer_rls.sql` ✨ 新增 - 审图员权限 RLS

2. **前端代码**
   - `src/utils/auth.ts` - 虚拟邮箱域改为 `@test.com`
   - `src/pages/Login.tsx` - 增强错误提示
   - `src/App.tsx` - 强化 Excel 导入 Token 校验

3. **后端代码**
   - `functions/create-exhibitor/index.ts` - 加入 Token 验证和权限检查

4. **测试数据**
   - `test-api.js` - 更新虚拟邮箱格式
   - `test-login-api.js` - 更新虚拟邮箱格式

---

## 预期效果

修复完成后：

✅ 审图员能以正确的邮箱格式登录  
✅ 登录后拥有有效的 `session.access_token`  
✅ 云函数能验证 Token 并确认审图员权限  
✅ Excel 导入能成功创建/更新展商账户  
✅ 展商登录时，展商工作台能显示完整的基础信息字段  

