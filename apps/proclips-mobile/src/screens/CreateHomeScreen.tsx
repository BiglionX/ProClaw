/**
 * CreateHomeScreen - 商家「创作」Tab
 *
 * 对应原型 page-home：问候 + 商家卡 + Agent Hero + 进行中任务 + 推荐模板
 * Phase 0：核心结构 + mock 数据，Phase 2 补全交互与动画
 */
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import type { AppNavigation } from '../types/navigation';
import { colors, gradients, radius } from '../components/Theme';
import { useProClipsStore } from '../stores/ProClipsStore';
import { TEMPLATES } from '../services/ProClipsService';

export default function CreateHomeScreen() {
  const navigation = useNavigation<AppNavigation<'Main'>>();
  const tasks = useProClipsStore((s) => s.tasks);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView style={styles.container} contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        {/* 问候 */}
        <View style={styles.helloRow}>
          <View>
            <Text style={styles.hi}>下午好 ☀️</Text>
            <Text style={styles.name}>老王火锅店</Text>
          </View>
          <View style={styles.avatar}><Text style={styles.avatarText}>王</Text></View>
        </View>

        {/* 商家信息卡 */}
        <View style={styles.merchantCard}>
          <View style={styles.merchantLogo}><Text style={styles.logoText}>🍲</Text></View>
          <View style={styles.merchantInfo}>
            <Text style={styles.shop}>老王火锅店 · 万达店</Text>
            <View style={styles.tagRow}>
              <View style={styles.tagPill}><Text style={styles.tagPillText}>餐饮</Text></View>
              <Text style={styles.tagText}>已认证</Text>
            </View>
            <View style={styles.merchantStats}>
              <View style={styles.ms}><Text style={styles.msB}>12</Text><Text style={styles.msS}>视频</Text></View>
              <View style={styles.ms}><Text style={styles.msB}>3.2k</Text><Text style={styles.msS}>播放</Text></View>
              <View style={styles.ms}><Text style={styles.msB}>186</Text><Text style={styles.msS}>分享</Text></View>
            </View>
          </View>
        </View>

        {/* Agent Hero */}
        <TouchableOpacity activeOpacity={0.95} onPress={() => navigation.navigate('ProClipsChat')}>
          <LinearGradient colors={[...gradients.main]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.agentHero}>
            <View style={styles.agentBadge}><Text style={styles.agentBadgeText}>🤖 AI 广告主助手</Text></View>
            <Text style={styles.agentTitle}>拍一段素材{'\n'}还你一条带 IP 的爆款视频</Text>
            <Text style={styles.agentDesc}>零门槛拍摄引导 · AI 文案 · 音色克隆 · 一键混剪，3 分钟生成你的专属营销视频。</Text>
            <View style={styles.agentCta}><Text style={styles.agentCtaText}>立即开始创作 →</Text></View>
            <Text style={styles.agentSunglasses}>😎</Text>
          </LinearGradient>
        </TouchableOpacity>

        {/* 进行中任务 */}
        <View style={styles.sectionTitle}>
          <Text style={styles.sectionH}>进行中的任务</Text>
          <Text style={styles.sectionMore}>全部 {tasks.length} 个</Text>
        </View>

        {tasks.map((task) => (
          <TouchableOpacity
            key={task.id}
            style={styles.taskCard}
            onPress={() => navigation.navigate('ProClipsWorkflow', { templateId: task.id, title: task.templateName, taskId: task.id })}
            activeOpacity={0.9}
          >
            <View style={styles.taskHead}>
              <View style={[styles.taskThumb, { backgroundColor: task.coverColor }]}>
                <Text style={styles.playMini}>▶</Text>
              </View>
              <View style={styles.taskMeta}>
                <Text style={styles.taskName} numberOfLines={1}>{task.title}</Text>
                <Text style={styles.taskSub} numberOfLines={1}>{task.templateName} · {task.createdAt}</Text>
              </View>
              <View style={[styles.taskStatus, task.status === 'mixing' ? styles.stMix : styles.stDoing]}>
                <Text style={[styles.taskStatusText, task.status === 'mixing' ? styles.stMixText : styles.stDoingText]}>
                  {task.status === 'mixing' ? '混剪中' : '拍摄中'}
                </Text>
              </View>
            </View>
            <View style={styles.stepsBar}>
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <View
                  key={i}
                  style={[
                    styles.stepDot,
                    i < task.currentStep && styles.stepDone,
                    i === task.currentStep && styles.stepCur,
                  ]}
                />
              ))}
            </View>
            <View style={styles.stepsLabel}>
              {['拍摄', '商品', '文案', '音色', '混剪', '成品'].map((label, i) => (
                <Text key={label} style={[styles.stepsLabelText, i + 1 === task.currentStep && styles.stepsLabelCur]}>
                  {label}
                </Text>
              ))}
            </View>
          </TouchableOpacity>
        ))}

        {/* 推荐模板 */}
        <View style={styles.sectionTitle}>
          <Text style={styles.sectionH}>推荐模板</Text>
          <TouchableOpacity onPress={() => navigation.navigate('ProClipsTemplateList')}>
            <Text style={styles.sectionMore}>查看全部 →</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.tmplGrid}>
          {TEMPLATES.slice(0, 2).map((t) => (
            <TouchableOpacity
              key={t.id}
              style={styles.tmplCard}
              activeOpacity={0.9}
              onPress={() => navigation.navigate('ProClipsTemplateDetail', { templateId: t.id, title: t.title })}
            >
              <View style={[styles.tmplCover, { backgroundColor: t.coverColor }]}>
                {t.badge ? <View style={styles.tcBadge}><Text style={styles.tcBadgeText}>{t.badge}</Text></View> : null}
                <View style={styles.tcGrad} />
                <Text style={styles.tcTitle} numberOfLines={1}>{t.title}</Text>
              </View>
              <View style={styles.tmplMeta}>
                <Text style={styles.tmplMetaText}>{t.scenes.length} 分镜</Text>
                <Text style={styles.tmplMetaText}>{t.duration}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bgDeep },
  container: { flex: 1 },
  body: { padding: 16, paddingBottom: 120 },
  helloRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginVertical: 8 },
  hi: { fontSize: 13, color: colors.txt2, fontWeight: '500' },
  name: { fontSize: 22, fontWeight: '800', color: colors.cyan, marginTop: 2 },
  avatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: colors.magenta, justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontWeight: '800', fontSize: 16, color: '#fff' },
  merchantCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: colors.bgCard, borderColor: colors.line, borderWidth: 1,
    borderRadius: radius.lg, padding: 14, marginBottom: 16,
  },
  merchantLogo: { width: 48, height: 48, borderRadius: 14, backgroundColor: colors.amber, justifyContent: 'center', alignItems: 'center' },
  logoText: { fontSize: 22 },
  merchantInfo: { flex: 1, minWidth: 0 },
  shop: { fontSize: 15, fontWeight: '700', color: colors.txt1 },
  tagRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3 },
  tagPill: { backgroundColor: 'rgba(0,210,255,0.15)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 20 },
  tagPillText: { color: colors.cyan, fontSize: 10, fontWeight: '600' },
  tagText: { fontSize: 11, color: colors.txt2 },
  merchantStats: { flexDirection: 'row', gap: 10, marginTop: 8 },
  ms: { flex: 1, backgroundColor: 'rgba(0,0,0,0.25)', borderRadius: 10, paddingVertical: 6, alignItems: 'center' },
  msB: { fontSize: 15, fontWeight: '800', color: colors.txt1 },
  msS: { fontSize: 10, color: colors.txt3 },
  agentHero: {
    borderRadius: radius.xl, padding: 22, marginBottom: 18, overflow: 'hidden',
  },
  agentBadge: { alignSelf: 'flex-start', backgroundColor: 'rgba(0,0,0,0.25)', paddingHorizontal: 11, paddingVertical: 5, borderRadius: 20, marginBottom: 12 },
  agentBadgeText: { color: '#fff', fontSize: 11, fontWeight: '600' },
  agentTitle: { fontSize: 21, fontWeight: '800', color: '#fff', lineHeight: 28 },
  agentDesc: { fontSize: 13, color: 'rgba(255,255,255,0.92)', marginTop: 8, lineHeight: 20 },
  agentCta: { alignSelf: 'flex-start', marginTop: 16, backgroundColor: '#fff', paddingHorizontal: 20, paddingVertical: 11, borderRadius: 30 },
  agentCtaText: { color: colors.bgCard, fontWeight: '700', fontSize: 14 },
  agentSunglasses: { position: 'absolute', right: 18, bottom: 18, fontSize: 54, opacity: 0.5 },
  sectionTitle: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginVertical: 12 },
  sectionH: { fontSize: 16, fontWeight: '700', color: colors.txt1 },
  sectionMore: { fontSize: 12, color: colors.txt3 },
  taskCard: { backgroundColor: colors.bgCard, borderColor: colors.line, borderWidth: 1, borderRadius: radius.md, padding: 14, marginBottom: 12 },
  taskHead: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  taskThumb: { width: 54, height: 54, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  playMini: { color: '#fff', fontSize: 14 },
  taskMeta: { flex: 1, minWidth: 0 },
  taskName: { fontSize: 14, fontWeight: '700', color: colors.txt1 },
  taskSub: { fontSize: 11, color: colors.txt2, marginTop: 3 },
  taskStatus: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 14 },
  stDoing: { backgroundColor: 'rgba(255,181,71,0.16)' },
  stMix: { backgroundColor: 'rgba(168,85,247,0.18)' },
  taskStatusText: { fontSize: 10, fontWeight: '700' },
  stDoingText: { color: colors.amber },
  stMixText: { color: colors.purple },
  stepsBar: { flexDirection: 'row', gap: 4 },
  stepDot: { flex: 1, height: 5, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.10)' },
  stepDone: { backgroundColor: colors.cyan },
  stepCur: { backgroundColor: 'rgba(255,181,71,0.35)' },
  stepsLabel: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 7 },
  stepsLabelText: { fontSize: 10, color: colors.txt3 },
  stepsLabelCur: { color: colors.amber, fontWeight: '600' },
  tmplGrid: { flexDirection: 'row', gap: 12, marginBottom: 8 },
  tmplCard: { flex: 1, backgroundColor: colors.bgCard, borderRadius: radius.md, overflow: 'hidden', borderWidth: 1, borderColor: colors.line },
  tmplCover: { aspectRatio: 4 / 3, justifyContent: 'flex-end', padding: 10 },
  tcBadge: { position: 'absolute', top: 8, left: 8, backgroundColor: 'rgba(0,0,0,0.55)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  tcBadgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  tcGrad: { position: 'absolute', left: 0, right: 0, bottom: 0, height: '60%', backgroundColor: 'rgba(0,0,0,0.45)' },
  tcTitle: { fontSize: 13, fontWeight: '700', color: '#fff' },
  tmplMeta: { flexDirection: 'row', justifyContent: 'space-between', padding: 10 },
  tmplMetaText: { fontSize: 11, color: colors.txt2 },
});
