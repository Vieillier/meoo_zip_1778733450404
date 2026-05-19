# 可再次驳回功能 - 测试指南

## 测试场景

### 场景 1：审图员全部通过后驳回

**前置条件**：
- 展商已提交图纸
- 审图员已审核全部图纸并全部通过

**测试步骤**：
1. 审图员打开图纸审核弹窗
2. 验证所有图纸显示"通过"状态
3. 验证底部显示"审核已完成" + "可再次驳回"按钮
4. 点击"可再次驳回"按钮
5. 确认对话框出现
6. 点击"确定"

**预期结果**：
- 弹窗关闭
- 展商界面恢复到"等待审核"状态
- 展商可再次点击"开启修改模式"
- 所有图纸状态重置为"待审核"
- 审核意见被清空

### 场景 2：审图员有驳回时不显示驳回按钮

**前置条件**：
- 展商已提交图纸
- 审图员已审核，部分图纸驳回

**测试步骤**：
1. 审图员打开图纸审核弹窗
2. 验证部分图纸显示"不通过"状态
3. 验证底部只显示"审核已完成"，**不显示**"可再次驳回"按钮

**预期结果**：
- 只有"审核已完成"和"关闭"按钮
- 不显示"可再次驳回"按钮

### 场景 3：展商整改后重新提交

**前置条件**：
- 已执行场景 1（审图员驳回）
- 展商已修改图纸

**测试步骤**：
1. 展商打开图纸申报页面
2. 验证显示"等待审核"标签
3. 点击"开启修改模式"
4. 修改图纸
5. 点击"提交整改申报"

**预期结果**：
- 整改轮次递增
- 所有图纸状态重置为"待审核"
- 展商界面显示"等待审核"
- 新的整改记录保存到历史

## 数据验证

### 数据库检查

执行以下 SQL 查询验证数据状态：

```sql
-- 查看图纸审核记录
SELECT 
  booth_number,
  is_submitted,
  last_reviewed_at,
  review_round,
  effect_drawing_status,
  elevation_grid_drawing_status,
  plan_drawing_status,
  structure_drawing_status,
  material_drawing_status,
  electrical_system_drawing_status,
  utility_position_drawing_status,
  fire_facility_drawing_status
FROM drawing_documents
WHERE booth_number = '展位号';

-- 查看审核历史
SELECT 
  booth_number,
  drawing_type,
  review_round,
  uploaded_at
FROM drawing_history
WHERE booth_number = '展位号'
ORDER BY uploaded_at DESC;
```

### 预期数据状态

**驳回前**（全部通过）：
- `is_submitted = false`
- `last_reviewed_at = 2024-XX-XX ...`
- 所有 `*_status = 'approved'`
- 所有 `*_comment = ''`

**驳回后**：
- `is_submitted = true`
- `last_reviewed_at = null`
- 所有 `*_status = 'pending'`
- 所有 `*_comment = ''`

## 边界情况

### 1. 网络中断
- 驳回过程中网络中断
- **预期**：显示"驳回失败"提示，数据不变

### 2. 并发操作
- 审图员和展商同时操作
- **预期**：后操作覆盖前操作，最终状态一致

### 3. 重复驳回
- 驳回后立即再次驳回
- **预期**：第二次驳回无效（数据已是待审核状态）

## 性能测试

- 驳回操作响应时间 < 2 秒
- 大量图纸（8 张）驳回无延迟
- 数据库更新无错误日志
