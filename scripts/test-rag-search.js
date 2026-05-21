/**
 * 测试 RAG 向量搜索功能
 * 验证通义千问 embedding + Supabase pgvector 是否正常工作
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const DASHSCOPE_API_KEY = process.env.DASHSCOPE_API_KEY;

if (!supabaseUrl || !supabaseKey || !DASHSCOPE_API_KEY) {
  console.error('❌ 缺少配置，请检查 .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * 生成查询向量
 */
async function generateQueryEmbedding(query) {
  const response = await fetch('https://dashscope.aliyuncs.com/api/v1/services/embeddings/text-embedding/text-embedding', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${DASHSCOPE_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'text-embedding-v2',
      input: { texts: [query] }
    })
  });

  const data = await response.json();
  return data.output.embeddings[0].embedding;
}

/**
 * RAG 向量搜索
 */
async function ragSearch(query, threshold = 0.7, limit = 3) {
  console.log(`\n🔍 查询: "${query}"\n`);
  console.log('⏳ 生成查询向量...');
  
  const queryEmbedding = await generateQueryEmbedding(query);
  console.log(`✅ 向量生成完成 (${queryEmbedding.length} 维)\n`);
  
  console.log('🔎 执行向量相似度搜索...\n');
  
  const { data, error } = await supabase.rpc('match_guide_documents', {
    query_embedding: queryEmbedding,
    match_threshold: threshold,
    match_count: limit
  });

  if (error) {
    console.error('❌ 搜索失败:', error);
    throw error;
  }

  return data;
}

/**
 * 显示搜索结果
 */
function displayResults(results) {
  if (!results || results.length === 0) {
    console.log('❌ 未找到相关规范条款\n');
    return;
  }

  console.log(`✅ 找到 ${results.length} 条相关规范:\n`);
  console.log('='.repeat(80));

  results.forEach((result, index) => {
    console.log(`\n📌 结果 ${index + 1} (相似度: ${(result.similarity * 100).toFixed(1)}%)`);
    console.log(`   片段序号: ${result.chunk_index}`);
    console.log(`   包含条款: ${result.sections.join(', ') || '无'}`);
    console.log(`   包含图片: ${result.has_image ? '是' : '否'}`);
    console.log('-'.repeat(80));
    console.log(result.content.substring(0, 300) + (result.content.length > 300 ? '...' : ''));
    console.log('-'.repeat(80));
  });
}

/**
 * 测试用例
 */
const testCases = [
  {
    name: '工字钢固定规范',
    query: '工字钢如何固定？需要几个紧固件？',
    threshold: 0.6
  },
  {
    name: '展台高度限制',
    query: '特装展台的高度有什么限制？',
    threshold: 0.6
  },
  {
    name: '桁架结构安全',
    query: '桁架结构展台需要注意什么安全措施？',
    threshold: 0.6
  },
  {
    name: '消防设施要求',
    query: '展台需要配备哪些消防设施？',
    threshold: 0.5
  }
];

/**
 * 主函数
 */
async function main() {
  console.log('='.repeat(80));
  console.log('🧪 RAG 向量搜索测试');
  console.log('='.repeat(80));

  // 检查数据库中是否有数据
  const { count } = await supabase
    .from('guide_documents')
    .select('*', { count: 'exact', head: true });

  if (count === 0) {
    console.error('\n❌ 数据库中没有数据');
    console.error('   请先运行: node scripts/import-guide-with-embeddings.js');
    process.exit(1);
  }

  console.log(`\n✅ 数据库中有 ${count} 条规范文档\n`);

  // 运行测试用例
  for (const testCase of testCases) {
    console.log('\n' + '='.repeat(80));
    console.log(`📝 测试: ${testCase.name}`);
    console.log('='.repeat(80));

    try {
      const results = await ragSearch(testCase.query, testCase.threshold, 3);
      displayResults(results);
    } catch (error) {
      console.error(`❌ 测试失败:`, error.message);
    }

    // 避免 API 限流
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log('\n' + '='.repeat(80));
  console.log('✅ 测试完成！');
  console.log('='.repeat(80));
  console.log('\n💡 如果搜索结果准确，说明 RAG 系统工作正常！');
  console.log('   下一步可以创建 Edge Function 实现"一键初审"功能。\n');
}

main().catch(console.error);
