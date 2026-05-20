# ✅ 图纸申报整改模式上传框解锁修复

## 🔴 问题

特装账号的图纸申报整改模式中，上传图纸框没有解锁，无法上传图纸。

## 🔍 根本原因

在 `DrawingSubmission.tsx` 中的 `canEditDoc` 函数（第 296-301 行）：

```typescript
const canEditDoc = (docKey: string) => {
  if (isPreviewMode) return false;
  if (!isSubmitted) return true;
  if (isEditMode && reviewState[getStatusKey(docKey)] === 'rejected') return true;
  return false;
};
```

**问题**：
1. 在整改模式下，只有状态为 `'rejected'` 的图纸才能编辑
2. 但在整改模式中，所有图纸的状态都被重置为 `'pending'`（第 283 行）
3. 所以没有任何图纸的状态是 `'rejected'`
4. 导致上传框无法解锁

## ✅ 修复方案

修改 `canEditDoc` 函数，在整改模式下允许编辑所有未通过的图纸：

```typescript
const canEditDoc = (docKey: string) => {
  if (isPreviewMode) return false;
  if (!isSubmitted) return true;
  // 在整改模式下，允许编辑所有未通过的图纸（包括 pending 和 rejected）
  if (isEditMode) {
    const status = reviewState[getStatusKey(docKey)];
    return status !== 'approved';
  }
  return false;
};
```

**改进**：
- ✅ 在整改模式下，允许编辑所有未通过的图纸
- ✅ 只要状态不是 `'approved'`，就可以编辑
- ✅ 包括 `'pending'` 和 `'rejected'` 状态

## 📊 修复对比

### 修复前
```
整改模式
    ↓
图纸状态：pending
    ↓
canEditDoc 检查：status === 'rejected'？
    ↓
❌ 不匹配，返回 false
    ↓
上传框被禁用
```

### 修复后
```
整改模式
    ↓
图纸状态：pending
    ↓
canEditDoc 检查：status !== 'approved'？
    ↓
✅ 匹配，返回 true
    ↓
上传框解锁
```

## 🚀 部署步骤

### 步骤 1：确认修改

文件：`src/components/DrawingSubmission.tsx`

修改位置：第 296-305 行

### 步骤 2：重新构建和部署

```bash
npm run build
# 或
pnpm build
```

### 步骤 3：测试

1. 特装展商登录
2. 进入图纸申报页面
3. 点击"开启修改模式"进入整改模式
4. ✅ 上传框应该解锁了
5. ✅ 可以上传图纸
6. ✅ 可以删除图纸
7. ✅ 可以提交整改申报

## 📋 验证清单

- [x] 修改了 canEditDoc 函数
- [x] 整改模式下允许编辑所有未通过的图纸
- [x] 代码没有语法错误
- [ ] 重新构建项目
- [ ] 部署到生产环境
- [ ] 测试整改模式上传功能

## 💡 总结

**问题**：整改模式中图纸状态被重置为 `'pending'`，但 `canEditDoc` 只检查 `'rejected'` 状态

**修复**：改为检查状态是否不等于 `'approved'`，这样 `'pending'` 和 `'rejected'` 都能编辑

**结果**：整改模式下上传框正常解锁，用户可以上传图纸
