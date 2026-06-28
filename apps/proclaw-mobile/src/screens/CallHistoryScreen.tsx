// 通话记录页面
// v4.1: 音视频通话 - 通话记录列表

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  Alert,
} from 'react-native';
import {
  Text,
  Card,
  Avatar,
  useTheme,
  ActivityIndicator,
  Chip,
} from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';
import { showToast } from '../components/Toast';
import AuthService from '../services/AuthService';
import { useCallStore } from '../stores/CallStore';
import { resolveCallBackTarget } from '../utils/callBack';
import { getErrorMessage } from '../utils/errorUtils';
import { guardAvCall, isAvCallAvailable, startOutboundAvCall, AV_CALL_UNAVAILABLE_MSG } from '../utils/avCall';
import type { AppNavigation } from '../types/navigation';

// 临时类型定义
interface CallRecord {
  id: string;
  session_id: string;
  caller_id: string;
  callee_id: string;
  call_type: 'audio' | 'video';
  direction: 'outgoing' | 'incoming';
  status: string;
  duration_seconds: number;
  started_at: number;
  ended_at: number;
  created_at: string;
  caller_name?: string;
  callee_name?: string;
}

const STATUS_MAP: Record<string, { icon: string; color: string; label: string }> = {
  answered: { icon: 'phone', color: '#10b981', label: '已接' },
  missed: { icon: 'phone-missed', color: '#ef4444', label: '未接' },
  rejected: { icon: 'phone-hangup', color: '#f59e0b', label: '已拒' },
  ended: { icon: 'phone-hangup', color: '#888', label: '已结束' },
  busy: { icon: 'phone-hangup', color: '#f59e0b', label: '忙线' },
  ringing: { icon: 'phone', color: '#6366f1', label: '未接' },
};

const formatDuration = (seconds: number): string => {
  if (seconds <= 0) return '';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
};

const formatTime = (timestamp: number): string => {
  if (!timestamp) return '';
  const d = new Date(timestamp);
  const now = new Date();
  const diff = now.getTime() - d.getTime();

  if (diff < 86400000) {
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
  }
  return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
};

const CALL_UNAVAILABLE_MSG = AV_CALL_UNAVAILABLE_MSG;

