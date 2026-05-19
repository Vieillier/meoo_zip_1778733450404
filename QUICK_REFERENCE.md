# 快速参考 - 可再次驳回功能

## 核心改动

**文件**：`src/components/DrawingReview.tsx`

**新增**：
- 函数 `handleRejectAgain()` - 驳回已通过的审核
- 按钮 "可再次驳回" - 仅在全部通过时显示

**行数**：
- 新增代码：40 行（第 179-218 行）
- 修改代码：18 行（第 296-314 行）

## 功能流程

```
审图员审核全部通过
        ↓
显示"可再次驳回"按钮
        ↓
点击按钮 → 确认对话框
        ↓
确认 → 数据重置
        ↓
展商看到"等待审核"
        ↓
展商重新提交整改
```

## 数据变更

| 操作 | 字段 | 变更 |
|------|------|------|
| 驳回 | `*_status` | `approved` → `pending` |
| 驳回 | `*_comment` | 清空 |
| 驳回 | `is_submitted` | `false` → `true` |
| 驳回 | `last_reviewed_at` | 时间戳 → `null` |

## 按钮显示规则

```
审核未完成
  ├─ 显示：提交审核意见 / 审核通过
  └─ 隐藏：可再次驳回

审核已完成 + 全部通过
  ├─ 显示：审核已完成 + 可再次驳回
  └─ 隐藏：无

审核已完成 + 有驳回
  ├─ 显示：审核已完成
  └─ 隐藏：可再次驳回
```

## 关键代码片段

### 驳回函数
```typescript
const handleRejectAgain = async () => {
  if (!confirm('确认要驳回此次审核吗？')) return;
  
  // 重置所有图纸状态
  const updateData = {};
  DRAWING_TYPES.forEach(({ dbField }) => {
    updateData[`${dbField}_status`] = 'pending';
    updateData[`${dbField}_comment`] = '';
  });
  
  updateData.is_submitted = true;
  updateData.last_reviewed_at = null;
  
  // 更新数据库
  await supabase.from('drawing_documents')
    .update(updateData).eq('id', existing.id);
};
```

### 按钮条件
```jsx
{allApproved && (
  <button onClick={handleRejectAgain}>
    可再次驳回
  </button>
)}
```

## 测试要点

1. **显示条件**
   - ✓ 全部通过时显示
   - ✓ 有驳回时隐藏

2. **功能测试**
   - ✓ 点击显示确认框
   - ✓ 确认后数据重置
   - ✓ 展商界面更新

3. **数据验证**
   - ✓ 所有状态 = pending
   - ✓ 所有意见 = ''
   - ✓ is_submitted = true
   - ✓ last_reviewed_at = null

## 常见问题

**Q: 驳回后展商看不到修改模式？**
A: 检查 `is_submitted` 是否为 `true`，`last_reviewed_at` 是否为 `null`

**Q: 驳回按钮不显示？**
A: 检查 `allApproved` 是否为 `true`（所有图纸都是 approved）

**Q: 数据没有重置？**
A: 检查数据库更新是否成功，查看浏览器控制台错误

## 部署步骤

1. 更新代码
2. 编译：`npm run build`
3. 测试
4. 部署

## 回滚步骤

1. 恢复文件
2. 编译：`npm run build`
3. 部署

无需数据库迁移。
