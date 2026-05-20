# 🔍 添加详细日志用于诊断

## 修改内容

**文件**：`functions/create-reviewer/index.ts`

## 添加的日志点

### 1. 函数开始
```
=== create-reviewer function started ===
Supabase URL: https://xxx.supabase.co
Access token present: true
```

### 2. 用户认证
```
Verifying user authentication...
Auth user: ec4c7a24-9ebf-4db8-b042-e3b612143f20
Auth error: null
```

### 3. 管理员权限检查
```
Admin ID: ec4c7a24-9ebf-4db8-b042-e3b612143f20
Admin profile: { role: 'admin' }
Error: null
```

### 4. 请求参数
```
Request body - username: reviewer1 displayName: 审图员1
```

### 5. 参数验证
```
Normalized password length: 10
Email: reviewer1@test.com
```

### 6. Auth 用户创建
```
Creating auth user...
Auth user created: 12345678-1234-1234-1234-123456789012
Error: null
```

### 7. Profile 创建
```
Creating profile record for user: 12345678-1234-1234-1234-123456789012
Profile creation result - Error: null
```

### 8. 完成
```
=== create-reviewer function completed successfully ===
```

## 🚀 部署步骤

### 步骤 1：重新部署云函数

```bash
supabase functions deploy create-reviewer
```

### 步骤 2：尝试创建审图员

1. 管理员登录
2. 新增审图员：
   - 账号：reviewer_test_001
   - 密码：123
   - 显示名称：测试审图员
3. 点击确认

### 步骤 3：查看日志

1. 进入 Supabase Dashboard
2. 进入 Edge Functions → create-reviewer
3. 查看最新的请求日志
4. 点击进去查看详细的 console.log 输出

## 📊 预期的日志输出

如果一切正常，你应该看到：

```
=== create-reviewer function started ===
Supabase URL: https://aakexkggqspgpimfwlkn.supabase.co
Access token present: true
Verifying user authentication...
Auth user: ec4c7a24-9ebf-4db8-b042-e3b612143f20
Auth error: null
Admin ID: ec4c7a24-9ebf-4db8-b042-e3b612143f20
Admin profile: { role: 'admin' }
Error: null
Request body - username: reviewer_test_001 displayName: 测试审图员
Normalized password length: 10
Email: reviewer_test_001@test.com
Creating auth user...
Auth user created: [新的 UUID]
Error: null
Creating profile record for user: [新的 UUID]
Profile creation result - Error: null
=== create-reviewer function completed successfully ===
```

## 🔍 如果看到错误

根据错误信息，我们可以准确定位问题：

- **"Admin check failed"** → 用户不是管理员
- **"Invalid username format"** → 账号包含非法字符
- **"Create auth user error"** → 邮箱已存在或其他 auth 错误
- **"Create profile error"** → profile 表插入失败

## 📋 下一步

部署后，请：
1. 尝试创建审图员
2. 查看 Supabase Dashboard 中的日志
3. 截图给我看详细的日志输出
4. 我们就能准确知道问题出在哪里了！
