# 🤖 AI 初审 Edge Function 部署和测试指南

## 📋 功能说明

这个 Edge Function 实现了基于 RAG（检索增强生成）的智能图纸初审功能：

1. **接收参数**：前端传入 `booth_id`（展位ID）
2. **查询展位信息**：从 `exhibitor_booths` 表获取展位基本信息
3. **向量搜索**：调用 `match_guide_documents` 函数检索最相关的 3 条审图规范
4. **AI 分析**：将展位信息 + 规范文本喂给通义千问，生成初审建议
5. **返回结果**：返回结构化的审查建议（通过/驳回 + 详细理由）

**重要**：AI 结果仅作为"建议草稿"，不直接修改数据库，由人类审图员最终决策。

---

## 🛠️ 本地开发和测试步骤

### 前置条件

1. 已安装 Supabase CLI
2. 已配置通义千问 API Key
3. 已创建 `guide_documents` 表并导入规范数据
4. 已创建 `match_guide_documents` 向量搜索函数

### 步骤 1：配置环境变量

编辑 `supabase/.env.local` 文件，填入你的通义千问 API Key：

```bash
DASHSCOPE_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxx
```

**获取 API Key**：
- 访问：https://dashscope.console.aliyun.com/apiKey
- 登录阿里云账号
- 创建或复制 API Key

### 步骤 2：启动本地 Supabase

```bash
# 在项目根目录执行
supabase start
```

**预期输出**：
```
Started supabase local development setup.

         API URL: http://localhost:54321
          DB URL: postgresql://postgres:postgres@localhost:54322/postgres
      Studio URL: http://localhost:54323
    Inbucket URL: http://localhost:54324
      JWT secret: super-secret-jwt-token-with-at-least-32-characters-long
        anon key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
service_role key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 步骤 3：本地运行 Edge Function

```bash
# 方式 1：直接运行（推荐用于开发调试）
supabase functions serve ai-pre-review --env-file supabase/.env.local

# 方式 2：运行所有函数
supabase functions serve --env-file supabase/.env.local
```

**预期输出**：
```
Serving functions on http://localhost:54321/functions/v1/
  - ai-pre-review
```

### 步骤 4：准备测试数据

编辑 `supabase/functions/ai-pre-review/test-payload.json`，填入真实的展位 ID：

```json
{
  "booth_id": "123e4567-e89b-12d3-a456-426614174000"
}
```

**如何获取展位 ID**：
```sql
-- 在 Supabase Studio 中执行
SELECT id, booth_number, exhibitor_name, booth_category 
FROM exhibitor_booths 
LIMIT 5;
```

### 步骤 5：测试 Edge Function

#### 方式 1：使用 curl（推荐）

```bash
# Windows PowerShell
$headers = @{
    "Authorization" = "Bearer YOUR_ANON_KEY"
    "Content-Type" = "application/json"
}

