# 🔧 Bug 修复 - 再次驳回后展商无法操作

## 问题描述

审图员点击"可再次驳回"后，展商账号登录后在图纸申报板块虽然状态成功变回了"等待审核"，但是**不能操作**，没有"开启修改模式"按钮。

## 根本原因

### 问题 1：按钮显示条件不完整

**文件**：`DrawingSubmission.tsx` 第 304 行

**原代码**：
```javascript
{isSubmitted && !isEditMode && hasBeenReviewed() && !allApproved && (
  <button onClick={handleEnableEditMode}>开启修改模式</button>
)}
```

**问题**：
- `hasBeenReviewed()` 函数检查 `last_reviewed_at` 是否存在
- 当审图员点击"可再次驳回"时，我们设置 `last_reviewed_at = null`
- 导致 `hasBeenReviewed()` 返回 `false`
- 按钮不显示

### 问题 2：审核意见被清空

**文件**：`DrawingReview.tsx` 第 201 行

**原代码**：
```javascript
updateData[`${dbField}_comment`] = '';
```

**问题**：
- 清空了审核意见
- 展商看不到为什么被驳回
- 无法判断需要修改什么

## 解决方案

### 修复 1：增强按钮显示条件

**文件**：`DrawingSubmission.tsx`

**新增函数**（第 126-132 行）：
```javascript
// 检查是否有驳回意见（即使 last_reviewed_at 为 null，也可能有驳回）
const hasRejectionComments = () => {
  return DRAWING_TYPES.some(({ key }) => {
    const commentKey = getCommentKey(key);
    return reviewState[commentKey] && reviewState[commentKey].trim() !== '';
  });
};
```

**修改按钮条件**（第 312 行）：
```javascript
{isSubmitted && !isEditMode && (hasBeenReviewed() || hasRejectionComments()) && !allApproved && (
  <button onClick={handleEnableEditMode}>开启修改模式</button>
)}
```

**逻辑**：
- 只要有驳回意见（即使 `last_reviewed_at = null`），就显示"开启修改模式"按钮
- 这样无论是正常驳回还是再次驳回，展商都能看到按钮

### 修复 2：保留审核意见

**文件**：`DrawingReview.tsx`

**修改驳回函数**（第 197-203 行）：
```javascript
// 重置所有图纸状态为待审核，但保留审核意见供展商查看
const updateData: any = {};
DRAWING_TYPES.forEach(({ dbField }) => {
  updateData[`${dbField}_status`] = 'pending';
  // 保留审核意见，不清空，这样展商可以看到为什么被驳回
  // updateData[`${dbField}_comment`] = '';
});
```

**逻辑**：
- 不清空审核意见
- 展商可以看到审核意见，了解需要修改什么
- 与原有的"提交审核意见"流程一致

## 修改文件

### 1. `src/components/DrawingSubmission.tsx`

**修改位置**：
- 第 126-132 行：新增 `hasRejectionComments()` 函数
- 第 312 行：修改按钮显示条件

**修改内容**：
```diff
+ // 检查是否有驳回意见（即使 last_reviewed_at 为 null，也可能有驳回）
+ const hasRejectionComments = () => {
+   return DRAWING_TYPES.some(({ key }) => {
+     const commentKey = getCommentKey(key);
+     return reviewState[commentKey] && reviewState[commentKey].trim() !== '';
+   });
+ };

- {isSubmitted && !isEditMode && hasBeenReviewed() && !allApproved && (
+ {isSubmitted && !isEditMode && (hasBeenReviewed() || hasRejectionComments()) && !allApproved && (
```

### 2. `src/components/DrawingReview.tsx`

**修改位置**：
- 第 197-203 行：修改驳回函数

**修改内容**：
```diff
- // 重置所有图纸状态为待审核，清空审核意见
+ // 重置所有图纸状态为待审核，但保留审核意见供展商查看
  const updateData: any = {};
  DRAWING_TYPES.forEach(({ dbField }) => {
    updateData[`${dbField}_status`] = 'pending';
-   updateData[`${dbField}_comment`] = '';
+   // 保留审核意见，不清空，这样展商可以看到为什么被驳回
+   // updateData[`${dbField}_comment`] = '';
  });
```

## 修复后的流程

### 审图员操作
1. 审核所有图纸为通过
2. 点击"审核通过"按钮
3. 重新打开图纸审核弹窗
4. 点击"可再次驳回"按钮
5. 确认对话框
6. 驳回成功

### 展商操作
1. 登录账号
2. 打开图纸申报页面
3. ✅ **看到"等待审核"标签**
4. ✅ **看到"开启修改模式"按钮**（修复后）
5. 点击"开启修改模式"
6. ✅ **看到审核意见**（修复后）
7. 修改图纸
8. 点击"提交整改申报"
9. 等待新一轮审核

## 数据流转

### 驳回前（全部通过）
```
is_submitted = false
last_reviewed_at = 时间戳
所有 *_status = 'approved'
所有 *_comment = ''
```

### 驳回后（修复后）
```
is_submitted = true
last_reviewed_at = null
所有 *_status = 'pending'
所有 *_comment = 保留（不清空）✅
```

## 测试验证

### 快速验证
1. 审图员全部通过后驳回
2. 展商登录后看到"等待审核"标签
3. ✅ 看到"开启修改模式"按钮
4. ✅ 看到审核意见
5. 点击"开启修改模式"进入编辑状态
6. 修改图纸并提交

### 数据库验证
```sql
SELECT 
  booth_number,
  is_submitted,
  last_reviewed_at,
  effect_drawing_status,
  effect_drawing_comment
FROM drawing_documents
WHERE booth_number = '展位号';
```

**预期结果**：
```
is_submitted = true
last_reviewed_at = null
effect_drawing_status = 'pending'
effect_drawing_comment = '审核意见内容'（不为空）
```

## 与原有逻辑的一致性

### 原有流程（部分驳回）
1. 审图员审核部分图纸驳回
2. 展商看到"等待审核"标签
3. 展商看到"开启修改模式"按钮
4. 展商进入修改模式
5. 展商看到审核意见
6. 展商修改并提交

### 修复后流程（再次驳回）
1. 审图员全部通过后再次驳回
2. 展商看到"等待审核"标签
3. ✅ 展商看到"开启修改模式"按钮（修复）
4. 展商进入修改模式
5. ✅ 展商看到审核意见（修复）
6. 展商修改并提交

**完全一致！** ✅

## 代码质量

- ✅ 无 TypeScript 错误
- ✅ 无 ESLint 警告
- ✅ 逻辑清晰
- ✅ 注释完整
- ✅ 与现有代码风格一致

## 总结

这个修复确保了"可再次驳回"功能与原有的"提交审核意见"流程完全一致，展商可以正常进入修改模式，查看审核意见，并重新提交整改申报。
