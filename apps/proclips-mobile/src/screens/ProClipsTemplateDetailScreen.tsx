/**
 * ProClipsTemplateDetailScreen - 模板详情
 *
 * 对应原型 page-template-detail：导航栏 + 大封面 + 描述 + 分镜脚本列表 + 底部 CTA
 */
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import type { AppScreenProps } from '../types/navigation';
import { colors, gradients, radius } from '../components/Theme';
import { getTemplateById } from '../services/ProClipsService';
import { showToast } from '../components/Toast';

const ProClipsTemplateDetailScreen: React.FC<AppScreenProps<'ProClipsTemplateDetail'>> = ({
  route,
  navigation,
}) => {
  const { templateId, title } = route.params;
  const template = getTemplateById(templateId);

  // 未找到模板的兜底
  if (!template) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.navBar}>
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => navigation.goBack()}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Text style={styles.backChar}>‹</Text>
          </TouchableOpacity>
          <Text style={styles.navTitle}>模板详情</Text>
          <View style={styles.iconBtn} />
        </View>
        <View style={styles.empty}>
          <Text style={styles.emptyText}>模板未找到</Text>
        </View>
      </SafeAreaView>
    );
  }

  // 解析总时长，平均分配到每个分镜作为建议时长
  const totalSec = parseInt(template.duration, 10) || 30;
  const perScene = Math.max(1, Math.round(totalSec / template.scenes.length));
  const passTitle = title ?? template.title;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* 导航栏：返回 + 标题 + 收藏 */}
      <View style={styles.navBar}>
        <TouchableOpacity
          style={styles.iconBtn}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Text style={styles.backChar}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.navTitle}>模板详情</Text>
        <TouchableOpacity
          style={styles.iconBtn}
          onPress={() => showToast('info', '已收藏')}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Text style={styles.favChar}>♡</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.body}
        showsVerticalScrollIndicator={false}
      >
        {/* 大封面区：纯色 + 暗底渐变遮罩 + 标题 + 元信息 */}
        <View style={[styles.cover, { backgroundColor: template.coverColor || colors.magenta }]}>
          <LinearGradient
            colors={['rgba(15,15,30,0)', 'rgba(15,15,30,0)', 'rgba(15,15,30,0.95)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={styles.coverGrad}
          />
          <View style={styles.coverInfo}>
            <Text style={styles.coverTitle}>{template.title}</Text>
            <View style={styles.coverMeta}>
              <Text style={styles.coverMetaText}>🎬 {template.scenes.length} 分镜</Text>
              <Text style={styles.coverMetaText}>⏱ {template.duration}</Text>
              {template.industry ? (
                <Text style={styles.coverMetaText}>🏷 {template.industry}</Text>
              ) : null}
            </View>
          </View>
        </View>

        {/* 描述区 */}
        <View style={styles.subheader}>
          <Text style={styles.subheaderDesc}>{template.description}</Text>
          <Text style={styles.subheaderSample}>{template.sample}</Text>
        </View>

        {/* 分镜脚本列表 */}
        <View style={styles.sectionTitle}>
          <Text style={styles.sectionH}>分镜脚本</Text>
          <Text style={styles.sectionMore}>共 {template.scenes.length} 段</Text>
        </View>
        {template.scenes.map((scene, index) => (
          <View key={`${scene}-${index}`} style={styles.sceneItem}>
            <LinearGradient
              colors={[...gradients.cool]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.sceneNum}
            >
              <Text style={styles.sceneNumText}>{index + 1}</Text>
            </LinearGradient>
            <View style={styles.sceneText}>
              <Text style={styles.sceneTitle}>{scene}</Text>
              <Text style={styles.sceneDesc}>拍摄「{scene}」对应画面</Text>
              <Text style={styles.sceneDur}>⏱ 建议时长 {perScene}s</Text>
            </View>
          </View>
        ))}
      </ScrollView>

      {/* 底部 CTA 栏：渐变按钮 */}
      <View style={styles.ctaBar}>
        <TouchableOpacity
          activeOpacity={0.95}
          onPress={() =>
            navigation.navigate('ProClipsWorkflow', { templateId, title: passTitle })
          }
        >
          <LinearGradient
            colors={[...gradients.main]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.ctaBtn}
          >
            <Text style={styles.ctaText}>使用此模板</Text>
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
  favChar: { fontSize: 22, color: colors.txt1 },
  navTitle: { flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '700', color: colors.txt1 },
  // 空状态
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { color: colors.txt2, fontSize: 15 },
  // 内容
  container: { flex: 1 },
  body: { padding: 16, paddingBottom: 120 },
  // 大封面
  cover: {
    aspectRatio: 4 / 3,
    justifyContent: 'flex-end',
    borderRadius: radius.lg,
    overflow: 'hidden',
    marginBottom: 16,
  },
  coverGrad: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 },
  coverInfo: { padding: 16 },
  coverTitle: { fontSize: 22, fontWeight: '800', color: '#fff', marginBottom: 8 },
  coverMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  coverMetaText: { fontSize: 12, color: 'rgba(255,255,255,0.92)', fontWeight: '600' },
  // 描述区
  subheader: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.md,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.line,
    marginBottom: 18,
  },
  subheaderDesc: { fontSize: 14, color: colors.txt1, fontWeight: '600', lineHeight: 21, marginBottom: 6 },
  subheaderSample: { fontSize: 13, color: colors.txt2, lineHeight: 20 },
  // 分节标题
  sectionTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionH: { fontSize: 16, fontWeight: '700', color: colors.txt1 },
  sectionMore: { fontSize: 12, color: colors.txt3 },
  // 分镜项
  sceneItem: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: colors.bgCard,
    borderRadius: radius.md,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.line,
    marginBottom: 10,
  },
  sceneNum: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden' as any,
  },
  sceneNumText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  sceneText: { flex: 1, minWidth: 0 },
  sceneTitle: { fontSize: 15, fontWeight: '700', color: colors.txt1, marginBottom: 4 },
  sceneDesc: { fontSize: 12, color: colors.txt2, marginBottom: 4, lineHeight: 18 },
  sceneDur: { fontSize: 11, color: colors.cyan, fontWeight: '600' },
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

export default ProClipsTemplateDetailScreen;
