/**
 * XiaoruChatScreen - 小如 AI 营销秘书聊天
 *
 * 对应原型 page-xiaoru-chat：
 *   导航栏（返回 + 小如头像/在线状态 + 记忆库入口 🧠）
 *   + 小如 profile 卡（头像 + 名字 + 已记住 N 条 + 随时待命）
 *   + 消息气泡列表（agent 左 / me 右）
 *   + 打字动画（3 个跳动点）
 *   + 快捷指令 chips（4 个）
 *   + 输入栏（语音 + 输入框 + 发送）
 *
 * 发送逻辑：me 消息追加 → 显示打字 → 1.3s 后替换为 xiaoruReply(text)
 * 快捷指令 = 自动填入并发送
 */
import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput,
  KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { AppNavigation } from '../types/navigation';
import { colors, radius } from '../components/Theme';
import {
  XIAORU_CHAT_INIT, XIAORU_QUICK_CHIPS, xiaoruReply, MEMORY_GROUPS,
  type XiaoruMessage,
} from '../services/ProClipsService';

const TOTAL_MEM = MEMORY_GROUPS.reduce((s, g) => s + g.items.length, 0);

export default function XiaoruChatScreen() {
  const navigation = useNavigation<AppNavigation<'ProClipsXiaoruChat'>>();
  const [messages, setMessages] = useState<XiaoruMessage[]>(XIAORU_CHAT_INIT);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  // 新消息时滚动到底部
  useEffect(() => {
    setTimeout(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    }, 60);
  }, [messages, typing]);

  const doSend = (text: string) => {
    const t = text.trim();
    if (!t || typing) return;
    setMessages((prev) => [...prev, { who: 'me', text: t }]);
    setInput('');
    setTyping(true);
    setTimeout(() => {
      const reply = xiaoruReply(t);
      setMessages((prev) => [...prev, { who: 'agent', text: reply }]);
      setTyping(false);
    }, 1300);
  };

  const handleQuick = (q: string) => {
    doSend(q);
  };

  const handleVoice = () => {
    Alert.alert('语音输入', '语音输入功能开发中（mock）', [{ text: '好的' }]);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* 导航栏 */}
      <View style={styles.navBar}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.navArrow}>‹</Text>
        </TouchableOpacity>
        <View style={styles.navInfo}>
          <Text style={styles.navTitle}>小如</Text>
          <View style={styles.navStatusRow}>
            <View style={styles.navDot} />
            <Text style={styles.navStatus}>在线 · AI 营销秘书</Text>
          </View>
        </View>
        <TouchableOpacity
          style={styles.iconBtn}
          onPress={() => navigation.navigate('ProClipsXiaoruMemory')}
        >
          <Text style={styles.navBrain}>🧠</Text>
        </TouchableOpacity>
      </View>

      {/* 小如 profile 卡 */}
      <View style={styles.profileCard}>
        <View style={styles.profileAvatar}>
          <Text style={styles.profileAvatarText}>如</Text>
        </View>
        <View style={styles.profileInfo}>
          <Text style={styles.profileName}>小如 · AI 营销秘书</Text>
          <Text style={styles.profileSub}>已为你记住 {TOTAL_MEM} 条信息</Text>
        </View>
        <View style={styles.profileTagWrap}>
          <Text style={styles.profileTag}>⏱ 随时待命</Text>
        </View>
      </View>

      {/* 聊天区 */}
      <KeyboardAvoidingView
        style={styles.chatWrap}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          ref={scrollRef}
          style={styles.chatList}
          contentContainerStyle={styles.chatBody}
          showsVerticalScrollIndicator={false}
        >
          {messages.map((m, i) => (
            <Bubble key={i} msg={m} />
          ))}
          {typing && <TypingBubble />}
        </ScrollView>

        {/* 快捷指令 */}
        <View style={styles.chipsRow}>
          {XIAORU_QUICK_CHIPS.map((q) => (
            <TouchableOpacity
              key={q}
              style={styles.chip}
              activeOpacity={0.7}
              onPress={() => handleQuick(q)}
              disabled={typing}
            >
              <Text style={styles.chipText}>{q}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* 输入栏 */}
        <View style={styles.inputBar}>
          <TouchableOpacity style={styles.voiceBtn} onPress={handleVoice} activeOpacity={0.7}>
            <Text style={styles.voiceBtnText}>🎤</Text>
          </TouchableOpacity>
          <TextInput
            style={styles.input}
            value={input}
            onChangeText={setInput}
            placeholder="跟小如说点什么…"
            placeholderTextColor={colors.txt3}
            returnKeyType="send"
            onSubmitEditing={() => doSend(input)}
            editable={!typing}
          />
          <TouchableOpacity
            style={[styles.sendBtn, (!input.trim() || typing) && styles.sendBtnDisabled]}
            activeOpacity={0.7}
            onPress={() => doSend(input)}
            disabled={!input.trim() || typing}
          >
            <Text style={styles.sendBtnText}>发送</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ============ 气泡 ============
function Bubble({ msg }: { msg: XiaoruMessage }) {
  const isAgent = msg.who === 'agent';
  return (
    <View style={[styles.bubbleRow, isAgent ? styles.rowAgent : styles.rowMe]}>
      {isAgent && (
        <View style={styles.botAvatar}>
          <Text style={styles.botAvatarText}>如</Text>
        </View>
      )}
      <View style={[styles.bubble, isAgent ? styles.bubbleAgent : styles.bubbleMe]}>
        <Text style={styles.bubbleText}>{msg.text}</Text>
      </View>
      {!isAgent && (
        <View style={styles.meAvatar}>
          <Text style={styles.meAvatarText}>王</Text>
        </View>
      )}
    </View>
  );
}

function TypingBubble() {
  return (
    <View style={[styles.bubbleRow, styles.rowAgent]}>
      <View style={styles.botAvatar}>
        <Text style={styles.botAvatarText}>如</Text>
      </View>
      <View style={[styles.bubble, styles.bubbleAgent, styles.typingBubble]}>
        <View style={styles.typingDots}>
          <View style={[styles.typingDot, styles.dot1]} />
          <View style={[styles.typingDot, styles.dot2]} />
          <View style={[styles.typingDot, styles.dot3]} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bgDeep },
  // 导航
  navBar: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 10,
    backgroundColor: 'rgba(15,15,30,0.82)',
    borderBottomWidth: 1, borderBottomColor: colors.line,
  },
  iconBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  navArrow: { fontSize: 28, color: colors.txt1, fontWeight: '300', marginTop: -4 },
  navInfo: { flex: 1, marginLeft: 4 },
  navTitle: { fontSize: 15, fontWeight: '700', color: colors.txt1 },
  navStatusRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 },
  navDot: {
    width: 6, height: 6, borderRadius: 3, backgroundColor: colors.success,
  },
  navStatus: { fontSize: 11, color: colors.success },
  navBrain: { fontSize: 18 },
  // profile 卡
  profileCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: colors.bgCard, borderBottomWidth: 1, borderBottomColor: colors.line,
  },
  profileAvatar: {
    width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center',
    backgroundColor: colors.magenta,
  },
  profileAvatarText: { fontSize: 18, color: '#fff', fontWeight: '700' },
  profileInfo: { flex: 1 },
  profileName: { fontSize: 14, fontWeight: '700', color: colors.txt1 },
  profileSub: { fontSize: 11, color: colors.txt3, marginTop: 2 },
  profileTagWrap: {},
  profileTag: {
    fontSize: 10, color: colors.cyan, fontWeight: '600',
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10,
    backgroundColor: 'rgba(0,210,255,0.12)', borderWidth: 1, borderColor: 'rgba(0,210,255,0.3)',
    overflow: 'hidden',
  },
  // 聊天
  chatWrap: { flex: 1 },
  chatList: { flex: 1 },
  chatBody: { padding: 14, paddingBottom: 8 },
  bubbleRow: { flexDirection: 'row', gap: 8, marginBottom: 12, alignItems: 'flex-end' },
  rowAgent: { justifyContent: 'flex-start' },
  rowMe: { justifyContent: 'flex-end' },
  botAvatar: {
    width: 30, height: 30, borderRadius: 15, justifyContent: 'center', alignItems: 'center',
    backgroundColor: colors.magenta,
  },
  botAvatarText: { fontSize: 13, color: '#fff', fontWeight: '700' },
  meAvatar: {
    width: 30, height: 30, borderRadius: 15, justifyContent: 'center', alignItems: 'center',
    backgroundColor: colors.cyan,
  },
  meAvatarText: { fontSize: 13, color: '#000', fontWeight: '700' },
  bubble: {
    maxWidth: '78%', paddingHorizontal: 12, paddingVertical: 9, borderRadius: radius.md,
  },
  bubbleAgent: {
    backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.line,
    borderBottomLeftRadius: 4,
  },
  bubbleMe: {
    backgroundColor: 'rgba(0,210,255,0.16)', borderWidth: 1, borderColor: 'rgba(0,210,255,0.32)',
    borderBottomRightRadius: 4,
  },
  bubbleText: { fontSize: 13, color: colors.txt1, lineHeight: 20 },
  // 打字动画
  typingBubble: { paddingVertical: 14, paddingHorizontal: 16 },
  typingDots: { flexDirection: 'row', gap: 4, alignItems: 'center' },
  typingDot: {
    width: 6, height: 6, borderRadius: 3, backgroundColor: colors.txt2,
  },
  dot1: { opacity: 0.4 },
  dot2: { opacity: 0.7 },
  dot3: { opacity: 1 },
  // chips
  chipsRow: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 6,
    paddingHorizontal: 12, paddingVertical: 8,
    backgroundColor: 'rgba(15,15,30,0.6)',
    borderTopWidth: 1, borderTopColor: colors.line,
  },
  chip: {
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 14,
    backgroundColor: 'rgba(0,210,255,0.10)', borderWidth: 1, borderColor: 'rgba(0,210,255,0.3)',
  },
  chipText: { fontSize: 11, color: colors.cyan, fontWeight: '600' },
  // 输入栏
  inputBar: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 10, paddingVertical: 8,
    backgroundColor: colors.bgCard, borderTopWidth: 1, borderTopColor: colors.line,
  },
  voiceBtn: {
    width: 38, height: 38, borderRadius: 19, justifyContent: 'center', alignItems: 'center',
    backgroundColor: colors.bgCard2,
  },
  voiceBtnText: { fontSize: 16 },
  input: {
    flex: 1, height: 38, borderRadius: 19, paddingHorizontal: 14,
    backgroundColor: colors.bgCard2, color: colors.txt1, fontSize: 13, paddingVertical: 0,
  },
  sendBtn: {
    backgroundColor: colors.cyan, paddingHorizontal: 16, paddingVertical: 9, borderRadius: 19,
  },
  sendBtnDisabled: { opacity: 0.5 },
  sendBtnText: { color: '#000', fontSize: 13, fontWeight: '700' },
});
