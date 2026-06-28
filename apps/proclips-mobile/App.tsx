/**
 * ProClips · 拍可丽 - App 入口
 *
 * 独立 App，深色主题，3 Tab 导航（创作/视频库/我的）+ Stack 子页面。
 * V1 自用版：无收费逻辑，数据为 mock，Agent/API 后补。
 */
import React, { useEffect, useState } from 'react';
import { Platform, LogBox, View, Text, ActivityIndicator, Image } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { PaperProvider } from 'react-native-paper';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

import { logger } from './src/utils/logger';
import { ErrorBoundary } from './src/components/ErrorBoundary';
import { theme, colors, roleThemes } from './src/components/Theme';
import { toastConfig } from './src/components/Toast';
import FloatingSecretaryButton from './src/components/FloatingSecretaryButton';
import RoleTransformOverlay from './src/components/RoleTransformOverlay';
import type { RootStackParamList } from './src/types/navigation';
import { useProClipsStore } from './src/stores/ProClipsStore';

// Tab 屏幕（商家侧）
import CreateHomeScreen from './src/screens/CreateHomeScreen';
import VideosScreen from './src/screens/VideosScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import ProClipsChatScreen from './src/screens/ProClipsChatScreen';

// Tab 屏幕（达人侧）
import BrowseScreen from './src/screens/BrowseScreen';
import EarningsScreen from './src/screens/EarningsScreen';
import CreatorProfileScreen from './src/screens/CreatorProfileScreen';

// 创作流程屏幕（已有，Phase 2 重写）
import ProClipsTemplateListScreen from './src/screens/ProClipsTemplateListScreen';
import ProClipsTemplateDetailScreen from './src/screens/ProClipsTemplateDetailScreen';
import ProClipsWorkflowScreen from './src/screens/ProClipsWorkflowScreen';
import ProClipsSceneUploadScreen from './src/screens/ProClipsSceneUploadScreen';
import ProClipsProductInfoScreen from './src/screens/ProClipsProductInfoScreen';
import ProClipsScriptReviewScreen from './src/screens/ProClipsScriptReviewScreen';
import ProClipsVoiceSampleScreen from './src/screens/ProClipsVoiceSampleScreen';
import ProClipsMixStatusScreen from './src/screens/ProClipsMixStatusScreen';

// 达人侧 Stack 子页面（Phase 3 新增）
import ProClipsMaterialDetailScreen from './src/screens/ProClipsMaterialDetailScreen';
import ProClipsPublishDouyinScreen from './src/screens/ProClipsPublishDouyinScreen';
import ProClipsStatsTrackingScreen from './src/screens/ProClipsStatsTrackingScreen';

// AI 功能屏幕（Phase 4 新增）
import ProClipsAICreatorScreen from './src/screens/ProClipsAICreatorScreen';
import ProClipsAIVideoScreen from './src/screens/ProClipsAIVideoScreen';
import ProClipsIPCoachScreen from './src/screens/ProClipsIPCoachScreen';

// 小如秘书（Phase 5 新增）
import ProClipsXiaoruMemoryScreen from './src/screens/ProClipsXiaoruMemoryScreen';

// 第三方平台（Phase 6 新增）
import ProClipsPlatformsScreen from './src/screens/ProClipsPlatformsScreen';
import ProClipsPlatformOAuthScreen from './src/screens/ProClipsPlatformOAuthScreen';
import ProClipsPublishStatusScreen from './src/screens/ProClipsPublishStatusScreen';
import ProClipsIncentiveSettingsScreen from './src/screens/ProClipsIncentiveSettingsScreen';

// 消息通知（Phase 7 新增）
import ProClipsNotificationsScreen from './src/screens/ProClipsNotificationsScreen';

// 新增屏幕（Phase 0 占位，后续 Phase 补全）
import XiaoruChatScreen from './src/screens/XiaoruChatScreen';

// 基础设施
import { listProfiles, getCurrentProfile, setCurrentProfile, createProfile } from './src/services/ProfileManager';
import { openDatabase, getDatabase } from './src/services/DatabaseFactory';
import { applySchema } from './src/services/SchemaManager';
import { setupChangeLogTriggers } from './src/services/ChangeLogManager';
import { initSyncMetadata, getOrCreateDeviceId } from './src/services/SyncMetadataManager';

// Web 平台屏蔽不兼容警告
if (Platform.OS === 'web') {
  LogBox.ignoreLogs([
    'Animated: `useNativeDriver`',
    'shadow',
  ]);
}

const Stack = createStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator();

