/**
 * EarningsScreen - 达人「收益」Tab
 *
 * 对应原型 page-earnings：
 *   导航栏（标题 + 规则按钮）
 *   + 汇总卡 3 卡横排网格（本月佣金 featured / 累计佣金 / 待结算）
 *   + 分销记录列表（缩略图 + 标题 + merchant·time + 金额 + 状态 pill）
 *   + 底部固定提现栏（单个全宽渐变按钮）
 */
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import { colors, gradients, radius } from '../components/Theme';
import { useProClipsStore } from '../stores/ProClipsStore';
import type { EarningsRecord } from '../services/ProClipsService';

export default function EarningsScreen() {
  const earnings = useProClipsStore((s) => s.earnings);

  const totalSettled = earnings
    .filter((e) => e.status === 'settled')
    .reduce((sum, e) => sum + e.amount, 0);
  const totalPending = earnings
    .filter((e) => e.status === 'pending')
    .reduce((sum, e) => sum + e.amount, 0);
  const monthTotal = earnings.reduce((sum, e) => sum + e.amount, 0);
  const withdrawable = totalSettled;

  const handleWithdraw = () => {
    if (withdrawable < 100) {
      Alert.alert('提示', '可提现金额需 ≥ ¥100', [{ text: '好的' }]);
      return;
    }
    Alert.alert(
      '提现申请',
      `已提交 ¥${withdrawable} 提现申请，预计 1-3 工作日到账（mock）`,
      [{ text: '好的' }]
    );
  };

  const handleRule = () => {
    Alert.alert(
      '收益规则',
      '1. CPS/固定/阶梯佣金按订单成交结算\n2. CPM 播放奖按千次播放结算\n3. 达标奖金达成目标后次月发放\n4. 多种激励可叠加\n5. 提现需 ≥ ¥100',
      [{ text: '我知道了' }]
    );
  };

  const renderItem = ({ item }: { item: EarningsRecord }) => (
    <View style={styles.recordRow}>
      {/* 缩略图（coverColor 占位） */}
      <View style={[styles.thumb, { backgroundColor: colors.bgCard2 }]}>
        <Text style={styles.thumbEmoji}>🎬</Text>
      </View>
      {/* 信息 */}
      <View style={styles.recordInfo}>
        <Text style={styles.recordTitle} numberOfLines={1}>{item.videoTitle}</Text>
        <Text style={styles.recordSub} numberOfLines={1}>
          {item.merchant} · {item.time}
        </Text>
      </View>
      {/* 金额 + 状态 */}
      <View style={styles.recordRight}>
        <Text
          style={[
            styles.amount,
            item.status === 'pending' && styles.amountPending,
          ]}
        >
          +¥{item.amount}
        </Text>
        <View
          style={[
            styles.statusPill,
            item.status === 'settled'
              ? styles.statusSettled
              : styles.statusPendingWrap,
          ]}
        >
          <Text
            style={[
              styles.statusText,
              item.status === 'settled'
                ? styles.statusTextSettled
                : styles.statusTextPending,
            ]}
          >
            {item.status === 'settled' ? '已结算' : '待结算'}
          </Text>
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.container}>
        {/* 导航栏 */}
        <View style={styles.header}>
          <Text style={styles.title}>收益</Text>
          <TouchableOpacity
            style={styles.iconBtn}
            activeOpacity={0.8}
            onPress={handleRule}
          >
            <Text style={styles.iconBtnText}>ℹ</Text>
          </TouchableOpacity>
        </View>

        {/* 汇总卡 3 卡横排 */}
        <View style={styles.summaryRow}>
          {/* 本月佣金 featured */}
          <LinearGradient
            colors={['rgba(251,191,36,0.15)', 'rgba(244,63,94,0.12)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.summaryCardFeatured}
          >
            <Text style={styles.summaryLabel}>本月佣金</Text>
            <Text style={styles.summaryValueFeatured}>¥{monthTotal}</Text>
            <Text style={styles.summarySub}>+18% 较上月</Text>
          </LinearGradient>
          {/* 累计佣金 */}
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>累计佣金</Text>
            <Text style={styles.summaryValue}>¥{totalSettled}</Text>
            <Text style={styles.summarySub}>已结算</Text>
          </View>
          {/* 待结算 */}
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>待结算</Text>
            <Text style={styles.summaryValue}>¥{totalPending}</Text>
            <Text style={styles.summarySub}>预计 7 日内</Text>
          </View>
        </View>

        {/* 分销记录标题 */}
        <View style={styles.sectionTitle}>
          <Text style={styles.sectionH}>分销记录</Text>
          <Text style={styles.sectionMore}>{`本月 ${earnings.length} 笔`}</Text>
        </View>

        {/* 记录列表 */}
        <FlatList
          data={earnings}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listBody}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <Text style={styles.emptyEmoji}>💸</Text>
              <Text style={styles.emptyText}>暂无记录</Text>
            </View>
          }
        />
      </View>

      {/* 底部固定提现栏（单按钮） */}
      <View style={styles.withdrawBar}>
        <TouchableOpacity
          activeOpacity={0.95}
          onPress={handleWithdraw}
          disabled={withdrawable < 100}
          style={styles.withdrawBtnWrap}
        >
          <LinearGradient
            colors={
              withdrawable >= 100
                ? [...gradients.creator]
                : ['rgba(255,255,255,0.06)', 'rgba(255,255,255,0.06)']
            }
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.withdrawBtn}
          >
            <Text
              style={[
                styles.withdrawBtnText,
                withdrawable < 100 && { color: colors.txt3 },
              ]}
            >
              {withdrawable >= 100
                ? `立即提现（可提 ¥${withdrawable}）`
                : `满 ¥100 可提（当前 ¥${withdrawable}）`}
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bgDeep },
  container: { flex: 1, paddingHorizontal: 16 },
  // 导航
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    paddingBottom: 14,
  },
  title: { fontSize: 24, fontWeight: '800', color: colors.txt1 },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.06)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  // 汇总卡 3 卡横排
  summaryRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.md,
    paddingVertical: 14,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  summaryCardFeatured: {
    flex: 1,
    borderWidth: 1,
    borderColor: 'rgba(251,191,36,0.25)',
    borderRadius: radius.md,
    paddingVertical: 14,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  summaryLabel: { fontSize: 11, color: colors.txt2, marginBottom: 6 },
  summaryValue: { fontSize: 18, fontWeight: '800', color: colors.txt1 },
  summaryValueFeatured: { fontSize: 18, fontWeight: '800', color: colors.yellow },
  summarySub: { fontSize: 10, color: colors.txt3, marginTop: 3 },
  // 章节
  sectionTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  sectionH: { fontSize: 16, fontWeight: '700', color: colors.txt1 },
  sectionMore: { fontSize: 11, color: colors.txt3 },
  // 列表
  listBody: { paddingBottom: 110 },
  recordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.bgCard,
    borderRadius: radius.md,
    padding: 13,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.line,
  },
  thumb: {
    width: 46,
    height: 46,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
  },
  thumbEmoji: { fontSize: 20 },
  recordInfo: { flex: 1, minWidth: 0 },
  recordTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.txt1,
    marginBottom: 3,
  },
  recordSub: { fontSize: 11, color: colors.txt2 },
  recordRight: { alignItems: 'flex-end' },
  amount: { fontSize: 15, fontWeight: '800', color: colors.yellow },
  amountPending: { color: colors.txt2 },
  statusPill: {
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 12,
    marginTop: 5,
  },
  statusSettled: { backgroundColor: 'rgba(0,210,255,0.16)' },
  statusPendingWrap: { backgroundColor: 'rgba(255,181,71,0.16)' },
  statusText: { fontSize: 10, fontWeight: '700' },
  statusTextSettled: { color: colors.cyan },
  statusTextPending: { color: colors.amber },
  // 空态
  emptyWrap: { alignItems: 'center', paddingVertical: 40 },
  emptyEmoji: { fontSize: 40, marginBottom: 10 },
  emptyText: { fontSize: 12, color: colors.txt3 },
  // 底部提现栏
  withdrawBar: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 24,
    backgroundColor: 'rgba(15,15,30,0.92)',
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  withdrawBtnWrap: { width: '100%' },
  withdrawBtn: {
    borderRadius: radius.lg,
    paddingVertical: 15,
    alignItems: 'center',
  },
  withdrawBtnText: { color: '#fff', fontSize: 15, fontWeight: '800' },
});
