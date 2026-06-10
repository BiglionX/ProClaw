/**
 * ChatDetailScreen - 消息详情/聊天页
 * 显示某会话的全部消息，支持发送新消息
 *
 * 玻璃拟态美学 — 毛玻璃气泡、深色渐变底、磨砂输入栏
 */
import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  TextInput,
  TouchableOpacity,
} from 'react-native';
import { Text, ActivityIndicator } from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import LinearGradient from 'react-native-linear-gradient';
import { getMessages, sendMessage, createOrGetSession, type ChatMessage } from '../services/ChatService';
import { chatWithAgentStream } from '../services/AIService';
import { useChatStore } from '../stores/ChatStore';

type ChatParams = {
  ChatDetail: {
    sessionId?: string;
    targetId: string;
    targetName: string;
    targetType: 'personal' | 'agent' | 'team' | 'group';
    targetIcon?: string;
  };
};

export default function ChatDetailScreen() {
  const route = useRoute<RouteProp<ChatParams, 'ChatDetail'>>();
  const navigation = useNavigation<any>();
  const { sessionId: initialSessionId, targetId, targetName, targetType, targetIcon } = route.params;
  const flatListRef = useRef<FlatList>(null);
  const messagesRef = useRef<ChatMessage[]>([]);

  const { markSessionRead, refreshSessions } = useChatStore();

  const [sessionId, setSessionId] = useState(initialSessionId || '');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [aiThinking, setAiThinking] = useState(false);

  // 同步 messagesRef（解决 useCallback 闭包捕获旧值）
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  // 设置标题
  useEffect(() => {
    navigation.setOptions({ title: targetName || '聊天' });
  }, [targetName, navigation]);

  // 初始化会话 + 加载消息
  useEffect(() => {
    initChat();
  }, []);

  const initChat = async () => {
    try {
      let sid = sessionId;
      if (!sid) {
        const session = await createOrGetSession(targetId, targetName, targetType, targetIcon || '');
        setSessionId(session.id);
        sid = session.id;
      }
      const msgs = await getMessages(sid);
      setMessages(msgs);
      messagesRef.current = msgs;

      // 标记该会话已读
      await markSessionRead(sid);
    } catch (err) {
      console.warn('[ChatDetail] Failed to load messages:', err);
    } finally {
      setLoading(false);
    }
  };

  const scrollToBottom = () => {
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
  };

  // 发送消息
  const handleSend = useCallback(async () => {
    const text = inputText.trim();
    if (!text || !sessionId || sending) return;
    setSending(true);
    setInputText('');
    try {
      // 1. 写入用户消息
      const userMsg = await sendMessage(sessionId, text, 'self');
      setMessages((prev) => [...prev, userMsg]);
      scrollToBottom();

      // 2. 如果是 Agent 会话，流式调用 AI 生成回复
      if (targetType === 'agent') {
        setAiThinking(true);

        // 构建历史对话上下文（用 ref 抓最新消息，避免闭包旧值）
        const history = messagesRef.current.slice(-20).map((m) => ({
          role: (m.sender_type === 'self' ? 'user' : 'assistant') as 'user' | 'assistant',
          content: m.content,
        }));

        // 审计 R2-B4：添加随机后缀防止同一毫秒内 ID 碰撞
        const streamId = `stream_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
        const streamPlaceholder: ChatMessage = {
          id: streamId,
          session_id: sessionId,
          sender_type: 'other',
          content: '',
          created_at: Math.floor(Date.now() / 1000),
          sync_status: 'local',
        };
        setMessages((prev) => [...prev, streamPlaceholder]);
        let fullResponse = '';

        // 审计 R2-P1：使用 ref 批量累积，避免每 token 触发 O(n) 重渲染
        let lastFlushTime = Date.now();
        try {
          for await (const token of chatWithAgentStream({
            agentId: targetId,
            userMessage: text,
            conversationHistory: history,
          })) {
            fullResponse += token;
            // 每 100ms 或换行时批量更新 UI，减少渲染次数
            const now = Date.now();
            if (now - lastFlushTime >= 100 || token.includes('\n') || fullResponse.length < 10) {
              lastFlushTime = now;
              const snapshot = fullResponse;
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === streamPlaceholder.id ? { ...m, content: snapshot } : m
                )
              );
            }
          }
          // 最终 flush 确保完整内容显示
          setMessages((prev) =>
            prev.map((m) =>
              m.id === streamPlaceholder.id ? { ...m, content: fullResponse } : m
            )
          );

          // 流式完成 → 将完整消息持久化到 DB，替换占位
          if (fullResponse.trim()) {
            const aiMsg = await sendMessage(sessionId, fullResponse, 'other');
            setMessages((prev) =>
              prev.map((m) =>
                m.id === streamPlaceholder.id ? aiMsg : m
              )
            );
            scrollToBottom();
          } else {
            // 空响应 → 移除占位
            setMessages((prev) => prev.filter((m) => m.id !== streamPlaceholder.id));
          }
        } catch (aiErr: any) {
          console.warn('[ChatDetail] AI stream failed:', aiErr?.message);
          // 移除占位，改用 fallback 消息
          setMessages((prev) => prev.filter((m) => m.id !== streamPlaceholder.id));
          if (fullResponse.trim()) {
            // 已收到部分内容，保存下来
            const aiMsg = await sendMessage(sessionId, fullResponse, 'other');
            setMessages((prev) => [...prev, aiMsg]);
          }
          const fallbackMsg = await sendMessage(
            sessionId,
            '抱歉，AI 回复中断。请稍后再试。',
            'system'
          );
          setMessages((prev) => [...prev, fallbackMsg]);
        } finally {
          setAiThinking(false);
        }
      }

      // 3. 刷新会话列表（让 MessagesTab 看到新消息）
      refreshSessions();
    } catch (err) {
      console.warn('[ChatDetail] Failed to send:', err);
    } finally {
      setSending(false);
      scrollToBottom();
    }
  }, [inputText, sessionId, sending, targetType, targetId, refreshSessions]);

  const formatTime = (ts: number) => {
    const d = new Date(ts * 1000);
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
  };

  const renderMessage = ({ item }: { item: ChatMessage }) => {
    const isSelf = item.sender_type === 'self';
    const isSystem = item.sender_type === 'system';
    return (
      <View
        style={[
          styles.msgRow,
          isSelf ? styles.msgRowSelf : isSystem ? styles.msgRowSystem : styles.msgRowOther,
        ]}
      >
        {isSystem ? (
          <View style={styles.glassSystemMsg}>
            <Text style={styles.systemMsgText}>{item.content}</Text>
          </View>
        ) : (
          <View
            style={[
              styles.msgBubble,
              isSelf ? styles.glassBubbleSelf : styles.glassBubbleOther,
            ]}
          >
            <Text style={[styles.msgText, isSelf && styles.msgTextSelf]}>
              {item.content}
            </Text>
            <Text style={[styles.msgTime, isSelf && styles.msgTimeSelf]}>
              {formatTime(item.created_at)}
            </Text>
          </View>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color="#00d2ff" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      {/* 渐变背景 */}
      <LinearGradient
        colors={['#0f0c29', '#302b63', '#24243e']}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      {/* 消息列表 */}
      {messages.length === 0 ? (
        <View style={styles.empty}>
          <MaterialCommunityIcons name="chat-plus-outline" size={48} color="rgba(255,255,255,0.15)" />
          <Text style={styles.emptyText}>开始对话吧</Text>
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.msgList}
          onContentSizeChange={() =>
            flatListRef.current?.scrollToEnd({ animated: false })
          }
        />
      )}

      {/* AI 思考中指示器 */}
      {aiThinking && (
        <View style={styles.thinkingBar}>
          <ActivityIndicator size="small" color="#00d2ff" />
          <Text style={styles.thinkingText}>AI 正在思考...</Text>
        </View>
      )}

      {/* 玻璃拟态输入栏 */}
      <View style={styles.glassInputBar}>
        <TextInput
          style={styles.glassTextInput}
          value={inputText}
          onChangeText={setInputText}
          placeholder="输入消息..."
          placeholderTextColor="rgba(255,255,255,0.35)"
          multiline
          maxLength={2000}
          returnKeyType="send"
          onSubmitEditing={handleSend}
        />
        <TouchableOpacity
          style={[styles.glassSendBtn, !inputText.trim() && styles.glassSendBtnDisabled]}
          onPress={handleSend}
          disabled={!inputText.trim() || sending}
          activeOpacity={0.7}
        >
          <MaterialCommunityIcons
            name={sending ? 'loading' : 'send'}
            size={20}
            color={inputText.trim() ? '#fff' : 'rgba(255,255,255,0.3)'}
          />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#24243e',
  },
  msgList: {
    padding: 16,
    paddingBottom: 8,
  },

  // ---- 消息行 ----
  msgRow: {
    marginBottom: 12,
    flexDirection: 'row',
  },
  msgRowSelf: {
    justifyContent: 'flex-end',
  },
  msgRowOther: {
    justifyContent: 'flex-start',
  },
  msgRowSystem: {
    justifyContent: 'center',
  },

  // ---- 玻璃拟态气泡 ----
  msgBubble: {
    maxWidth: '75%',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
  glassBubbleSelf: {
    backgroundColor: 'rgba(0,210,255,0.2)',
    borderBottomRightRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(0,210,255,0.35)',
    shadowColor: '#00d2ff',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  glassBubbleOther: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderBottomLeftRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
  msgText: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.92)',
    lineHeight: 22,
    fontWeight: '400',
  },
  msgTextSelf: {
    color: '#fff',
    fontWeight: '500',
  },
  msgTime: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.35)',
    marginTop: 4,
    textAlign: 'right',
    fontWeight: '300',
  },
  msgTimeSelf: {
    color: 'rgba(255,255,255,0.6)',
  },

  // ---- 系统消息 ----
  glassSystemMsg: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  systemMsgText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.45)',
    textAlign: 'center',
    fontWeight: '300',
  },

  // ---- 空状态 ----
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    color: 'rgba(255,255,255,0.4)',
    marginTop: 12,
    fontSize: 14,
  },

  // ---- 思考条 ----
  thinkingBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: 'rgba(0,210,255,0.06)',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(0,210,255,0.15)',
  },
  thinkingText: {
    fontSize: 13,
    color: '#00d2ff',
    marginLeft: 8,
    fontWeight: '400',
  },

  // ---- 玻璃拟态输入栏 ----
  glassInputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  glassTextInput: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    color: '#fff',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  glassSendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,210,255,0.25)',
    borderWidth: 1,
    borderColor: 'rgba(0,210,255,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  glassSendBtnDisabled: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderColor: 'rgba(255,255,255,0.08)',
  },
});
