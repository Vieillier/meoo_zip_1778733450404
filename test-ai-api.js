/**
 * 测试通义千问 API 调用
 * 不依赖 Supabase，直接测试 AI 功能
 * 
 * 运行方式：node test-ai-api.js
 */

const https = require('https');

// 从环境变量读取 API Key
const DASHSCOPE_API_KEY = 'sk-63094ad8a6af4b4b86f2c9b5f6538047';

// 测试数据
const testBoothInfo = {
  booth_number: 'A101',
  hall_number: '1号馆',
  booth_area: 36,
  booth_height: 4.5,
  booth_category: '特装',
  exhibitor_name: '测试展商'
};

const testGuides = [
  {
    content: '特装展位高度不得超过5米',
    category: '高度限制'
  },
  {
    content: '展位面积超过36平方米需要提交消防审批',
    category: '消防要求'
  },
  {
    content: '展位搭建材料必须符合防火标准',
    category: '材料要求'
  }
];

// 构建提示词
function buildPrompt(boothInfo, guides) {
  const guideText = guides.map((g, i) => `${i + 1}. ${g.content}`).join('\n');
  
  return `你是一个专业的展览审图员，请根据以下信息判断展位图纸是否符合规范。

【展位信息】
- 展位号：${boothInfo.booth_number}
- 展馆：${boothInfo.hall_number}
- 展商：${boothInfo.exhibitor_name}
- 类别：${boothInfo.booth_category}
- 面积：${boothInfo.booth_area} 平方米
- 高度：${boothInfo.booth_height} 米

【相关规范】
${guideText}

请严格按照以下 JSON 格式输出审查结果（不要包含任何其他文字）：
{
  "suggestion": "通过或驳回",
  "reason": "详细理由"
}`;
}

// 调用通义千问 API
function callQwenAPI(prompt) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({
      model: 'qwen-plus',
      input: {
        messages: [
          {
            role: 'system',
            content: '你是一个专业的展览审图员，只能返回 JSON 格式的审查结果。'
          },
          {
            role: 'user',
            content: prompt
          }
        ]
      },
      parameters: {
        result_format: 'message',
        temperature: 0.3,
        max_tokens: 500
      }
    });

    const options = {
      hostname: 'dashscope.aliyuncs.com',
      port: 443,
      path: '/api/v1/services/aigc/text-generation/generation',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${DASHSCOPE_API_KEY}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        if (res.statusCode === 200) {
          resolve(JSON.parse(data));
        } else {
          reject(new Error(`API 调用失败: ${res.statusCode} - ${data}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.write(postData);
    req.end();
  });
}

// 主测试函数
async function testAIReview() {
  console.log('🚀 开始测试通义千问 API...\n');

  console.log('📍 展位信息：');
  console.log(`  展位号: ${testBoothInfo.booth_number}`);
  console.log(`  展馆: ${testBoothInfo.hall_number}`);
  console.log(`  展商: ${testBoothInfo.exhibitor_name}`);
  console.log(`  类别: ${testBoothInfo.booth_category}`);
  console.log(`  面积: ${testBoothInfo.booth_area} 平方米`);
  console.log(`  高度: ${testBoothInfo.booth_height} 米\n`);

  console.log('📚 相关规范：');
  testGuides.forEach((g, i) => {
    console.log(`  ${i + 1}. ${g.content}`);
  });
  console.log('');

  try {
    console.log('🤖 调用通义千问 API...\n');
    
    const prompt = buildPrompt(testBoothInfo, testGuides);
    const response = await callQwenAPI(prompt);

    console.log('✅ API 调用成功！\n');
    console.log('📦 原始响应：');
    console.log(JSON.stringify(response, null, 2));
    console.log('');

    // 解析 AI 回复
    const aiMessage = response.output?.choices?.[0]?.message?.content;
    if (!aiMessage) {
      throw new Error('API 响应格式错误');
    }

    console.log('💬 AI 回复内容：');
    console.log(aiMessage);
    console.log('');

    // 尝试解析 JSON
    const jsonMatch = aiMessage.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const result = JSON.parse(jsonMatch[0]);
      
      console.log('========== AI 初审结果 ==========');
      console.log(`🤖 建议: ${result.suggestion}`);
      console.log(`📝 理由: ${result.reason}`);
      console.log('=================================');
    } else {
      console.log('⚠️  无法从回复中提取 JSON 格式');
    }

  } catch (error) {
    console.error('❌ 测试失败：', error.message);
    if (error.stack) {
      console.error('\n错误堆栈：');
      console.error(error.stack);
    }
  }
}

// 运行测试
testAIReview();
