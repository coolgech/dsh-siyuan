/**
 * 思源内核 API 客户端：统一的请求封装、超时、取消信号、鉴权与错误处理。
 *
 * 设计要点：
 * - 使用 Node.js 原生 fetch（Node >= 18），零运行时依赖。
 * - 所有请求 POST JSON 到 `<baseUrl><endpoint>`，响应按 { code, msg, data } 解包：
 *   code !== 0 时抛出 SiYuanError。
 * - 鉴权：apiToken 非空时携带 `Authorization: Token <token>`。
 * - 超时：默认 15s（可配置）；同时转发外部 AbortSignal（即工具执行时 exec.signal），
 *   任一方触发都会中止请求。
 * - 支持注入 fetchFn，便于单元测试（见 tests/client.test.mjs）。
 */
import type {
  SiYuanBlockKramdown,
  SiYuanDocEntry,
  SiYuanDocInfo,
  SiYuanHPathIds,
  SiYuanMdExport,
  SiYuanNotebook,
  SiYuanResponse,
} from './types.js'

/** 思源 API 调用失败时抛出的错误。 */
export class SiYuanError extends Error {
  readonly code: number | undefined
  readonly data: unknown
  readonly endpoint: string | undefined

  constructor(message: string, code?: number, data?: unknown, endpoint?: string) {
    super(message)
    this.name = 'SiYuanError'
    this.code = code
    this.data = data
    this.endpoint = endpoint
  }
}

export interface SiYuanClientOptions {
  /** 思源内核地址，如 http://127.0.0.1:6806 */
  baseUrl?: string
  /** API Token（可为空） */
  apiToken?: string
  /** 请求超时（毫秒） */
  timeoutMs?: number
  /** 动态读取思源地址（设置页修改后无需重建 client） */
  getBaseUrl?: () => string
  /** 动态读取 API Token */
  getApiToken?: () => string
  /** 动态读取请求超时 */
  getTimeoutMs?: () => number
  /** 可注入的 fetch 实现（测试用），默认 globalThis.fetch */
  fetchFn?: typeof fetch
}

export type JsonRecord = Record<string, unknown>

export class SiYuanClient {
  private readonly getBaseUrl: () => string
  private readonly getApiToken: () => string
  private readonly getTimeoutMs: () => number
  private readonly fetchFn: typeof fetch

  constructor(options: SiYuanClientOptions) {
    this.getBaseUrl = options.getBaseUrl ?? (() => options.baseUrl ?? 'http://127.0.0.1:6806')
    this.getApiToken = options.getApiToken ?? (() => options.apiToken ?? '')
    this.getTimeoutMs = options.getTimeoutMs ?? (() => (options.timeoutMs && options.timeoutMs > 0 ? options.timeoutMs : 15000))
    this.fetchFn = options.fetchFn ?? (globalThis.fetch as typeof fetch)
  }

  /** 统一请求入口：POST JSON → 解包 SiYuan 信封 → 返回 data。 */
  async request<T>(endpoint: string, body: JsonRecord, externalSignal?: AbortSignal): Promise<T> {
    const baseUrl = this.getBaseUrl().replace(/\/+$/, '')
    const apiToken = this.getApiToken()
    const timeoutMs = this.getTimeoutMs()

    const controller = new AbortController()
    let timedOut = false
    const timer = setTimeout(() => {
      timedOut = true
      controller.abort()
    }, timeoutMs)
    const onExternalAbort = () => controller.abort()
    if (externalSignal) {
      if (externalSignal.aborted) {
        clearTimeout(timer)
        throw new SiYuanError(`请求已取消：${endpoint}`, undefined, undefined, endpoint)
      }
      externalSignal.addEventListener('abort', onExternalAbort, { once: true })
    }

    let response: Response
    try {
      response = await this.fetchFn(baseUrl + endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(apiToken ? { Authorization: `Token ${apiToken}` } : {}),
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      })
    } catch (err) {
      if (timedOut) {
        throw new SiYuanError(`思源请求超时（${timeoutMs}ms）：${endpoint}`, undefined, undefined, endpoint)
      }
      if (controller.signal.aborted) {
        throw new SiYuanError(`思源请求已取消：${endpoint}`, undefined, undefined, endpoint)
      }
      throw new SiYuanError(`思源请求失败：${endpoint}（${String(err)}）`, undefined, undefined, endpoint)
    } finally {
      clearTimeout(timer)
      if (externalSignal) externalSignal.removeEventListener('abort', onExternalAbort)
    }

    if (!response.ok) {
      throw new SiYuanError(`思源内核返回 HTTP ${response.status} ${response.statusText}：${endpoint}`, undefined, undefined, endpoint)
    }

    let json: SiYuanResponse<T>
    try {
      json = (await response.json()) as SiYuanResponse<T>
    } catch {
      throw new SiYuanError(`思源内核响应不是合法 JSON：${endpoint}`, undefined, undefined, endpoint)
    }

