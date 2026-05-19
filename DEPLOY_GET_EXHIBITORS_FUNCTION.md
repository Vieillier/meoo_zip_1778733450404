# 🚀 部署 get-exhibitors 云函数

## 问题说明

审图员列表为空，因为 `get-exhibitors` 云函数还没有部署更新。

## 解决方案

部署更新后的 `get-exhibitors` 云函数，让它可以查询审图员账号。

## 部署步骤

### 方法 1：使用 Supabase CLI（推荐）

#### 步骤 1：安装 Supabase CLI

```bash
# Windows
scoop install supabase

# macOS
brew install supabase/tap/supabase

# Linux
brew install supabase/tap/supabase
```

#### 步骤 2：登录 Supabase

```bash
supabase login
```

#### 步骤 3：链接项目

```bash
supabase link --project-ref your-project-ref
```

#### 步骤 4：部署云函数

```bash
supabase functions deploy get-exhibitors
```

#### 步骤 5：验证部署

```bash
# 查看云函数列表
supabase functions list
```

### 方法 2：使用 Supabase Dashboard

#### 步骤 1：打开 Supabase Dashboard

1. 登录 https://supabase.com
2. 选择你的项目
3. 进入 **Edge Functions**

#### 步骤 2：找到 get-exhibitors 函数

1. 在函数列表中找到 `get-exhibitors`
2. 点击进入编辑

#### 步骤 3：更新代码

复制 `functions/get-exhibitors/index.ts` 的完整代码，粘贴到编辑器中。

**关键修改**（第 62-66 行）：
```typescript
// 使用 service role 权限查询所有展商数据和审图员数据
const { data: profiles, error: profileError } = await supabaseUser
  .from('profiles')
  .select('*')
  .in('role', ['standard_exhibitor', 'custom_exhibitor', 'reviewer']);
```

#### 步骤 4：部署

1. 点击 **Deploy** 按钮
2. 等待部署完成

#### 步骤 5：验证

1. 进入 **Logs** 查看部署日志
2. 确认没有错误

### 方法 3：手动验证数据库

如果不想部署云函数，可以先验证数据库中是否有 `reviewer` 账号。

#### 步骤 1：打开 SQL Editor

1. 登录 Supabase Dashboard
2. 进入 **SQL Editor**

#### 步骤 2：查询 reviewer 账号

```sql
SELECT 
  id,
  username,
  display_name,
  role
FROM profiles
WHERE role = 'reviewer';
```

#### 步骤 3：查看结果

**如果有结果**：
- ✅ 数据库中有 reviewer 账号
- ❌ 需要部署云函数才能在前端显示

**如果没有结果**：
- ❌ 数据库中没有 reviewer 账号
- ✅ 需要先创建 reviewer 账号

## 创建初始 reviewer 账号

如果数据库中没有 reviewer 账号，可以通过以下方式创建：

### 方法 1：使用管理员界面

1. 管理员登录
2. 进入"用户管理" → "审图员列表"
3. 点击"新增审图员"
4. 填写信息：
   - 账号：reviewer
   - 密码：123456
   - 显示名称：审图员
5. 点击"确认"

### 方法 2：使用 SQL

```sql
-- 1. 创建 auth 用户
-- 注意：这需要在 Supabase Dashboard 的 Authentication 中手动创建

-- 2. 创建 profile 记录
INSERT INTO profiles (id, username, display_name, role)
VALUES (
  'auth-user-id',  -- 替换为实际的 auth.users.id
  'reviewer',
  '审图员',
  'reviewer'
);
```

## 验证修复

### 步骤 1：部署云函数

使用上述任一方法部署 `get-exhibitors` 云函数。

### 步骤 2：管理员登录

```
账号：admin
密码：[管理员密码]
```

### 步骤 3：查看审图员列表

```
用户管理 → 审图员列表
```

### 步骤 4：验证显示

**预期结果**：
- ✅ 审图员列表显示 reviewer 账号
- ✅ 显示账号、显示名称
- ✅ 可以编辑、删除

## 常见问题

### Q1：部署后审图员列表还是空的？

**A**：
1. 刷新页面（Ctrl + F5）
2. 清除浏览器缓存
3. 检查浏览器控制台是否有错误

### Q2：如何确认云函数已部署？

**A**：
1. 进入 Supabase Dashboard → Edge Functions
2. 查看 `get-exhibitors` 的部署时间
3. 查看 Logs 确认没有错误

### Q3：数据库中没有 reviewer 账号怎么办？

**A**：
1. 使用管理员界面新增审图员
2. 或使用 SQL 手动创建

## 总结

审图员列表为空的原因：
1. ❌ `get-exhibitors` 云函数还没有部署更新
2. ❌ 数据库中没有 reviewer 账号

解决方案：
1. ✅ 部署更新后的 `get-exhibitors` 云函数
2. ✅ 如果数据库中没有 reviewer 账号，先创建一个

**关键点**：修改后的云函数会查询 `role = 'reviewer'` 的账号，并返回给前端显示。