/**
 * 主 Tab 导航 - 根据角色动态切换 Tab 集
 *
 * 商家：创作 / 视频库 / 我的
 * 达人：素材库 / 收益 / 我的
 *
 * 角色切换时通过 key 重新挂载 Tab.Navigator，确保 Tab 集完全切换。
 * 变身动画期间（transforming=true），overlay 遮挡重挂载过程。
 */
function MainTabs() {
  const role = useProClipsStore((s) => s.role);
  const roleTheme = roleThemes[role];

  // 商家/达人各自的 Tab 图标映射
  const merchantIcons: Record<string, string> = {
    CreateHome: 'movie-edit',
    Videos: 'video',
    Profile: 'account-circle',
  };
  const creatorIcons: Record<string, string> = {
    Browse: 'shopping-search',
    Earnings: 'currency-cny',
    CreatorProfile: 'account-circle',
  };
  const icons = role === 'merchant' ? merchantIcons : creatorIcons;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bgDeep }}>
      <Tab.Navigator
        key={role} // 角色变化时重新挂载，切换 Tab 集
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarActiveTintColor: roleTheme.c2,
          tabBarInactiveTintColor: colors.txt3,
          tabBarStyle: {
            backgroundColor: 'rgba(15,15,30,0.94)',
            borderTopColor: colors.line,
            borderTopWidth: 1,
            height: 78,
            paddingBottom: 8,
            paddingTop: 6,
          },
          tabBarLabelStyle: { fontSize: 11, fontWeight: '500' },
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons
              name={icons[route.name] || 'circle'}
              size={size}
              color={color}
            />
          ),
        })}
      >
        {role === 'merchant' ? (
          <>
            <Tab.Screen name="CreateHome" component={CreateHomeScreen} options={{ tabBarLabel: '创作' }} />
            <Tab.Screen name="Videos" component={VideosScreen} options={{ tabBarLabel: '视频库' }} />
            <Tab.Screen name="Profile" component={ProfileScreen} options={{ tabBarLabel: '我的' }} />
          </>
        ) : (
          <>
            <Tab.Screen name="Browse" component={BrowseScreen} options={{ tabBarLabel: '素材库' }} />
            <Tab.Screen name="Earnings" component={EarningsScreen} options={{ tabBarLabel: '收益' }} />
            <Tab.Screen name="CreatorProfile" component={CreatorProfileScreen} options={{ tabBarLabel: '我的' }} />
          </>
        )}
      </Tab.Navigator>
      <FloatingSecretaryButton />
    </View>
  );
}

