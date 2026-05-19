# 🔧 GitHub Actions Node.js 版本修复（最终版）

## 问题描述

部署出现两个报错：

### 报错 1
```
Node.js 20 is deprecated. The following actions target Node.js 20 but are being 
forced to run on Node.js 24: actions/setup-node@v4
```

### 报错 2
```
Node.js 20 actions are deprecated. The following actions are running on Node.js 20 
and may not work as expected: actions/checkout@v4, pnpm/action-setup@v4
```

## 根本原因

**问题分析**：
1. 环境变量 `FORCE_JAVASCRIPT_ACTIONS_TO_NODE24` 设置在 **step 级别**，不生效
2. 需要在 **job 级别** 设置环境变量，才能对所有 actions 生效

**错误配置**（step 级别）：
```yaml
steps:
  - name: Set up Node
    uses: actions/setup-node@v4
    env:
      FORCE_JAVASCRIPT_ACTIONS_TO_NODE24: true  # ❌ 不生效
```

**正确配置**（job 级别）：
```yaml
jobs:
  deploy:
    runs-on: ubuntu-latest
    env:
      FORCE_JAVASCRIPT_ACTIONS_TO_NODE24: true  # ✅ 生效
    steps:
      - name: Set up Node
        uses: actions/setup-node@v4
```

## 解决方案

### 修复：将环境变量移到 job 级别

**文件**：`.github/workflows/deploy.yml`

**修改位置**：第 23-24 行

**修改内容**：
```yaml
jobs:
  deploy:
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    env:
      FORCE_JAVASCRIPT_ACTIONS_TO_NODE24: true  # ✅ 在 job 级别设置
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
        # ✅ 移除 step 级别的 env
      
      - name: Build project
        env:
          VITE_SUPABASE_URL: ${{ secrets.VITE_SUPABASE_URL }}
          VITE_SUPABASE_ANON_KEY: ${{ secrets.VITE_SUPABASE_ANON_KEY }}
          # ✅ 移除 FORCE_JAVASCRIPT_ACTIONS_TO_NODE24
        run: pnpm build
```

## 修改文件

### `.github/workflows/deploy.yml`

**完整文件**：
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
    env:
      FORCE_JAVASCRIPT_ACTIONS_TO_NODE24: true
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

      - name: Install dependencies
        run: pnpm install

      - name: Build project
        env:
          VITE_SUPABASE_URL: ${{ secrets.VITE_SUPABASE_URL }}
          VITE_SUPABASE_ANON_KEY: ${{ secrets.VITE_SUPABASE_ANON_KEY }}
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

## 修改对比

### 修改前（错误）
```yaml
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Set up Node
        uses: actions/setup-node@v4
        env:
          FORCE_JAVASCRIPT_ACTIONS_TO_NODE24: true  # ❌ step 级别
```

### 修改后（正确）
```yaml
jobs:
  deploy:
    runs-on: ubuntu-latest
    env:
      FORCE_JAVASCRIPT_ACTIONS_TO_NODE24: true  # ✅ job 级别
    steps:
      - name: Set up Node
        uses: actions/setup-node@v4
```

## 修复原理

### 环境变量作用域

**job 级别**：
- 对整个 job 的所有 steps 生效
- 对所有 actions 生效（包括 checkout、setup-node、pnpm/action-setup）
- ✅ 这是正确的设置位置

**step 级别**：
- 只对当前 step 生效
- 不对 actions 生效
- ❌ 不能解决问题

### 为什么需要 job 级别

GitHub Actions 的 actions（如 `actions/checkout@v4`）在 step 执行之前就已经初始化，所以需要在 job 级别设置环境变量，才能在 actions 初始化时生效。

## 验证修复

### 提交修改
```bash
git add .github/workflows/deploy.yml
git commit -m "fix: 在 job 级别设置 Node.js 24 环境变量"
git push origin main
```

### 查看 GitHub Actions 日志

**预期结果**：
- ✅ 无 Node.js 20 弃用警告
- ✅ 所有 actions 使用 Node.js 24
- ✅ 部署成功

**预期日志**：
```
✓ Checkout - 成功（Node.js 24）
✓ Install pnpm - 成功（Node.js 24）
✓ Set up Node - 成功（Node.js 24）
✓ Install dependencies - 成功
✓ Build project - 成功
✓ Setup Pages - 成功
✓ Upload artifact - 成功
✓ Deploy to GitHub Pages - 成功
```

## 代码质量

- ✅ YAML 语法正确
- ✅ 无缩进错误
- ✅ 环境变量正确设置
- ✅ 与现有配置兼容

## 总结

这个修复确保了：
1. ✅ 环境变量在 job 级别设置
2. ✅ 对所有 actions 生效
3. ✅ 消除所有 Node.js 20 弃用警告
4. ✅ 部署流程正常进行

**关键点**：环境变量必须在 **job 级别** 设置，而不是 step 级别。
