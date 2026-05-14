---
name: excel-processor
description: 读取、解析、转换和生成 Excel 文件，支持数据提取、格式转换、表格合并等操作。当用户提到
  Excel、xlsx、表格处理、数据导出、报表生成时必须使用此技能。
dependency:
  npm:
    - xlsx@^0.18.5
    - file-saver@^2.0.5
---

# Excel 处理器

## 任务目标
- 本 Skill 用于处理 Excel 文件的读取、解析、转换和生成
- 能力：读取 Excel 数据、导出数据到 Excel、格式转换、数据清洗、多表合并
- 触发：用户需要处理 Excel 文件、数据导出、报表生成、表格转换时

## 前置准备
- 依赖说明：xlsx 库用于 Excel 文件解析，file-saver 用于文件下载
- 无需额外系统命令

## 操作步骤

### 1. 读取 Excel 文件
- 调用 `scripts/read-excel.js` 解析 Excel 文件
- 支持 .xlsx 和 .xls 格式
- 返回 JSON 格式的数据

### 2. 生成 Excel 文件
- 调用 `scripts/write-excel.js` 将数据导出为 Excel
- 支持自定义表头、样式、多工作表
- 自动触发文件下载

### 3. 数据转换与处理
- 支持 JSON 与 Excel 互转
- 支持 CSV 与 Excel 互转
- 支持数据清洗和格式化

## 资源索引

### 脚本工具
- **[scripts/read-excel.js](scripts/read-excel.js)**
  - 用途：读取并解析 Excel 文件，提取表格数据
  - 触发时机：当用户需要读取 Excel 文件内容、提取表格数据时，**必须调用此脚本**
  - 输入：Excel 文件路径或 File 对象
  - 输出：JSON 格式的数据数组

- **[scripts/write-excel.js](scripts/write-excel.js)**
  - 用途：将数据导出为 Excel 文件
  - 触发时机：当用户需要将数据导出为 Excel、生成报表时，**必须调用此脚本**
  - 输入：JSON 数据、表头配置、文件名
  - 输出：自动触发文件下载

### 参考文档
- **[references/excel-format.md](references/excel-format.md)**
  - 内容：Excel 文件格式规范、数据类型映射、常见错误处理
  - 使用时机：在处理复杂 Excel 格式或遇到解析问题时，**必须先读取此文档**
  - 关键作用：提供数据类型转换规则和格式处理最佳实践

## 注意事项
- **附件读取规则**：当任务涉及特定格式、日期处理或复杂表格结构时，**必须优先读取** references/ 中的相关文档
- **脚本调用规则**：遇到 Excel 文件解析、数据导出等操作时，**立即调用** scripts/ 中的对应脚本
- **数据安全**：处理敏感数据时注意内存限制，大文件建议分批处理
- **浏览器环境**：文件下载功能依赖浏览器环境，Node 环境需调整输出方式