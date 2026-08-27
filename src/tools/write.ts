/**
 * 写操作工具：创建文档、追加块、更新块。
 */
import { defineTool } from '@deepseek-ai/dsh-tools'
import { normalizeDocPath } from '../utils.js'
import { renderResult, resolveNotebook, type ToolEnv } from './helpers.js'

function requireText(value: unknown, label: string): string {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`${label} 不能为空`)
  }
  return value.trim()
}

/**
 * siyuan_create_doc：在指定笔记本/路径下创建 Markdown 文档。
 *
 * path 支持两种写法：
 * - 人类可读路径：/目录/文档标题（推荐，例如 /项目/周报）
 * - 思源物理路径：/20210808180117-6v0mkxr/20210902210113-0avi12f.sy
 * 如果是人类可读路径，插件会尝试交给内核的 createDocWithMd 处理；若你的内核版本
 * 要求物理路径，可先使用 siyuan_query_sql 查询 blocks.id/hPath 取得物理路径。
 */
export function createDocTool(env: ToolEnv) {
  const { client } = env

  return defineTool({
    name: 'siyuan_create_doc',
    description:
      '在思源笔记中创建（或覆盖）一个 Markdown 文档。' +
      '参数 path 为目标文档路径（如 /项目/周报，.sy 可省略）；markdown 为文档内容；' +
      'force=true 时若已存在则覆盖，否则创建新文档（具体行为取决于内核版本）。' +
      'notebook 可传笔记本 ID 或名称，缺省使用 defaultNotebook 或第一个打开的笔记本。',
    parameters: {
      path: {
        type: 'string',
        required: true,
        description: '目标文档路径，例如 /项目/周报 或 /项目/周报.sy',
      },
      markdown: {
        type: 'string',
        required: true,
        description: '要写入的 Markdown 内容',
      },
      notebook: {
        type: 'string',
        description: '笔记本 ID 或名称；缺省用 defaultNotebook 或第一个打开的笔记本',
      },
      force: {
        type: 'boolean',
        description: '是否强制创建/覆盖（默认 false）',
      },
    },
    output: {
      schema: { type: 'json' },
      render: renderResult,
    },
    async execute(args: any, exec: { signal: AbortSignal }): Promise<any> {
      const { path, markdown, notebook, force } = args as {
        path?: string
        markdown?: string
        notebook?: string
        force?: boolean
      }
      const targetPath = normalizeDocPath(requireText(path, 'path'))
      const content = requireText(markdown, 'markdown')
      const notebookId = await resolveNotebook(env, notebook)
      const result = await client.createDocWithMd(notebookId, targetPath, content, Boolean(force), exec.signal)
      return {
        notebook: notebookId,
        path: targetPath,
        created: true,
        result,
      }
    },
  })
}

/**
 * siyuan_append_block：向指定文档或块追加 Markdown 内容。
 */
export function appendBlockTool(env: ToolEnv) {
  const { client } = env

  return defineTool({
    name: 'siyuan_append_block',
    description:
      '向思源笔记的某个文档块或内容块追加 Markdown 内容。' +
      'id 可以是文档 ID（blocks.type=\'d\'）或任意块 ID；' +
      'appendType 为 block 时追加为同级块，children 时追加为子块。' +
      '返回内核原始响应（通常包含新增块的 id）。',
    parameters: {
      id: {
        type: 'string',
        required: true,
        description: '目标块 ID 或文档 ID',
      },
      markdown: {
        type: 'string',
        required: true,
        description: '要追加的 Markdown 内容',
      },
      appendType: {
        type: 'string',
        description: '追加方式：block（同级，默认）或 children（子块）',
      },
    },
    output: {
      schema: { type: 'json' },
      render: renderResult,
    },
    async execute(args: any, exec: { signal: AbortSignal }): Promise<any> {
      const { id, markdown, appendType } = args as {
        id?: string
        markdown?: string
        appendType?: 'block' | 'children'
      }
      const targetId = requireText(id, 'id')
      const content = requireText(markdown, 'markdown')
      const type = appendType === 'children' ? 'children' : 'block'
      const result = await client.appendBlock(content, targetId, type, exec.signal)
      return { id: targetId, appendType: type, result }
    },
  })
}

/**
 * siyuan_update_block：按块 ID 更新块内容。
 */
export function updateBlockTool(env: ToolEnv) {
  const { client } = env

  return defineTool({
    name: 'siyuan_update_block',
    description:
      '更新思源笔记中某个块的内容（按块 ID）。' +
      'id 通常是 blocks.id（SQL 可查），markdown 为新的块内容。' +
      '适合修改某个段落、标题、列表项或文档块。',
    parameters: {
      id: {
        type: 'string',
        required: true,
        description: '要更新的块 ID',
      },
      markdown: {
        type: 'string',
        required: true,
        description: '新的 Markdown 内容',
      },
    },
    output: {
      schema: { type: 'json' },
      render: renderResult,
    },
    async execute(args: any, exec: { signal: AbortSignal }): Promise<any> {
      const { id, markdown } = args as { id?: string; markdown?: string }
      const targetId = requireText(id, 'id')
      const content = requireText(markdown, 'markdown')
      const result = await client.updateBlock(content, targetId, exec.signal)
      return { id: targetId, updated: true, result }
    },
  })
}

