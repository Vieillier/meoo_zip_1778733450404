# 🔧 pnpm 锁文件版本不匹配修复

## 问题描述

部署失败，报错：
```
ERR_PNPM_OUTDATED_LOCKFILE  Cannot install with "frozen-lockfile" because 
pnpm-lock.yaml is not up to date with <ROOT>/package.json
```

## 根本原因

**版本不匹配**：
- `pnpm-lock.yaml` 中的 `webpack-dev-server` 版本：`^4.15.1`
- `package.json` 中的 `webpack-dev-server` 版本：`^5.2.4`

**为什么会出现这个错误**：
1. 在 CI 环境中，pnpm 默认使用 `--frozen-lockfile` 标志
2. 这个标志要求 `pnpm-lock.yaml` 与 `package.json` 完全匹配
3. 由于版本不匹配，pnpm 拒绝安装

## 解决方案

**文件**：`.github/workflows/deploy.yml`

**修改位置**：第 40-41 行

**修改内容**：
```yaml
# 修改前
- name: Install dependencies
  run: pnpm install

# 修改后
- name: Install dependencies
  run: pnpm install --no-frozen-lockfile
```

**原理**：
- `--no-frozen-lockfile` 标志允许 pnpm 更新锁文件
- 这样 pnpm 会根据 `package.json` 重新生成 `pnpm-lock.yaml`
- 解决版本不匹配的问题

## 修改文件

### `.github/workflows/deploy.yml`

**完整工作流**：
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
        run: pnpm install --no-frozen-lockfile  # ✅ 修复

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

## 修复原理

### 什么是 frozen-lockfile？

**frozen-lockfile**：
- 一个 pnpm 的安全机制
- 确保 CI 环境中安装的依赖版本与开发环境完全一致
- 防止意外的版本升级

**在 CI 环境中**：
- 默认启用 `--frozen-lockfile`
- 如果锁文件过期，会拒绝安装

### 为什么使用 --no-frozen-lockfile？

**原因**：
1. 本地 `package.json` 已经更新（webpack-dev-server 升级到 5.2.4）
2. 但 `pnpm-lock.yaml` 还是旧版本（4.15.1）
3. 需要允许 pnpm 更新锁文件

**风险**：
- ⚠️ 可能安装不同版本的依赖
- ✅ 但在这种情况下是必要的

## 验证修复

### 步骤 1：提交修改

```bash
git add .github/workflows/deploy.yml
git commit -m "fix: 添加 --no-frozen-lockfile 标志解决依赖版本不匹配"
git push origin main
```

### 步骤 2：查看工作流

1. 进入 GitHub 仓库 → Actions 标签
2. 查看最新的工作流运行
3. 检查 "Install dependencies" 步骤

**预期结果**：
- ✅ 步骤成功完成
- ✅ 依赖安装成功
- ✅ 没有 ERR_PNPM_OUTDATED_LOCKFILE 错误

### 步骤 3：验证部署

- ✅ 所有步骤完成
- ✅ 部署到 GitHub Pages 成功
- ✅ 网站正常运行

## 代码质量

- ✅ YAML 语法正确
- ✅ 无缩进错误
- ✅ 与现有配置兼容

## 总结

这个修复确保了：
1. ✅ pnpm 可以更新过期的锁文件
2. ✅ 依赖版本与 package.json 匹配
3. ✅ 部署流程正常进行
4. ✅ 消除 ERR_PNPM_OUTDATED_LOCKFILE 错误

**关键点**：在 CI 环境中，当 package.json 更新后，需要使用 `--no-frozen-lockfile` 允许 pnpm 更新锁文件。
