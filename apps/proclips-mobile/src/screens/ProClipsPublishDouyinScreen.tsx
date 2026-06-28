/**
 * ProClipsPublishDouyinScreen - 发布到平台（达人侧）
 *
 * 对应原型 page-publish-douyin：
 *   导航栏 + Hero（平台图标 + 标题 + 描述）
 *   + 拉起平台发布操作行
 *   + 分享文案复制框
 *   + 保存视频到相册操作行
 *   + 底部 CTA「已发布，记录数据」→ 跳转数据追踪
 */
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import type { AppScreenProps, PlatformKey } from '../types/navigation';
import { colors, gradients, radius, platformLabels } from '../components/Theme';
import { useProClipsStore } from '../stores/ProClipsStore';
import { SHARE_TEXT } from '../services/ProClipsService';

// 平台图标 emoji 与渐变（与 MaterialDetail Sheet 保持一致）
const PLATFORM_META: Record<PlatformKey, { emoji: string; grad: string[]; heroDesc: string }> = {
  douyin: {
    emoji: '🎵',
    grad: ['#000000', '#222222'],
    heroDesc: '已为你准备好视频与专属文案，点击下方操作完成发布',
  },
  kuaishou: {
    emoji: '⚡',
    grad: ['#FF6600', '#FF8C42'],
    heroDesc: '已为你准备好视频与专属文案，点击下方操作完成发布',
  },
  xiaohongshu: {
    emoji: '📕',
    grad: ['#FF2E4D', '#FF6680'],
    heroDesc: '已为你准备好视频与专属文案，点击下方操作完成发布',
  },
  wechat_video: {
    emoji: '💚',
    grad: ['#07C160', '#3DD680'],
    heroDesc: '已为你准备好视频与专属文案，点击下方操作完成发布',
  },
  bilibili: {
    emoji: '📺',
    grad: ['#23ADE5', '#5BC6F0'],
    heroDesc: '已为你准备好视频与专属文案，点击下方操作完成发布',
  },
  weibo: {
    emoji: '🌐',
    grad: ['#E6162D', '#FF4D5C'],
    heroDesc: '已为你准备好视频与专属文案，点击下方操作完成发布',
  },
};

const ProClipsPublishDouyinScreen: React.FC<
  AppScreenProps<'ProClipsPublishDouyin'>
> = ({ navigation, route }) => {
  const platform = route.params.platform ?? 'douyin';
  const materialId = route.params.materialId;
  const materials = useProClipsStore((s) => s.materials);
  const material = materials.find((m) => m.id === materialId);

  const meta = PLATFORM_META[platform];
  const platLabel = platformLabels[platform];

  const handleLaunchApp = () => {
    Alert.alert(
      `拉起${platLabel}`,
      `正在尝试拉起${platLabel} App…（V1 mock）`,
      [{ text: '我知道了' }]
    );
  };

  const handleCopyText = () => {
    // RN 真实场景应使用 @react-native-clipboard/clipboard
    // 这里 mock 提示
    Alert.alert('已复制', '分享文案已复制到剪贴板（mock）', [{ text: '好的' }]);
  };

  const handleSaveVideo = () => {
    Alert.alert('已保存', '视频已保存到相册（mock）', [{ text: '好的' }]);
  };

  const handleRecordAndGotoStats = () => {
    // 跳转数据追踪页（mock：记录发布数据）
    navigation.replace('ProClipsStatsTracking');
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
        <Text style={styles.navTitle}>发布到{platLabel}</Text>
        <View style={styles.iconBtn} />
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.body}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <LinearGradient
          colors={[...meta.grad]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.hero}
        >
          <Text style={styles.heroIcon}>{meta.emoji}</Text>
          <Text style={styles.heroTitle}>即将拉起{platLabel} App</Text>
          <Text style={styles.heroDesc}>{meta.heroDesc}</Text>
        </LinearGradient>

        {/* 拉起平台发布 */}
        <TouchableOpacity
          style={styles.actionRow}
          activeOpacity={0.85}
          onPress={handleLaunchApp}
        >
          <View style={[styles.actionIcon, { backgroundColor: 'rgba(0,0,0,0.4)' }]}>
            <Text style={styles.actionIconText}>📱</Text>
          </View>
          <View style={styles.actionInfo}>
            <Text style={styles.actionTitle}>拉起{platLabel}发布</Text>
            <Text style={styles.actionDesc}>自动填充视频与文案，一键发布</Text>
          </View>
          <Text style={styles.actionArrow}>›</Text>
        </TouchableOpacity>

        {/* 分享文案复制框（点击复制，无复制按钮） */}
        <View style={styles.copyBox}>
          <Text style={styles.copyLabel}>{`📋 分享文案（点击复制）`}</Text>
          <TouchableOpacity activeOpacity={0.85} onPress={handleCopyText}>
            <Text style={styles.copyText}>{SHARE_TEXT}</Text>
          </TouchableOpacity>
        </View>

        {/* 保存视频到相册 */}
        <TouchableOpacity
          style={styles.actionRow}
          activeOpacity={0.85}
          onPress={handleSaveVideo}
        >
          <View style={[styles.actionIcon, { backgroundColor: 'rgba(251,191,36,0.16)' }]}>
            <Text style={styles.actionIconText}>💾</Text>
          </View>
          <View style={styles.actionInfo}>
            <Text style={styles.actionTitle}>保存视频到相册</Text>
            <Text style={styles.actionDesc}>下载原片到本地，随时发布</Text>
          </View>
          <Text style={styles.actionArrow}>›</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* 底部 CTA */}
      <View style={styles.ctaBar}>
        <TouchableOpacity
          activeOpacity={0.95}
          onPress={handleRecordAndGotoStats}
        >
          <LinearGradient
            colors={[...gradients.main]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.ctaBtn}
          >
            <Text style={styles.ctaIcon}>✓</Text>
            <Text style={styles.ctaText}>已发布，记录数据</Text>
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
  // Hero
  hero: {
    borderRadius: radius.lg,
    paddingVertical: 24,
    paddingHorizontal: 20,
    alignItems: 'center',
    marginBottom: 14,
  },
  heroIcon: { fontSize: 48, marginBottom: 10 },
  heroTitle: { fontSize: 18, fontWeight: '800', color: '#fff' },
  heroDesc: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
    lineHeight: 20,
    marginTop: 6,
  },
  // 操作行
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.bgCard,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 14,
    marginBottom: 12,
  },
  actionIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionIconText: { fontSize: 20 },
  actionInfo: { flex: 1, minWidth: 0 },
  actionTitle: { fontSize: 14, fontWeight: '600', color: colors.txt1, marginBottom: 2 },
  actionDesc: { fontSize: 11, color: colors.txt2 },
  actionArrow: { fontSize: 22, color: colors.txt3, fontWeight: '300' },
  // 分享文案复制框
  copyBox: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 14,
    marginBottom: 12,
  },
  copyLabel: { fontSize: 12, color: colors.txt2, fontWeight: '600', marginBottom: 8 },
  copyText: {
    fontSize: 13,
    lineHeight: 21,
    color: colors.txt1,
    backgroundColor: colors.bgElev,
    borderRadius: 10,
    paddingVertical: 11,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: colors.line,
  },
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: radius.lg,
    paddingVertical: 15,
  },
  ctaIcon: { color: '#fff', fontSize: 16, fontWeight: '800' },
  ctaText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});

export default ProClipsPublishDouyinScreen;
