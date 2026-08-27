/**
 * dsh-siyuan 插件配置。
 *
 * Cordis 约定：导出同名的 `Config` 类型（编译期类型）与 `Config` schema
 * （Schemastery，运行时校验 + 默认值）。loader 会按 schema 校验 cordis.yml 里
 * 传入的 config，并把校验后的对象作为 `apply(ctx, config)` 的第二个参数。
 *
 * 参考：docs/user/develop/basic/config.md（"Export a Config type and a same-named
 * Schemastery schema"）、@deepseek-ai/schemastery（dsh 内嵌版本 ^3.18.1）。
 */
import Schema from '@deepseek-ai/schemastery'

export interface Config {
  /** 思源内核 HTTP API 地址（默认 http://127.0.0.1:6806）。 */
  baseUrl: string
  /** 思源 API Token（设置 → 关于 → API Token）。留空则不携带 Authorization 头。 */
  apiToken: string
  /** 默认笔记本 ID 或名称；工具调用未显式传 notebook 时使用。 */
  defaultNotebook: string
  /** 默认路径前缀，用于列出 / 创建文档（默认 "/"）。 */
  defaultPath: string
  /** 单次 HTTP 请求超时（毫秒）。 */
  timeoutMs: number
}

export const Config = Schema.object({
  baseUrl: Schema.string()
    .default('http://127.0.0.1:6806')
    .description('思源内核 HTTP API 地址，例如 http://127.0.0.1:6806'),
  apiToken: Schema.string()
    .default('')
    .description('思源 API Token（设置 → 关于 → API Token）；留空则不携带鉴权头'),
  defaultNotebook: Schema.string()
    .default('')
    .description('默认笔记本 ID 或名称；工具调用未显式传 notebook 时使用'),
  defaultPath: Schema.string()
    .default('/')
    .description('默认路径前缀，用于列出 / 创建文档'),
  timeoutMs: Schema.number()
    .default(15000)
    .description('单次请求超时（毫秒）'),
})
