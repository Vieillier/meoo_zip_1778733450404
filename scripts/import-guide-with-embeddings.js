/**
 * 导入审图规范到 Supabase（带向量 embedding）
 * 使用通义千问 text-embedding-v2 生成 1536 维向量
 */

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

// Supabase 配置
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

// 通义千问 API 配置
const DASHSCOPE_API_KEY = process.env.DASHSCOPE_API_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ 缺少 Supabase 配置');
  console.error('   请确保 .env.local 文件包含:');
  console.error('   SUPABASE_URL=...');
  console.error('   SUPABASE_ANON_KEY=...');
  process.exit(1);
}

if (!DASHSCOPE_API_KEY) {
  console.error('❌ 缺少通义千问 API Key');
  console.error('   请在 .env.local 文件添加:');
  console.error('   DASHSCOPE_API_KEY=sk-...');
  console.error('');
  console.error('   获取方式：');
  console.error('   1. 访问 https://dashscope.aliyun.com/');
  console.error('   2. 登录阿里云账号');
  console.error('   3. 开通 DashScope 服务');
  console.error('   4. 创建 API Key');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * 调用通义千问生成 embedding
 */
async function generateEmbedding(text) {
  const response = await fetch('https://dashscope.aliyuncs.com/api/v1/services/embeddings/text-embedding/text-embedding', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${DASHSCOPE_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'text-embedding-v2',
      input: {
        texts: [text]
      }
    })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`通义千问 API 调用失败: ${response.status} ${error}`);
  }

  const data = await response.json();
  
  if (data.output && data.output.embeddings && data.output.embeddings.length > 0) {
    return data.output.embeddings[0].embedding;
  }
  
  throw new Error('通义千问返回数据格式错误');
}

/**
 * 清空旧数据
 */
async function clearOldData() {
  console.log('🗑️  清空旧数据...');
  
  const { error } = await supabase
    .from('guide_documents')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000');
  
  if (error) {
    console.error('❌ 清空数据失败:', error.message);
    throw error;
  }
  
  console.log('✅ 旧数据已清空\n');
}

/**
 * 生成 embedding 并导入数据
 */
async function importDataWithEmbeddings(chunks) {
  console.log(`📥 开始处理 ${chunks.length} 条数据...\n`);
  
  const records = [];
  
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    console.log(`[${i + 1}/${chunks.length}] 生成 embedding: 第 ${chunk.index} 段 (${chunk.length} 字)`);
    
    try {
      // 生成 embedding
      const embedding = await generateEmbedding(chunk.text);
      
      records.push({
        chunk_index: chunk.index,
        content: chunk.text,
        content_length: chunk.length,
        sections: chunk.sections || [],
        has_image: chunk.hasImage || false,
        embedding: embedding,
        metadata: {
          sourceFile: '展会搭建规范20260521.docx',
          processedAt: new Date().toISOString(),
          embeddingModel: 'text-embedding-v2',
          embeddingDimension: 1536
        }
      });
      
      console.log(`   ✅ 成功生成 ${embedding.length} 维向量\n`);
      
      // 避免 API 限流，每次请求间隔 500ms
      await new Promise(resolve => setTimeout(resolve, 500));
      
    } catch (error) {
      console.error(`   ❌ 失败:`, error.message);
      throw error;
    }
  }

  console.log('💾 开始批量导入到 Supabase...\n');

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
    console.log('📋 记录预览:');
    data.forEach(record => {
      const hasEmbedding = record.embedding && record.embedding.length > 0;
      console.log(`\n  [${record.chunk_index}] ${record.content_length} 字`);
      console.log(`  条款: ${record.sections.join(', ') || '无'}`);
      console.log(`  图片: ${record.has_image ? '是' : '否'}`);
      console.log(`  向量: ${hasEmbedding ? `✅ ${record.embedding.length} 维` : '❌ 缺失'}`);
      console.log(`  内容: ${record.content.substring(0, 80)}...`);
    });
  }
}

/**
 * 主函数
 */
async function main() {
  console.log('=' .repeat(80));
  console.log('📚 审图规范导入工具（RAG 向量搜索版）');
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
  console.log(`   处理时间: ${jsonData.metadata.processedAt}`);
  console.log(`   Embedding 模型: 通义千问 text-embedding-v2 (1536维)\n`);

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

      // 生成 embedding 并导入数据
      await importDataWithEmbeddings(chunks);

      // 验证结果
      await verifyImport();

      console.log('\n' + '='.repeat(80));
      console.log('✅ 导入完成！');
      console.log('=' .repeat(80));
      console.log('\n💡 下一步：');
      console.log('   1. 测试向量搜索: node scripts/test-rag-search.js');
      console.log('   2. 部署 Edge Function: supabase functions deploy rag-search');
      
    } catch (error) {
      console.error('\n❌ 导入过程出错:', error);
      process.exit(1);
    }
  });
}

main();
