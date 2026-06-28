/**
 * ProClipsVoiceSampleScreen - 音色录制
 *
 * 对应原型 page-voice：导航栏 + 朗读卡（vc-prompt + 波形 + 录音按钮）+ 已录制样本列表 + 底部 CTA
 * 录制为模拟（mock），提交时将音色样本 URI 写入 store 并跳转混剪状态页
 */
import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import type { AppScreenProps } from '../types/navigation';
import { colors, gradients, radius, shadows } from '../components/Theme';
import { useProClipsStore } from '../stores/ProClipsStore';
import { submitMixTask } from '../services/ProClipsService';

type RecordState = 'idle' | 'recording' | 'done';

interface VoiceSample {
  id: string;
  title: string;
  desc: string;
  bars: number[]; // 0-100
}

// 朗读文字（对照原型 vc-prompt）
const PROMPT_INTRO = '请朗读以下文字，保持自然语速和情绪：';
const PROMPT_TEXT =
  '"大家好，我是老王，老王火锅店的老板。我们家招牌麻辣锅底，现熬 4 小时，欢迎来尝尝！"';

// 波形条数（对照原型 20 根）
const WAVE_BAR_COUNT = 20;
const WAVE_BARS_IDLE = Array.from({ length: WAVE_BAR_COUNT }, () => 8);

// 已录制样本波形条数（对照原型 randomBars(30)）
const SAMPLE_BARS_COUNT = 30;

const randomBars = (n: number) =>
  Array.from({ length: n }, () => Math.floor(Math.random() * 70 + 20));

// 初始 mock 样本（对照原型 VOICE_SAMPLES）
const INITIAL_SAMPLES: VoiceSample[] = [
  {
    id: 's1',
    title: '样本 1 · 自我介绍',
    desc: '0:18 · 今日 14:30 录制',
    bars: randomBars(28),
  },
  {
    id: 's2',
    title: '样本 2 · 菜品推荐',
    desc: '0:22 · 昨日 19:15 录制',
    bars: randomBars(34),
  },
];

