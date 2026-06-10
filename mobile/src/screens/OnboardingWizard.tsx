/**
 * OnboardingWizard - 首次使用引导向导
 *
 * 首次启动时，代替 ProfileSelectScreen 的输入框表单，
 * 以「秘书小如」对话的形式，引导用户完成身份创建。
 *
 * 玻璃拟态美学 — 毛玻璃气泡、流动光斑、半透明层叠
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
  Animated,
  Dimensions,
  Easing,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { createProfile } from '../services/ProfileManager';
import { switchProfile } from '../stores/AppStore';
import LinearGradient from 'react-native-linear-gradient';

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

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

// 漂浮光斑配置
const ORBS = [
  { color: '#00d2ff', size: 260, startX: -40, startY: 80, dx: 60, dy: 40, duration: 14000 },
  { color: '#ff6b9d', size: 220, startX: SCREEN_W - 100, startY: 200, dx: -50, dy: 50, duration: 18000 },
  { color: '#7b2ff7', size: 280, startX: SCREEN_W * 0.4, startY: SCREEN_H - 200, dx: 40, dy: -60, duration: 16000 },
  { color: '#00f5d4', size: 180, startX: 60, startY: SCREEN_H * 0.6, dx: -30, dy: -40, duration: 20000 },
];

export default function OnboardingWizard() {
  const navigation = useNavigation<any>();
  const flatListRef = useRef<FlatList>(null);
  const [messages, setMessages] = useState<WizardMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [step, setStep] = useState<WizardStep>('greeting');
  const [loading, setLoading] = useState(false);
  const [userName, setUserName] = useState('');

  // 漂浮光斑动画值（每光斑一对 x/y）
  const orbAnims = useRef(ORBS.map(() => ({ x: new Animated.Value(0), y: new Animated.Value(0) })));
  // 头部入场动画
  const headerOpacity = useRef(new Animated.Value(0));

  // 初始化：展示小如的欢迎消息（带打字动画节奏）
  useEffect(() => {
    const greetings: WizardMessage[] = [
      { id: 'w', role: 'assistant', content: WELCOME_TEXT, typing: true },
    ];
    setMessages(greetings);

    // 头部入场动画
    Animated.timing(headerOpacity.current, {
      toValue: 1,
      duration: 800,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();

    // 启动漂浮光斑
    orbAnims.current.forEach((anim, i) => {
      const orb = ORBS[i];
      const half = orb.duration / 2;
      const loop = () => {
        Animated.parallel([
          Animated.timing(anim.x, {
            toValue: orb.dx,
            duration: half,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(anim.y, {
            toValue: orb.dy,
            duration: half,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ]).start(() => {
          Animated.parallel([
            Animated.timing(anim.x, {
              toValue: 0,
              duration: half,
              easing: Easing.inOut(Easing.sin),
              useNativeDriver: true,
            }),
            Animated.timing(anim.y, {
              toValue: 0,
              duration: half,
              easing: Easing.inOut(Easing.sin),
              useNativeDriver: true,
            }),
          ]).start(() => loop());
        });
      };
      loop();
    });

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
          <View style={styles.glassSystemBubble}>
            {item.content === CREATING_TEXT ? (
              <View style={styles.creatingRow}>
                <ActivityIndicator size="small" color="#00d2ff" />
                <Text style={styles.systemTextGlass}>{item.content}</Text>
              </View>
            ) : (
              <Text style={styles.systemTextGlass}>{item.content}</Text>
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
            <View style={styles.avatarRing}>
              <Image
                source={require('../../assets/avatars/secretary/default.png')}
                style={styles.chatAvatar}
                resizeMode="contain"
              />
            </View>
          </View>
        )}
        <View
          style={[
            styles.bubble,
            isUser ? styles.glassBubbleUser : styles.glassBubbleAssistant,
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
      {/* 渐变背景 + 漂浮光斑 */}
      <LinearGradient
        colors={['#0f0c29', '#302b63', '#24243e']}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />
      {ORBS.map((orb, i) => (
        <Animated.View
          key={i}
          style={[
            styles.orb,
            {
              width: orb.size,
              height: orb.size,
              borderRadius: orb.size / 2,
              backgroundColor: orb.color,
              left: orb.startX,
              top: orb.startY,
              transform: [
                { translateX: orbAnims.current[i]?.x ?? 0 },
                { translateY: orbAnims.current[i]?.y ?? 0 },
              ],
            },
          ]}
        />
      ))}

      {/* 玻璃拟态顶部标题栏 */}
      <Animated.View style={[styles.glassHeader, { opacity: headerOpacity.current }]}>
        <View style={styles.headerContent}>
          <View style={styles.headerAvatarWrap}>
            <Image
              source={require('../../assets/avatars/secretary/default.png')}
              style={styles.headerAvatar}
              resizeMode="contain"
            />
          </View>
          <View>
            <Text style={styles.headerTitle}>商务秘书 · 小如</Text>
            <Text style={styles.headerSubtitle}>引导设置</Text>
          </View>
        </View>
      </Animated.View>

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

        {/* 玻璃拟态输入区域 */}
        {step === 'asking_name' && (
          <View style={styles.glassInputArea}>
            <TextInput
              style={styles.glassInput}
              placeholder="输入你的称呼..."
              placeholderTextColor="rgba(255,255,255,0.4)"
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
                styles.glassSendBtn,
                (!inputText.trim() || loading) && styles.glassSendBtnDisabled,
              ]}
              onPress={handleSendName}
              disabled={!inputText.trim() || loading}
              activeOpacity={0.7}
            >
              <Text style={styles.glassSendBtnText}>发送</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* 完成按钮 */}
        {step === 'complete' && (
          <View style={styles.completeArea}>
            <TouchableOpacity
              style={styles.glassStartBtn}
              onPress={handleEnterMain}
              activeOpacity={0.8}
            >
              <Text style={styles.glassStartBtnText}>开始使用</Text>
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
    backgroundColor: 'transparent',
  },

  // ---- 漂浮光斑 ----
  orb: {
    position: 'absolute',
    opacity: 0.15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 40,
    elevation: 0,
  },

  // ---- 玻璃拟态头部 ----
  glassHeader: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: Platform.OS === 'web' ? 12 : 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.12)',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerAvatarWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.3)',
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    overflow: 'hidden',
  },
  headerAvatar: {
    width: 32,
    height: 32,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.3,
  },
  headerSubtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.55)',
    marginTop: 1,
    fontWeight: '300',
  },

  // ---- 聊天区域 ----
  chatArea: {
    flex: 1,
  },
  msgList: {
    padding: 16,
    paddingBottom: 8,
  },
  msgRow: {
    flexDirection: 'row',
    marginBottom: 16,
    alignItems: 'flex-end',
  },
  msgRowUser: {
    justifyContent: 'flex-end',
  },

  // ---- 头像 ----
  avatarCol: {
    marginRight: 8,
  },
  avatarRing: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: 'rgba(0,210,255,0.4)',
    backgroundColor: 'rgba(0,210,255,0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  chatAvatar: {
    width: 32,
    height: 32,
  },

  // ---- 玻璃拟态气泡 ----
  bubble: {
    maxWidth: '72%',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
  },
  glassBubbleAssistant: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderBottomLeftRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4,
  },
  glassBubbleUser: {
    backgroundColor: 'rgba(0,210,255,0.2)',
    borderBottomRightRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(0,210,255,0.35)',
    shadowColor: '#00d2ff',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  bubbleText: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.92)',
    lineHeight: 22,
    fontWeight: '400',
  },
  bubbleTextUser: {
    color: '#fff',
    fontWeight: '500',
  },

  // ---- 系统消息 ----
  systemRow: {
    alignItems: 'center',
    marginBottom: 14,
  },
  glassSystemBubble: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  systemTextGlass: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.55)',
    textAlign: 'center',
    fontWeight: '300',
  },
  creatingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  // ---- 玻璃拟态输入区域 ----
  glassInputArea: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  glassInput: {
    flex: 1,
    height: 44,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 22,
    paddingHorizontal: 18,
    fontSize: 15,
    color: '#fff',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  glassSendBtn: {
    marginLeft: 8,
    height: 42,
    paddingHorizontal: 22,
    borderRadius: 21,
    backgroundColor: 'rgba(0,210,255,0.25)',
    borderWidth: 1,
    borderColor: 'rgba(0,210,255,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  glassSendBtnDisabled: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderColor: 'rgba(255,255,255,0.1)',
  },
  glassSendBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },

  // ---- 完成按钮 ----
  completeArea: {
    paddingHorizontal: 40,
    paddingVertical: 20,
    paddingBottom: Platform.OS === 'ios' ? 30 : 20,
  },
  glassStartBtn: {
    backgroundColor: 'rgba(0,210,255,0.2)',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(0,210,255,0.45)',
    shadowColor: '#00d2ff',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  glassStartBtnText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 1,
  },
});
