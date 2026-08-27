# Changelog

## [0.2.0] - 2026-08-27

### 新增

- 知识库增强工具：
  - `siyuan_search`：全文搜索，支持高亮、排序、分组
  - `siyuan_get_backlinks`：反向链接/提及
  - `siyuan_list_assets`：列出资源文件
  - `siyuan_search_asset_content`：搜索资源文件内容
  - `siyuan_search_tag`：按标签搜索

- 文档管理工具：
  - `siyuan_delete_doc`
  - `siyuan_rename_doc`
  - `siyuan_move_doc`
  - `siyuan_batch_export_markdown`
  - `siyuan_batch_import_markdown`

- 笔记本管理工具：
  - `siyuan_create_notebook`
  - `siyuan_rename_notebook`
  - `siyuan_remove_notebook`

- 块级操作工具：
  - `siyuan_get_block_children`
  - `siyuan_get_block_info`
  - `siyuan_insert_block`
  - `siyuan_delete_block`
  - `siyuan_move_block`
  - `siyuan_get_block_attrs`
  - `siyuan_set_block_attrs`

- 每日笔记 / 文档树 / 模板：
  - `siyuan_create_daily_note`
  - `siyuan_append_daily_note_block`
  - `siyuan_list_doc_tree`
  - `siyuan_list_templates`

### 优化

- 设置界面配置修改后即时生效，无需重启
- 支持本机 `127.0.0.1` 与局域网思源实例
- 新增浏览器端设置卡片，标题为“思源笔记”
- 完善 README 与发布文档
- 适配 DSH Desktop

### 修复

- 修复 `siyuan_list_notebooks` 返回结构解析
- 修复 `siyuan_list_docs` 返回结构解析
- 修复 `siyuan_append_block` 参数 `parentID`
- 修复 `siyuan_rename_doc` 使用 `renameDocByID`
- 修复 `siyuan_move_doc` 使用 `fromIDs`
- 修复工具输出中的 `undefined` 字段导致 JSON 校验失败

## [0.1.0] - 2026-08-26

### 新增

- 初始版本
- 基础笔记操作工具：
  - `siyuan_list_notebooks`
  - `siyuan_list_docs`
  - `siyuan_read_doc`
  - `siyuan_create_doc`
  - `siyuan_append_block`
  - `siyuan_update_block`
  - `siyuan_query_sql`
