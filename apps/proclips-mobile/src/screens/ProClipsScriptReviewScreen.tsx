/**
 * ProClipsScriptReviewScreen - 文案确认
 *
 * 对应原型 page-script-review：导航栏（含重新生成）+ 子标题 + 3 版文案卡片（单选）+ 底部 CTA
 * 选中后点击 CTA 将文案保存到 store 并跳转音色录制
 */
import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import type { AppScreenProps } from '../types/navigation';
import { colors, gradients, radius } from '../components/Theme';
import { showToast } from '../components/Toast';
import { useProClipsStore } from '../stores/ProClipsStore';

interface ScriptDraft {
  version: string; // V1/V2/V3
  title: string; // 文案标题
  style: string; // 风格标签
  duration: string; // 预计时长
  body: string[]; // 文案正文（按段落）
}

// mock 3 版文案（火锅主题）
const SCRIPT_DRAFTS: ScriptDraft[] = [
  {
    version: 'V1',
    title: '热情种草型',
    style: '热情活力',
    duration: '32s',
    body: [
      '🔥 这锅麻辣锅底，老王熬了整整 4 小时！',
      '牛油 + 32 味香料，越煮越香，越涮越上头。',
      '今日进店报「老王视频」，锅底免单！',
      '📍 万达广场 3 楼 · 老王火锅店',
    ],
  },
  {
    version: 'V2',
    title: '悬念反转型',
    style: '专业信任',
    duration: '28s',
    body: [
      '在万达开了 8 年的火锅店，凭什么天天排队？',
      '答案就藏在这锅底里 ——',
      '现熬牛油锅底，鲜切毛肚现刨现涮。',
      '本周双人套餐 5 折，戳定位预约 👇',
    ],
  },
  {
    version: 'V3',
    title: '直白促销型',
    style: '温馨亲切',
    duration: '35s',
    body: [
      '火锅党注意！老王火锅店放大招了！',
      '招牌麻辣锅底 + 鲜切毛肚 + 6 元素菜任选，',
      '原价 168，视频专享价 88！',
      '仅限本周，先到先得 📍 万达 3 楼',
    ],
  },
];

