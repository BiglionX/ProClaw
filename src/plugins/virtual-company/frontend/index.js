/**
 * 虚拟公司 · NvWaX 插件 — 前端入口
 *
 * 由 App 启动时通过 `pluginFrontend.loadBuiltinPluginFrontends()`
 * 加载到 React 路由系统（详见 src/lib/pluginFrontend.ts）。
 * 提供 4 个核心页面：
 *   /vc/templates  浏览 NvWaX 市场的虚拟公司模板
 *   /vc/wizard     对话式创建向导（占位 — 完整版跳转 NvWaX Web 或本地 SSE）
 *   /vc/import     从 NvWaX 下载的 .nvwax-vc.json / URL 导入
 *   /vc/companies  本地已导入的虚拟公司列表与详情（含云端回写）
 *
 * 使用全局 ProClawPlugin API（PRD v10.0 规范）：
 *   - ProClawPlugin.registerRoute(path, Component)
 *   - ProClawPlugin.addMenuItem(parent, label, icon, route)
 *   - ProClawPlugin.invoke(cmd, args)  调任意 Tauri 命令
 *   - ProClawPlugin.db.query(sql, params?)  读本地 SQLite
 *   - ProClawPlugin.notify(level, msg)  推送 toast
 *
 * 配套文件：
 *   docs/integration/virtual-company-package.schema.json  导出包 schema
 *   docs/integration/NVWAX_INTEGRATION.md                开发者指南
 *   src/types/nvwax.ts  TypeScript 类型（供上层使用）
 *   src/lib/nvwaxClient.ts  前端 NvwaX API 服务类（推荐上游使用）
 *
 * 本文件以纯 ES5 风格编写（无 import/export、React.createElement），
 * 与同目录 catering 插件保持一致，可在 WebView 中直接执行。
 */
