/**
 * ProClipsMixStatusScreen - 混剪生成状态
 *
 * 对应原型 page-mix：导航栏 + 圆形渐变进度环 + 步骤列表 + 完成态成品预览
 * 处理 4 种态：processing（生成中）/ completed（完成）/ failed（失败）/ empty（无任务）
 */
import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import Svg, { Circle, Defs, LinearGradient as SvgLinear, Stop } from 'react-native-svg';
import type { AppScreenProps } from '../types/navigation';
import { colors, gradients, radius } from '../components/Theme';
import { useProClipsStore } from '../stores/ProClipsStore';
import { getMixTaskStatus } from '../services/ProClipsService';

// 5 个生成步骤及其进度阈值（对齐原型 page-mix）
const STEPS = [
  { key: 'align', label: '素材预处理与对齐', at: 0.0 },
  { key: 'script', label: 'AI 文案智能配音', at: 0.2 },
  { key: 'clone', label: '音色克隆合成', at: 0.45 },
  { key: 'mix', label: '混剪与转场合成', at: 0.7 },
  { key: 'package', label: '成品封装与入库', at: 0.92 },
];

// 圆环尺寸（对齐原型 160 / stroke 10）
const RING_SIZE = 160;
const RING_STROKE = 10;
const RING_RADIUS = (RING_SIZE - RING_STROKE) / 2;
const RING_CIRC = 2 * Math.PI * RING_RADIUS;

