/**
 * ContactsTab - 联系人 Tab
 * 三栏式通讯录：
 *   1. 个人联系人（同事/客户/供应商/朋友）
 *   2. AI Agent（小如/CEO/客服）
 *   3. AI Team（从插件数据动态生成）
 */
import React, { useEffect, useState, useCallback, useMemo, useLayoutEffect } from 'react';
import {
  View,
  StyleSheet,
  SectionList,
  RefreshControl,
  TouchableOpacity,
  Alert,
  Image,
} from 'react-native';
import {
  Text,
  Card,
  Avatar,
  useTheme,
  ActivityIndicator,
} from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';
import SearchHeaderTitle from '../components/SearchHeaderTitle';
import { getCustomers, Customer, ContactType, CONTACT_TYPE_LABELS } from '../services/ApiService';
import { isDemoMode } from '../services/AuthService';
import { showToast } from '../components/Toast';
import { agentRuntimeBridge, type AgentInfo } from '../services/AgentRuntimeBridge';
import { getDynamicRoutes } from '../services/PluginRegistry';
import { useCallStore } from '../stores/CallStore';
import { createOrGetSession } from '../services/ChatService';

// ============ 类型定义 ============

/** 分区条目联合类型 */
type ContactEntry =
  | { type: 'personal'; data: Customer }
  | { type: 'agent'; data: AgentInfo }
  | { type: 'team'; data: { id: string; name: string; description?: string } };

/** SectionList 分区数据结构 */
interface ContactSection {
  title: string;
  icon: string;
  data: ContactEntry[];
  collapsible?: boolean;
}

// ============ 常量 ============

const PERSONAL_TYPE_CONFIG: Record<ContactType, { icon: string; color: string; bg: string }> = {
  colleague: { icon: 'account-tie',       color: '#6366f1', bg: '#e0e7ff' },
  customer:  { icon: 'account-star',       color: '#10b981', bg: '#d1fae5' },
  supplier:  { icon: 'truck-delivery',     color: '#f59e0b', bg: '#fef3c7' },
};

/** 内置 AI Agent 兜底数据 */
const BUILTIN_AGENTS: AgentInfo[] = [
  {
    id: 'secretary',
    name: '小如',
    version: '1.0.0',
    manifest: { id: 'secretary', name: '小如', version: '1.0.0', entry: '', permissions: [], icon: 'robot-happy', description: '个人工作秘书' },
    enabled: true,
    is_builtin: true,
    installed_at: Date.now(),
    last_updated: null,
    permissions_granted: [],
  },
  {
    id: 'ceo',
    name: 'CEO Agent',
    version: '1.0.0',
    manifest: { id: 'ceo', name: 'CEO Agent', version: '1.0.0', entry: '', permissions: [], icon: 'account-tie-hat', description: '经营决策分析' },
    enabled: true,
    is_builtin: true,
    installed_at: Date.now(),
    last_updated: null,
    permissions_granted: [],
  },
  {
    id: 'customer-service',
    name: 'AI 客服',
    version: '1.0.0',
    manifest: { id: 'customer-service', name: 'AI 客服', version: '1.0.0', entry: '', permissions: [], icon: 'headset', description: '客户服务响应' },
    enabled: false,
    is_builtin: true,
    installed_at: Date.now(),
    last_updated: null,
    permissions_granted: [],
  },
];

const DEMO_CONTACTS: Customer[] = [
  { id: 'c1', name: '陈志远', phone: '138****1001', email: 'chenzy@proclaw.com', contact_type: 'colleague', department: '技术部', position: '高级工程师' },
  { id: 'c2', name: '刘芳',   phone: '138****1002', email: 'liufang@proclaw.com', contact_type: 'colleague', department: '销售部', position: '销售经理' },
  { id: 'c3', name: '赵明辉', phone: '138****1003', email: 'zhaomh@proclaw.com', contact_type: 'colleague', department: '财务部', position: '财务主管' },
  { id: 'k1', name: '张伟',   phone: '139****2111', email: 'zhangwei@example.com',  contact_type: 'customer', company: '恒达商贸有限公司', position: '采购经理' },
  { id: 'k2', name: '李娜',   phone: '139****2222', email: 'lina@example.com',      contact_type: 'customer', company: '星辰科技股份',     position: '总经理' },
  { id: 'k3', name: '王磊',   phone: '139****2333', email: 'wanglei@example.com',   contact_type: 'customer', company: '金茂实业集团',     position: '运营总监' },
  { id: 'k4', name: '孙晓梅', phone: '139****2444', email: 'sunxm@example.com',     contact_type: 'customer', company: '绿源环保科技',     position: '采购主管' },
  { id: 's1', name: '周建国', phone: '137****3111', email: 'zhoujg@supply.com',     contact_type: 'supplier', company: '鼎丰电子材料有限公司', position: '销售总监' },
  { id: 's2', name: '吴丽华', phone: '137****3222', email: 'wulh@supply.com',       contact_type: 'supplier', company: '华远工业原料供应', position: '大客户经理' },
  { id: 's3', name: '郑海龙', phone: '137****3333', email: 'zhenghl@supply.com',    contact_type: 'supplier', company: '鑫达包装制品厂',     position: '法人代表' },
];

