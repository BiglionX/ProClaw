/**
 * IdentityChatScreen - 身份管理对话窗
 *
 * 以「秘书小如」对话的方式，引导用户完成身份添加/切换。
 * 点击「我的」Tab 顶部身份卡片的"切换"按钮时进入此页。
 *
 * 对应 PRD v11.1 第4.4节：身份管理交互
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
import { createProfile, listProfiles, type Profile } from '../services/ProfileManager';
import { switchProfile, useAppStore } from '../stores/AppStore';
import { getErrorMessage } from '../utils/errorUtils';
import type { AppNavigation } from '../types/navigation';

// ============ 类型定义 ============

interface ChatMessage {
  id: string;
  role: 'assistant' | 'user' | 'system';
  content: string;
  typing?: boolean;
  /** 对话步骤标识 */
  step?: DialogStep;
}

type DialogStep =
  | 'greeting'
  | 'show_options'
  | 'typing_name'
  | 'creating'
  | 'switch_list'
  | 'switching'
  | 'complete'
  | 'cancel';

// ============ 预设对话 ============

const AVATAR_SRC = require('../../assets/avatars/secretary/default.png');

/** 获取已有身份的名称列表文本 */
const getExistingNamesText = (profiles: Profile[], currentId?: string): string => {
  const names = profiles
    .filter((p) => p.id !== currentId)
    .map((p) => `「${p.name}」`);
  if (names.length === 0) return '';
  return `当前已有：${names.join('、')}`;
};

// ============ 组件 ============