const CallHistoryScreen: React.FC<{ contactId?: string }> = ({ contactId }) => {
  const navigation = useNavigation<AppNavigation>();
  const { colors } = useTheme();
  const avAvailable = isAvCallAvailable();
  const [records, setRecords] = useState<CallRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filterType, setFilterType] = useState<'all' | 'audio' | 'video' | 'missed'>('all');

  const handleCallBack = useCallback(async (item: CallRecord) => {
    if (!guardAvCall()) return;
    const store = useCallStore.getState();
    if (store.status !== 'idle') {
      Alert.alert('提示', '当前已在通话中');
      return;
    }
    const { userId, userName, callType } = resolveCallBackTarget(item);
    await startOutboundAvCall(navigation, userId, userName, callType);
  }, [navigation]);

  const loadRecords = useCallback(async () => {
    try {
      const token = await AuthService.loadToken();
      const serverUrl = await AuthService.loadServerUrl();
      if (!token || !serverUrl) {
        setRecords([]);
        return;
      }
      const params = new URLSearchParams();
      if (contactId) params.append('contact_id', contactId);
      params.append('limit', '50');

      const response = await fetch(`${serverUrl}/api/call-records?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        let result = data.data || [];
        if (filterType !== 'all') {
          if (filterType === 'missed') {
            result = result.filter((r: CallRecord) => r.status === 'missed');
          } else {
            result = result.filter((r: CallRecord) => r.call_type === filterType);
          }
        }
        setRecords(result);
      } else {
        setRecords([]);
      }
    } catch (err) {
      showToast('error', '加载失败', getErrorMessage(err));
      setRecords([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filterType, contactId]);

  useEffect(() => {
    loadRecords();
  }, [loadRecords]);

  const onRefresh = () => {
    setRefreshing(true);
    loadRecords();
  };

  const renderItem = ({ item }: { item: CallRecord }) => {
    const statusInfo = STATUS_MAP[item.status] || STATUS_MAP.missed;
    const isIncoming = item.direction === 'incoming';
    const displayName = isIncoming
      ? (item.caller_name || item.caller_id)
      : (item.callee_name || item.callee_id);

    return (
      <Card style={styles.card}>
        <Card.Content style={styles.cardContent}>
          {/* 头像 */}
          <Avatar.Text
            size={44}
            label={(displayName || '?').charAt(0)}
            style={{ backgroundColor: statusInfo.color + '30' }}
            labelStyle={{ color: statusInfo.color }}
          />

          {/* 信息 */}
          <View style={styles.info}>
            <View style={styles.nameRow}>
              <Text variant="titleSmall" style={styles.name}>{displayName}</Text>
              <MaterialCommunityIcons
                name={isIncoming ? 'arrow-down-left' : 'arrow-up-right'}
                size={14}
                color={isIncoming ? '#10b981' : '#6366f1'}
                style={{ marginLeft: 4 }}
              />
            </View>
            <View style={styles.detailRow}>
              <MaterialCommunityIcons
                name={statusInfo.icon}
                size={14}
                color={statusInfo.color}
              />
              <Text style={[styles.detailText, { color: statusInfo.color, marginLeft: 4 }]}>
                {statusInfo.label}
              </Text>
              {item.call_type && (
                <View style={styles.typeTag}>
                  <MaterialCommunityIcons
                    name={item.call_type === 'video' ? 'video' : 'phone'}
                    size={12}
                    color="#888"
                  />
                </View>
              )}
              {item.duration_seconds > 0 && (
                <Text style={styles.durationText}>
                  {formatDuration(item.duration_seconds)}
                </Text>
              )}
              <Text style={styles.timeText}>
                {formatTime(item.started_at)}
              </Text>
            </View>
          </View>

          {/* 回拨按钮 */}
          <TouchableOpacity
            style={styles.callBackBtn}
            onPress={() => handleCallBack(item)}
          >
            <MaterialCommunityIcons name="phone" size={20} color={colors.primary} />
          </TouchableOpacity>
        </Card.Content>
      </Card>
    );
  };

  const FILTERS = [
    { key: 'all' as const, label: '全部' },
    { key: 'audio' as const, label: '语音' },
    { key: 'video' as const, label: '视频' },
    { key: 'missed' as const, label: '未接' },
  ];

  return (
    <View style={styles.container}>
      {!avAvailable && (
      <View style={styles.unavailableBanner}>
        <MaterialCommunityIcons name="information-outline" size={18} color="#6366f1" />
        <Text variant="bodySmall" style={styles.unavailableBannerText}>
          {CALL_UNAVAILABLE_MSG}
        </Text>
      </View>
      )}
      {/* 筛选栏 */}
      <View style={styles.filterBar}>
        {FILTERS.map((f) => (
          <Chip
            key={f.key}
            selected={filterType === f.key}
            onPress={() => setFilterType(f.key)}
            style={styles.chip}
            selectedColor="#6366f1"
            showSelectedOverlay
          >
            {f.label}
          </Chip>
        ))}
      </View>

      {loading ? (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={records}
          renderItem={renderItem}
          keyExtractor={(r) => r.id}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <MaterialCommunityIcons name="phone-off" size={56} color="#ddd" />
              <Text variant="bodyLarge" style={styles.emptyText}>暂无通话记录</Text>
              <Text variant="bodySmall" style={styles.emptyHint}>
                与联系人发起通话后将在此显示
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f8f8',
  },
  unavailableBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#eef2ff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e7ff',
  },
  unavailableBannerText: {
    flex: 1,
    color: '#4338ca',
    lineHeight: 18,
  },
  filterBar: {
    flexDirection: 'row',
    padding: 12,
    gap: 8,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  chip: {
    borderRadius: 16,
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  list: {
    padding: 12,
  },
  card: {
    marginBottom: 8,
    borderRadius: 12,
    backgroundColor: '#fff',
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  info: {
    flex: 1,
    marginLeft: 14,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  name: {
    fontWeight: '600',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailText: {
    fontSize: 12,
    fontWeight: '500',
  },
  typeTag: {
    marginLeft: 8,
  },
  durationText: {
    fontSize: 12,
    color: '#888',
    marginLeft: 8,
  },
  timeText: {
    fontSize: 12,
    color: '#aaa',
    marginLeft: 8,
  },
  callBackBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#e0e7ff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  empty: {
    alignItems: 'center',
    paddingTop: 80,
  },
  emptyText: {
    color: '#999',
    marginTop: 16,
    fontWeight: '500',
  },
  emptyHint: {
    color: '#bbb',
    marginTop: 6,
  },
});

export default CallHistoryScreen;
