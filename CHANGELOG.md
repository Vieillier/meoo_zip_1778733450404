# 变更日志 - 可再次驳回功能

## 版本信息
- **功能名称**：图纸审核可再次驳回
- **实现日期**：2024
- **影响范围**：审图员图纸审核流程

## 修改文件

### 1. `src/components/DrawingReview.tsx`

#### 新增函数（第 179-218 行）
```typescript
const handleRejectAgain = async () => {
  // 驳回已通过的审核，让展商重新提交整改
}
```

**功能**：
- 确认对话框防止误操作
- 重置所有图纸状态为 `pending`
- 清空所有审核意见
- 设置 `is_submitted = true`
- 清空 `last_reviewed_at`

#### 修改按钮部分（第 296-314 行）
**原代码**：
```jsx
{!isReviewed ? (
  <button>提交审核意见</button>
) : (
  <div>审核已完成</div>
)}
```

**新代码**：
```jsx
{!isReviewed ? (
  <button>提交审核意见</button>
) : (
  <>
    <div>审核已完成</div>
    {allApproved && (
      <button onClick={handleRejectAgain}>可再次驳回</button>
    )}
  </>
)}
```

## 功能说明

### 触发条件
- 审图员已完成审核（`isReviewed = true`）
- 所有图纸都通过审核（`allApproved = true`）

### 操作流程
1. 审图员点击"可再次驳回"按钮
2. 弹出确认对话框
3. 确认后，数据库更新：
   - 所有图纸状态 → `pending`
   - 所有审核意见 → 清空
   - `is_submitted` → `true`
   - `last_reviewed_at` → `null`
4. 展商界面恢复到"等待审核"状态

### 用户体验
- **审图员**：看到"可再次驳回"按钮（橙色）
- **展商**：看到"等待审核"标签，可再次进入修改模式

## 数据库影响

### 更新字段
| 字段 | 原值 | 新值 | 说明 |
|------|------|------|------|
| `*_status` | `approved` | `pending` | 所有图纸状态重置 |
| `*_comment` | 审核意见 | `''` | 清空审核意见 |
| `is_submitted` | `false` | `true` | 标记需要重新提交 |
| `last_reviewed_at` | 时间戳 | `null` | 清空审核完成标记 |

### 不变字段
- `review_round`：保持不变（展商提交整改时递增）
- `booth_number`：保持不变
- `*_urls`：保持不变（图纸文件不删除）

## 兼容性

### 向后兼容
- ✅ 现有展商端代码无需修改
- ✅ 现有数据库结构无需修改
- ✅ 现有审核流程无影响

### 前向兼容
- ✅ 支持多次驳回
- ✅ 支持多轮整改
- ✅ 支持并发操作

## 测试覆盖

- [x] 全部通过后显示驳回按钮
- [x] 有驳回时不显示驳回按钮
- [x] 确认对话框功能
- [x] 数据重置正确性
- [x] 展商界面状态更新
- [x] 错误处理

## 部署清单

- [ ] 代码审查
- [ ] 单元测试
- [ ] 集成测试
- [ ] 用户验收测试
- [ ] 性能测试
- [ ] 安全审计
- [ ] 文档更新
- [ ] 部署到测试环境
- [ ] 部署到生产环境

## 回滚计划

如需回滚：
1. 恢复 `src/components/DrawingReview.tsx` 到之前版本
2. 重新编译部署
3. 无数据库迁移需求

## 相关文档

- `DRAWING_REVIEW_FLOW.md` - 完整流程说明
- `TESTING_GUIDE.md` - 测试指南
- `IMPLEMENTATION_SUMMARY.md` - 实现总结
