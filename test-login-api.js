const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'http://localhost:3015/sb-api';
const supabaseAnonKey = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJvbGUiOiJhbm9uIiwiaWF0IjoxNzc3ODk2NjIyLCJleHAiOjEzMjg4NTM2NjIyfQ.89Do5Sn4Uyeokzg-Iisk0Hw5aoR-nKpSvi8COzRzINg';

const testAccounts = [
  { username: 'admin', password: 'admin123', role: '管理员' },
  { username: 'reviewer01', password: 'pwd123', role: '审图员' },
  { username: '17700000000', password: '80F77', role: '标摊展商' },
  { username: '18800000000', password: '80F88', role: '特装展商1' },
  { username: '19900000000', password: '80F99', role: '特装展商2' }
];

async function testLogin() {
  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  const results = [];

  for (const account of testAccounts) {
    try {
      const email = `${account.username.toLowerCase()}@review.local`;
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password: account.password
      });

      if (error) {
        results.push({
          ...account,
          success: false,
          error: error.message
        });
      } else {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role, display_name')
          .eq('id', data.user.id)
          .single();

        results.push({
          ...account,
          success: true,
          userId: data.user.id,
          profileRole: profile?.role,
          displayName: profile?.display_name
        });

        await supabase.auth.signOut();
      }
    } catch (err) {
      results.push({
        ...account,
        success: false,
        error: err.message
      });
    }
  }

  console.log('\n========== 登录测试结果 ==========\n');
  results.forEach((r, i) => {
    const status = r.success ? '✅ 通过' : '❌ 失败';
    console.log(`${i + 1}. ${r.role}`);
    console.log(`   账号: ${r.username}`);
    console.log(`   密码: ${r.password}`);
    console.log(`   状态: ${status}`);
    if (r.success) {
      console.log(`   角色: ${r.profileRole}`);
      console.log(`   显示名: ${r.displayName}`);
    } else {
      console.log(`   错误: ${r.error}`);
    }
    console.log('');
  });

  const passed = results.filter(r => r.success).length;
  console.log(`总计: ${passed}/${results.length} 个账号测试通过`);
}

testLogin().catch(console.error);