const ProClipsVoiceSampleScreen: React.FC<AppScreenProps<'ProClipsVoiceSample'>> = ({
  navigation,
}) => {
  const setVoiceSampleUri = useProClipsStore((s) => s.setVoiceSampleUri);
  const setMixTask = useProClipsStore((s) => s.setMixTask);
  const selectedTemplate = useProClipsStore((s) => s.selectedTemplate);
  const productInfo = useProClipsStore((s) => s.productInfo);
  const generatedScript = useProClipsStore((s) => s.generatedScript);
  const [submitting, setSubmitting] = useState(false);
  const [recordState, setRecordState] = useState<RecordState>('idle');
  const [duration, setDuration] = useState(0); // 秒
  const [waveHeights, setWaveHeights] = useState<number[]>(WAVE_BARS_IDLE);
  const [samples, setSamples] = useState<VoiceSample[]>(INITIAL_SAMPLES);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const waveRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const durationRef = useRef(0);

  // 组件卸载时清理定时器
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (waveRef.current) clearInterval(waveRef.current);
    };
  }, []);

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  };

  // 开始录制：启动时长计数 + 波形动画
  const startRecording = () => {
    setRecordState('recording');
    setDuration(0);
    durationRef.current = 0;
    timerRef.current = setInterval(() => {
      durationRef.current += 1;
      setDuration(durationRef.current);
    }, 1000);
    waveRef.current = setInterval(() => {
      setWaveHeights(
        Array.from({ length: WAVE_BAR_COUNT }, () => Math.floor(Math.random() * 52) + 10)
      );
    }, 200);
  };

  // 停止录制：清理定时器，过短则丢弃；成功则追加为新样本
  const stopRecording = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (waveRef.current) {
      clearInterval(waveRef.current);
      waveRef.current = null;
    }
    setWaveHeights(WAVE_BARS_IDLE);
    if (durationRef.current < 1) {
      setRecordState('idle');
      setDuration(0);
      return;
    }
    setRecordState('done');
    // 追加新样本（对照原型 toggleRecord 行为）
    const newSample: VoiceSample = {
      id: `s${Date.now()}`,
      title: `样本 ${samples.length + 1} · 刚录制`,
      desc: `${formatTime(durationRef.current)} · 刚刚`,
      bars: randomBars(SAMPLE_BARS_COUNT),
    };
    setSamples((prev) => [...prev, newSample]);
  };

  // 按住录制 / 松开停止
  const onPressIn = () => {
    if (recordState !== 'recording') startRecording();
  };
  const onPressOut = () => {
    if (recordState === 'recording') stopRecording();
  };

  // 提交混剪任务：写入音色样本 URI → 创建混剪任务 → 跳转混剪状态页
  const handleSubmit = async () => {
    let uri: string;
    if (recordState === 'done' && duration > 0) {
      uri = `mock://voice/recorded_${duration}s`;
    } else {
      uri = `mock://voice/sample_${samples.length}`;
    }
    setVoiceSampleUri(uri);
    if (!selectedTemplate) {
      // 兜底：无模板直接跳转（避免阻塞用户）
      navigation.navigate('ProClipsMixStatus', {});
      return;
    }
    setSubmitting(true);
    try {
      const task = await submitMixTask(
        selectedTemplate,
        productInfo,
        generatedScript,
        uri
      );
      setMixTask(task);
      navigation.navigate('ProClipsMixStatus', { taskId: task.taskId });
    } finally {
      setSubmitting(false);
    }
  };

  // 录音按钮中心文案
  const renderBtnContent = () => {
    if (recordState === 'recording') {
      return <Text style={styles.recBtnTime}>{formatTime(duration)}</Text>;
    }
    if (recordState === 'done') {
      return <Text style={styles.recBtnDone}>✓</Text>;
    }
    return <Text style={styles.recBtnIdle}>{`开始录音`}</Text>;
  };

  // 录制区下方提示
  const renderHint = () => {
    if (recordState === 'recording') {
      return <Text style={[styles.recHint, styles.recHintActive]}>{`录音中… ${formatTime(duration)}`}</Text>;
    }
    if (recordState === 'done') {
      return (
        <Text style={[styles.recHint, styles.recHintDone]}>{`录制完成 · 已保存为新样本`}</Text>
      );
    }
    return <Text style={styles.recHint}>{`点击按钮开始录制 · 建议录制 15-30 秒`}</Text>;
  };

  // 录音按钮：84x84，gradients.warm 底 + 涟漪环 + 玫红光晕
  const renderRecordButton = () => {
    const button =
      recordState === 'recording' ? (
        <View style={[styles.recBtn, styles.recBtnRecording]}>{renderBtnContent()}</View>
      ) : (
        <LinearGradient
          colors={[...gradients.warm]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.recBtn}
        >
          {renderBtnContent()}
        </LinearGradient>
      );

    return (
      <View style={styles.recBtnWrap}>
        <View style={styles.ripple} />
        <TouchableOpacity
          activeOpacity={0.85}
          onPressIn={onPressIn}
          onPressOut={onPressOut}
          style={styles.recBtnTouch}
        >
          {button}
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* 导航栏 */}
      <View style={styles.navBar}>
        <TouchableOpacity
          style={styles.iconBtn}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Text style={styles.backChar}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.navTitle}>{`音色录制`}</Text>
        <View style={styles.iconBtn} />
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.body}
        showsVerticalScrollIndicator={false}
      >
        {/* 朗读卡 voice-card */}
        <View style={styles.voiceCard}>
          <Text style={styles.vcPromptIntro}>{PROMPT_INTRO}</Text>
          <Text style={styles.vcPromptText}>{PROMPT_TEXT}</Text>

          {/* 波形 */}
          <View style={styles.waveform}>
            {waveHeights.map((h, i) => {
              if (recordState === 'idle') {
                return <View key={i} style={styles.waveBarIdle} />;
              }
              return (
                <LinearGradient
                  key={i}
                  colors={[...gradients.main]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={[styles.waveBar, { height: h }]}
                />
              );
            })}
          </View>

          {/* 录音按钮 */}
          {renderRecordButton()}

          {renderHint()}
        </View>

        {/* 已录制样本 voice-list */}
        <View style={styles.voiceList}>
          <View style={styles.vlTitleRow}>
            <Text style={styles.vlTitle}>{`已录制样本`}</Text>
            <Text style={styles.vlCount}>{`${samples.length} 条`}</Text>
          </View>
          {samples.map((s) => (
            <View key={s.id} style={styles.voiceItem}>
              <TouchableOpacity
                style={styles.viPlay}
                activeOpacity={0.85}
                hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
              >
                <Text style={styles.viPlayIcon}>▶</Text>
              </TouchableOpacity>
              <View style={styles.viInfo}>
                <Text style={styles.viT} numberOfLines={1}>
                  {s.title}
                </Text>
                <Text style={styles.viD} numberOfLines={1}>
                  {s.desc}
                </Text>
              </View>
              <View style={styles.viWave}>
                {s.bars.map((h, idx) => (
                  <View key={idx} style={[styles.vw, { height: `${h}%` }]} />
                ))}
              </View>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* 底部 CTA 栏 */}
      <View style={styles.ctaBar}>
        <TouchableOpacity
          activeOpacity={0.95}
          onPress={handleSubmit}
          disabled={submitting}
        >
          <LinearGradient
            colors={[...gradients.main]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[styles.ctaBtn, submitting && styles.ctaBtnDisabled]}
          >
            <Text style={styles.ctaText}>
              {submitting ? '提交中…' : '提交混剪任务 →'}
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

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
  navTitle: { flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '700', color: colors.txt1 },
  // 内容
  container: { flex: 1 },
  body: { padding: 16, paddingBottom: 120 },
  // 朗读卡 voice-card
  voiceCard: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.lg,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.line,
    marginBottom: 16,
  },
  vcPromptIntro: { fontSize: 14, color: colors.txt2, lineHeight: 24, marginBottom: 8 },
  vcPromptText: { fontSize: 14, color: colors.amber, fontWeight: '700', lineHeight: 24 },
  // 波形
  waveform: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    height: 80,
    marginVertical: 18,
  },
  waveBar: { width: 4, borderRadius: 2 },
  waveBarIdle: { width: 4, height: 8, borderRadius: 2, backgroundColor: colors.txt3, opacity: 0.5 },
  // 录音按钮
  recBtnWrap: {
    width: 100,
    height: 100,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 6,
  },
  recBtnTouch: { width: 84, height: 84 },
  ripple: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 2,
    borderColor: 'rgba(255,107,157,0.3)',
  },
  recBtn: {
    width: 84,
    height: 84,
    borderRadius: 42,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.glow(colors.magenta),
  },
  recBtnRecording: { backgroundColor: colors.magenta },
  recBtnIdle: { color: '#fff', fontSize: 13, fontWeight: '700' },
  recBtnTime: { color: '#fff', fontSize: 22, fontWeight: '800' },
  recBtnDone: { color: '#fff', fontSize: 36, fontWeight: '800' },
  recHint: { fontSize: 12, color: colors.txt3, marginTop: 8 },
  recHintActive: { color: colors.magenta, fontWeight: '600' },
  recHintDone: { color: colors.cyan, fontWeight: '600' },
  // 已录制样本 voice-list
  voiceList: { marginTop: 14 },
  vlTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  vlTitle: { fontSize: 13, fontWeight: '700', color: colors.txt1 },
  vlCount: { fontSize: 13, color: colors.txt3, fontWeight: '500' },
  voiceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.bgCard,
    borderRadius: 12,
    paddingVertical: 11,
    paddingHorizontal: 13,
    borderWidth: 1,
    borderColor: colors.line,
    marginBottom: 8,
  },
  viPlay: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0,210,255,0.14)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  viPlayIcon: { color: colors.cyan, fontSize: 11, marginLeft: 2 },
  viInfo: { flex: 1 },
  viT: { fontSize: 13, fontWeight: '600', color: colors.txt1 },
  viD: { fontSize: 11, color: colors.txt3, marginTop: 2 },
  viWave: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    height: 24,
  },
  vw: { width: 2, backgroundColor: colors.cyan, borderRadius: 1, opacity: 0.7 },
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
  ctaBtnDisabled: { opacity: 0.55 },
  ctaText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});

export default ProClipsVoiceSampleScreen;