const ProClipsMixStatusScreen: React.FC<AppScreenProps<'ProClipsMixStatus'>> = ({
  navigation,
  route,
}) => {
  const mixTask = useProClipsStore((s) => s.mixTask);
  const setMixTask = useProClipsStore((s) => s.setMixTask);
  const [loading, setLoading] = useState(false);

  // 用 ref 保存最新 mixTask，避免轮询 useEffect 依赖整个对象导致频繁重建
  const taskRef = useRef(mixTask);
  taskRef.current = mixTask;

  // 轮询任务状态：仅在 taskId 变化或完成/失败时停止
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    let cancelled = false;

    const poll = async () => {
      const cur = taskRef.current;
      if (!cur || cur.status === 'completed' || cur.status === 'failed') return;
      setLoading(true);
      try {
        const next = await getMixTaskStatus(cur.taskId, cur.progress || 0);
        if (cancelled) return;
        setMixTask({ ...cur, ...next });
      } finally {
        if (!cancelled) setLoading(false);
      }
      if (!cancelled) {
        timer = setTimeout(poll, 2500);
      }
    };

    if (mixTask && mixTask.status !== 'completed' && mixTask.status !== 'failed') {
      timer = setTimeout(poll, 1500); // 首次延迟 1.5s，避免立刻发起
    }

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
    // 只在 taskId 变化时重建轮询
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mixTask?.taskId]);

  // ---- 空态 ----
  if (!mixTask) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <NavBar
          title="混剪状态"
          onBack={() => navigation.goBack()}
        />
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyEmoji}>🤔</Text>
          <Text style={styles.emptyTitle}>未找到混剪任务</Text>
          <Text style={styles.emptyDesc}>
            {route.params?.taskId
              ? `任务 ${route.params.taskId} 不存在或已过期。`
              : '请返回上一步重新提交混剪任务。'}
          </Text>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <LinearGradient
              colors={[...gradients.main]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.emptyCta}
            >
              <Text style={styles.emptyCtaText}>返回上一步</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const progress = mixTask.progress ?? 0;
  const completed = mixTask.status === 'completed';
  const failed = mixTask.status === 'failed';
  const percent = Math.round(progress * 100);

  // 推断当前步骤索引
  const currentStepIdx = STEPS.reduce(
    (acc, step, i) => (progress >= step.at ? i : acc),
    0
  );

  // ---- 失败态 ----
  if (failed) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <NavBar title="混剪失败" onBack={() => navigation.goBack()} />
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyEmoji}>⚠️</Text>
          <Text style={styles.emptyTitle}>混剪生成失败</Text>
          <Text style={styles.emptyDesc}>
            {mixTask.errorMessage || '生成过程出现未知错误，请重试。'}
          </Text>
          <TouchableOpacity onPress={() => navigation.navigate('ProClipsVoiceSample')}>
            <LinearGradient
              colors={[...gradients.main]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.emptyCta}
            >
              <Text style={styles.emptyCtaText}>返回重新提交</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ---- 生成中 / 完成态 ----
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <NavBar
        title={completed ? '混剪完成' : '混剪生成中'}
        onBack={() => navigation.goBack()}
      />

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.body}
        showsVerticalScrollIndicator={false}
      >
        {/* 圆形渐变进度环 */}
        <View style={styles.ringWrap}>
          <Svg width={RING_SIZE} height={RING_SIZE}>
            <Defs>
              <SvgLinear id="ringGrad" x1="0" y1="0" x2="1" y2="1">
                <Stop offset="0%" stopColor={colors.cyan} />
                <Stop offset="50%" stopColor={colors.magenta} />
                <Stop offset="100%" stopColor={colors.purple} />
              </SvgLinear>
            </Defs>
            {/* 底层灰圆 */}
            <Circle
              cx={RING_SIZE / 2}
              cy={RING_SIZE / 2}
              r={RING_RADIUS}
              stroke="rgba(255,255,255,0.08)"
              strokeWidth={RING_STROKE}
              fill="none"
            />
            {/* 进度圆环（旋转 -90° 从 12 点钟开始顺时针） */}
            <Circle
              cx={RING_SIZE / 2}
              cy={RING_SIZE / 2}
              r={RING_RADIUS}
              stroke="url(#ringGrad)"
              strokeWidth={RING_STROKE}
              strokeLinecap="round"
              fill="none"
              strokeDasharray={`${RING_CIRC * progress} ${RING_CIRC}`}
              transform={`rotate(-90 ${RING_SIZE / 2} ${RING_SIZE / 2})`}
            />
          </Svg>
          {/* 中心百分比 */}
          <View style={styles.ringCenter}>
            <Text style={styles.ringPercent}>{completed ? '100' : percent}%</Text>
            <Text style={styles.ringStatus}>
              {completed ? '✓ 已完成' : '混剪中'}
            </Text>
          </View>
        </View>

        {/* 状态文案 */}
        <Text style={styles.hint}>
          {completed
            ? '恭喜！视频已生成，可以去分发或查看视频库。'
            : '视频正在生成，完成后会自动通知你。请勿关闭页面。'}
        </Text>

        {/* 步骤列表 */}
        <View style={styles.stepsCard}>
          <Text style={styles.stepsTitle}>生成步骤</Text>
          {STEPS.map((step, i) => {
            const done = completed || i < currentStepIdx;
            const active = !completed && i === currentStepIdx;
            return (
              <View key={step.key} style={styles.stepItem}>
                <View
                  style={[
                    styles.stepDot,
                    done && styles.stepDotDone,
                    active && styles.stepDotActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.stepDotText,
                      (done || active) && { color: '#000' },
                    ]}
                  >
                    {done ? '✓' : active ? '•' : i + 1}
                  </Text>
                </View>
                <Text
                  style={[
                    styles.stepLabel,
                    done && styles.stepLabelDone,
                    active && styles.stepLabelActive,
                  ]}
                >
                  {step.label}
                </Text>
                {active ? (
                  <Text style={styles.stepDoing}>进行中</Text>
                ) : done ? (
                  <Text style={styles.stepDone}>已完成</Text>
                ) : (
                  <Text style={styles.stepPending}>待处理</Text>
                )}
              </View>
            );
          })}
        </View>

        {/* 错误信息（如有但未失败） */}
        {mixTask.errorMessage ? (
          <View style={styles.errBox}>
            <Text style={styles.errText}>{mixTask.errorMessage}</Text>
          </View>
        ) : null}

        {/* 完成态：成品预览卡 */}
        {completed ? (
          <View style={styles.resultCard}>
            <View style={styles.resultCover}>
              <Text style={styles.resultEmoji}>🎬</Text>
              <View style={styles.resultDur}>
                <Text style={styles.resultDurText}>0:30</Text>
              </View>
            </View>
            <View style={styles.resultInfo}>
              <Text style={styles.resultTitle}>
                我的混剪成品 · {mixTask.taskId.slice(-6)}
              </Text>
              <Text style={styles.resultDesc}>
                任务编号 {mixTask.taskId}
                {'\n'}分辨率 1080×1920 · 时长约 30s
              </Text>
              <View style={styles.resultActions}>
                <TouchableOpacity
                  style={styles.resultBtn1}
                  activeOpacity={0.85}
                  onPress={() => navigation.navigate('ProClipsPlatforms')}
                >
                  <Text style={styles.resultBtn1Text}>📤 一键分发</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.resultBtn2}
                  activeOpacity={0.85}
                  onPress={() => navigation.navigate('Main')}
                >
                  <Text style={styles.resultBtn2Text}>查看视频库</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        ) : null}
      </ScrollView>

      {/* 底部 CTA */}
      <View style={styles.ctaBar}>
        <TouchableOpacity
          activeOpacity={0.95}
          onPress={() => navigation.navigate('Main')}
        >
          <LinearGradient
            colors={
              completed
                ? [...gradients.main]
                : ['rgba(255,255,255,0.06)', 'rgba(255,255,255,0.06)']
            }
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.ctaBtn}
          >
            <Text style={[styles.ctaText, !completed && { color: colors.txt2 }]}>
              {completed ? '返回首页' : '稍后查看进度'}
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

