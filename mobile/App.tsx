import React, { useEffect, useState, useCallback } from 'react';
import { Platform, LogBox, View, Text, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { PaperProvider } from 'react-native-paper';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

// Web 平台屏蔽不兼容的警告
if (Platform.OS === 'web') {
  LogBox.ignoreLogs([
    'Animated: `useNativeDriver`',         // Web 不支持原生动画驱动
    'shadow',                               // shadow* → boxShadow 弃用警告 (来自 react-navigation/stack)
  ]);
}

import { theme } from './src/components/Theme';
import { toastConfig } from './src/components/Toast';
import ConnectionScreen from './src/screens/ConnectionScreen';
import HomeScreen from './src/screens/HomeScreen';
import ProductsScreen from './src/screens/ProductsScreen';
import SupplyChainScreen from './src/screens/SupplyChainScreen';
import SalesOrderScreen from './src/screens/SalesOrderScreen';
import ContactsScreen from './src/screens/ContactsScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import CallScreen from './src/screens/CallScreen';
import CallHistoryScreen from './src/screens/CallHistoryScreen';
import AgentsScreen from './src/screens/AgentsScreen';
import ProfileSelectScreen from './src/screens/ProfileSelectScreen';
import PluginStoreScreen from './src/screens/PluginStoreScreen';
import PluginDetailScreen from './src/screens/PluginDetailScreen';
import PluginScreen from './src/screens/PluginScreen';
import LanSyncScreen from './src/screens/LanSyncScreen';
import DataTransferScreen from './src/screens/DataTransferScreen';
import BackupWalletScreen from './src/components/BackupWalletScreen';
import ProfileSwitcher from './src/components/ProfileSwitcher';
import IncomingCallModal from './src/components/IncomingCallModal';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { loadToken, getApiClient } from './src/services/AuthService';
import { useAppStore, switchProfile } from './src/stores/AppStore';
import { listProfiles, getCurrentProfile, setCurrentProfile } from './src/services/ProfileManager';
import { openDatabase } from './src/services/DatabaseFactory';
import { applySchema } from './src/services/SchemaManager';
import { setupChangeLogTriggers } from './src/services/ChangeLogManager';
import { initSyncMetadata, getOrCreateDeviceId } from './src/services/SyncMetadataManager';
import { getInstalledPlugins, getDynamicRoutes, onRoutesChanged } from './src/services/PluginRegistry';

const ROLES_KEY = '@proclaw_user_roles';

async function loadRoles(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(ROLES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

async function saveRoles(roles: string[]): Promise<void> {
  try {
    await AsyncStorage.setItem(ROLES_KEY, JSON.stringify(roles));
  } catch {
    // ignore storage errors
  }
}

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();
const SupplyChainStack = createStackNavigator();

// 角色 -> 可见 Tab 映射 (PRD v4.3)
const ROLE_TAB_ACCESS: Record<string, string[]> = {
  boss: ['HomeTab', 'AgentsTab', 'ProductsTab', 'SupplyChainTab', 'ProfileTab'],
  finance: ['HomeTab', 'AgentsTab', 'SupplyChainTab', 'ProfileTab'],
  purchase: ['HomeTab', 'AgentsTab', 'ProductsTab', 'SupplyChainTab', 'ProfileTab'],
  warehouse: ['HomeTab', 'AgentsTab', 'ProductsTab', 'SupplyChainTab', 'ProfileTab'],
  sales: ['HomeTab', 'AgentsTab', 'ProductsTab', 'SupplyChainTab', 'ProfileTab'],
  customer: ['HomeTab', 'AgentsTab', 'ProductsTab', 'SupplyChainTab', 'ProfileTab'],
  supplier: ['HomeTab', 'AgentsTab', 'ProductsTab', 'SupplyChainTab', 'ProfileTab'],
};

/** 根据用户角色计算可见 Tab 列表 */
function getVisibleTabs(roles: string[]): string[] {
  if (roles.includes('boss')) {
    return ROLE_TAB_ACCESS['boss'];
  }
  // 多个角色取并集
  const visible = new Set<string>();
  for (const role of roles) {
    const tabs = ROLE_TAB_ACCESS[role] || [];
    for (const t of tabs) visible.add(t);
  }
  return visible.size > 0 ? Array.from(visible) : ['HomeTab', 'ProfileTab'];
}

/** 供应链 Tab 内部 Stack：首页 + 客户 + 销售单 */
function SupplyChainNavigator() {
  return (
    <SupplyChainStack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: '#6366f1' },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: 'bold' },
      }}
    >
      <SupplyChainStack.Screen
        name="SupplyChainHome"
        component={SupplyChainScreen}
        options={{ title: '供应链' }}
      />
      <SupplyChainStack.Screen
        name="Contacts"
        component={ContactsScreen}
        options={{ title: '联系人' }}
      />
      <SupplyChainStack.Screen
        name="SalesOrder"
        component={SalesOrderScreen}
        options={{ title: '创建销售单' }}
      />
      <SupplyChainStack.Screen
        name="CallHistory"
        component={CallHistoryScreen}
        options={{ title: '通话记录' }}
      />
    </SupplyChainStack.Navigator>
  );
}

