# Excel 格式规范参考

## 数据类型映射

| Excel 类型 | JavaScript 类型 | 说明 |
|-----------|----------------|------|
| 文本 | string | 默认读取为字符串 |
| 数字 | number | 整数或浮点数 |
| 日期 | Date | 自动解析为 Date 对象 |
| 布尔 | boolean | TRUE/FALSE |
| 公式 | 计算结果 | 读取计算后的值 |

## 日期处理

Excel 日期以 1900-01-01 为基准存储为数字。解析时：
- 使用 `dateNF` 选项指定日期格式
- 常见格式：`'yyyy-mm-dd'`, `'yyyy/mm/dd'`, `'mm-dd-yyyy'`

## 读取配置选项

```javascript
{
  sheet: 0,        // 工作表索引，默认第一个
  header: 1,       // 1=第一行作为表头，undefined=自动生成
  range: 'A1:D10', // 指定读取范围
  dateFormat: 'yyyy-mm-dd' // 日期格式
}
```

## 写入配置选项

```javascript
{
  filename: 'export.xlsx',  // 输出文件名
  sheetName: 'Sheet1',      // 工作表名称
  headers: ['col1', 'col2'], // 指定表头顺序
  outputPath: './output'    // 输出目录
}
```

## 常见问题

1. **中文乱码**：确保文件使用 UTF-8 编码
2. **日期偏差**：Excel 的 1900 闰年 bug 可能导致日期差 1 天
3. **大文件**：超过 10MB 的文件建议分批处理
4. **合并单元格**：读取时合并单元格的值会出现在左上角单元格

## 示例数据格式

```javascript
// 输入数据示例
const data = [
  { name: '张三', age: 25, date: '2024-01-15' },
  { name: '李四', age: 30, date: '2024-01-16' }
];

// 输出结果示例
const result = {
  success: true,
  sheetName: 'Sheet1',
  data: [...],
  totalRows: 2,
  columns: ['name', 'age', 'date']
};
```
