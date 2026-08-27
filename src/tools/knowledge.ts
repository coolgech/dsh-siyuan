/**
 * 知识库增强工具：全文搜索、反向链接、文档管理、资源文件。
 */
import { defineTool } from '@deepseek-ai/dsh-tools'
import { clampLimit, toJsonSafe } from '../utils.js'
import { renderResult, resolveNotebook, type ToolEnv } from './helpers.js'

function requireText(value: unknown, label: string): string {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${label} 不能为空`)
  return value.trim()
}

/** siyuan_search：全文搜索块内容。 */
export function searchTool(env: ToolEnv) {
  const { client } = env
  return defineTool({
    name: 'siyuan_search',
    description:
      '在思源笔记中全文搜索块内容（/api/search/fullTextSearchBlock）。' +
      'query 为关键词；method 0=关键词、1=查询语法、2=SQL、3=正则；path 可限定目录；' +
      'sort/group 可控制排序和分组。',
    parameters: {
      query: { type: 'string', required: true, description: '搜索关键词或表达式' },
      method: { type: 'number', description: '搜索方式：0 关键词（默认）、1 查询语法、2 SQL、3 正则' },
      path: { type: 'string', description: '限定目录路径，默认 /' },
      document: { type: 'string', description: '限定文档 ID' },
      limit: { type: 'number', description: '返回条数上限（默认 20，最大 100）' },
      highlight: { type: 'boolean', description: '是否返回高亮内容（默认 true）' },
      sort: { type: 'number', description: '排序方式（0=默认，1=按更新时间等，具体以思源版本为准）' },
      group: { type: 'number', description: '分组方式（0=不分组，1=按文档分组等，具体以思源版本为准）' },
    },
    output: { schema: { type: 'json' }, render: renderResult },
    async execute(args: any, exec: { signal: AbortSignal }): Promise<any> {
      const { query, method, path, document, limit, highlight, sort, group } = args as {
        query?: string; method?: number; path?: string; document?: string; limit?: number; highlight?: boolean; sort?: number; group?: number
      }
      const q = requireText(query, 'query')
      const cap = Math.min(100, Math.max(1, Math.floor(limit ?? 20)))
      const data = await client.fullTextSearchBlock({
        query: q,
        method: method ?? 0,
        path: path || '/',
        document: document ?? '',
        sort: sort ?? 0,
        group: group ?? 0,
        limit: cap,
        highlight: highlight ?? true,
      }, exec.signal)
      return toJsonSafe({ query: q, limit: cap, result: toJsonSafe(data) })
    },
  })
}

/** siyuan_get_backlinks：获取指定块/文档的反向链接与提及。 */
export function getBacklinksTool(env: ToolEnv) {
  const { client } = env
  return defineTool({
    name: 'siyuan_get_backlinks',
    description:
      '获取思源笔记中指定文档/块的反向链接与提及（/api/ref/getBacklink2）。' +
      'id 可以是文档 ID 或块 ID，返回引用它的文档/块信息。',
    parameters: {
      id: { type: 'string', required: true, description: '文档 ID 或块 ID' },
    },
    output: { schema: { type: 'json' }, render: renderResult },
    async execute(args: any, exec: { signal: AbortSignal }): Promise<any> {
      const { id } = args as { id?: string }
      const blockId = requireText(id, 'id')
      const data = await client.getBacklink2(blockId, exec.signal)
      return { id: blockId, result: toJsonSafe(data) }
    },
  })
}

/** siyuan_delete_doc：删除文档。 */
export function deleteDocTool(env: ToolEnv) {
  const { client } = env
  return defineTool({
    name: 'siyuan_delete_doc',
    description:
      '删除思源笔记中的文档（/api/filetree/removeDoc）。' +
      'path 为物理路径，例如 /20251016172044-tcaiz16.sy；可通过 siyuan_list_docs 获取。',
    parameters: {
      notebook: { type: 'string', description: '笔记本 ID 或名称；缺省用 defaultNotebook 或第一个打开的笔记本' },
      path: { type: 'string', required: true, description: '要删除的文档物理路径（含 .sy）' },
    },
    output: { schema: { type: 'json' }, render: renderResult },
    async execute(args: any, exec: { signal: AbortSignal }): Promise<any> {
      const { notebook, path } = args as { notebook?: string; path?: string }
      const notebookId = await resolveNotebook(env, notebook)
      const docPath = requireText(path, 'path')
      const data = await client.removeDoc(notebookId, docPath, exec.signal)
      return { notebook: notebookId, path: docPath, deleted: true, result: toJsonSafe(data) }
    },
  })
}

/** siyuan_rename_doc：重命名文档。 */
export function renameDocTool(env: ToolEnv) {
  const { client } = env
  return defineTool({
    name: 'siyuan_rename_doc',
    description:
      '重命名思源笔记中的文档。优先按 id 调用 renameDocByID，否则按 path+docName 调用 renameDoc。' +
      'path 为物理路径（含 .sy）或人类可读路径，docName 为新文档名（不含 .sy）。',
    parameters: {
      id: { type: 'string', description: '文档 ID（推荐，最可靠）' },
      notebook: { type: 'string', description: '笔记本 ID 或名称；缺省用 defaultNotebook 或第一个打开的笔记本' },
      path: { type: 'string', description: '原文档路径（物理路径含 .sy，或人类可读路径）' },
      docName: { type: 'string', required: true, description: '新文档名（不含 .sy）' },
    },
    output: { schema: { type: 'json' }, render: renderResult },
    async execute(args: any, exec: { signal: AbortSignal }): Promise<any> {
      const { id, notebook, path, docName } = args as { id?: string; notebook?: string; path?: string; docName?: string }
      const newName = requireText(docName, 'docName')
      if (id) {
        const data = await client.renameDocByID(id.trim(), newName, exec.signal)
        return { id: id.trim(), docName: newName, result: toJsonSafe(data) }
      }
      const notebookId = await resolveNotebook(env, notebook)
      const docPath = requireText(path, 'path')
      const data = await client.renameDoc(notebookId, docPath, newName, exec.signal)
      return { notebook: notebookId, path: docPath, docName: newName, result: toJsonSafe(data) }
    },
  })
}

/** siyuan_move_doc：移动一个或多个文档到目标目录。 */
export function moveDocTool(env: ToolEnv) {
  const { client } = env
  return defineTool({
    name: 'siyuan_move_doc',
    description:
      '移动思源笔记中的文档。优先按 ids+toID 调用 moveDocsByID；否则按 fromPaths+toPath 调用 moveDocs。' +
      'fromPaths 为人类可读或物理路径数组，toPath 为目标目录路径。',
    parameters: {
      ids: {
        type: 'array',
        items: { type: 'string' },
        description: '要移动的文档 ID 数组（推荐）',
      },
      toID: { type: 'string', description: '目标文档/目录 ID（与 ids 搭配使用）' },
      notebook: { type: 'string', description: '目标笔记本 ID 或名称；缺省用 defaultNotebook 或第一个打开的笔记本' },
      fromPaths: {
        type: 'array',
        items: { type: 'string' },
        description: '要移动的文档路径数组',
      },
      toPath: { type: 'string', description: '目标目录路径，例如 /归档' },
    },
    output: { schema: { type: 'json' }, render: renderResult },
    async execute(args: any, exec: { signal: AbortSignal }): Promise<any> {
      const { ids, toID, notebook, fromPaths, toPath } = args as {
        ids?: string[]; toID?: string; notebook?: string; fromPaths?: string[]; toPath?: string
      }
      if (Array.isArray(ids) && ids.length > 0) {
        const targetId = requireText(toID, 'toID')
        const data = await client.moveDocsByID(ids.map((id) => String(id)), targetId, exec.signal)
        return { ids, toID: targetId, result: toJsonSafe(data) }
      }
      const notebookId = await resolveNotebook(env, notebook)
      if (!Array.isArray(fromPaths) || fromPaths.length === 0) throw new Error('fromPaths 不能为空')
      const target = requireText(toPath, 'toPath')
      const data = await client.moveDocs(notebookId, fromPaths.map((p) => String(p)), target, exec.signal)
      return { notebook: notebookId, fromPaths, toPath: target, result: toJsonSafe(data) }
    },
  })
}

/** siyuan_list_assets：列出思源资源文件（通过 SQL assets 表）。 */
export function listAssetsTool(env: ToolEnv) {
  const { client } = env
  return defineTool({
    name: 'siyuan_list_assets',
    description:
      '列出思源笔记中的资源文件（图片、PDF、附件等），通过 SQL assets 表查询。',
    parameters: {
      limit: { type: 'number', description: '返回条数上限（默认 50，最大 500）' },
    },
    output: { schema: { type: 'json' }, render: renderResult },
    async execute(args: any, exec: { signal: AbortSignal }): Promise<any> {
      const { limit } = args as { limit?: number }
      const cap = clampLimit(limit)
      const rows = await client.querySql(`SELECT * FROM assets ORDER BY updated DESC LIMIT ${cap}`, exec.signal)
      return { count: rows.length, assets: toJsonSafe(rows) }
    },
  })
}

/** siyuan_search_asset_content：全文搜索资源文件内容。 */
export function searchAssetContentTool(env: ToolEnv) {
  const { client } = env
  return defineTool({
    name: 'siyuan_search_asset_content',
    description:
      '搜索思源笔记资源文件（PDF/图片等已索引内容，/api/search/fullTextSearchAssetContent）。',
    parameters: {
      query: { type: 'string', required: true, description: '搜索关键词' },
      limit: { type: 'number', description: '返回条数上限（默认 20，最大 100）' },
    },
    output: { schema: { type: 'json' }, render: renderResult },
    async execute(args: any, exec: { signal: AbortSignal }): Promise<any> {
      const { query, limit } = args as { query?: string; limit?: number }
      const q = requireText(query, 'query')
      const cap = Math.min(100, Math.max(1, Math.floor(limit ?? 20)))
      const data = await client.fullTextSearchAssetContent({ query: q, limit: cap, highlight: true }, exec.signal)
      return { query: q, limit: cap, result: toJsonSafe(data) }
    },
  })
}
