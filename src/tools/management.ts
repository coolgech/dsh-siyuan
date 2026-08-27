/**
 * 管理类工具：笔记本管理、块级操作、属性/标签。
 */
import { defineTool } from '@deepseek-ai/dsh-tools'
import { toJsonSafe } from '../utils.js'
import { renderResult, resolveNotebook, type ToolEnv } from './helpers.js'

function requireText(value: unknown, label: string): string {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${label} 不能为空`)
  return value.trim()
}

/** siyuan_create_notebook：创建笔记本。 */
export function createNotebookTool(env: ToolEnv) {
  const { client } = env
  return defineTool({
    name: 'siyuan_create_notebook',
    description: '在思源中创建一个新的笔记本（/api/notebook/createNotebook）。',
    parameters: {
      name: { type: 'string', required: true, description: '笔记本名称' },
    },
    output: { schema: { type: 'json' }, render: renderResult },
    async execute(args: any, exec: { signal: AbortSignal }): Promise<any> {
      const name = requireText(args.name, 'name')
      const data = await client.createNotebook(name, exec.signal)
      return { name, result: toJsonSafe(data) }
    },
  })
}

/** siyuan_rename_notebook：重命名笔记本。 */
export function renameNotebookTool(env: ToolEnv) {
  const { client } = env
  return defineTool({
    name: 'siyuan_rename_notebook',
    description: '重命名思源笔记本（/api/notebook/renameNotebook）。',
    parameters: {
      notebook: { type: 'string', required: true, description: '笔记本 ID 或名称' },
      name: { type: 'string', required: true, description: '新笔记本名称' },
    },
    output: { schema: { type: 'json' }, render: renderResult },
    async execute(args: any, exec: { signal: AbortSignal }): Promise<any> {
      const notebookId = await resolveNotebook(env, args.notebook)
      const name = requireText(args.name, 'name')
      const data = await client.renameNotebook(notebookId, name, exec.signal)
      return { notebook: notebookId, name, result: toJsonSafe(data) }
    },
  })
}

/** siyuan_remove_notebook：删除笔记本。 */
export function removeNotebookTool(env: ToolEnv) {
  const { client } = env
  return defineTool({
    name: 'siyuan_remove_notebook',
    description: '删除思源笔记本（/api/notebook/removeNotebook）。注意：会删除笔记本内所有内容。',
    parameters: {
      notebook: { type: 'string', required: true, description: '笔记本 ID 或名称' },
    },
    output: { schema: { type: 'json' }, render: renderResult },
    async execute(args: any, exec: { signal: AbortSignal }): Promise<any> {
      const notebookId = await resolveNotebook(env, args.notebook)
      const data = await client.removeNotebook(notebookId, exec.signal)
      return { notebook: notebookId, removed: true, result: toJsonSafe(data) }
    },
  })
}

/** siyuan_get_block_children：获取块的直接子块。 */
export function getBlockChildrenTool(env: ToolEnv) {
  const { client } = env
  return defineTool({
    name: 'siyuan_get_block_children',
    description: '获取思源笔记中某个文档/容器块/标题块的直接子块（/api/block/getChildBlocks）。',
    parameters: {
      id: { type: 'string', required: true, description: '文档 ID 或块 ID' },
    },
    output: { schema: { type: 'json' }, render: renderResult },
    async execute(args: any, exec: { signal: AbortSignal }): Promise<any> {
      const id = requireText(args.id, 'id')
      const data = await client.getChildBlocks(id, exec.signal)
      return { id, result: toJsonSafe(data) }
    },
  })
}

/** siyuan_insert_block：插入块。 */
export function insertBlockTool(env: ToolEnv) {
  const { client } = env
  return defineTool({
    name: 'siyuan_insert_block',
    description:
      '在思源笔记中插入一个新块（/api/block/insertBlock）。' +
      '需要提供 previousID、nextID 或 parentID 之一来指定插入位置。',
    parameters: {
      markdown: { type: 'string', required: true, description: '要插入的 Markdown 内容' },
      previousID: { type: 'string', description: '插入到该块之后' },
      nextID: { type: 'string', description: '插入到该块之前' },
      parentID: { type: 'string', description: '作为该块的子块插入' },
    },
    output: { schema: { type: 'json' }, render: renderResult },
    async execute(args: any, exec: { signal: AbortSignal }): Promise<any> {
      const markdown = requireText(args.markdown, 'markdown')
      const { previousID, nextID, parentID } = args as { previousID?: string; nextID?: string; parentID?: string }
      if (!previousID && !nextID && !parentID) {
        throw new Error('insertBlock 需要提供 previousID、nextID 或 parentID 之一')
      }
      const data = await client.insertBlock(markdown, { previousID, nextID, parentID }, exec.signal)
      return toJsonSafe({ markdown, previousID, nextID, parentID, result: toJsonSafe(data) })
    },
  })
}

/** siyuan_delete_block：删除块。 */
export function deleteBlockTool(env: ToolEnv) {
  const { client } = env
  return defineTool({
    name: 'siyuan_delete_block',
    description: '删除思源笔记中的某个块（/api/block/deleteBlock）。',
    parameters: {
      id: { type: 'string', required: true, description: '要删除的块 ID' },
    },
    output: { schema: { type: 'json' }, render: renderResult },
    async execute(args: any, exec: { signal: AbortSignal }): Promise<any> {
      const id = requireText(args.id, 'id')
      const data = await client.deleteBlock(id, exec.signal)
      return { id, deleted: true, result: toJsonSafe(data) }
    },
  })
}

/** siyuan_get_block_attrs：获取块属性。 */
export function getBlockAttrsTool(env: ToolEnv) {
  const { client } = env
  return defineTool({
    name: 'siyuan_get_block_attrs',
    description: '获取思源笔记中某个块的属性/自定义属性（/api/attr/getBlockAttrs）。',
    parameters: {
      id: { type: 'string', required: true, description: '块 ID' },
    },
    output: { schema: { type: 'json' }, render: renderResult },
    async execute(args: any, exec: { signal: AbortSignal }): Promise<any> {
      const id = requireText(args.id, 'id')
      const data = await client.getBlockAttrs(id, exec.signal)
      return { id, attrs: toJsonSafe(data) }
    },
  })
}

/** siyuan_set_block_attrs：设置块属性。 */
export function setBlockAttrsTool(env: ToolEnv) {
  const { client } = env
  return defineTool({
    name: 'siyuan_set_block_attrs',
    description: '设置思源笔记中某个块的属性/自定义属性（/api/attr/setBlockAttrs）。attrs 为键值对。',
    parameters: {
      id: { type: 'string', required: true, description: '块 ID' },
      attrs: {
        type: 'json',
        required: true,
        description: '属性对象，例如 {"custom-tag":"AI","status":"done"}',
      },
    },
    output: { schema: { type: 'json' }, render: renderResult },
    async execute(args: any, exec: { signal: AbortSignal }): Promise<any> {
      const id = requireText(args.id, 'id')
      const attrs = args.attrs
      if (!attrs || typeof attrs !== 'object' || Array.isArray(attrs)) throw new Error('attrs 必须是对象')
      const data = await client.setBlockAttrs(id, attrs as Record<string, string>, exec.signal)
      return { id, attrs, result: toJsonSafe(data) }
    },
  })
}

/** siyuan_get_block_info：获取块信息。 */
export function getBlockInfoTool(env: ToolEnv) {
  const { client } = env
  return defineTool({
    name: 'siyuan_get_block_info',
    description: '获取思源笔记中某个块的详细信息（/api/block/getBlockInfo）。',
    parameters: {
      id: { type: 'string', required: true, description: '块 ID' },
    },
    output: { schema: { type: 'json' }, render: renderResult },
    async execute(args: any, exec: { signal: AbortSignal }): Promise<any> {
      const id = requireText(args.id, 'id')
      const data = await client.getBlockInfo(id, exec.signal)
      return { id, info: toJsonSafe(data) }
    },
  })
}

/** siyuan_move_block：移动块。 */
export function moveBlockTool(env: ToolEnv) {
  const { client } = env
  return defineTool({
    name: 'siyuan_move_block',
    description:
      '移动思源笔记中的块到新位置（/api/block/moveBlock）。' +
      '需要提供 previousID、nextID 或 parentID 之一。',
    parameters: {
      id: { type: 'string', required: true, description: '要移动的块 ID' },
      previousID: { type: 'string', description: '移动到该块之后' },
      nextID: { type: 'string', description: '移动到该块之前' },
      parentID: { type: 'string', description: '移动到该父块下' },
    },
    output: { schema: { type: 'json' }, render: renderResult },
    async execute(args: any, exec: { signal: AbortSignal }): Promise<any> {
      const id = requireText(args.id, 'id')
      const { previousID, nextID, parentID } = args as { previousID?: string; nextID?: string; parentID?: string }
      if (!previousID && !nextID && !parentID) {
        throw new Error('moveBlock 需要提供 previousID、nextID 或 parentID 之一')
      }
      const data = await client.moveBlock(id, { previousID, nextID, parentID }, exec.signal)
      return toJsonSafe({ id, previousID, nextID, parentID, result: toJsonSafe(data) })
    },
  })
}

/** siyuan_search_tag：按标签搜索块。 */
export function searchTagTool(env: ToolEnv) {
  const { client } = env
  return defineTool({
    name: 'siyuan_search_tag',
    description: '按标签搜索思源笔记中的块（通过 SQL 查询 tag 字段）。',
    parameters: {
      tag: { type: 'string', required: true, description: '标签关键词，例如 AI' },
      limit: { type: 'number', description: '返回条数上限（默认 50，最大 500）' },
    },
    output: { schema: { type: 'json' }, render: renderResult },
    async execute(args: any, exec: { signal: AbortSignal }): Promise<any> {
      const tag = requireText(args.tag, 'tag')
      const limit = Math.min(500, Math.max(1, Math.floor(args.limit ?? 50)))
      const escaped = tag.replace(/'/g, "''")
      const rows = await client.querySql(
        `SELECT id, type, content, hPath, tag, markdown FROM blocks WHERE tag LIKE '%${escaped}%' ORDER BY updated DESC LIMIT ${limit}`,
        exec.signal,
      )
      return { tag, count: rows.length, blocks: toJsonSafe(rows) }
    },
  })
}
