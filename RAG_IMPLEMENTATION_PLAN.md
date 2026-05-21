# RAG 检索增强 - 完整实现方案

## 🎯 目标功能：一键初审

用户上传图纸后，系统自动：
1. 提取图纸关键信息（尺寸、材料、结构等）
2. 在规范文档中检索相关条款（RAG）
3. 对比图纸与规范，生成初审意见
4. 标注不符合项，给出修改建议

## 🏗️ 技术架构

```
用户上传图纸
    ↓
图纸信息提取（OCR/多模态AI）
    ↓
生成查询向量（Embedding）
    ↓
向量相似度搜索（pgvector）
    ↓
检索相关规范条款
    ↓
AI 生成初审报告
    ↓
返回审核结果
```

## 📊 数据库设计（向量搜索版）

### guide_documents 表结构

```sql
CREATE TABLE guide_documents (
  id UUID PRIMARY KEY,
  chunk_index INTEGER,
  content TEXT,                    -- 规范文本
  content_length INTEGER,
  sections TEXT[],                 -- 条款编号 ['3.12', '3.13']
  has_image BOOLEAN,
  embedding vector(1536),          -- ⭐ OpenAI text-embedding-3-small 向量
  metadata JSONB,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);
```

### 向量索引（HNSW）

```sql
CREATE INDEX ON guide_documents 
USING hnsw (embedding vector_cosine_ops);
```

## 🔧 实现步骤

### 步骤 1：启用 pgvector 扩展

在 Supabase Dashboard SQL Editor 执行：

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

### 步骤 2：创建表（带向量字段）

执行 `migrations/20260521_create_guide_documents_with_vector.sql`

### 步骤 3：生成文档切片

```bash
node scripts/split-docx-optimized.js
```

### 步骤 4：生成向量并导入

```bash
node scripts/import-guide-with-embeddings.js
```

这个脚本会：
1. 读取 `guide-chunks.json`
2. 调用 OpenAI API 生成 embedding
3. 导入到 Supabase（包含向量）

### 步骤 5：创建 Edge Function（RAG 检索）

创建 `functions/rag-search/index.ts`，实现：
- 接收用户查询
- 生成查询向量
- 向量相似度搜索
- 返回相关规范条款

### 步骤 6：创建 Edge Function（一键初审）

创建 `functions/auto-review/index.ts`，实现：
- 接收图纸信息
- RAG 检索相关规范
- 调用 AI 生成初审报告

## 🔑 所需 API Key

### OpenAI API（推荐）
- **用途**：生成 embedding + AI 审图
- **模型**：
  - Embedding: `text-embedding-3-small` (1536 维)
  - 审图: `gpt-4o` 或 `gpt-4o-mini`
- **成本**：
  - Embedding: $0.02 / 1M tokens（约 4 段文档 < $0.01）
  - GPT-4o-mini: $0.15 / 1M input tokens

### 替代方案（国内可用）
- **通义千问**：阿里云，支持 embedding + 对话
- **文心一言**：百度，支持 embedding + 对话
- **智谱 AI**：支持 embedding + 对话

## 📁 需要创建的文件

```
migrations/
  └── 20260521_create_guide_documents_with_vector.sql  ⭐ 带向量的表

scripts/
  ├── split-docx-optimized.js                          ✅ 已有
  ├── import-guide-with-embeddings.js                  ⭐ 新建（生成向量+导入）
  └── test-rag-search.js                               ⭐ 新建（测试检索）

functions/
  ├── rag-search/
  │   └── index.ts                                     ⭐ 新建（RAG 检索）
  └── auto-review/
      └── index.ts                                     ⭐ 新建（一键初审）

.env.local
  └── 添加 OPENAI_API_KEY                              ⭐ 配置
```

## 🎬 完整流程示例

### 1. 用户上传图纸

```typescript
// 前端调用
const result = await supabase.functions.invoke('auto-review', {
  body: {
    boothNumber: 'A101',
    drawingUrls: ['https://...'],
    drawingType: 'effect_drawing'
  }
});
```

### 2. 后端处理（Edge Function）

```typescript
// functions/auto-review/index.ts
export default async (req: Request) => {
  // 1. 提取图纸信息（调用多模态 AI）
  const drawingInfo = await extractDrawingInfo(drawingUrls);
  
  // 2. RAG 检索相关规范
  const relevantRules = await ragSearch(drawingInfo.query);
  
  // 3. AI 生成初审报告
  const review = await generateReview(drawingInfo, relevantRules);
  
  return new Response(JSON.stringify(review));
};
```

### 3. RAG 检索实现

```typescript
// functions/rag-search/index.ts
async function ragSearch(query: string) {
  // 1. 生成查询向量
  const embedding = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: query
  });
  
  // 2. 向量相似度搜索
  const { data } = await supabase.rpc('match_guide_documents', {
    query_embedding: embedding.data[0].embedding,
    match_threshold: 0.7,
    match_count: 5
  });
  
  return data;
}
```

### 4. 返回初审结果

```json
{
  "status": "needs_revision",
  "issues": [
    {
      "section": "3.12",
      "rule": "工字钢固定需使用四枚紧固件...",
      "finding": "图纸中仅显示两枚紧固件",
      "severity": "high",
      "suggestion": "请增加紧固件数量至四枚"
    }
  ],
  "summary": "发现 1 处不符合项，需要修改后重新提交"
}
```

## 💰 成本估算

### OpenAI API 成本（每次初审）
- Embedding 生成（4 段规范）: < $0.01
- 图纸信息提取（GPT-4o-mini）: ~$0.02
- 初审报告生成（GPT-4o-mini）: ~$0.03
- **总计**: ~$0.06 / 次

### 月度成本估算
- 100 次初审/月: $6
- 500 次初审/月: $30
- 1000 次初审/月: $60

## 🚀 下一步行动

### 立即执行
1. ✅ 确认使用 OpenAI API（或选择替代方案）
2. ⭐ 获取 API Key
3. ⭐ 创建向量版数据库表
4. ⭐ 生成并导入 embeddings

### 后续开发
5. 创建 RAG 检索 Edge Function
6. 创建一键初审 Edge Function
7. 前端集成"一键初审"按钮
8. 测试和优化

## ❓ 需要确认的问题

1. **使用哪个 AI 服务？**
   - OpenAI（国际，需要代理）
   - 通义千问（国内，稳定）
   - 其他？

2. **Embedding 维度？**
   - OpenAI text-embedding-3-small: 1536 维（推荐）
   - OpenAI text-embedding-3-large: 3072 维（更精确，更贵）

3. **是否需要图片识别？**
   - 是：需要多模态模型（GPT-4o, Claude 3.5 Sonnet）
   - 否：只处理文字描述

请告诉我你的选择，我会继续创建相应的实现文件！
