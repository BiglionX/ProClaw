/**
 * ProClipsPlatformsScreen - 第三方平台
 *
 * 对应原型 page-platforms：
 *   导航栏（返回 + 第三方平台 + 扫码绑定）
 *   + 汇总卡（绑定 X/6 + 覆盖粉丝数）
 *   + 6 平台列表：
 *     - 已绑定卡：平台图标 + 名称 + 账号/粉丝 + 已绑定标签 + 今日数据 + 同步时间 + 同步/解绑按钮
 *     - 未绑定卡：平台图标 + 名称 + 未绑定 + 绑定按钮
 *   + 同步：toast + 1.2s 后更新同步时间
 *   + 解绑：Alert 确认 → 移除
 *   + 绑定：navigate('ProClipsPlatformOAuth', { platform })
 */
import React, { useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import type { AppScreenProps } from '../types/navigation';
import type { PlatformKey } from '../types/navigation';
import { colors, radius } from '../components/Theme';
import { useProClipsStore } from '../stores/ProClipsStore';
import { PLATFORM_DEFS } from '../services/ProClipsService';

const ProClipsPlatformsScreen: React.FC<AppScreenProps<'ProClipsPlatforms'>> = ({ navigation }) => {
  const platformAccounts = useProClipsStore((s) => s.platformAccounts);
  // 本地已绑定平台集合（用 store 初始化，解绑时本地移除）
  const [boundKeys, setBoundKeys] = useState<Set<PlatformKey>>(
    () => new Set(platformAccounts.map((a) => a.platform))
  );
  // 本地同步时间覆盖（key → 时间文本）
  const [syncTimes, setSyncTimes] = useState<Record<string, string>>({});

  const boundList = useMemo(
    () => PLATFORM_DEFS.filter((p) => boundKeys.has(p.key)),
    [boundKeys]
  );
  const totalFans = useMemo(
    () => platformAccounts
      .filter((a) => boundKeys.has(a.platform))
      .reduce((s, a) => s + a.followerCount, 0),
    [platformAccounts, boundKeys]
  );

  const getAccount = (key: PlatformKey) => platformAccounts.find((a) => a.platform === key);
  const getSyncTime = (key: PlatformKey) => syncTimes[key] || getAccount(key)?.lastSyncedAt || '—';

  const handleSync = (key: PlatformKey, name: string) => {
    Alert.alert('同步中', `正在同步${name}数据…`, [{ text: '好的' }]);
    setTimeout(() => {
      setSyncTimes((prev) => ({ ...prev, [key]: '刚刚同步' }));
      Alert.alert('已同步', `${name}数据已同步`, [{ text: '好的' }]);
    }, 1200);
  };

  const handleUnbind = (key: PlatformKey, name: string) => {
    Alert.alert(
      '确定要解绑？',
      `确定要解绑${name}账号？解绑后将无法分发到该平台`,
      [
        { text: '取消', style: 'cancel' },
        {
          text: '解绑',
          style: 'destructive',
          onPress: () => {
            setBoundKeys((prev) => {
              const next = new Set(prev);
              next.delete(key);
              return next;
            });
            Alert.alert('已解绑', `已解绑${name}`, [{ text: '好的' }]);
          },
        },
      ]
    );
  };

  const handleBind = (key: PlatformKey) => {
    navigation.navigate('ProClipsPlatformOAuth', { platform: key, mode: 'bind' });
  };

  const handleScan = () => {
    Alert.alert('扫码绑定', '请用平台 App 扫描二维码（mock）', [{ text: '好的' }]);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* 导航栏 */}
      <View style={styles.navBar}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.navArrow}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.navTitle}>第三方平台</Text>
        <TouchableOpacity style={styles.navScan} onPress={handleScan}>
          <Text style={styles.navScanText}>扫码绑定</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.container} contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        {/* 汇总卡（渐变 tint 背景） */}
        <LinearGradient
          colors={['rgba(0,210,255,0.14)', 'rgba(168,85,247,0.12)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.summaryCard}
        >
          <Text style={styles.pscTitle}>🔗 绑定后可一键分发视频到多个平台，触达更多粉丝</Text>
          <View style={styles.pscStats}>
            <View style={styles.pscStat}>
              <Text style={styles.pscStatNum}>{boundList.length}/{PLATFORM_DEFS.length}</Text>
              <Text style={styles.pscStatLab}>已绑定平台</Text>
            </View>
            <View style={styles.pscStat}>
              <Text style={styles.pscStatNum}>{formatFans(totalFans)}</Text>
              <Text style={styles.pscStatLab}>覆盖粉丝</Text>
            </View>
          </View>
        </LinearGradient>

        {/* 平台列表 */}
        {PLATFORM_DEFS.map((p) => {
          const bound = boundKeys.has(p.key);
          const acc = getAccount(p.key);
          return bound ? (
            <BoundCard
              key={p.key}
              def={p}
              account={acc?.platformNickname || '已绑定账号'}
              fansText={acc ? formatFans(acc.followerCount) + '粉' : '—'}
              todayPlays={acc?.todayViews || 0}
              todayLikes={acc?.todayLikes || 0}
              todayComments={acc?.todayComments || 0}
              syncTime={getSyncTime(p.key)}
              onSync={() => handleSync(p.key, p.name)}
              onUnbind={() => handleUnbind(p.key, p.name)}
            />
          ) : (
            <UnboundCard
              key={p.key}
              def={p}
              onBind={() => handleBind(p.key)}
            />
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
};

export default ProClipsPlatformsScreen;

function formatFans(n: number): string {
  if (n >= 10000) return (n / 10000).toFixed(1) + 'w';
  if (n >= 1000) return (n / 1000).toFixed(1) + 'k';
  return String(n);
}

function formatCount(n: number): string {
  if (n >= 1000) return (n / 1000).toFixed(1) + 'k';
  return String(n);
}

// ============ 已绑定卡 ============
function BoundCard({
  def, account, fansText, todayPlays, todayLikes, todayComments, syncTime, onSync, onUnbind,
}: {
  def: typeof PLATFORM_DEFS[number];
  account: string;
  fansText: string;
  todayPlays: number;
  todayLikes: number;
  todayComments: number;
  syncTime: string;
  onSync: () => void;
  onUnbind: () => void;
}) {
  return (
    <View style={styles.card}>
      <View style={styles.cardHead}>
        <LinearGradient colors={[...def.grad]} style={styles.platIcon}>
          <Text style={styles.platIconText}>{def.char}</Text>
        </LinearGradient>
        <View style={styles.headInfo}>
          <Text style={styles.headName}>{def.name}</Text>
          <View style={styles.headAccountRow}>
            <View style={styles.headAvatar}><Text style={styles.headAvatarText}>👤</Text></View>
            <Text style={styles.headAccount}>@{account} · {fansText}</Text>
          </View>
        </View>
        <View style={styles.tagBound}>
          <Text style={styles.tagBoundText}>已绑定</Text>
        </View>
      </View>
      <View style={styles.dataRow}>
        <View style={styles.dataItem}>
          <Text style={styles.dataNum}>{formatCount(todayPlays)}</Text>
          <Text style={styles.dataLab}>今日播放</Text>
        </View>
        <View style={styles.dataItem}>
          <Text style={styles.dataNum}>{todayLikes}</Text>
          <Text style={styles.dataLab}>今日点赞</Text>
        </View>
        <View style={styles.dataItem}>
          <Text style={styles.dataNum}>{todayComments}</Text>
          <Text style={styles.dataLab}>今日评论</Text>
        </View>
      </View>
      <Text style={styles.syncTime}>🕒 {syncTime}</Text>
      <View style={styles.actions}>
        <TouchableOpacity style={styles.btnSync} activeOpacity={0.7} onPress={onSync}>
          <Text style={styles.btnSyncText}>同步数据</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.btnUnbind} activeOpacity={0.7} onPress={onUnbind}>
          <Text style={styles.btnUnbindText}>解绑</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ============ 未绑定卡 ============
function UnboundCard({
  def, onBind,
}: {
  def: typeof PLATFORM_DEFS[number];
  onBind: () => void;
}) {
  return (
    <View style={styles.card}>
      <View style={styles.cardHead}>
        <LinearGradient colors={[...def.grad]} style={styles.platIcon}>
          <Text style={styles.platIconText}>{def.char}</Text>
        </LinearGradient>
        <View style={styles.headInfo}>
          <Text style={styles.headName}>{def.name}</Text>
          <Text style={styles.headAccountUnbound}>未绑定</Text>
        </View>
        <View style={styles.tagUnbound}>
          <Text style={styles.tagUnboundText}>未绑定</Text>
        </View>
      </View>
      <View style={styles.actions}>
        <TouchableOpacity style={styles.btnBind} activeOpacity={0.7} onPress={onBind}>
          <Text style={styles.btnBindText}>＋ 绑定账号</Text>
        </TouchableOpacity>
      </View>
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
  navTitle: { flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '700', color: colors.txt1 },
  navScan: { paddingHorizontal: 12, paddingVertical: 6 },
  navScanText: { fontSize: 12, fontWeight: '600', color: colors.cyan },
  // 汇总卡
  summaryCard: {
    borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.line, padding: 16, marginBottom: 14,
  },
  pscTitle: { fontSize: 12, color: colors.txt2, lineHeight: 18, marginBottom: 12 },
  pscStats: { flexDirection: 'row', gap: 24 },
  pscStat: {},
  pscStatNum: { fontSize: 22, fontWeight: '900', color: colors.cyan },
  pscStatLab: { fontSize: 10, color: colors.txt3, marginTop: 2 },
  // 平台卡
  card: {
    backgroundColor: colors.bgCard, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.line, padding: 12, marginBottom: 10,
  },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  platIcon: {
    width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center',
  },
  platIconText: { fontSize: 17, color: '#fff', fontWeight: '700' },
  headInfo: { flex: 1 },
  headName: { fontSize: 14, fontWeight: '700', color: colors.txt1 },
  headAccountRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 3 },
  headAvatar: {
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: colors.bgCard2,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: colors.line,
  },
  headAvatarText: { fontSize: 11 },
  headAccount: { fontSize: 11, color: colors.txt2 },
  headAccountUnbound: { fontSize: 11, color: colors.txt3, marginTop: 3 },
  tagBound: {
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8,
    backgroundColor: 'rgba(34,197,94,0.16)', borderWidth: 1, borderColor: 'rgba(34,197,94,0.4)',
  },
  tagBoundText: { fontSize: 10, color: colors.success, fontWeight: '600' },
  tagUnbound: {
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: colors.line,
  },
  tagUnboundText: { fontSize: 10, color: colors.txt3, fontWeight: '600' },
  // 数据行
  dataRow: {
    flexDirection: 'row', gap: 12,
    backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 8, padding: 10, marginBottom: 8,
  },
  dataItem: { flex: 1, alignItems: 'center' },
  dataNum: { fontSize: 15, fontWeight: '800', color: colors.txt1 },
  dataLab: { fontSize: 10, color: colors.txt3, marginTop: 2 },
  syncTime: { fontSize: 10, color: colors.txt3, marginBottom: 8 },
  // 操作按钮
  actions: { flexDirection: 'row', gap: 8 },
  btnSync: {
    flex: 1, paddingVertical: 8, borderRadius: 10, alignItems: 'center',
    backgroundColor: 'rgba(0,210,255,0.12)', borderWidth: 1, borderColor: 'rgba(0,210,255,0.3)',
  },
  btnSyncText: { fontSize: 12, fontWeight: '600', color: colors.cyan },
  btnUnbind: {
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10, alignItems: 'center',
    backgroundColor: 'rgba(244,63,94,0.10)', borderWidth: 1, borderColor: 'rgba(244,63,94,0.3)',
  },
  btnUnbindText: { fontSize: 12, fontWeight: '600', color: colors.rose },
  btnBind: {
    flex: 1, paddingVertical: 9, borderRadius: 10, alignItems: 'center',
    backgroundColor: colors.cyan,
  },
  btnBindText: { fontSize: 12, fontWeight: '700', color: '#000' },
});