/** 主 Tab 导航 (动态渲染) */
function MainTabs({ userRoles, onProfileSwitch }: { userRoles: string[]; onProfileSwitch: () => void }) {
  const visibleTabs = getVisibleTabs(userRoles);

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerStyle: { backgroundColor: '#6366f1' },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: 'bold' },
        headerRight: () => (
          <ProfileSwitcher onPress={onProfileSwitch} />
        ),
        tabBarActiveTintColor: '#6366f1',
        tabBarInactiveTintColor: '#999',
        tabBarStyle: {
          backgroundColor: '#fff',
          borderTopColor: '#eee',
          height: 60,
          paddingBottom: 8,
          paddingTop: 4,
        },
        tabBarLabelStyle: { fontSize: 12, fontWeight: '500' },
        tabBarIcon: ({ color, size }) => {
          const icons: Record<string, string> = {
            HomeTab: 'view-dashboard',
            AgentsTab: 'puzzle',
            ProductsTab: 'package-variant-closed',
            SupplyChainTab: 'truck-delivery',
            ProfileTab: 'account',
          };
          return (
            <MaterialCommunityIcons
              name={icons[route.name] || 'circle'}
              size={size}
              color={color}
            />
          );
        },
        // 动态隐藏 Tab
        tabBarItemStyle: visibleTabs.includes(route.name) ? undefined : { display: 'none' },
      })}
    >
      <Tab.Screen
        name="HomeTab"
        component={HomeScreen}
        options={{ title: '首页', tabBarLabel: '首页' }}
      />
      <Tab.Screen
        name="AgentsTab"
        component={AgentsScreen}
        options={{ title: 'Agent', tabBarLabel: 'Agent' }}
      />
      <Tab.Screen
        name="ProductsTab"
        component={ProductsScreen}
        options={{ title: '商品', tabBarLabel: '商品' }}
      />
      <Tab.Screen
        name="SupplyChainTab"
        component={SupplyChainNavigator}
        options={{ headerShown: false, title: '供应链', tabBarLabel: '供应链' }}
      />
      <Tab.Screen
        name="ProfileTab"
        component={ProfileScreen}
        options={{ title: '我的', tabBarLabel: '我的' }}
      />
    </Tab.Navigator>
  );
}

