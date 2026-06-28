/**
 * ProClipsPublishStatusScreen - 发布进度
 *
 * 对应原型 page-publish-status：
 *   导航栏（返回 + 发布进度 + 刷新）
 *   + 视频卡（缩略图 + 标题 + meta）
 *   + 平台发布状态列表（loading/success/fail 三态）：
 *     - loading：平台图标 + 名称 + 发布中 + 进度条 + 上传中 X%
 *     - success：✓ 发布成功 + 100% + 播放/点赞 + 链接
 *     - fail：✗ 发布失败 + 原因 + 重试
 *   + 汇总卡（分发平台 / 已成功 / 总曝光 / 总互动 + 数据持续更新）
 *
 * 轮询：700ms 间隔，loading 进度 +7-16，到 100 转 success 填充 mock 数据
 * 刷新：success 状态播放+随机增量
 * 重试：fail 转 loading，进度 10
 */
import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import type { AppScreenProps } from '../types/navigation';
import type { PlatformKey } from '../types/navigation';
import { colors, radius } from '../components/Theme';
import {
  MOCK_VIDEOS, buildInitialPublishStatus, getPlatformDef,
  type PublishStatusItem,
} from '../services/ProClipsService';

const ProClipsPublishStatusScreen: React.FC<AppScreenProps<'ProClipsPublishStatus'>> = ({ navigation, route }) => {
  const videoId = route.params?.videoId;
  const platformsParam = route.params?.platforms;

  const video = MOCK_VIDEOS.find((v) => v.id === videoId) || MOCK_VIDEOS[0];

  // 选中平台：用 route.params.platforms，或默认 4 个已绑定平台
  const selKeys: PlatformKey[] = platformsParam && platformsParam.length > 0
    ? platformsParam
    : ['douyin', 'xiaohongshu', 'wechat_video', 'weibo'];

  const [statusList, setStatusList] = useState<PublishStatusItem[]>(() => buildInitialPublishStatus(selKeys));
  // 用 ref 保存最新状态，避免 useEffect 依赖整个数组导致递归重建
  const statusRef = useRef(statusList);
  statusRef.current = statusList;

  // 轮询推进 loading 状态
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    let cancelled = false;

    const tick = () => {
      if (cancelled) return;
      const cur = statusRef.current;
      let allDone = true;
      const next = cur.map((s) => {
        if (s.status === 'loading') {
          const progress = Math.min(100, s.progress + 7 + Math.random() * 9);
          if (progress >= 100) {
            return {
              ...s,
              progress: 100,
              status: 'success' as const,
              plays: Math.round(200 + Math.random() * 400),
              likes: Math.round(15 + Math.random() * 40),
              link: `https://${s.key}.com/v/${Math.random().toString(36).slice(2, 8)}`,
            };
          }
          allDone = false;
          return { ...s, progress };
        }
        return s;
      });
      setStatusList(next);
      if (!allDone && !cancelled) {
        timer = setTimeout(tick, 700);
      } else if (allDone && !cancelled) {
        Alert.alert('完成', '全部平台发布完成 🎉', [{ text: '好的' }]);
      }
    };

    // 有 loading 状态时启动轮询
    if (statusRef.current.some((s) => s.status === 'loading')) {
      timer = setTimeout(tick, 700);
    }

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRefresh = () => {
    setStatusList((prev) =>
      prev.map((s) =>
        s.status === 'success'
          ? { ...s, plays: s.plays + Math.round(Math.random() * 40), likes: s.likes + Math.round(Math.random() * 8) }
          : s
      )
    );
    Alert.alert('已刷新', '数据已刷新', [{ text: '好的' }]);
  };

  const handleRetry = (key: PlatformKey) => {
    setStatusList((prev) =>
      prev.map((s) => (s.key === key ? { ...s, status: 'loading', progress: 10, failReason: undefined } : s))
    );
    Alert.alert('重试中', '正在重新发布…', [{ text: '好的' }]);
  };

  // 汇总
  const totalPlays = statusList.reduce((s, x) => s + x.plays, 0);
  const totalInter = statusList.reduce((s, x) => s + x.likes, 0);
  const successCount = statusList.filter((s) => s.status === 'success').length;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* 导航栏 */}
      <View style={styles.navBar}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.navArrow}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.navTitle}>发布进度</Text>
        <TouchableOpacity style={styles.navRefresh} onPress={handleRefresh}>
          <Text style={styles.navRefreshText}>刷新</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.container} contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        {/* 视频卡 */}
        <View style={styles.videoCard}>
          <View style={[styles.videoThumb, { backgroundColor: video.coverColor }]}>
            <Text style={styles.videoPlay}>▶</Text>
          </View>
          <View style={styles.videoInfo}>
            <Text style={styles.videoTitle} numberOfLines={1}>{video.title}</Text>
            <Text style={styles.videoMeta}>{video.duration} · {video.createdAt}</Text>
          </View>
        </View>

        {/* 平台发布状态列表 */}
        {statusList.map((s) => (
          <StatusCard key={s.key} item={s} onRetry={() => handleRetry(s.key)} />
        ))}

        {/* 汇总卡 */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryNum}>{statusList.length}</Text>
              <Text style={styles.summaryLab}>分发平台</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryNum}>{successCount}</Text>
              <Text style={styles.summaryLab}>已成功</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryNum}>{formatCount(totalPlays)}</Text>
              <Text style={styles.summaryLab}>总曝光</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryNum}>{totalInter}</Text>
              <Text style={styles.summaryLab}>总互动</Text>
            </View>
          </View>
          <View style={styles.summaryTipRow}>
            <ActivityIndicator size={11} color={colors.cyan} />
            <Text style={styles.summaryTip}>数据持续更新中…</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default ProClipsPublishStatusScreen;

