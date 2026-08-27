/**
 * 通用小工具：路径规范化、Markdown 渲染、错误信息提取。
 */

/** 规范化文档/目录路径：保证以 "/" 开头、去掉结尾多余的 "/"（根路径除外）。 */
export function normalizeDocPath(raw: string): string {
  let p = (raw ?? '/').trim()
  if (!p) p = '/'
  if (!p.startsWith('/')) p = '/' + p
  if (p.length > 1) p = p.replace(/\/+$/, '')
  return p
}

/** 若路径未带 .sy 后缀则补上（getDocByPath 需要完整 .sy 路径）。 */
export function withSySuffix(path: string): string {
  return path.toLowerCase().endsWith('.sy') ? path : `${path}.sy`
}

/** 把 `/a/b/name` 拆成目录与文档名。 */
export function splitDocPath(raw: string): { dir: string; name: string } {
  const p = normalizeDocPath(raw)
  const idx = p.lastIndexOf('/')
  if (idx <= 0) return { dir: '/', name: p.slice(1) }
  return { dir: p.slice(0, idx), name: p.slice(idx + 1) }
}

/** 把任意值渲染成给模型/UI 看的文本。 */
export function toMarkdown(value: unknown): string {
  if (typeof value === 'string') return value
  if (value === null || value === undefined) return ''
  return JSON.stringify(value, null, 2)
}

/** 从未知错误对象里提取可读信息。 */
export function messageOf(err: unknown): string {
  if (err instanceof Error) return err.message
  return String(err)
}

/** 把 limit 限制在 [1, 500]。 */
export function clampLimit(limit: number | undefined): number {
  if (limit === undefined || limit === null) return 50
  if (!Number.isFinite(limit)) return 50
  return Math.min(500, Math.max(1, Math.floor(limit)))
}

/** 确保返回值是 lossless JSON（丢弃 undefined/函数等无法 JSON 化的内容）。 */
export function toJsonSafe(value: unknown): unknown {
  if (value === undefined) return null
  return JSON.parse(JSON.stringify(value))
}

