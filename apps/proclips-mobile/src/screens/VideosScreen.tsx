/**
 * VideosScreen - 商家「视频库」Tab
 *
 * 对应原型 page-videos：9:12 卡片网格 + 一键分发 + 下载/分享/设公开
 * 「设公开」点击弹出 IncentiveSheet（5 种叠加激励面板）
 */
import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, radius } from '../components/Theme';
import { showToast } from '../components/Toast';
import { useProClipsStore } from '../stores/ProClipsStore';
import IncentiveSheet from '../components/IncentiveSheet';
import type { VideoItem, IncentivePlan } from '../services/ProClipsService';
import type { AppNavigation } from '../types/navigation';

export default function VideosScreen() {
  const navigation = useNavigation<AppNavigation<'Main'>>();
  const videos = useProClipsStore((s) => s.videos);
  const setVideoIncentive = useProClipsStore((s) => s.setVideoIncentive);
  const unpublishVideo = useProClipsStore((s) => s.unpublishVideo);

  const [sheetVideo, setSheetVideo] = useState<VideoItem | null>(null);

  const openIncentive = (v: VideoItem) => setSheetVideo(v);
  const closeIncentive = () => setSheetVideo(null);
  const handleConfirm = (plan: IncentivePlan) => {
    if (sheetVideo) setVideoIncentive(sheetVideo.id, plan);
    setSheetVideo(null);
  };
  const handleUnpublish = () => {
    if (sheetVideo) unpublishVideo(sheetVideo.id);
    setSheetVideo(null);
  };

  const formatCount = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(1)}k` : `${n}`);

  const renderItem = ({ item }: { item: VideoItem }) => (
    <TouchableOpacity
      style={styles.vidCard}
      activeOpacity={0.97}
      onPress={() => showToast('info', `开始播放：${item.title}`)}
    >
      {/* 9:12 封面 */}
      <View style={[styles.vidCover, { backgroundColor: item.coverColor }]}>
        {item.isPublic && (
          <View style={styles.vidPublic}><Text style={styles.vidPublicText}>🌐 公开</Text></View>
        )}
        <View style={styles.vidDur}><Text style={styles.vidDurText}>{item.duration}</Text></View>
        <View style={styles.playOverlay}><Text style={styles.playIcon}>▶</Text></View>
      </View>

      {/* 信息区 */}
      <View style={styles.vidInfo}>
        <Text style={styles.vidTitle} numberOfLines={2}>{item.title}</Text>
        <View style={styles.vidStats}>
          <Text style={styles.vidStatText}>▶ {formatCount(item.viewCount)}</Text>
          <Text style={styles.vidStatText}>↗ {item.shareCount}</Text>
          {item.isPublic ? <Text style={styles.vidPlatTag}>📺 4 平台</Text> : null}
        </View>

        {/* 一键分发按钮 */}
        <TouchableOpacity
          style={styles.distributeBtn}
          activeOpacity={0.85}
          onPress={() => navigation.navigate('ProClipsPlatforms')}
        >
          <Text style={styles.distributeIcon}>📤</Text>
          <Text style={styles.distributeText}>一键分发</Text>
        </TouchableOpacity>

        {/* 操作行：下载 / 分享 / 设公开 */}
        <View style={styles.vidActions}>
          <TouchableOpacity style={styles.va} activeOpacity={0.7}>
            <Text style={styles.vaIcon}>⬇</Text>
            <Text style={styles.vaText}>下载</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.va} activeOpacity={0.7}>
            <Text style={styles.vaIcon}>↗</Text>
            <Text style={styles.vaText}>分享</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.va} activeOpacity={0.7} onPress={() => openIncentive(item)}>
            <Text style={styles.vaIcon}>🌐</Text>
            <Text style={[styles.vaText, item.isPublic && { color: colors.cyan }]}>
              {item.isPublic ? '已公开' : '设公开'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.navBar}>
        <Text style={styles.navTitle}>视频库</Text>
        <TouchableOpacity style={styles.iconBtn}>
          <Text style={styles.iconBtnText}>⚙</Text>
        </TouchableOpacity>
      </View>
      <FlatList
        data={videos}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        renderItem={renderItem}
      />
      <IncentiveSheet
        visible={sheetVideo !== null}
        video={sheetVideo}
        onClose={closeIncentive}
        onConfirm={handleConfirm}
        onUnpublish={handleUnpublish}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bgDeep },
  navBar: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 18, paddingBottom: 12,
    borderBottomWidth: 1, borderBottomColor: colors.line,
  },
  navTitle: { fontSize: 17, fontWeight: '700', color: colors.txt1, flex: 1 },
  iconBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.06)', justifyContent: 'center', alignItems: 'center' },
  iconBtnText: { color: '#fff', fontSize: 16 },
  list: { padding: 16, paddingBottom: 120 },
  row: { gap: 12, marginBottom: 12 },
  vidCard: { flex: 1, backgroundColor: colors.bgCard, borderRadius: radius.md, overflow: 'hidden', borderColor: colors.line, borderWidth: 1 },
  vidCover: { aspectRatio: 9 / 12, position: 'relative', justifyContent: 'center', alignItems: 'center' },
  vidPublic: { position: 'absolute', left: 6, top: 6, backgroundColor: 'rgba(0,210,255,0.85)', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 10 },
  vidPublicText: { color: '#fff', fontSize: 9, fontWeight: '700' },
  vidDur: { position: 'absolute', right: 6, bottom: 6, backgroundColor: 'rgba(0,0,0,0.65)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  vidDurText: { color: '#fff', fontSize: 10, fontWeight: '600' },
  playOverlay: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', alignItems: 'center' },
  playIcon: { color: '#fff', fontSize: 16, marginLeft: 3 },
  vidInfo: { padding: 10 },
  vidTitle: { fontSize: 12.5, fontWeight: '600', color: colors.txt1, lineHeight: 17, minHeight: 34 },
  vidStats: { flexDirection: 'row', gap: 8, marginTop: 6, flexWrap: 'wrap' },
  vidStatText: { fontSize: 10, color: colors.txt3 },
  vidPlatTag: { fontSize: 10, color: colors.cyan, fontWeight: '600' },
  distributeBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5,
    marginTop: 9, paddingVertical: 7, borderRadius: 10,
    backgroundColor: 'rgba(0,210,255,0.14)', borderWidth: 1, borderColor: 'rgba(0,210,255,0.35)',
  },
  distributeIcon: { fontSize: 11 },
  distributeText: { color: colors.cyan, fontSize: 11, fontWeight: '700' },
  vidActions: { flexDirection: 'row', marginTop: 9, borderTopWidth: 1, borderTopColor: colors.line, paddingTop: 8 },
  va: { flex: 1, alignItems: 'center', gap: 3 },
  vaIcon: { fontSize: 12, color: colors.txt2 },
  vaText: { fontSize: 10, color: colors.txt2 },
});
