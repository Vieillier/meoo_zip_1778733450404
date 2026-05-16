const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL || 'http://localhost:54321';
const supabaseKey = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODQxMTY3MDB9.0xJ8mE_p4gG-J0k7X9v8y9Q8v8y9Q8v8y9Q8v8y9Q8';

const supabase = createClient(supabaseUrl, supabaseKey);

async function runTest() {
  console.log('========== 数据持久化测试 ==========\n');
  
  const testResults = [];
  const testPhone = '138' + Date.now().toString().slice(-8);
  const testBoothNumber = 'A01' + Date.now().toString().slice(-3);
  
  try {
    // 1. 创建测试用户
    console.log('步骤1: 创建测试用户');
    const email = `${testPhone.toLowerCase().replace(/[^a-z0-9]/g, '_')}@test.com`;
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password: testBoothNumber,
      options: {
        data: {
          username: testPhone,
          display_name: '测试展商联系人',
          role: 'custom_exhibitor',
          phone: testPhone
        }
      }
    });
    
    if (authError) {
      throw new Error(`创建用户失败: ${authError.message}`);
    }
    
    console.log('  ✅ 用户创建成功, ID:', authData.user?.id);
    testResults.push({ step: '创建用户', status: 'passed', userId: authData.user?.id });
    
    // 2. 创建展位信息
    console.log('\n步骤2: 创建展位信息');
    const { data: boothData, error: boothError } = await supabase
      .from('exhibitor_booths')
      .insert({
        user_id: authData.user.id,
        exhibitor_name: '测试展商有限公司',
        hall_number: '8.1',
        booth_number: testBoothNumber,
        booth_area: 36,
        booth_height: 4.5,
        booth_category: '特装',
        contact_name: '测试展商联系人',
        contact_phone: testPhone,
        email: 'test@example.com'
      })
      .select()
      .single();
    
    if (boothError) {
      throw new Error(`创建展位失败: ${boothError.message}`);
    }
    
    console.log('  ✅ 展位创建成功, ID:', boothData.id);
    testResults.push({ step: '创建展位', status: 'passed', boothId: boothData.id });
    
    // 3. 验证用户资料
    console.log('\n步骤3: 验证用户资料');
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', authData.user.id)
      .maybeSingle();
    
    if (profileError || !profileData) {
      throw new Error('用户资料查询失败');
    }
    
    console.log('  ✅ 用户资料:', {
      username: profileData.username,
      role: profileData.role,
      display_name: profileData.display_name
    });
    testResults.push({ step: '验证用户资料', status: 'passed' });
    
    // 4. 验证展位信息
    console.log('\n步骤4: 验证展位信息');
    const { data: boothCheck, error: boothCheckError } = await supabase
      .from('exhibitor_booths')
      .select('*')
      .eq('user_id', authData.user.id)
      .maybeSingle();
    
    if (boothCheckError || !boothCheck) {
      throw new Error('展位信息查询失败');
    }
    
    console.log('  ✅ 展位信息:', {
      exhibitor_name: boothCheck.exhibitor_name,
      hall_number: boothCheck.hall_number,
      booth_number: boothCheck.booth_number,
      booth_area: boothCheck.booth_area,
      booth_height: boothCheck.booth_height
    });
    testResults.push({ step: '验证展位信息', status: 'passed' });
    
    // 5. 模拟重新登录 - 重新查询数据
    console.log('\n步骤5: 模拟重新登录 - 重新查询数据');
    
    // 重新查询用户资料
    const { data: reLoginProfile } = await supabase
      .from('profiles')
      .select('*')
      .eq('username', testPhone)
      .maybeSingle();
    
    // 重新查询展位信息
    const { data: reLoginBooth } = await supabase
      .from('exhibitor_booths')
      .select('*')
      .eq('user_id', authData.user.id)
      .maybeSingle();
    
    if (reLoginProfile && reLoginBooth) {
      console.log('  ✅ 重新登录后数据存在');
      console.log('     用户:', reLoginProfile.username);
      console.log('     展位:', reLoginBooth.exhibitor_name);
      testResults.push({ step: '重新登录数据验证', status: 'passed' });
    } else {
      throw new Error('重新登录后数据丢失');
    }
    
    // 6. 清理测试数据
    console.log('\n步骤6: 清理测试数据');
    await supabase.from('exhibitor_booths').delete().eq('user_id', authData.user.id);
    await supabase.from('profiles').delete().eq('id', authData.user.id);
    console.log('  ✅ 测试数据已清理');
    
  } catch (error) {
    console.error('\n❌ 测试失败:', error.message);
    testResults.push({ step: '测试执行', status: 'failed', error: error.message });
  }
  
  // 输出测试报告
  console.log('\n========== 测试报告 ==========');
  testResults.forEach((result, index) => {
    const status = result.status === 'passed' ? '✅' : '❌';
    console.log(`${index + 1}. ${status} ${result.step}`);
  });
  
  const passed = testResults.filter(r => r.status === 'passed').length;
  const failed = testResults.filter(r => r.status === 'failed').length;
  console.log(`\n总计: ${testResults.length} 项, 通过: ${passed}, 失败: ${failed}`);
  console.log('==============================\n');
}

runTest().catch(console.error);
