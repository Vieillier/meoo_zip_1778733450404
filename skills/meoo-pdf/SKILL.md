---
name: meoo-pdf
description: 使用此技能处理 PDF 文件的所有操作。包括：读取、提取文本/表格、合并/拆分 PDF、旋转页面、添加水印、创建新 PDF（支持中文）、填充 PDF 表单、提取图像以及对扫描件进行 OCR。触发场景：提及 '.pdf' 文件或要求生成/处理 PDF 成果。本技能已针对 meoo 沙箱环境优化，支持中文字体。
---

# meoo-pdf: PDF 处理专家

## ⚠️ 核心执行原则

1. **环境适配**：
    - **已预装 (Python)**：`pypdf`, `pdfplumber`, `reportlab`, `pandas`。
    - **已预装 (Node.js)**：`pdf-lib`。
    - **需按需安装**：Poppler-utils (用于 `pdftoppm` 预览)、QPDF (用于高级页面操作/解密)、Tesseract-OCR (用于 OCR)。
2. **禁止直接读取**：绝对禁止通过 `read` 或 `view_file` 工具直接读取此类二进制文件，这会导致乱码且无法获取有效信息。你**必须**使用本技能推荐的库编写脚本来解析内容。
3. **脚本执行**：你**必须**先将脚本写入 `home/project/tmp/` 目录（例如 `home/project/tmp/process_pdf.py`），然后运行。禁止使用 bash inline python。
4. **中文支持**：沙箱已安装 `fonts-wqy-microhei`。在使用 `reportlab` 生成 PDF 时，必须注册并使用此中文字体。

---

## 📦 环境依赖安装指南

如果在执行过程中提示命令缺失，请先运行以下安装指令：

```bash
apt-get update && apt-get install -y poppler-utils qpdf tesseract-ocr
```

---

## 中文支持配置 (Python - ReportLab)

在生成 PDF 的脚本中注册中文字体：

```python
from reportlab.pdfbase import ttfonts, pdfmetrics
from reportlab.platypus import Paragraph
from reportlab.lib.styles import getSampleStyleSheet

# 注册文泉驿微米黑
pdfmetrics.registerFont(ttfonts.TTFont('WenQuanYi', '/usr/share/fonts/truetype/wqy/wqy-microhei.ttc'))

# 使用示例
styles = getSampleStyleSheet()
styles['Normal'].fontName = 'WenQuanYi'
化学式：Paragraph("H<sub>2</sub>O", styles['Normal'])
数学公式：Paragraph("x<super>2</super>", styles['Normal'])
```

---

## 🎨 美学与专业美化指南 (Aesthetics Guide)

PDF 的专业感源于“秩序感”与“可访问性”：

### 1. CRAP 设计原则
- **对比 (Contrast)**：标题字体需显著大于或黑于正文（建议正文 11-12pt）。
- **重复 (Repetition)**：全文页眉、页脚、各级标题颜色必须保持 100% 视觉一致性。
- **对齐 (Alignment)**：所有图片、文字块和表格必须基于隐形网格线对齐，严禁随意摆放位置。
- **亲密性 (Proximity)**：图标与标签、图片与说明文字必须紧凑，不同章节间通过大留白区分。

### 2. 导航与交互
- **可点击目录**：对于 5 页以上的文档，必须生成带有超链接的目录（TOC）和 PDF 书签（Bookmarks）。
- **禁止“图片化”**：确保导出的 PDF 文字可选中、可搜索。严禁将整个文档转为单张大图 PDF。

### 3. 可访问性
- 为所有图表添加 **Alt Text**。
- 采用高对比度颜色组合（如黑字白底），确保内容易于阅读。

---

## 进阶功能

### 1. 元数据与加密 (pypdf)
```python
from pypdf import PdfReader, PdfWriter

reader = PdfReader("input.pdf")
writer = PdfWriter()
writer.append(reader)

# 设置元数据
writer.add_metadata({"/Title": "我的文档", "/Author": "meoo"})

# 加密
writer.encrypt("user_password", "owner_password")

with open("output.pdf", "wb") as f:
    writer.write(f)
```

### 2. 扫描件 OCR (自动化提取)
如果文档无可选文本，可将其转换为图像并使用 Tesseract：
```python
from pdf2image import convert_from_path
import pytesseract

images = convert_from_path('scanned.pdf', dpi=300)
text = ""
for img in images:
    text += pytesseract.image_to_string(img, lang='chi_sim+eng')
```

---

## 常用工作流

### 1. 文本与表格提取
优先使用 `pdfplumber` 提取结构化数据：
```python
import pdfplumber
with pdfplumber.open("input.pdf") as pdf:
    # 提取表格
    table = pdf.pages[0].extract_table()
```

### 2. 合并、拆分与旋转
使用 `pypdf` 进行基础页面操作：
```python
from pypdf import PdfWriter
writer = PdfWriter()
writer.append("doc1.pdf")
writer.write("merged.pdf")
```

### 3. PDF 表单填充与标签
针对需要精准定位的表单填充或批注（基于图像坐标转换），请使用内置脚本：
```bash
python3 scripts/fill_pdf_form_with_annotations.py input.pdf fields.json output.pdf
```

### 4. 图片提取 (Image Extraction)
使用 `pdfimages` (来自 `poppler-utils`) 可以高效提取 PDF 中的原始图像：
```bash
# -j 参数确保将图像提取为 JPEG 格式
pdfimages -j input.pdf image_prefix
```
> [!TIP]
> 提取出的文件将命名为 `image_prefix-000.jpg`, `image_prefix-001.jpg` 等。

### 5. OCR 与扫描件处理
如果需要 OCR，需动态安装依赖：
```bash
apt-get update && apt-get install -y tesseract-ocr
pip install pytesseract
```

---

## 捆绑资源说明
- `scripts/fill_pdf_form_with_annotations.py`: 解决 PDF 坐标与图像坐标（DPI）映射的精准填充脚本。
- `scripts/extract_form_field_info.py`: 解析 PDF 表单域信息的辅助工具。
