# ✅ 密码规则已恢复为 6 个字符

## 问题确认

你完全正确！Supabase 的密码要求是 **6 个字符，不是 8 个字符**。

## 证据

`create-exhibitor` 函数使用的是 6 个字符的规则，并且可以正常工作：

```typescript
function normalizeExhibitorPassword(password: string): string {
  return password.length >= 6 ? password : `${password}${PASSWORD_SUFFIX}`;
}
```

## 已修复

`create-reviewer` 函数的密码规则已经改回 6 个字符：

```typescript
function normalizeReviewerPassword(password: string): string {
  return password.length >= 6 ? password : `${password}${PASSWORD_SUFFIX}`;
}
```

## 密码规范化示例

| 输入密码 | 规范化后 | 长度 | 状态 |
|---------|---------|------|------|
| `123` | `123_secure` | 10 | ✅ |
| `123456` | `123456` | 6 | ✅ |
| `reviewer123` | `reviewer123` | 11 | ✅ |

## 🔍 真正的问题是什么？

既然密码规则不是问题，那么 400 错误的真正原因可能是：

### 可能原因 1：云函数没有部署

**检查方法**：
```bash
supabase functions list
```

**如果没有 create-reviewer，部署它**：
```bash
supabase functions deploy create-reviewer
```

### 可能原因 2：账号已存在

如果你多次尝试创建相同账号的审图员，会返回 400 错误。

**解决方法**：
- 尝试使用不同的账号名称
- 或者先删除已存在的账号

### 可能原因 3：权限验证失败

云函数中有管理员权限验证（第 51-73 行），如果验证失败会返回 401 或 403 错误。

但你看到的是 400 错误，所以可能不是这个原因。

### 可能原因 4：邮箱已存在

虚拟邮箱格式是 `{username}@test.com`，如果这个邮箱已经存在，会返回 400 错误。

## 🚀 下一步诊断

### 步骤 1：确认云函数已部署

```bash
# 重新部署云函数
supabase functions deploy create-reviewer

# 查看部署状态
supabase functions list
```

### 步骤 2：尝试不同的账号名称

不要使用 `reviewer1`，尝试使用一个全新的账号名称，例如：
- `testreviewer999`
- `reviewer_test_001`
- `new_reviewer_2024`

### 步骤 3：查看云函数日志

```bash
# 实时查看云函数日志
supabase functions logs create-reviewer --follow
```

然后尝试创建审图员，查看日志中的具体错误信息。

### 步骤 4：检查 Supabase Dashboard

1. 登录 Supabase Dashboard
2. 进入 Authentication → Users
3. 查看是否有重复的用户
4. 进入 Edge Functions → create-reviewer
5. 查看日志中的错误信息

## 📋 总结

- ✅ 密码规则已恢复为 6 个字符
- ❓ 400 错误的真正原因还需要进一步诊断
- 🎯 下一步：部署云函数并尝试不同的账号名称

请告诉我：
1. 你是否部署了云函数？
2. 你尝试的账号名称是什么？
3. 能否查看云函数的日志？
