/**
 * ProClipsChatScreen - Agent 对话式视频制作首屏
 *
 * 对应原型 page-chat：广告主助手对话窗
 * 包含：导航栏（在线状态）+ 聊天气泡列表 + 嵌入模板卡 + 输入栏
 * V1：预设对话 + 点击模板跳转详情；Phase 5 接真实 AI 流式回复
 */
import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import type { AppNavigation } from '../types/navigation';
import { colors, gradients, radius } from '../components/Theme';
import { TEMPLATES } from '../services/ProClipsService';

interface ChatMessage {
  who: 'agent' | 'me';
  type: 'text' | 'templates';
  html?: string;
  text?: string;
}

// 预设对话（V1 mock）
const INITIAL_MESSAGES: ChatMessage[] = [
  { who: 'agent', type: 'text', text: '你好老王 👋 我是你的 AI 广告主助手，专门帮你零门槛拍出带个人 IP 的营销视频。' },
  { who: 'agent', type: 'text', text: '我看你已经认证了「老王火锅店 · 万达店」，行业是餐饮 / 火锅。' },
  { who: 'agent', type: 'text', text: '咱们今天想推点什么？比如招牌菜、新品上新、还是门店活动？' },
  { who: 'me', type: 'text', text: '想推一下招牌麻辣锅底，周末做个活动。' },
  { who: 'agent', type: 'text', text: '好嘞！招牌麻辣锅底 + 周末活动，这个方向很对。我给你推荐几个适合的模板 👇' },
  { who: 'agent', type: 'templates' },
];

