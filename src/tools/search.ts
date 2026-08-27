/**
 * siyuan_query_sql：通过思源内核 /api/query/sql 执行只读 SQL 查询。
 */
import { defineTool } from '@deepseek-ai/dsh-tools'
import { clampLimit } from '../utils.js'
import type { ToolEnv } from './helpers.js'

function trimSql(sql: string): string {
  return (sql ?? '').trim().replace(/;\s*$/, '')
}

function assertReadOnlySql(stmt: string): void {
  if (!/^\s*(select|with)\b/i.test(stmt)) {
    throw new Error('siyuan_query_sql 只允许 SELECT 查询（或 WITH ... SELECT），禁止 INSERT/UPDATE/DELETE/DDL')
  }
}

export function querySqlTool(env: ToolEnv) {
  const { client } = env

  return defineTool({
    name: 'siyuan_query_sql',
    description:
      '在思源笔记（SiYuan）中执行只读 SQL 查询（内核 /api/query/sql），返回结果行数组。' +
      '常用表：blocks（type 为 d 的是文档块，c 是代码块，l 是列表，i 是列表项，p 是段落，h 是标题）、attributes（属性）、refs（引用）、assets（资源）。' +
      '常用列：blocks.id / type / content / hPath（人类可读路径）/ created / updated / attrs / markdown。' +
      '示例：SELECT id, hPath, content FROM blocks WHERE type = \'d\' AND hPath LIKE \'%项目%\' ORDER BY updated DESC;' +
      '注意：字符串必须用单引号包裹；只允许 SELECT，禁止 INSERT/UPDATE/DELETE/DDL。',
    parameters: {
      sql: {
        type: 'string',
        required: true,
        description: '只读 SQL 语句（SELECT），字符串用单引号包裹',
      },
      limit: {
        type: 'number',
        description: '返回行数上限（默认 50，最大 500；超过上限会截断并在结果中标注 truncated）',
      },
    },
    output: {
      schema: { type: 'json' },
      render: (...rest: unknown[]): Array<{ type: 'text'; text: string }> => {
        // 兼容 dsh 不同版本：render(value) 或 render(args, value)
        const value = rest.length > 1 ? rest[1] : rest[0]
        const v = value as { rows?: unknown[]; count?: number; truncated?: boolean } | undefined
        if (!v || !Array.isArray(v.rows) || v.rows.length === 0) return [{ type: 'text', text: '(无结果)' }]
        return [{ type: 'text', text: JSON.stringify(v.rows, null, 2) }]
      },
    },
    async execute(args: any, exec: { signal: AbortSignal }): Promise<any> {
      const { sql, limit } = args as { sql: string; limit?: number }
      if (!sql || !trimSql(sql)) throw new Error('siyuan_query_sql 需要非空 sql 参数')
      const cap = clampLimit(limit)
      const stmt = trimSql(sql)
      assertReadOnlySql(stmt)

      const rows = await client.querySql(stmt, exec.signal)
      const truncated = rows.length > cap
      return {
        stmt,
        count: rows.length,
        truncated,
        rows: truncated ? rows.slice(0, cap) : rows,
      }
    },
  })
}
