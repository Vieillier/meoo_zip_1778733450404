# ✅ RAG 向量搜索 - 快速检查清单

## 📋 前置准备

- [ ] 已有阿里云账号
- [ ] 已开通 DashScope 服务
- [ ] 已获取 DASHSCOPE_API_KEY
- [ ] 已配置 `.env.local` 文件

## 🚀 执行步骤

### ✅ 步骤 1：创建数据库表（Supabase Dashboard）

**位置**：Supabase Dashboard → SQL Editor

**操作**：复制并执行 `migrations/20260521_create_guide_documents_with_vector.sql`

**验证**：
```sql
SELECT * FROM pg_extension WHERE extname = 'vector';
SELECT * FROM guide_documents LIMIT 1;
```

---

### ✅ 步骤 2：生成文档切片（终端）

**命令**：
```bash
node scripts/split-docx-optimized.js
```

**验证**：
- [ ] 控制台显示 4 段规范
- [ ] 生成 `guide-chunks.json` 文件

---

### ✅ 步骤 3：生成向量并导入（终端）

**命令**：
```bash
node scripts/import-guide-with-embeddings.js
```

**交互**：输入 `y` 清空旧数据

**验证**：
- [ ] 显示 "✅ 成功导入 4 条记录"
- [ ] 每条记录都有 1536 维向量

---

### ✅ 步骤 4：测试 RAG 搜索（终端）

**命令**：
```bash
node scripts/test-rag-search.js
```

**验证**：
- [ ] 4 个测试用例都返回结果
- [ ] 相似度分数合理（> 0.7）
- [ ] 搜索结果与查询相关

---

## 🎯 成功标志

全部完成后，你应该看到：

```
✅ pgvector 扩展已启用
✅ guide_documents 表已创建（带 embedding 字段）
✅ 4 条规范文档已导入
✅ 每条记录都有 1536 维向量
✅ RAG 搜索功能正常工作
```

## 📊 数据验证 SQL

```sql
-- 查看所有记录
SELECT 
  chunk_index,
  content_length,
  sections,
  array_length(embedding, 1) as embedding_dim
FROM guide_documents
ORDER BY chunk_index;

-- 应该返回 4 条记录，每条 embedding_dim = 1536
```

## 🔧 环境变量检查

`.env.local` 应包含：
```env
SUPABASE_URL=https://aakexkggqspgpimfwlkn.supabase.co
SUPABASE_ANON_KEY=sb_publishable_Bee1XtMi-nVORakNZqFhxw_EuvxtAVb
DASHSCOPE_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxx
```

## ❌ 常见错误

### 错误 1：缺少 DASHSCOPE_API_KEY
```
❌ 缺少通义千问 API Key
```
**解决**：在 `.env.local` 添加 `DASHSCOPE_API_KEY=sk-...`

### 错误 2：pgvector 扩展不存在
```
ERROR: extension "vector" does not exist
```
**解决**：在 SQL Editor 执行 `CREATE EXTENSION IF NOT EXISTS vector;`

### 错误 3：guide-chunks.json 不存在
```
❌ 文件不存在: guide-chunks.json
```
**解决**：先运行 `node scripts/split-docx-optimized.js`

### 错误 4：API 调用失败
```
通义千问 API 调用失败: 401
```
**解决**：检查 DASHSCOPE_API_KEY 是否正确

## 📞 获取帮助

如果遇到问题：
1. 查看控制台完整错误信息
2. 检查 Supabase Dashboard 日志
3. 参考 `RAG_SETUP_GUIDE.md` 详细说明

## 🎉 完成后

RAG 基础设施搭建完成！下一步可以：
1. 创建 Edge Function 实现"一键初审"
2. 前端集成 RAG 搜索功能
3. 优化搜索阈值和参数

---

**当前进度**：□□□□ 0/4

开始执行步骤 1！🚀
