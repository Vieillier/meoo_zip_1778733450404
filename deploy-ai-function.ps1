# ============================================
# 部署 AI 初审 Edge Function 到 Supabase
# ============================================

Write-Host "🚀 开始部署 AI 初审 Edge Function..." -ForegroundColor Cyan
Write-Host ""

# 1. 检查 Supabase CLI
Write-Host "📦 检查 Supabase CLI..." -ForegroundColor Yellow
try {
    $version = supabase --version
    Write-Host "✅ Supabase CLI 已安装: $version" -ForegroundColor Green
} catch {
    Write-Host "❌ Supabase CLI 未安装" -ForegroundColor Red
    Write-Host "请先安装: https://supabase.com/docs/guides/cli" -ForegroundColor Yellow
    exit 1
}

Write-Host ""

# 2. 检查 Edge Function 文件
Write-Host "📁 检查 Edge Function 文件..." -ForegroundColor Yellow
if (Test-Path "supabase/functions/ai-pre-review/index.ts") {
    Write-Host "✅ Edge Function 文件存在" -ForegroundColor Green
} else {
    Write-Host "❌ Edge Function 文件不存在" -ForegroundColor Red
    exit 1
}

Write-Host ""

# 3. 部署到 Supabase
Write-Host "☁️  部署到 Supabase..." -ForegroundColor Yellow
Write-Host "提示: 如果是第一次部署，需要先登录 Supabase" -ForegroundColor Gray
Write-Host ""

try {
    supabase functions deploy ai-pre-review --project-ref aakexkggqspgpimfwlkn
    Write-Host ""
    Write-Host "✅ 部署成功！" -ForegroundColor Green
} catch {
    Write-Host "❌ 部署失败" -ForegroundColor Red
    Write-Host "错误信息: $_" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "🎉 部署完成！" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "📝 下一步操作：" -ForegroundColor Yellow
Write-Host "1. 在 Supabase Dashboard 配置环境变量 DASHSCOPE_API_KEY" -ForegroundColor White
Write-Host "   地址: https://supabase.com/dashboard/project/aakexkggqspgpimfwlkn/settings/functions" -ForegroundColor Gray
Write-Host ""
Write-Host "2. 测试 Edge Function：" -ForegroundColor White
Write-Host "   .\test-cloud-function.ps1" -ForegroundColor Gray
Write-Host ""
Write-Host "3. 集成到前端界面" -ForegroundColor White
Write-Host ""
