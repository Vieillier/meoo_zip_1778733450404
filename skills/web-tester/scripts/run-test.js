const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

async function runTest(testConfig) {
  const {
    targetUrl,
    testType = 'smoke',
    browser = 'chromium',
    headless = true,
    screenshot = true
  } = testConfig;

  const browserInstance = await chromium.launch({ headless });
  const context = await browserInstance.newContext();
  const page = await context.newPage();

  const testResults = {
    startTime: new Date().toISOString(),
    targetUrl,
    testType,
    browser,
    tests: [],
    summary: {
      total: 0,
      passed: 0,
      failed: 0,
      skipped: 0
    }
  };

  try {
    await page.goto(targetUrl, { waitUntil: 'networkidle' });

    const basicTest = {
      name: '页面加载测试',
      status: 'passed',
      duration: 0,
      steps: []
    };

    const startTime = Date.now();

    try {
      const title = await page.title();
      basicTest.steps.push({
        step: '获取页面标题',
        status: 'passed',
        detail: title
      });
    } catch (error) {
      basicTest.steps.push({
        step: '获取页面标题',
        status: 'failed',
        error: error.message
      });
      basicTest.status = 'failed';
    }

    try {
      const viewport = page.viewportSize();
      basicTest.steps.push({
        step: '检查视口尺寸',
        status: 'passed',
        detail: `${viewport.width}x${viewport.height}`
      });
    } catch (error) {
      basicTest.steps.push({
        step: '检查视口尺寸',
        status: 'failed',
        error: error.message
      });
      basicTest.status = 'failed';
    }

    if (screenshot) {
      const screenshotPath = path.join(process.cwd(), 'test-screenshot.png');
      await page.screenshot({ path: screenshotPath, fullPage: true });
      basicTest.steps.push({
        step: '截取页面快照',
        status: 'passed',
        detail: screenshotPath
      });
    }

    basicTest.duration = Date.now() - startTime;
    testResults.tests.push(basicTest);

    testResults.summary.total = testResults.tests.length;
    testResults.summary.passed = testResults.tests.filter(t => t.status === 'passed').length;
    testResults.summary.failed = testResults.tests.filter(t => t.status === 'failed').length;

  } catch (error) {
    testResults.error = error.message;
  } finally {
    await browserInstance.close();
  }

  testResults.endTime = new Date().toISOString();
  return testResults;
}

module.exports = { runTest };