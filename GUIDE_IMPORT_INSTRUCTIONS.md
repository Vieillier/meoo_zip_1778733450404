# 审图规范导入指南

## 📋 概述

本指南说明如何将更新后的《展会搭建规范20260521.docx》导入到 Supabase 数据库。

## ✅ 问题 1：切片逻辑优化

### 原有问题
- 原脚本按 500 字暴力切分
- 可能在条款中间切断（如 3.12 工字钢规范）
- 不识别编号条款的完整性

### 优化方案
已创建 `scripts/split-docx-optimized.js`，优化点：

1. **增加目标字数** - 从 500 字增加到 600 字，容纳更长的条款
2. **条款边界识别** - 优先在条款编号（如 `3.12`）处切分
3. **搜索范围扩大** - 向后搜索 200 字（原来 100 字）寻找最佳切分点
4. **语义分隔符优先级**：
   ```
   1. 条款编号（\n3.12 ）- 最高优先级
   2. 段落分隔（\n\n）
   3. 换行（\n）
   4. 句号（。）
   5. 其他标点
   ```

### 验证结果
运行 `node scripts/split-docx-optimized.js` 后：

```
✅ 分段完成，共 4 段

📌 第 3 段 (797 字)
   📋 包含条款: 3.10, 3.11, 3.12, 3.13
   🖼️  包含图片链接
```

**✅ 3.12 工字钢规范完整保留在第 3 段，没有被切断！**

## ✅ 问题 2：数据导入流程

### 方案选择

#### 方案 A：清空旧数据后导入（推荐）
**适用场景**：规范文档有重大更新，需要完全替换

**优点**：
- 数据干净，无冗余
- 避免重复记录
- chunk_index 连续

**缺点**：
- 旧数据丢失（如果有历史记录需求）

#### 方案 B：追加导入
**适用场景**：增量更新，保留历史版本

**优点**：
- 保留历史数据
- 可以对比不同版本

**缺点**：
- 可能产生重复
- chunk_index 不连续
- 需要额外的版本管理字段

### 推荐流程：清空后导入

## 🚀 完整操作步骤

### 步骤 1：创建数据库表

在 Supabase Dashboard 的 SQL Editor 中执行：

```bash
# 复制迁移文件内容
cat migrations/20260521_create_guide_documents.sql
```

或者直接在 SQL Editor 中粘贴 `migrations/20260521_create_guide_documents.sql` 的内容并执行。

**验证**：
```sql
SELECT * FROM guide_documents LIMIT 1;
```

### 步骤 2：生成切片数据

```bash
node scripts/split-docx-optimized.js
```

**输出**：
- 控制台显示分段结果
- 生成 `guide-chunks.json` 文件

**验证**：
```bash
cat guide-chunks.json
```

### 步骤 3：导入数据到 Supabase

```bash
node scripts/import-guide-documents.js
```

**交互提示**：
```
⚠️  是否清空旧数据？(y/N): y
```

- 输入 `y` - 清空旧数据后导入（推荐）
- 输入 `N` 或直接回车 - 追加导入

**输出示例**：
```
📚 审图规范导入工具
================================================================================

📄 读取文件: 展会搭建规范20260521.docx
   总字数: 2098
   分段数: 4
   处理时间: 2026-05-21T02:51:27.745Z

⚠️  是否清空旧数据？(y/N): y

🗑️  清空旧数据...
✅ 旧数据已清空

📥 开始导入 4 条数据...
✅ 成功导入 4 条记录

🔍 验证导入结果...
✅ 数据库中共有 4 条记录

📋 前 3 条记录预览:
  [1] 675 字
  条款: 3.1, 8.5, 3.2, 3.3, 3.4, 3.5
  图片: 否
  内容: 3. 特装展台结构安全...

================================================================================
✅ 导入完成！
================================================================================
```

### 步骤 4：验证数据

在 Supabase Dashboard 的 SQL Editor 中执行：

```sql
-- 查看所有记录
SELECT 
  chunk_index,
  content_length,
  sections,
  has_image,
  LEFT(content, 100) as preview
FROM guide_documents
ORDER BY chunk_index;

-- 查看包含 3.12 的记录
SELECT 
  chunk_index,
  content_length,
  sections
FROM guide_documents
WHERE '3.12' = ANY(sections);

-- 查看包含图片的记录
SELECT 
  chunk_index,
  sections,
  has_image
FROM guide_documents
WHERE has_image = true;
```

## 📊 数据结构说明

### guide_documents 表结构

| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键 |
| chunk_index | INTEGER | 片段序号（1, 2, 3...）|
| content | TEXT | 片段内容 |
| content_length | INTEGER | 内容字数 |
| sections | TEXT[] | 包含的条款编号数组 |
| has_image | BOOLEAN | 是否包含图片链接 |
| metadata | JSONB | 额外元数据 |
| created_at | TIMESTAMPTZ | 创建时间 |
| updated_at | TIMESTAMPTZ | 更新时间 |

### 示例记录

```json
{
  "id": "uuid",
  "chunk_index": 3,
  "content": "3.10 桁架结构展台应做好相应安全措施...",
  "content_length": 797,
  "sections": ["3.10", "3.11", "3.12", "3.13"],
  "has_image": true,
  "metadata": {
    "sourceFile": "展会搭建规范20260521.docx",
    "processedAt": "2026-05-21T..."
  }
}
```

## 🔍 常见问题

### Q1: 为什么要清空旧数据？
A: 避免重复记录，保持 chunk_index 连续。如果需要保留历史版本，建议在 metadata 中添加 version 字段。

### Q2: 如果导入失败怎么办？
A: 检查：
1. Supabase 连接配置（.env.local）
2. 表是否已创建（执行迁移 SQL）
3. RLS 策略是否正确（需要审图员或管理员权限）

### Q3: 如何更新单个片段？
A: 使用 Supabase Dashboard 或 SQL：
```sql
UPDATE guide_documents
SET content = '新内容', updated_at = NOW()
WHERE chunk_index = 3;
```

### Q4: 如何查询包含特定条款的片段？
A:
```sql
SELECT * FROM guide_documents
WHERE '3.12' = ANY(sections);
```

## 📁 相关文件

```
scripts/
  ├── split-docx-optimized.js      # 优化版切片脚本
  ├── import-guide-documents.js    # 导入脚本
  └── README.md                     # 脚本使用说明

migrations/
  └── 20260521_create_guide_documents.sql  # 数据库表创建

guide-chunks.json                  # 切片结果（生成）
展会搭建规范20260521.docx          # 源文档
```

## 🎯 后续应用

导入后可以实现：

1. **关键词搜索** - 使用全文搜索索引
2. **条款查询** - 根据条款编号精确查找
3. **AI 问答** - 结合向量搜索（需要额外配置 pgvector）
4. **图纸审核辅助** - 自动匹配相关规范条款

## ⚠️ 注意事项

1. **权限要求** - 导入脚本需要审图员或管理员权限
2. **数据备份** - 清空前建议先导出旧数据
3. **环境变量** - 确保 .env.local 配置正确
4. **网络连接** - 需要稳定的网络连接到 Supabase

## 📞 技术支持

如遇问题，检查：
1. 控制台错误信息
2. Supabase Dashboard 日志
3. 网络连接状态
4. 环境变量配置
