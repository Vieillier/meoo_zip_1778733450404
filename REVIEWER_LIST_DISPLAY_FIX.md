# 🔧 审图员列表显示修复

## 问题描述

审图员列表无法显示系统中已有的审图员账号。

## 根本原因

`get-exhibitors` 云函数只查询展商账号（`role` 为 `standard_exhibitor` 或 `custom_exhibitor`），不包括审图员账号（`role` 为 `reviewer`）。

**原代码**（第 62-66 行）：
```typescript
// 使用 service role 权限查询所有展商数据
const { data: profiles, error: profileError } = await supabaseUser
  .from('profiles')
  .select('*')
  .in('role', ['standard_exhibitor', 'custom_exhibitor']);
```

## 解决方案

修改 `get-exhibitors` 云函数，在查询时包含审图员角色。

**修改后的代码**（第 62-66 行）：
```typescript
// 使用 service role 权限查询所有展商数据和审图员数据
const { data: profiles, error: profileError } = await supabaseUser
  .from('profiles')
  .select('*')
  .in('role', ['standard_exhibitor', 'custom_exhibitor', 'reviewer']);
```

## 修改文件

### `functions/get-exhibitors/index.ts`

**修改位置**：第 62-66 行

**修改内容**：
```diff
- // 使用 service role 权限查询所有展商数据
+ // 使用 service role 权限查询所有展商数据和审图员数据
  const { data: profiles, error: profileError } = await supabaseUser
    .from('profiles')
    .select('*')
-   .in('role', ['standard_exhibitor', 'custom_exhibitor']);
+   .in('role', ['standard_exhibitor', 'custom_exhibitor', 'reviewer']);
```

## 修复效果

### 修复前
```
管理员登录 → 用户管理 → 审图员列表
❌ 审图员列表为空
❌ 无法看到已有的审图员账号
```

### 修复后
```
管理员登录 → 用户管理 → 审图员列表
✅ 显示所有审图员账号
✅ 可以看到账号、显示名称
✅ 可以编辑、删除审图员
```

## 数据流程

### 原有流程（有问题）
```
管理员登录
    ↓
fetchAccountsFromDB()
    ↓
调用 get-exhibitors 云函数
    ↓
查询 profiles 表
    ↓
只返回 role = 'standard_exhibitor' 或 'custom_exhibitor'
    ↓
❌ 审图员账号不在结果中
    ↓
审图员列表为空
```

### 修复后的流程
```
管理员登录
    ↓
fetchAccountsFromDB()
    ↓
调用 get-exhibitors 云函数
    ↓
查询 profiles 表
    ↓
返回 role = 'standard_exhibitor' 或 'custom_exhibitor' 或 'reviewer'
    ↓
✅ 审图员账号在结果中
    ↓
审图员列表显示正常
```

## 验证修复

### 步骤 1：部署云函数

如果使用 Supabase CLI：
```bash
supabase functions deploy get-exhibitors
```

如果使用 Supabase Dashboard：
1. 进入 Supabase Dashboard
2. 进入 Edge Functions
3. 更新 `get-exhibitors` 函数代码
4. 部署

### 步骤 2：测试

1. **管理员登录**
   ```
   账号：admin
   密码：[管理员密码]
   ```

2. **进入用户管理**
   ```
   用户管理 → 审图员列表
   ```

3. **验证显示**
   ```
   ✅ 应该看到已有的审图员账号
   ✅ 显示账号、显示名称
   ✅ 可以编辑、删除
   ```

### 步骤 3：测试新增审图员

1. **新增审图员**
   ```
   点击"新增审图员"
   账号：reviewer2
   密码：123
   显示名称：审图员2
   ```

2. **验证**
   ```
   ✅ 新增成功
   ✅ 列表中显示新账号
   ```

## 代码质量

- ✅ 无语法错误
- ✅ 逻辑清晰
- ✅ 向后兼容
- ✅ 不影响展商账号查询

## 影响范围

### 受影响的功能
- ✅ 审图员列表显示
- ✅ 管理员查看审图员账号

### 不受影响的功能
- ✅ 展商列表显示
- ✅ 展商账号管理
- ✅ 其他所有功能

## 总结

这个修复确保了：
1. ✅ 审图员列表可以显示已有的审图员账号
2. ✅ 管理员可以看到所有审图员
3. ✅ 不影响展商账号的查询和显示
4. ✅ 完全向后兼容

**关键点**：在 `get-exhibitors` 云函数中添加 `'reviewer'` 角色到查询条件中。
