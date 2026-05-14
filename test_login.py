from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page()
    page.goto('http://localhost:3015/#/login')
    page.wait_for_load_state('networkidle')

    # 输入账号
    page.locator('input[type="text"]').fill('11100000000')
    # 输入密码
    page.locator('input[type="password"]').fill('90F11')
    # 点击登录
    page.locator('button[type="submit"]').click()

    # 等待跳转
    page.wait_for_timeout(3000)

    # 获取当前URL
    current_url = page.url
    print(f'当前URL: {current_url}')

    # 截图
    page.screenshot(path='/home/project/test_login_result.png', full_page=True)

    # 检查页面内容
    content = page.content()
    if '标摊客户T' in content or '标摊T有限公司' in content:
        print('登录成功，显示了正确的展商信息')
    elif '账号或密码错误' in content:
        print('登录失败：账号或密码错误')
    else:
        print('页面内容:', content[:800])

    browser.close()
