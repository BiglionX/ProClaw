/**
 * ProClipsNotificationsScreen - 消息通知中心
 *
 * 对应原型 page-notifications：
 *   导航栏（返回 + 消息通知 + 全部已读）
 *   + 3 Tab（全部 / 小如对话 / 系统通知）
 *   + 按时间分组（今天 / 昨天）
 *   + 消息卡片（图标 + 标题 + 描述 + 时间 + 未读红点）
 *
 * 数据来自 ProClipsStore.notifications，已读状态全局同步。
 * 点击：xiaoru → 跳小如聊天；ip_up → 跳 IP 助理；其他 → Alert 详情。
 */
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import type { AppNavigation } from '../types/navigation';
import { colors, gradients, radius } from '../components/Theme';
import { useProClipsStore } from '../stores/ProClipsStore';
import {
  NOTIF_TABS, filterNotifications, groupNotifications,
  type NotificationItem, type NotifTab, type NotifIcoBg,
} from '../services/ProClipsService';

export default function ProClipsNotificationsScreen() {
  const navigation = useNavigation<AppNavigation<'ProClipsNotifications'>>();
  const notifications = useProClipsStore((s) => s.notifications);
  const markNotificationRead = useProClipsStore((s) => s.markNotificationRead);
  const markAllNotificationsRead = useProClipsStore((s) => s.markAllNotificationsRead);

  const [tab, setTab] = useState<NotifTab>('全部');

  const filtered = filterNotifications(notifications, tab);
  const groups = groupNotifications(filtered);
  const unreadCount = notifications.filter((n) => !n.read).length;

  const handlePress = (n: NotificationItem) => {
    if (!n.read) markNotificationRead(n.id);
    if (n.type === 'xiaoru') {
      navigation.navigate('ProClipsXiaoruChat');
    } else if (n.type === 'ip_up') {
      navigation.navigate('ProClipsIPCoach');
    } else {
      Alert.alert(n.title, n.content, [{ text: '知道了' }]);
    }
  };

  const handleMarkAll = () => {
    if (unreadCount === 0) return;
    markAllNotificationsRead();
    Alert.alert('已全部标为已读', '', [{ text: '好的' }]);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* 导航栏 */}
      <View style={styles.navBar}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.navArrow}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.navTitle}>消息通知</Text>
        <TouchableOpacity
          style={styles.markAllBtn}
          onPress={handleMarkAll}
          disabled={unreadCount === 0}
          activeOpacity={0.7}
        >
          <Text style={[styles.markAllText, unreadCount === 0 && styles.markAllTextDisabled]}>
            全部已读
          </Text>
        </TouchableOpacity>
      </View>

      {/* Tab 栏 */}
      <View style={styles.tabsRow}>
        {NOTIF_TABS.map((t) => {
          const active = t === tab;
          return (
            <TouchableOpacity
              key={t}
              onPress={() => setTab(t)}
              activeOpacity={0.7}
              style={styles.tabWrap}
            >
              {active ? (
                <LinearGradient
                  colors={[...gradients.main]}
                  style={styles.tab}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  <Text style={styles.tabTextActive}>{t}</Text>
                </LinearGradient>
              ) : (
                <View style={styles.tab}>
                  <Text style={styles.tabText}>{t}</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* 消息列表 */}
      <ScrollView
        style={styles.list}
        contentContainerStyle={styles.listBody}
        showsVerticalScrollIndicator={false}
      >
        {groups.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyIcon}>🔕</Text>
            <Text style={styles.emptyText}>暂无消息</Text>
          </View>
        ) : (
          groups.map((g) => (
            <View key={g.group}>
              <Text style={styles.timeLabel}>{g.group}</Text>
              {g.items.map((n) => (
                <NotifCard key={n.id} n={n} onPress={() => handlePress(n)} />
              ))}
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ============ 消息卡片 ============
function NotifCard({ n, onPress }: { n: NotificationItem; onPress: () => void }) {
  const isGrad = n.icoBg === 'grad';
  return (
    <TouchableOpacity
      style={[styles.card, !n.read && styles.cardUnread]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {!n.read && <View style={styles.unreadDot} />}
      {/* 图标 */}
      {isGrad ? (
        <LinearGradient
          colors={[...gradients.main]}
          style={styles.ico}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Text style={styles.icoTextGrad}>{n.icon}</Text>
        </LinearGradient>
      ) : (
        <View style={[styles.ico, { backgroundColor: icoBgColor(n.icoBg) }]}>
          <Text style={[styles.icoText, { color: icoFgColor(n.icoBg) }]}>{n.icon}</Text>
        </View>
      )}
      {/* 内容 */}
      <View style={styles.cardBody}>
        <Text style={styles.cardTitle}>{n.title}</Text>
        <Text style={styles.cardDesc}>{n.content}</Text>
        <Text style={styles.cardTime}>{n.time}</Text>
      </View>
    </TouchableOpacity>
  );
}

// ============ 图标颜色 helper ============
function icoBgColor(k: NotifIcoBg): string {
  if (k === 'cyan') return 'rgba(0,210,255,0.14)';
  if (k === 'amber') return 'rgba(251,191,36,0.16)';
  if (k === 'green') return 'rgba(34,197,94,0.16)';
  if (k === 'purple') return 'rgba(168,85,247,0.18)';
  return 'rgba(255,255,255,0.08)';
}
function icoFgColor(k: NotifIcoBg): string {
  if (k === 'cyan') return colors.cyan;
  if (k === 'amber') return colors.yellow;
  if (k === 'green') return colors.success;
  if (k === 'purple') return colors.purple;
  return colors.txt2;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bgDeep },
  // 导航
  navBar: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 10,
    backgroundColor: 'rgba(15,15,30,0.82)',
    borderBottomWidth: 1, borderBottomColor: colors.line,
  },
  iconBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  navArrow: { fontSize: 28, color: colors.txt1, fontWeight: '300', marginTop: -4 },
  navTitle: { flex: 1, fontSize: 16, fontWeight: '700', color: colors.txt1, marginLeft: 4 },
  markAllBtn: { paddingHorizontal: 12, paddingVertical: 6 },
  markAllText: { fontSize: 12, fontWeight: '600', color: colors.cyan },
  markAllTextDisabled: { color: colors.txt3 },
  // Tab
  tabsRow: {
    flexDirection: 'row', gap: 8,
    paddingHorizontal: 16, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: colors.line,
  },
  tabWrap: { borderRadius: 20, overflow: 'hidden' as any },
  tab: { paddingHorizontal: 15, paddingVertical: 7, borderRadius: 20 },
  tabText: { fontSize: 12.5, fontWeight: '600', color: colors.txt2 },
  tabTextActive: { fontSize: 12.5, fontWeight: '600', color: '#fff' },
  // 列表
  list: { flex: 1 },
  listBody: { padding: 16, paddingTop: 6, paddingBottom: 30 },
  timeLabel: {
    fontSize: 11, color: colors.txt3, fontWeight: '600',
    marginTop: 10, marginBottom: 8, letterSpacing: 0.5,
  },
  // 卡片
  card: {
    flexDirection: 'row', gap: 12, alignItems: 'flex-start',
    backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.line,
    borderRadius: radius.md, padding: 13, marginBottom: 9, position: 'relative',
  },
  cardUnread: {
    backgroundColor: colors.bgCard2,
    borderColor: 'rgba(0,210,255,0.16)',
  },
  unreadDot: {
    position: 'absolute', left: 7, top: 18,
    width: 6, height: 6, borderRadius: 3,
    backgroundColor: colors.error,
    shadowColor: colors.error, shadowOpacity: 0.6,
    shadowRadius: 6, shadowOffset: { width: 0, height: 0 },
    elevation: 4,
  },
  ico: {
    width: 40, height: 40, borderRadius: 11,
    justifyContent: 'center', alignItems: 'center',
  },
  icoText: { fontSize: 18, fontWeight: '700' },
  icoTextGrad: { fontSize: 16, fontWeight: '700', color: '#fff' },
  cardBody: { flex: 1, minWidth: 0 },
  cardTitle: { fontSize: 13.5, fontWeight: '600', color: colors.txt1, lineHeight: 20 },
  cardDesc: { fontSize: 12, color: colors.txt2, marginTop: 4, lineHeight: 18 },
  cardTime: { fontSize: 10.5, color: colors.txt3, marginTop: 5 },
  // 空状态
  emptyWrap: { alignItems: 'center', paddingVertical: 60 },
  emptyIcon: { fontSize: 40, marginBottom: 12 },
  emptyText: { fontSize: 13, color: colors.txt3 },
});