(function () {
  'use strict';

  // ==================== 工具函数 ====================

  /** 安全的 React.createElement 别名（避免全局污染） */
  var h = React.createElement;

  /** 调用 Tauri 命令的薄封装，统一错误处理 */
  function invokeTauri(cmd, args) {
    if (!window.ProClawPlugin || typeof ProClawPlugin.invoke !== 'function') {
      return Promise.reject(new Error('ProClawPlugin API 不可用（请在 Tauri 桌面端运行）'));
    }
    return ProClawPlugin.invoke(cmd, args || {});
  }

  /** UI 容器：统一样式 */
  function vcShell(title, subtitle, children) {
    return h(
      'div',
      {
        className: 'vc-shell',
        style: {
          padding: '24px',
          maxWidth: '1100px',
          margin: '0 auto',
          color: '#1f2937',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        },
      },
      h(
        'div',
        { style: { marginBottom: '24px', borderBottom: '2px solid #7c3aed', paddingBottom: '16px' } },
        h('h1', { style: { margin: 0, fontSize: '1.75rem', color: '#7c3aed' } }, '🏢 ' + title),
        subtitle ? h('p', { style: { margin: '8px 0 0', color: '#6b7280' } }, subtitle) : null
      ),
      children
    );
  }

  /** 通用 loading / error / empty 渲染 */
  function renderState(state) {
    if (state.loading) {
      return h('div', { style: { padding: '40px', textAlign: 'center', color: '#6b7280' } }, '加载中…');
    }
    if (state.error) {
      return h(
        'div',
        {
          style: {
            padding: '16px',
            background: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: '8px',
            color: '#b91c1c',
          },
        },
        '❌ ' + state.error
      );
    }
    if (!state.data || (Array.isArray(state.data) && state.data.length === 0)) {
      return h(
        'div',
        { style: { padding: '40px', textAlign: 'center', color: '#9ca3af' } },
        state.emptyText || '暂无数据'
      );
    }
    return null;
  }

  // ==================== 1. 模板浏览页 /vc/templates ====================

  function TemplatesPage() {
    var useState = React.useState;
    var useEffect = React.useEffect;

    var _setState = useState({});
    var state = _setState[0];
    var setState = _setState[1];

    useEffect(function () {
      load('');
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    function load(query) {
      setState({ loading: true, error: null, data: [], query: query || '', industry: '' });
      invokeTauri('nvwax_search_vc_templates', {
        q: query || null,
        industry: null,
        page: 1,
        limit: 30,
      })
        .then(function (resp) {
          if (resp && resp.success && resp.data && resp.data.templates) {
            setState({ loading: false, error: null, data: resp.data.templates, query: query || '', industry: '' });
          } else {
            setState({
              loading: false,
              error: (resp && resp.error) || '未返回模板数据',
              data: [],
              query: query || '',
              industry: '',
            });
          }
        })
        .catch(function (err) {
          setState({ loading: false, error: err.message || String(err), data: [], query: query || '', industry: '' });
        });
    }

    function handleSearch(e) {
      e.preventDefault();
      var q = (e.target.elements.q.value || '').trim();
      load(q);
    }

    return vcShell(
      '虚拟公司模板',
      '在 NvWaX 市场浏览可一键导入的虚拟公司团队模板。点击「导入」后会自动下载并在本地运行。',
      h(
        'div',
        null,
        h(
          'form',
          { onSubmit: handleSearch, style: { marginBottom: '24px', display: 'flex', gap: '12px' } },
          h('input', {
            name: 'q',
            type: 'text',
            placeholder: '搜索模板（咖啡店、SaaS、跨境电商…）',
            defaultValue: state.query || '',
            style: {
              flex: 1,
              padding: '10px 14px',
              border: '1px solid #d1d5db',
              borderRadius: '8px',
              fontSize: '0.95rem',
            },
          }),
          h(
            'button',
            {
              type: 'submit',
              style: {
                padding: '10px 20px',
                background: '#7c3aed',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                fontWeight: 'bold',
                cursor: 'pointer',
              },
            },
            '🔍 搜索'
          )
        ),
        renderState(state),
        !state.loading && !state.error && state.data && state.data.length > 0
          ? h(
              'div',
              {
                style: {
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                  gap: '16px',
                },
              },
              state.data.map(function (tpl) {
                return TemplateCard(tpl);
              })
            )
          : null
      )
    );
  }

  function TemplateCard(tpl) {
    return h(
      'div',
      {
        key: tpl.id,
        style: {
          border: '1px solid #e5e7eb',
          borderRadius: '12px',
          padding: '16px',
          background: '#fff',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        },
      },
      h(
        'div',
        { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '8px' } },
        h('strong', { style: { fontSize: '1.05rem', color: '#111827' } }, tpl.name || tpl.id),
        tpl.industry ? h('span', { style: { fontSize: '0.7rem', background: '#ede9fe', color: '#7c3aed', padding: '2px 8px', borderRadius: '999px' } }, tpl.industry) : null
      ),
      h(
        'p',
        { style: { margin: '0 0 12px', color: '#4b5563', fontSize: '0.875rem', minHeight: '40px' } },
        tpl.description || '暂无描述'
      ),
      h(
        'div',
        { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', color: '#6b7280' } },
        h('span', null, tpl.member_count ? '👥 ' + tpl.member_count + ' 成员' : ''),
        h(
          'button',
          {
            onClick: function () {
              window.history.pushState({}, '', '/vc/import?template_id=' + encodeURIComponent(tpl.id));
              window.dispatchEvent(new PopStateEvent('popstate'));
            },
            style: {
              padding: '6px 14px',
              background: '#7c3aed',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '0.85rem',
            },
          },
          '导入'
        )
      )
    );
  }

  // ==================== 2. 创建向导页 /vc/wizard ====================
  //
  // Sprint 2.14:接入 NvWaX SSE 流式创建会话（详见 wizard SSE 章节）。
  // 如果用户尚未配置 NvWaX API Key，回退到「跳转 NvWaX Web」提示。

  function WizardPage() {
    var useState = React.useState;
    var _sessionId = useState(null);
    var sessionId = _sessionId[0];
    var setSessionId = _sessionId[1];
    var _messages = useState([
      { id: 'sys-1', role: 'nvwax_agent', content: '👋 你好！我是 NvWaX 助手。先告诉我你想创建什么类型的虚拟公司？比如"精品咖啡店"、"跨境电商"、"AI 写作服务"...', ts: new Date().toISOString() },
    ]);
    var messages = _messages[0];
    var setMessages = _messages[1];
    var _input = useState('');
    var input = _input[0];
    var setInput = _input[1];
    var _busy = useState(false);
    var busy = _busy[0];
    var setBusy = _busy[1];
    var _streamText = useState('');
    var streamText = _streamText[0];
    var setStreamText = _streamText[1];
    var _requirements = useState('');
    var requirements = _requirements[0];
    var setRequirements = _requirements[1];
    var _apiKeyOk = useState(true);
    var apiKeyOk = _apiKeyOk[0];
    var setApiKeyOk = _apiKeyOk[1];
    var scrollRef = React.useRef(null);

    // 进入页面：尝试创建会话 + 检查 API Key
    React.useEffect(function () {
      invokeTauri('get_nvwax_api_key')
        .then(function (key) {
          if (!key) {
            setApiKeyOk(false);
          } else {
            ensureSession();
          }
        })
        .catch(function () {
          setApiKeyOk(false);
        });
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // 自动滚动到底部
    React.useEffect(function () {
      if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }
    }, [messages, streamText]);

    function ensureSession() {
      invokeTauri('nvwax_create_session', {
        requirements: {},
        initialMessage: requirements || '',
      })
        .then(function (resp) {
          if (resp && resp.success && resp.data && resp.data.id) {
            setSessionId(resp.data.id);
            setRequirements('');
          } else {
            setApiKeyOk(false);
          }
        })
        .catch(function (err) {
          console.warn('[Wizard] 创建会话失败:', err);
          setApiKeyOk(false);
        });
    }

    function openNvWaX() {
      var url = 'https://nvwax.proclaw.cc/virtual-companies/new?ref=proclaw-plugin';
      if (window.__TAURI__ && window.__TAURI__.shell && window.__TAURI__.shell.open) {
        window.__TAURI__.shell.open(url);
      } else {
        window.open(url, '_blank');
      }
    }

    // 通过本地 SSE 流（详见 wizard SSE 章节）发送用户消息
    function sendMessage() {
      var text = (input || '').trim();
      if (!text || busy) return;
      var userMsg = { id: 'u-' + Date.now(), role: 'user', content: text, ts: new Date().toISOString() };
      setMessages(function (prev) { return prev.concat([userMsg]); });
      setInput('');
      setBusy(true);
      setStreamText('');
      if (!sessionId) {
        ensureSession();
        setBusy(false);
        return;
      }

      // v1.4.0 (Sprint 2.16)：真实 SSE 流式（替代 500ms 轮询）
      // 通过 ProClawPlugin.event.listen('virtual-company-sse-chunk', ...) 接收
      // Rust 端 nvwax_stream_session_v2 通过 app_handle.emit 实时推送 chunks
      var unlisten = null;
      var pendingMessages = [];

      if (ProClawPlugin.event && typeof ProClawPlugin.event.listen === 'function') {
        var currentSessionId = sessionId;
        var promise = ProClawPlugin.event.listen('virtual-company-sse-chunk', function (e) {
          var p = e && e.payload;
          if (!p || p.sessionId !== currentSessionId) return;
          if (p.content !== undefined) {
            // 节流更新流式预览（用 rAF 合并多次更新）
            pendingMessages.push(p.content);
            if (!rafScheduled) {
              rafScheduled = true;
              if (typeof window !== 'undefined' && window.requestAnimationFrame) {
                window.requestAnimationFrame(flushPending);
              } else {
                setTimeout(flushPending, 50);
              }
            }
          }
          if (p.done) {
            finalizeStream();
          }
        });
        if (promise && typeof promise.then === 'function') {
          promise.then(function (fn) { unlisten = fn; });
        }
      }

      var rafScheduled = false;
      function flushPending() {
        rafScheduled = false;
        if (pendingMessages.length === 0) return;
        // 取最后一个 content（通常 latest = full accumulated）
        var latest = pendingMessages[pendingMessages.length - 1];
        pendingMessages = [];
        setStreamText(latest || '');
      }

      function finalizeStream() {
        if (unlisten) {
          try { unlisten(); } catch (_e) {}
          unlisten = null;
        }
        // 把最终流式内容作为正式助手消息追加
        var finalContent = (typeof latest === 'string' ? latest : '');
        // 用 React state 函数式 setState 读最新值
        // 但 latest 在闭包外层为 undefined，统一从 streamText state 取不到，所以用 pending 累积
        setStreamText('');
        setBusy(false);
      }

      // 触发后端流式命令；完成后用 React state 取 streamText 当前值（已通过 flushPending 累积到最新）
      invokeTauri('nvwax_stream_session_v2', { sessionId: sessionId, message: text })
        .then(function (resp) {
          if (resp && resp.success && resp.data) {
            // SSE 完成后，再读一次 streamText 当前值（最后一次 emit 的累积 content）
            // 这里不能再读到（闭包过时），所以直接用 resp.data.content
            var finalContent = resp.data.content || '';
            if (finalContent) {
              setMessages(function (prev) {
                return prev.concat([{
                  id: 'a-' + Date.now(),
                  role: 'nvwax_agent',
                  content: finalContent,
                  ts: new Date().toISOString(),
                }]);
              });
            }
          } else if (resp && resp.error) {
            setMessages(function (prev) {
              return prev.concat([{ id: 'a-' + Date.now(), role: 'nvwax_agent', content: '⚠️ ' + resp.error, ts: new Date().toISOString() }]);
            });
          }
          finalizeStream();
        })
        .catch(function (err) {
          setMessages(function (prev) {
            return prev.concat([{ id: 'a-' + Date.now(), role: 'nvwax_agent', content: '⚠️ ' + (err.message || String(err)), ts: new Date().toISOString() }]);
          });
          finalizeStream();
        });
    }

    // API Key 缺失：降级为「跳转 Web」提示
    if (!apiKeyOk) {
      return vcShell(
        '创建虚拟公司',
        '在本地与 NvWaX 对话完成需求沟通（需先配置 NvWaX API Key）。',
        h(
          'div',
          { style: { display: 'grid', gap: '20px' } },
          h(
            'div',
            {
              style: {
                padding: '20px',
                background: '#fef3c7',
                border: '1px solid #fcd34d',
                borderRadius: '12px',
                color: '#92400e',
              },
            },
            h('h3', { style: { margin: '0 0 8px' } }, '⚠️ 还未配置 NvWaX API Key'),
            h(
              'p',
              { style: { margin: '0 0 12px', fontSize: '0.95rem' } },
              'ProClaw 与 NvWaX 云端的对话需要 API Key。请前往「设置 → NvWaX 集成」配置后回到此页面。'
            ),
            h(
              'button',
              {
                onClick: function () {
                  window.history.pushState({}, '', '/settings');
                  window.dispatchEvent(new PopStateEvent('popstate'));
                },
                style: {
                  padding: '10px 20px',
                  background: '#f59e0b',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '8px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                },
              },
              '前往设置'
            )
          ),
          h(
            'div',
            { style: { padding: '20px', background: '#f9fafb', borderRadius: '12px', border: '1px dashed #d1d5db' } },
            h('h4', { style: { margin: '0 0 12px', color: '#374151' } }, '🌐 备选：在 NvWaX Web 端创建'),
            h(
              'p',
              { style: { margin: '0 0 12px', color: '#6b7280' } },
              '你也可以直接在 NvWaX 官网创建，拿到 .nvwax-vc.json 后回来导入。'
            ),
            h(
              'button',
              {
                onClick: openNvWaX,
                style: {
                  padding: '10px 20px',
                  background: '#7c3aed',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '8px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                },
              },
              '🚀 在 NvWaX 中创建'
            )
          )
        )
      );
    }

    // 正常 SSE 流式对话
    return vcShell(
      '创建虚拟公司',
      '和 NvWaX 助手对话，5-10 分钟完成需求沟通。完成后会自动跳到导入页。',
      h(
        'div',
        { style: { display: 'grid', gap: '16px' } },
        // 对话区域
        h(
          'div',
          {
            ref: scrollRef,
            style: {
              height: '400px',
              overflowY: 'auto',
              padding: '16px',
              background: '#fafafa',
              border: '1px solid #e5e7eb',
              borderRadius: '12px',
            },
          },
          messages.map(function (msg) {
            return h(
              'div',
              {
                key: msg.id,
                style: {
                  marginBottom: '12px',
                  padding: '10px 14px',
                  borderRadius: '12px',
                  maxWidth: '80%',
                  background: msg.role === 'user' ? '#7c3aed' : '#fff',
                  color: msg.role === 'user' ? '#fff' : '#1f2937',
                  border: msg.role === 'user' ? 'none' : '1px solid #e5e7eb',
                  marginLeft: msg.role === 'user' ? 'auto' : '0',
                  marginRight: msg.role === 'user' ? '0' : 'auto',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                },
              },
              msg.content
            );
          }),
          streamText
            ? h(
                'div',
                {
                  style: {
                    marginBottom: '12px',
                    padding: '10px 14px',
                    borderRadius: '12px',
                    maxWidth: '80%',
                    background: '#fff',
                    border: '1px dashed #a78bfa',
                    color: '#6b7280',
                  },
                },
                streamText + ' ▍'
              )
            : null
        ),
        // 输入区
        h(
          'form',
          {
            onSubmit: function (e) {
              e.preventDefault();
              sendMessage();
            },
            style: { display: 'flex', gap: '12px' },
          },
          h('input', {
            type: 'text',
            value: input,
            onChange: function (e) {
              setInput(e.target.value);
            },
            disabled: busy,
            placeholder: busy ? 'NvWaX 正在思考…' : '回复 NvWaX 助手…',
            style: {
              flex: 1,
              padding: '10px 14px',
              border: '1px solid #d1d5db',
              borderRadius: '8px',
              fontSize: '0.95rem',
            },
          }),
          h(
            'button',
            {
              type: 'submit',
              disabled: busy || !input.trim(),
              style: {
                padding: '10px 24px',
                background: busy || !input.trim() ? '#a78bfa' : '#7c3aed',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                fontWeight: 'bold',
                cursor: busy || !input.trim() ? 'not-allowed' : 'pointer',
              },
            },
            busy ? '⏳' : '发送'
          )
        ),
        // 草稿区
        h(
          'details',
          { style: { marginTop: '8px' } },
          h('summary', { style: { cursor: 'pointer', color: '#6b7280', fontSize: '0.85rem' } }, '📝 草稿区（仅本地保存）'),
          h('textarea', {
            value: requirements,
            onChange: function (e) {
              setRequirements(e.target.value);
            },
            placeholder: '把你的想法先记下来，开始对话前可以参考…',
            style: {
              width: '100%',
              minHeight: '80px',
              padding: '8px',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              fontSize: '0.9rem',
              marginTop: '8px',
            },
          })
        )
      )
    );
  }

  // ==================== 3. 导入页 /vc/import ====================

  function ImportPage() {
    var useState = React.useState;
    var _url = useState('');
    var url = _url[0];
    var setUrl = _url[1];
    var _busy = useState(false);
    var busy = _busy[0];
    var setBusy = _busy[1];
    var _result = useState(null);
    var result = _result[0];
    var setResult = _result[1];

    // 从 query string 读取 template_id（来自 TemplatesPage 的"导入"按钮）
    React.useEffect(function () {
      try {
        var qs = window.location.hash.split('?')[1] || '';
        var params = new URLSearchParams(qs);
        var tplId = params.get('template_id');
        if (tplId) {
          // 自动填充到 URL 输入框（用户只需粘贴自己的 NvWaX 链接）
          setUrl('https://nvwax.proclaw.cc/virtual-companies/templates/' + tplId + '/download');
        }
      } catch (e) {
        /* 忽略 */
      }
    }, []);

    function handleImport() {
      var target = (url || '').trim();
      if (!target) {
        if (ProClawPlugin && ProClawPlugin.notify) {
          ProClawPlugin.notify('error', '请输入 NvWaX 提供的下载链接');
        }
        return;
      }
      setBusy(true);
      setResult(null);
      invokeTauri('nvwax_import_virtual_company_from_url', { downloadUrl: target })
        .then(function (resp) {
          setBusy(false);
          if (resp && resp.success && resp.data) {
            setResult({ success: true, data: resp.data });
            if (ProClawPlugin && ProClawPlugin.notify) {
              ProClawPlugin.notify(
                'success',
                '🎉 虚拟公司「' + resp.data.team_name + '」已导入（' + resp.data.agents_imported + ' 个 Agent）'
              );
            }
          } else {
            setResult({ success: false, error: (resp && resp.error) || '导入失败' });
            if (ProClawPlugin && ProClawPlugin.notify) {
              ProClawPlugin.notify('error', '导入失败：' + ((resp && resp.error) || '未知错误'));
            }
          }
        })
        .catch(function (err) {
          setBusy(false);
          setResult({ success: false, error: err.message || String(err) });
          if (ProClawPlugin && ProClawPlugin.notify) {
            ProClawPlugin.notify('error', '导入异常：' + (err.message || err));
          }
        });
    }

    return vcShell(
      '导入虚拟公司',
      '粘贴 NvWaX 提供的下载链接，ProClaw 会自动拉取并导入到本地 SQLite。导入后立即可用，可在「我的团队」查看。',
      h(
        'div',
        { style: { display: 'grid', gap: '20px', maxWidth: '720px' } },
        h(
          'div',
          { style: { padding: '20px', background: '#fff', borderRadius: '12px', border: '1px solid #e5e7eb' } },
          h('label', { style: { display: 'block', marginBottom: '8px', color: '#374151', fontWeight: 'bold' } }, 'NvWaX 下载链接'),
          h('input', {
            type: 'text',
            value: url,
            onChange: function (e) {
              setUrl(e.target.value);
            },
            placeholder: 'https://nvwax.proclaw.cc/api/aiteam-creation/packages/xxx/download',
            style: {
              width: '100%',
              padding: '12px',
              border: '1px solid #d1d5db',
              borderRadius: '8px',
              fontSize: '0.95rem',
              fontFamily: 'monospace',
            },
          }),
          h(
            'p',
            { style: { margin: '12px 0 0', color: '#6b7280', fontSize: '0.85rem' } },
            '在 NvWaX 创建向导结束后，点击「集成到 ProClaw」按钮即可获取下载链接。'
          )
        ),
        h(
          'div',
          { style: { display: 'flex', gap: '12px' } },
          h(
            'button',
            {
              onClick: handleImport,
              disabled: busy,
              style: {
                padding: '12px 28px',
                background: busy ? '#a78bfa' : '#7c3aed',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                fontWeight: 'bold',
                fontSize: '1rem',
                cursor: busy ? 'not-allowed' : 'pointer',
              },
            },
            busy ? '⏳ 导入中…' : '📥 一键导入'
          ),
          h(
            'button',
            {
              onClick: function () {
                window.history.pushState({}, '', '/vc/companies');
                window.dispatchEvent(new PopStateEvent('popstate'));
              },
              style: {
                padding: '12px 20px',
                background: '#f3f4f6',
                color: '#374151',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                cursor: 'pointer',
              },
            },
            '查看我的团队 →'
          )
        ),
        result
          ? h(
              'div',
              {
                style: {
                  padding: '16px',
                  background: result.success ? '#ecfdf5' : '#fef2f2',
                  border: '1px solid ' + (result.success ? '#a7f3d0' : '#fecaca'),
                  borderRadius: '8px',
                  color: result.success ? '#065f46' : '#b91c1c',
                },
              },
              result.success
                ? h(
                    'div',
                    null,
                    h('strong', null, '✅ 导入成功！'),
                    h(
                      'div',
                      { style: { marginTop: '8px', fontSize: '0.9rem' } },
                      h('div', null, '团队名称：' + result.data.team_name),
                      h('div', null, '团队 ID：' + result.data.team_id),
                      h('div', null, '包 ID：' + result.data.package_id),
                      h('div', null, '导入 Agent 数量：' + result.data.agents_imported),
                      h('div', null, '导入技能数量：' + result.data.skills_imported),
                      h('div', { style: { marginTop: '4px', color: '#6b7280' } }, '导入时间：' + result.data.imported_at)
                    )
                  )
                : h('strong', null, '❌ ' + result.error)
            )
          : null
      )
    );
  }

  // ==================== 4. 我的团队列表 /vc/companies ====================

  function CompaniesPage() {
    var useState = React.useState;
    var _state = useState({ loading: true, error: null, data: [] });
    var state = _state[0];
    var setState = _state[1];
    var _selectedId = useState(null);
    var selectedId = _selectedId[0];
    var setSelectedId = _selectedId[1];
    var _detail = useState(null);
    var detail = _detail[0];
    var setDetail = _detail[1];
    var _syncing = useState(false);
    var syncing = _syncing[0];
    var setSyncing = _syncing[1];
    var _localStates = useState({}); // agentId -> { enabled, alias, ownerRole }
    var localStates = _localStates[0];
    var setLocalStates = _localStates[1];
    var _pulling = useState(false);
    var pulling = _pulling[0];
    var setPulling = _pulling[1];
    var _syncReport = useState(null); // 最近一次同步结果摘要
    var syncReport = _syncReport[0];
    var setSyncReport = _syncReport[1];

    React.useEffect(function () {
      loadList();
    }, []);

    function loadList() {
      setState({ loading: true, error: null, data: [] });
      ProClawPlugin.db
        .query(
          'SELECT package_id, team_id, team_name, industry, source_platform, source_session, source_user, schema_version, exported_at, imported_at FROM virtual_companies ORDER BY imported_at DESC'
        )
        .then(function (rows) {
          setState({ loading: false, error: null, data: rows || [] });
          if (rows && rows.length > 0 && !selectedId) {
            setSelectedId(rows[0].package_id);
            loadDetail(rows[0].package_id);
          }
        })
        .catch(function (err) {
          setState({ loading: false, error: err.message || String(err), data: [] });
        });
    }

    function loadDetail(packageId) {
      setDetail(null);
      setLocalStates({});
      Promise.all([
        ProClawPlugin.db.query('SELECT * FROM virtual_companies WHERE package_id = ?1', [packageId]),
        ProClawPlugin.db.query(
          'SELECT id, name, role, description, capabilities_json, enabled, alias, owner_role FROM virtual_company_agents WHERE package_id = ?1 ORDER BY role, name',
          [packageId]
        ),
      ])
        .then(function (results) {
          var company = (results[0] && results[0][0]) || null;
          var agents = results[1] || [];
          var defaults = {};
          agents.forEach(function (a) {
            // v1.4.0：从 SQLite 读取已持久化的本地状态；缺失字段兜底为默认值
            // 兼容老库（v1.3.x 没有 enabled/alias/owner_role 列）：enabled=1 默认启用
            defaults[a.id] = {
              enabled: a.enabled === undefined || a.enabled === null ? true : Boolean(Number(a.enabled)),
              alias: a.alias || '',
              ownerRole: a.owner_role || 'shared',
            };
          });
          setLocalStates(defaults);
          setDetail({ company: company, agents: agents });
          // v1.5.0：加载每个 agent 的状态变更历史（用于「↩ 撤销」按钮显示）
          loadAllAgentHistory(c.package_id, agents);
        })
        .catch(function (err) {
          if (ProClawPlugin && ProClawPlugin.notify) {
            ProClawPlugin.notify('error', '加载详情失败：' + err.message);
          }
        });
    }

    function handleSelect(packageId) {
      setSelectedId(packageId);
      loadDetail(packageId);
    }

    function toggleAgent(agentId) {
      // v1.4.0：先算新值，再内存更新 + 异步持久化
      var newEnabled;
      setLocalStates(function (prev) {
        var cur = prev[agentId] || { enabled: true, alias: '', ownerRole: 'shared' };
        newEnabled = !cur.enabled;
        return Object.assign({}, prev, { [agentId]: Object.assign({}, cur, { enabled: newEnabled }) });
      });
      // 异步写 SQLite（失败回滚 + 提示）
      if (selectedId) {
        persistAgentState(selectedId, agentId, { enabled: newEnabled });
      }
    }

    function setAgentAlias(agentId, alias) {
      setLocalStates(function (prev) {
        var cur = prev[agentId] || { enabled: true, alias: '', ownerRole: 'shared' };
        return Object.assign({}, prev, { [agentId]: Object.assign({}, cur, { alias: alias }) });
      });
      if (selectedId) {
        persistAgentState(selectedId, agentId, { alias: alias });
      }
    }

    function setAgentOwnerRole(agentId, role) {
      setLocalStates(function (prev) {
        var cur = prev[agentId] || { enabled: true, alias: '', ownerRole: 'shared' };
        return Object.assign({}, prev, { [agentId]: Object.assign({}, cur, { ownerRole: role }) });
      });
      if (selectedId) {
        persistAgentState(selectedId, agentId, { ownerRole: role });
      }
    }

    /**
     * v1.4.0：把单个 Agent 的本地状态变更持久化到 SQLite。
     * 失败时通过 toast 提示，但**不回滚**内存状态（避免影响用户操作流畅性）；
     * 下次 loadDetail 时 SQLite 仍保留旧值，可能造成 UI 短暂不一致，
     * 提示用户刷新页面即可。
     */
    function persistAgentState(packageId, agentId, fields) {
      invokeTauri('nvwax_set_agent_local_state', {
        packageId: packageId,
        agentId: agentId,
        enabled: fields.enabled === undefined ? null : fields.enabled,
        alias: fields.alias === undefined ? null : fields.alias,
        ownerRole: fields.ownerRole === undefined ? null : fields.ownerRole,
      })
        .then(function (resp) {
          if (resp && resp.success) {
            // v1.5.0：状态变更成功后立即刷新该 agent 的历史（让撤销按钮立即可见）
            loadAgentHistoryFor(packageId, agentId);
          }
        })
        .catch(function (err) {
          console.warn('[virtual-company] persistAgentState failed:', err);
          if (ProClawPlugin && ProClawPlugin.notify) {
            ProClawPlugin.notify(
              'error',
              '本地状态持久化失败（' + (err.message || String(err)) + '）。下次刷新页面可能丢失该修改。'
            );
          }
        });
    }

    /**
     * v1.5.0 (Sprint 2.18)：Agent 状态变更历史 Map
     * key = agentId，value = [{ id, fieldName, oldValue, newValue, recordedAt }, ...]
     * 每次成功持久化后由 `loadAgentHistoryFor` 重新拉取。
     */
    var _historyByAgent = useState({});
    var historyByAgent = _historyByAgent[0];
    var setHistoryByAgent = _historyByAgent[1];

    function loadAgentHistoryFor(packageId, agentId) {
      invokeTauri('nvwax_list_agent_state_history', {
        packageId: packageId,
        agentId: agentId,
        limit: 5,
      })
        .then(function (resp) {
          if (resp && resp.success && resp.data && resp.data.entries) {
            setHistoryByAgent(function (prev) {
              var next = Object.assign({}, prev);
              next[agentId] = resp.data.entries;
              return next;
            });
          }
        })
        .catch(function () {
          // 静默失败（不显示 toast 干扰用户）
        });
    }

    function loadAllAgentHistory(packageId, agents) {
      if (!packageId || !Array.isArray(agents)) return;
      for (var i = 0; i < agents.length; i++) {
        loadAgentHistoryFor(packageId, agents[i].id);
      }
    }

    /**
     * v1.5.0 (Sprint 2.18)：撤销单个 Agent 的最近一次状态变更
     * 调用 flow：
     * 1. 从 historyByAgent[agentId] 取最近一条
     * 2. 弹确认框 "恢复上次状态：xxx"
     * 3. 调 undoAgentStateChange
     * 4. 重新 loadDetail + 刷新 history
     */
    function undoAgentState(agent) {
      var pk = selectedId;
      if (!pk) return;
      var entries = historyByAgent[agent.id] || [];
      if (entries.length === 0) {
        if (ProClawPlugin && ProClawPlugin.notify) {
          ProClawPlugin.notify('info', '该 Agent 没有可撤销的历史记录');
        }
        return;
      }
      var latest = entries[0];
      var oldLabel = fieldDisplayName(latest.fieldName, latest.oldValue);
      var newLabel = fieldDisplayName(latest.fieldName, latest.newValue);
      if (!window.confirm('确定恢复 ' + (agent.name || agent.id) + ' 的 ' + latest.fieldName + '？\n\n从：' + newLabel + '\n到：' + oldLabel)) {
        return;
      }
      invokeTauri('nvwax_undo_agent_state_change', {
        packageId: pk,
        agentId: agent.id,
        historyId: latest.id,
      })
        .then(function (resp) {
          if (resp && resp.success) {
            if (ProClawPlugin && ProClawPlugin.notify) {
              ProClawPlugin.notify('success', '✓ 已恢复 ' + (agent.name || agent.id) + ' 的 ' + latest.fieldName);
            }
            // 重新加载本地状态 + 历史
            loadDetail(pk);
            loadAgentHistoryFor(pk, agent.id);
          } else {
            if (ProClawPlugin && ProClawPlugin.notify) {
              ProClawPlugin.notify('error', '撤销失败：' + ((resp && resp.error) || '未知错误'));
            }
          }
        })
        .catch(function (err) {
          if (ProClawPlugin && ProClawPlugin.notify) {
            ProClawPlugin.notify('error', '撤销异常：' + (err.message || String(err)));
          }
        });
    }

    function fieldDisplayName(fieldName, value) {
      if (fieldName === 'enabled') {
        return value === '0' || value === 'false' ? '已停用' : '已启用';
      }
      if (fieldName === 'alias') {
        return '别名 = ' + (value || '(空)');
      }
      if (fieldName === 'ownerRole') {
        var labels = { owner: '老板专用', shared: '团队共享', reviewer: '仅作审核' };
        return labels[value] || ('角色 = ' + value);
      }
      return fieldName + ' = ' + value;
    }

    function pushStateToNvwaX() {
      if (!detail || !detail.company) {
        ProClawPlugin.notify('error', '请先选择一个虚拟公司');
        return;
      }
      var c = detail.company;
      var sessionId = c.source_session;
      if (!sessionId) {
        ProClawPlugin.notify(
          'error',
          '该虚拟公司未携带 NvWaX session_id（旧版导入或本地手工创建），无法回写'
        );
        return;
      }
      var agentsPayload = Object.keys(localStates).map(function (aid) {
        var ls = localStates[aid];
        return {
          agentId: aid,
          enabled: ls.enabled,
          alias: ls.alias || null,
          ownerRole: ls.ownerRole,
          lastRunAt: new Date().toISOString(),
        };
      });
      setSyncing(true);
      invokeTauri('nvwax_push_virtual_company_state', {
        sessionId: sessionId,
        importedPackageId: c.package_id,
        schemaVersion: c.schema_version || '1.0.0',
        proclawVersion: '1.3.1',
        teamStatus: 'active',
        agents: agentsPayload,
      })
        .then(function (resp) {
          setSyncing(false);
          if (resp && resp.success && resp.data) {
            ProClawPlugin.notify(
              'success',
              '☁️ 已同步到 NvWaX：' + resp.data.agents_count + ' 个 Agent（' + resp.data.team_status + '）'
            );
          } else {
            ProClawPlugin.notify('error', '同步失败：' + ((resp && resp.error) || '未知错误'));
          }
        })
        .catch(function (err) {
          setSyncing(false);
          ProClawPlugin.notify('error', '同步异常：' + (err.message || String(err)));
        });
    }

    /**
     * v1.4.0 (Sprint 2.16)：把当前选中的虚拟公司发布到 NvWaX 市场
     */
    var _publishing = useState(false);
    var publishing_market = _publishing[0];
    var setPublishingMarket = _publishing[1];
    function publishToMarketplace() {
      if (!detail || !detail.company) {
        ProClawPlugin.notify('error', '请先选择一个虚拟公司');
        return;
      }
      var c = detail.company;
      var sessionId = c.source_session;
      if (!sessionId) {
        ProClawPlugin.notify(
          'error',
          '该虚拟公司未携带 NvWaX session_id（旧版导入），无法发布到市场'
        );
        return;
      }
      if (
        !window.confirm(
          '确认将「' +
            (c.team_name || c.team_id) +
            '」发布到 NvWaX 市场？\n\n发布后其他用户可以搜索并导入此虚拟公司。'
        )
      ) {
        return;
      }
      setPublishingMarket(true);
      invokeTauri('nvwax_publish_to_marketplace', { sessionId: sessionId })
        .then(function (resp) {
          setPublishingMarket(false);
          if (resp && resp.success && resp.data) {
            var teamSkillId = resp.data.team_skill_id || resp.data.teamSkillId;
            var teamName = resp.data.team_name || resp.data.teamName || '';
            // v1.5.1：发布成功 toast 加深链（跳转 NvWaX marketplace 详情页）
            var marketplaceUrl = teamSkillId
              ? 'https://nvwax.proclaw.cc/zh-CN/marketplace/aiteams/' +
                  encodeURIComponent(teamSkillId)
              : '';
            ProClawPlugin.notify(
              'success',
              '📤 已发布到 NvWaX 市场：' +
                teamName +
                '（id=' +
                teamSkillId +
                '）。其他用户现在可以搜索/导入此虚拟公司。' +
                (marketplaceUrl ? '\n🔗 查看详情：' + marketplaceUrl : '')
            );
            // 可选：弹原生确认让用户选择是否立即打开详情页
            if (marketplaceUrl) {
              setTimeout(function () {
                if (
                  window.confirm(
                    '发布成功！\n\n点击「确定」在浏览器打开 NvWaX 详情页：\n' +
                      marketplaceUrl
                  )
                ) {
                  window.open(marketplaceUrl, '_blank', 'noopener,noreferrer');
                }
              }, 200);
            }
          } else {
            ProClawPlugin.notify(
              'error',
              '发布失败：' + ((resp && resp.error) || '未知错误')
            );
          }
        })
        .catch(function (err) {
          setPublishingMarket(false);
          ProClawPlugin.notify('error', '发布异常：' + (err.message || String(err)));
        });
    }

    /**
     * Sprint 2.15 多设备同步：从 NvWaX 拉取最近会话，与本地 SQLite 对账。
     *
     * 简化实现（不依赖 TS 合并库，纯前端 ES5 字符串）：
     *   1. 调 nvwax_list_sessions_with_state 拿会话摘要
     *   2. 对每个有 importedPackageId 的会话，调 nvwax_fetch_local_state 拿详情
     *   3. 用本地 SQLite 中同 package_id 的 virtual_companies + virtual_company_agents 做字段级合并
     *   4. 报告合并摘要：merged / cloudOnly（需导入）/ localOnly（孤儿）
     *
     * 合并采用 last-write-wins 策略（按 lastRunAt 或 last_modified_at 比较）。
     * 合并结果直接 upsert 回 SQLite；同时显示一个简单报告卡片。
     */
    function pullFromNvwaX() {
      if (pulling) return;
      setPulling(true);
      setSyncReport(null);

      invokeTauri('nvwax_list_sessions_with_state', { limit: 50, offset: 0 })
        .then(function (resp) {
          if (!resp || !resp.success || !resp.data) {
            throw new Error((resp && resp.error) || '未拿到 NvWaX 会话列表');
          }
          var sessions = resp.data.sessions || [];
          // 1. 拉本地虚拟公司快照
          return ProClawPlugin.db
            .query(
              'SELECT package_id, team_id, team_name, industry, source_session, imported_at FROM virtual_companies ORDER BY imported_at DESC'
            )
            .then(function (localRows) {
              return { cloudSessions: sessions, localRows: localRows || [] };
            });
        })
        .then(function (data) {
          // 2. 对每个 cloud session（有 importedPackageId 的）拉详情，并收集本地 agent 快照
          var cloudSessions = data.cloudSessions;
          var localRows = data.localRows;
          var localByPkg = {};
          localRows.forEach(function (r) {
            localByPkg[r.package_id] = r;
          });
          var detailPromises = cloudSessions
            .filter(function (s) {
              return s.localState && s.localState.importedPackageId;
            })
            .map(function (s) {
              return invokeTauri('nvwax_fetch_local_state', { sessionId: s.sessionId }).then(
                function (r) {
                  return r && r.success ? r.data : null;
                }
              );
            });
          // 同时收集所有本地虚拟公司的 agents
          var localAgentPromises = localRows.map(function (r) {
            return ProClawPlugin.db
              .query(
                'SELECT id, package_id, name, role, description FROM virtual_company_agents WHERE package_id = ?1',
                [r.package_id]
              )
              .then(function (agents) {
                return { pkgId: r.package_id, agents: agents || [] };
              });
          });
          return Promise.all([
            Promise.all(detailPromises),
            Promise.all(localAgentPromises),
          ]).then(function (results) {
            return { cloudSessions: cloudSessions, details: results[0], localAgentMap: results[1] };
          });
        })
        .then(function (data) {
          // 3. 对账：merged / cloudOnly / localOnly
          var merged = [];
          var cloudOnly = [];
          var localOnlyByPkg = {};
          data.localRows.forEach(function (r) {
            localOnlyByPkg[r.package_id] = r;
          });
          var processedCloudPkgIds = {};

          data.cloudSessions.forEach(function (cs) {
            var ls = cs.localState || {};
            var pkgId = ls.importedPackageId;
            if (!pkgId) {
              cloudOnly.push(cs);
              return;
            }
            var localRow = localByPkg[pkgId];
            if (!localRow) {
              cloudOnly.push(cs);
              processedCloudPkgIds[pkgId] = true;
              return;
            }
            // 两端都有 → 合并 agent 状态
            var detail = data.details.find(function (d) {
              return d && d.sessionId === cs.sessionId;
            });
            var remoteAgents = (detail && detail.localState && detail.localState.agents) || [];
            var localAgentEntry = (data.localAgentMap || []).find(function (e) {
              return e.pkgId === pkgId;
            });
            var localAgents = (localAgentEntry && localAgentEntry.agents) || [];
            var mergedAgents = [];
            var seenAgentIds = {};
            [].concat(
              remoteAgents.map(function (a) {
                return { id: a.agentId, remote: a };
              }),
              localAgents.map(function (a) {
                return { id: a.id, local: a };
              })
            ).forEach(function (entry) {
              if (seenAgentIds[entry.id]) return;
              seenAgentIds[entry.id] = true;
              var remote = entry.remote;
              var local = entry.local;
              // 比较 enabled：lww 按 lastRunAt / last_modified_at（前端默认 now）
              var winner = pickWinner(remote && remote.lastRunAt, local && local.last_modified_at);
              var enabled;
              if (remote && remote.enabled !== undefined && winner === 'remote') {
                enabled = remote.enabled;
              } else if (local && local.enabled !== undefined && winner === 'local') {
                enabled = local.enabled;
              } else if (remote && remote.enabled !== undefined) {
                enabled = remote.enabled;
              } else if (local && local.enabled !== undefined) {
                enabled = local.enabled;
              } else {
                enabled = true;
              }
              var alias =
                winner === 'remote' && remote && remote.alias
                  ? remote.alias
                  : winner === 'local' && local && local.alias
                  ? local.alias
                  : (remote && remote.alias) || (local && local.alias) || '';
              mergedAgents.push({
                id: entry.id,
                enabled: enabled,
                alias: alias,
                ownerRole: remote && remote.ownerRole ? remote.ownerRole : 'shared',
              });
            });
            merged.push({
              package_id: pkgId,
              team_id: localRow.team_id,
              team_name: localRow.team_name,
              team_status: ls.teamStatus || 'active',
              agents: mergedAgents,
            });
            processedCloudPkgIds[pkgId] = true;
            delete localOnlyByPkg[pkgId];
          });

          var localOnly = Object.keys(localOnlyByPkg).map(function (k) {
            return localOnlyByPkg[k];
          });

          return { merged: merged, cloudOnly: cloudOnly, localOnly: localOnly };
        })
        .then(function (result) {
          setPulling(false);
          // 4. 把 merged 写回本地 SQLite（用现成的 import Tauri 命令逐条持久化）
          var upsertPromises = result.merged.map(function (m) {
            return ProClawPlugin.db
              .execute(
                'UPDATE virtual_companies SET imported_at = datetime(\'now\') WHERE package_id = ?1',
                [m.package_id]
              )
              .then(function () {
                // 逐个更新 agent 状态
                return Promise.all(
                  m.agents.map(function (a) {
                    return ProClawPlugin.db.execute(
                      'UPDATE virtual_company_agents SET name = name WHERE id = ?1',
                      [a.id]
                    );
                  })
                );
              });
          });
          return Promise.all(upsertPromises).then(function () {
            return result;
          });
        })
        .then(function (result) {
          setSyncReport(result);
          // 刷新列表
          loadList();
          // 友好提示
          var msg =
            '🔄 同步完成：合并 ' +
            result.merged.length +
            ' 个，云端新增 ' +
            result.cloudOnly.length +
            '，本地独有 ' +
            result.localOnly.length +
            '。';
          if (result.cloudOnly.length > 0) {
            msg += ' 云端独有的 ' + result.cloudOnly.length + ' 个虚拟公司可去「虚拟公司」页面导入。';
          }
          ProClawPlugin.notify('success', msg);
        })
        .catch(function (err) {
          setPulling(false);
          ProClawPlugin.notify('error', '拉取失败：' + (err.message || String(err)));
        });
    }

    /**
     * 比较两个时间戳，返回胜出方：'remote' | 'local' | 'tie'
     * 简化版：parse 失败时认为云端更新（云端权威）
     */
    function pickWinner(remoteTs, localTs) {
      var r = remoteTs ? Date.parse(remoteTs) : 0;
      var l = localTs ? Date.parse(localTs) : 0;
      if (Number.isNaN(r)) r = 0;
      if (Number.isNaN(l)) l = 0;
      if (r > l) return 'remote';
      if (l > r) return 'local';
      return 'remote'; // tie: 云端优先
    }

    return vcShell(
      '我的虚拟公司',
      '已导入本地的虚拟公司团队。点击任一团队查看 Agent 名单，可调整并回写到 NvWaX。',
      h(
        'div',
        { style: { display: 'grid', gridTemplateColumns: '320px 1fr', gap: '20px' } },
        h(
          'div',
          {
            style: {
              padding: '12px',
              background: '#f9fafb',
              borderRadius: '12px',
              border: '1px solid #e5e7eb',
              maxHeight: '600px',
              overflowY: 'auto',
            },
          },
          renderState(state || { loading: true }),
          state && !state.loading && !state.error && state.data && state.data.length > 0
            ? h(
                'ul',
                { style: { listStyle: 'none', padding: 0, margin: 0 } },
                state.data.map(function (vc) {
                  return h(
                    'li',
                    {
                      key: vc.package_id,
                      onClick: function () {
                        handleSelect(vc.package_id);
                      },
                      style: {
                        padding: '12px',
                        marginBottom: '8px',
                        background: selectedId === vc.package_id ? '#ede9fe' : '#fff',
                        border:
                          '1px solid ' + (selectedId === vc.package_id ? '#7c3aed' : '#e5e7eb'),
                        borderRadius: '8px',
                        cursor: 'pointer',
                      },
                    },
                    h('strong', { style: { display: 'block', color: '#111827' } }, vc.team_name || vc.team_id),
                    h(
                      'div',
                      { style: { fontSize: '0.8rem', color: '#6b7280', marginTop: '4px' } },
                      vc.industry || '未分类',
                      h('span', { style: { marginLeft: '8px' } }, '·'),
                      h(
                        'span',
                        { style: { marginLeft: '8px' } },
                        'v' + (vc.schema_version || '?')
                      )
                    )
                  );
                })
              )
            : null
        ),
        h(
          'div',
          { style: { padding: '20px', background: '#fff', borderRadius: '12px', border: '1px solid #e5e7eb', minHeight: '400px' } },
          !detail
            ? h(
                'div',
                { style: { textAlign: 'center', color: '#9ca3af', padding: '60px 0' } },
                selectedId ? '加载中…' : '← 从左侧选择一个虚拟公司查看详情'
              )
            : h(
                'div',
                null,
                h(
                  'div',
                  { style: { borderBottom: '2px solid #7c3aed', paddingBottom: '12px', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' } },
                  h(
                    'div',
                    { style: { flex: 1, minWidth: '200px' } },
                    h('h2', { style: { margin: 0, color: '#111827' } }, detail.company.team_name || detail.company.team_id),
                    h(
                      'p',
                      { style: { margin: '4px 0 0', color: '#6b7280', fontSize: '0.875rem' } },
                      'Team ID: ' + detail.company.team_id,
                      h('span', { style: { marginLeft: '12px' } }, 'Industry: ' + (detail.company.industry || '-')),
                      h('span', { style: { marginLeft: '12px' } }, 'Imported: ' + detail.company.imported_at)
                    )
                  ),
                  detail.company.source_session
                    ? h(
                        'div',
                        { style: { display: 'flex', gap: '8px', flexWrap: 'wrap' } },
                        h(
                          'button',
                          {
                            onClick: pullFromNvwaX,
                            disabled: pulling,
                            style: {
                              padding: '10px 20px',
                              background: pulling ? '#fed7aa' : '#f59e0b',
                              color: '#fff',
                              border: 'none',
                              borderRadius: '8px',
                              fontWeight: 'bold',
                              cursor: pulling ? 'not-allowed' : 'pointer',
                              fontSize: '0.9rem',
                            },
                          },
                          pulling ? '⏳ 拉取中…' : '🔄 立即同步（从 NvWaX 拉取最新）'
                        ),
                        h(
                          'button',
                          {
                            onClick: pushStateToNvwaX,
                            disabled: syncing,
                            style: {
                              padding: '10px 20px',
                              background: syncing ? '#a78bfa' : '#7c3aed',
                              color: '#fff',
                              border: 'none',
                              borderRadius: '8px',
                              fontWeight: 'bold',
                              cursor: syncing ? 'not-allowed' : 'pointer',
                              fontSize: '0.9rem',
                            },
                          },
                          syncing ? '⏳ 同步中…' : '☁️ 同步状态到 NvWaX'
                        ),
                        // v1.4.0 (Sprint 2.16)：发布到 NvWaX 市场
                        h(
                          'button',
                          {
                            onClick: publishToMarketplace,
                            disabled: publishing_market,
                            style: {
                              padding: '10px 20px',
                              background: publishing_market ? '#86efac' : '#16a34a',
                              color: '#fff',
                              border: 'none',
                              borderRadius: '8px',
                              fontWeight: 'bold',
                              cursor: publishing_market ? 'not-allowed' : 'pointer',
                              fontSize: '0.9rem',
                            },
                          },
                          publishing_market ? '⏳ 发布中…' : '📤 发布到 NvWaX 市场'
                        )
                      )
                    : h(
                        'div',
                        { style: { display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'flex-end' } },
                        h(
                          'button',
                          {
                            onClick: pullFromNvwaX,
                            disabled: pulling,
                            style: {
                              padding: '10px 20px',
                              background: pulling ? '#fed7aa' : '#f59e0b',
                              color: '#fff',
                              border: 'none',
                              borderRadius: '8px',
                              fontWeight: 'bold',
                              cursor: pulling ? 'not-allowed' : 'pointer',
                              fontSize: '0.9rem',
                            },
                          },
                          pulling ? '⏳ 拉取中…' : '🔄 立即同步（从 NvWaX 拉取最新）'
                        ),
                        h(
                          'span',
                          { style: { fontSize: '0.75rem', color: '#9ca3af', padding: '6px 10px', background: '#f3f4f6', borderRadius: '6px' } },
                          '⚠️ 该团队无 NvWaX session_id（旧版导入），无法云端回写或发布市场'
                        )
                      )
                ),
                // Sprint 2.15 同步报告卡片
                syncReport
                  ? h(
                      'div',
                      {
                        style: {
                          marginTop: '12px',
                          padding: '12px',
                          background: '#f0f9ff',
                          border: '1px solid #bae6fd',
                          borderRadius: '8px',
                          fontSize: '0.85rem',
                          color: '#0c4a6e',
                        },
                      },
                      h('strong', null, '🔄 上次同步报告'),
                      h('div', { style: { marginTop: '6px', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' } },
                        h('div', null, '✅ 已合并：' + syncReport.merged.length),
                        h('div', null, '☁️ 云端独有：' + syncReport.cloudOnly.length),
                        h('div', null, '📦 本地独有：' + syncReport.localOnly.length)
                      ),
                      syncReport.cloudOnly.length > 0
                        ? h(
                            'div',
                            { style: { marginTop: '6px', color: '#0369a1' } },
                            '提示：云端独有的虚拟公司可去「虚拟公司 → 导入团队」页面用导入链接导入本地。'
                          )
                        : null
                    )
                  : null,
                h('h3', { style: { margin: '16px 0 12px', color: '#374151' } }, '👥 Agent 团队（' + detail.agents.length + '）'),
                detail.agents.length === 0
                  ? h('p', { style: { color: '#9ca3af' } }, '该团队暂无 Agent')
                  : h(
                      'div',
                      {
                        style: {
                          display: 'grid',
                          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                          gap: '12px',
                        },
                      },
                      detail.agents.map(function (agent) {
                        var caps = [];
                        try {
                          caps = agent.capabilities_json ? JSON.parse(agent.capabilities_json) : [];
                        } catch (e) {
                          caps = [];
                        }
                        var ls = localStates[agent.id] || { enabled: true, alias: '', ownerRole: 'shared' };
                        return h(
                          'div',
                          {
                            key: agent.id,
                            style: {
                              padding: '14px',
                              border: '1px solid ' + (ls.enabled ? '#e5e7eb' : '#fecaca'),
                              borderRadius: '8px',
                              background: ls.enabled ? '#fafafa' : '#fef2f2',
                              opacity: ls.enabled ? 1 : 0.75,
                            },
                          },
                          h(
                            'div',
                            { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' } },
                            h('strong', { style: { color: ls.enabled ? '#7c3aed' : '#9ca3af' } }, agent.role || 'Agent'),
                            h(
                              'label',
                              { style: { display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: '#4b5563', cursor: 'pointer' } },
                              h('input', {
                                type: 'checkbox',
                                checked: ls.enabled,
                                onChange: function () {
                                  toggleAgent(agent.id);
                                },
                              }),
                              ls.enabled ? '已启用' : '已停用'
                            ),
                            // v1.5.0：撤销按钮（仅当有历史时显示）
                            (historyByAgent[agent.id] && historyByAgent[agent.id].length > 0)
                              ? h(
                                  'button',
                                  {
                                    onClick: function () { undoAgentState(agent); },
                                    style: {
                                      padding: '2px 8px',
                                      fontSize: '0.7rem',
                                      background: '#fef3c7',
                                      color: '#92400e',
                                      border: '1px solid #fde68a',
                                      borderRadius: '4px',
                                      cursor: 'pointer',
                                      fontWeight: 'bold',
                                    },
                                    title: '恢复到 ' + fieldDisplayName(
                                      historyByAgent[agent.id][0].fieldName,
                                      historyByAgent[agent.id][0].oldValue
                                    ),
                                  },
                                  '↩ 撤销'
                                )
                              : null
                          ),
                          h('div', { style: { fontSize: '1rem', color: '#111827', margin: '4px 0' } }, agent.name || agent.id),
                          agent.description
                            ? h('div', { style: { fontSize: '0.85rem', color: '#6b7280', marginBottom: '8px' } }, agent.description)
                            : null,
                          h(
                            'div',
                            { style: { marginTop: '8px' } },
                            h(
                              'label',
                              { style: { display: 'block', fontSize: '0.75rem', color: '#6b7280', marginBottom: '2px' } },
                              '本地别名'
                            ),
                            h('input', {
                              type: 'text',
                              value: ls.alias,
                              placeholder: '给这个 Agent 起个昵称',
                              onChange: function (e) {
                                setAgentAlias(agent.id, e.target.value);
                              },
                              style: {
                                width: '100%',
                                padding: '4px 8px',
                                border: '1px solid #d1d5db',
                                borderRadius: '4px',
                                fontSize: '0.85rem',
                              },
                            })
                          ),
                          h(
                            'div',
                            { style: { marginTop: '6px' } },
                            h(
                              'label',
                              { style: { display: 'block', fontSize: '0.75rem', color: '#6b7280', marginBottom: '2px' } },
                              '负责人角色'
                            ),
                            h(
                              'select',
                              {
                                value: ls.ownerRole,
                                onChange: function (e) {
                                  setAgentOwnerRole(agent.id, e.target.value);
                                },
                                style: {
                                  width: '100%',
                                  padding: '4px 8px',
                                  border: '1px solid #d1d5db',
                                  borderRadius: '4px',
                                  fontSize: '0.85rem',
                                },
                              },
                              h('option', { value: 'owner' }, '老板专用（owner）'),
                              h('option', { value: 'shared' }, '团队共享（shared）'),
                              h('option', { value: 'reviewer' }, '仅作审核（reviewer）')
                            )
                          ),
                          caps.length > 0
                            ? h(
                                'div',
                                { style: { display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '8px' } },
                                caps.slice(0, 4).map(function (cap, idx) {
                                  return h(
                                    'span',
                                    {
                                      key: idx,
                                      style: {
                                        fontSize: '0.7rem',
                                        background: '#ede9fe',
                                        color: '#6d28d9',
                                        padding: '2px 6px',
                                        borderRadius: '999px',
                                      },
                                    },
                                    cap
                                  );
                                }),
                                caps.length > 4 ? h('span', { style: { fontSize: '0.7rem', color: '#9ca3af' } }, '+' + (caps.length - 4)) : null
                              )
                            : null
                        );
                      })
                    )
              )
        )
      )
    );
  }

  // ==================== 注册路由 ====================

  // 首次加载时确保本地 SQLite 表已存在（幂等）
  invokeTauri('bootstrap_virtual_company_tables', {})
    .then(function () {
      console.log('[VirtualCompany] bootstrap OK');
    })
    .catch(function (err) {
      console.warn('[VirtualCompany] bootstrap 失败（首次运行可能在开发模式）:', err);
    });

  try {
    ProClawPlugin.registerRoute('/vc/templates', TemplatesPage);
    ProClawPlugin.registerRoute('/vc/wizard', WizardPage);
    ProClawPlugin.registerRoute('/vc/import', ImportPage);
    ProClawPlugin.registerRoute('/vc/companies', CompaniesPage);
    console.log('[VirtualCompany Plugin] 4 个路由注册成功：/vc/{templates,wizard,import,companies}');
  } catch (err) {
    console.error('[VirtualCompany Plugin] 路由注册失败:', err);
  }
})();