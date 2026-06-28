/**
 * ProClipsWorkflowScreen - 制作流程
 *
 * 对应原型 page-workflow：导航栏 + 6 步进度条 + 当前步骤卡片 + 渐变 CTA
 */
import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import type { AppScreenProps } from '../types/navigation';
import { colors, gradients, radius } from '../components/Theme';
import { showToast } from '../components/Toast';

// 6 步骤标签
const WF_STEPS = ['拍摄', '商品', '文案', '音色', '混剪', '成品'];

// 每步详情：标题 + 描述 + CTA 文案
const STEP_INFO = [
  {
    title: '分段拍摄引导',
    desc: '按分镜顺序逐段上传拍摄好的视频片段，AI 会自动对齐节奏与时长。',
    cta: '前往上传素材 →',
  },
  {
    title: '填写商品信息',
    desc: '告诉 AI 你要推的商品名、核心卖点和优惠信息，文案会更精准。',
    cta: '填写商品信息 →',
  },
  {
    title: 'AI 生成文案',
    desc: '根据你的商品信息，AI 会生成 3 版文案供你选择，支持微调。',
    cta: '生成文案 →',
  },
  {
    title: '录制/选择音色',
    desc: '录制你的声音样本，AI 会克隆你的音色用于视频配音。',
    cta: '录制音色 →',
  },
  {
    title: '提交混剪任务',
    desc: '确认素材、文案、音色无误后，提交混剪，预计 2-3 分钟完成。',
    cta: '提交混剪 →',
  },
  {
    title: '成品已就绪',
    desc: '视频已生成并存入视频库，可下载、分享或设为公开让达人分销。',
    cta: '查看视频库 →',
  },
];

