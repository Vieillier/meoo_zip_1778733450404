# 🎯 如何执行测试 - 完整指南

## 📌 快速答案

**问题**：如何先执行 TESTING_GUIDE.md 中的测试用例？

**答案**：有 3 种方式，选择适合你的：

### 方式 1：快速测试（推荐新手）⭐
**时间**：5 分钟
**文件**：`QUICK_TEST_CHECKLIST.md`

```bash
# 1. 启动开发服务器
npm run dev

# 2. 打开浏览器
# http://localhost:3000

# 3. 按照清单逐项检查
```

### 方式 2：手动测试（推荐详细验证）⭐⭐
**时间**：30 分钟
**文件**：`MANUAL_TESTING_GUIDE.md`

```bash
# 1. 启动开发服务器
npm run dev

# 2. 按照指南执行 3 个测试场景
# - 场景 1：审图员全部通过后驳回
# - 场景 2：审图员有驳回时不显示驳回按钮
# - 场景 3：展商整改后重新提交

# 3. 验证数据库数据
```

### 方式 3：自动化测试（推荐自动化）⭐⭐⭐
**时间**：5 分钟
**文件**：`AUTOMATED_TESTING_SCRIPT.md`

```bash
# 1. 创建测试脚本
# 参考 AUTOMATED_TESTING_SCRIPT.md

# 2. 配置环境变量
# SUPABASE_URL=...
# SUPABASE_KEY=...

# 3. 运行脚本
node test-reject-again.js
```

---

## 🚀 推荐流程

### 第一次测试（新手）
```
1. 快速测试（5 分钟）
   ↓
2. 如果通过 → 可以部署
   如果失败 → 查看手动测试指南排查
```

### 完整测试（推荐）
```
1. 快速测试（5 分钟）
   ↓
2. 手动测试（30 分钟）
   ↓
3. 自动化测试（5 分钟）
   ↓
4. 所有通过 → 可以部署
```

---

## 📋 详细步骤

### 步骤 1：启动开发服务器

```bash
# 进入项目目录
cd d:\AI\CURSOR\20260514\ 审图平台部署第一版\meoo_zip_1778733450404

# 安装依赖（如果还未安装）
npm install

# 启动开发服务器
npm run dev
```

**预期输出**：
```
> webpack serve --mode development

<i> [webpack-dev-server] Project is running at:
<i> [webpack-dev-server] http://localhost:3000/
```

### 步骤 2：打开浏览器

```
打开：http://localhost:3000
```

### 步骤 3：选择测试方式

#### 🟢 快速测试（推荐）

打开文件：`QUICK_TEST_CHECKLIST.md`

按照以下步骤：

```
1. 登录审图员账号
2. 找到已提交图纸的展商
3. 打开图纸审核弹窗
4. 对所有图纸点击"通过"
5. 点击"审核通过"按钮
6. 重新打开图纸审核弹窗
7. 验证"可再次驳回"按钮显示
8. 点击"可再次驳回"按钮
9. 确认对话框
10. 验证驳回成功
```

**预期结果**：
- ✅ 按钮显示正确
- ✅ 驳回功能正常
- ✅ 展商界面更新

#### 🟡 手动测试（详细）

打开文件：`MANUAL_TESTING_GUIDE.md`

执行 3 个测试场景：

**场景 1**：审图员全部通过后驳回
- 步骤详见文件第 5-24 行
- 验证点详见文件第 19-24 行

**场景 2**：审图员有驳回时不显示驳回按钮
- 步骤详见文件第 26-39 行
- 验证点详见文件第 37-39 行

**场景 3**：展商整改后重新提交
- 步骤详见文件第 41-58 行
- 验证点详见文件第 54-58 行

#### 🔵 自动化测试（脚本）

打开文件：`AUTOMATED_TESTING_SCRIPT.md`

创建测试脚本：

```bash
# 1. 创建文件 test-reject-again.js
# 复制文件中的代码

# 2. 创建 .env.local 文件
SUPABASE_URL=your-supabase-url
SUPABASE_KEY=your-supabase-key

# 3. 运行脚本
node test-reject-again.js
```

**预期输出**：
```
🚀 开始运行测试...
📍 测试展位号: A001

🧪 运行测试 1：验证驳回前的数据状态
✅ 查询成功

🧪 运行测试 2：模拟全部通过的审核
✅ 更新成功

🧪 运行测试 3：验证驳回功能
✅ 驳回成功

🧪 运行测试 4：验证驳回后的数据状态
  ✅ is_submitted = true
  ✅ last_reviewed_at = null
  ✅ effect_drawing_status = pending
  ✅ effect_drawing_comment = ""

🧪 运行测试 5：验证历史记录
✅ 查询成功

==================================================
📊 测试结果汇总
==================================================
✅ 通过: 5
❌ 失败: 0
📈 总计: 5
==================================================

🎉 所有测试通过！
```

---

## 🔍 数据库验证

### 连接数据库

```
1. 打开 Supabase 控制台
2. 进入 SQL Editor
3. 选择正确的数据库
```

### 执行查询

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
```

### 验证结果

**驳回前**（全部通过）：
```
is_submitted = false
last_reviewed_at = 2024-01-15T10:30:00.000Z
effect_drawing_status = 'approved'
```

**驳回后**：
```
is_submitted = true
last_reviewed_at = null
effect_drawing_status = 'pending'
```

---

## ✅ 测试完成标准

### 快速测试通过
- ✅ 按钮显示正确
- ✅ 驳回功能正常
- ✅ 展商界面更新

### 手动测试通过
- ✅ 场景 1 通过
- ✅ 场景 2 通过
- ✅ 场景 3 通过
- ✅ 数据库验证通过

### 自动化测试通过
- ✅ 所有 5 个测试用例通过
- ✅ 无错误日志

---

## 🐛 常见问题

### Q1：按钮不显示怎么办？
**A**：
1. 检查是否所有图纸都是"通过"状态
2. 刷新页面
3. 打开浏览器开发者工具（F12）查看错误

### Q2：驳回后数据没有重置？
**A**：
1. 刷新页面
2. 检查数据库中的数据
3. 查看浏览器 Console 中的错误

### Q3：展商看不到修改模式？
**A**：
1. 检查 is_submitted 是否为 true
2. 检查 last_reviewed_at 是否为 null
3. 刷新展商页面

### Q4：自动化测试失败？
**A**：
1. 检查 SUPABASE_URL 和 SUPABASE_KEY
2. 修改 TEST_BOOTH_NUMBER 为实际的展位号
3. 查看错误信息

---

## 📊 测试时间估计

| 测试方式 | 时间 | 难度 |
|---------|------|------|
| 快速测试 | 5 分钟 | ⭐ |
| 手动测试 | 30 分钟 | ⭐⭐ |
| 自动化测试 | 5 分钟 | ⭐⭐⭐ |
| 完整测试 | 40 分钟 | ⭐⭐ |

---

## 🎉 测试完成

当所有测试都通过后，可以进行部署。

**下一步**：
1. 备份生产环境
2. 部署代码
3. 监控运行状态
4. 收集用户反馈

---

## 📚 相关文档

- `QUICK_TEST_CHECKLIST.md` - 快速测试清单
- `MANUAL_TESTING_GUIDE.md` - 手动测试指南
- `AUTOMATED_TESTING_SCRIPT.md` - 自动化测试脚本
- `TESTING_GUIDE.md` - 测试指南
- `QUICK_REFERENCE.md` - 快速参考

---

**现在就开始测试吧！** 🚀
