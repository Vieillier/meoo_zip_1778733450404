# 🚀 AI 初审功能 - 完整操作清单

## ✅ 已完成的工作

### 1. Edge Function 代码
- ✅ 创建 `supabase/functions/ai-pre-review/index.ts`
- ✅ 实现完整的 AI 初审逻辑（RAG + 通义千问）
- ✅ 添加错误处理和降级策略
- ✅ 支持结构化 JSON 输出

### 2. 配置文件
- ✅ 创建 `supabase/.env.local`（环境变量模板）
- ✅ 创建 `test-ai-review.ps1`（快速测试脚本）
- ✅ 创建 `test-payload.json`（测试数据模板）
- ✅ 更新 `.gitignore`（保护敏感信息）

### 3. 文档和示例
- ✅ 创建 `AI_PRE_REVIEW_DEPLOYMENT_GUIDE.md`（完整部署指南）
- ✅ 创建 `src/utils/aiReview.ts`（前端调用示例）

---

## 📋 接下来需要做的事情

### 第一步：配置通义千问 API Key

1. 访问阿里云 DashScope 控制台：
   ```
   https://dashscope.console.aliyun.com/apiKey
   ```

2. 登录并创建/复制 API Key

3. 编辑 `supabase/.env.local`，填入 API Key：
   ```bash
   DASHSCOPE_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxx
   ```

### 第二步：启动本地 Supabase

```powershell
# 在项目根目录执行
cd "d:\AI\CURSOR\20260514 审图平台部署第一版\meoo_zip_1778733450404"
supabase start
```

**预期输出**：
```
Started supabase local development setup.
API URL: http://localhost:54321
...
```

### 第三步：启动 Edge Function

```powershell
# 在新的终端窗口执行
supabase functions serve ai-pre-review --env-file supabase/.env.local
```

**预期输出**：
```
Serving functions on http://localhost:54321/functions/v1/
  - ai-pre-review
```

### 第四步：获取测试用的展位 ID

1. 打开 Supabase Studio：http://localhost:54323

2. 在 SQL Editor 中执行：
   ```sql
   SELECT id, booth_number, exhibitor_name, booth_category, booth_area, booth_height
   FROM exhibitor_booths
   WHERE booth_category = '特装'
   LIMIT 5;
   ```

3. 复制一个展位的 `id`（UUID 格式）

### 第五步：运行测试脚本

1. 编辑 `test-ai-review.ps1`，修改第 12 行：
   ```powershell
   $BOOTH_ID = "your-booth-uuid-here"  # 替换为真实的展位 ID
   ```

2. 运行测试脚本：
   ```powershell
   .\test-ai-review.ps1
   ```

3. 查看输出结果

### 第六步：验证功能

检查以下内容：

- [ ] 能否成功调用 Edge Function
- [ ] 能否正确查询展位信息
- [ ] 能否成功调用向量搜索（返回相关规范）
- [ ] 能否成功调用通义千问
- [ ] 返回的 JSON 格式是否正确
- [ ] AI 建议是否合理

### 第七步：部署到生产环境

1. 在 Supabase Dashboard 配置环境变量：
   - 访问：https://supabase.com/dashboard/project/YOUR_PROJECT_ID/settings/functions
   - 添加 `DASHSCOPE_API_KEY`

2. 部署函数：
   ```powershell
   supabase functions deploy ai-pre-review
   ```

3. 测试生产环境：
   ```powershell
   # 修改 test-ai-review.ps1 中的 URL
   $FUNCTION_URL = "https://YOUR_PROJECT_ID.supabase.co/functions/v1/ai-pre-review"
   ```

### 第八步：集成到前端

1. 在审图员界面添加"一键AI初审"按钮

2. 使用 `src/utils/aiReview.ts` 中的 `callAIPreReview` 函数

3. 示例代码：
   ```typescript
   import { callAIPreReview } from './utils/aiReview';
   
   const handleAIReview = async () => {
     const result = await callAIPreReview(boothId);
     if (result.success) {
       // 自动填充审查意见
       setReviewComment(result.ai_review.reason);
       setReviewStatus(result.ai_review.suggestion === '通过' ? 'approved' : 'rejected');
     }
   };
   ```

---

## 🔍 故障排查

### 问题 1：Edge Function 启动失败

**可能原因**：
- Supabase CLI 未安装或版本过低
- Deno 未安装

**解决方法**：
```powershell
# 检查版本
supabase --version
deno --version

# 更新 Supabase CLI
scoop update supabase
```

### 问题 2：通义千问 API 调用失败

**可能原因**：
- API Key 无效
- 余额不足
- 网络问题

**解决方法**：
1. 检查 API Key 是否正确
2. 访问 https://dashscope.console.aliyun.com/ 查看余额
3. 查看函数日志：`supabase functions logs ai-pre-review`

### 问题 3：向量搜索返回空结果

**可能原因**：
- `guide_documents` 表中没有数据
- 向量未生成

**解决方法**：
```sql
-- 检查数据
SELECT COUNT(*) FROM guide_documents;

-- 检查向量
SELECT COUNT(*) FROM guide_documents WHERE embedding IS NOT NULL;
```

### 问题 4：展位信息查询失败

**可能原因**：
- booth_id 不存在
- RLS 策略阻止访问

**解决方法**：
```sql
-- 检查展位
SELECT * FROM exhibitor_booths WHERE id = 'your-booth-uuid';

-- 临时禁用 RLS（仅用于调试）
ALTER TABLE exhibitor_booths DISABLE ROW LEVEL SECURITY;
```

---

## 📞 需要帮助？

如果遇到问题，请提供以下信息：

1. 错误信息（完整的错误堆栈）
2. 函数日志（`supabase functions logs ai-pre-review`）
3. 测试数据（booth_id 和展位信息）
4. 环境信息（Supabase CLI 版本、Deno 版本）

---

## 🎯 下一步优化方向

1. **性能优化**：
   - 添加结果缓存（相同展位短时间内不重复调用）
   - 使用更快的模型（qwen-turbo）

2. **功能增强**：
   - 支持批量 AI 初审
   - 添加审查历史记录
   - 支持自定义审查规则

3. **用户体验**：
   - 添加进度提示
   - 支持一键采纳 AI 建议
   - 显示匹配的具体规范条款

4. **安全加固**：
   - 添加用户身份验证
   - 添加速率限制
   - 记录审计日志
