/**
 * 导入审图规范到 Supabase
 * 功能：
 * 1. 读取 guide-chunks.json
 * 2. 清空旧数据（可选）
 * 3. 导入新数据到 guide_documents 表
 */

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

// Supabase 配置
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ 缺少 Supabase 配置');
  console.error('   请确保 .env.local 文件包含:');
  console.error('   SUPABASE_URL=...');
  console.error('   SUPABASE_ANON_KEY=...');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * 清空旧数据
 */
async function clearOldData() {
  console.log('🗑️  清空旧数据...');
  
  const { data, error } = await supabase
    .from('guide_documents')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000');  // 删除所有记录
  
  if (error) {
    console.error('❌ 清空数据失败:', error.message);
    throw error;
  }
  
  console.log('✅ 旧数据已清空\n');
}

/**
 * 导入新数据
 */
async function importData(chunks) {
  console.log(`📥 开始导入 ${chunks.length} 条数据...\n`);
  
  const records = chunks.map(chunk => ({
    chunk_index: chunk.index,
    content: chunk.text,
    content_length: chunk.length,
    sections: chunk.sections || [],
    has_image: chunk.hasImage || false,
    metadata: {
      sourceFile: '展会搭建规范20260521.docx',
      processedAt: new Date().toISOString()
    }
  }));

  // 批量插入
  const { data, error } = await supabase
    .from('guide_documents')
    .insert(records)
    .select();
  
  if (error) {
    console.error('❌ 导入失败:', error.message);
    throw error;
  }
  
  console.log(`✅ 成功导入 ${data.length} 条记录\n`);
  return data;
}

/**
 * 验证导入结果
 */
async function verifyImport() {
  console.log('🔍 验证导入结果...\n');
  
  const { data, error, count } = await supabase
    .from('guide_documents')
    .select('*', { count: 'exact' });
  
  if (error) {
    console.error('❌ 查询失败:', error.message);
    throw error;
  }
  
  console.log(`✅ 数据库中共有 ${count} 条记录\n`);
  
  if (data && data.length > 0) {
    console.log('📋 前 3 条记录预览:');
    data.slice(0, 3).forEach(record => {
      console.log(`\n  [${record.chunk_index}] ${record.content_length} 字`);
      console.log(`  条款: ${record.sections.join(', ') || '无'}`);
      console.log(`  图片: ${record.has_image ? '是' : '否'}`);
      console.log(`  内容: ${record.content.substring(0, 100)}...`);
    });
  }
}

/**
 * 主函数
 */
async function main() {
  console.log('=' .repeat(80));
  console.log('📚 审图规范导入工具');
  console.log('=' .repeat(80));
  console.log();

  // 读取 JSON 文件
  const jsonPath = path.join(__dirname, '..', 'guide-chunks.json');
  
  if (!fs.existsSync(jsonPath)) {
    console.error(`❌ 文件不存在: ${jsonPath}`);
    console.error('   请先运行: node scripts/split-docx-optimized.js');
    process.exit(1);
  }

  const jsonData = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
  const chunks = jsonData.chunks;

  console.log(`📄 读取文件: ${jsonData.metadata.sourceFile}`);
  console.log(`   总字数: ${jsonData.metadata.totalLength}`);
  console.log(`   分段数: ${jsonData.metadata.chunkCount}`);
  console.log(`   处理时间: ${jsonData.metadata.processedAt}\n`);

  // 询问是否清空旧数据
  const readline = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout
  });

  readline.question('⚠️  是否清空旧数据？(y/N): ', async (answer) => {
    readline.close();

    try {
      if (answer.toLowerCase() === 'y') {
        await clearOldData();
      } else {
        console.log('ℹ️  跳过清空，将追加数据\n');
      }

      // 导入数据
      await importData(chunks);

      // 验证结果
      await verifyImport();

      console.log('\n' + '='.repeat(80));
      console.log('✅ 导入完成！');
      console.log('=' .repeat(80));
      
    } catch (error) {
      console.error('\n❌ 导入过程出错:', error);
      process.exit(1);
    }
  });
}

main();
