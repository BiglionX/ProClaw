/**
 * ProClipsSceneUploadScreen - 分段素材上传
 *
 * 对应原型 page-scene-upload：导航栏 + 子标题 + 6 段分镜上传列表 + 底部 CTA
 * 前 3 段默认已上传（coverColor 占位缩略图 + ✓），后 3 段点击模拟上传（1s 后完成）
 */
import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import Svg, { Path } from 'react-native-svg';
import type { AppScreenProps } from '../types/navigation';
import { colors, gradients, radius } from '../components/Theme';

// 6 段分镜名称（mock，火锅主题）
const SCENE_NAMES = [
  '开场镜头 · 店铺门头',
  '特写镜头 · 招牌菜上桌',
  '细节镜头 · 筷子夹菜',
  '品尝镜头 · 顾客反应',
  '环境镜头 · 就餐氛围',
  '结尾镜头 · 地址收尾',
];

// 分镜占位缩略图渐变色
const SCENE_COVER_COLORS = [
  '#ff6b9d',
  '#ffb547',
  '#22c55e',
  '#00d2ff',
  '#a855f7',
  '#f43f5e',
];

interface SceneUploadState {
  uploaded: boolean;
  coverColor: string;
}

const ProClipsSceneUploadScreen: React.FC<AppScreenProps<'ProClipsSceneUpload'>> = ({
  route,
  navigation,
}) => {
  const { templateId, title } = route.params;
  // 本地上传状态：前 3 段默认已上传
  const [uploads, setUploads] = useState<SceneUploadState[]>(
    SCENE_NAMES.map((_, i) => ({
      uploaded: i < 3,
      coverColor: SCENE_COVER_COLORS[i],
    }))
  );
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null);

  const uploadedCount = uploads.filter((u) => u.uploaded).length;

  // 模拟上传：1s 后标记已上传
  const handleUpload = (index: number) => {
    if (uploadingIndex !== null) return; // 防止并发上传
    setUploadingIndex(index);
    setTimeout(() => {
      setUploads((prev) =>
        prev.map((u, i) => (i === index ? { ...u, uploaded: true } : u))
      );
      setUploadingIndex(null);
    }, 1000);
  };

  const handleNext = () => {
    navigation.navigate('ProClipsProductInfo', { templateId, title });
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
        <Text style={styles.navTitle}>分段素材上传</Text>
        <View style={styles.iconBtn} />
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.body}
        showsVerticalScrollIndicator={false}
      >
        {/* 子标题区 */}
        <View style={styles.subheader}>
          <Text style={styles.subH2}>逐镜头上传素材</Text>
          <Text style={styles.subDesc}>
            按分镜顺序上传拍摄好的视频片段，AI 会自动对齐节奏。已上传{' '}
            <Text style={styles.subCount}>{uploadedCount}</Text>/6 段。
          </Text>
        </View>

        {/* 分镜上传列表 */}
        <View style={styles.list}>
          {SCENE_NAMES.map((name, index) => {
            const u = uploads[index];
            const isUploading = uploadingIndex === index;
            const suggestDur = (3 + index * 0.5).toFixed(1);
            return (
              <View key={name} style={styles.sceneItem}>
                {/* 序号：grad-cool 圆角方形白字 */}
                <LinearGradient
                  colors={[...gradients.cool]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.sceneNum}
                >
                  <Text style={styles.sceneNumText}>{index + 1}</Text>
                </LinearGradient>

                {/* 分镜名称 + 状态 */}
                <View style={styles.sceneInfo}>
                  <Text style={styles.sceneName} numberOfLines={1}>{name}</Text>
                  <Text style={styles.sceneStatus}>
                    {u.uploaded
                      ? '已上传 · 等待 AI 对齐'
                      : isUploading
                        ? '上传中…'
                        : `待上传 · 建议时长 ${suggestDur}s`}
                  </Text>
                </View>

                {/* 上传按钮 / 已上传缩略图 */}
                {u.uploaded ? (
                  <View style={styles.thumbWrap}>
                    <View style={[styles.thumb, { backgroundColor: u.coverColor }]} />
                    {/* 对勾：右上角外凸 cyan 圆 */}
                    <View style={styles.thumbCheck}>
                      <Text style={styles.thumbCheckText}>✓</Text>
                    </View>
                  </View>
                ) : (
                  <TouchableOpacity
                    onPress={() => handleUpload(index)}
                    disabled={isUploading}
                    activeOpacity={0.85}
                    style={styles.uploadBtnWrap}
                  >
                    <LinearGradient
                      colors={[...gradients.cool]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={[styles.uploadBtn, isUploading && styles.uploadBtnLoading]}
                    >
                      <Svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                        <Path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" />
                      </Svg>
                      <Text style={styles.uploadBtnText}>
                        {isUploading ? '上传中' : '上传'}
                      </Text>
                    </LinearGradient>
                  </TouchableOpacity>
                )}
              </View>
            );
          })}
        </View>
      </ScrollView>

      {/* 底部 CTA 栏 */}
      <View style={styles.ctaBar}>
        <TouchableOpacity activeOpacity={0.95} onPress={handleNext}>
          <LinearGradient
            colors={[...gradients.main]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.ctaBtn}
          >
            <Text style={styles.ctaText}>下一步：填写商品信息 →</Text>
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
  // 子标题
  subheader: { marginBottom: 16 },
  subH2: { fontSize: 18, fontWeight: '700', color: colors.txt1, marginBottom: 6 },
  subDesc: { fontSize: 13, color: colors.txt2, lineHeight: 20 },
  subCount: { color: colors.cyan, fontWeight: '700' },
  // 列表
  list: {},
  sceneItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.bgCard,
    borderRadius: radius.md,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.line,
    marginBottom: 12,
  },
  // 序号：grad-cool 圆角方形白字
  sceneNum: {
    width: 30,
    height: 30,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sceneNumText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  sceneInfo: { flex: 1, minWidth: 0 },
  sceneName: { fontSize: 14, fontWeight: '600', color: colors.txt1, marginBottom: 3 },
  sceneStatus: { fontSize: 11, color: colors.txt3 },
  // 缩略图 + 对勾
  thumbWrap: { position: 'relative', width: 54, height: 54 },
  thumb: {
    width: 54,
    height: 54,
    borderRadius: 10,
  },
  thumbCheck: {
    position: 'absolute',
    right: -5,
    top: -5,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.cyan,
    justifyContent: 'center',
    alignItems: 'center',
  },
  thumbCheckText: { color: '#fff', fontSize: 11, fontWeight: '800' },
  // 上传按钮：grad-cool 底 + SVG 图标
  uploadBtnWrap: { width: 54, height: 54 },
  uploadBtn: {
    width: 54,
    height: 54,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  uploadBtnLoading: { opacity: 0.6 },
  uploadBtnText: { color: '#fff', fontSize: 9, fontWeight: '700' },
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

export default ProClipsSceneUploadScreen;
