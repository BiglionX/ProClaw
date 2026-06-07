import React, { useEffect, useState, useCallback } from 'react';
import { Platform, LogBox, View, Text, ActivityIndicator, Image, TouchableOpacity } from 'react-native';
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
import IncomingCallModal from './src/components/IncomingCallModal';

// 新页面
import ContactsTab from './src/screens/ContactsTab';
import MessagesTab from './src/screens/MessagesTab';
import ProfileTab from './src/screens/ProfileTab';
import ChatDetailScreen from './src/screens/ChatDetailScreen';
import IdentityChatScreen from './src/screens/IdentityChatScreen';
import OnboardingWizard from './src/screens/OnboardingWizard';
import SettingsScreen from './src/screens/SettingsScreen';
import AISettingsScreen from './src/screens/AISettingsScreen';
import SupabaseConfigScreen from './src/screens/SupabaseConfigScreen';
import FloatingSecretaryButton from './src/components/FloatingSecretaryButton';

type MainTabParamList = {
  ContactsTab: undefined;
  MessagesTab: undefined;
  ProfileTab: undefined;
};


import { useAppStore } from './src/stores/AppStore';
import { listProfiles, getCurrentProfile, setCurrentProfile } from './src/services/ProfileManager';
import { openDatabase, getDatabase } from './src/services/DatabaseFactory';
import { setupChangeLogTriggers } from './src/services/ChangeLogManager';
import { initSyncMetadata, getOrCreateDeviceId } from './src/services/SyncMetadataManager';
import { getInstalledPlugins, getDynamicRoutes, onRoutesChanged } from './src/services/PluginRegistry';
import { initAIConfig } from './src/config/ai';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

/** 主 Tab 导航：固定 3 个 Tab，右下角浮动小如按钮 */
function MainTabs() {
  return (
    <View style={{ flex: 1 }}>
      <Tab.Navigator
      screenOptions={({ route }) => ({
        headerStyle: { backgroundColor: '#6366f1' },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: 'bold' },
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
            ContactsTab: 'account-multiple',
            MessagesTab: 'chat-processing',
            ProfileTab: 'account-circle',
          };
          return (
            <MaterialCommunityIcons
              name={icons[route.name] || 'circle'}
              size={size}
              color={color}
            />
          );
        },
      })}
    >
      <Tab.Screen
        name="ContactsTab"
        component={ContactsTab}
        options={{ title: '联系人', tabBarLabel: '联系人' }}
      />
      <Tab.Screen
        name="MessagesTab"
        component={MessagesTab}
        options={{ title: '消息', tabBarLabel: '消息' }}
      />
      <Tab.Screen
        name="ProfileTab"
        component={ProfileTab}
        options={({ navigation }) => ({
          title: '我的',
          tabBarLabel: '我的',
          headerRight: () => (
            <TouchableOpacity
              onPress={() => navigation.getParent()?.navigate('Settings')}
              style={{ marginRight: 16 }}
            >
              <MaterialCommunityIcons name="cog" size={24} color="#fff" />
            </TouchableOpacity>
          ),
        })}
      />
    </Tab.Navigator>
      <FloatingSecretaryButton />
    </View>
  );
}

export default function App() {
  const [loading, setLoading] = useState(true);
  const [initialRoute, setInitialRoute] = useState<'Onboarding' | 'ProfileSelect' | 'Connection' | 'Main'>('Onboarding');
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
        // 没有身份，启动引导向导
        setInitialRoute('Onboarding');
        setLoading(false);
        return;
      }

      // 2. 尝试获取上次使用的身份
      const lastProfile = await getCurrentProfile();
      const targetProfile = lastProfile || profiles[0];

      // 3. 有身份直接进主界面（手机端已是独立产品，无需连接桌面端）
      console.log('[App] Loading profile:', targetProfile.id, targetProfile.name);

      // 打开身份数据库并应用 Schema
      try {
        await openDatabase(targetProfile.id);
        await setCurrentProfile(targetProfile.id);

        // 审计 W12：初始加载时也需应用 Schema 迁移（与 switchProfile 保持一致）
        const { applySchema } = await import('./src/services/SchemaManager');
        const db = getDatabase();
        await applySchema(db);

        // 初始化同步元数据
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
      } catch (e) {
        console.warn('[App] DB init error, proceeding anyway:', e);
      }

      setInitialRoute('Main');
    } catch (error: any) {
      console.warn('[App] Init error:', error?.message);
      setInitialRoute('ProfileSelect');
    } finally {
      // 异步初始化 AI 配置（不阻塞主流程）
      initAIConfig().catch((e) => console.warn('[App] AI config init failed:', e));
      setLoading(false);
    }
  };

  // 身份切换
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
              <Image
                source={require('./assets/proclaw-logo.png')}
                style={{ width: 64, height: 64, marginBottom: 16 }}
                resizeMode="contain"
              />
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
                name="Onboarding"
                component={OnboardingWizard}
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="ProfileSelect"
                component={ProfileSelectScreen}
                options={{ title: '选择身份' }}
              />
              <Stack.Screen
                name="Main"
                component={MainTabs}
                options={{ headerShown: false }}
              />
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
              {/* 业务页面路由（从原 Tab 剥离，通过 Stack 导航） */}
              <Stack.Screen
                name="Products"
                component={ProductsScreen}
                options={{ title: '商品' }}
              />
              <Stack.Screen
                name="SupplyChain"
                component={SupplyChainScreen}
                options={{ title: '供应链' }}
              />
              <Stack.Screen
                name="SalesOrder"
                component={SalesOrderScreen}
                options={{ title: '创建销售单' }}
              />
              <Stack.Screen
                name="Contacts"
                component={ContactsScreen}
                options={{ title: '联系人' }}
              />
              <Stack.Screen
                name="CallHistory"
                component={CallHistoryScreen}
                options={{ title: '通话记录' }}
              />
              <Stack.Screen
                name="Agents"
                component={AgentsScreen}
                options={{ title: 'Agent' }}
              />
              <Stack.Screen
                name="Home"
                component={HomeScreen}
                options={{ title: '数据看板' }}
              />
              <Stack.Screen
                name="ChatDetail"
                component={ChatDetailScreen}
                options={({ route }: any) => ({
                  title: route.params?.targetName || '聊天',
                })}
              />
              <Stack.Screen
                name="IdentityManage"
                component={IdentityChatScreen}
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="Settings"
                component={SettingsScreen}
                options={{ title: '设置' }}
              />
              <Stack.Screen
                name="AISettings"
                component={AISettingsScreen}
                options={{ title: 'AI 配置' }}
              />
              <Stack.Screen
                name="SupabaseConfig"
                component={SupabaseConfigScreen}
                options={{ title: '云端同步配置' }}
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
