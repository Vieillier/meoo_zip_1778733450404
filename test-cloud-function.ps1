# ============================================
# 测试云端 AI 初审 Edge Function
# ============================================

$FUNCTION_URL = "https://aakexkggqspgpimfwlkn.supabase.co/functions/v1/ai-pre-review"
$ANON_KEY = "sb_publishable_Bee1XtMi-nVORakNZqFhxw_EuvxtAVb"

Write-Host "🧪 测试云端 AI 初审 Edge Function" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 测试数据
$testPayload = @{
    booth_id = "请替换为真实的 booth_id"
} | ConvertTo-Json

Write-Host "📦 测试数据:" -ForegroundColor Yellow
Write-Host $testPayload -ForegroundColor Gray
Write-Host ""

Write-Host "🚀 发送请求..." -ForegroundColor Yellow
Write-Host ""

try {
    $response = Invoke-RestMethod -Uri $FUNCTION_URL `
        -Method Post `
        -Headers @{
            "Authorization" = "Bearer $ANON_KEY"
            "Content-Type" = "application/json"
        } `
        -Body $testPayload

    Write-Host "✅ 请求成功！" -ForegroundColor Green
    Write-Host ""
    Write-Host "========== AI 初审结果 ==========" -ForegroundColor Cyan
    Write-Host "🤖 建议: $($response.suggestion)" -ForegroundColor $(if ($response.suggestion -eq "通过") { "Green" } else { "Red" })
    Write-Host "📝 理由: $($response.reason)" -ForegroundColor White
    Write-Host "=================================" -ForegroundColor Cyan
    Write-Host ""
    
    Write-Host "📦 完整响应:" -ForegroundColor Yellow
    Write-Host ($response | ConvertTo-Json -Depth 10) -ForegroundColor Gray

} catch {
    Write-Host "❌ 请求失败" -ForegroundColor Red
    Write-Host ""
    Write-Host "错误信息:" -ForegroundColor Yellow
    Write-Host $_.Exception.Message -ForegroundColor Red
    Write-Host ""
    
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "响应内容:" -ForegroundColor Yellow
        Write-Host $responseBody -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "💡 提示:" -ForegroundColor Yellow
Write-Host "1. 确保已在 Supabase Dashboard 配置 DASHSCOPE_API_KEY" -ForegroundColor White
Write-Host "2. 将测试数据中的 booth_id 替换为真实值" -ForegroundColor White
Write-Host ""
