/**
 * 批量导入/导出、模板管理工具。
 */
import { defineTool } from '@deepseek-ai/dsh-tools'
import { clampLimit, toJsonSafe } from '../utils.js'
import { renderResult, resolveNotebook, type ToolEnv } from './helpers.js'

function requireText(value: unknown, label: string): string {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${label} 不能为空`)
  return value.trim()
}

/** siyuan_batch_export_markdown：批量导出文档为 Markdown。 */
export function batchExportMarkdownTool(env: ToolEnv) {
  const { client } = env
  return defineTool({
    name: 'siyuan_batch_export_markdown',
    description:
      '批量导出思源文档为 Markdown。可按 ids 指定文档，也可按 notebook+path 列出目录后批量导出。',
    parameters: {
      notebook: { type: 'string', description: '笔记本 ID 或名称；缺省用 defaultNotebook 或第一个打开的笔记本' },
      path: { type: 'string', description: '目录路径（配合 notebook 使用），默认 /' },
      ids: {
        type: 'array',
        items: { type: 'string' },
        description: '要导出的文档 ID 数组（优先于 notebook+path）',
      },
      limit: { type: 'number', description: '最大导出数量（默认 50，最大 200）' },
    },
    output: { schema: { type: 'json' }, render: renderResult },
    async execute(args: any, exec: { signal: AbortSignal }): Promise<any> {
      const { notebook, path, ids, limit } = args as { notebook?: string; path?: string; ids?: string[]; limit?: number }
      const cap = Math.min(200, Math.max(1, Math.floor(limit ?? 50)))

      let docIds: string[] = []
      if (Array.isArray(ids) && ids.length > 0) {
        docIds = ids.slice(0, cap).map((id) => String(id))
      } else {
        const notebookId = await resolveNotebook(env, notebook)
        const targetPath = typeof path === 'string' && path.trim() ? path.trim() : '/'
        const docs = await client.listDocsByPath(notebookId, targetPath, exec.signal)
        docIds = docs.slice(0, cap).map((d) => d.id).filter((id): id is string => Boolean(id))
      }

      const exported: Array<{ id: string; hPath: string; markdown: string }> = []
      for (const id of docIds) {
        const md = await client.exportMdContent(id, exec.signal)
        exported.push({ id, hPath: md.hPath ?? '', markdown: md.content ?? '' })
      }
      return { count: exported.length, docs: toJsonSafe(exported) }
    },
  })
}

/** siyuan_batch_import_markdown：批量导入 Markdown 文档。 */
export function batchImportMarkdownTool(env: ToolEnv) {
  const { client } = env
  return defineTool({
    name: 'siyuan_batch_import_markdown',
    description: '批量在指定笔记本中创建 Markdown 文档。docs 为 [{ path, markdown }] 数组。',
    parameters: {
      notebook: { type: 'string', description: '笔记本 ID 或名称；缺省用 defaultNotebook 或第一个打开的笔记本' },
      docs: {
        type: 'json',
        required: true,
        description: '文档数组，例如 [{"path":"/项目/周报","markdown":"# 周报"}]',
      },
      force: { type: 'boolean', description: '是否覆盖已存在文档（默认 false）' },
    },
    output: { schema: { type: 'json' }, render: renderResult },
    async execute(args: any, exec: { signal: AbortSignal }): Promise<any> {
      const { notebook, docs, force } = args as { notebook?: string; docs?: unknown; force?: boolean }
      if (!Array.isArray(docs) || docs.length === 0) throw new Error('docs 必须是非空数组')
      const notebookId = await resolveNotebook(env, notebook)
      const results: Array<{ path: string; ok: boolean; error?: string }> = []
      for (const item of docs) {
        const doc = item as { path?: string; markdown?: string }
        const path = requireText(doc.path, 'docs[].path')
        const markdown = requireText(doc.markdown, 'docs[].markdown')
        try {
          await client.createDocWithMd(notebookId, path, markdown, Boolean(force), exec.signal)
          results.push({ path, ok: true })
        } catch (err) {
          results.push({ path, ok: false, error: err instanceof Error ? err.message : String(err) })
        }
      }
      return toJsonSafe({ notebook: notebookId, count: results.length, results })
    },
  })
}

/** siyuan_list_templates：列出模板文档。 */
export function listTemplatesTool(env: ToolEnv) {
  const { client } = env
  return defineTool({
    name: 'siyuan_list_templates',
    description: '列出思源笔记中的模板文档（按路径/标题包含“模板”或“template”检索）。',
    parameters: {
      limit: { type: 'number', description: '返回条数上限（默认 50，最大 500）' },
    },
    output: { schema: { type: 'json' }, render: renderResult },
    async execute(args: any, exec: { signal: AbortSignal }): Promise<any> {
      const limit = clampLimit(args.limit)
      const rows = await client.querySql(
        `SELECT id, hPath, content FROM blocks WHERE type = 'd' AND (hPath LIKE '%模板%' OR hPath LIKE '%template%') ORDER BY updated DESC LIMIT ${limit}`,
        exec.signal,
      )
      return { count: rows.length, templates: toJsonSafe(rows) }
    },
  })
}
