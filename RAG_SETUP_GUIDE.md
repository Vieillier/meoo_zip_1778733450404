# RAG 向量搜索 - 完整操作指南

## 🎯 目标
实现基于通义千问的 RAG 检索增强功能，为"一键初审"打下基础。

## 📋 前置准备

### 1. 获取通义千问 API Key

1. 访问 [阿里云 DashScope](https://dashscope.aliyun.com/)
2. 登录阿里云账号（没有的话需要注册）
3. 开通 DashScope 服务（免费额度：100万 tokens/月）
4. 创建 API Key

### 2. 配置环境变量

在 `.env.local` 文件中添加：

```env
SUPABASE_URL=https://aakexkggqspgpimfwlkn.supabase.co
SUPABASE_ANON_KEY=sb_publishable_Bee1XtMi-nVORakNZqFhxw_EuvxtAVb
DASHSCOPE_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxx
```

## 🚀 完整操作步骤

### 步骤 1：启用 pgvector 扩展并创建表

在 **Supabase Dashboard** → **SQL Editor** 中执行：

```bash
# 复制以下文件的完整内容并执行
migrations/20260521_create_guide_documents_with_vector.sql
```

**验证成功**：
```sql
-- 检查扩展
SELECT * FROM pg_extension WHERE extname = 'vector';

-- 检查表
\d guide_documents

-- 检查函数
\df match_guide_documents
```

### 步骤 2：生成文档切片

```bash
node scripts/split-docx-optimized.js
```

**输出**：
- ✅ 控制台显示 4 段规范
- ✅ 生成 `guide-chunks.json` 文件

### 步骤 3：生成向量并导入数据

```bash
node scripts/import-guide-with-embeddings.js
```

**交互提示**：
```
⚠️  是否清空旧数据？(y/N): y
```

**处理过程**：
```
[1/4] 生成 embedding: 第 1 段 (675 字)
   ✅ 成功生成 1536 维向量

[2/4] 生成 embedding: 第 2 段 (546 字)
   ✅ 成功生成 1536 维向量

[3/4] 生成 embedding: 第 3 段 (797 字)
   ✅ 成功生成 1536 维向量

[4/4] 生成 embedding: 第 4 段 (222 字)
   ✅ 成功生成 1536 维向量

💾 开始批量导入到 Supabase...
✅ 成功导入 4 条记录
```

**预计耗时**：约 2-3 秒（4 段文档）

### 步骤 4：测试 RAG 搜索

```bash
node scripts/test-rag-search.js
```

**测试用例**：
1. 工字钢固定规范
2. 展台高度限制
3. 桁架结构安全
4. 消防设施要求

**预期输出**：
```
🧪 RAG 向量搜索测试
================================================================================

✅ 数据库中有 4 条规范文档

================================================================================
📝 测试: 工字钢固定规范
================================================================================

🔍 查询: "工字钢如何固定？需要几个紧固件？"

⏳ 生成查询向量...
✅ 向量生成完成 (1536 维)

🔎 执行向量相似度搜索...

✅ 找到 3 条相关规范:

================================================================================

📌 结果 1 (相似度: 85.3%)
   片段序号: 3
   包含条款: 3.10, 3.11, 3.12, 3.13
   包含图片: 是
--------------------------------------------------------------------------------
3.10 桁架结构展台应做好相应安全措施...
3.12 工字钢固定规范：工字钢与地面固定时，应使用四枚紧固件...
--------------------------------------------------------------------------------
```

## 📊 数据验证

### 在 Supabase Dashboard 中验证

```sql
-- 查看所有记录
SELECT 
  chunk_index,
  content_length,
  sections,
  has_image,
  array_length(embedding, 1) as embedding_dim,
  LEFT(content, 100) as preview
FROM guide_documents
ORDER BY chunk_index;

-- 测试向量搜索函数
SELECT 
  chunk_index,
  sections,
  similarity
FROM match_guide_documents(
  (SELECT embedding FROM guide_documents WHERE chunk_index = 1),
  0.5,
  3
);
```

## 🎯 成功标志

- ✅ pgvector 扩展已启用
- ✅ guide_documents 表已创建
- ✅ 4 条记录已导入
- ✅ 每条记录都有 1536 维向量
- ✅ 向量搜索返回相关结果
- ✅ 相似度分数合理（> 0.7 表示高度相关）

## 🔍 常见问题

### Q1: 通义千问 API 调用失败
**错误**：`401 Unauthorized`
**解决**：检查 DASHSCOPE_API_KEY 是否正确

### Q2: pgvector 扩展不存在
**错误**：`extension "vector" does not exist`
**解决**：在 Supabase Dashboard 启用 pgvector 扩展

### Q3: 向量搜索没有结果
**原因**：相似度阈值太高
**解决**：降低 `match_threshold` 参数（如 0.5）

### Q4: API 限流
**错误**：`Too Many Requests`
**解决**：脚本已内置 500ms 延迟，如仍限流可增加延迟

## 💰 成本估算

### 通义千问免费额度
- **Embedding**: 100万 tokens/月（免费）
- **对话**: 100万 tokens/月（免费）

### 本项目消耗
- **4 段文档 embedding**: ~2000 tokens
- **每次搜索**: ~100 tokens
- **月度预估**（1000 次搜索）: ~100,000 tokens

**结论**：完全在免费额度内！

## 📁 文件清单

```
✅ migrations/20260521_create_guide_documents_with_vector.sql
✅ scripts/split-docx-optimized.js
✅ scripts/import-guide-with-embeddings.js
✅ scripts/test-rag-search.js
✅ guide-chunks.json (生成)
✅ .env.local (需配置 DASHSCOPE_API_KEY)
```

## 🎬 下一步：实现"一键初审"

RAG 基础设施搭建完成后，可以开始实现：

### 1. 创建 Edge Function
```bash
supabase functions new auto-review
```

### 2. 实现审图逻辑
- 接收图纸信息
- RAG 检索相关规范
- 调用通义千问生成初审报告

### 3. 前端集成
- 添加"一键初审"按钮
- 显示初审结果
- 标注不符合项

详细实现方案见 `RAG_IMPLEMENTATION_PLAN.md`

## 🆘 需要帮助？

如遇问题，检查：
1. 控制台错误信息
2. Supabase Dashboard 日志
3. 通义千问 API 调用记录
4. 环境变量配置

---

**准备好了吗？开始执行步骤 1！** 🚀