export default function ProClipsChatScreen() {
  const navigation = useNavigation<AppNavigation<'ProClipsChat'>>();
  const [messages, setMessages] = useState<ChatMessage[]>(INITIAL_MESSAGES);
  const [input, setInput] = useState('');
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  }, [messages]);

  const handleSend = () => {
    const text = input.trim();
    if (!text) return;
    setMessages(prev => [...prev, { who: 'me', type: 'text', text }]);
    setInput('');
    // V1 mock 回复
    setTimeout(() => {
      setMessages(prev => [...prev, {
        who: 'agent', type: 'text',
        text: '收到！我已记录你的需求。点击下方推荐模板即可开始制作，或继续告诉我更多细节～',
      }]);
    }, 600);
  };

  const renderBubble = (m: ChatMessage, i: number) => {
    if (m.type === 'templates') {
      return (
        <View key={i} style={[styles.bubbleRow, styles.agent]}>
          <LinearGradient colors={[...gradients.main]} style={styles.bubbleAvatar} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
            <Text style={styles.bubbleAvatarText}>😎</Text>
          </LinearGradient>
          <View style={styles.bubbleWrap}>
            <Text style={styles.bubbleEmbedIntro}>我为你推荐了 <Text style={styles.bold}>3 个</Text> 适合火锅行业的模板，点击查看：</Text>
            <View style={styles.embedTemplates}>
              {TEMPLATES.slice(0, 3).map((t) => (
                <TouchableOpacity
                  key={t.id}
                  style={styles.embedCard}
                  activeOpacity={0.85}
                  onPress={() => navigation.navigate('ProClipsTemplateDetail', { templateId: t.id, title: t.title })}
                >
                  <View style={[styles.embedCover, { backgroundColor: t.coverColor }]}>
                    {t.badge ? <View style={styles.embedBadge}><Text style={styles.embedBadgeText}>{t.badge}</Text></View> : null}
                  </View>
                  <View style={styles.embedInfo}>
                    <Text style={styles.embedTitle} numberOfLines={1}>{t.title}</Text>
                    <Text style={styles.embedMeta}>{t.scenes.length} 分镜 · {t.duration}</Text>
                  </View>
                  <Text style={styles.embedArrow}>›</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      );
    }
    const isAgent = m.who === 'agent';
    return (
      <View key={i} style={[styles.bubbleRow, isAgent ? styles.agent : styles.me]}>
        {isAgent ? (
          <LinearGradient colors={[...gradients.main]} style={styles.bubbleAvatar} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
            <Text style={styles.bubbleAvatarText}>😎</Text>
          </LinearGradient>
        ) : (
          <LinearGradient colors={[...gradients.warm]} style={styles.bubbleAvatar} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
            <Text style={[styles.bubbleAvatarText, { color: '#fff' }]}>王</Text>
          </LinearGradient>
        )}
        {isAgent ? (
          <View style={[styles.bubble, styles.bubbleAgent]}>
            <Text style={styles.bubbleText}>{m.text}</Text>
          </View>
        ) : (
          <LinearGradient colors={['#ff6b9d', '#a855f7']} style={[styles.bubble, styles.bubbleMe]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
            <Text style={[styles.bubbleText, { color: '#fff' }]}>{m.text}</Text>
          </LinearGradient>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        {/* 导航栏 */}
        <View style={styles.navBar}>
          <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
            <Text style={styles.iconBtnText}>‹</Text>
          </TouchableOpacity>
          <View style={styles.navTitleWrap}>
            <Text style={styles.navTitle}>广告主助手</Text>
            <View style={styles.navStatus}>
              <View style={styles.navStatusDot} />
              <Text style={styles.navStatusText}>在线 · 帮你制作视频</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.iconBtn} activeOpacity={0.7}>
            <Text style={styles.iconBtnText}>⋯</Text>
          </TouchableOpacity>
        </View>

        {/* 聊天列表 */}
        <ScrollView
          ref={scrollRef}
          style={styles.chatList}
          contentContainerStyle={styles.chatListBody}
          showsVerticalScrollIndicator={false}
        >
          {messages.map(renderBubble)}
        </ScrollView>

        {/* 输入栏 */}
        <View style={styles.chatInput}>
          <TouchableOpacity style={styles.iconBtn} activeOpacity={0.7}>
            <Text style={styles.inputIcon}>🎤</Text>
          </TouchableOpacity>
          <TextInput
            style={styles.input}
            value={input}
            onChangeText={setInput}
            placeholder="输入消息，或点击下方卡片操作…"
            placeholderTextColor={colors.txt3}
            onSubmitEditing={handleSend}
            returnKeyType="send"
          />
          <TouchableOpacity onPress={handleSend} activeOpacity={0.85}>
            <LinearGradient colors={[...gradients.main]} style={styles.sendBtn} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
              <Text style={[styles.sendIcon, { color: '#fff' }]}>➤</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bgDeep },
  container: { flex: 1 },
  navBar: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 14, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: colors.line,
  },
  iconBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.06)', justifyContent: 'center', alignItems: 'center' },
  iconBtnText: { color: '#fff', fontSize: 22, fontWeight: '300', lineHeight: 24 },
  navTitleWrap: { flex: 1 },
  navTitle: { fontSize: 15, fontWeight: '700', color: colors.txt1 },
  navStatus: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 },
  navStatusDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.cyan },
  navStatusText: { fontSize: 11, color: colors.cyan },
  chatList: { flex: 1 },
  chatListBody: { padding: 14, paddingBottom: 20 },
  bubbleRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  agent: { alignItems: 'flex-start' },
  me: { flexDirection: 'row-reverse', alignItems: 'flex-start' },
  bubbleAvatar: {
    width: 30, height: 30, borderRadius: 15,
    justifyContent: 'center', alignItems: 'center',
  },
  bubbleAvatarText: { fontSize: 15 },
  bubbleWrap: { flex: 1, maxWidth: '85%' },
  bubble: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 16 },
  bubbleAgent: { backgroundColor: colors.bgCard, borderBottomLeftRadius: 4, borderWidth: 1, borderColor: colors.line },
  bubbleMe: { borderBottomRightRadius: 4 },
  bubbleText: { fontSize: 14, color: colors.txt1, lineHeight: 20 },
  bubbleEmbedIntro: { fontSize: 13, color: colors.txt2, marginBottom: 10, lineHeight: 19 },
  bold: { fontWeight: '700', color: colors.txt1 },
  embedTemplates: { gap: 8 },
  embedCard: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: 'rgba(0,0,0,0.25)', borderRadius: 12, padding: 8,
    borderWidth: 1, borderColor: colors.line,
  },
  embedCover: { width: 44, height: 44, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  embedBadge: { position: 'absolute', top: 2, right: 2, backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 4, paddingVertical: 1, borderRadius: 5 },
  embedBadgeText: { color: '#fff', fontSize: 8, fontWeight: '700' },
  embedInfo: { flex: 1, minWidth: 0 },
  embedTitle: { fontSize: 13, fontWeight: '600', color: colors.txt1 },
  embedMeta: { fontSize: 10, color: colors.txt3, marginTop: 3 },
  embedArrow: { fontSize: 18, color: colors.txt3 },
  chatInput: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 12, paddingVertical: 10,
    borderTopWidth: 1, borderTopColor: colors.line,
    backgroundColor: colors.bgCard,
  },
  inputIcon: { fontSize: 16 },
  input: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: 20,
    color: colors.txt1, fontSize: 14,
    paddingHorizontal: 16, paddingVertical: 10,
    ...Platform.select({ web: { outlineStyle: 'none' as any } }),
  },
  sendBtn: {
    width: 40, height: 40, borderRadius: 20,
    justifyContent: 'center', alignItems: 'center',
  },
  sendIcon: { color: colors.cyan, fontSize: 18 },
});
