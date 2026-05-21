# AI 初审功能 - 故障修复说明

## 🐛 问题描述

**错误信息**：
```
POST http://localhost:3016/undefined/functions/v1/ai-pre-review 404 (Not Found)
```

**原因**：
- URL 中出现 `undefined`
- 环境变量 `VITE_SUPABASE_URL` 未正确配置

---

## ✅ 已修复的问题

### 1. 环境变量名称不匹配

**修改前** (`.env.local`)：
```env
SUPABASE_URL=https://aakexkggqspgpimfwlkn.supabase.co
SUPABASE_ANON_KEY=sb_publishable_Bee1XtMi-nVORakNZqFhxw_EuvxtAVb
```

**修改后** (`.env.local`)：
```env
VITE_SUPABASE_URL=https://aakexkggqspgpimfwlkn.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_Bee1XtMi-nVORakNZqFhxw_EuvxtAVb
```

**说明**：Vite 要求环境变量必须以 `VITE_` 开头才能在客户端代码中访问。

### 2. API 调用代码优化

**修改前**：
```typescript
const response = await fetch(
  `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-pre-review`,
  // ...
);
```

**修改后**：
```typescript
// 使用 supabase client 中已配置的 URL
const apiUrl = `${supabase.supabaseUrl}/functions/v1/ai-pre-review`;
const response = await fetch(apiUrl, {
  // ...
});
```

**优势**：
- ✅ 不依赖环境变量直接访问
- ✅ 使用 supabase client 的统一配置
- ✅ 更可靠，有回退机制

### 3. 增强错误日志

**新增日志**：
```typescript
console.log('[AI初审] Booth ID:', boothId);
console.log('[AI初审] API URL:', apiUrl);
console.log('[AI初审] API 响应状态:', response.status);
```

**用途**：方便调试和排查问题

---

## 🚀 重启开发服务器

**重要**：修改 `.env.local` 后必须重启开发服务器！

### 步骤：

1. **停止当前服务器**
   - 在终端按 `Ctrl + C`

2. **重新启动**
   ```powershell
   npm run dev
   ```

3. **刷新浏览器**
   - 按 `F5` 或 `Ctrl + R`

---

## 🧪 测试步骤

### 1. 确认环境变量生效

打开浏览器控制台，输入：
```javascript
console.log(import.meta.env.VITE_SUPABASE_URL);
```

**预期输出**：
```
https://aakexkggqspgpimfwlkn.supabase.co
```

**如果输出 `undefined`**：
- 说明环境变量未生效
- 确认 `.env.local` 文件在项目根目录
- 确认已重启开发服务器

### 2. 测试 AI 初审功能

1. 登录审图员账号
2. 进入特装审图页面
3. 点击某个展位的"图纸审核"
4. 点击"AI 初审"按钮
5. 查看浏览器控制台日志

**预期日志**：
```
[AI初审] 开始调用 AI 初审 API...
[AI初审] Booth ID: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
[AI初审] API URL: https://aakexkggqspgpimfwlkn.supabase.co/functions/v1/ai-pre-review
[AI初审] API 响应状态: 200
[AI初审] API 响应: { success: true, ... }
```

---

## ⚠️ 可能的其他错误

### 错误 1：Edge Function 未部署

**错误信息**：
```
AI 初审失败 (404): Function not found
```

**解决方案**：
```powershell
supabase functions deploy ai-pre-review --project-ref aakexkggqspgpimfwlkn
```

### 错误 2：环境变量未配置（Supabase Dashboard）

**错误信息**：
```
AI 初审失败 (500): 未配置 DASHSCOPE_API_KEY 环境变量
```

**解决方案**：
1. 打开 Supabase Dashboard
2. 进入 Settings → Functions → Secrets
3. 添加：`DASHSCOPE_API_KEY = sk-63094ad8a6af4b4b86f2c9b5f6538047`

### 错误 3：未登录或 Token 过期

**错误信息**：
```
AI 初审失败: 未获取到访问令牌，请重新登录
```

**解决方案**：
- 重新登录审图员账号

### 错误 4：展位未上传图纸

**提示信息**：
```
AI 初审完成！
建议：驳回
理由：该展位未上传图纸文件...
但未找到已上传的图纸，请手动操作。
```

**说明**：
- 这是正常情况
- AI 只能基于文字信息分析
- 需要展商先上传图纸

---

## 📋 完整的 API 调用流程

```
1. 用户点击"AI 初审"按钮
   ↓
2. 获取 booth_id
   ↓
3. 获取当前用户的 access_token
   ↓
4. 构建 API URL
   ↓
5. 发送 POST 请求到 Edge Function
   ↓
6. Edge Function 执行：
   - 查询展位信息
   - 查询图纸文件
   - 调用 RAG 向量搜索
   - 调用多模态视觉大模型
   - 返回审核建议
   ↓
7. 前端接收响应
   ↓
8. 如果建议驳回：
   - 自动标记第一个图纸为"不通过"
   - 填写 AI 的审核意见
   ↓
9. 显示结果提示
```

---

## 🎯 修复完成

现在 AI 初审功能应该可以正常工作了！

**下一步**：
1. 重启开发服务器
2. 刷新浏览器
3. 测试 AI 初审功能

如果还有问题，请查看浏览器控制台的详细日志。
