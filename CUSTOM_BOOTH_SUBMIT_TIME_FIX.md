# ✅ 特装审图列表提交时间显示修复

## 🔴 问题

审图员特装审图列表中，展商已经申报了图纸或资质文件，审图员也能看到文件预览，但提交时间还是显示"未提交"。

## 🔍 根本原因

在 `CustomBoothReview.tsx` 中，获取提交时间时使用的是 **`last_reviewed_at`**（最后一次审核时间），而不是 **`submitted_at`**（最后一次提交时间）。

### 问题代码

**第 78-82 行**：查询时使用了 `last_reviewed_at`
```typescript
const { data: drawingDocsData } = await supabase
  .from('drawing_documents')
  .select('booth_number, last_reviewed_at')  // ❌ 错误
  .in('booth_number', boothNumbers);
```

**第 96 行**：赋值时也使用了 `last_reviewed_at`
```typescript
submitted_at: drawingDoc?.last_reviewed_at || null  // ❌ 错误
```

### 为什么会显示"未提交"？

1. 展商首次提交图纸 → `submitted_at` 被设置，`last_reviewed_at` 也被设置
2. 审图员驳回 → `last_reviewed_at` 被设置为 `null`，但 `submitted_at` 保持不变
3. 所以即使展商已经提交了文件，如果被驳回过，`last_reviewed_at` 就是 `null`，显示"未提交"

## ✅ 修复方案

改用 **`submitted_at`** 字段代替 **`last_reviewed_at`**

### 修复后的代码

**第 78-82 行**：查询时使用 `submitted_at`
```typescript
const { data: drawingDocsData } = await supabase
  .from('drawing_documents')
  .select('booth_number, submitted_at')  // ✅ 正确
  .in('booth_number', boothNumbers);
```

**第 96 行**：赋值时使用 `submitted_at`
```typescript
submitted_at: drawingDoc?.submitted_at || null  // ✅ 正确
```

## 📊 字段说明

| 字段 | 含义 | 更新时机 | 驳回后 |
|------|------|---------|--------|
| `submitted_at` | 展商最后一次提交的时间 | 展商提交或重新提交 | 保持不变 ✅ |
| `last_reviewed_at` | 审图员最后一次审核的时间 | 审图员审核 | 被设置为 null ❌ |

## 🚀 部署步骤

### 步骤 1：确认修改

文件：`src/components/CustomBoothReview.tsx`

修改位置：
- 第 78-82 行：查询语句
- 第 96 行：赋值语句

### 步骤 2：重新构建和部署

```bash
npm run build
# 或
pnpm build
```

### 步骤 3：测试

1. 审图员登录
2. 进入特装审图列表
3. 查看已申报图纸的展商
4. ✅ 提交时间应该显示具体时间，而不是"未提交"

## 📋 验证清单

- [x] 修改了查询语句，使用 `submitted_at`
- [x] 修改了赋值语句，使用 `submitted_at`
- [x] 代码没有语法错误
- [ ] 重新构建项目
- [ ] 部署到生产环境
- [ ] 测试提交时间显示

## 💡 总结

**问题**：使用了 `last_reviewed_at`（审核时间）而不是 `submitted_at`（提交时间）

**修复**：改用 `submitted_at` 字段

**结果**：现在能正确显示展商的最后一次提交时间，即使被驳回过也能显示
