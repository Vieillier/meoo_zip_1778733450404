# AI 初审功能升级 - 多模态视觉版本

## 🎯 升级内容

已将 `ai-pre-review` Edge Function 从**纯文本分析**升级为**多模态视觉分析**。

### ✅ 新增功能

1. **图纸图片识别**
   - 自动从 `drawing-files` 存储桶获取展位图纸
   - 支持多张图纸同时分析（最多5张）
   - 获取图片的公网 URL 并传递给 AI

2. **多模态视觉大模型**
   - 使用阿里云百炼 `qwen-vl-max` 模型
   - AI 能够"看懂"图纸内容
   - 检查结构设计、材料使用、尺寸标注等细节

3. **综合审查能力**
   - 结合图纸图片 + 展位文字信息 + RAG 规范文本
   - 真正实现"看图审图"（例如：检查螺栓数量、结构细节）
   - 更准确的审查建议

---

## 📊 升级前 vs 升级后

| 功能 | 升级前 | 升级后 |
|------|--------|--------|
| **分析内容** | 仅文字信息 | 文字 + 图片 |
| **AI 模型** | qwen-plus（文本） | qwen-vl-max（多模态） |
| **审查能力** | 基础检查（高度、面积） | 深度检查（结构、材料、细节） |
| **图纸识别** | ❌ 不支持 | ✅ 支持 |
| **准确度** | 中等 | 高 |

---

## 🔧 技术实现

### 1. 查询图纸文件

```typescript
// 从数据库查询图纸记录
const { data: drawingFiles } = await supabase
  .from('drawing_submissions')
  .select('file_path')
  .eq('booth_id', booth_id)
  .order('created_at', { ascending: false });

// 获取公网 URL
const { data: urlData } = supabase.storage
  .from('drawing-files')
  .getPublicUrl(file.file_path);
```

### 2. 构建多模态请求

```typescript
const messageContent = [
  {
    type: 'text',
    text: '展位信息 + 规范文本 + 审查要求'
  },
  {
    type: 'image_url',
    image_url: {
      url: '图纸公网URL'
    }
  }
];
```

### 3. 调用多模态 API

```typescript
const response = await fetch(DASHSCOPE_VL_API_URL, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${DASHSCOPE_API_KEY}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    model: 'qwen-vl-max',
    input: {
      messages: [
        {
          role: 'user',
          content: messageContent
        }
      ]
    }
  })
});
```

---

## 🚀 部署步骤

### 1. 重新部署 Edge Function

```powershell
supabase functions deploy ai-pre-review --project-ref aakexkggqspgpimfwlkn
```

### 2. 确认环境变量

确保 Supabase Dashboard 中已配置：
- `DASHSCOPE_API_KEY`: 阿里云百炼 API Key

### 3. 测试多模态功能

```powershell
# 使用有图纸的展位进行测试
$boothId = "有图纸的展位ID"

$response = Invoke-RestMethod `
    -Uri "https://aakexkggqspgpimfwlkn.supabase.co/functions/v1/ai-pre-review" `
    -Method Post `
    -Headers @{
        "Authorization" = "Bearer sb_publishable_Bee1XtMi-nVORakNZqFhxw_EuvxtAVb"
        "Content-Type" = "application/json"
    } `
    -Body (@{ booth_id = $boothId } | ConvertTo-Json)

Write-Host "AI 建议: $($response.ai_review.suggestion)"
Write-Host "理由: $($response.ai_review.reason)"
Write-Host "分析图纸数: $($response.drawing_files_count)"
```

---

## 📝 API 响应格式

```json
{
  "success": true,
  "booth_id": "uuid",
  "booth_info": {
    "booth_number": "A101",
    "booth_area": 36,
    "booth_height": 4.5,
    "booth_category": "特装"
  },
  "drawing_files_count": 3,
  "ai_review": {
    "suggestion": "驳回",
    "reason": "图纸中工字钢固定仅使用2枚螺栓，不符合规范要求的4枚螺栓标准..."
  },
  "matched_guides_count": 3,
  "timestamp": "2026-05-21T14:30:00Z"
}
```

---

## ⚠️ 注意事项

1. **图纸必须可公开访问**
   - 确保 `drawing-files` 存储桶的文件是公开的
   - 或者使用签名 URL（需要修改代码）

2. **API 调用成本**
   - 多模态模型比文本模型更贵
   - 建议只在必要时调用（例如：审图员点击"AI 初审"按钮）

3. **图片数量限制**
   - 当前限制最多处理前5张图纸
   - 可根据需要调整 `drawingUrls.slice(0, 5)`

4. **降级处理**
   - 如果展位未上传图纸，仍然可以基于文字信息进行审查
   - AI 会提示"建议要求展商补充完整图纸"

---

## 🎉 升级完成

现在 AI 初审功能可以：
- ✅ 真正"看懂"图纸图片
- ✅ 检查结构细节（螺栓、桁架、楼梯等）
- ✅ 对照规范进行深度审查
- ✅ 给出更准确的审查建议

下一步：在前端界面添加"AI 初审"按钮，让审图员可以一键调用此功能！
