import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { View, StyleSheet, FlatList, RefreshControl, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { Text, Searchbar, Card, Avatar, useTheme, ActivityIndicator, FAB } from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { Swipeable } from 'react-native-gesture-handler';
import { useNavigation } from '@react-navigation/native';
import { getCustomers, Customer, ContactType, CONTACT_TYPE_LABELS } from '../services/ApiService';
import { isDemoMode } from '../services/AuthService';
import { showToast } from '../components/Toast';
import { useCallStore } from '../stores/CallStore';

const TYPE_CONFIG: Record<ContactType, { icon: string; color: string; bg: string }> = {
  colleague:   { icon: 'account-tie',       color: '#6366f1', bg: '#e0e7ff' },
  customer:    { icon: 'account-star',       color: '#10b981', bg: '#d1fae5' },
  supplier:    { icon: 'truck-delivery',     color: '#f59e0b', bg: '#fef3c7' },
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
      return { icon: 'message-text', label: '消息', color: '#6366f1' };
    }
    if (item.contact_type === 'supplier') {
      return { icon: 'cart-arrow-down', label: '采购', color: '#f59e0b' };
    }
    return { icon: 'clipboard-text', label: '下单', color: '#10b981' };
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
      <View style={[styles.typeBadge, { backgroundColor: cfg.bg }]}>
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
    const avatarColor = typeCfg?.color || colors.primary;
    const subtitle = item.company || item.department
      ? (item.company || item.department) + (item.position ? ` · ${item.position}` : '')
      : item.position || '';

    // 联系人来源标识（是否为邀请添加）
    const isInvited = (item as any).source === 'invitation';

    return (
      <Swipeable renderRightActions={() => renderRightActions(item)}>
        <Card style={styles.card} onPress={() => handleCardPress(item)}>
          <Card.Content style={styles.cardContent}>
            <Avatar.Text
              size={44}
              label={item.name.charAt(0)}
              style={{ backgroundColor: avatarColor }}
            />
            <View style={styles.info}>
              <View style={styles.nameRow}>
                <Text variant="titleSmall" style={styles.name}>{item.name}</Text>
                {renderTypeBadge(item.contact_type)}
                {isInvited && (
                  <View style={[styles.typeBadge, { backgroundColor: '#ede9fe' }]}>
                    <MaterialCommunityIcons name="link-variant" size={10} color="#8b5cf6" />
                    <Text style={[styles.typeBadgeText, { color: '#8b5cf6' }]}>邀请</Text>
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
                    <MaterialCommunityIcons name="phone" size={13} color="#999" style={styles.detailIcon} />
                    <Text variant="bodySmall" style={styles.detail}>{item.phone}</Text>
                  </>
                )}
                {item.email && (
                  <>
                    <MaterialCommunityIcons name="email-outline" size={13} color="#999" style={[styles.detailIcon, item.phone ? { marginLeft: 12 } : {}]} />
                    <Text variant="bodySmall" style={styles.detail}>{item.email}</Text>
                  </>
                )}
              </View>
            </View>
            {/* 通话按钮 */}
            <View style={styles.callActions}>
              <TouchableOpacity
                style={styles.callBtn}
                onPress={(e) => { e.stopPropagation?.(); handleCall(item, 'audio'); }}
                activeOpacity={0.6}
              >
                <MaterialCommunityIcons name="phone" size={18} color="#6366f1" />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.callBtn, styles.videoCallBtn]}
                onPress={(e) => { e.stopPropagation?.(); handleCall(item, 'video'); }}
                activeOpacity={0.6}
              >
                <MaterialCommunityIcons name="video" size={18} color="#10b981" />
              </TouchableOpacity>
              <MaterialCommunityIcons name="chevron-right" size={22} color="#e0e0e0" />
            </View>
          </Card.Content>
        </Card>
      </Swipeable>
    );
  };

  return (
    <View style={styles.container}>
      {/* 搜索栏 */}
      <View style={styles.searchBar}>
        <Searchbar
          placeholder="搜索姓名、电话、公司"
          onChangeText={setSearchQuery}
          value={searchQuery}
          onSubmitEditing={onSearch}
          onIconPress={onSearch}
          style={styles.searchInput}
          inputStyle={{ fontSize: 14 }}
        />
      </View>

      {/* 分类筛选 Tab */}
      <View style={styles.filterBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
          {FILTER_TABS.map((tab) => {
            const active = filterType === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                style={[styles.filterTab, active && styles.filterTabActive]}
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
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={contacts}
          renderItem={renderContact}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <MaterialCommunityIcons name="account-group" size={56} color="#ddd" />
              <Text variant="bodyLarge" style={styles.emptyText}>暂无联系人</Text>
              <Text variant="bodySmall" style={styles.emptyHint}>
                {filterType !== 'all' ? '当前分类没有匹配的联系人' : '请在桌面端添加联系人信息'}
              </Text>
            </View>
          }
        />
      )}

      {/* 邀请外部伙伴 FAB */}
      <FAB
        icon="account-plus"
        label="邀请伙伴"
        style={styles.fab}
        onPress={handleInvite}
        color="#fff"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f8f8',
  },
  searchBar: {
    padding: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  searchInput: {
    borderRadius: 10,
    elevation: 0,
    backgroundColor: '#f5f5f5',
  },
  filterBar: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  filterScroll: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  filterTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 18,
    marginRight: 8,
    backgroundColor: '#f5f5f5',
  },
  filterTabActive: {
    backgroundColor: '#6366f1',
  },
  filterTabText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#666',
  },
  filterTabTextActive: {
    color: '#fff',
  },
  filterTabCount: {
    fontSize: 11,
    color: '#999',
    marginLeft: 4,
    fontWeight: '500',
  },
  filterTabCountActive: {
    color: 'rgba(255,255,255,0.8)',
  },
  count: {
    textAlign: 'center',
    color: '#999',
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
    marginBottom: 2,
  },
  name: {
    fontWeight: '600',
    marginRight: 8,
  },
  subtitle: {
    color: '#888',
    marginBottom: 4,
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  typeBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    marginLeft: 3,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  detailIcon: {
    marginRight: 3,
  },
  detail: {
    color: '#666',
    fontSize: 12,
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
  callActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  callBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#e0e7ff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoCallBtn: {
    backgroundColor: '#d1fae5',
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    backgroundColor: '#6366f1',
    borderRadius: 30,
  },
});

export default ContactsScreen;
