# 手动测试执行指南

## 🎯 测试前准备

### 1. 环境准备
```bash
# 进入项目目录
cd d:\AI\CURSOR\20260514\ 审图平台部署第一版\meoo_zip_1778733450404

# 安装依赖（如果还未安装）
npm install

# 启动开发服务器
npm run dev
```

### 2. 测试账号准备
- **审图员账号**：用于审核图纸
- **展商账号**：用于提交和修改图纸

### 3. 测试数据准备
- 确保有展商已提交图纸
- 记录展位号（用于数据库查询）

## 📋 场景 1：审图员全部通过后驳回

### 步骤 1：登录审图员账号
```
1. 打开应用首页
2. 输入审图员账号和密码
3. 点击登录
4. 进入审图员工作台
```

### 步骤 2：找到展商的图纸审核
```
1. 在审图员工作台找到展商列表
2. 找到已提交图纸的展商
3. 点击进入该展商的详情页
4. 找到"图纸审核"相关功能
5. 点击打开图纸审核弹窗
```

### 步骤 3：审核所有图纸为通过
```
1. 在弹窗中看到 8 张图纸：
   - 多角度效果图
   - 立面网格图
   - 平面图
   - 内部结构图
   - 材质图
   - 配电系统图
   - 水电气网点位设施位置图
   - 消防设施布局图

2. 对每张图纸点击"通过"按钮
3. 验证每张图纸显示"✓ 通过"标签
```

### 步骤 4：提交审核（全部通过）
```
1. 点击底部"审核通过"按钮
2. 看到提示"所有图纸审核通过"
3. 弹窗关闭
4. 返回到审图员工作台
```

### 步骤 5：重新打开图纸审核弹窗
```
1. 再次点击该展商的图纸审核
2. 打开图纸审核弹窗
3. 验证所有图纸仍显示"✓ 通过"状态
```

### 步骤 6：验证"可再次驳回"按钮
```
✅ 检查点：
- 底部显示"审核已完成"
- 底部显示"可再次驳回"按钮（橙色）
- 底部显示"关闭"按钮
```

### 步骤 7：点击"可再次驳回"按钮
```
1. 点击"可再次驳回"按钮
2. 看到确认对话框：
   "确认要驳回此次审核吗？展商将需要重新提交整改申报。"
3. 点击"确定"
```

### 步骤 8：验证驳回结果
```
✅ 检查点：
- 弹窗关闭
- 返回到审图员工作台
- 看到提示"已驳回此次审核，展商可重新提交整改申报"
```

### 步骤 9：数据库验证（驳回后）
```sql
-- 在数据库中执行查询
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

-- 预期结果：
-- is_submitted = true
-- last_reviewed_at = null
-- 所有 *_status = 'pending'
```

## 📋 场景 2：审图员有驳回时不显示驳回按钮

### 步骤 1-2：同场景 1

### 步骤 3：审核图纸（部分驳回）
```
1. 对前 4 张图纸点击"通过"
2. 对后 4 张图纸点击"不通过"
3. 对驳回的图纸输入审核意见，例如：
   - "尺寸不符合要求"
   - "材质需要调整"
   等
```

### 步骤 4：提交审核
```
1. 点击"提交审核意见"按钮
2. 看到提示"审核意见已提交，等待展商整改"
3. 弹窗关闭
```

### 步骤 5：重新打开图纸审核弹窗
```
1. 再次点击该展商的图纸审核
2. 打开图纸审核弹窗
```

### 步骤 6：验证按钮显示
```
✅ 检查点：
- 底部显示"审核已完成"
- 底部 ❌ 不显示"可再次驳回"按钮
- 底部显示"关闭"按钮
- 驳回的图纸显示审核意见
```

## 📋 场景 3：展商整改后重新提交

### 步骤 1：登录展商账号
```
1. 退出审图员账号
2. 用展商账号登录
3. 进入展商工作台
4. 点击"图纸申报"标签页
```

### 步骤 2：验证界面状态
```
✅ 检查点：
- 显示"等待审核"标签（黄色）
- 显示"开启修改模式"按钮
- 所有图纸显示"待审核"状态
```

