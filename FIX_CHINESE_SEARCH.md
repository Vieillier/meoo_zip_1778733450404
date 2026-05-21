# 快速修复：中文全文搜索配置错误

## 问题
```
ERROR: text search configuration "chinese" does not exist
```

## 原因
Supabase 的 PostgreSQL 默认不包含中文分词配置。

## 解决方案
已将全文搜索配置从 `'chinese'` 改为 `'simple'`。

## 修复后的 SQL（第 25-28 行）
```sql
-- 全文搜索索引（用于关键词搜索）
-- 注意：Supabase 默认不支持中文分词，使用 simple 配置
CREATE INDEX IF NOT EXISTS idx_guide_documents_content_search 
  ON public.guide_documents USING GIN(to_tsvector('simple', content));
```

## 重新执行步骤

### 1. 在 Supabase Dashboard SQL Editor 中执行

复制 `migrations/20260521_create_guide_documents.sql` 的完整内容并执行。

### 2. 验证表创建成功

```sql
-- 查看表结构
\d guide_documents

-- 或者
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'guide_documents';
```

### 3. 继续后续步骤

```bash
# 生成切片
node scripts/split-docx-optimized.js

# 导入数据
node scripts/import-guide-documents.js
```

## 关于全文搜索的说明

### Simple 配置的特点
- ✅ 不需要额外安装扩展
- ✅ 支持基本的关键词搜索
- ⚠️ 不支持中文分词（会按字符索引）
- ⚠️ 搜索效果不如专业中文分词

### 使用示例
```sql
-- 搜索包含"工字钢"的记录
SELECT * FROM guide_documents
WHERE to_tsvector('simple', content) @@ to_tsquery('simple', '工字钢');

-- 或者使用 LIKE（更简单，但性能较差）
SELECT * FROM guide_documents
WHERE content LIKE '%工字钢%';
```

### 如果需要更好的中文搜索

可以考虑：
1. **使用 LIKE 查询** - 简单直接，适合小数据量
2. **使用 pg_trgm 扩展** - 支持模糊搜索
3. **使用外部搜索服务** - 如 Algolia、Meilisearch
4. **使用向量搜索** - 结合 AI embedding（后续可实现）

## 当前方案足够吗？

对于审图规范文档（共 4 段，2098 字），当前方案完全够用：
- ✅ 可以通过 sections 数组精确查找条款
- ✅ 可以使用 LIKE 进行关键词搜索
- ✅ 数据量小，性能不是问题

## 后续优化方向

如果需要更智能的搜索，可以：
1. 集成 AI embedding + 向量搜索（pgvector）
2. 使用 Supabase Edge Functions 实现语义搜索
3. 前端实现客户端搜索（数据量小时很有效）
