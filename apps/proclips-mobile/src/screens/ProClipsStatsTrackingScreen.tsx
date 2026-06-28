/**
 * ProClipsStatsTrackingScreen - 数据追踪（达人侧）
 *
 * 对应原型 page-stats-tracking：
 *   导航栏（‹ + 数据追踪 + 刷新）
 *   + 4 项汇总卡（暗底 + 渐变文字）
 *   + 视频数据明细列表（44x44 方块缩略图 + 标题 + 商家 + 佣金 + 指标卡 bg-elev 底）
 */
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import Svg, { Defs, LinearGradient as SvgLinearGradient, Stop, Text as SvgText } from 'react-native-svg';
import type { AppScreenProps } from '../types/navigation';
import { colors, radius } from '../components/Theme';
import { MOCK_STATS } from '../services/ProClipsService';
import type { StatsItem } from '../services/ProClipsService';

// 渐变文字组件（SVG text + linearGradient fill，对照原型 background-clip:text）
const GRAD_ID = 'ss-value-grad';
const GradientValue: React.FC<{ value: string }> = ({ value }) => (
  <Svg width={160} height={30}>
    <Defs>
      <SvgLinearGradient id={GRAD_ID} x1="0%" y1="0%" x2="100%" y2="100%">
        <Stop offset="0%" stopColor={colors.cyan} />
        <Stop offset="50%" stopColor={colors.magenta} />
        <Stop offset="100%" stopColor={colors.purple} />
      </SvgLinearGradient>
    </Defs>
    <SvgText fill={`url(#${GRAD_ID})`} fontSize="22" fontWeight="800" x="0" y="24">
      {value}
    </SvgText>
  </Svg>
);

const ProClipsStatsTrackingScreen: React.FC<
  AppScreenProps<'ProClipsStatsTracking'>
> = ({ navigation }) => {
  const stats = MOCK_STATS;

  // 汇总
  const totalPlays = stats.reduce((s, x) => s + x.plays, 0);
  const totalOrders = stats.reduce((s, x) => s + x.orders, 0);
  const totalLikes = stats.reduce((s, x) => s + x.likes, 0);
  const totalCommission = stats.reduce((s, x) => s + x.commission, 0);
  const conversionRate = ((totalOrders / Math.max(totalPlays, 1)) * 100).toFixed(1);
  const engagementRate = ((totalLikes / Math.max(totalPlays, 1)) * 100).toFixed(1);

  const handleRefresh = () => {
    Alert.alert('已更新', '数据已为你刷新到最新（mock）', [{ text: '好的' }]);
  };

  const renderItem = (s: StatsItem) => (
    <View key={s.id} style={styles.statsItem}>
      <View style={styles.siHead}>
        <View style={[styles.siThumb, { backgroundColor: s.coverColor }]} />
        <View style={styles.siTitle}>
          <Text style={styles.siT} numberOfLines={1}>{s.title}</Text>
          <Text style={styles.siS} numberOfLines={1}>{s.merchant}</Text>
        </View>
        <Text style={styles.siCommission}>{`+¥${s.commission}`}</Text>
      </View>
      <View style={styles.siMetrics}>
        <View style={styles.siMetric}>
          <Text style={styles.smVal}>{formatCount(s.plays)}</Text>
          <Text style={styles.smLab}>{`播放`}</Text>
        </View>
        <View style={styles.siMetric}>
          <Text style={styles.smVal}>{formatCount(s.likes)}</Text>
          <Text style={styles.smLab}>{`点赞`}</Text>
        </View>
        <View style={styles.siMetric}>
          <Text style={styles.smVal}>{s.comments}</Text>
          <Text style={styles.smLab}>{`评论`}</Text>
        </View>
        <View style={styles.siMetric}>
          <Text style={styles.smVal}>{s.orders}</Text>
          <Text style={styles.smLab}>{`订单`}</Text>
        </View>
      </View>
    </View>
  );

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
        <Text style={styles.navTitle}>{`数据追踪`}</Text>
        <TouchableOpacity
          style={styles.iconBtn}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          onPress={handleRefresh}
        >
          <Text style={styles.refreshIcon}>↻</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.body}
        showsVerticalScrollIndicator={false}
      >
        {/* 汇总卡：暗底 + yellow→rose 渐变 tint + 渐变文字 */}
        <LinearGradient
          colors={['rgba(251,191,36,0.12)', 'rgba(244,63,94,0.10)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.summaryCard}
        >
          <View style={styles.ssRow}>
            <View style={styles.ssItem}>
              <Text style={styles.ssLabel}>{`总播放`}</Text>
              <GradientValue value={formatCount(totalPlays)} />
              <Text style={styles.ssSub}>{`${stats.length} 个视频`}</Text>
            </View>
            <View style={styles.ssItem}>
              <Text style={styles.ssLabel}>{`总订单`}</Text>
              <GradientValue value={`${totalOrders}`} />
              <Text style={styles.ssSub}>{`转化率 ${conversionRate}%`}</Text>
            </View>
            <View style={styles.ssItem}>
              <Text style={styles.ssLabel}>{`总点赞`}</Text>
              <GradientValue value={formatCount(totalLikes)} />
              <Text style={styles.ssSub}>{`互动率 ${engagementRate}%`}</Text>
            </View>
            <View style={styles.ssItem}>
              <Text style={styles.ssLabel}>{`总佣金`}</Text>
              <GradientValue value={`¥${totalCommission}`} />
              <Text style={styles.ssSub}>{`含待结算`}</Text>
            </View>
          </View>
        </LinearGradient>

        {/* 视频数据明细 */}
        <View style={styles.sectionTitle}>
          <Text style={styles.sectionH}>{`视频数据明细`}</Text>
          <Text style={styles.sectionMore}>{`${stats.length} 个`}</Text>
        </View>

        {stats.map(renderItem)}
      </ScrollView>
    </SafeAreaView>
  );
};

