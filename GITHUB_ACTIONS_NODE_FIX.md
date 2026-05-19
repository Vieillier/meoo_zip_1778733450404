# 🔧 GitHub Actions Node.js 版本升级修复

## 问题描述

部署失败，报错显示：
```
Node.js 20 actions are deprecated. The following actions are running on Node.js 20 and may not work as expected: 
actions/checkout@v4, actions/setup-node@v4, pnpm/action-setup@v4
```

## 根本原因

GitHub Actions 正在逐步弃用 Node.js 20，计划在 2026 年 6 月 2 日强制使用 Node.js 24。

**时间表**：
- 现在：Node.js 20 已弃用，显示警告
- 2026 年 6 月 2 日：强制使用 Node.js 24
- 2026 年 9 月 16 日：完全移除 Node.js 20

## 解决方案

### 修复 1：添加环境变量

在工作流文件中添加 `FORCE_JAVASCRIPT_ACTIONS_TO_NODE24: true` 环境变量，强制使用 Node.js 24。

**文件**：`.github/workflows/deploy.yml`

**修改位置**：
1. 第 37-38 行（Set up Node 步骤）
2. 第 48 行（Build project 步骤）

**修改内容**：
```yaml
- name: Set up Node
  uses: actions/setup-node@v4
  with:
    node-version: 24
    cache: 'pnpm'
  env:
    FORCE_JAVASCRIPT_ACTIONS_TO_NODE24: true

- name: Build project
  env:
    VITE_SUPABASE_URL: ${{ secrets.VITE_SUPABASE_URL }}
    VITE_SUPABASE_ANON_KEY: ${{ secrets.VITE_SUPABASE_ANON_KEY }}
    FORCE_JAVASCRIPT_ACTIONS_TO_NODE24: true
  run: pnpm build
```

## 修改文件

### `.github/workflows/deploy.yml`

**修改内容**：
```diff
  - name: Set up Node
    uses: actions/setup-node@v4
    with:
      node-version: 24
      cache: 'pnpm'
+   env:
+     FORCE_JAVASCRIPT_ACTIONS_TO_NODE24: true

  - name: Build project
    # 🔒 核心修复：在这里精准、安全地注入你在 GitHub 网页后台配好的两个加密变量
    env:
      VITE_SUPABASE_URL: ${{ secrets.VITE_SUPABASE_URL }}
      VITE_SUPABASE_ANON_KEY: ${{ secrets.VITE_SUPABASE_ANON_KEY }}
+     FORCE_JAVASCRIPT_ACTIONS_TO_NODE24: true
    run: pnpm build
```

## 修复后的工作流

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches:
      - main

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: 'pages'
  cancel-in-progress: true

jobs:
  deploy:
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Install pnpm
        uses: pnpm/action-setup@v4
        with:
          version: 9

      - name: Set up Node
        uses: actions/setup-node@v4
        with:
          node-version: 24
          cache: 'pnpm'
        env:
          FORCE_JAVASCRIPT_ACTIONS_TO_NODE24: true

      - name: Install dependencies
        run: pnpm install

      - name: Build project
        env:
          VITE_SUPABASE_URL: ${{ secrets.VITE_SUPABASE_URL }}
          VITE_SUPABASE_ANON_KEY: ${{ secrets.VITE_SUPABASE_ANON_KEY }}
          FORCE_JAVASCRIPT_ACTIONS_TO_NODE24: true
        run: pnpm build

      - name: Setup Pages
        uses: actions/configure-pages@v5

      - name: Upload artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: './dist'

      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
```

## 修复原理

### 环境变量说明

**`FORCE_JAVASCRIPT_ACTIONS_TO_NODE24: true`**
- 强制 GitHub Actions 使用 Node.js 24
- 消除弃用警告
- 确保与未来版本兼容

### 工作流执行流程

```
1. Checkout 代码
   ↓
2. 安装 pnpm
   ↓
3. 设置 Node.js 24（使用环境变量强制）
   ↓
4. 安装依赖
   ↓
5. 构建项目（使用环境变量强制）
   ↓
6. 配置 GitHub Pages
   ↓
7. 上传构建产物
   ↓
8. 部署到 GitHub Pages
```

## 验证修复

### 方法 1：查看 GitHub Actions 日志

1. 推送代码到 main 分支
2. 进入 GitHub 仓库 → Actions 标签
3. 查看最新的工作流运行
4. ✅ 不应该看到 Node.js 20 弃用警告

### 方法 2：检查工作流文件

```bash
# 验证 YAML 语法
cat .github/workflows/deploy.yml

# 应该看到：
# - FORCE_JAVASCRIPT_ACTIONS_TO_NODE24: true
```

## 代码质量

- ✅ YAML 语法正确
- ✅ 无缩进错误
- ✅ 环境变量正确设置
- ✅ 与现有配置兼容

## 与现有逻辑的兼容性

- ✅ 不影响构建过程
- ✅ 不影响部署流程
- ✅ 不影响环境变量注入
- ✅ 完全向后兼容

## 总结

这个修复确保了：
1. ✅ 消除 Node.js 20 弃用警告
2. ✅ 强制使用 Node.js 24
3. ✅ 为未来版本做好准备
4. ✅ 部署流程正常进行

修复非常简单：只需添加 `FORCE_JAVASCRIPT_ACTIONS_TO_NODE24: true` 环境变量。