export default function App() {
  const [loading, setLoading] = useState(true);
  const [ready, setReady] = useState(false);

  // 初始化系统 UI 背景色（深色）
  useEffect(() => {
    SystemUI.setBackgroundColorAsync(colors.bgDeep).catch((e) => {
      logger.warn('[App] SystemUI.setBackgroundColorAsync failed:', e);
    });
  }, []);

  useEffect(() => {
    initializeApp();
  }, []);

  const initializeApp = async () => {
    try {
      // 1. 加载身份列表
      let profiles = await listProfiles();

      // 2. 没有身份则创建默认身份（V1 自用版：跳过引导向导，直接进主界面）
      if (profiles.length === 0) {
        logger.log('[App] No profile found, creating default ProClips profile');
        await createProfile('老王', '🍲');
        profiles = await listProfiles();
      }

      const lastProfile = await getCurrentProfile();
      const targetProfile = lastProfile || profiles[0];
      logger.log('[App] Loading profile:', targetProfile.id, targetProfile.name);

      // 3. 打开身份数据库并应用 Schema
      try {
        await openDatabase(targetProfile.id);
        const db = getDatabase();
        await applySchema(db);
        await setCurrentProfile(targetProfile.id);

        // 初始化同步元数据
        const deviceId = await getOrCreateDeviceId();
        await initSyncMetadata(db, deviceId);

        // 安装变更日志触发器（非关键，失败不阻塞）
        try {
          await setupChangeLogTriggers(db);
          logger.log('[App] ChangeLog triggers initialized');
        } catch (e) {
          logger.warn('[App] Failed to setup change log triggers:', e);
        }
      } catch (e) {
        logger.warn('[App] DB init error, proceeding anyway:', e);
      }

      setReady(true);
    } catch (error: any) {
      logger.warn('[App] Init error:', error?.message);
      // 初始化失败也进入主界面（mock 数据可用）
      setReady(true);
    } finally {
      setLoading(false);
    }
  };

  // Loading 视图
  if (loading) {
    return (
      <ErrorBoundary>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <SafeAreaProvider>
            <PaperProvider theme={theme}>
              <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.bgDeep }}>
                <Image
                  source={require('./assets/proclips-logo.png')}
                  style={{ width: 72, height: 72, marginBottom: 18 }}
                  resizeMode="contain"
                />
                <Text style={{ fontSize: 22, fontWeight: '800', color: colors.cyan, marginBottom: 4 }}>
                  ProClips
                </Text>
                <Text style={{ fontSize: 13, color: colors.txt2, marginBottom: 18 }}>拍可丽 · AI 视频营销</Text>
                <ActivityIndicator size="small" color={colors.magenta} />
              </View>
            </PaperProvider>
          </SafeAreaProvider>
        </GestureHandlerRootView>
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <PaperProvider theme={theme}>
            <NavigationContainer>
              <Stack.Navigator initialRouteName={ready ? 'Main' : 'Main'} screenOptions={{ headerShown: false }}>
                {/* 主 Tab */}
                <Stack.Screen name="Main" component={MainTabs} options={{ headerShown: false }} />

                {/* 商家创作流程 */}
                <Stack.Screen name="ProClipsChat" component={ProClipsChatScreen} options={{ headerShown: false }} />
                <Stack.Screen name="ProClipsTemplateList" component={ProClipsTemplateListScreen} options={{ title: '模板列表' }} />
                <Stack.Screen name="ProClipsTemplateDetail" component={ProClipsTemplateDetailScreen} options={({ route }: any) => ({ title: route.params?.title || '模板详情' })} />
                <Stack.Screen name="ProClipsWorkflow" component={ProClipsWorkflowScreen} options={{ title: '制作流程' }} />
                <Stack.Screen name="ProClipsSceneUpload" component={ProClipsSceneUploadScreen} options={{ title: '上传素材' }} />
                <Stack.Screen name="ProClipsProductInfo" component={ProClipsProductInfoScreen} options={{ title: '商品信息' }} />
                <Stack.Screen name="ProClipsScriptReview" component={ProClipsScriptReviewScreen} options={{ title: '文案确认' }} />
                <Stack.Screen name="ProClipsVoiceSample" component={ProClipsVoiceSampleScreen} options={{ title: '录制音色' }} />
                <Stack.Screen name="ProClipsMixStatus" component={ProClipsMixStatusScreen} options={{ title: '混剪状态' }} />

                {/* 小如秘书（Phase 5 补全） */}
                <Stack.Screen name="ProClipsXiaoruChat" component={XiaoruChatScreen} options={{ headerShown: false }} />
                <Stack.Screen name="ProClipsXiaoruMemory" component={ProClipsXiaoruMemoryScreen} options={{ title: '记忆库' }} />

                {/* 以下路由 Phase 1-7 补全屏幕，暂指向占位 */}
                <Stack.Screen name="ProClipsNotifications" component={ProClipsNotificationsScreen} options={{ title: '消息通知' }} />
                <Stack.Screen name="ProClipsPlatforms" component={ProClipsPlatformsScreen} options={{ title: '第三方平台' }} />
                <Stack.Screen name="ProClipsPlatformOAuth" component={ProClipsPlatformOAuthScreen} options={{ title: '平台授权' }} />
                <Stack.Screen name="ProClipsPublishStatus" component={ProClipsPublishStatusScreen} options={{ title: '发布状态' }} />
                <Stack.Screen name="ProClipsIncentiveSettings" component={ProClipsIncentiveSettingsScreen} options={{ title: '推广激励' }} />
                <Stack.Screen name="ProClipsAICreator" component={ProClipsAICreatorScreen} options={{ title: 'AI 选达人' }} />
                <Stack.Screen name="ProClipsAIVideo" component={ProClipsAIVideoScreen} options={{ title: 'AI 选品' }} />
                <Stack.Screen name="ProClipsIPCoach" component={ProClipsIPCoachScreen} options={{ title: 'AI IP 助理' }} />
                <Stack.Screen name="ProClipsMaterialDetail" component={ProClipsMaterialDetailScreen} options={{ title: '素材详情' }} />
                <Stack.Screen name="ProClipsPublishDouyin" component={ProClipsPublishDouyinScreen} options={{ title: '发布到平台' }} />
                <Stack.Screen name="ProClipsStatsTracking" component={ProClipsStatsTrackingScreen} options={{ title: '数据追踪' }} />
              </Stack.Navigator>
              {/* 3 秒魔幻变身动画 overlay（覆盖所有屏幕） */}
              <RoleTransformOverlay />
            </NavigationContainer>
            <Toast config={toastConfig} />
            <StatusBar style="light" />
          </PaperProvider>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
}
