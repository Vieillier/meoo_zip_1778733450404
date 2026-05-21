/**
 * Word 文档智能分段脚本
 * 功能：读取 Word 文档，按 500 字切分，保持语义连贯，允许 50 字重叠
 */

const fs = require('fs');
const path = require('path');

// 检查是否安装了 mammoth
let mammoth;
try {
  mammoth = require('mammoth');
} catch (e) {
  console.error('❌ 缺少依赖 mammoth，请先安装：');
  console.error('   npm install mammoth');
  console.error('   或');
  console.error('   pnpm add mammoth');
  process.exit(1);
}

/**
 * 智能分段函数
 * @param {string} text - 完整文本
 * @param {number} chunkSize - 每段目标字数（默认 500）
 * @param {number} overlap - 重叠字数（默认 50）
 * @returns {Array<{index: number, text: string, length: number}>} 分段结果
 */
function smartSplit(text, chunkSize = 500, overlap = 50) {
  const chunks = [];
  let startIndex = 0;
  let chunkIndex = 1;
  const minChunkSize = Math.floor(chunkSize * 0.3); // 最小段落长度为目标的 30%

  // 定义语义分隔符优先级（从高到低）
  const separators = [
    '\n\n',      // 段落分隔
    '\n',        // 换行
    '。',        // 句号
    '！',        // 感叹号
    '？',        // 问号
    '；',        // 分号
    '，',        // 逗号
    ' ',         // 空格
  ];

  while (startIndex < text.length) {
    // 计算本次切片的结束位置
    let endIndex = Math.min(startIndex + chunkSize, text.length);

    // 如果剩余文本太短，直接合并到当前段
    const remainingText = text.length - startIndex;
    if (remainingText <= chunkSize + minChunkSize) {
      endIndex = text.length;
    } else if (endIndex < text.length) {
      // 尝试在语义边界处切分
      let bestSplitIndex = endIndex;
      let foundSeparator = false;

      // 在 endIndex 附近寻找最佳分隔点（向后搜索 100 字范围）
      const searchEnd = Math.min(endIndex + 100, text.length);
      const searchText = text.substring(endIndex, searchEnd);

      for (const separator of separators) {
        const sepIndex = searchText.indexOf(separator);
        if (sepIndex !== -1) {
          bestSplitIndex = endIndex + sepIndex + separator.length;
          foundSeparator = true;
          break;
        }
      }

      // 如果没找到分隔符，就在原位置切分
      endIndex = foundSeparator ? bestSplitIndex : endIndex;
    }

    // 提取当前段落
    const chunk = text.substring(startIndex, endIndex).trim();

    if (chunk.length > 0) {
      chunks.push({
        index: chunkIndex++,
        text: chunk,
        length: chunk.length,
        startPos: startIndex,
        endPos: endIndex
      });
    }

    // 如果已经到达文本末尾，退出循环
    if (endIndex >= text.length) {
      break;
    }

    // 计算下一段的起始位置（考虑重叠）
    startIndex = endIndex - overlap;

    // 确保不会倒退
    if (startIndex <= chunks[chunks.length - 1]?.startPos) {
      startIndex = endIndex;
    }
  }

  return chunks;
}

/**
 * 读取并分段 Word 文档
 */
async function processDocx(filePath) {
  console.log('📄 正在读取 Word 文档...');
  console.log(`   文件路径: ${filePath}\n`);

  // 检查文件是否存在
  if (!fs.existsSync(filePath)) {
    console.error(`❌ 文件不存在: ${filePath}`);
    process.exit(1);
  }

  try {
    // 读取 Word 文档
    const buffer = fs.readFileSync(filePath);
    const result = await mammoth.extractRawText({ buffer });
    const fullText = result.value;

    console.log(`✅ 文档读取成功`);
    console.log(`   总字数: ${fullText.length} 字\n`);

    // 智能分段
    console.log('✂️  开始智能分段...\n');
    const chunks = smartSplit(fullText, 500, 50);

    console.log(`✅ 分段完成，共 ${chunks.length} 段\n`);
    console.log('=' .repeat(80));

    // 打印每一段
    chunks.forEach(chunk => {
      console.log(`\n📌 第 ${chunk.index} 段 (${chunk.length} 字)`);
      console.log('-'.repeat(80));
      console.log(chunk.text);
      console.log('-'.repeat(80));
    });

    console.log('\n' + '='.repeat(80));
    console.log(`\n📊 统计信息:`);
    console.log(`   原文总字数: ${fullText.length}`);
    console.log(`   分段数量: ${chunks.length}`);
    console.log(`   平均每段: ${Math.round(fullText.length / chunks.length)} 字`);
    console.log(`   最短段落: ${Math.min(...chunks.map(c => c.length))} 字`);
    console.log(`   最长段落: ${Math.max(...chunks.map(c => c.length))} 字`);

    return chunks;
  } catch (error) {
    console.error('❌ 处理文档时出错:', error.message);
    process.exit(1);
  }
}

// 主函数
const docxPath = path.join(__dirname, '..', '展会搭建规范20260521.docx');
processDocx(docxPath);
