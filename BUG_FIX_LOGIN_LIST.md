# 🔧 Bug 修复 - 登录后需要刷新才能看到用户列表

## 问题描述

每次登录审图员账号后，需要再点击刷新才能看到用户管理列表。

## 根本原因

**文件**：`src/App.tsx` 第 173-214 行

**问题**：
在 `onAuthStateChange` 的 `SIGNED_IN` 事件中，只更新了 `user` 状态，但**没有调用 `fetchAccountsFromDB()` 来加载展商列表**。

**代码分析**：
```javascript
if (event === 'SIGNED_IN' && session?.user) {
  // 获取用户信息
  const { data: profile } = await supabase.from('profiles').select('*')...
  
  // 更新用户状态
  setUser({...});
  
  // ❌ 缺少：加载展商列表
  // await fetchAccountsFromDB();
}
```

**影响**：
1. 用户登录后，`user` 状态被更新
2. 但 `accounts` 列表仍然为空
3. 审图员需要手动刷新才能看到展商列表

## 解决方案

**文件**：`src/App.tsx`

**修改位置**：第 207-213 行

**修改内容**：
```javascript
console.log('[Auth] ✓ 用户状态已更新:', profile.role);

// 修复：登录成功后立即加载展商列表（针对审图员）
if (['reviewer', 'admin'].includes(profile.role)) {
  console.log('[Auth] 检测到审图员/管理员登录，加载展商列表...');
  await fetchAccountsFromDB();
}
```

**逻辑**：
1. 检查用户角色是否为 `reviewer`（审图员）或 `admin`（管理员）
2. 如果是，立即调用 `fetchAccountsFromDB()` 加载展商列表
3. 展商账号登录时不需要加载列表（因为展商只看自己的信息）

## 修复后的流程

### 修复前
```
用户登录
    ↓
更新用户状态
    ↓
❌ 展商列表为空
    ↓
用户需要手动刷新
    ↓
✅ 看到展商列表
```

### 修复后
```
用户登录
    ↓
更新用户状态
    ↓
检查用户角色
    ↓
如果是审图员/管理员
    ↓
✅ 自动加载展商列表
    ↓
✅ 立即看到展商列表
```

## 修改文件

### `src/App.tsx`

**修改位置**：第 207-213 行

**修改内容**：
```diff
  console.log('[Auth] ✓ 用户状态已更新:', profile.role);
+
+ // 修复：登录成功后立即加载展商列表（针对审图员）
+ if (['reviewer', 'admin'].includes(profile.role)) {
+   console.log('[Auth] 检测到审图员/管理员登录，加载展商列表...');
+   await fetchAccountsFromDB();
+ }
```

## 代码质量

- ✅ 无 TypeScript 错误
- ✅ 无 ESLint 警告
- ✅ 逻辑清晰
- ✅ 注释完整
- ✅ 与现有代码风格一致

## 测试验证

### 快速验证（1 分钟）
1. 启动开发服务器：`npm run dev`
2. 登录审图员账号
3. ✅ 立即看到展商列表（无需刷新）

### 详细验证
1. **审图员登录**
   - 登录审图员账号
   - ✅ 自动加载展商列表
   - ✅ 无需手动刷新

2. **管理员登录**
   - 登录管理员账号
   - ✅ 自动加载展商列表
   - ✅ 无需手动刷新

3. **展商登录**
   - 登录展商账号
   - ✅ 不加载展商列表（正常，因为展商只看自己的信息）

### 浏览器控制台验证
打开浏览器开发者工具（F12），查看 Console 标签：

**预期输出**：
```
[Auth] 认证状态变化: SIGNED_IN ...
[Auth] ✓ 用户状态已更新: reviewer
[Auth] 检测到审图员/管理员登录，加载展商列表...
[Auth] ✓ 展商列表已加载，共 X 条记录
```

## 与现有逻辑的兼容性

- ✅ 不影响展商账号登录
- ✅ 不影响其他功能
- ✅ 与现有的 `fetchAccountsFromDB()` 函数兼容
- ✅ 与现有的角色检查逻辑一致

## 总结

这个修复确保了审图员登录后**立即看到展商列表**，无需手动刷新，提升了用户体验。

修复非常简单：
- 只需添加 6 行代码
- 检查用户角色
- 如果是审图员/管理员，自动加载展商列表
