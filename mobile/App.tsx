import React, { useEffect, useState } from 'react';
import { Platform, LogBox } from 'react-native';
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
import IncomingCallModal from './src/components/IncomingCallModal';
import { initDatabase } from './src/services/DatabaseService';
import { loadToken, getApiClient } from './src/services/AuthService';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();
const SupplyChainStack = createStackNavigator();

// 角色 -> 可见 Tab 映射 (PRD v4.3)
const ROLE_TAB_ACCESS: Record<string, string[]> = {
  boss: ['HomeTab', 'ProductsTab', 'SupplyChainTab', 'ProfileTab'],
  finance: ['HomeTab', 'SupplyChainTab', 'ProfileTab'],
  purchase: ['HomeTab', 'ProductsTab', 'SupplyChainTab', 'ProfileTab'],
  warehouse: ['HomeTab', 'ProductsTab', 'SupplyChainTab', 'ProfileTab'],
  sales: ['HomeTab', 'ProductsTab', 'SupplyChainTab', 'ProfileTab'],
  customer: ['HomeTab', 'ProductsTab', 'SupplyChainTab', 'ProfileTab'],
  supplier: ['HomeTab', 'ProductsTab', 'SupplyChainTab', 'ProfileTab'],
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
function MainTabs({ userRoles }: { userRoles: string[] }) {
  const visibleTabs = getVisibleTabs(userRoles);

  return (
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
            HomeTab: 'view-dashboard',
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
  const [dbReady, setDbReady] = useState(false);
  const [initialRoute, setInitialRoute] = useState<'Connection' | 'Main'>('Connection');
  const [userRoles, setUserRoles] = useState<string[]>([]);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      await initDatabase();
      console.log('Database initialized');
      const token = await loadToken();
      if (token) {
        console.log('Found existing token, loading user info...');
        // 加载保存的角色
        const savedRoles = await loadRoles();
        if (savedRoles.length > 0) {
          setUserRoles(savedRoles);
        }
        // 尝试从服务器刷新最新角色
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
          console.warn('Failed to refresh roles:', e);
        }
        setInitialRoute('Main');
      }
    } catch (error: any) {
      console.warn('Init error:', error?.message);
    } finally {
      setDbReady(true);
    }
  };

  // 登录成功后刷新角色
  const handleLoginSuccess = async () => {
    try {
      const api = await getApiClient();
      const res = await api.get('/api/auth/me');
      const userData = res.data?.data;
      if (userData?.roles) {
        const roles = userData.roles.map((r: any) => r.name);
        setUserRoles(roles);
      }
    } catch (e) {
      console.warn('Failed to reload roles:', e);
    }
  };

  if (!dbReady) return null;

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
                name="Main"
                options={{ headerShown: false }}
              >
                {(props) => (
                  <MainTabs {...props} userRoles={userRoles} />
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
