# 自动化测试脚本

## 📝 测试脚本说明

本脚本用于自动化测试"可再次驳回"功能。

## 🚀 快速开始

### 1. 启动开发服务器
```bash
npm run dev
```

### 2. 运行测试脚本
```bash
# 在项目根目录创建 test-reject-again.js 文件
# 然后运行：
node test-reject-again.js
```

## 📄 测试脚本代码

创建文件：`test-reject-again.js`

```javascript
// test-reject-again.js
const { createClient } = require('@supabase/supabase-js');

// 配置
const SUPABASE_URL = process.env.SUPABASE_URL || 'your-supabase-url';
const SUPABASE_KEY = process.env.SUPABASE_KEY || 'your-supabase-key';
const TEST_BOOTH_NUMBER = 'A001'; // 修改为实际的展位号

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// 测试用例
const tests = [];

// 测试 1：验证驳回前的数据状态
tests.push({
  name: '测试 1：验证驳回前的数据状态',
  async run() {
    console.log('\n🧪 运行测试 1：验证驳回前的数据状态');
    
    const { data, error } = await supabase
      .from('drawing_documents')
      .select('*')
      .eq('booth_number', TEST_BOOTH_NUMBER)
      .maybeSingle();
    
    if (error) {
      console.error('❌ 查询失败:', error.message);
      return false;
    }
    
    if (!data) {
      console.error('❌ 未找到测试数据');
      return false;
    }
    
    console.log('✅ 查询成功');
    console.log('  - is_submitted:', data.is_submitted);
    console.log('  - last_reviewed_at:', data.last_reviewed_at);
    console.log('  - review_round:', data.review_round);
    
    return true;
  }
});

// 测试 2：模拟全部通过的审核
tests.push({
  name: '测试 2：模拟全部通过的审核',
  async run() {
    console.log('\n🧪 运行测试 2：模拟全部通过的审核');
    
    const updateData = {
      effect_drawing_status: 'approved',
      elevation_grid_drawing_status: 'approved',
      plan_drawing_status: 'approved',
      structure_drawing_status: 'approved',
      material_drawing_status: 'approved',
      electrical_system_drawing_status: 'approved',
      utility_position_drawing_status: 'approved',
      fire_facility_drawing_status: 'approved',
      is_submitted: false,
      last_reviewed_at: new Date().toISOString()
    };
    
    const { error } = await supabase
      .from('drawing_documents')
      .update(updateData)
      .eq('booth_number', TEST_BOOTH_NUMBER);
    
    if (error) {
      console.error('❌ 更新失败:', error.message);
      return false;
    }
    
    console.log('✅ 更新成功');
    return true;
  }
});

// 测试 3：验证驳回功能
tests.push({
  name: '测试 3：验证驳回功能',
  async run() {
    console.log('\n🧪 运行测试 3：验证驳回功能');
    
    const updateData = {
      effect_drawing_status: 'pending',
      elevation_grid_drawing_status: 'pending',
      plan_drawing_status: 'pending',
      structure_drawing_status: 'pending',
      material_drawing_status: 'pending',
      electrical_system_drawing_status: 'pending',
      utility_position_drawing_status: 'pending',
      fire_facility_drawing_status: 'pending',
      effect_drawing_comment: '',
      elevation_grid_drawing_comment: '',
      plan_drawing_comment: '',
      structure_drawing_comment: '',
      material_drawing_comment: '',
      electrical_system_drawing_comment: '',
      utility_position_drawing_comment: '',
      fire_facility_drawing_comment: '',
      is_submitted: true,
      last_reviewed_at: null
    };
    
    const { error } = await supabase
      .from('drawing_documents')
      .update(updateData)
      .eq('booth_number', TEST_BOOTH_NUMBER);
    
    if (error) {
      console.error('❌ 驳回失败:', error.message);
      return false;
    }
    
    console.log('✅ 驳回成功');
    return true;
  }
});

// 测试 4：验证驳回后的数据状态
tests.push({
  name: '测试 4：验证驳回后的数据状态',
  async run() {
    console.log('\n🧪 运行测试 4：验证驳回后的数据状态');
    
    const { data, error } = await supabase
      .from('drawing_documents')
      .select('*')
      .eq('booth_number', TEST_BOOTH_NUMBER)
      .maybeSingle();
    
    if (error) {
      console.error('❌ 查询失败:', error.message);
      return false;
    }
    
    // 验证数据
    const checks = [
      { name: 'is_submitted = true', value: data.is_submitted === true },
      { name: 'last_reviewed_at = null', value: data.last_reviewed_at === null },
      { name: 'effect_drawing_status = pending', value: data.effect_drawing_status === 'pending' },
      { name: 'effect_drawing_comment = ""', value: data.effect_drawing_comment === '' }
    ];
    
    let allPassed = true;
    checks.forEach(check => {
      if (check.value) {
        console.log('  ✅', check.name);
      } else {
        console.log('  ❌', check.name);
        allPassed = false;
      }
    });
    
    return allPassed;
  }
});

// 测试 5：验证历史记录
tests.push({
  name: '测试 5：验证历史记录',
  async run() {
    console.log('\n🧪 运行测试 5：验证历史记录');
    
    const { data, error } = await supabase
      .from('drawing_history')
      .select('*')
      .eq('booth_number', TEST_BOOTH_NUMBER)
      .order('uploaded_at', { ascending: false })
      .limit(5);
    
    if (error) {
      console.error('❌ 查询失败:', error.message);
      return false;
    }
    
    console.log('✅ 查询成功');
    console.log(`  - 找到 ${data.length} 条历史记录`);
    
    if (data.length > 0) {
      console.log('  - 最新记录:');
      console.log('    - drawing_type:', data[0].drawing_type);
      console.log('    - review_round:', data[0].review_round);
      console.log('    - uploaded_at:', data[0].uploaded_at);
    }
    
    return true;
  }
});

// 运行所有测试
async function runAllTests() {
  console.log('🚀 开始运行测试...');
  console.log('📍 测试展位号:', TEST_BOOTH_NUMBER);
  
  let passed = 0;
  let failed = 0;
  
  for (const test of tests) {
    try {
      const result = await test.run();
      if (result) {
        passed++;
      } else {
        failed++;
      }
    } catch (error) {
      console.error('❌ 测试异常:', error.message);
      failed++;
    }
  }
  
  console.log('\n' + '='.repeat(50));
  console.log('📊 测试结果汇总');
  console.log('='.repeat(50));
  console.log(`✅ 通过: ${passed}`);
  console.log(`❌ 失败: ${failed}`);
  console.log(`📈 总计: ${tests.length}`);
  console.log('='.repeat(50));
  
  if (failed === 0) {
    console.log('\n🎉 所有测试通过！');
    process.exit(0);
  } else {
    console.log('\n⚠️  有测试失败，请检查');
    process.exit(1);
  }
}

// 启动测试
runAllTests().catch(error => {
  console.error('❌ 测试执行失败:', error);
  process.exit(1);
});
```