// ---- 导航栏子组件 ----
const NavBar: React.FC<{ title: string; onBack: () => void }> = ({ title, onBack }) => (
  <View style={styles.navBar}>
    <TouchableOpacity
      style={styles.iconBtn}
      onPress={onBack}
      hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
    >
      <Text style={styles.backChar}>‹</Text>
    </TouchableOpacity>
    <Text style={styles.navTitle}>{title}</Text>
    <View style={styles.iconBtn} />
  </View>
);

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bgDeep },
  // 导航栏
  navBar: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    backgroundColor: colors.bgDeep,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  iconBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  backChar: { fontSize: 30, color: colors.txt1, fontWeight: '300', marginTop: -6 },
  navTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 17,
    fontWeight: '700',
    color: colors.txt1,
  },
  // 内容
  container: { flex: 1 },
  body: { padding: 16, paddingBottom: 100 },
  // 空态
  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  emptyEmoji: { fontSize: 56, marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: colors.txt1, marginBottom: 8 },
  emptyDesc: {
    fontSize: 13,
    color: colors.txt2,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  emptyCta: {
    borderRadius: radius.lg,
    paddingVertical: 13,
    paddingHorizontal: 28,
    alignItems: 'center',
  },
  emptyCtaText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  // 圆环
  ringWrap: { alignItems: 'center', paddingVertical: 20, position: 'relative' },
  ringCenter: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ringPercent: { fontSize: 38, fontWeight: '900', color: colors.magenta },
  ringStatus: { fontSize: 12, color: colors.amber, marginTop: 4, fontWeight: '700' },
  hint: {
    fontSize: 13,
    color: colors.txt2,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
    marginTop: 4,
  },
  // 步骤卡
  stepsCard: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 16,
    marginBottom: 16,
  },
  stepsTitle: { fontSize: 14, fontWeight: '700', color: colors.txt1, marginBottom: 14 },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  stepDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.06)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  stepDotDone: { backgroundColor: colors.cyan },
  stepDotActive: {
    backgroundColor: 'rgba(255,181,71,0.18)',
    borderWidth: 1.5,
    borderColor: colors.amber,
  },
  stepDotText: { color: colors.txt3, fontSize: 11, fontWeight: '700' },
  stepLabel: { flex: 1, fontSize: 13, color: colors.txt3, fontWeight: '500' },
  stepLabelDone: { color: colors.txt1, fontWeight: '600' },
  stepLabelActive: { color: colors.amber, fontWeight: '700' },
  stepDoing: { fontSize: 11, color: colors.amber, fontWeight: '700' },
  stepDone: { fontSize: 11, color: colors.success, fontWeight: '600' },
  stepPending: { fontSize: 11, color: colors.txt3 },
  // 错误
  errBox: {
    backgroundColor: 'rgba(255,59,92,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,59,92,0.3)',
    borderRadius: radius.sm,
    padding: 12,
    marginBottom: 12,
  },
  errText: { color: colors.error, fontSize: 12, lineHeight: 18 },
  // 成品卡
  resultCard: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.line,
    overflow: 'hidden',
    marginBottom: 16,
  },
  resultCover: {
    aspectRatio: 16 / 9,
    backgroundColor: colors.bgCard2,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  resultEmoji: { fontSize: 48 },
  resultDur: {
    position: 'absolute',
    right: 8,
    bottom: 8,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  resultDurText: { color: '#fff', fontSize: 11, fontWeight: '600' },
  resultInfo: { padding: 14 },
  resultTitle: { fontSize: 14, fontWeight: '700', color: colors.txt1, marginBottom: 6 },
  resultDesc: { fontSize: 11, color: colors.txt3, lineHeight: 17, marginBottom: 12 },
  resultActions: { flexDirection: 'row', gap: 10 },
  resultBtn1: {
    flex: 1,
    backgroundColor: colors.cyan,
    borderRadius: radius.sm,
    paddingVertical: 10,
    alignItems: 'center',
  },
  resultBtn1Text: { color: '#000', fontSize: 12, fontWeight: '800' },
  resultBtn2: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.sm,
    paddingVertical: 10,
    alignItems: 'center',
  },
  resultBtn2Text: { color: colors.txt1, fontSize: 12, fontWeight: '700' },
  // 底部 CTA
  ctaBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.bgDeep,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  ctaBtn: {
    borderRadius: radius.lg,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});

export default ProClipsMixStatusScreen;
