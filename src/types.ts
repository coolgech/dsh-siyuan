/**
 * 思源内核 HTTP API 相关的类型定义。
 *
 * 思源内核 API 统一返回 { code, msg, data } 信封：
 *   code === 0 表示成功，否则 msg 携带错误信息。
 * 参考：https://github.com/siyuan-note/siyuan （kernel/api 相关文档）。
 */

/** 思源内核标准响应信封。 */
export interface SiYuanResponse<T = unknown> {
  code: number
  msg: string
  data: T
}

/** /api/notebook/lsNotebooks 返回的笔记本条目。 */
export interface SiYuanNotebook {
  id: string
  name: string
  icon: string
  sort: number
  closed: boolean
}

/** /api/filetree/listDocsByPath 返回的文档条目（部分字段）。 */
export interface SiYuanDocEntry {
  id: string
  box: string
  path: string
  hPath: string
  name: string
  subFileCount: number
  sort: number
}

/** /api/filetree/getDocByPath 的响应数据（字段以实际版本为准）。 */
export interface SiYuanDocInfo {
  id?: string
  box?: string
  path?: string
  hPath?: string
  /** 文档内容：不同版本可能是 JSON 序列化的块树字符串，或纯文本。 */
  content?: string
}

/** /api/export/exportMdContent 的响应数据。 */
export interface SiYuanMdExport {
  hPath?: string
  content?: string
}

/** /api/block/getBlockKramdown 的响应数据。 */
export interface SiYuanBlockKramdown {
  id: string
  kramdown: string
}

/**
 * /api/filetree/getIDsByHPath 的响应数据。
 * 不同内核版本的 data 可能是（读取侧会兼容解析）：
 * - { hPaths: ["doc-id", ...] }                    // 当前内核：人类可读路径 → ID 列表
 * - { hPaths: { "/笔记/文档": ["doc-id", ...] } }
 * - { hPaths: [{ hPath, id }, ...] }
 * - { "/笔记/文档": ["doc-id", ...] }
 */
export type SiYuanHPathIds = Record<string, string[]>
