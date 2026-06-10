/**
 * MessagesTab - 消息 Tab
 * 会话列表页，显示所有聊天会话，支持搜索、置顶、标记已读/未读
 *
 * 玻璃拟态美学 — 半透明会话项、发光头像、深色渐变底
 */
import React, { useEffect, useState, useCallback, useLayoutEffect, useMemo } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import {
  Text,
  Avatar,
  ActivityIndicator,
  Badge,
} from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import LinearGradient from 'react-native-linear-gradient';
import SearchHeaderTitle from '../components/SearchHeaderTitle';
import {
  togglePin,
  deleteSession,
  type ChatSession,
} from '../services/ChatService';
import { useChatStore } from '../stores/ChatStore';
import type { AppNavigation } from '../types/navigation';

function formatTime(ts: number): string {
  if (!ts) return '';
  const d = new Date(ts * 1000);
  const now = new Date();
  const isToday =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  if (isToday) {
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
  }
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday =
    d.getFullYear() === yesterday.getFullYear() &&
    d.getMonth() === yesterday.getMonth() &&
    d.getDate() === yesterday.getDate();
  if (isYesterday) return '昨天';
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

export default function MessagesTab() {  const navigation = useNavigation<AppNavigation>();
  const {
    sessions: allSessions,
    loading,
    refreshSessions,
    markSessionRead,
  } = useChatStore();
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  // 搜索过滤
  const sessions = useMemo(() => {
    if (!searchQuery) return allSessions;
    const q = searchQuery.toLowerCase();
    return allSessions.filter(
      (s) =>
        s.target_name.toLowerCase().includes(q) ||
        s.last_message.toLowerCase().includes(q)
    );
  }, [allSessions, searchQuery]);

  // 页面聚焦时刷新
  useFocusEffect(
    useCallback(() => {
      refreshSessions();
    }, [refreshSessions])
  );

  // 搜索框展开后 3 秒无输入自动收回
  useEffect(() => {
    if (!isSearching || searchQuery.trim().length > 0) return;
    const timer = setTimeout(() => {
      setIsSearching(false);
      setSearchQuery('');
    }, 3000);
    return () => clearTimeout(timer);
  }, [isSearching, searchQuery]);

  // 切换搜索框展开/收起
  const toggleSearch = useCallback(() => {
    if (isSearching) {
      setSearchQuery('');
      setIsSearching(false);
    } else {
      setIsSearching(true);
    }
  }, [isSearching]);

  // 动态设置导航 Header：放大镜按钮 + 可滑入搜索框
  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: () => (
        <SearchHeaderTitle
          title="消息"
          placeholder="搜索会话..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          onSubmitEditing={refreshSessions}
          isSearching={isSearching}
        />
      ),
      headerRight: () => (
        <TouchableOpacity onPress={toggleSearch} style={{ marginRight: 16 }}>
          <MaterialCommunityIcons
            name={isSearching ? 'close' : 'magnify'}
            size={24}
            color="#fff"
          />
        </TouchableOpacity>
      ),
    });
  }, [navigation, isSearching, searchQuery, refreshSessions, toggleSearch]);

  const onRefresh = async () => {
    setRefreshing(true);
    await refreshSessions();
    setRefreshing(false);
  };

  const handleSessionPress = async (session: ChatSession) => {
    // 标记已读
    await markSessionRead(session.id);
    navigation.navigate('ChatDetail', {
      sessionId: session.id,
      targetId: session.target_id,
      targetName: session.target_name,
      targetType: session.session_type,
      targetIcon: session.target_icon,
    });
  };

  const handleTogglePin = async (sessionId: string) => {
    await togglePin(sessionId);
    await refreshSessions();
  };

  const handleDelete = async (sessionId: string) => {
    await deleteSession(sessionId);
    await refreshSessions();
  };

  const renderSession = ({ item }: { item: ChatSession }) => (
    <TouchableOpacity
      style={[styles.sessionItem, item.is_pinned === 1 && styles.sessionItemPinned]}
      onPress={() => handleSessionPress(item)}
      onLongPress={() => handleTogglePin(item.id)}
      activeOpacity={0.7}
    >
      {/* 头像 */}
      <View style={styles.avatarContainer}>
        <View style={[
          styles.glassAvatarWrap,
          {
            borderColor: item.session_type === 'agent' ? 'rgba(0,210,255,0.5)'
              : item.session_type === 'team' ? 'rgba(123,47,247,0.5)'
              : 'rgba(0,245,212,0.5)',
          },
        ]}>
          <Avatar.Text
            size={42}
            label={item.target_name.charAt(0)}
            color="#fff"
            style={{
              backgroundColor: item.session_type === 'agent' ? '#00d2ff'
                : item.session_type === 'team' ? '#7b2ff7'
                : '#00f5d4',
            }}
          />
        </View>
        {item.unread_count > 0 && (
          <View style={styles.unreadBadgeWrap}>
            <Text style={styles.unreadBadgeText}>
              {item.unread_count > 99 ? '99+' : item.unread_count}
            </Text>
          </View>
        )}
      </View>

      {/* 内容 */}
      <View style={styles.sessionContent}>
        <View style={styles.sessionHeader}>
          <Text style={styles.sessionName} numberOfLines={1}>
            {item.target_name}
          </Text>
          <Text style={styles.sessionTime}>
            {formatTime(item.last_message_time)}
          </Text>
        </View>
        <View style={styles.sessionPreview}>
          <Text style={styles.previewText} numberOfLines={1}>
            {item.last_message || '暂无消息'}
          </Text>
          {item.is_pinned === 1 && (
            <MaterialCommunityIcons name="pin" size={14} color="#00d2ff" style={styles.pinIcon} />
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* 渐变背景 */}
      <LinearGradient
        colors={['#0f0c29', '#302b63', '#24243e']}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      {/* 会话列表 */}
      {loading ? (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color="#00d2ff" />
        </View>
      ) : (
        <FlatList
          data={sessions}
          renderItem={renderSession}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#00d2ff" />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <MaterialCommunityIcons name="chat-outline" size={56} color="rgba(255,255,255,0.15)" />
              <Text variant="bodyLarge" style={styles.emptyText}>
                {searchQuery ? '没有匹配的会话' : '暂无消息'}
              </Text>
              <Text variant="bodySmall" style={styles.emptyHint}>
                从联系人列表开始对话吧
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  list: {
    paddingVertical: 4,
  },

  // ---- 会话项 ----
  sessionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 8,
    marginVertical: 3,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  sessionItemPinned: {
    backgroundColor: 'rgba(0,210,255,0.06)',
    borderColor: 'rgba(0,210,255,0.15)',
  },

  // ---- 头像 ----
  avatarContainer: {
    position: 'relative',
    marginRight: 14,
  },
  glassAvatarWrap: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  unreadBadgeWrap: {
    position: 'absolute',
    top: -2,
    right: -4,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#ff6b9d',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 5,
    shadowColor: '#ff6b9d',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 3,
  },
  unreadBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },

  // ---- 内容 ----
  sessionContent: {
    flex: 1,
  },
  sessionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  sessionName: {
    fontSize: 15,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.92)',
    flex: 1,
    marginRight: 8,
  },
  sessionTime: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.4)',
    fontWeight: '300',
  },
  sessionPreview: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  previewText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.45)',
    flex: 1,
    fontWeight: '300',
  },
  pinIcon: {
    marginLeft: 6,
  },

  // ---- 空状态 ----
  empty: {
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyText: {
    color: 'rgba(255,255,255,0.5)',
    marginTop: 16,
    fontWeight: '500',
  },
  emptyHint: {
    color: 'rgba(255,255,255,0.3)',
    marginTop: 6,
  },
});
