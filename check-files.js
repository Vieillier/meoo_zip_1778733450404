const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ 缺少 Supabase 配置');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkFiles() {
  console.log('🔍 检查三个账号的文件数据...\n');
  
  const boothNumbers = ['17700000000', '18800000000', '19900000000'];
  
  for (const booth of boothNumbers) {
    console.log(`\n📋 检查展位号: ${booth}`);
    console.log('='.repeat(50));
    
    // 检查图纸申报
    const { data: drawings } = await supabase
      .from('drawing_documents')
      .select('*')
      .eq('booth_number', booth)
      .maybeSingle();
    
    if (drawings) {
      console.log('📄 图纸申报数据:');
      const drawingFields = [
        'effect_drawing_urls', 'elevation_grid_drawing_urls', 'plan_drawing_urls',
        'structure_drawing_urls', 'material_drawing_urls', 'electrical_system_drawing_urls',
        'utility_position_drawing_urls', 'fire_facility_drawing_urls'
      ];
      
      drawingFields.forEach(field => {
        const urls = drawings[field] || [];
        if (urls.length > 0) {
          console.log(`  ${field}: ${urls.length} 个文件`);
          urls.forEach((url, idx) => {
            console.log(`    [${idx + 1}] ${url.substring(0, 100)}...`);
          });
        }
      });
    } else {
      console.log('❌ 没有图纸申报数据');
    }
    
    // 检查资质申报
    const { data: qualifications } = await supabase
      .from('qualification_documents')
      .select('*')
      .eq('booth_number', booth)
      .maybeSingle();
    
    if (qualifications) {
      console.log('\n📋 资质申报数据:');
      const qualFields = [
        'business_license_urls', 'application_letter_urls', 'entrustment_letter_urls',
        'safety_responsibility_urls', 'volume_commitment_urls', 'violation_handling_urls',
        'insurance_policy_urls', 'equipment_rental_urls', 'electrician_certificate_urls'
      ];
      
      qualFields.forEach(field => {
        const urls = qualifications[field] || [];
        if (urls.length > 0) {
          console.log(`  ${field}: ${urls.length} 个文件`);
          urls.forEach((url, idx) => {
            console.log(`    [${idx + 1}] ${url.substring(0, 100)}...`);
          });
        }
      });
    } else {
      console.log('❌ 没有资质申报数据');
    }
  }
}

checkFiles().catch(console.error);