    if (json.code !== 0) {
      throw new SiYuanError(`思源内核返回错误：${json.msg || 'unknown'}（${endpoint}）`, json.code, json.data, endpoint)
    }
    return json.data
  }

  // ---- 以下是按工具需求封装的类型化方法 ----

  /** 执行只读 SQL 查询（/api/query/sql）。data 为行对象数组。 */
  querySql(stmt: string, signal?: AbortSignal): Promise<JsonRecord[]> {
    return this.request<JsonRecord[]>('/api/query/sql', { stmt }, signal)
  }

  /** 按路径取文档（/api/filetree/getDocByPath）。 */
  getDocByPath(notebook: string, path: string, signal?: AbortSignal): Promise<SiYuanDocInfo> {
    return this.request<SiYuanDocInfo>('/api/filetree/getDocByPath', { notebook, path }, signal)
  }

  /** 按 ID 导出 Markdown（/api/export/exportMdContent）。 */
  exportMdContent(id: string, signal?: AbortSignal): Promise<SiYuanMdExport> {
    return this.request<SiYuanMdExport>('/api/export/exportMdContent', { id }, signal)
  }

  /** 在指定路径创建 Markdown 文档（/api/filetree/createDocWithMd）。 */
  createDocWithMd(notebook: string, path: string, markdown: string, force: boolean, signal?: AbortSignal): Promise<JsonRecord> {
    return this.request<JsonRecord>('/api/filetree/createDocWithMd', { notebook, path, markdown, force }, signal)
  }

  /** 向文档/块追加内容（/api/block/appendBlock）。 */
  appendBlock(markdown: string, parentId: string, appendType: 'block' | 'children', signal?: AbortSignal): Promise<JsonRecord> {
    return this.request<JsonRecord>('/api/block/appendBlock', { dataType: 'markdown', data: markdown, parentID: parentId, appendType }, signal)
  }

  /** 更新块内容（/api/block/updateBlock）。 */
  updateBlock(markdown: string, id: string, signal?: AbortSignal): Promise<unknown> {
    return this.request<unknown>('/api/block/updateBlock', { dataType: 'markdown', data: markdown, id }, signal)
  }

  /** 列出笔记本（/api/notebook/lsNotebooks）。 */
  async lsNotebooks(signal?: AbortSignal): Promise<SiYuanNotebook[]> {
    const data = await this.request<{ notebooks?: SiYuanNotebook[] }>('/api/notebook/lsNotebooks', {}, signal)
      return data.notebooks ?? []
  }

  /** 列出目录下的文档（/api/filetree/listDocsByPath）。 */
  async listDocsByPath(notebook: string, path: string, signal?: AbortSignal): Promise<SiYuanDocEntry[]> {
    const data = await this.request<{ files?: SiYuanDocEntry[] }>('/api/filetree/listDocsByPath', { notebook, path }, signal)
      return data.files ?? []
  }

  /** 按人类可读路径获取文档 ID 列表（/api/filetree/getIDsByHPath）。 */
  getIDsByHPath(hPaths: string[], signal?: AbortSignal): Promise<SiYuanHPathIds> {
    return this.request<SiYuanHPathIds>('/api/filetree/getIDsByHPath', { hPaths }, signal)
  }

  /** 读取单个块的 kramdown（/api/block/getBlockKramdown）。 */
  getBlockKramdown(id: string, signal?: AbortSignal): Promise<SiYuanBlockKramdown> {
    return this.request<SiYuanBlockKramdown>('/api/block/getBlockKramdown', { id }, signal)
  }

    /** 全文搜索块（/api/search/fullTextSearchBlock）。 */
    fullTextSearchBlock(params: JsonRecord, signal?: AbortSignal): Promise<unknown> {
      return this.request<unknown>('/api/search/fullTextSearchBlock', params, signal)
    }

    /** 全文搜索资源文件内容（/api/search/fullTextSearchAssetContent）。 */
    fullTextSearchAssetContent(params: JsonRecord, signal?: AbortSignal): Promise<unknown> {
      return this.request<unknown>('/api/search/fullTextSearchAssetContent', params, signal)
    }

    /** 获取反向链接与提及（/api/ref/getBacklink2）。 */
    getBacklink2(blockID: string, signal?: AbortSignal): Promise<unknown> {
      return this.request<unknown>('/api/ref/getBacklink2', { blockID }, signal)
    }

    /** 删除文档（/api/filetree/removeDoc）。 */
    removeDoc(notebook: string, path: string, signal?: AbortSignal): Promise<unknown> {
      return this.request<unknown>('/api/filetree/removeDoc', { notebook, path }, signal)
    }

    /** 重命名文档（/api/filetree/renameDoc）。 */
    renameDoc(notebook: string, path: string, docName: string, signal?: AbortSignal): Promise<unknown> {
      return this.request<unknown>('/api/filetree/renameDoc', { notebook, path, docName }, signal)
    }

    /** 根据 ID 重命名文档（/api/filetree/renameDocByID）。 */
    renameDocByID(id: string, title: string, signal?: AbortSignal): Promise<unknown> {
      return this.request<unknown>('/api/filetree/renameDocByID', { id, title }, signal)
    }

    /** 移动文档（/api/filetree/moveDocs）。 */
    moveDocs(toNotebook: string, fromPaths: string[], toPath: string, signal?: AbortSignal): Promise<unknown> {
      return this.request<unknown>('/api/filetree/moveDocs', { fromPaths, toNotebook, toPath }, signal)
    }

    /** 根据 ID 移动多个文档（/api/filetree/moveDocsByID）。 */
    moveDocsByID(ids: string[], toID: string, signal?: AbortSignal): Promise<unknown> {
      return this.request<unknown>('/api/filetree/moveDocsByID', { fromIDs: ids, toID }, signal)
    }

    /** 创建笔记本（/api/notebook/createNotebook）。 */
    createNotebook(name: string, signal?: AbortSignal): Promise<unknown> {
      return this.request<unknown>('/api/notebook/createNotebook', { name }, signal)
    }

    /** 重命名笔记本（/api/notebook/renameNotebook）。 */
    renameNotebook(notebook: string, name: string, signal?: AbortSignal): Promise<unknown> {
      return this.request<unknown>('/api/notebook/renameNotebook', { notebook, name }, signal)
    }

    /** 删除笔记本（/api/notebook/removeNotebook）。 */
    removeNotebook(notebook: string, signal?: AbortSignal): Promise<unknown> {
      return this.request<unknown>('/api/notebook/removeNotebook', { notebook }, signal)
    }

    /** 获取块的直接子块（/api/block/getChildBlocks）。 */
    getChildBlocks(id: string, signal?: AbortSignal): Promise<unknown> {
      return this.request<unknown>('/api/block/getChildBlocks', { id }, signal)
    }

    /** 插入块（/api/block/insertBlock）。 */
    insertBlock(
      data: string,
      options: { previousID?: string; nextID?: string; parentID?: string; dataType?: string },
      signal?: AbortSignal,
    ): Promise<unknown> {
      return this.request<unknown>('/api/block/insertBlock', {
        dataType: options.dataType ?? 'markdown',
        data,
        ...(options.previousID ? { previousID: options.previousID } : {}),
        ...(options.nextID ? { nextID: options.nextID } : {}),
        ...(options.parentID ? { parentID: options.parentID } : {}),
      }, signal)
    }

    /** 删除块（/api/block/deleteBlock）。 */
    deleteBlock(id: string, signal?: AbortSignal): Promise<unknown> {
      return this.request<unknown>('/api/block/deleteBlock', { id }, signal)
    }

    /** 获取块属性（/api/attr/getBlockAttrs）。 */
    getBlockAttrs(id: string, signal?: AbortSignal): Promise<unknown> {
      return this.request<unknown>('/api/attr/getBlockAttrs', { id }, signal)
    }

    /** 设置块属性（/api/attr/setBlockAttrs）。 */
    setBlockAttrs(id: string, attrs: Record<string, string>, signal?: AbortSignal): Promise<unknown> {
      return this.request<unknown>('/api/attr/setBlockAttrs', { id, attrs }, signal)
    }

    /** 获取块信息（/api/block/getBlockInfo）。 */
    getBlockInfo(id: string, signal?: AbortSignal): Promise<unknown> {
      return this.request<unknown>('/api/block/getBlockInfo', { id }, signal)
    }

    /** 移动块（/api/block/moveBlock）。 */
    moveBlock(
      id: string,
      options: { previousID?: string; nextID?: string; parentID?: string },
      signal?: AbortSignal,
    ): Promise<unknown> {
      return this.request<unknown>('/api/block/moveBlock', {
        id,
        ...(options.previousID ? { previousID: options.previousID } : {}),
        ...(options.nextID ? { nextID: options.nextID } : {}),
        ...(options.parentID ? { parentID: options.parentID } : {}),
      }, signal)
    }

    /** 创建/打开每日笔记（/api/filetree/createDailyNote）。 */
    createDailyNote(notebook: string, signal?: AbortSignal): Promise<unknown> {
      return this.request<unknown>('/api/filetree/createDailyNote', { notebook }, signal)
    }

    /** 向每日笔记追加内容（/api/block/appendDailyNoteBlock）。 */
    appendDailyNoteBlock(notebook: string, data: string, dataType = 'markdown', signal?: AbortSignal): Promise<unknown> {
      return this.request<unknown>('/api/block/appendDailyNoteBlock', { notebook, data, dataType }, signal)
    }

    /** 获取文档树（/api/filetree/listDocTree）。 */
    listDocTree(notebook: string, path = '/', signal?: AbortSignal): Promise<unknown> {
      return this.request<unknown>('/api/filetree/listDocTree', { notebook, path }, signal)
    }
}
