// 测试 create-reviewer 云函数
// 使用方法：node test-create-reviewer.js

const SUPABASE_URL = 'https://drawextestone.netlify.app/.netlify/functions';
const TEST_USERNAME = 'testreviewer1';
const TEST_PASSWORD = '123';
const TEST_DISPLAY_NAME = '测试审图员1';

async function testCreateReviewer() {
  console.log('=== 测试创建审图员云函数 ===\n');
  
  // 1. 先获取管理员 token（需要手动替换）
  console.log('⚠️  请先手动获取管理员的 access token');
  console.log('方法：');
  console.log('1. 管理员登录系统');
  console.log('2. 打开浏览器控制台');
  console.log('3. 运行：localStorage.getItem("supabase.auth.token")');
  console.log('4. 复制 access_token 的值');
  console.log('5. 替换下面的 YOUR_ACCESS_TOKEN\n');
  
  const ACCESS_TOKEN = 'YOUR_ACCESS_TOKEN'; // 替换为实际的 token
  
  if (ACCESS_TOKEN === 'YOUR_ACCESS_TOKEN') {
    console.log('❌ 请先替换 ACCESS_TOKEN');
    return;
  }
  
  // 2. 调用云函数
  console.log('📤 发送请求...');
  console.log('URL:', `${SUPABASE_URL}/create-reviewer`);
  console.log('Body:', JSON.stringify({
    username: TEST_USERNAME,
    password: TEST_PASSWORD,
    displayName: TEST_DISPLAY_NAME
  }, null, 2));
  
  try {
    const response = await fetch(`${SUPABASE_URL}/create-reviewer`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ACCESS_TOKEN}`
      },
      body: JSON.stringify({
        username: TEST_USERNAME,
        password: TEST_PASSWORD,
        displayName: TEST_DISPLAY_NAME
      })
    });
    
    console.log('\n📥 响应状态:', response.status, response.statusText);
    
    const result = await response.json();
    console.log('📥 响应内容:', JSON.stringify(result, null, 2));
    
    if (response.ok) {
      console.log('\n✅ 创建成功！');
    } else {
      console.log('\n❌ 创建失败！');
      console.log('错误信息:', result.error);
    }
  } catch (error) {
    console.log('\n❌ 请求失败！');
    console.log('错误:', error.message);
  }
}

testCreateReviewer();
