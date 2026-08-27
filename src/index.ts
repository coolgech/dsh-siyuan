/**
 * dsh-siyuan 插件入口。
 *
 * 这是一个 DeepSeek Harness（dsh）Cordis 插件：
 * - 导出 `name`、`inject`、`apply(ctx, config)` 和 `Config` schema；
 * - 在 `apply` 中创建思源 API 客户端，并把一组工具注册到 `ctx.tools`。
 *
 * 参考：
 * - https://deepseek-harness.github.io/deepseek-harness/en/develop/basic/
 * - https://deepseek-harness.github.io/deepseek-harness/en/develop/basic/tool
 */
import type { Context } from '@deepseek-ai/cordis'
import { SiYuanClient } from './client.js'
import { Config } from './config.js'
import { listDocsTool, listNotebooksTool } from './tools/list.js'
import { readDocTool } from './tools/read.js'
import { querySqlTool } from './tools/search.js'
import { appendBlockTool, createDocTool, updateBlockTool } from './tools/write.js'
import {
  deleteDocTool,
  getBacklinksTool,
  listAssetsTool,
  moveDocTool,
  renameDocTool,
  searchAssetContentTool,
  searchTool,
} from './tools/knowledge.js'
import {
  createNotebookTool,
  deleteBlockTool,
  getBlockAttrsTool,
  getBlockChildrenTool,
  getBlockInfoTool,
  insertBlockTool,
  moveBlockTool,
  removeNotebookTool,
  renameNotebookTool,
  searchTagTool,
  setBlockAttrsTool,
} from './tools/management.js'
import { appendDailyNoteBlockTool, createDailyNoteTool, listDocTreeTool } from './tools/daily.js'
import { batchExportMarkdownTool, batchImportMarkdownTool, listTemplatesTool } from './tools/batch.js'
import { installSiYuanSettings } from './settings.js'
import type { ToolEnv } from './tools/helpers.js'

export const name = 'dsh-siyuan'

/** 本插件依赖 dsh 的 tools 服务。 */
export const inject = ['tools']

export function apply(ctx: Context, config: Config) {
  const client = new SiYuanClient({
    getBaseUrl: () => config.baseUrl,
    getApiToken: () => config.apiToken,
    getTimeoutMs: () => config.timeoutMs,
  })

  const env: ToolEnv = { client, config }

  // 注册设置界面卡片（无 settings 服务的旧版 dsh 会自动跳过）
  installSiYuanSettings(ctx, config)

  const tools = [
    querySqlTool(env),
    readDocTool(env),
    createDocTool(env),
    appendBlockTool(env),
    updateBlockTool(env),
    listNotebooksTool(env),
    listDocsTool(env),
      searchTool(env),
      getBacklinksTool(env),
      deleteDocTool(env),
      renameDocTool(env),
      moveDocTool(env),
      listAssetsTool(env),
      searchAssetContentTool(env),
      createNotebookTool(env),
      renameNotebookTool(env),
      removeNotebookTool(env),
      getBlockChildrenTool(env),
      insertBlockTool(env),
      deleteBlockTool(env),
      getBlockAttrsTool(env),
      setBlockAttrsTool(env),
      getBlockInfoTool(env),
      moveBlockTool(env),
      searchTagTool(env),
      createDailyNoteTool(env),
      appendDailyNoteBlockTool(env),
      listDocTreeTool(env),
      batchExportMarkdownTool(env),
      batchImportMarkdownTool(env),
      listTemplatesTool(env),
  ]

  const disposers = tools.map((tool) => ctx.tools.register(tool))
  ctx.effect(() => () => {
    for (const dispose of disposers) dispose()
  })
}

export { Config }
