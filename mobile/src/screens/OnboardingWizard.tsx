/**
 * OnboardingWizard - 首次使用引导向导
 *
 * 首次启动时，代替 ProfileSelectScreen 的输入框表单，
 * 以「秘书小如」对话的形式，引导用户完成身份创建。
 *
 * 对应 PRD v11.1 第4.4节：首次启动引导流程
 */
import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { createProfile } from '../services/ProfileManager';
import { switchProfile } from '../stores/AppStore';

// ============ 类型定义 ============

interface WizardMessage {
  id: string;
  role: 'assistant' | 'user' | 'system';
  content: string;
  /** 是否为打字动画消息（逐步追加） */
  typing?: boolean;
}

type WizardStep = 'greeting' | 'asking_name' | 'confirming' | 'creating' | 'complete';

// ============ 对话剧本 ============

const WELCOME_TEXT = '你好！🦁';
const INTRO_TEXT = '我是小如，你的专属商务秘书。';
const WELCOME_DESC = '欢迎使用 ProClaw！在开始之前，请告诉我怎么称呼你？';
const CONFIRM_TEMPLATE = (name: string) => `太好了，${name}！很高兴认识你！👋`;
const CREATING_TEXT = '正在为你创建专属工作空间...';
const DONE_TEXT = '🎉 创建完成！你的专属工作空间已就绪。';
const FINAL_TEXT = '现在你可以开始使用 ProClaw 了。有什么需要随时找我！';

// ============ 组件 ============

