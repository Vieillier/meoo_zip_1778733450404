# ============================================
# AI 初审 Edge Function 快速测试脚本
# ============================================
# 
# 使用方法：
# 1. 确保已启动本地 Supabase：supabase start
# 2. 确保已配置 .env.local 中的 DASHSCOPE_API_KEY
# 3. 修改下面的 BOOTH_ID 为真实的展位 ID
# 4. 运行此脚本：.\test-ai-review.ps1

# ========== 配置 ==========
$BOOTH_ID = "your-booth-uuid-here"  # 替换为真实的展位 ID
$FUNCTION_URL = "http://localhost:54321/functions/v1/ai-pre-review"
$ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0"

# ========== 检查前置条件 ==========
Write-Host "🔍 检查前置条件..." -ForegroundColor Cyan

# 检查 Supabase 是否运行
try {
    $response = Invoke-WebRequest -Uri "http://localhost:54321/rest/v1/" -Method GET -ErrorAction Stop
    Write-Host "✅ Supabase 本地服务运行中" -ForegroundColor Green
} catch {
    Write-Host "❌ Supabase 本地服务未启动，请先运行: supabase start" -ForegroundColor Red
    exit 1
}

# 检查环境变量文件
if (-not (Test-Path "supabase/.env.local")) {
    Write-Host "❌ 未找到 supabase/.env.local 文件" -ForegroundColor Red
    Write-Host "请创建该文件并配置 DASHSCOPE_API_KEY" -ForegroundColor Yellow
    exit 1
}

# 检查展位 ID
if ($BOOTH_ID -eq "your-booth-uuid-here") {
    Write-Host "⚠️  请先修改脚本中的 BOOTH_ID 为真实的展位 ID" -ForegroundColor Yellow
    Write-Host "可以在 Supabase Studio 中执行以下 SQL 获取展位 ID：" -ForegroundColor Yellow
    Write-Host "SELECT id, booth_number, exhibitor_name FROM exhibitor_booths LIMIT 5;" -ForegroundColor Cyan
    exit 1
}

# ========== 发送测试请求 ==========
Write-Host ""
Write-Host "🚀 开始测试 AI 初审功能..." -ForegroundColor Cyan
Write-Host "展位 ID: $BOOTH_ID" -ForegroundColor Gray

$headers = @{
    "Authorization" = "Bearer $ANON_KEY"
    "Content-Type" = "application/json"
}

$body = @{
    booth_id = $BOOTH_ID
} | ConvertTo-Json

try {
    Write-Host ""
    Write-Host "📤 发送请求..." -ForegroundColor Cyan
    
    $response = Invoke-RestMethod -Uri $FUNCTION_URL `
        -Method POST `
        -Headers $headers `
        -Body $body `
        -ErrorAction Stop
    
    Write-Host ""
    Write-Host "✅ 请求成功！" -ForegroundColor Green
    Write-Host ""
    Write-Host "========== AI 初审结果 ==========" -ForegroundColor Cyan
    Write-Host ""
    
    # 展位信息
    Write-Host "📍 展位信息：" -ForegroundColor Yellow
    Write-Host "  展位号: $($response.booth_info.booth_number)" -ForegroundColor White
    Write-Host "  展馆: $($response.booth_info.hall_number)" -ForegroundColor White
    Write-Host "  展商: $($response.booth_info.exhibitor_name)" -ForegroundColor White
    Write-Host "  类别: $($response.booth_info.booth_category)" -ForegroundColor White
    Write-Host "  面积: $($response.booth_info.booth_area) 平方米" -ForegroundColor White
    Write-Host "  高度: $($response.booth_info.booth_height) 米" -ForegroundColor White
    Write-Host ""
    
    # AI 审查结果
    $suggestionColor = if ($response.ai_review.suggestion -eq "通过") { "Green" } else { "Red" }
    Write-Host "🤖 AI 初审建议：" -ForegroundColor Yellow
    Write-Host "  结论: $($response.ai_review.suggestion)" -ForegroundColor $suggestionColor
    Write-Host "  理由: $($response.ai_review.reason)" -ForegroundColor White
    Write-Host ""
    
    # 匹配的规范数量
    Write-Host "📚 匹配规范数量: $($response.matched_guides_count) 条" -ForegroundColor Yellow
    Write-Host ""
    
    # 时间戳
    Write-Host "⏰ 处理时间: $($response.timestamp)" -ForegroundColor Gray
    Write-Host ""
    Write-Host "=================================" -ForegroundColor Cyan
    
} catch {
    Write-Host ""
    Write-Host "❌ 请求失败！" -ForegroundColor Red
    Write-Host ""
    Write-Host "错误信息：" -ForegroundColor Yellow
    Write-Host $_.Exception.Message -ForegroundColor Red
    Write-Host ""
    
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "响应内容：" -ForegroundColor Yellow
        Write-Host $responseBody -ForegroundColor Red
    }
    
    Write-Host ""
    Write-Host "排查建议：" -ForegroundColor Yellow
    Write-Host "1. 检查 Edge Function 是否正在运行：supabase functions serve ai-pre-review --env-file supabase/.env.local" -ForegroundColor Cyan
    Write-Host "2. 检查 DASHSCOPE_API_KEY 是否配置正确" -ForegroundColor Cyan
    Write-Host "3. 检查展位 ID 是否存在" -ForegroundColor Cyan
    Write-Host "4. 查看函数日志获取详细错误信息" -ForegroundColor Cyan
    
    exit 1
}
