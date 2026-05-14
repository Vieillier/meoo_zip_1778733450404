const { chromium } = require('playwright');

async function runTest() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  const testResults = [];

  try {
    // 1. 审图员登录
    console.log('步骤1: 审图员登录');
    await page.goto('http://localhost:3015/#/login');
    await page.waitForTimeout(1000);
    
    await page.fill('input[type="text"]', 'reviewer01');
    await page.fill('input[type="password"]', 'pwd123');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000);
    
    testResults.push({ step: '审图员登录', status: 'passed' });

    // 2. 新增展商用户
    console.log('步骤2: 新增展商用户');
    await page.click('button:has-text("新增用户")');
    await page.waitForTimeout(500);
    
    const testPhone = '138' + Date.now().toString().slice(-8);
    const testBoothNumber = 'A01' + Date.now().toString().slice(-3);
    
    await page.fill('input[placeholder="账号 (联系人电话)"]', testPhone);
    await page.fill('input[placeholder="密码 (展位号)"]', testBoothNumber);
    await page.fill('input[placeholder="联系人姓名"]', '测试展商联系人');
    await page.fill('input[placeholder="展商名称"]', '测试展商有限公司');
    await page.fill('input[placeholder="展馆号"]', '8.1');
    await page.fill('input[placeholder="展位号"]', testBoothNumber);
    await page.fill('input[placeholder="展位面积 (m²)"]', '36');
    await page.fill('input[placeholder="展位高度 (m)"]', '4.5');
    await page.fill('input[placeholder="联系人电话"]', testPhone);
    await page.fill('input[placeholder="联系邮箱"]', 'test@example.com');
    
    await page.click('button:has-text("确认")');
    await page.waitForTimeout(2000);
    
    testResults.push({ step: '新增展商用户', status: 'passed', data: { phone: testPhone, booth: testBoothNumber } });

    // 3. 退出审图员账号
    console.log('步骤3: 退出审图员账号');
    await page.click('button:has-text("退出登录")');
    await page.waitForTimeout(1500);
    
    testResults.push({ step: '退出审图员账号', status: 'passed' });

    // 4. 使用新增展商账号登录
    console.log('步骤4: 使用新增展商账号登录');
    await page.fill('input[type="text"]', testPhone);
    await page.fill('input[type="password"]', testBoothNumber);
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000);
    
    // 检查是否成功进入展商工作台
    const pageContent = await page.content();
    const hasWorkbench = pageContent.includes('展商工作台') || pageContent.includes('基础信息');
    
    if (hasWorkbench) {
      testResults.push({ step: '展商账号登录', status: 'passed' });
    } else {
      testResults.push({ step: '展商账号登录', status: 'failed', error: '未进入展商工作台' });
    }

    // 5. 验证展位信息
    console.log('步骤5: 验证展位信息');
    const hasExhibitorName = pageContent.includes('测试展商有限公司');
    const hasHallNumber = pageContent.includes('8.1');
    const hasBoothNumber = pageContent.includes(testBoothNumber);
    
    if (hasExhibitorName && hasHallNumber && hasBoothNumber) {
      testResults.push({ step: '验证展位信息', status: 'passed' });
    } else {
      testResults.push({ 
        step: '验证展位信息', 
        status: 'failed', 
        error: `展商名称: ${hasExhibitorName}, 展馆号: ${hasHallNumber}, 展位号: ${hasBoothNumber}` 
      });
    }

    // 截图保存
    await page.screenshot({ path: '/home/project/test-result.png', fullPage: true });

  } catch (error) {
    console.error('测试失败:', error.message);
    testResults.push({ step: '测试执行', status: 'failed', error: error.message });
  } finally {
    await browser.close();
  }

  // 输出测试报告
  console.log('\n========== 测试报告 ==========');
  testResults.forEach((result, index) => {
    const status = result.status === 'passed' ? '✅' : '❌';
    console.log(`${index + 1}. ${status} ${result.step}`);
    if (result.data) {
      console.log(`   数据: ${JSON.stringify(result.data)}`);
    }
    if (result.error) {
      console.log(`   错误: ${result.error}`);
    }
  });
  
  const passed = testResults.filter(r => r.status === 'passed').length;
  const failed = testResults.filter(r => r.status === 'failed').length;
  console.log(`\n总计: ${testResults.length} 项, 通过: ${passed}, 失败: ${failed}`);
  console.log('==============================\n');
}

runTest().catch(console.error);
