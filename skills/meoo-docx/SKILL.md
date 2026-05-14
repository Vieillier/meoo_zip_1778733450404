---
name: meoo-docx
description: "使用此技能处理 Word 文档 (.docx) 的创建、读取、编辑或分析。触发场景包括：提及 'Word 文档'、'.docx'，或要求生成包含目录、页码、页眉页脚等专业排版的文档。也用于从文档中提取内容、插入/替换图像、执行查找替换、处理修订（Tracked Changes）或评论。本技能已针对 meoo 沙箱环境优化，支持中文字体。"
---

# meoo-docx: Word 文档处理专家

## ⚠️ 核心执行原则

1. **环境适配**：
    - **已预装 (Python)**：`python-docx`, `pandas`, `openpyxl`。
    - **已预装 (Node.js)**：`docx`, `mammoth` (可通过 `npx mammoth` 使用)。
    - **需按需安装**：LibreOffice (用于 `soffice.py` 和 PDF 转换)、Pandoc (用于高级转换)、Poppler-utils (用于 `pdftoppm` 预览)。
2. **禁止直接读取**：绝对禁止通过 `read` 或 `view_file` 工具直接读取此类二进制文件，这会导致乱码且无法获取有效信息。你**必须**使用本技能推荐的库编写脚本来解析内容。
3. **脚本执行**：**绝对禁止**在 bash 中直接执行复杂的 python 指令或使用 heredoc。你**必须**先将脚本写入 `home/project/tmp/` 目录（例如 `home/project/tmp//process_docx.py`），然后通过 `python3 home/project/tmp/process_docx.py` 运行。
4. **中文支持**：沙箱已安装 `fonts-wqy-microhei`。在生成文档时，必须显式设置中文字体为 `WenQuanYi Micro Hei`。

---

## 📦 环境依赖安装指南

如果在执行过程中提示找不到 `soffice`、`pandoc` 或 `pdftoppm`，请先运行以下安装指令：

```bash
apt-get update && apt-get install -y libreoffice pandoc poppler-utils
```
> [!NOTE]
> 安装过程可能需要 1-2 分钟，请在脚本执行前确保环境已准备就绪。

---

## 中文支持配置 (Python)

在脚本中添加以下逻辑以确保中文正常显示：

```python
from docx.oxml.ns import qn

def set_chinese_font(run, font_name='WenQuanYi Micro Hei'):
    # 设置西文字体
    run.font.name = font_name
    # 设置中文字体 (East Asia)
    run._element.rPr.rFonts.set(qn('w:eastAsia'), font_name)

# 使用示例
run = paragraph.add_run("你好，世界")
set_chinese_font(run)
```

---

## 常用工作流

### 1. 文档分析与提取
优先使用 `mammoth` 将 .docx 转换为 Markdown/HTML，以便于 LLM 理解内容：
```bash
npx mammoth input.docx output.md
```

### 2. 文档创建与编辑
使用 `python-docx` 进行精细化操作。将逻辑写入 `/tmp/` 脚本。

### 3. 处理修订 (Tracked Changes)
如果需要“接受所有修订”以获得干净的文档，请使用内置脚本：
```bash
python3 scripts/accept_changes.py input.docx output.docx
```

### 4. 高级转换 (PDF/图片)
沙箱中此类操作需依赖动态安装的辅助工具。Skill 内部已集成 `soffice.py` 用于解决沙箱权限问题。
```bash
# 转换为 PDF
python3 scripts/office/soffice.py --headless --convert-to pdf input.docx
```

---

## 文档创建 (Node.js - docx 库)

如果在沙箱中使用 Node.js 进行文档创建，请遵循以下专业标准：

### 1. 基础配置
```javascript
const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, ImageRun,
        AlignmentType, PageOrientation, LevelFormat, WidthType, ShadingType } = require('docx');

const doc = new Document({
  sections: [{
    properties: {
      page: {
        size: { width: 12240, height: 15840 }, // A4 尺寸 (DXA 单位)
        margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } // 1英寸页边距
      }
    },
    children: [/* 内容 */]
  }]
});
```

### 2. 样式与表格
- **表格宽度**：必须同时设置 `columnWidths` 和单元格 `width`（使用 `WidthType.DXA`），否则在部分阅读器（如 Google Docs）中会错位。
- **列表**：禁止直接使用 Unicode 圆点，必须使用内置的 `LevelFormat.BULLET` 配套 `numbering` 配置。
- **强制分页**：`PageBreak` 必须包裹在 `Paragraph` 内部。

---

## 🎨 美学与专业美化指南 (Aesthetics Guide)

为了生成“令人赞叹”的专业文档，必须遵循以下排版美学：

### 1. 文字层级 (Typographic Hierarchy)
- **限制字体族**：全文建议只使用两种字体（如：标题用衬线体，正文用无衬线体）。
- **使用样式 (Styles)**：禁止手动加粗作为标题。必须使用 Word 内置的 `Heading 1` 和 `Heading 2`，这不仅规范排版，还可以自动生成目录。

### 2. 留白艺术 (Mastering Whitespace)
- **段后间距**：禁止连续按回车来增加空行。必须在段落样式中设置段后间距（建议 6pt - 12pt）。
- **行间距**：正文使用 1.15 或 1.5 倍行距，这能显著提升长篇文档的可读性。

### 3. 排版细节
- **左对齐优先**：正文建议采用左对齐，避免两端对齐（Justified）在生成的过程中产生不均匀的词间距。
- **列表化描述**：多项并列内容优先使用符号列表，这能提供即时的视觉停顿。

---

## 进阶操作：直接编辑 XML

对于精细化修订或注入评论，采用“解压 -> 修改 XML -> 重新打包”的方案。

### 核心步骤
1. **Unpack**: `python3 scripts/office/unpack.py doc.docx unpacked/`
2. **Edit**: 修改 `unpacked/word/document.xml` 或 `comments.xml`。
3. **Pack**: `python3 scripts/office/pack.py unpacked/ output.docx --original doc.docx`

### XML 修订标准 (Claude 为默认作者)
**插入 (Insertion):**
```xml
<w:ins w:id="1" w:author="Claude" w:date="2025-01-01T00:00:00Z">
  <w:r><w:t>新增文本</w:t></w:r>
</w:ins>
```

**删除 (Deletion):**
```xml
<w:del w:id="2" w:author="Claude" w:date="2025-01-01T00:00:00Z">
  <w:r><w:delText>删除文本</w:delText></w:r>
</w:del>
```

**评论标记**: `<w:commentRangeStart>` 和 `<w:commentRangeEnd>` 必须是 `<w:p>` 的直接子元素，禁止放在 `<w:r>` 内部。

---

## 捆绑资源说明
- `scripts/office/soffice.py`: 解决沙箱中 LibreOffice UNIX 套接字限制的 shim。
- `scripts/office/validate.py`: 用于验证生成的 XML 结构是否合规。
- `scripts/accept_changes.py`: 接受所有修订的自动化脚本。
- `scripts/comment.py`: 用于处理评论注入的辅助脚本。
