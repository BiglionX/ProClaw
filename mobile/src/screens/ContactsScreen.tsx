import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { View, StyleSheet, FlatList, RefreshControl, TouchableOpacity, ScrollView, Alert, TextInput } from 'react-native';
import { Text, Avatar, useTheme, ActivityIndicator } from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { Swipeable } from 'react-native-gesture-handler';
import { useNavigation } from '@react-navigation/native';
import LinearGradient from 'react-native-linear-gradient';
import { getCustomers, Customer, ContactType, CONTACT_TYPE_LABELS } from '../services/ApiService';
import { isDemoMode } from '../services/AuthService';
import { showToast } from '../components/Toast';
import { useCallStore } from '../stores/CallStore';

const TYPE_CONFIG: Record<ContactType, { icon: string; color: string; glow: string }> = {
  colleague:   { icon: 'account-tie',   color: '#00d2ff', glow: 'rgba(0,210,255,0.25)' },
  customer:    { icon: 'account-star',   color: '#00f5d4', glow: 'rgba(0,245,212,0.25)' },
  supplier:    { icon: 'truck-delivery', color: '#ff6b9d', glow: 'rgba(255,107,157,0.25)' },
};

const DEMO_CONTACTS: Customer[] = [
  // 同事
  { id: 'c1', name: '陈志远', phone: '138****1001', email: 'chenzy@proclaw.com', contact_type: 'colleague', department: '技术部', position: '高级工程师' },
  { id: 'c2', name: '刘芳',   phone: '138****1002', email: 'liufang@proclaw.com', contact_type: 'colleague', department: '销售部', position: '销售经理' },
  { id: 'c3', name: '赵明辉', phone: '138****1003', email: 'zhaomh@proclaw.com', contact_type: 'colleague', department: '财务部', position: '财务主管' },
  // 客户
  { id: 'k1', name: '张伟',   phone: '139****2111', email: 'zhangwei@example.com',  contact_type: 'customer', company: '恒达商贸有限公司', position: '采购经理' },
  { id: 'k2', name: '李娜',   phone: '139****2222', email: 'lina@example.com',      contact_type: 'customer', company: '星辰科技股份',     position: '总经理' },
  { id: 'k3', name: '王磊',   phone: '139****2333', email: 'wanglei@example.com',   contact_type: 'customer', company: '金茂实业集团',     position: '运营总监' },
  { id: 'k4', name: '孙晓梅', phone: '139****2444', email: 'sunxm@example.com',     contact_type: 'customer', company: '绿源环保科技',     position: '采购主管' },
  // 供应商
  { id: 's1', name: '周建国', phone: '137****3111', email: 'zhoujg@supply.com',     contact_type: 'supplier', company: '鼎丰电子材料有限公司', position: '销售总监' },
  { id: 's2', name: '吴丽华', phone: '137****3222', email: 'wulh@supply.com',       contact_type: 'supplier', company: '华远工业原料供应', position: '大客户经理' },
  { id: 's3', name: '郑海龙', phone: '137****3333', email: 'zhenghl@supply.com',    contact_type: 'supplier', company: '鑫达包装制品厂',     position: '法人代表' },
];

type FilterType = 'all' | ContactType;

const ContactsScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { colors } = useTheme();
  const [contacts, setContacts] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<FilterType>('all');

  const loadContacts = useCallback(async () => {
    try {
      if (await isDemoMode()) {
        let filtered = DEMO_CONTACTS;
        if (searchQuery) {
          const q = searchQuery.toLowerCase();
          filtered = filtered.filter((c) =>
            c.name.toLowerCase().includes(q) ||
            (c.phone || '').includes(searchQuery) ||
            (c.company || '').toLowerCase().includes(q) ||
            (c.department || '').toLowerCase().includes(q)
          );
        }
        if (filterType !== 'all') {
          filtered = filtered.filter((c) => c.contact_type === filterType);
        }
        setContacts(filtered);
      } else {
        const data = await getCustomers({ search: searchQuery || undefined });
        let result = filterType !== 'all'
          ? data.filter((c) => c.contact_type === filterType)
          : data;
        setContacts(result);
      }
    } catch (err: any) {
      showToast('error', '加载失败', err.message);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, filterType]);

  useEffect(() => {
    setLoading(true);
    loadContacts();
  }, [loadContacts]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadContacts();
    setRefreshing(false);
  };

  const onSearch = () => {
    setLoading(true);
    loadContacts();
  };

  // 各分类计数（基于实际数据）
  const typeCounts = useMemo(() => {
    const data = contacts;
    const all = data.length;
    const colleague = data.filter((c) => c.contact_type === 'colleague').length;
    const customer = data.filter((c) => c.contact_type === 'customer').length;
    const supplier = data.filter((c) => c.contact_type === 'supplier').length;
    return { all, colleague, customer, supplier };
  }, [contacts]);

  const FILTER_TABS: { key: FilterType; label: string; count: number }[] = [
    { key: 'all',        label: '全部',   count: typeCounts.all },
    { key: 'colleague',  label: '同事',   count: typeCounts.colleague },
    { key: 'customer',   label: '客户',   count: typeCounts.customer },
    { key: 'supplier',   label: '供应商', count: typeCounts.supplier },
  ];

  const getSwipeAction = (item: Customer) => {
    if (item.contact_type === 'colleague') {
      return { icon: 'message-text', label: '消息', color: '#00d2ff' };
    }
    if (item.contact_type === 'supplier') {
      return { icon: 'cart-arrow-down', label: '采购', color: '#ff6b9d' };
    }
    return { icon: 'clipboard-text', label: '下单', color: '#00f5d4' };
  };

  const renderRightActions = (item: Customer) => {
    const action = getSwipeAction(item);
    return (
      <View style={styles.swipeActions}>
        <View style={[styles.swipeAction, { backgroundColor: action.color }]}>
          <MaterialCommunityIcons name={action.icon} size={20} color="#fff" />
          <Text style={styles.swipeActionText}>{action.label}</Text>
        </View>
      </View>
    );
  };

  const renderTypeBadge = (type?: ContactType) => {
    if (!type) return null;
    const cfg = TYPE_CONFIG[type];
    return (
      <View style={[styles.glassBadge, { backgroundColor: cfg.glow, borderColor: `${cfg.color}55` }]}>
        <MaterialCommunityIcons name={cfg.icon} size={12} color={cfg.color} />
        <Text style={[styles.typeBadgeText, { color: cfg.color }]}>
          {CONTACT_TYPE_LABELS[type]}
        </Text>
      </View>
    );
  };

  const handleCardPress = (item: Customer) => {
    if (item.contact_type === 'customer') {
      navigation.navigate('SalesOrder', { selectedCustomer: item });
    } else if (item.contact_type === 'supplier') {
      showToast('info', '提示', '采购单功能开发中');
    } else {
      showToast('info', '提示', '同事详情功能开发中');
    }
  };

  /** 发起语音/视频通话 */
  const handleCall = (item: Customer, callType: 'audio' | 'video') => {
    const store = useCallStore.getState();
    if (store.status !== 'idle') {
      Alert.alert('提示', '当前已在通话中');
      return;
    }
    // 生成会话ID并导航到通话界面
    const sessionId = `call_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    store.startOutgoingCall({
      sessionId,
      remoteUserId: item.id,
      remoteUserName: item.name,
      callType,
    });
    navigation.navigate('Call' as never);
  };

  /** 打开邀请页面 */
  const handleInvite = () => {
    navigation.navigate('InvitePartner' as never);
  };

  const renderContact = ({ item }: { item: Customer }) => {
    const typeCfg = item.contact_type ? TYPE_CONFIG[item.contact_type] : null;
    const avatarColor = typeCfg?.color || '#00d2ff';
    const subtitle = item.company || item.department
      ? (item.company || item.department) + (item.position ? ` · ${item.position}` : '')
      : item.position || '';

    // 联系人来源标识（是否为邀请添加）
    const isInvited = (item as any).source === 'invitation';

    return (
      <Swipeable renderRightActions={() => renderRightActions(item)}>
        <TouchableOpacity activeOpacity={0.7} onPress={() => handleCardPress(item)} style={styles.glassCard}>
          <View style={styles.cardContent}>
            <View style={[styles.glassAvatarWrap, { borderColor: `${avatarColor}66` }]}>
              <Avatar.Text
                size={40}
                label={item.name.charAt(0)}
                color="#fff"
                style={{ backgroundColor: avatarColor }}
              />
            </View>
            <View style={styles.info}>
              <View style={styles.nameRow}>
                <Text variant="titleSmall" style={styles.name}>{item.name}</Text>
                {renderTypeBadge(item.contact_type)}
                {isInvited && (
                  <View style={[styles.glassBadge, { backgroundColor: 'rgba(123,47,247,0.2)', borderColor: 'rgba(123,47,247,0.35)' }]}>
                    <MaterialCommunityIcons name="link-variant" size={10} color="#7b2ff7" />
                    <Text style={[styles.typeBadgeText, { color: '#7b2ff7' }]}>邀请</Text>
                  </View>
                )}
              </View>
              {subtitle ? (
                <Text variant="bodySmall" style={styles.subtitle} numberOfLines={1}>
                  {subtitle}
                </Text>
              ) : null}
              <View style={styles.detailRow}>
                {item.phone && (
                  <>
                    <MaterialCommunityIcons name="phone" size={13} color="rgba(255,255,255,0.4)" style={styles.detailIcon} />
                    <Text variant="bodySmall" style={styles.detail}>{item.phone}</Text>
                  </>
                )}
                {item.email && (
                  <>
                    <MaterialCommunityIcons name="email-outline" size={13} color="rgba(255,255,255,0.4)" style={[styles.detailIcon, item.phone ? { marginLeft: 12 } : {}]} />
                    <Text variant="bodySmall" style={styles.detail}>{item.email}</Text>
                  </>
                )}
              </View>
            </View>
            {/* 通话按钮 */}
            <View style={styles.callActions}>
              <TouchableOpacity
                style={[styles.glassCallBtn, { borderColor: `${avatarColor}55` }]}
                onPress={(e) => { e.stopPropagation?.(); handleCall(item, 'audio'); }}
                activeOpacity={0.6}
              >
                <MaterialCommunityIcons name="phone" size={18} color={avatarColor} />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.glassCallBtn, { borderColor: 'rgba(0,245,212,0.35)' }]}
                onPress={(e) => { e.stopPropagation?.(); handleCall(item, 'video'); }}
                activeOpacity={0.6}
              >
                <MaterialCommunityIcons name="video" size={18} color="#00f5d4" />
              </TouchableOpacity>
              <MaterialCommunityIcons name="chevron-right" size={22} color="rgba(255,255,255,0.2)" />
            </View>
          </View>
        </TouchableOpacity>
      </Swipeable>
    );
  };

  return (
    <View style={styles.container}>
      {/* 渐变背景 */}
      <LinearGradient
        colors={['#0f0c29', '#302b63', '#24243e']}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      {/* 搜索栏 */}
      <View style={styles.searchBar}>
        <View style={styles.glassSearchWrap}>
          <MaterialCommunityIcons name="magnify" size={20} color="rgba(255,255,255,0.5)" />
          <TextInput
            style={styles.glassSearchInput}
            placeholder="搜索姓名、电话、公司"
            placeholderTextColor="rgba(255,255,255,0.35)"
            onChangeText={setSearchQuery}
            value={searchQuery}
            onSubmitEditing={onSearch}
            returnKeyType="search"
          />
        </View>
      </View>

      {/* 分类筛选 Tab */}
      <View style={styles.filterBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
          {FILTER_TABS.map((tab) => {
            const active = filterType === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                style={[styles.glassFilterTab, active && styles.glassFilterTabActive]}
                onPress={() => setFilterType(tab.key)}
                activeOpacity={0.7}
              >
                <Text style={[styles.filterTabText, active && styles.filterTabTextActive]}>
                  {tab.label}
                </Text>
                <Text style={[styles.filterTabCount, active && styles.filterTabCountActive]}>
                  {tab.count}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* 数量统计 */}
      {!loading && contacts.length > 0 && (
        <Text variant="bodySmall" style={styles.count}>
          共 {contacts.length} 位联系人
        </Text>
      )}

      {/* 列表 */}
      {loading ? (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color="#00d2ff" />
        </View>
      ) : (
        <FlatList
          data={contacts}
          renderItem={renderContact}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#00d2ff" />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <MaterialCommunityIcons name="account-group" size={56} color="rgba(255,255,255,0.15)" />
              <Text variant="bodyLarge" style={styles.emptyText}>暂无联系人</Text>
              <Text variant="bodySmall" style={styles.emptyHint}>
                {filterType !== 'all' ? '当前分类没有匹配的联系人' : '请在桌面端添加联系人信息'}
              </Text>
            </View>
          }
        />
      )}

      {/* 邀请外部伙伴 FAB */}
      <TouchableOpacity
        style={styles.glassFab}
        onPress={handleInvite}
        activeOpacity={0.8}
      >
        <MaterialCommunityIcons name="account-plus" size={22} color="#fff" />
        <Text style={styles.glassFabText}>邀请伙伴</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },

  // ---- 搜索栏 ----
  searchBar: {
    padding: 12,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  glassSearchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  glassSearchInput: {
    flex: 1,
    height: 42,
    fontSize: 14,
    color: '#fff',
    marginLeft: 8,
  },

  // ---- 筛选条 ----
  filterBar: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  filterScroll: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  glassFilterTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 18,
    marginRight: 8,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  glassFilterTabActive: {
    backgroundColor: 'rgba(0,210,255,0.2)',
    borderColor: 'rgba(0,210,255,0.4)',
  },
  filterTabText: {
    fontSize: 13,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.6)',
  },
  filterTabTextActive: {
    color: '#fff',
  },
  filterTabCount: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.35)',
    marginLeft: 4,
    fontWeight: '500',
  },
  filterTabCountActive: {
    color: 'rgba(255,255,255,0.8)',
  },
  count: {
    textAlign: 'center',
    color: 'rgba(255,255,255,0.4)',
    paddingTop: 12,
    paddingBottom: 4,
    fontSize: 12,
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  list: {
    padding: 12,
  },

  // ---- 玻璃拟态卡片 ----
  glassCard: {
    marginBottom: 8,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 14,
    paddingVertical: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  // ---- 头像 ----
  glassAvatarWrap: {
    width: 46,
    height: 46,
    borderRadius: 23,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },

  // ---- 信息 ----
  info: {
    flex: 1,
    marginLeft: 12,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  name: {
    fontWeight: '600',
    marginRight: 8,
    color: 'rgba(255,255,255,0.92)',
  },
  subtitle: {
    color: 'rgba(255,255,255,0.5)',
    fontWeight: '300',
    marginBottom: 4,
  },

  // ---- 玻璃拟态徽章 ----
  glassBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
    borderWidth: 1,
  },
  typeBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    marginLeft: 3,
  },

  // ---- 详情 ----
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  detailIcon: {
    marginRight: 3,
  },
  detail: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
  },

  // ---- 通话按钮 ----
  callActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  glassCallBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,210,255,0.08)',
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // ---- 滑动操作 ----
  swipeActions: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  swipeAction: {
    width: 72,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
    marginTop: 2,
  },
  swipeActionText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },

  // ---- FAB ----
  glassFab: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,210,255,0.2)',
    borderWidth: 1.5,
    borderColor: 'rgba(0,210,255,0.45)',
    borderRadius: 28,
    paddingHorizontal: 18,
    paddingVertical: 14,
    shadowColor: '#00d2ff',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  glassFabText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
    marginLeft: 8,
  },

  // ---- 空状态 ----
  empty: {
    alignItems: 'center',
    paddingTop: 80,
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

export default ContactsScreen;