export default function App() {
  const [loading, setLoading] = useState(true);
  const [initialRoute, setInitialRoute] = useState<'ProfileSelect' | 'Connection' | 'Main'>('ProfileSelect');
  const [userRoles, setUserRoles] = useState<string[]>([]);
  const [showProfileSelect, setShowProfileSelect] = useState(false);
  const [dynamicRoutes, setDynamicRoutes] = useState(getDynamicRoutes());

  // 监听插件动态路由变化（安装/卸载时刷新）
  useEffect(() => {
    const unsubscribe = onRoutesChanged((routes) => {
      setDynamicRoutes([...routes]);
    });
    return unsubscribe;
  }, []);

  // 初始化：加载身份和认证状态
  useEffect(() => {
    initializeApp();
  }, []);

  const initializeApp = async () => {
    try {
      // 1. 加载身份列表
      const profiles = await listProfiles();
      useAppStore.getState().setProfiles(profiles);

      if (profiles.length === 0) {
        // 没有身份，直接显示身份选择页
        setInitialRoute('ProfileSelect');
        setLoading(false);
        return;
      }

      // 2. 尝试获取上次使用的身份
      const lastProfile = await getCurrentProfile();
      const targetProfile = lastProfile || profiles[0];

      // 3. 检查认证状态
      const token = await loadToken();
      if (token) {
        console.log('[App] Found existing token, loading profile...');
        const savedRoles = await loadRoles();
        if (savedRoles.length > 0) {
          setUserRoles(savedRoles);
        }

        // 尝试从服务器刷新角色（非阻塞）
        try {
          const api = await getApiClient();
          const res = await api.get('/api/auth/me');
          const userData = res.data?.data;
          if (userData?.roles) {
            const roles = userData.roles.map((r: any) => r.name);
            setUserRoles(roles);
            await saveRoles(roles);
          }
        } catch (e) {
          console.warn('[App] Failed to refresh roles:', e);
        }

        // 打开身份数据库并应用 Schema
        await openDatabase(targetProfile.id);
        await setCurrentProfile(targetProfile.id);

        // 初始化同步元数据
        const db = (await import('./src/services/DatabaseFactory')).getDatabase();
        const deviceId = await getOrCreateDeviceId();
        await initSyncMetadata(db, deviceId);

        // 安装变更日志触发器
        try {
          await setupChangeLogTriggers(db);
          console.log('[App] ChangeLog triggers initialized');
        } catch (e) {
          console.warn('[App] Failed to setup change log triggers:', e);
        }

        // 加载已安装插件
        try {
          const installedPlugins = await getInstalledPlugins(db);
          const dynamicRoutes = getDynamicRoutes();
          console.log('[App] Loaded', installedPlugins.length, 'installed plugins,', dynamicRoutes.length, 'dynamic routes');
        } catch (e) {
          console.warn('[App] Failed to load plugins:', e);
        }

        setInitialRoute('Main');
      } else {
        // 无 token，但已有身份 -> 显示连接页
        setInitialRoute('Connection');
      }
    } catch (error: any) {
      console.warn('[App] Init error:', error?.message);
      setInitialRoute('ProfileSelect');
    } finally {
      setLoading(false);
    }
  };

  // 登录成功后回调
  const handleLoginSuccess = async () => {
    try {
      const api = await getApiClient();
      const res = await api.get('/api/auth/me');
      const userData = res.data?.data;
      if (userData?.roles) {
        const roles = userData.roles.map((r: any) => r.name);
        setUserRoles(roles);
      }

      // 登录成功后，加载默认身份
      const profile = await getCurrentProfile();
      if (profile) {
        await openDatabase(profile.id);
        await setCurrentProfile(profile.id);

        // 初始化同步元数据和触发器
        const db = (await import('./src/services/DatabaseFactory')).getDatabase();
        const deviceId = await getOrCreateDeviceId();
        await initSyncMetadata(db, deviceId);

        try {
          await setupChangeLogTriggers(db);
        } catch (e) {
          console.warn('[App] Failed to setup change log triggers:', e);
        }
      }
      setInitialRoute('Main');
    } catch (e) {
      console.warn('[App] Failed to reload roles:', e);
    }
  };

  // 身份切换按钮点击
  const handleProfileSwitchPress = useCallback(() => {
    setShowProfileSelect(true);
  }, []);

  // Loading 视图
  if (loading) {
    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <PaperProvider theme={theme}>
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8f9ff' }}>
              <Text style={{ fontSize: 28, marginBottom: 16 }}>🦁</Text>
              <Text style={{ fontSize: 20, fontWeight: '600', color: '#6366f1' }}>ProClaw</Text>
              <ActivityIndicator size="small" color="#6366f1" style={{ marginTop: 16 }} />
            </View>
          </PaperProvider>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    );
  }

  // 身份选择模态
  if (showProfileSelect) {
    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <PaperProvider theme={theme}>
            <ProfileSelectScreen />
          </PaperProvider>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <PaperProvider theme={theme}>
          <NavigationContainer>
            <Stack.Navigator
              initialRouteName={initialRoute}
              screenOptions={{ headerShown: false }}
            >
              <Stack.Screen name="Connection" component={ConnectionScreen} />
              <Stack.Screen
                name="ProfileSelect"
                component={ProfileSelectScreen}
                options={{ title: '选择身份' }}
              />
              <Stack.Screen
                name="Main"
                options={{ headerShown: false }}
              >
                {(props) => (
                  <MainTabs {...props} userRoles={userRoles} onProfileSwitch={() => {}} />
                )}
              </Stack.Screen>
              <Stack.Screen
                name="Call"
                component={CallScreen}
                options={{
                  headerShown: false,
                  presentation: 'modal',
                  animationTypeForReplace: 'pop',
                }}
              />
              <Stack.Screen
                name="BackupWallet"
                component={BackupWalletScreen}
                options={{ title: '云备份' }}
              />
              <Stack.Screen
                name="PluginStore"
                component={PluginStoreScreen}
                options={{ title: '插件商店' }}
              />
              <Stack.Screen
                name="PluginDetail"
                component={PluginDetailScreen}
                options={{ title: '插件详情' }}
              />
              <Stack.Screen
                name="LanSync"
                component={LanSyncScreen}
                options={{ title: '局域网同步' }}
              />
              <Stack.Screen
                name="DataTransfer"
                component={DataTransferScreen}
                options={{ title: '跨身份数据传输' }}
              />
              {/* 插件动态路由 - 通用渲染页面 */}
              <Stack.Screen
                name="PluginPage"
                component={PluginScreen}
                options={({ route }: any) => ({
                  title: route.params?.pluginTitle || '插件',
                })}
              />
            </Stack.Navigator>
          </NavigationContainer>
          <IncomingCallModal />
          <Toast config={toastConfig} />
          <StatusBar style="auto" />
        </PaperProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
