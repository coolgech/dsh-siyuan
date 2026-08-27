/**
 * 每日笔记与文档树工具。
 */
import { defineTool } from '@deepseek-ai/dsh-tools'
import { toJsonSafe } from '../utils.js'
import { renderResult, resolveNotebook, type ToolEnv } from './helpers.js'

function requireText(value: unknown, label: string): string {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${label} 不能为空`)
  return value.trim()
}

/** siyuan_create_daily_note：创建或打开今日每日笔记。 */
export function createDailyNoteTool(env: ToolEnv) {
  const { client } = env
  return defineTool({
    name: 'siyuan_create_daily_note',
    description: '创建或打开指定笔记本的今日每日笔记（/api/filetree/createDailyNote）。',
    parameters: {
      notebook: { type: 'string', description: '笔记本 ID 或名称；缺省用 defaultNotebook 或第一个打开的笔记本' },
    },
    output: { schema: { type: 'json' }, render: renderResult },
    async execute(args: any, exec: { signal: AbortSignal }): Promise<any> {
      const notebookId = await resolveNotebook(env, args.notebook)
      const data = await client.createDailyNote(notebookId, exec.signal)
      return { notebook: notebookId, result: toJsonSafe(data) }
    },
  })
}

/** siyuan_append_daily_note_block：向每日笔记追加内容。 */
export function appendDailyNoteBlockTool(env: ToolEnv) {
  const { client } = env
  return defineTool({
    name: 'siyuan_append_daily_note_block',
    description: '向指定笔记本的今日每日笔记追加内容（/api/block/appendDailyNoteBlock）。',
    parameters: {
      notebook: { type: 'string', description: '笔记本 ID 或名称；缺省用 defaultNotebook 或第一个打开的笔记本' },
      markdown: { type: 'string', required: true, description: '要追加的 Markdown 内容' },
    },
    output: { schema: { type: 'json' }, render: renderResult },
    async execute(args: any, exec: { signal: AbortSignal }): Promise<any> {
      const notebookId = await resolveNotebook(env, args.notebook)
      const markdown = requireText(args.markdown, 'markdown')
      const data = await client.appendDailyNoteBlock(notebookId, markdown, 'markdown', exec.signal)
      return { notebook: notebookId, markdown, result: toJsonSafe(data) }
    },
  })
}

/** siyuan_list_doc_tree：获取笔记本/目录下的文档树。 */
export function listDocTreeTool(env: ToolEnv) {
  const { client } = env
  return defineTool({
    name: 'siyuan_list_doc_tree',
    description: '获取思源笔记本或目录下的完整文档树（/api/filetree/listDocTree）。',
    parameters: {
      notebook: { type: 'string', description: '笔记本 ID 或名称；缺省用 defaultNotebook 或第一个打开的笔记本' },
      path: { type: 'string', description: '起始路径，默认 /' },
    },
    output: { schema: { type: 'json' }, render: renderResult },
    async execute(args: any, exec: { signal: AbortSignal }): Promise<any> {
      const notebookId = await resolveNotebook(env, args.notebook)
      const path = typeof args.path === 'string' && args.path.trim() ? args.path.trim() : '/'
      const data = await client.listDocTree(notebookId, path, exec.signal)
      return { notebook: notebookId, path, tree: toJsonSafe(data) }
    },
  })
}
