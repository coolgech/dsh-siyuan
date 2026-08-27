# dsh-siyuan

DeepSeek Harness（dsh）插件：让 Agent 把[思源笔记](https://github.com/siyuan-note/siyuan)（SiYuan Note）当作个人知识库来使用。

通过思源内核 HTTP API（默认 `http://127.0.0.1:6806`），提供 30+ 个工具，覆盖：

- 笔记本 / 文档 / 块级管理
- 全文搜索、SQL 查询、标签搜索
- 反向链接 / 引用关系
- 资源文件与附件
- 每日笔记、模板、批量导入导出
- 属性 / 自定义元数据

## 特性

- 基于 dsh 官方工具协议：`defineTool()` + `ctx.tools.register()`
- 使用 Node.js 原生 `fetch`，零运行时依赖
- 统一处理思源 `{ code, msg, data }` 信封、HTTP 错误、超时与取消信号
- 通过设置界面配置，**修改后即时生效，无需重启**
- 支持本机 `127.0.0.1` 与局域网思源实例
- 支持笔记本按 ID 或名称解析
- 内置浏览器端设置卡片

## 环境要求

- Node.js `>= 18.17.0`
- DeepSeek Harness（dsh）
- 已适配 [DSH Desktop](https://github.com/anywhere-labs/dsh-desktop)（桌面版）
- 思源笔记，并开启内核 HTTP API
- 建议使用最新稳定版思源

## 兼容性

- ✅ DeepSeek Harness Web
- ✅ [DSH Desktop](https://github.com/anywhere-labs/dsh-desktop)（桌面版）
- ✅ 思源笔记桌面版 / 局域网实例

## 安装

### 方式一：通过 git 安装（推荐）

```bash
dsh plugin --profile web/desktop add https://github.com/coolgech/dsh-siyuan.git
```

### 方式二：通过 npm 安装

```bash
dsh plugin --profile web/desktop add dsh-siyuan
```

### 方式三：本地开发加载

```bash
dsh web --patch D:/path/to/dsh-siyuan/examples/local-dev.cordis.yml
```

## 配置

### 设置界面（推荐）

安装后打开：

> 设置 → 插件 → 插件配置 → 思源笔记

在配置卡片中填写：

| 配置项 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `baseUrl` | string | `http://127.0.0.1:6806` | 思源内核地址 |
| `apiToken` | string | `''` | 思源 API Token（设置 → 关于 → API Token） |
| `defaultNotebook` | string | `''` | 默认笔记本 ID 或名称 |
| `defaultPath` | string | `'/'` | 默认目录路径 |
| `timeoutMs` | number | `15000` | 请求超时（毫秒） |

### 配置文件

```yaml
- id: dsh-siyuan
  name: dsh-siyuan
  config:
    baseUrl: http://127.0.0.1:6806
    apiToken: "你的思源 API Token"
    defaultNotebook: ""
    defaultPath: "/"
    timeoutMs: 15000
```

## 工具列表

### 基础笔记操作

| 工具 | 说明 |
| --- | --- |
| `siyuan_list_notebooks` | 列出笔记本 |
| `siyuan_list_docs` | 列出目录下文档 |
| `siyuan_read_doc` | 读取文档 Markdown |
| `siyuan_create_doc` | 创建文档 |
| `siyuan_append_block` | 追加内容 |
| `siyuan_update_block` | 更新块 |
| `siyuan_query_sql` | 执行只读 SQL |

### 知识库检索与关联

| 工具 | 说明 |
| --- | --- |
| `siyuan_search` | 全文搜索（支持排序/分组/高亮） |
| `siyuan_get_backlinks` | 反向链接 / 提及 |
| `siyuan_list_assets` | 列出资源文件 |
| `siyuan_search_asset_content` | 搜索资源内容 |
| `siyuan_search_tag` | 按标签搜索 |

### 文档整理

| 工具 | 说明 |
| --- | --- |
| `siyuan_delete_doc` | 删除文档 |
| `siyuan_rename_doc` | 重命名文档 |
| `siyuan_move_doc` | 移动文档 |
| `siyuan_batch_export_markdown` | 批量导出 Markdown |
| `siyuan_batch_import_markdown` | 批量导入 Markdown |

### 笔记本管理

| 工具 | 说明 |
| --- | --- |
| `siyuan_create_notebook` | 创建笔记本 |
| `siyuan_rename_notebook` | 重命名笔记本 |
| `siyuan_remove_notebook` | 删除笔记本 |

### 块级操作

| 工具 | 说明 |
| --- | --- |
| `siyuan_get_block_children` | 获取子块 |
| `siyuan_get_block_info` | 获取块信息 |
| `siyuan_insert_block` | 插入块 |
| `siyuan_delete_block` | 删除块 |
| `siyuan_move_block` | 移动块 |
| `siyuan_get_block_attrs` | 获取块属性 |
| `siyuan_set_block_attrs` | 设置块属性/标签 |

### 每日笔记 / 模板 / 文档树

| 工具 | 说明 |
| --- | --- |
| `siyuan_create_daily_note` | 创建/打开今日每日笔记 |
| `siyuan_append_daily_note_block` | 向每日笔记追加内容 |
| `siyuan_list_doc_tree` | 获取文档树 |
| `siyuan_list_templates` | 列出模板文档 |

## 示例

### 搜索知识库

```json
{
  "name": "siyuan_search",
  "arguments": {
    "query": "知识管理",
    "limit": 10,
    "highlight": true
  }
}
```

### 读取文档

```json
{
  "name": "siyuan_read_doc",
  "arguments": {
    "path": "/项目/周报"
  }
}
```

### 批量导入

```json
{
  "name": "siyuan_batch_import_markdown",
  "arguments": {
    "notebook": "我的知识库",
    "docs": [
      { "path": "/项目/周报", "markdown": "# 周报\n\n- 事项一" },
      { "path": "/项目/月报", "markdown": "# 月报\n\n- 事项二" }
    ]
  }
}
```

## 安全说明

- `siyuan_query_sql` 只允许 `SELECT` / `WITH` 开头，但仍建议仅在受信任的本地环境使用。
- 请勿把真实 `apiToken` 提交到 Git。
- 思源内核默认只监听 `127.0.0.1`，请勿把带 Token 的端口暴露到公网。
- 删除/移动/重命名等操作不可逆，请谨慎调用。

## 开发

```bash
npm install
npm run build
npm test
```

## 发布

发布到 GitHub 和插件市场请参考：

- [PUBLISHING.md](./PUBLISHING.md)

## License

[MIT](./LICENSE)
