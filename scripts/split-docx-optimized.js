/**
 * Word 文档智能分段脚本 - 规范条款优化版
 * 特点：
 * 1. 识别编号条款（如 3.12），尽量保持完整性
 * 2. 在条款边界处切分，避免暴力切断
 * 3. 支持图片链接和结构化描述
 */

const fs = require('fs');
const path = require('path');

let mammoth;
try {
  mammoth = require('mammoth');
} catch (e) {
  console.error('❌ 缺少依赖 mammoth，请先安装：npm install mammoth');
  process.exit(1);
}

/**
 * 智能分段函数 - 规范条款优化版
 * @param {string} text - 完整文本
 * @param {number} chunkSize - 每段目标字数（默认 600，增加以容纳完整条款）
 * @param {number} overlap - 重叠字数（默认 50）
 * @returns {Array} 分段结果
 */
function smartSplitWithSections(text, chunkSize = 600, overlap = 50) {
  const chunks = [];
  let startIndex = 0;
  let chunkIndex = 1;
  const minChunkSize = Math.floor(chunkSize * 0.3);

  // 定义语义分隔符优先级（从高到低）
  const separators = [
    { pattern: /\n\d+\.\d+\s/g, name: '条款编号', priority: 1 },  // 如 "3.12 "
    { pattern: /\n\n/g, name: '段落分隔', priority: 2 },
    { pattern: /\n/g, name: '换行', priority: 3 },
    { pattern: /。\s*/g, name: '句号', priority: 4 },
    { pattern: /！\s*/g, name: '感叹号', priority: 5 },
    { pattern: /？\s*/g, name: '问号', priority: 5 },
    { pattern: /；\s*/g, name: '分号', priority: 6 },
    { pattern: /，\s*/g, name: '逗号', priority: 7 },
  ];

  while (startIndex < text.length) {
    let endIndex = Math.min(startIndex + chunkSize, text.length);
    
    // 如果剩余文本太短，直接合并到当前段
    const remainingText = text.length - startIndex;
    if (remainingText <= chunkSize + minChunkSize) {
      endIndex = text.length;
    } else if (endIndex < text.length) {
      // 尝试在语义边界处切分
      let bestSplitIndex = endIndex;
      let bestSeparator = null;
      let foundSeparator = false;

      // 向后搜索范围（增加到 200 字，以便找到下一个条款编号）
      const searchEnd = Math.min(endIndex + 200, text.length);
      const searchText = text.substring(endIndex, searchEnd);

      // 按优先级查找分隔符
      for (const sep of separators) {
        const regex = new RegExp(sep.pattern);
        const match = regex.exec(searchText);
        
        if (match) {
          const matchIndex = endIndex + match.index + match[0].length;
          
          // 如果找到条款编号，优先使用
          if (sep.priority === 1) {
            bestSplitIndex = matchIndex;
            bestSeparator = sep.name;
            foundSeparator = true;
            break;
          }
          
          // 如果还没找到更好的分隔符，使用当前的
          if (!foundSeparator) {
            bestSplitIndex = matchIndex;
            bestSeparator = sep.name;
            foundSeparator = true;
          }
        }
      }

      endIndex = bestSplitIndex;
      
      if (foundSeparator) {
        console.log(`   ✂️  在 ${bestSeparator} 处切分`);
      }
    }

    // 提取当前段落
    const chunk = text.substring(startIndex, endIndex).trim();
    
    if (chunk.length > 0) {
      // 提取段落中的条款编号
      const sectionMatch = chunk.match(/\d+\.\d+/g);
      const sections = sectionMatch ? [...new Set(sectionMatch)] : [];
      
      chunks.push({
        index: chunkIndex++,
        text: chunk,
        length: chunk.length,
        startPos: startIndex,
        endPos: endIndex,
        sections: sections,  // 包含的条款编号
        hasImage: chunk.includes('storage/v1/object/public')  // 是否包含图片链接
      });
    }

    if (endIndex >= text.length) break;

    // 计算下一段的起始位置（考虑重叠）
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

    console.log('✂️  开始智能分段（规范条款优化）...\n');
    const chunks = smartSplitWithSections(fullText, 600, 50);

    console.log(`\n✅ 分段完成，共 ${chunks.length} 段\n`);
    console.log('=' .repeat(80));

    chunks.forEach(chunk => {
      console.log(`\n📌 第 ${chunk.index} 段 (${chunk.length} 字)`);
      if (chunk.sections.length > 0) {
        console.log(`   📋 包含条款: ${chunk.sections.join(', ')}`);
      }
      if (chunk.hasImage) {
        console.log(`   🖼️  包含图片链接`);
      }
      console.log('-'.repeat(80));
      console.log(chunk.text.substring(0, 200) + (chunk.text.length > 200 ? '...' : ''));
      console.log('-'.repeat(80));
    });

    console.log('\n' + '='.repeat(80));
    console.log(`\n📊 统计信息:`);
    console.log(`   原文总字数: ${fullText.length}`);
    console.log(`   分段数量: ${chunks.length}`);
    console.log(`   平均每段: ${Math.round(fullText.length / chunks.length)} 字`);
    console.log(`   最短段落: ${Math.min(...chunks.map(c => c.length))} 字`);
    console.log(`   最长段落: ${Math.max(...chunks.map(c => c.length))} 字`);
    
    const imageChunks = chunks.filter(c => c.hasImage);
    console.log(`   包含图片: ${imageChunks.length} 段`);

    // 保存为 JSON 文件
    if (outputJson) {
      const outputPath = path.join(__dirname, '..', 'guide-chunks.json');
      const jsonData = {
        metadata: {
          sourceFile: path.basename(filePath),
          totalLength: fullText.length,
          chunkCount: chunks.length,
          chunkSize: 600,
          overlap: 50,
          processedAt: new Date().toISOString(),
          optimizedFor: 'section-based splitting'
        },
        chunks: chunks.map(c => ({
          index: c.index,
          text: c.text,
          length: c.length,
          sections: c.sections,
          hasImage: c.hasImage
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
