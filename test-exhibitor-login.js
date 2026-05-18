/**
 * 测试展商账号登录
 * 用于诊断 17700000000、18800000000、19900000000 三个账号的登录问题
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ 缺少 Supabase 配置，请检查 .env 文件');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// 密码处理函数（与登录逻辑一致）
function normalizePassword(password) {
  return password.length < 6 ? `${password}_secure` : password;
}

// 测试账号列表
const testAccounts = [
  { username: '17700000000', passwords: ['A101', 'A101_secure', '12345', '12345_secure', '17700000000'] },
  { username: '18800000000', passwords: ['B202', 'B202_secure', '12345', '12345_secure', '18800000000'] },
  { username: '19900000000', passwords: ['C303', 'C303_secure', '12345', '12345_secure', '19900000000'] },
];

async function testLogin(username, password) {
  const email = `${username}@test.com`;
  const normalizedPassword = normalizePassword(password);
  
  console.log(`\n尝试登录: ${username}`);
  console.log(`  原始密码: ${password}`);
  console.log(`  处理后密码: ${normalizedPassword}`);
  console.log(`  邮箱: ${email}`);
  
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password: normalizedPassword,
  });
  
  if (error) {
    console.log(`  ❌ 登录失败: ${error.message}`);
    return false;
  } else {
    console.log(`  ✅ 登录成功!`);
    console.log(`  用户ID: ${data.user?.id}`);
    
    // 获取用户角色
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, username, display_name')
      .eq('id', data.user.id)
      .single();
    
    if (profile) {
      console.log(`  角色: ${profile.role}`);
      console.log(`  显示名称: ${profile.display_name}`);
    }
    
    // 登出
    await supabase.auth.signOut();
    return true;
  }
}

async function main() {
  console.log('='.repeat(60));
  console.log('展商账号登录诊断工具');
  console.log('='.repeat(60));
  
  for (const account of testAccounts) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`测试账号: ${account.username}`);
    console.log('='.repeat(60));
    
    let successCount = 0;
    for (const password of account.passwords) {
      const success = await testLogin(account.username, password);
      if (success) {
        successCount++;
        console.log(`\n✅ 找到正确密码: ${password}`);
        break; // 找到正确密码后跳过其他测试
      }
      await new Promise(resolve => setTimeout(resolve, 500)); // 避免请求过快
    }
    
    if (successCount === 0) {
      console.log(`\n❌ 所有密码都失败了，请检查数据库中的实际密码`);
    }
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('测试完成');
  console.log('='.repeat(60));
}

main().catch(console.error);
