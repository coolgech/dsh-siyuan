/**
 * 工具共享的辅助逻辑：环境（客户端 + 配置）与笔记本解析。
 */
import type { SiYuanClient } from '../client.js'
import type { Config } from '../config.js'
import { toMarkdown } from '../utils.js'

/** 每个工具执行时都能拿到的环境。 */
export interface ToolEnv {
  client: SiYuanClient
  config: Config
}

/** 思源 ID 形态：14 位时间戳 + 7 位随机字符，如 20210808180117-6v0mkxr。 */
const SIYUAN_ID_RE = /^\d{14}-[a-z0-9]{7}$/i

/**
 * output.render 的兼容封装。dsh-tools 不同版本对 render 的调用约定不一致：
 * 旧版 render(value)，新版 render(args, value)。统一取“值”参数，避免把工具入参误当结果渲染。
 */
export type TextContentBlock = { type: 'text'; text: string }

export function renderResult(...rest: unknown[]): TextContentBlock[] {
  const value = rest.length > 1 ? rest[1] : rest[0]
  return [{ type: 'text', text: toMarkdown(value) }]
}

/**
 * 解析笔记本 ID：
 * 1. 工具显式传入的 notebook 参数（优先）；
 * 2. 插件配置 defaultNotebook（支持按 ID 或名称匹配）；
 * 3. 仍无法确定时，抛出带可用笔记本列表的错误提示。
 */
export async function resolveNotebook(env: ToolEnv, notebook?: string): Promise<string> {
  const explicit = notebook?.trim()
  if (explicit) {
    const all = await env.client.lsNotebooks()
    const byId = all.find((n) => n.id === explicit)
    if (byId) return byId.id
    const byName = all.find((n) => n.name === explicit)
    if (byName) return byName.id
    
    // 形如思源 ID 的显式值按 ID 原样透传（例如内核暂未列出但确实存在的笔记本）；
    // 否则按名称也匹配不到，直接报错并给出可用列表，避免把无法识别的值传给内核
    if (SIYUAN_ID_RE.test(explicit)) return explicit
    throw new Error(
      `notebook「${explicit}」未匹配到任何笔记本（按 ID 或名称）。可用笔记本：${
        all.filter((n) => !n.closed).map((n) => `${n.name}（${n.id}）`).join('、') || '（无）'
      }。请检查工具参数 notebook，或修正插件配置 defaultNotebook。`,
    )
  }

  const notebooks = await env.client.lsNotebooks()
  const cfg = (env.config.defaultNotebook ?? '').trim()
  const open = notebooks.filter((n) => !n.closed)

  if (cfg) {
    const byId = notebooks.find((n) => n.id === cfg)
    if (byId) return byId.id
    const byName = notebooks.find((n) => n.name === cfg)
    if (byName) return byName.id
    throw new Error(
      `defaultNotebook「${cfg}」未找到。可用笔记本：${
        open.map((n) => `${n.name}（${n.id}）`).join('、') || '（无）'
      }。请在插件配置中修正 defaultNotebook，或在工具参数中显式传 notebook。`,
    )
  }

  if (open.length === 0) {
    throw new Error('思源中没有打开的笔记本，请先在思源中打开一个笔记本，或在工具参数中显式传 notebook。')
  }
  return open[0].id
}
