/**
 * AgentView - 移动端 Agent 视图容器组件
 * 使用 WebView 加载 Agent 前端资源，提供 postMessage 桥接
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  ActivityIndicator,
  Text,
  Platform,
  Modal,
  TouchableOpacity,
} from 'react-native';
import { agentRuntimeBridge, type AgentInfo } from '../services/AgentRuntimeBridge';

// 仅在原生平台导入 WebView
let WebView: any = null;
try {
  if (Platform.OS !== 'web') {
    WebView = require('react-native-webview').default;
  }
} catch {
  // react-native-webview not available, use fallback
}

interface AgentViewProps {
  agent: AgentInfo;
  visible: boolean;
  onClose: () => void;
}

/** 注入到 WebView 的 proclaw API JS 代码 */
const PROCLAW_API_INJECTION = `
(function() {
  window.proclaw = {
    _pendingRequests: {},
    _requestId: 0,

    _postMessage: function(msg) {
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(JSON.stringify(msg));
      }
    },

    getCurrentUser: function() {
      return window.proclaw._rpc('getCurrentUser');
    },

    db: {
      query: function(sql, params) {
        return window.proclaw._rpc('dbQuery', [sql, params]);
      },
      execute: function(sql, params) {
        return window.proclaw._rpc('dbExecute', [sql, params]);
      },
    },

    storage: {
      get: function(key) {
        try {
          var val = localStorage.getItem('proclaw_agent_' + key);
          return Promise.resolve(val ? JSON.parse(val) : null);
        } catch(e) {
          return Promise.resolve(null);
        }
      },
      set: function(key, value) {
        try {
          localStorage.setItem('proclaw_agent_' + key, JSON.stringify(value));
          return Promise.resolve({ success: true });
        } catch(e) {
          return Promise.resolve({ success: false, error: e.message });
        }
      },
    },

    sendMessage: function(to, content) {
      return window.proclaw._rpc('sendMessage', [to, content]);
    },

    showNotification: function(title, body) {
      return window.proclaw._rpc('showNotification', [title, body]);
    },

    openAgentMarket: function() {
      return window.proclaw._rpc('openAgentMarket');
    },

    _rpc: function(method, params) {
      var id = ++window.proclaw._requestId;
      return new Promise(function(resolve, reject) {
        window.proclaw._pendingRequests[id] = { resolve: resolve, reject: reject };
        window.proclaw._postMessage({
          type: 'proclaw_request',
          id: id,
          method: method,
          params: params || [],
        });
        setTimeout(function() {
          if (window.proclaw._pendingRequests[id]) {
            delete window.proclaw._pendingRequests[id];
            reject(new Error('Request ' + method + ' timed out'));
          }
        }, 30000);
      });
    },

    _handleResponse: function(response) {
      var pending = window.proclaw._pendingRequests[response.id];
      if (pending) {
        delete window.proclaw._pendingRequests[response.id];
        if (response.error) {
          pending.reject(new Error(response.error));
        } else {
          pending.resolve(response.payload);
        }
      }
    },
  };
  console.log('[ProClaw] Agent API bridge injected');
})();
true;
`;

export default function AgentView({ agent, visible, onClose }: AgentViewProps) {
  const webViewRef = useRef<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      setLoading(true);
      setError(null);
    }
  }, [visible, agent.id]);

  /** 处理 WebView 发来的消息 */
  const handleMessage = async (event: any) => {
    try {
      const data = typeof event === 'string' ? JSON.parse(event) : event.nativeEvent?.data ? JSON.parse(event.nativeEvent.data) : event;
      if (!data || data.type !== 'proclaw_request') return;

      const { id, method, params } = data;

      try {
        const result = await agentRuntimeBridge.request(agent.id, method, ...(params || []));
        const response = {
          type: 'proclaw_response',
          id,
          payload: result,
        };
        webViewRef.current?.postMessage(JSON.stringify(response));
      } catch (err) {
        const errorResponse = {
          type: 'proclaw_response',
          id,
          payload: null,
          error: err instanceof Error ? err.message : String(err),
        };
        webViewRef.current?.postMessage(JSON.stringify(errorResponse));
      }
    } catch (e) {
      console.warn('[AgentView] Failed to parse message:', e);
    }
  };

  const assetsUrl = `https://nvwa.proclaw.cc/agents/${agent.manifest.id}/${agent.manifest.version}/${agent.manifest.entry}`;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.container}>
        {/* 顶部导航栏 */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeText}>关闭</Text>
          </TouchableOpacity>
          <Text style={styles.title} numberOfLines={1}>
            {agent.name}
          </Text>
          <Text style={styles.version}>v{agent.version}</Text>
        </View>

        {/* 禁用覆盖层 */}
        {!agent.enabled && (
          <View style={styles.disabledOverlay}>
            <Text style={styles.disabledText}>Agent 已禁用</Text>
            <Text style={styles.disabledHint}>请先在 Agent 列表中启用</Text>
          </View>
        )}

        {/* 加载中指示器 */}
        {loading && !error && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#ff3b30" />
            <Text style={styles.loadingText}>正在加载 {agent.name}...</Text>
          </View>
        )}

        {/* 错误提示 */}
        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorIcon}>!</Text>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={() => {
                setLoading(true);
                setError(null);
              }}
            >
              <Text style={styles.retryText}>重试</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* WebView 内容 */}
        {agent.enabled && Platform.OS !== 'web' && WebView && (
          <WebView
            ref={webViewRef}
            source={{ uri: assetsUrl }}
            style={styles.webview}
            onLoadEnd={() => setLoading(false)}
            onError={() => {
              setError('无法加载 Agent 内容，请检查网络连接');
              setLoading(false);
            }}
            onMessage={handleMessage}
            injectedJavaScript={PROCLAW_API_INJECTION}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            startInLoadingState={true}
            renderLoading={() => (
              <View style={styles.webviewLoading}>
                <ActivityIndicator size="large" color="#ff3b30" />
              </View>
            )}
          />
        )}

        {/* Web 平台回退 */}
        {agent.enabled && Platform.OS === 'web' && (
          <View style={styles.webFallback}>
            <Text style={styles.fallbackText}>
              Agent 视图在 Web 平台不可用
            </Text>
            <Text style={styles.fallbackHint}>
              请在移动设备上使用此功能
            </Text>
          </View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f8f8',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ff3b30',
    paddingTop: Platform.OS === 'ios' ? 50 : 10,
    paddingBottom: 10,
    paddingHorizontal: 16,
  },
  closeButton: {
    paddingRight: 12,
  },
  closeText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  title: {
    flex: 1,
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  version: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13,
    marginLeft: 8,
  },
  webview: {
    flex: 1,
  },
  loadingContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f8f8',
    zIndex: 10,
  },
  loadingText: {
    marginTop: 12,
    color: '#999',
    fontSize: 14,
  },
  webviewLoading: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f8f8',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorIcon: {
    fontSize: 48,
    color: '#ff3b30',
    marginBottom: 12,
    fontWeight: '700',
  },
  errorText: {
    color: '#666',
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#ff3b30',
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 20,
  },
  retryText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  disabledOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    zIndex: 20,
  },
  disabledText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  disabledHint: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    marginTop: 8,
  },
  webFallback: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  fallbackText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 8,
  },
  fallbackHint: {
    fontSize: 13,
    color: '#999',
  },
});