// ---- 工具 ----
const formatCount = (n: number) =>
  n >= 10000 ? `${(n / 10000).toFixed(1)}w` : n >= 1000 ? `${(n / 1000).toFixed(1)}k` : `${n}`;

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
  refreshIcon: { fontSize: 22, color: colors.txt1, fontWeight: '600' },
  // 内容
  container: { flex: 1 },
  body: { padding: 16, paddingBottom: 32 },
  // 汇总卡：暗底 + yellow→rose 渐变 tint
  summaryCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: 'rgba(251,191,36,0.22)',
    padding: 16,
    marginBottom: 16,
  },
  ssRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  ssItem: { width: '47%' },
  ssLabel: { fontSize: 11, color: colors.txt2, fontWeight: '500' },
  ssSub: { fontSize: 10, color: colors.txt3, marginTop: 2 },
  // 章节
  sectionTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionH: { fontSize: 16, fontWeight: '700', color: colors.txt1 },
  sectionMore: { fontSize: 11, color: colors.txt3 },
  // 视频数据项
  statsItem: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    paddingVertical: 13,
    paddingHorizontal: 14,
    marginBottom: 10,
  },
  siHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  siThumb: {
    width: 44,
    height: 44,
    borderRadius: 11,
  },
  siTitle: { flex: 1, minWidth: 0 },
  siT: { fontSize: 13, fontWeight: '600', color: colors.txt1, marginBottom: 2 },
  siS: { fontSize: 11, color: colors.txt2 },
  siCommission: { fontSize: 14, fontWeight: '800', color: colors.yellow },
  // 指标卡：bg-elev 底
  siMetrics: {
    flexDirection: 'row',
    gap: 6,
    backgroundColor: colors.bgElev,
    borderRadius: 10,
    padding: 10,
  },
  siMetric: { flex: 1, alignItems: 'center' },
  smVal: { fontSize: 14, fontWeight: '700', color: colors.txt1 },
  smLab: { fontSize: 10, color: colors.txt3, marginTop: 2 },
});

export default ProClipsStatsTrackingScreen;
