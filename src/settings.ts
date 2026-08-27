/**
 * dsh-siyuan 设置界面（Host 半）。
 *
 * 注册 `dsh-siyuan` settings 命名空间，让用户在
 * 设置 → 插件 → dsh-siyuan 的配置卡片里直接编辑思源参数。
 * 保存后通过 `onChange` 写回当前插件配置对象，工具无需重启即可读到新值。
 */
import type { Context } from '@deepseek-ai/cordis'
import { installSettingsSection, settingsNamespace } from '@deepseek-ai/dsh-settings'
import Schema from '@deepseek-ai/schemastery'
import type { Config } from './config.js'

/** 浏览器卡片与 Host 命名空间共用的 join key。 */
export const SIYUAN_SETTINGS_NS = settingsNamespace('dsh-siyuan')

/** 设置卡片中可编辑的运行时配置。 */
export interface SiYuanRuntimeSettings {
  baseUrl: string
  apiToken: string
  defaultNotebook: string
  defaultPath: string
  timeoutMs: number
}

/** 设置卡片使用的 Schemastery schema（默认值与 Config 保持一致）。 */
export const SiYuanRuntimeSettings = Schema.object({
  baseUrl: Schema.string()
    .default('http://127.0.0.1:6806')
    .description('思源内核 HTTP API 地址，例如 http://127.0.0.1:6806'),
  apiToken: Schema.string()
    .default('')
    .description('思源 API Token（设置 → 关于 → API Token）'),
  defaultNotebook: Schema.string()
    .default('')
    .description('默认笔记本 ID 或名称'),
  defaultPath: Schema.string()
    .default('/')
    .description('默认路径前缀'),
  timeoutMs: Schema.number()
    .default(15000)
    .description('单次请求超时（毫秒）'),
})

/**
 * 注册设置命名空间，并把用户在设置界面的修改写回 `config`。
 *
 * @param ctx Cordis 上下文
 * @param config 插件当前配置对象（apply 传入，可原地更新）
 */
export function installSiYuanSettings(ctx: Context, config: Config): void {
  const entry: SiYuanRuntimeSettings = {
    baseUrl: config.baseUrl,
    apiToken: config.apiToken,
    defaultNotebook: config.defaultNotebook,
    defaultPath: config.defaultPath,
    timeoutMs: config.timeoutMs,
  }

  let source = (): SiYuanRuntimeSettings => entry

  const applyToConfig = (next: SiYuanRuntimeSettings): void => {
    config.baseUrl = next.baseUrl
    config.apiToken = next.apiToken
    config.defaultNotebook = next.defaultNotebook
    config.defaultPath = next.defaultPath
    config.timeoutMs = next.timeoutMs
  }

  installSettingsSection(
    ctx,
    SIYUAN_SETTINGS_NS,
    SiYuanRuntimeSettings,
    entry,
    {
      setSource: (current) => {
        source = current
        // 启动时 settings 服务会把“已保存的用户配置”作为 current 交给我们，
        // 这里立即同步回插件 config，否则工具仍会使用 cordis.patch.yml 里的旧值。
        applyToConfig(source())
      },
      onChange: () => {
        applyToConfig(source())
      },
    },
  )
}