### 步骤 3：开启修改模式
```
1. 点击"开启修改模式"按钮
2. 界面变为可编辑状态
3. 显示"整改模式"标签（蓝色）
```

### 步骤 4：修改图纸
```
1. 对需要修改的图纸进行修改：
   - 删除旧文件（点击 X 按钮）
   - 上传新文件（拖拽或点击上传）
2. 验证新文件已上传
```

### 步骤 5：提交整改申报
```
1. 点击"提交整改申报"按钮
2. 看到提示"整改申报已提交，等待审核"
3. 界面返回到非编辑状态
```

### 步骤 6：验证整改结果
```
✅ 检查点：
- 显示"等待审核"标签
- 显示"第 1 轮整改"（如果是第一次整改）
- 新上传的文件显示在"已上传"列表中
- 历史记录中显示新的上传记录
```

### 步骤 7：数据库验证（整改后）
```sql
-- 查看图纸审核记录
SELECT 
  booth_number,
  is_submitted,
  last_reviewed_at,
  review_round,
  effect_drawing_status
FROM drawing_documents
WHERE booth_number = '展位号';

-- 预期结果：
-- is_submitted = true
-- last_reviewed_at = null
-- review_round = 1（或更高）
-- 所有 *_status = 'pending'

-- 查看审核历史
SELECT 
  booth_number,
  drawing_type,
  review_round,
  uploaded_at
FROM drawing_history
WHERE booth_number = '展位号'
ORDER BY uploaded_at DESC;

-- 预期结果：
-- 显示新的上传记录，review_round = 1
```

## 🔍 数据库验证步骤

### 连接数据库
```
1. 打开 Supabase 控制台
2. 进入 SQL Editor
3. 选择正确的数据库
```

### 执行查询
```sql
-- 查询 1：查看图纸审核记录
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
  fire_facility_drawing_status,
  effect_drawing_comment,
  elevation_grid_drawing_comment
FROM drawing_documents
WHERE booth_number = '展位号';
```

### 验证结果
```
✅ 驳回前（全部通过）：
- is_submitted = false
- last_reviewed_at = 时间戳
- 所有 *_status = 'approved'
- 所有 *_comment = ''

✅ 驳回后：
- is_submitted = true
- last_reviewed_at = null
- 所有 *_status = 'pending'
- 所有 *_comment = ''

✅ 整改后：
- is_submitted = true
- last_reviewed_at = null
- review_round = 1（或更高）
- 所有 *_status = 'pending'
```

## 🐛 常见问题排查

### 问题 1：按钮不显示
```
排查步骤：
1. 检查是否所有图纸都是"通过"状态
2. 打开浏览器开发者工具（F12）
3. 查看 Console 是否有错误
4. 检查 allApproved 变量值
```

### 问题 2：驳回后数据没有重置
```
排查步骤：
1. 刷新页面
2. 重新打开图纸审核弹窗
3. 检查数据库中的数据
4. 查看浏览器 Console 中的错误
```

### 问题 3：展商看不到修改模式
```
排查步骤：
1. 检查 is_submitted 是否为 true
2. 检查 last_reviewed_at 是否为 null
3. 刷新展商页面
4. 查看浏览器 Console 中的错误
```

## ✅ 测试完成检查表

- [ ] 场景 1：审图员全部通过后驳回 - 通过
- [ ] 场景 2：审图员有驳回时不显示驳回按钮 - 通过
- [ ] 场景 3：展商整改后重新提交 - 通过
- [ ] 数据库验证 - 通过
- [ ] 边界情况测试 - 通过
- [ ] 性能测试 - 通过
- [ ] 浏览器兼容性测试 - 通过

## 📝 测试报告模板

```
测试日期：YYYY-MM-DD
测试人员：
测试环境：

场景 1：审图员全部通过后驳回
- 结果：✅ 通过 / ❌ 失败
- 问题描述：
- 截图：

场景 2：审图员有驳回时不显示驳回按钮
- 结果：✅ 通过 / ❌ 失败
- 问题描述：
- 截图：

场景 3：展商整改后重新提交
- 结果：✅ 通过 / ❌ 失败
- 问题描述：
- 截图：

总体结果：✅ 通过 / ❌ 失败
```

## 🎉 测试完成

所有测试通过后，可以进行部署。
