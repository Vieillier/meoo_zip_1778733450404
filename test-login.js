const { chromium } = require('playwright');

const testAccounts = [
  { username: 'admin', password: 'admin123', role: '管理员' },
  { username: 'reviewer01', password: 'pwd123', role: '审图员' },
  { username: '17700000000', password: '80F77', role: '标摊展商' },
  { username: '18800000000', password: '80F88', role: '特装展商1' },
  { username: '19900000000', password: '80F99', role: '特装展商2' }
];

async function testLogin() {
  const browser = await chromium.launch({ headless: true });
  const results = [];

  for (const account of testAccounts) {
    const context = await browser.newContext();
    const page = await context.newPage();

    try {
      await page.goto('http://localhost:3015/', { waitUntil: 'networkidle', timeout: 10000 });

      await page.fill('input[type="text"]', account.username);
      await page.fill('input[type="password"]', account.password);
      await page.click('button[type="submit"]');

      await page.waitForTimeout(2000);

      const url = page.url();
      const hasLogout = await page.locator('text=退出登录').count() > 0;

      results.push({
        ...account,
        success: hasLogout,
        currentUrl: url
      });

      await page.click('text=退出登录');
      await page.waitForTimeout(1000);
    } catch (error) {
      results.push({
        ...account,
        success: false,
        error: error.message
      });
    }

    await context.close();
  }

  await browser.close();

  console.log('\n========== 登录测试结果 ==========\n');
  results.forEach((r, i) => {
    const status = r.success ? '✅ 通过' : '❌ 失败';
    console.log(`${i + 1}. ${r.role} (${r.username})`);
    console.log(`   状态: ${status}`);
    if (r.success) {
      console.log(`   跳转URL: ${r.currentUrl}`);
    } else {
      console.log(`   错误: ${r.error}`);
    }
    console.log('');
  });

  const passed = results.filter(r => r.success).length;
  console.log(`总计: ${passed}/${results.length} 个账号测试通过`);
}

testLogin().catch(console.error);