function formatCount(n: number): string {
  if (n >= 1000) return (n / 1000).toFixed(1) + 'k';
  return String(n);
}

// ============ 状态卡 ============
function StatusCard({ item, onRetry }: { item: PublishStatusItem; onRetry: () => void }) {
  return (
    <View style={styles.statusCard}>
      <View style={styles.statusHead}>
        <LinearGradient colors={[...item.grad]} style={styles.platIcon}>
          <Text style={styles.platIconText}>{item.char}</Text>
        </LinearGradient>
        <View style={styles.statusHeadInfo}>
          <Text style={styles.statusName}>{item.name}</Text>
        </View>
        {item.status === 'success' && (
          <View style={styles.tagSuccess}><Text style={styles.tagSuccessText}>✓ 发布成功</Text></View>
        )}
        {item.status === 'loading' && (
          <View style={styles.tagLoading}>
            <ActivityIndicator size={10} color={colors.cyan} />
            <Text style={styles.tagLoadingText}>发布中</Text>
          </View>
        )}
        {item.status === 'fail' && (
          <View style={styles.tagFail}><Text style={styles.tagFailText}>✗ 发布失败</Text></View>
        )}
      </View>

      {/* 进度条 */}
      <View style={styles.progressBar}>
        <View
          style={[
            styles.progressBarFill,
            {
              width: `${item.progress}%`,
              backgroundColor: item.status === 'fail' ? colors.rose : item.status === 'success' ? colors.success : colors.cyan,
            },
          ]}
        />
      </View>

      {/* 结果区 */}
      {item.status === 'success' && (
        <View style={styles.resultBox}>
          <View style={styles.resultRow}>
            <View style={styles.resultItem}>
              <Text style={styles.resultNum}>{formatCount(item.plays)}</Text>
              <Text style={styles.resultLab}>播放</Text>
            </View>
            <View style={styles.resultItem}>
              <Text style={styles.resultNum}>{item.likes}</Text>
              <Text style={styles.resultLab}>点赞</Text>
            </View>
          </View>
          <Text style={styles.linkText}>🔗 {item.link}</Text>
        </View>
      )}

      {item.status === 'loading' && (
        <Text style={styles.progressText}>上传中 {Math.floor(item.progress)}%</Text>
      )}

      {item.status === 'fail' && (
        <View style={styles.failBox}>
          <Text style={styles.failReason}>原因：{item.failReason || '未知错误'}</Text>
          <TouchableOpacity style={styles.retryBtn} activeOpacity={0.7} onPress={onRetry}>
            <Text style={styles.retryBtnText}>重试</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bgDeep },
  container: { flex: 1 },
  body: { padding: 16, paddingBottom: 30 },
  // 导航
  navBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 8, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.line,
  },
  iconBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  navArrow: { fontSize: 28, color: colors.txt1, fontWeight: '300', marginTop: -4 },
  navTitle: { fontSize: 15, fontWeight: '700', color: colors.txt1 },
  navRefresh: { paddingHorizontal: 12, paddingVertical: 6 },
  navRefreshText: { fontSize: 12, fontWeight: '600', color: colors.cyan },
  // 视频卡
  videoCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: colors.bgCard, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.line, padding: 10, marginBottom: 14,
  },
  videoThumb: {
    width: 56, height: 42, borderRadius: 8, justifyContent: 'center', alignItems: 'center',
  },
  videoPlay: { fontSize: 14, color: 'rgba(255,255,255,0.85)' },
  videoInfo: { flex: 1 },
  videoTitle: { fontSize: 13, fontWeight: '700', color: colors.txt1, marginBottom: 4 },
  videoMeta: { fontSize: 11, color: colors.txt3 },
  // 状态卡
  statusCard: {
    backgroundColor: colors.bgCard, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.line, padding: 12, marginBottom: 10,
  },
  statusHead: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  platIcon: {
    width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center',
  },
  platIconText: { fontSize: 15, color: '#fff', fontWeight: '700' },
  statusHeadInfo: { flex: 1 },
  statusName: { fontSize: 13, fontWeight: '700', color: colors.txt1 },
  tagSuccess: {
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8,
    backgroundColor: 'rgba(34,197,94,0.16)', borderWidth: 1, borderColor: 'rgba(34,197,94,0.4)',
  },
  tagSuccessText: { fontSize: 10, color: colors.success, fontWeight: '600' },
  tagLoading: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8,
    backgroundColor: 'rgba(0,210,255,0.12)', borderWidth: 1, borderColor: 'rgba(0,210,255,0.3)',
  },
  tagLoadingText: { fontSize: 10, color: colors.cyan, fontWeight: '600' },
  tagFail: {
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8,
    backgroundColor: 'rgba(244,63,94,0.14)', borderWidth: 1, borderColor: 'rgba(244,63,94,0.4)',
  },
  tagFailText: { fontSize: 10, color: colors.rose, fontWeight: '600' },
  // 进度条
  progressBar: {
    height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.08)', overflow: 'hidden',
  },
  progressBarFill: { height: '100%', borderRadius: 2 },
  // 结果
  resultBox: { marginTop: 10 },
  resultRow: { flexDirection: 'row', gap: 16, marginBottom: 8 },
  resultItem: {},
  resultNum: { fontSize: 15, fontWeight: '800', color: colors.txt1 },
  resultLab: { fontSize: 10, color: colors.txt3, marginTop: 2 },
  linkText: { fontSize: 10, color: colors.cyan, lineHeight: 16 },
  progressText: { fontSize: 11, color: colors.txt3, marginTop: 8 },
  // 失败
  failBox: { marginTop: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  failReason: { fontSize: 11, color: colors.rose, flex: 1 },
  retryBtn: {
    paddingHorizontal: 14, paddingVertical: 6, borderRadius: 12,
    backgroundColor: 'rgba(0,210,255,0.12)', borderWidth: 1, borderColor: 'rgba(0,210,255,0.3)',
  },
  retryBtnText: { fontSize: 11, fontWeight: '600', color: colors.cyan },
  // 汇总
  summaryCard: {
    backgroundColor: colors.bgCard, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.line, padding: 14, marginTop: 4,
  },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  summaryItem: { alignItems: 'center' },
  summaryNum: { fontSize: 17, fontWeight: '900', color: colors.txt1 },
  summaryLab: { fontSize: 10, color: colors.txt3, marginTop: 3 },
  summaryTipRow: { flexDirection: 'row', alignItems: 'center', gap: 6, justifyContent: 'center' },
  summaryTip: { fontSize: 10, color: colors.cyan },
});