// ============ 组件 ============

export default function ContactsTab() {
  const navigation = useNavigation<any>();
  const { colors } = useTheme();
  const [personalContacts, setPersonalContacts] = useState<Customer[]>([]);
  const [agents, setAgents] = useState<AgentInfo[]>(BUILTIN_AGENTS);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  // 加载个人联系人
  const loadPersonalContacts = useCallback(async () => {
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
        setPersonalContacts(filtered);
      } else {
        const data = await getCustomers({ search: searchQuery || undefined });
        setPersonalContacts(data);
      }
    } catch (err: any) {
      showToast('error', '加载失败', err.message);
    }
  }, [searchQuery]);

  // 加载 Agent 和 AI Team 数据
  const loadAgents = useCallback(async () => {
    try {
      await agentRuntimeBridge.initialize();
      const installed = agentRuntimeBridge.getInstalledAgents();
      // 合并内置 Agent 与运行时 Agent（运行时优先）
      const merged = new Map<string, AgentInfo>();
      for (const a of BUILTIN_AGENTS) merged.set(a.id, a);
      for (const a of installed) merged.set(a.id, a);
      setAgents(Array.from(merged.values()));
    } catch {
      // 兜底使用内置 Agent
      setAgents(BUILTIN_AGENTS);
    }
  }, []);

  const loadAll = useCallback(async () => {
    setLoading(true);
    await Promise.all([loadPersonalContacts(), loadAgents()]);
    setLoading(false);
  }, [loadPersonalContacts, loadAgents]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  // 搜索框展开后 3 秒无输入自动收回
  useEffect(() => {
    if (!isSearching || searchQuery.trim().length > 0) return;
    const timer = setTimeout(() => {
      setIsSearching(false);
      setSearchQuery('');
    }, 3000);
    return () => clearTimeout(timer);
  }, [isSearching, searchQuery]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAll();
    setRefreshing(false);
  };

  const onSearch = () => {
    loadAll();
  };

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
          title="联系人"
          placeholder="搜索联系人、Agent、团队..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          onSubmitEditing={onSearch}
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
  }, [navigation, isSearching, searchQuery, onSearch, toggleSearch]);

  // AI Team 数据：从动态路由中识别 AI 团队
  const aiTeams = useMemo(() => {
    const routes = getDynamicRoutes();
    return routes
      .filter((r) => r.title.includes('AI') || r.title.includes('Team') || r.title.includes('团队'))
      .map((r) => ({
        id: r.pluginId,
        name: r.title,
        description: `${r.path} 路由`,
      }));
  }, []);

  // 搜索过滤
  const filteredAgents = useMemo(() => {
    if (!searchQuery) return agents;
    const q = searchQuery.toLowerCase();
    return agents.filter((a) => a.name.toLowerCase().includes(q));
  }, [agents, searchQuery]);

  const filteredTeams = useMemo(() => {
    if (!searchQuery) return aiTeams;
    const q = searchQuery.toLowerCase();
    return aiTeams.filter((t) => t.name.toLowerCase().includes(q));
  }, [aiTeams, searchQuery]);

  // 构建 SectionList 数据
  const sections: ContactSection[] = useMemo(() => {
    const result: ContactSection[] = [];

    // Section 1: 个人联系人
    const personalEntries: ContactEntry[] = personalContacts.map((c) => ({
      type: 'personal' as const,
      data: c,
    }));
    if (personalEntries.length > 0 || searchQuery) {
      result.push({
        title: '个人联系人',
        icon: 'account-group',
        data: personalEntries,
      });
    }

    // Section 2: AI Agent
    const agentEntries: ContactEntry[] = filteredAgents.map((a) => ({
      type: 'agent' as const,
      data: a,
    }));
    if (agentEntries.length > 0 || searchQuery) {
      result.push({
        title: 'AI Agent',
        icon: 'robot',
        data: agentEntries,
      });
    }

    // Section 3: AI Team
    const teamEntries: ContactEntry[] = filteredTeams.map((t) => ({
      type: 'team' as const,
      data: t,
    }));
    result.push({
      title: 'AI Team',
      icon: 'brain',
      data: teamEntries,
    });

    return result;
  }, [personalContacts, filteredAgents, filteredTeams, searchQuery]);

  // ============ 事件处理 ============

  /** 点击个人联系人 → 创建/获取会话后导航到 ChatDetail */
  const handlePersonalPress = async (item: Customer) => {
    try {
      const session = await createOrGetSession(
        item.id,
        item.name,
        'personal',
        '',
      );
      navigation.navigate('ChatDetail', {
        sessionId: session.id,
        targetId: item.id,
        targetName: item.name,
        targetType: 'personal',
        targetIcon: '',
      });
    } catch (e: any) {
      console.warn('[ContactsTab] handlePersonalPress failed:', e?.message);
      Alert.alert('错误', '无法打开会话，请稍后重试');
    }
  };

  /** 发起通话 */
  const handleCall = (item: Customer, callType: 'audio' | 'video') => {
    const store = useCallStore.getState();
    if (store.status !== 'idle') {
      Alert.alert('提示', '当前已在通话中');
      return;
    }
    const sessionId = `call_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    store.startOutgoingCall({
      sessionId,
      remoteUserId: item.id,
      remoteUserName: item.name,
      callType,
    });
    navigation.navigate('Call');
  };

  /** 点击 AI Agent -> 跳转消息会话 */
  const handleAgentPress = (agent: AgentInfo) => {
    navigation.navigate('ChatDetail', {
      targetId: agent.id,
      targetName: agent.name,
      targetType: 'agent',
      targetIcon: agent.manifest.icon || 'robot',
    });
  };

  /** 点击 AI Team */
  const handleTeamPress = (team: { id: string; name: string }) => {
    navigation.navigate('ChatDetail', {
      targetId: team.id,
      targetName: team.name,
      targetType: 'team',
      targetIcon: 'account-group',
    });
  };

  // ============ 渲染函数 ============

  const renderSectionHeader = ({ section }: { section: ContactSection }) => (
    <View style={styles.sectionHeader}>
      <MaterialCommunityIcons name={section.icon} size={18} color="#6366f1" />
      <Text style={styles.sectionTitle}>{section.title}</Text>
      <Text style={styles.sectionCount}>{section.data.length}</Text>
    </View>
  );

  const renderPersonalItem = (item: Customer) => {
    const typeCfg = item.contact_type ? PERSONAL_TYPE_CONFIG[item.contact_type] : null;
    const avatarColor = typeCfg?.color || colors.primary;
    const subtitle = item.company || item.department
      ? (item.company || item.department) + (item.position ? ` · ${item.position}` : '')
      : item.position || '';

    return (
      <Card style={styles.card} onPress={() => handlePersonalPress(item)}>
        <Card.Content style={styles.cardContent}>
          <Avatar.Text size={44} label={item.name.charAt(0)} style={{ backgroundColor: avatarColor }} />
          <View style={styles.info}>
            <View style={styles.nameRow}>
              <Text variant="titleSmall" style={styles.name}>{item.name}</Text>
              {item.contact_type && typeCfg && (
                <View style={[styles.badge, { backgroundColor: typeCfg.bg }]}>
                  <MaterialCommunityIcons name={typeCfg.icon} size={11} color={typeCfg.color} />
                  <Text style={[styles.badgeText, { color: typeCfg.color }]}>
                    {CONTACT_TYPE_LABELS[item.contact_type]}
                  </Text>
                </View>
              )}
            </View>
            {subtitle ? (
              <Text variant="bodySmall" style={styles.subtitle} numberOfLines={1}>{subtitle}</Text>
            ) : null}
          </View>
          <View style={styles.callActions}>
            <TouchableOpacity
              style={[styles.callBtn, { backgroundColor: '#e0e7ff' }]}
              onPress={(e) => { e.stopPropagation?.(); handleCall(item, 'audio'); }}
            >
              <MaterialCommunityIcons name="phone" size={16} color="#6366f1" />
            </TouchableOpacity>
            <MaterialCommunityIcons name="chevron-right" size={20} color="#e0e0e0" />
          </View>
        </Card.Content>
      </Card>
    );
  };

  const renderAgentItem = (agent: AgentInfo) => {
    const isOnline = agent.enabled;
    const isSecretary = agent.id === 'secretary';
    return (
      <Card style={styles.card} onPress={() => handleAgentPress(agent)}>
        <Card.Content style={styles.cardContent}>
          <View style={styles.agentAvatar}>
            {isSecretary ? (
              <Image
                source={require('../../assets/avatars/secretary/default.png')}
                style={styles.agentAvatarImage}
                resizeMode="contain"
              />
            ) : (
              <Avatar.Text
                size={44}
                label={agent.name.charAt(0)}
                style={{ backgroundColor: isOnline ? '#6366f1' : '#ccc' }}
              />
            )}
            <View style={[styles.statusDot, { backgroundColor: isOnline ? '#10b981' : '#999' }]} />
          </View>
          <View style={styles.info}>
            <Text variant="titleSmall" style={styles.name}>{agent.name}</Text>
            <Text variant="bodySmall" style={styles.subtitle} numberOfLines={1}>
              {agent.manifest.description || (isOnline ? '在线' : '离线')}
            </Text>
          </View>
          <MaterialCommunityIcons name="chevron-right" size={20} color="#e0e0e0" />
        </Card.Content>
      </Card>
    );
  };

  const renderTeamItem = (team: { id: string; name: string; description?: string }) => (
    <Card style={styles.card} onPress={() => handleTeamPress(team)}>
      <Card.Content style={styles.cardContent}>
        <Avatar.Text
          size={44}
          label={team.name.charAt(0)}
          style={{ backgroundColor: '#8b5cf6' }}
        />
        <View style={styles.info}>
          <Text variant="titleSmall" style={styles.name}>{team.name}</Text>
          {team.description ? (
            <Text variant="bodySmall" style={styles.subtitle} numberOfLines={1}>
              {team.description}
            </Text>
          ) : null}
        </View>
        <MaterialCommunityIcons name="chevron-right" size={20} color="#e0e0e0" />
      </Card.Content>
    </Card>
  );

  const renderItem = ({ item }: { item: ContactEntry }) => {
    switch (item.type) {
      case 'personal':
        return renderPersonalItem(item.data);
      case 'agent':
        return renderAgentItem(item.data);
      case 'team':
        return renderTeamItem(item.data);
    }
  };

  const ListFooter = () => (
    <TouchableOpacity
      style={styles.marketLink}
      onPress={() => navigation.navigate('PluginStore')}
    >
      <MaterialCommunityIcons name="store-plus" size={18} color="#6366f1" />
      <Text style={styles.marketLinkText}>从市场安装更多 AI 团队</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* 列表 */}
      {loading ? (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <SectionList
          sections={sections}
          renderItem={renderItem}
          renderSectionHeader={renderSectionHeader}
          keyExtractor={(item) =>
            item.type === 'personal'
              ? `p_${item.data.id}`
              : item.type === 'agent'
              ? `a_${item.data.id}`
              : `t_${item.data.id}`
          }
          contentContainerStyle={styles.list}
          stickySectionHeadersEnabled={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
          }
          ListFooterComponent={ListFooter}
          ListEmptyComponent={
            <View style={styles.empty}>
              <MaterialCommunityIcons name="account-search" size={56} color="#ddd" />
              <Text variant="bodyLarge" style={styles.emptyText}>
                {searchQuery ? '没有匹配的结果' : '暂无联系人'}
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

// ============ 样式 ============

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f8f8',
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  list: {
    padding: 12,
    paddingBottom: 80,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 4,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#333',
    marginLeft: 8,
    flex: 1,
  },
  sectionCount: {
    fontSize: 12,
    color: '#999',
    fontWeight: '500',
  },
  card: {
    marginBottom: 6,
    borderRadius: 12,
    backgroundColor: '#fff',
    elevation: 1,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
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
  },
  subtitle: {
    color: '#888',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '600',
    marginLeft: 3,
  },
  agentAvatar: {
    position: 'relative',
  },
  agentAvatarImage: {
    width: 44,
    height: 44,
  },
  statusDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#fff',
  },
  callActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  callBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
  },
  marketLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    marginTop: 8,
  },
  marketLinkText: {
    fontSize: 13,
    color: '#6366f1',
    fontWeight: '500',
    marginLeft: 6,
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
});
