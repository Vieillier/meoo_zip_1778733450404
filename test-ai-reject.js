/**
 * 测试通义千问 API - 驳回场景
 * 测试超高展位的审查结果
 */

const https = require('https');

const DASHSCOPE_API_KEY = 'sk-63094ad8a6af4b4b86f2c9b5f6538047';

// 测试数据 - 超高展位（应该被驳回）
const testBoothInfo = {
  booth_number: 'B202',
  hall_number: '2号馆',
  booth_area: 48,
  booth_height: 5.8,  // 超过5米限制
  booth_category: '特装',
  exhibitor_name: '超高展位测试'
};

const testGuides = [
  {
    content: '特装展位高度不得超过5米，超高需要特殊审批',
    category: '高度限制'
  },
  {
    content: '展位面积超过36平方米需要提交消防审批文件',
    category: '消防要求'
  },
  {
    content: '展位结构必须经过专业工程师审核',
    category: '结构安全'
  }
];

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
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode === 200) {
          resolve(JSON.parse(data));
        } else {
          reject(new Error(`API 调用失败: ${res.statusCode} - ${data}`));
        }
      });
    });

    req.on('error', (error) => { reject(error); });
    req.write(postData);
    req.end();
  });
}

async function testRejectScenario() {
  console.log('🚀 测试驳回场景...\n');

  console.log('📍 展位信息（超高展位）：');
  console.log(`  展位号: ${testBoothInfo.booth_number}`);
  console.log(`  高度: ${testBoothInfo.booth_height} 米 ⚠️ 超过5米限制`);
  console.log(`  面积: ${testBoothInfo.booth_area} 平方米 ⚠️ 超过36平方米\n`);

  try {
    console.log('🤖 调用通义千问 API...\n');
    
    const prompt = buildPrompt(testBoothInfo, testGuides);
    const response = await callQwenAPI(prompt);

    const aiMessage = response.output?.choices?.[0]?.message?.content;
    const jsonMatch = aiMessage.match(/\{[\s\S]*\}/);
    
    if (jsonMatch) {
      const result = JSON.parse(jsonMatch[0]);
      
      console.log('========== AI 初审结果 ==========');
      console.log(`🤖 建议: ${result.suggestion}`);
      console.log(`📝 理由: ${result.reason}`);
      console.log('=================================\n');

      if (result.suggestion === '驳回') {
        console.log('✅ 测试通过：AI 正确识别出不合规展位');
      } else {
        console.log('⚠️  测试警告：AI 未能识别出不合规展位');
      }
    }

  } catch (error) {
    console.error('❌ 测试失败：', error.message);
  }
}

testRejectScenario();
