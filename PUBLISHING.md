# 发布指南

本文档说明如何将 `dsh-siyuan` 发布到 GitHub、npm 和 dsh 插件市场。

> 开始前请把 `package.json` 中的仓库地址、作者等信息替换成你自己的信息。

---

## 1. 发布到 GitHub

### 1.1 创建 GitHub 仓库

在 GitHub 新建仓库，例如：

```text
https://github.com/coolgech/dsh-siyuan
```

### 1.2 推送代码

```bash
cd D:\code\harness\dsh-siyuan

git init
git add .
git commit -m "feat: initial release of dsh-siyuan"
git branch -M main
git remote add origin https://github.com/coolgech/dsh-siyuan.git
git push -u origin main
```

### 1.3 创建 Release

在 GitHub 页面创建 Release：

- Tag：`v0.1.0`
- Title：`v0.1.0`
- 内容：简要描述功能和安装方式

---

## 2. 发布到 npm

### 2.1 登录 npm

```bash
npm login
```

### 2.2 更新 package.json 元数据

确保以下字段已填写：

```json
{
  "name": "dsh-siyuan",
  "version": "0.1.0",
  "description": "DeepSeek Harness plugin for SiYuan Note knowledge base",
  "author": "coolgech",
  "license": "MIT",
  "repository": {
    "type": "git",
    "url": "https://github.com/coolgech/dsh-siyuan.git"
  },
  "homepage": "https://github.com/coolgech/dsh-siyuan",
  "bugs": {
    "url": "https://github.com/coolgech/dsh-siyuan/issues"
  }
}
```

### 2.3 发布

```bash
npm run build
npm test
npm publish --access public
```

发布成功后：

```bash
dsh plugin --profile <profile> add dsh-siyuan
```

---

## 3. 提交到 dsh 插件市场 / 目录

常见插件收录渠道：

### 3.1 GitHub topic

给 GitHub 仓库添加 topic：

```text
dsh-plugin
deepseek-harness
dsh
siyuan
siyuan-note
```

这样 dsh 插件目录会自动抓取。

### 3.2 awesome-dsh-plugins

到以下仓库提交 PR，把你的插件加入列表：

```text
https://github.com/cccakeee/awesome-dsh-plugins
https://github.com/awesome-dsh-plugin/awesome-dsh-plugin
```

PR 中通常需要提供：

- 插件名
- GitHub 仓库地址
- 一句话描述
- 分类（工具 / 知识库 / 笔记）

### 3.3 第三方插件市场

可以提交到常见的 dsh 插件市场，例如：

- DSH Plugin Directory
- dshplugin.dev
- dshbase.com
- dsh-market / dshmarket

提交时一般只需提供 GitHub 仓库地址和 `package.json` 中的 `dsh.bundle` 元数据。

---

## 4. 发布前检查清单

- [ ] `npm run build` 通过
- [ ] `npm test` 通过
- [ ] `README.md` 已更新
- [ ] `PUBLISHING.md` 存在
- [ ] `package.json` 包含 `dsh.bundle.patch`
- [ ] `package.json` 包含 `dsh.client`
- [ ] `cordis.patch.yml` 使用 `insert` 格式
- [ ] 未提交真实 API Token
- [ ] `.gitignore` 忽略 `node_modules/`、`lib/`、`examples/local-dev.cordis.yml`
- [ ] 版本号合理（建议从 `0.1.0` 开始）

---

## 5. 版本更新流程

```bash
# 1. 更新版本号
npm version patch   # 或 minor / major

# 2. 构建测试
npm run build
npm test

# 3. 推送
git push --tags
git push

# 4. 发布 npm
npm publish --access public

# 5. 更新 GitHub Release
```

---

## 6. 常见问题

### Q：npm 包名被别人占用了？

- 改包名，例如 `dsh-siyuan-kb`、`@coolgech/dsh-siyuan`
- 同步修改 `package.json`、`cordis.patch.yml` 中的 `name` 和 `id`

### Q：插件市场不显示设置卡片？

- 确认 `package.json` 中有 `dsh.client`
- 确认 `client/client.js` 存在且 `exports["./client"]` 指向正确
- 确认 dsh 版本支持设置卡片（建议 `>= 0.1.0-rc.7`）