export default function IdentityChatScreen() {
  const navigation = useNavigation<AppNavigation>();
  const flatListRef = useRef<FlatList>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [step, setStep] = useState<DialogStep>('greeting');
  const [loading, setLoading] = useState(false);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [currentProfile, setCurrentProfileState] = useState<Profile | null>(null);
  const [newName, setNewName] = useState('');

  // 加载身份列表
  useEffect(() => {
    const load = async () => {
      const all = await listProfiles();
      setProfiles(all);
      const current = useAppStore.getState().currentProfile;
      setCurrentProfileState(current);

      // 展示小如欢迎 + 选项
      const greeting: ChatMessage[] = [
        { id: 'g1', role: 'assistant', content: '老板你好！🦁', typing: true },
        { id: 'g2', role: 'assistant', content: '我是小如，你的专属商务秘书。', typing: true },
      ];

      const existingText = getExistingNamesText(all, current?.id);
      const askMsg: ChatMessage = {
        id: 'ask',
        role: 'assistant',
        content: existingText
          ? `${existingText}\n\n你还需要添加什么身份？或者可以切换到已有的身份。`
          : '你还没有添加任何身份。需要创建一个新身份吗？',
        step: 'show_options',
      };

      setMessages([...greeting, askMsg]);
      setTimeout(() => setStep('show_options'), 500);
    };
    load();
  }, []);

  // 自动滚动
  useEffect(() => {
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
  }, [messages, step]);

  // ============ 选项处理 ============

  /** 用户选择「添加新身份」 */
  const handleAddNew = useCallback(() => {
    const userMsg: ChatMessage = { id: `u_${Date.now()}`, role: 'user', content: '添加新身份' };
    const reply: ChatMessage = {
      id: 'ask_name',
      role: 'assistant',
      content: '好的！请告诉我新身份的称呼，比如「个人店铺」「公司账号」等。',
      step: 'typing_name',
    };
    setMessages((prev) => [...prev, userMsg, reply]);
    setStep('typing_name');
  }, []);

  /** 用户选择「切换到已有身份」 */
  const handleSwitchExisting = useCallback(() => {
    const userMsg: ChatMessage = { id: `u_${Date.now()}`, role: 'user', content: '切换身份' };
    const others = profiles.filter((p) => p.id !== currentProfile?.id);
    const listText = others
      .map((p, i) => `${i + 1}. ${p.name}`)
      .join('\n');
    const reply: ChatMessage = {
      id: 'switch_list',
      role: 'assistant',
      content: `请选择要切换到的身份：\n\n${listText}`,
      step: 'switch_list',
    };
    setMessages((prev) => [...prev, userMsg, reply]);
    setStep('switch_list');
  }, [profiles, currentProfile]);

  /** 选择某个已有身份进行切换 */
  const handleSelectProfile = useCallback(async (profile: Profile) => {
    const userMsg: ChatMessage = { id: `u_${Date.now()}`, role: 'user', content: profile.name };
    const switchingMsg: ChatMessage = {
      id: 'switching',
      role: 'system',
      content: `正在切换到身份「${profile.name}」...`,
    };
    setMessages((prev) => [...prev, userMsg, switchingMsg]);
    setStep('switching');
    setLoading(true);

    try {
      await switchProfile(profile);
      const done: ChatMessage = {
        id: 'done',
        role: 'assistant',
        content: `🎉 已切换到「${profile.name}」，数据已就绪！`,
        step: 'complete',
      };
      setMessages((prev) => [...prev, done]);
      setStep('complete');
    } catch (err) {
      const errMsg: ChatMessage = {
        id: 'err', role: 'system',
        content: `切换失败：${getErrorMessage(err, '请重试')}`,
      };
      setMessages((prev) => [...prev, errMsg]);
      setStep('show_options');
    } finally {
      setLoading(false);
    }
  }, []);

  /** 用户「取消」 */
  const handleCancel = useCallback(() => {
    const userMsg: ChatMessage = { id: `u_${Date.now()}`, role: 'user', content: '算了' };
    const reply: ChatMessage = {
      id: 'cancel_reply',
      role: 'assistant',
      content: '好的，有需要随时找我！😊',
      step: 'cancel',
    };
    setMessages((prev) => [...prev, userMsg, reply]);
    setStep('cancel');
  }, []);

  /** 用户发送新身份名称 */
  const handleSendName = useCallback(async () => {
    const name = inputText.trim();
    if (!name || step !== 'typing_name') return;
    setInputText('');
    setNewName(name);

    const userMsg: ChatMessage = { id: `u_${Date.now()}`, role: 'user', content: name };
    const creatingMsg: ChatMessage = {
      id: 'creating',
      role: 'system',
      content: `正在创建身份「${name}」...`,
    };
    setMessages((prev) => [...prev, userMsg, creatingMsg]);
    setStep('creating');
    setLoading(true);

    try {
      const profile = await createProfile(name);
      await switchProfile(profile);

      const done: ChatMessage = {
        id: 'done',
        role: 'assistant',
        content: `🎉 身份「${name}」创建完成！你可以开始使用 ProClaw 了。`,
        step: 'complete',
      };
      setMessages((prev) => [...prev, done]);
      setStep('complete');
    } catch (err) {
      const errMsg: ChatMessage = {
        id: 'err', role: 'system',
        content: `创建失败：${getErrorMessage(err, '请重试')}`,
      };
      setMessages((prev) => [...prev, errMsg]);
      setStep('typing_name');
    } finally {
      setLoading(false);
    }
  }, [inputText, step, loading]);

  /** 返回我的页面 */
  const handleGoBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  // ============ 渲染 ============

  const renderMessage = ({ item }: { item: ChatMessage }) => {
    const isAssistant = item.role === 'assistant';
    const isUser = item.role === 'user';
    const isSystem = item.role === 'system';

    if (isSystem) {
      return (
        <View style={styles.systemRow}>
          <View style={styles.systemBubble}>
            {step === 'creating' || step === 'switching' ? (
              <View style={styles.loadingRow}>
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
        {isAssistant && (
          <View style={styles.avatarCol}>
            <Image source={AVATAR_SRC} style={styles.chatAvatar} resizeMode="contain" />
          </View>
        )}
        <View style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleAssistant]}>
          <Text style={[styles.bubbleText, isUser && styles.bubbleTextUser]}>
            {item.content}
          </Text>
        </View>
      </View>
    );
  };

  /** 不在列表中渲染的选项按钮 */
  const renderOptions = () => {
    if (step === 'show_options') {
      const othersCount = profiles.filter((p) => p.id !== currentProfile?.id).length;
      return (
        <View style={styles.optionsArea}>
          <TouchableOpacity style={styles.optionBtn} onPress={handleAddNew} activeOpacity={0.7}>
            <Text style={styles.optionIcon}>➕</Text>
            <Text style={styles.optionLabel}>添加新身份</Text>
          </TouchableOpacity>
          {othersCount > 0 && (
            <TouchableOpacity style={styles.optionBtn} onPress={handleSwitchExisting} activeOpacity={0.7}>
              <Text style={styles.optionIcon}>🔄</Text>
              <Text style={styles.optionLabel}>切换到已有身份</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={[styles.optionBtn, styles.optionBtnCancel]} onPress={handleCancel} activeOpacity={0.7}>
            <Text style={styles.optionLabelCancel}>取消</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (step === 'switch_list') {
      const others = profiles.filter((p) => p.id !== currentProfile?.id);
      return (
        <View style={styles.optionsArea}>
          {others.map((p) => (
            <TouchableOpacity
              key={p.id}
              style={styles.optionBtn}
              onPress={() => handleSelectProfile(p)}
              activeOpacity={0.7}
            >
              <Text style={styles.optionIcon}>{p.avatar || '👤'}</Text>
              <Text style={styles.optionLabel}>{p.name}</Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity style={[styles.optionBtn, styles.optionBtnCancel]} onPress={() => {
            setStep('show_options');
            setMessages((prev) => prev.filter((m) => m.id !== 'switch_list'));
          }} activeOpacity={0.7}>
            <Text style={styles.optionLabelCancel}>返回</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return null;
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* 顶部标题栏 */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Image source={AVATAR_SRC} style={styles.headerAvatar} resizeMode="contain" />
          <View>
            <Text style={styles.headerTitle}>商务秘书 · 小如</Text>
            <Text style={styles.headerSubtitle}>身份管理</Text>
          </View>
        </View>
        {step === 'complete' && (
          <TouchableOpacity onPress={handleGoBack} style={styles.headerBtn}>
            <Text style={styles.headerBtnText}>完成</Text>
          </TouchableOpacity>
        )}
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

        {/* 选项按钮 */}
        {renderOptions()}

        {/* 输入区域（添加新身份时输入名称） */}
        {step === 'typing_name' && (
          <View style={styles.inputArea}>
            <TextInput
              style={styles.input}
              placeholder="输入身份名称..."
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
              style={[styles.sendBtn, (!inputText.trim() || loading) && styles.sendBtnDisabled]}
              onPress={handleSendName}
              disabled={!inputText.trim() || loading}
              activeOpacity={0.7}
            >
              <Text style={styles.sendBtnText}>确认</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* 完成按钮 */}
        {step === 'complete' && !loading && (
          <View style={styles.completeArea}>
            <TouchableOpacity style={styles.startBtn} onPress={handleGoBack} activeOpacity={0.8}>
              <Text style={styles.startBtnText}>返回我的页面</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* 取消后的返回按钮 */}
        {step === 'cancel' && !loading && (
          <View style={styles.completeArea}>
            <TouchableOpacity style={styles.startBtn} onPress={handleGoBack} activeOpacity={0.8}>
              <Text style={styles.startBtnText}>返回</Text>
            </TouchableOpacity>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ============ 样式 ============

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9ff' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#6366f1',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: Platform.OS === 'web' ? 12 : 4,
  },
  headerContent: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  headerAvatar: { width: 32, height: 32, marginRight: 10 },
  headerTitle: { fontSize: 17, fontWeight: '700', color: '#fff' },
  headerSubtitle: { fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 1 },
  headerBtn: { paddingHorizontal: 12, paddingVertical: 6 },
  headerBtnText: { color: '#fff', fontWeight: '600', fontSize: 15 },
  chatArea: { flex: 1 },
  msgList: { padding: 16, paddingBottom: 8 },
  msgRow: { flexDirection: 'row', marginBottom: 14, alignItems: 'flex-end' },
  msgRowUser: { justifyContent: 'flex-end' },
  avatarCol: { marginRight: 8 },
  chatAvatar: { width: 32, height: 32 },
  bubble: { maxWidth: '72%', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 16 },
  bubbleAssistant: {
    backgroundColor: '#fff',
    borderBottomLeftRadius: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  bubbleUser: { backgroundColor: '#6366f1', borderBottomRightRadius: 4 },
  bubbleText: { fontSize: 15, color: '#1a1a1a', lineHeight: 21 },
  bubbleTextUser: { color: '#fff' },
  systemRow: { alignItems: 'center', marginBottom: 14 },
  systemBubble: {
    backgroundColor: 'rgba(99,102,241,0.08)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
  },
  systemText: { fontSize: 13, color: '#666', textAlign: 'center' },
  loadingRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },

  // 选项按钮
  optionsArea: { paddingHorizontal: 40, paddingVertical: 12, gap: 10 },
  optionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  optionIcon: { fontSize: 20, marginRight: 12 },
  optionLabel: { fontSize: 15, fontWeight: '500', color: '#1a1a1a' },
  optionBtnCancel: { backgroundColor: 'transparent', shadowOpacity: 0, elevation: 0 },
  optionLabelCancel: { fontSize: 14, color: '#999' },

  // 输入
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
  sendBtnDisabled: { backgroundColor: '#c7d2fe' },
  sendBtnText: { fontSize: 14, fontWeight: '600', color: '#fff' },

  // 完成
  completeArea: { paddingHorizontal: 40, paddingVertical: 20 },
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
  startBtnText: { fontSize: 17, fontWeight: '700', color: '#fff' },
});
