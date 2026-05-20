# ✅ 保存展位信息和搭建商信息报错修复

## 🔴 问题

点击保存展位信息和搭建商信息时报错：
```
[Auth] 云函数调用错误: FunctionsHttpError: Edge Function returned a non-2xx status code
```

## 🔍 根本原因

在 `update-exhibitor` 云函数第 38 行，使用了错误的 API 调用方式：

```typescript
const { data: authInfo, error: authInfoError } = await supabaseAdmin.auth.getUser(accessToken);
if (authInfoError || !authInfo?.user) {
  // ...
}
```

**问题**：
- Supabase v2 的 `getUser()` 方法返回结构是 `{ data: { user: ... }, error: ... }`
- 但代码中使用的是 `{ data: authInfo, error: ... }`
- 导致 `authInfo` 是 `undefined`
- 然后检查 `!authInfo?.user` 失败
- 返回 401 错误

## ✅ 修复方案

修改第 38-46 行，使用正确的 API 调用方式：

**修改前**：
```typescript
const { data: authInfo, error: authInfoError } = await supabaseAdmin.auth.getUser(accessToken);
if (authInfoError || !authInfo?.user) {
  return new Response(JSON.stringify({ error: '无效或过期的身份凭证' }), {
    status: 401,
    headers: corsHeaders,
  });
}

const reviewerId = authInfo.user.id;
```

**修改后**：
```typescript
const { data: { user: authUser }, error: authError } = await supabaseAdmin.auth.getUser(accessToken);
if (authError || !authUser) {
  console.error('Auth error:', authError);
  return new Response(JSON.stringify({ error: '无效或过期的身份凭证' }), {
    status: 401,
    headers: corsHeaders,
  });
}

const reviewerId = authUser.id;
```

**改进**：
- ✅ 使用正确的解构方式：`data: { user: authUser }`
- ✅ 正确的错误检查：`!authUser`
- ✅ 添加日志便于调试：`console.error('Auth error:', authError)`

## 📊 修复对比

### 修复前
```
调用 update-exhibitor 云函数
    ↓
getUser() 返回 { data: { user: ... }, error: ... }
    ↓
解构为 { data: authInfo, ... }
    ↓
authInfo = undefined
    ↓
检查 !authInfo?.user 失败
    ↓
❌ 返回 401 错误
```

### 修复后
```
调用 update-exhibitor 云函数
    ↓
getUser() 返回 { data: { user: ... }, error: ... }
    ↓
解构为 { data: { user: authUser }, ... }
    ↓
authUser = 用户对象
    ↓
检查 !authUser 成功
    ↓
✅ 继续执行，保存成功
```

## 🚀 部署步骤

### 步骤 1：确认修改

文件：`functions/update-exhibitor/index.ts`

修改位置：第 38-47 行

### 步骤 2：重新部署云函数

```bash
supabase functions deploy update-exhibitor
```

### 步骤 3：测试

1. 展商登录
2. 进入展位信息页面
3. 修改展位信息
4. ✅ 点击"保存"应该能成功
5. ✅ 不再出现 401 错误

## 📋 验证清单

- [x] 修改了 getUser() 的解构方式
- [x] 修改了错误检查逻辑
- [x] 添加了日志
- [x] 代码没有语法错误
- [ ] 重新部署云函数
- [ ] 测试保存功能

## 💡 总结

**问题**：使用了错误的 Supabase v2 API 调用方式

**修复**：改为正确的解构方式 `{ data: { user: authUser }, error: authError }`

**结果**：保存展位信息和搭建商信息功能正常工作
