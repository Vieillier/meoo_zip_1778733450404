/**
 * Word 文档智能分段脚本（增强版）
 * 功能：读取 Word 文档，按 500 字切分，保持语义连贯，允许 50 字重叠
 * 输出：控制台打印 + JSON 文件保存
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
  process.exit(1);
}

/**
 * 智能分段函数
 */
function smartSplit(text, chunkSize = 500, overlap = 50) {
  const chunks = [];
  let startIndex = 0;
  let chunkIndex = 1;
  const minChunkSize = Math.floor(chunkSize * 0.3);

  const separators = ['\n\n', '\n', '。', '！', '？', '；', '，', ' '];

  while (startIndex < text.length) {
    let endIndex = Math.min(startIndex + chunkSize, text.length);
    
    const remainingText = text.length - startIndex;
    if (remainingText <= chunkSize + minChunkSize) {
      endIndex = text.length;
    } else if (endIndex < text.length) {
      let bestSplitIndex = endIndex;
      let foundSeparator = false;
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
      endIndex = foundSeparator ? bestSplitIndex : endIndex;
    }

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

    if (endIndex >= text.length) break;

    startIndex = endIndex - overlap;
    if (startIndex <= chunks[chunks.length - 1]?.startPos) {
      startIndex = endIndex;
    }
  }

  return chunks;
}

/**
 * 读取并分段 Word 文档
 */
async function processDocx(filePath, outputJson = true) {
  console.log('📄 正在读取 Word 文档...');
  console.log(`   文件路径: ${filePath}\n`);

  if (!fs.existsSync(filePath)) {
    console.error(`❌ 文件不存在: ${filePath}`);
    process.exit(1);
  }

  try {
    const buffer = fs.readFileSync(filePath);
    const result = await mammoth.extractRawText({ buffer });
    const fullText = result.value;

    console.log(`✅ 文档读取成功`);
    console.log(`   总字数: ${fullText.length} 字\n`);

    console.log('✂️  开始智能分段...\n');
    const chunks = smartSplit(fullText, 500, 50);

    console.log(`✅ 分段完成，共 ${chunks.length} 段\n`);
    console.log('=' .repeat(80));

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

    // 保存为 JSON 文件
    if (outputJson) {
      const outputPath = path.join(__dirname, '..', 'docx-chunks.json');
      const jsonData = {
        metadata: {
          sourceFile: path.basename(filePath),
          totalLength: fullText.length,
          chunkCount: chunks.length,
          chunkSize: 500,
          overlap: 50,
          processedAt: new Date().toISOString()
        },
        chunks: chunks.map(c => ({
          index: c.index,
          text: c.text,
          length: c.length
        }))
      };

      fs.writeFileSync(outputPath, JSON.stringify(jsonData, null, 2), 'utf-8');
      console.log(`\n💾 分段结果已保存到: ${outputPath}`);
    }

    return chunks;
  } catch (error) {
    console.error('❌ 处理文档时出错:', error.message);
    process.exit(1);
  }
}

// 主函数
const docxPath = path.join(__dirname, '..', '展会搭建规范20260521.docx');
processDocx(docxPath, true);
