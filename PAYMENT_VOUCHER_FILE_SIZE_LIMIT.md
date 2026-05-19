# 🔧 付费凭证文件大小限制（5MB）

## 功能说明

限制付费凭证上传文件的大小为 **5MB 以内**。

## 实现方案

### 1. 定义文件大小常量

**文件**：`src/components/InvoicePayment.tsx`

**位置**：第 22-23 行

**代码**：
```typescript
// 文件大小限制：5MB
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB in bytes
```

### 2. 在文件选择时检查文件大小

**文件**：`src/components/InvoicePayment.tsx`

**位置**：第 136-140 行（handleFileSelect 函数）

**代码**：
```typescript
// 检查文件大小
if (file.size > MAX_FILE_SIZE) {
  alert(`文件大小超过限制！最大允许 5MB，当前文件大小 ${(file.size / 1024 / 1024).toFixed(2)}MB`);
  return;
}
```

### 3. 在拖拽上传时检查文件大小

**文件**：`src/components/InvoicePayment.tsx`

**位置**：第 152-156 行（handleDrop 函数）

**代码**：
```typescript
// 检查文件大小
if (file.size > MAX_FILE_SIZE) {
  alert(`文件大小超过限制！最大允许 5MB，当前文件大小 ${(file.size / 1024 / 1024).toFixed(2)}MB`);
  return;
}
```

## 修改文件

### `src/components/InvoicePayment.tsx`

**修改 1**：添加常量（第 22-23 行）
```typescript
const STORAGE_KEY = 'invoice_draft';
// 文件大小限制：5MB
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB in bytes
```

**修改 2**：在 handleFileSelect 函数中添加检查（第 136-140 行）
```typescript
const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (file && isImageFile(file)) {
    // 检查文件大小
    if (file.size > MAX_FILE_SIZE) {
      alert(`文件大小超过限制！最大允许 5MB，当前文件大小 ${(file.size / 1024 / 1024).toFixed(2)}MB`);
      return;
    }
    setSelectedFile(file);
  } else if (file) {
    alert('仅支持图片类文件');
  }
};
```

**修改 3**：在 handleDrop 函数中添加检查（第 152-156 行）
```typescript
const handleDrop = useCallback((e: React.DragEvent) => {
  e.preventDefault();
  setIsDragging(false);
  const file = e.dataTransfer.files[0];
  if (file && isImageFile(file)) {
    // 检查文件大小
    if (file.size > MAX_FILE_SIZE) {
      alert(`文件大小超过限制！最大允许 5MB，当前文件大小 ${(file.size / 1024 / 1024).toFixed(2)}MB`);
      return;
    }
    setSelectedFile(file);
  } else if (file) {
    alert('仅支持图片类文件');
  }
}, []);
```

## 工作流程

### 用户上传付费凭证时

```
用户选择文件
    ↓
检查文件大小
    ↓
文件 ≤ 5MB？
    ├─ 是 → 继续上传
    └─ 否 → 显示错误提示，停止上传
```

## 错误提示示例

**文件过大时**：
```
文件大小超过限制！最大允许 5MB，当前文件大小 8.50MB
```

**文件正常时**：
- 无提示
- 继续上传

## 代码质量

- ✅ 无 TypeScript 错误
- ✅ 无 ESLint 警告
- ✅ 逻辑清晰
- ✅ 用户友好的错误提示

## 功能特点

- ✅ **简单高效**：在上传前检查文件大小
- ✅ **用户友好**：显示当前文件大小
- ✅ **防止浪费**：避免上传超大文件
- ✅ **节省带宽**：减少不必要的网络传输
- ✅ **两种上传方式**：支持点击选择和拖拽上传

## 测试验证

### 测试 1：上传小于 5MB 的文件

**步骤**：
1. 选择一个小于 5MB 的图片文件
2. 点击上传或拖拽上传

**预期结果**：
- ✅ 文件上传成功
- ✅ 无错误提示

### 测试 2：上传大于 5MB 的文件

**步骤**：
1. 选择一个大于 5MB 的图片文件
2. 点击上传或拖拽上传

**预期结果**：
- ❌ 显示错误提示：`文件大小超过限制！最大允许 5MB，当前文件大小 X.XXMB`
- ❌ 文件不上传

### 测试 3：拖拽上传大文件

**步骤**：
1. 准备一个大于 5MB 的图片文件
2. 拖拽到上传区域

**预期结果**：
- ❌ 显示错误提示
- ❌ 文件不上传

## 总结

这个功能确保了：
1. ✅ 付费凭证文件大小不超过 5MB
2. ✅ 用户得到清晰的错误提示
3. ✅ 节省网络带宽和存储空间
4. ✅ 提升系统稳定性

**关键点**：在上传前检查文件大小，超过 5MB 则拒绝上传并显示错误提示。
