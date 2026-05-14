const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

/**
 * 将数据写入 Excel 文件
 * @param {Array} data - 数据数组
 * @param {Object} options - 配置选项
 * @returns {Object} 写入结果
 */
function writeExcel(data, options = {}) {
  const {
    filename = 'export.xlsx',
    sheetName = 'Sheet1',
    headers,
    outputPath
  } = options;

  try {
    if (!Array.isArray(data) || data.length === 0) {
      throw new Error('数据必须是非空数组');
    }

    const worksheet = XLSX.utils.json_to_sheet(data, {
      header: headers
    });

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

    // 设置列宽
    const colWidths = {};
    data.forEach(row => {
      Object.keys(row).forEach(key => {
        const value = String(row[key] || '');
        colWidths[key] = Math.max(colWidths[key] || 10, value.length + 2);
      });
    });
    
    worksheet['!cols'] = Object.keys(colWidths).map(key => ({
      wch: Math.min(colWidths[key], 50)
    }));

    const excelBuffer = XLSX.write(workbook, {
      type: 'buffer',
      bookType: 'xlsx'
    });

    if (outputPath) {
      const fullPath = path.resolve(outputPath, filename);
      fs.writeFileSync(fullPath, excelBuffer);
      return {
        success: true,
        message: `文件已保存: ${fullPath}`,
        path: fullPath
      };
    }

    return {
      success: true,
      buffer: excelBuffer,
      filename
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * 写入多工作表 Excel
 * @param {Object} sheetsData - 工作表数据 { sheetName: dataArray }
 * @param {Object} options - 配置选项
 * @returns {Object} 写入结果
 */
function writeMultiSheetExcel(sheetsData, options = {}) {
  const {
    filename = 'export.xlsx',
    outputPath
  } = options;

  try {
    const workbook = XLSX.utils.book_new();

    Object.entries(sheetsData).forEach(([sheetName, data]) => {
      if (Array.isArray(data) && data.length > 0) {
        const worksheet = XLSX.utils.json_to_sheet(data);
        XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
      }
    });

    const excelBuffer = XLSX.write(workbook, {
      type: 'buffer',
      bookType: 'xlsx'
    });

    if (outputPath) {
      const fullPath = path.resolve(outputPath, filename);
      fs.writeFileSync(fullPath, excelBuffer);
      return {
        success: true,
        message: `文件已保存: ${fullPath}`,
        path: fullPath
      };
    }

    return {
      success: true,
      buffer: excelBuffer,
      filename
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

module.exports = { writeExcel, writeMultiSheetExcel };

// CLI 支持
if (require.main === module) {
  const args = process.argv.slice(2);
  if (args.length < 2) {
    console.log('用法: node write-excel.js <输出路径> <JSON数据>');
    process.exit(1);
  }
  
  try {
    const data = JSON.parse(args[1]);
    const result = writeExcel(data, { outputPath: args[0] });
    console.log(JSON.stringify(result, null, 2));
  } catch (e) {
    console.log(JSON.stringify({ success: false, error: e.message }));
  }
}