const ProClipsScriptReviewScreen: React.FC<AppScreenProps<'ProClipsScriptReview'>> = ({
  navigation,
}) => {
  const setGeneratedScript = useProClipsStore((s) => s.setGeneratedScript);
  const [selected, setSelected] = useState(0);
  const [regenerating, setRegenerating] = useState(false);

  // 重新生成文案（mock）
  const handleRegen = () => {
    if (regenerating) return;
    setRegenerating(true);
    Alert.alert('AI 正在重新生成文案…');
    setTimeout(() => {
      setRegenerating(false);
    }, 1200);
  };

  // 使用所选文案：保存到 store 并跳转音色录制
  const handleUse = () => {
    const draft = SCRIPT_DRAFTS[selected];
    const script = draft.body.join('\n');
    setGeneratedScript(script);
    navigation.navigate('ProClipsVoiceSample');
  };

  // 编辑文案（mock：Alert 弹出提示）
  const handleEdit = (index: number) => {
    Alert.alert(
      `编辑 ${SCRIPT_DRAFTS[index].version}`,
      'V1 版本：编辑功能将在 V2 上线，当前可使用「复制」粘贴到外部编辑器。',
      [{ text: '好的' }]
    );
  };

  // 复制文案
  const handleCopy = (index: number) => {
    const draft = SCRIPT_DRAFTS[index];
    showToast('success', `${draft.version} 文案已复制（mock）`);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* 导航栏：返回 + 标题 + 重新生成 */}
      <View style={styles.navBar}>
        <TouchableOpacity
          style={styles.iconBtn}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Text style={styles.backChar}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.navTitle}>文案确认</Text>
        <TouchableOpacity
          style={styles.iconBtn}
          onPress={handleRegen}
          disabled={regenerating}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Text style={[styles.regenChar, regenerating && styles.regenCharLoading]}>↻</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.body}
        showsVerticalScrollIndicator={false}
      >
        {/* 子标题区 */}
        <View style={styles.subheader}>
          <Text style={styles.subH2}>AI 已生成 3 版文案</Text>
          <Text style={styles.subDesc}>
            选择一版，或点击「编辑」微调。文案将作为视频配音脚本。
          </Text>
        </View>

        {/* 3 版文案卡片 */}
        <View style={styles.list}>
          {SCRIPT_DRAFTS.map((draft, index) => {
            const isSelected = selected === index;
            return (
              <TouchableOpacity
                key={draft.version}
                style={[styles.scriptCard, isSelected && styles.scriptCardSelected]}
                onPress={() => setSelected(index)}
                activeOpacity={0.9}
              >
                {/* 选中标记（右上角） */}
                {isSelected ? (
                  <View style={styles.selectedMark}>
                    <Text style={styles.selectedMarkText}>✓</Text>
                  </View>
                ) : null}

                {/* 卡片头部：版本标签 + 标题 + 风格标签 + 时长 */}
                <View style={styles.cardHead}>
                  <View style={[styles.versionTag, isSelected && styles.versionTagActive]}>
                    <Text
                      style={[
                        styles.versionTagText,
                        isSelected && styles.versionTagTextActive,
                      ]}
                    >
                      {draft.version}
                    </Text>
                  </View>
                  <Text style={styles.cardTitle}>{draft.title}</Text>
                  <View style={styles.styleTag}>
                    <Text style={styles.styleTagText}>{draft.style}</Text>
                  </View>
                  <View style={styles.durationTag}>
                    <Text style={styles.durationText}>⏱ {draft.duration}</Text>
                  </View>
                </View>

                {/* 文案正文 */}
                <View style={styles.cardBody}>
                  {draft.body.map((line, i) => (
                    <Text key={i} style={styles.bodyLine}>{line}</Text>
                  ))}
                </View>

                {/* 卡片底部操作栏：编辑 / 复制 / 选择 */}
                <View style={styles.cardFoot}>
                  <TouchableOpacity
                    style={styles.footBtn}
                    activeOpacity={0.7}
                    onPress={() => handleEdit(index)}
                  >
                    <Text style={styles.footBtnIcon}>✏️</Text>
                    <Text style={styles.footBtnText}>编辑</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.footBtn}
                    activeOpacity={0.7}
                    onPress={() => handleCopy(index)}
                  >
                    <Text style={styles.footBtnIcon}>📋</Text>
                    <Text style={styles.footBtnText}>复制</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.footBtn, styles.footBtnPrimary, isSelected && styles.footBtnSelected]}
                    activeOpacity={0.7}
                    onPress={() => setSelected(index)}
                  >
                    <Text
                      style={[
                        styles.footBtnText,
                        styles.footBtnPrimaryText,
                        isSelected && styles.footBtnSelectedText,
                      ]}
                    >
                      {isSelected ? '✓ 已选' : '选择'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      {/* 底部 CTA 栏 */}
      <View style={styles.ctaBar}>
        <TouchableOpacity activeOpacity={0.95} onPress={handleUse}>
          <LinearGradient
            colors={[...gradients.main]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.ctaBtn}
          >
            <Text style={styles.ctaText}>使用此文案 →</Text>
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
  regenChar: { fontSize: 22, color: colors.txt1, fontWeight: '600' },
  regenCharLoading: { opacity: 0.4 },
  navTitle: { flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '700', color: colors.txt1 },
  // 内容
  container: { flex: 1 },
  body: { padding: 16, paddingBottom: 120 },
  // 子标题
  subheader: { marginBottom: 16 },
  subH2: { fontSize: 18, fontWeight: '700', color: colors.txt1, marginBottom: 6 },
  subDesc: { fontSize: 13, color: colors.txt2, lineHeight: 20 },
  // 列表
  list: { gap: 12 },
  // 文案卡片
  scriptCard: {
    position: 'relative',
    backgroundColor: colors.bgCard,
    borderRadius: radius.md,
    padding: 14,
    borderWidth: 1.5,
    borderColor: colors.line,
  },
  scriptCardSelected: {
    borderColor: colors.magenta,
    backgroundColor: colors.bgCard2,
    shadowColor: colors.magenta,
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  selectedMark: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.magenta,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedMarkText: { color: '#fff', fontSize: 14, fontWeight: '800' },
  cardHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
    paddingRight: 30,
  },
  versionTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  versionTagActive: { backgroundColor: colors.magenta },
  versionTagText: { color: colors.txt2, fontSize: 11, fontWeight: '700' },
  versionTagTextActive: { color: '#fff' },
  cardTitle: { flex: 1, fontSize: 14, fontWeight: '700', color: colors.txt1 },
  styleTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    backgroundColor: 'rgba(168,85,247,0.16)',
  },
  styleTagText: { color: colors.purple, fontSize: 11, fontWeight: '600' },
  durationTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    backgroundColor: 'rgba(0,210,255,0.14)',
  },
  durationText: { color: colors.cyan, fontSize: 11, fontWeight: '600' },
  cardBody: { gap: 4, marginBottom: 12 },
  bodyLine: { fontSize: 13, color: colors.txt2, lineHeight: 20 },
  // 底部操作栏
  cardFoot: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  footBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  footBtnIcon: { fontSize: 12 },
  footBtnText: { fontSize: 11, fontWeight: '600', color: colors.txt2 },
  footBtnPrimary: {
    marginLeft: 'auto',
    backgroundColor: 'rgba(255,107,157,0.16)',
  },
  footBtnPrimaryText: { color: colors.magenta, fontWeight: '700' },
  footBtnSelected: {
    backgroundColor: colors.magenta,
  },
  footBtnSelectedText: { color: '#fff' },
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

export default ProClipsScriptReviewScreen;
