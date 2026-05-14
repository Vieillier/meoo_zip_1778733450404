const XLSX = require('xlsx');
const fs = require('fs');

/**
 * 读取 Excel 文件并解析为 JSON
 * @param {string|Buffer} filePath - 文件路径或 Buffer
 * @param {Object} options - 配置选项
 * @returns {Object} 解析后的数据
 */
function readExcel(filePath, options = {}) {
  const {
    sheet = 0,
    header = 1,
    range,
    dateFormat = 'yyyy-mm-dd'
  } = options;

  try {
    let workbook;
    
    if (Buffer.isBuffer(filePath)) {
      workbook = XLSX.read(filePath, { type: 'buffer' });
    } else if (fs.existsSync(filePath)) {
      const fileBuffer = fs.readFileSync(filePath);
      workbook = XLSX.read(fileBuffer, { type: 'buffer' });
    } else {
      throw new Error('文件不存在或格式不正确');
    }

    const sheetName = workbook.SheetNames[sheet];
    const worksheet = workbook.Sheets[sheetName];
    
    const jsonOptions = {
      header: header === 1 ? 1 : undefined,
      defval: '',
      dateNF: dateFormat
    };
    
    if (range) {
      jsonOptions.range = range;
    }

    const data = XLSX.utils.sheet_to_json(worksheet, jsonOptions);
    
    return {
      success: true,
      sheetName,
      data,
      totalRows: data.length,
      columns: data.length > 0 ? Object.keys(data[0]) : []
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * 读取多工作表 Excel
 * @param {string|Buffer} filePath - 文件路径或 Buffer
 * @returns {Object} 所有工作表数据
 */
function readAllSheets(filePath) {
  try {
    let workbook;
    
    if (Buffer.isBuffer(filePath)) {
      workbook = XLSX.read(filePath, { type: 'buffer' });
    } else if (fs.existsSync(filePath)) {
      const fileBuffer = fs.readFileSync(filePath);
      workbook = XLSX.read(fileBuffer, { type: 'buffer' });
    } else {
      throw new Error('文件不存在或格式不正确');
    }

    const result = {};
    workbook.SheetNames.forEach(sheetName => {
      const worksheet = workbook.Sheets[sheetName];
      result[sheetName] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
    });

    return {
      success: true,
      sheets: workbook.SheetNames,
      data: result
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

module.exports = { readExcel, readAllSheets };

// CLI 支持
if (require.main === module) {
  const args = process.argv.slice(2);
  if (args.length < 1) {
    console.log('用法: node read-excel.js <文件路径> [工作表索引]');
    process.exit(1);
  }
  
  const result = readExcel(args[0], { sheet: parseInt(args[1]) || 0 });
  console.log(JSON.stringify(result, null, 2));
}