export default function OnboardingWizard() {
  const navigation = useNavigation<any>();
  const flatListRef = useRef<FlatList>(null);
  const [messages, setMessages] = useState<WizardMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [step, setStep] = useState<WizardStep>('greeting');
  const [loading, setLoading] = useState(false);
  const [userName, setUserName] = useState('');

  // 初始化：展示小如的欢迎消息（带打字动画节奏）
  useEffect(() => {
    const greetings: WizardMessage[] = [
      { id: 'w', role: 'assistant', content: WELCOME_TEXT, typing: true },
    ];
    setMessages(greetings);

    // 逐条展示消息
    const timers: ReturnType<typeof setTimeout>[] = [];
    const addWithDelay = (msg: WizardMessage, delay: number) => {
      timers.push(setTimeout(() => {
        setMessages((prev) => [...prev, msg]);
      }, delay));
    };

    addWithDelay({ id: 'intro', role: 'assistant', content: INTRO_TEXT, typing: true }, 800);
    addWithDelay({ id: 'ask', role: 'assistant', content: WELCOME_DESC, typing: true }, 2000);
    timers.push(setTimeout(() => setStep('asking_name'), 3500));

    return () => timers.forEach(clearTimeout);
  }, []);

  // 新消息时自动滚动到底部
  useEffect(() => {
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
  }, [messages]);

  // 处理用户发送名称
  const handleSendName = useCallback(async () => {
    const name = inputText.trim();
    if (!name || loading || step !== 'asking_name') return;

    setInputText('');
    setUserName(name);

    // 添加用户消息
    const userMsg: WizardMessage = { id: `u_${Date.now()}`, role: 'user', content: name };
    setMessages((prev) => [...prev, userMsg]);

    // 进入确认步骤
    setStep('confirming');

    // 小如确认消息
    setTimeout(() => {
      const confirmMsg: WizardMessage = {
        id: 'confirm',
        role: 'assistant',
        content: CONFIRM_TEMPLATE(name),
        typing: true,
      };
      setMessages((prev) => [...prev, confirmMsg]);
    }, 500);

    // 进入创建步骤
    setTimeout(() => {
      setStep('creating');
      const creatingMsg: WizardMessage = {
        id: 'creating',
        role: 'system',
        content: CREATING_TEXT,
      };
      setMessages((prev) => [...prev, creatingMsg]);
    }, 2000);

    // 执行身份创建
    setTimeout(async () => {
      try {
        setLoading(true);
        const profile = await createProfile(name);
        await switchProfile(profile);

        // 完成消息
        const doneMsg: WizardMessage = {
          id: 'done',
          role: 'assistant',
          content: DONE_TEXT,
          typing: true,
        };
        setMessages((prev) => [...prev, doneMsg]);

        setTimeout(() => {
          const finalMsg: WizardMessage = {
            id: 'final',
            role: 'assistant',
            content: FINAL_TEXT,
          };
          setMessages((prev) => [...prev, finalMsg]);
        }, 1200);

        setTimeout(() => {
          setStep('complete');
          setLoading(false);
        }, 2500);
      } catch (err: any) {
        const errMsg: WizardMessage = {
          id: 'err',
          role: 'system',
          content: `创建失败：${err?.message || '请重试'}`,
        };
        setMessages((prev) => [...prev, errMsg]);
        setLoading(false);
        setStep('asking_name');
      }
    }, 3000);
  }, [inputText, step, loading]);

  // 进入主应用
  const handleEnterMain = useCallback(() => {
    navigation.reset({ index: 0, routes: [{ name: 'Main' }] });
  }, [navigation]);

  // 渲染消息气泡
  const renderMessage = ({ item }: { item: WizardMessage }) => {
    const isAssistant = item.role === 'assistant';
    const isUser = item.role === 'user';
    const isSystem = item.role === 'system';

    if (isSystem) {
      return (
        <View style={styles.systemRow}>
          <View style={styles.systemBubble}>
            {item.content === CREATING_TEXT ? (
              <View style={styles.creatingRow}>
                <ActivityIndicator size="small" color="#6366f1" />
                <Text style={styles.systemText}>{item.content}</Text>
              </View>
            ) : (
              <Text style={styles.systemText}>{item.content}</Text>
            )}
          </View>
        </View>
      );
    }

    return (
      <View style={[styles.msgRow, isUser && styles.msgRowUser]}>
        {/* 小如头像 */}
        {isAssistant && (
          <View style={styles.avatarCol}>
            <Image
              source={require('../../assets/avatars/secretary/default.png')}
              style={styles.chatAvatar}
              resizeMode="contain"
            />
          </View>
        )}
        <View
          style={[
            styles.bubble,
            isUser ? styles.bubbleUser : styles.bubbleAssistant,
          ]}
        >
          <Text style={[styles.bubbleText, isUser && styles.bubbleTextUser]}>
            {item.content}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* 顶部标题栏 */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Image
            source={require('../../assets/avatars/secretary/default.png')}
            style={styles.headerAvatar}
            resizeMode="contain"
          />
          <View>
            <Text style={styles.headerTitle}>商务秘书 · 小如</Text>
            <Text style={styles.headerSubtitle}>引导设置</Text>
          </View>
        </View>
      </View>

      {/* 消息列表 */}
      <KeyboardAvoidingView
        style={styles.chatArea}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
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

        {/* 输入区域 */}
        {step === 'asking_name' && (
          <View style={styles.inputArea}>
            <TextInput
              style={styles.input}
              placeholder="输入你的称呼..."
              placeholderTextColor="#aaa"
              value={inputText}
              onChangeText={setInputText}
              autoFocus
              maxLength={30}
              returnKeyType="send"
              onSubmitEditing={handleSendName}
              editable={!loading}
            />
            <TouchableOpacity
              style={[
                styles.sendBtn,
                (!inputText.trim() || loading) && styles.sendBtnDisabled,
              ]}
              onPress={handleSendName}
              disabled={!inputText.trim() || loading}
              activeOpacity={0.7}
            >
              <Text style={styles.sendBtnText}>发送</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* 完成按钮 */}
        {step === 'complete' && (
          <View style={styles.completeArea}>
            <TouchableOpacity
              style={styles.startBtn}
              onPress={handleEnterMain}
              activeOpacity={0.8}
            >
              <Text style={styles.startBtnText}>开始使用 🎉</Text>
            </TouchableOpacity>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ============ 样式 ============

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9ff',
  },
  header: {
    backgroundColor: '#6366f1',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: Platform.OS === 'web' ? 12 : 4,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerAvatar: {
    width: 32,
    height: 32,
    marginRight: 10,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 1,
  },
  chatArea: {
    flex: 1,
  },
  msgList: {
    padding: 16,
    paddingBottom: 8,
  },
  msgRow: {
    flexDirection: 'row',
    marginBottom: 14,
    alignItems: 'flex-end',
  },
  msgRowUser: {
    justifyContent: 'flex-end',
  },
  avatarCol: {
    marginRight: 8,
  },
  chatAvatar: {
    width: 32,
    height: 32,
  },
  bubble: {
    maxWidth: '72%',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
  },
  bubbleAssistant: {
    backgroundColor: '#fff',
    borderBottomLeftRadius: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  bubbleUser: {
    backgroundColor: '#6366f1',
    borderBottomRightRadius: 4,
  },
  bubbleText: {
    fontSize: 15,
    color: '#1a1a1a',
    lineHeight: 21,
  },
  bubbleTextUser: {
    color: '#fff',
  },
  systemRow: {
    alignItems: 'center',
    marginBottom: 14,
  },
  systemBubble: {
    backgroundColor: 'rgba(99,102,241,0.08)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
  },
  systemText: {
    fontSize: 13,
    color: '#666',
    textAlign: 'center',
  },
  creatingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  inputArea: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#fff',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#e0e0e0',
  },
  input: {
    flex: 1,
    height: 42,
    backgroundColor: '#f5f5f5',
    borderRadius: 21,
    paddingHorizontal: 16,
    fontSize: 15,
    color: '#1a1a1a',
  },
  sendBtn: {
    marginLeft: 8,
    height: 40,
    paddingHorizontal: 20,
    borderRadius: 20,
    backgroundColor: '#6366f1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendBtnDisabled: {
    backgroundColor: '#c7d2fe',
  },
  sendBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  completeArea: {
    paddingHorizontal: 40,
    paddingVertical: 20,
    paddingBottom: Platform.OS === 'ios' ? 30 : 20,
  },
  startBtn: {
    backgroundColor: '#6366f1',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  startBtnText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#fff',
  },
});
