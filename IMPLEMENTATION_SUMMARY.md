# 可再次驳回功能 - 实现总结

## 功能需求

在审图员图纸审核全部通过后，增加"可再次驳回"按钮，让展商可以再次进入申报模式。

## 实现方案

### 1. 核心逻辑

**新增函数**：`handleRejectAgain()` 在 `DrawingReview.tsx`

功能：
- 确认对话框防止误操作
- 重置所有图纸状态为 `pending`
- 清空所有审核意见
- 设置 `is_submitted = true`（展商需要重新提交）
- 清空 `last_reviewed_at`（清除审核完成标记）

### 2. UI 变更

**按钮显示逻辑**：
```
审核未完成 → 显示"提交审核意见"或"审核通过"
审核已完成 + 全部通过 → 显示"审核已完成" + "可再次驳回"
审核已完成 + 有驳回 → 只显示"审核已完成"
```

**按钮样式**：
- 颜色：橙色（`bg-orange-600`）
- 文本：`可再次驳回`
- 状态：加载时显示"处理中..."

### 3. 数据流转

```
初始状态
├─ is_submitted = true
├─ 所有图纸 status = pending
└─ last_reviewed_at = null

↓ 审图员审核全部通过

通过状态
├─ is_submitted = false
├─ 所有图纸 status = approved
└─ last_reviewed_at = 时间戳

↓ 审图员点击"可再次驳回"

驳回状态
├─ is_submitted = true
├─ 所有图纸 status = pending
├─ 所有审核意见 = ''
└─ last_reviewed_at = null

↓ 展商重新提交整改

新整改状态
├─ is_submitted = true
├─ review_round += 1
├─ 所有图纸 status = pending
└─ last_reviewed_at = null
```

## 代码变更

### 文件：`src/components/DrawingReview.tsx`

**新增代码**（第 179-218 行）：
```typescript
const handleRejectAgain = async () => {
  if (!confirm('确认要驳回此次审核吗？展商将需要重新提交整改申报。')) {
    return;
  }
  setSubmitting(true);
  try {
    const { data: existing } = await supabase
      .from('drawing_documents')
      .select('id, review_round')
      .eq('booth_number', boothNumber)
      .maybeSingle();

    if (!existing) {
      alert('未找到审核记录');
      setSubmitting(false);
      return;
    }

    // 重置所有图纸状态为待审核，清空审核意见
    const updateData: any = {};
    DRAWING_TYPES.forEach(({ dbField }) => {
      updateData[`${dbField}_status`] = 'pending';
      updateData[`${dbField}_comment`] = '';
    });

    updateData.is_submitted = true;
    updateData.last_reviewed_at = null;

    await supabase
      .from('drawing_documents')
      .update(updateData)
      .eq('id', existing.id);

    alert('已驳回此次审核，展商可重新提交整改申报');
    onClose();
  } catch (error) {
    alert('驳回失败: ' + (error as Error).message);
  }
  setSubmitting(false);
};
```

**修改按钮部分**（第 296-314 行）：
- 在"审核已完成"后添加条件判断
- 仅当 `allApproved` 为 true 时显示"可再次驳回"按钮
- 按钮绑定 `handleRejectAgain` 函数

## 与现有逻辑的兼容性

### DrawingSubmission.tsx（展商端）

无需修改，现有逻辑自动支持：
- `isEditMode` 状态管理
- `handleEnableEditMode()` 函数
- `handleSubmitRectification()` 函数

展商界面会自动显示：
- "开启修改模式"按钮（当 `isSubmitted && hasBeenReviewed() && !allApproved`）
- "等待审核"标签（当 `isSubmitted && !finalApproved`）

### 数据库表结构

无需修改，使用现有字段：
- `is_submitted`
- `last_reviewed_at`
- `review_round`
- `*_status`
- `*_comment`

## 测试清单

- [ ] 审图员全部通过后显示"可再次驳回"按钮
- [ ] 点击按钮显示确认对话框
- [ ] 确认后数据正确重置
- [ ] 展商界面恢复到"等待审核"状态
- [ ] 展商可再次进入修改模式
- [ ] 有驳回时不显示"可再次驳回"按钮
- [ ] 网络错误时显示错误提示
- [ ] 数据库数据一致性验证

## 部署步骤

1. 更新 `src/components/DrawingReview.tsx`
2. 编译项目：`npm run build`
3. 测试功能
4. 部署到生产环境

## 回滚方案

如需回滚，恢复 `DrawingReview.tsx` 到之前版本即可，无数据库迁移需求。