$body = @{
    booth_id = "your-booth-uuid-here"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:54321/functions/v1/ai-pre-review" `
    -Method POST `
    -Headers $headers `
    -Body $body
```

```bash
# Linux/Mac
curl -X POST http://localhost:54321/functions/v1/ai-pre-review \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d @supabase/functions/ai-pre-review/test-payload.json
```

#### 方式 2：使用 Supabase CLI

```bash
supabase functions invoke ai-pre-review \
  --env-file supabase/.env.local \
  --data '{"booth_id":"your-booth-uuid-here"}'
```

### 步骤 6：查看响应

**成功响应示例**：
```json
{
  "success": true,
  "booth_id": "123e4567-e89b-12d3-a456-426614174000",
  "booth_info": {
    "booth_number": "A101",
    "hall_number": "1号馆",
    "booth_area": 36,
    "booth_height": 4.5,
    "booth_category": "特装",
    "exhibitor_name": "某某科技公司"
  },
  "ai_review": {
    "suggestion": "驳回",
    "reason": "根据规范3.12条款，特装展位高度不得超过4米，当前展位高度为4.5米，超出限制0.5米。建议调整展位设计，将高度降低至4米以内。"
  },
  "matched_guides_count": 3,
  "timestamp": "2026-05-21T06:54:32.123Z"
}
```

**错误响应示例**：
```json
{
  "success": false,
  "error": "展位信息不存在",
  "timestamp": "2026-05-21T06:54:32.123Z"
}
```

---

## 🚀 部署到生产环境

### 步骤 1：配置生产环境变量

在 Supabase Dashboard 中配置环境变量：

1. 访问：https://supabase.com/dashboard/project/YOUR_PROJECT_ID/settings/functions
2. 点击 "Edge Functions" → "Environment Variables"
3. 添加环境变量：
   - Key: `DASHSCOPE_API_KEY`
   - Value: `sk-xxxxxxxxxxxxxxxxxxxxxxxx`

### 步骤 2：部署函数

```bash
# 部署单个函数
supabase functions deploy ai-pre-review

# 部署所有函数
supabase functions deploy
```

**预期输出**：
```
Deploying function ai-pre-review...
Function ai-pre-review deployed successfully.
Function URL: https://YOUR_PROJECT_ID.supabase.co/functions/v1/ai-pre-review
```

### 步骤 3：测试生产环境

```bash
# Windows PowerShell
$headers = @{
    "Authorization" = "Bearer YOUR_ANON_KEY"
    "Content-Type" = "application/json"
}

$body = @{
    booth_id = "your-booth-uuid-here"
} | ConvertTo-Json

Invoke-RestMethod -Uri "https://YOUR_PROJECT_ID.supabase.co/functions/v1/ai-pre-review" `
    -Method POST `
    -Headers $headers `
    -Body $body
```

---

## 🔍 调试技巧

### 查看函数日志

```bash
# 本地日志（在运行 serve 的终端中实时显示）
supabase functions serve ai-pre-review --env-file supabase/.env.local

# 生产环境日志
supabase functions logs ai-pre-review
```

### 常见问题排查

#### 1. 向量搜索返回空结果

**原因**：`guide_documents` 表中没有数据或向量未生成

**解决**：
```sql
-- 检查表中是否有数据
SELECT COUNT(*) FROM guide_documents;

-- 检查是否有向量
SELECT COUNT(*) FROM guide_documents WHERE embedding IS NOT NULL;
```

#### 2. 通义千问 API 调用失败

**原因**：API Key 无效或余额不足

**解决**：
- 检查 API Key 是否正确
- 访问 https://dashscope.console.aliyun.com/ 查看余额
- 查看函数日志中的详细错误信息

#### 3. 展位信息查询失败

**原因**：booth_id 不存在或 RLS 策略阻止访问

**解决**：
```sql
-- 检查展位是否存在
SELECT * FROM exhibitor_booths WHERE id = 'your-booth-uuid';

-- 检查 RLS 策略
SELECT * FROM pg_policies WHERE tablename = 'exhibitor_booths';
```

---

## 📊 性能优化建议

1. **向量搜索优化**：
   - 调整 `match_threshold` 参数（默认 0.5）
   - 调整 `match_count` 参数（默认 3）

2. **AI 响应优化**：
   - 调整 `temperature` 参数（默认 0.3）
   - 使用更快的模型（如 `qwen-turbo`）

3. **缓存策略**：
   - 对相同展位的重复请求可以缓存结果
   - 使用 Redis 或 Supabase Storage 存储缓存

---

## 🔐 安全注意事项

1. **API Key 保护**：
   - 永远不要将 API Key 提交到 Git
   - 使用环境变量管理敏感信息

2. **权限控制**：
   - Edge Function 使用 Service Role Key，拥有完全权限
   - 前端调用时需要验证用户身份（通过 JWT）

3. **速率限制**：
   - 通义千问有 API 调用频率限制
   - 建议在前端添加防抖/节流机制

---

## 📞 技术支持

如遇到问题，请检查：
1. Supabase CLI 版本：`supabase --version`
2. Deno 版本：`deno --version`
3. 函数日志：`supabase functions logs ai-pre-review`
