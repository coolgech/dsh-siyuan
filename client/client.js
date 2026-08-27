/**
 * dsh-siyuan 浏览器端设置卡片。
 *
 * 通过 DSH ModuleLoader 加载，注册到「设置 → 插件 → dsh-siyuan」。
 * 使用 settingsScope 读写 `dsh-siyuan` 命名空间，保存后 Host 半会把值写回插件配置。
 */
window.__ModuleLoader__.load({
  id: 'dsh-siyuan',
  factory: (require) => {
    var module = { exports: {} }
    var exports = module.exports
    Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' })

    const React = require('react')

    const NS = 'dsh-siyuan'
    const inject = ['slots', 'settingsScope']

    function apply(ctx) {
      const scope = ctx.settingsScope.bind({ namespace: NS })

      ctx.slots.inject('settings.plugin.item', () => ctx.slots.register({
        name: 'settings.plugin.item',
        id: 'dsh-siyuan',
        key: NS,
        inject: () => ({ scope }),
      }, SiYuanSettingsCard))
    }

    const fieldStyle = {
      display: 'flex',
      flexDirection: 'column',
      gap: '4px',
      marginBottom: '10px',
    }
    const labelStyle = { fontSize: '12px', fontWeight: 600 }
    const inputStyle = {
      width: '100%',
      boxSizing: 'border-box',
      padding: '6px 8px',
      border: '1px solid var(--dsw-alias-border-default, #d0d7de)',
      borderRadius: '6px',
      background: 'var(--dsw-alias-bg-layer-2, #fff)',
      color: 'var(--dsw-alias-label-primary, inherit)',
    }
    const buttonStyle = {
      padding: '6px 12px',
      border: '0',
      borderRadius: '6px',
      background: 'var(--dsw-alias-accent, #4c78ff)',
      color: '#fff',
      cursor: 'pointer',
    }
    const hintStyle = { fontSize: '12px', opacity: 0.75 }

    function SiYuanSettingsCard(props) {
      const { scope } = props
      const [open, setOpen] = React.useState(false)
      const [snapshot, setSnapshot] = React.useState(() => scope.getSnapshot())
      const [saving, setSaving] = React.useState(false)
      const [message, setMessage] = React.useState('')

      React.useEffect(() => scope.subscribe(() => {
        setSnapshot(scope.getSnapshot())
      }), [scope])

      const current = (snapshot && snapshot.value) || {}
      const [baseUrl, setBaseUrl] = React.useState(current.baseUrl || 'http://127.0.0.1:6806')
      const [apiToken, setApiToken] = React.useState(current.apiToken || '')
      const [defaultNotebook, setDefaultNotebook] = React.useState(current.defaultNotebook || '')
      const [defaultPath, setDefaultPath] = React.useState(current.defaultPath || '/')
      const [timeoutMs, setTimeoutMs] = React.useState(current.timeoutMs != null ? String(current.timeoutMs) : '15000')

      React.useEffect(() => {
        const value = (scope.getSnapshot() && scope.getSnapshot().value) || {}
        setBaseUrl(value.baseUrl || 'http://127.0.0.1:6806')
        setApiToken(value.apiToken || '')
        setDefaultNotebook(value.defaultNotebook || '')
        setDefaultPath(value.defaultPath || '/')
        setTimeoutMs(value.timeoutMs != null ? String(value.timeoutMs) : '15000')
      }, [snapshot, scope])

      const save = async (event) => {
        event.preventDefault()
        setSaving(true)
        setMessage('')
        try {
          await scope.set('baseUrl', baseUrl.trim() || 'http://127.0.0.1:6806')
          await scope.set('apiToken', apiToken.trim())
          await scope.set('defaultNotebook', defaultNotebook.trim())
          await scope.set('defaultPath', defaultPath.trim() || '/')
          const timeout = Number(timeoutMs)
          await scope.set('timeoutMs', Number.isFinite(timeout) && timeout > 0 ? timeout : 15000)
          setMessage('已保存')
        } catch (cause) {
          setMessage(cause instanceof Error ? cause.message : String(cause))
        } finally {
          setSaving(false)
        }
      }

      return React.createElement(
        'li',
        {
          style: {
            border: '1px solid var(--dsw-alias-border-default, #d0d7de)',
            borderRadius: '8px',
            marginBottom: '8px',
            background: 'var(--dsw-alias-bg-layer-1, #fff)',
          },
        },
        React.createElement(
          'button',
          {
            type: 'button',
            onClick: () => setOpen((v) => !v),
            style: {
              width: '100%',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '12px 14px',
              border: '0',
              background: 'transparent',
              cursor: 'pointer',
              color: 'var(--dsw-alias-label-primary, inherit)',
            },
            'aria-expanded': open,
          },
          React.createElement('span', null, '思源笔记'),
          React.createElement('span', { style: hintStyle }, open ? '收起' : '配置'),
        ),
        open ? React.createElement(
          'form',
          { onSubmit: save, style: { padding: '0 14px 14px' } },
          field('思源 API 地址', React.createElement('input', {
            style: inputStyle,
            value: baseUrl,
            onChange: (e) => setBaseUrl(e.target.value),
            placeholder: 'http://127.0.0.1:6806',
          })),
          field('API Token', React.createElement('input', {
            style: inputStyle,
            type: 'password',
            autoComplete: 'off',
            value: apiToken,
            onChange: (e) => setApiToken(e.target.value),
            placeholder: '思源设置 → 关于 → API Token',
          })),
          field('默认笔记本 ID/名称', React.createElement('input', {
            style: inputStyle,
            value: defaultNotebook,
            onChange: (e) => setDefaultNotebook(e.target.value),
            placeholder: '留空则使用第一个打开的笔记本',
          })),
          field('默认路径', React.createElement('input', {
            style: inputStyle,
            value: defaultPath,
            onChange: (e) => setDefaultPath(e.target.value),
            placeholder: '/',
          })),
          field('超时（毫秒）', React.createElement('input', {
            style: inputStyle,
            type: 'number',
            min: '1',
            value: timeoutMs,
            onChange: (e) => setTimeoutMs(e.target.value),
          })),
          React.createElement(
            'div',
            { style: { display: 'flex', alignItems: 'center', gap: '10px' } },
            React.createElement('button', { type: 'submit', style: buttonStyle, disabled: saving }, saving ? '保存中…' : '保存'),
            message ? React.createElement('span', { style: hintStyle }, message) : null,
          ),
        ) : null,
      )
    }

    function field(labelText, control) {
      return React.createElement(
        'label',
        { style: fieldStyle },
        React.createElement('span', { style: labelStyle }, labelText),
        control,
      )
    }

    module.exports = { name: 'dsh-siyuan', inject, apply }
    return module.exports
  },
})
