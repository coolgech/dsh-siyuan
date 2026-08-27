/**
 * siyuan_read_doc：按文档 ID 或路径读取文档内容（Markdown）。
 */
import { defineTool } from '@deepseek-ai/dsh-tools'
import type { SiYuanClient } from '../client.js'
import { messageOf, normalizeDocPath, toMarkdown, withSySuffix } from '../utils.js'
import { resolveNotebook, type ToolEnv } from './helpers.js'

async function readById(client: SiYuanClient, id: string, signal: AbortSignal) {
  try {
    const md = await client.exportMdContent(id, signal)
    if (md && md.content != null) {
      return {
        id,
        hPath: md.hPath ?? '',
        markdown: md.content,
        source: 'exportMdContent',
      }
    }
  } catch {
    // 某些内核版本 / 节点不支持导出，继续走块级读取兜底
  }
  const block = await client.getBlockKramdown(id, signal)
  return {
    id,
    hPath: '',
    markdown: block.kramdown ?? '',
    source: 'getBlockKramdown',
  }
}

async function resolveDocIdByHPath(client: SiYuanClient, rawPath: string, signal: AbortSignal): Promise<string | null> {
  const base = normalizeDocPath(rawPath).replace(/\.sy$/i, '')
  try {
    const data = await client.getIDsByHPath([base], signal)
    if (!data || typeof data !== 'object') return null
    // 兼容不同内核版本的返回形态：
    //   { hPaths: ["id1", ...] }、{ hPaths: { "/路径": ["id1"] } }、
    //   { "/路径": ["id1"] }、{ hPaths: [{ hPath, id }, ...] }
    const collected: string[] = []
    const collect = (value: unknown): void => {
      if (Array.isArray(value)) {
        for (const item of value) {
          if (typeof item === 'string') {
            collected.push(item)
          } else if (item && typeof item === 'object') {
            const rec = item as Record<string, unknown>
            if (typeof rec.id === 'string') collected.push(rec.id)
            else collect(rec)
          }
        }
      } else if (value && typeof value === 'object') {
        for (const v of Object.values(value)) collect(v)
      }
    }
    collect(data)
    // 优先取符合思源 ID 形态（14 位时间戳-7 位随机字符）的值，避免把 hPath 文本误当 ID
    const id = collected.find((x) => /^\d{14}-[a-z0-9]{7}$/i.test(x)) ?? collected[0] ?? null
    return id
  } catch {
    // 旧版内核可能没有 getIDsByHPath，回退到物理路径方式
    return null
  }
}

async function readByPath(client: SiYuanClient, notebook: string, rawPath: string, signal: AbortSignal) {
  const base = normalizeDocPath(rawPath)
  const byHPath = await resolveDocIdByHPath(client, base, signal)
  if (byHPath) {
    return readById(client, byHPath, signal)
  }

  const candidates = base.toLowerCase().endsWith('.sy') ? [base] : [base, withSySuffix(base)]
  let lastError: unknown = null
  for (const candidate of candidates) {
    try {
      const info = await client.getDocByPath(notebook, candidate, signal)
      const docId = info.id != null ? String(info.id) : ''
      if (docId) {
        const md = await client.exportMdContent(docId, signal)
        return {
          id: docId,
          hPath: md.hPath ?? info.hPath ?? '',
          markdown: md.content ?? '',
          source: 'getDocByPath+exportMdContent',
          path: candidate,
        }
      }
      // 内核未返回 id 时，退回返回原始 content 字段
      return {
        id: '',
        hPath: info.hPath ?? '',
        markdown: toMarkdown(info.content),
        source: 'getDocByPath',
        path: candidate,
      }
    } catch (err) {
      lastError = err
    }
  }
  throw new Error(`无法按路径读取文档「${rawPath}」（笔记本 ${notebook}）：${messageOf(lastError)}`)
}

export function readDocTool(env: ToolEnv) {
  const { client } = env

  return defineTool({
    name: 'siyuan_read_doc',
    description:
      '读取思源笔记中某个文档的 Markdown 内容。支持两种定位方式：' +
      '1) id：文档块 ID（如 SQL 查 blocks.id 得到）；2) path：人类可读路径（如 /笔记本目录/文档名，.sy 后缀可省略）。' +
      '返回 { id, hPath, markdown }。',
    parameters: {
      id: {
        type: 'string',
        description: '文档 ID（blocks.id，type=d 的文档块）',
      },
      path: {
        type: 'string',
        description: '文档路径，例如 /demo/sub/周报 或 /demo/sub/周报.sy',
      },
      notebook: {
        type: 'string',
        description: '笔记本 ID 或名称（用 path 定位时必填；缺省用 defaultNotebook 或第一个打开的笔记本）',
      },
    },
    output: {
      schema: { type: 'json' },
      render: (...rest: unknown[]): Array<{ type: 'text'; text: string }> => {
        // 兼容 dsh 不同版本：render(value) 或 render(args, value)
        const value = rest.length > 1 ? rest[1] : rest[0]
        const v = value as { markdown?: string; hPath?: string; id?: string } | undefined
        if (!v || v.markdown == null) return [{ type: 'text', text: JSON.stringify(value, null, 2) }]
        return [{ type: 'text', text: `文档：${v.hPath ?? v.id ?? ''}\n\n${v.markdown}` }]
      },
    },
    async execute(args: any, exec: { signal: AbortSignal }): Promise<any> {
      const { id, path, notebook } = args as { id?: string; path?: string; notebook?: string }
      if (id && path) throw new Error('siyuan_read_doc 的 id 与 path 只能二选一')
      if (!id && !path) throw new Error('siyuan_read_doc 需要提供 id 或 path')
      if (id) return readById(client, id, exec.signal)
      const notebookId = await resolveNotebook(env, notebook)
      return readByPath(client, notebookId, path!, exec.signal)
    },
  })
}
