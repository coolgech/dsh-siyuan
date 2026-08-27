/**
 * 列举工具：列出笔记本、列出目录下的文档。
 */
import { defineTool } from '@deepseek-ai/dsh-tools'
import { normalizeDocPath } from '../utils.js'
import { renderResult, resolveNotebook, type ToolEnv } from './helpers.js'

/**
 * siyuan_list_notebooks：列出思源中所有笔记本（含已关闭）。
 */
export function listNotebooksTool(env: ToolEnv) {
  const { client } = env

  return defineTool({
    name: 'siyuan_list_notebooks',
    description:
      '列出思源笔记中的所有笔记本，返回 id、名称、图标、排序和是否关闭。' +
      '在不知道笔记本 ID/名称时，先调用本工具。',
    parameters: {},
    output: {
      schema: { type: 'json' },
      render: renderResult,
    },
    async execute(_args: any, exec: { signal: AbortSignal }): Promise<any> {
      const notebooks = await client.lsNotebooks(exec.signal)
      return {
        count: notebooks.length,
        notebooks: notebooks.map((n) => ({
          id: n.id,
          name: n.name,
          icon: n.icon ?? '',
          closed: n.closed,
        })),
      }
    },
  })
}

/**
 * siyuan_list_docs：列出指定笔记本/路径下的文档。
 */
export function listDocsTool(env: ToolEnv) {
  const { client } = env

  return defineTool({
    name: 'siyuan_list_docs',
    description:
      '列出思源笔记中某个目录/路径下的文档（不含递归展开全部子文档）。' +
      'path 默认使用配置 defaultPath（"/" 表示笔记本根目录）。' +
      '返回每个文档的 id、box（笔记本 ID）、path（物理路径）、hPath（人类可读路径）、名称和子文档数。',
    parameters: {
      notebook: {
        type: 'string',
        description: '笔记本 ID 或名称；缺省用 defaultNotebook 或第一个打开的笔记本',
      },
      path: {
        type: 'string',
        description: '要列出的目录路径，例如 /项目 或 /项目/子目录；默认 defaultPath',
      },
    },
    output: {
      schema: { type: 'json' },
      render: renderResult,
    },
    async execute(args: any, exec: { signal: AbortSignal }): Promise<any> {
      const { notebook, path } = args as { notebook?: string; path?: string }
      const notebookId = await resolveNotebook(env, notebook)
      const targetPath = normalizeDocPath(path || env.config.defaultPath || '/')
      const docs = await client.listDocsByPath(notebookId, targetPath, exec.signal)
      return {
        notebook: notebookId,
        path: targetPath,
        count: docs.length,
        docs: docs.map((d) => ({
          id: d.id ?? '',
          box: d.box ?? '',
          path: d.path ?? '',
          hPath: d.hPath ?? '',
          name: d.name ?? '',
          subFileCount: d.subFileCount ?? 0,
        })),
      }
    },
  })
}