## 🔧 配置环境变量

创建 `.env.local` 文件：

```
SUPABASE_URL=your-supabase-url
SUPABASE_KEY=your-supabase-key
```

## 📊 测试结果示例

```
🚀 开始运行测试...
📍 测试展位号: A001

🧪 运行测试 1：验证驳回前的数据状态
✅ 查询成功
  - is_submitted: false
  - last_reviewed_at: 2024-01-15T10:30:00.000Z
  - review_round: 0

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
  - 找到 8 条历史记录
  - 最新记录:
    - drawing_type: effect_drawing
    - review_round: 0
    - uploaded_at: 2024-01-15T10:25:00.000Z

==================================================
📊 测试结果汇总
==================================================
✅ 通过: 5
❌ 失败: 0
📈 总计: 5
==================================================

🎉 所有测试通过！
```

## 🐛 故障排除

### 问题 1：连接失败
```
解决方案：
1. 检查 SUPABASE_URL 和 SUPABASE_KEY
2. 确保网络连接正常
3. 检查 Supabase 服务状态
```

### 问题 2：数据不存在
```
解决方案：
1. 修改 TEST_BOOTH_NUMBER 为实际的展位号
2. 确保该展位号有图纸审核记录
3. 检查数据库中的数据
```

### 问题 3：更新失败
```
解决方案：
1. 检查权限设置
2. 查看错误信息
3. 检查数据库连接
```

## 📝 测试报告

运行测试后，将结果保存为报告：

```bash
node test-reject-again.js > test-report.txt 2>&1
```

## ✅ 下一步

- [ ] 运行自动化测试脚本
- [ ] 查看测试结果
- [ ] 如果全部通过，进行手动测试
- [ ] 如果有失败，检查错误并修复
- [ ] 完成所有测试后，进行部署