const ProClipsWorkflowScreen: React.FC<AppScreenProps<'ProClipsWorkflow'>> = ({
  route,
  navigation,
}) => {
  const { templateId, title, taskId } = route.params;
  // taskId 存在时为继续任务（第 2 步），否则新任务从第 1 步开始
  const [curStep, setCurStep] = useState(taskId ? 2 : 1);

  const info = STEP_INFO[curStep - 1];

  // 点击 CTA：根据当前步骤跳转对应子页面
  const onCta = () => {
    switch (curStep) {
      case 1:
        navigation.navigate('ProClipsSceneUpload', { templateId, title });
        break;
      case 2:
        navigation.navigate('ProClipsProductInfo', { templateId, title });
        break;
      case 3:
        navigation.navigate('ProClipsScriptReview', { templateId, title });
        break;
      case 4:
        navigation.navigate('ProClipsVoiceSample');
        break;
      case 5:
        navigation.navigate('ProClipsMixStatus', { taskId });
        break;
      case 6:
        navigation.goBack();
        showToast('info', '已跳转到视频库');
        break;
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* 导航栏：返回 + 标题 + 保存草稿 */}
      <View style={styles.navBar}>
        <TouchableOpacity
          style={styles.iconBtn}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Text style={styles.backChar}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.navTitle}>制作流程</Text>
        <TouchableOpacity
          style={styles.iconBtn}
          onPress={() => showToast('info', '任务已保存草稿')}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Text style={styles.saveChar}>💾</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.body}
        showsVerticalScrollIndicator={false}
      >
        {/* 6 步进度条 */}
        <View style={styles.wfProgress}>
          {WF_STEPS.map((label, i) => {
            const idx = i + 1;
            const done = idx < curStep;
            const cur = idx === curStep;
            const isFirst = i === 0;
            const isLast = i === WF_STEPS.length - 1;
            const leftActive = !isFirst && idx <= curStep;
            const rightActive = !isLast && idx < curStep;
            return (
              <View key={label} style={styles.wfStep}>
                <View style={styles.wsRow}>
                  {/* 左连接线 */}
                  <View style={styles.wsLineWrap}>
                    {leftActive ? (
                      <LinearGradient
                        colors={[...gradients.cool]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.wsLineActive}
                      />
                    ) : (
                      <View style={styles.wsLine} />
                    )}
                  </View>
                  {/* 步骤点 */}
                  {done ? (
                    <LinearGradient
                      colors={[...gradients.cool]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.wsDotDone}
                    >
                      <Text style={[styles.wsDotText, styles.wsDotTextDone]}>✓</Text>
                    </LinearGradient>
                  ) : cur ? (
                    <View style={styles.wsDotCurGlow}>
                      <LinearGradient
                        colors={[...gradients.warm]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.wsDotCur}
                      >
                        <Text style={[styles.wsDotText, styles.wsDotTextCur]}>{idx}</Text>
                      </LinearGradient>
                    </View>
                  ) : (
                    <View style={styles.wsDot}>
                      <Text style={styles.wsDotText}>{idx}</Text>
                    </View>
                  )}
                  {/* 右连接线 */}
                  <View style={styles.wsLineWrap}>
                    {rightActive ? (
                      <LinearGradient
                        colors={[...gradients.cool]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.wsLineActive}
                      />
                    ) : (
                      <View style={styles.wsLine} />
                    )}
                  </View>
                </View>
                <Text
                  style={[
                    styles.wsLabel,
                    cur && styles.wsLabelCur,
                    !done && !cur && styles.wsLabelFuture,
                  ]}
                >
                  {label}
                </Text>
              </View>
            );
          })}
        </View>

        {/* 当前步骤卡片 */}
        <View style={styles.wfCard}>
          <Text style={styles.wcStep}>STEP {curStep} / 6</Text>
          <Text style={styles.wcTitle}>{info.title}</Text>
          <Text style={styles.wcDesc}>{info.desc}</Text>
          <TouchableOpacity activeOpacity={0.95} onPress={onCta} style={styles.ctaWrap}>
            <LinearGradient
              colors={[...gradients.main]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.ctaBtn}
            >
              <Text style={styles.ctaText}>{info.cta}</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </ScrollView>
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
  saveChar: { fontSize: 18 },
  navTitle: { flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '700', color: colors.txt1 },
  // 内容
  container: { flex: 1 },
  body: { padding: 16, paddingBottom: 120 },
  // 进度条
  wfProgress: {
    flexDirection: 'row',
    backgroundColor: colors.bgCard,
    borderRadius: radius.md,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.line,
    marginBottom: 16,
  },
  wfStep: { flex: 1, alignItems: 'center' },
  wsRow: { flexDirection: 'row', alignItems: 'center', width: '100%' },
  wsLineWrap: { flex: 1, height: 2, paddingHorizontal: 2, justifyContent: 'center' },
  wsLine: { height: 2, backgroundColor: 'rgba(255,255,255,0.08)' },
  wsLineActive: { height: 2 },
  wsDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.bgElev,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.line,
  },
  wsDotDone: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0,210,255,0.6)',
  },
  wsDotCurGlow: {
    width: 28,
    height: 28,
    borderRadius: 14,
    shadowColor: colors.amber,
    shadowOpacity: 0.55,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
    elevation: 6,
  },
  wsDotCur: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.amber,
  },
  wsDotText: { fontSize: 12, fontWeight: '700', color: colors.txt3 },
  wsDotTextDone: { color: '#fff' },
  wsDotTextCur: { color: '#fff' },
  wsLabel: { fontSize: 10, color: colors.txt2, marginTop: 6, textAlign: 'center' },
  wsLabelCur: { color: colors.amber, fontWeight: '700' },
  wsLabelFuture: { color: colors.txt3 },
  // 当前步骤卡片
  wfCard: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.lg,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.line,
    marginBottom: 16,
  },
  wcStep: { fontSize: 12, color: colors.cyan, fontWeight: '700', letterSpacing: 1, marginBottom: 8 },
  wcTitle: { fontSize: 20, fontWeight: '800', color: colors.txt1, marginBottom: 8 },
  wcDesc: { fontSize: 13, color: colors.txt2, lineHeight: 20 },
  ctaWrap: { marginTop: 18 },
  ctaBtn: {
    borderRadius: radius.lg,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});

export default ProClipsWorkflowScreen;
