/**
 * 路由参数类型表
 * P1 任务：替换 13 处 useNavigation<any>() 和 5+ 处 React.FC<{ navigation: any; ... }>
 *
 * 用法：
 *   import type { RootStackParamList } from '../types/navigation';
 *   import type { StackNavigationProp } from '@react-navigation/stack';
 *   const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
 *   navigation.navigate('ChatDetail', { sessionId, targetId });
 *
 *   // Screen props：
 *   type ScreenProps = StackScreenProps<RootStackParamList, 'ChatDetail'>;
 *
 * 注意：
 *   - App.tsx 用的是 createStackNavigator（@react-navigation/stack），不是 native-stack
 *   - PluginPage / PluginDetail / ChatDetail 的 params 字段从 route.params 实测得出
 *   - InvitePartner 是 ContactsScreen 引用的内部别名（深链场景）
 */

import type { StackNavigationProp, StackScreenProps } from '@react-navigation/stack';
import type { FlowHubPluginInfo } from '../services/PluginDownloader';

export type MainTabParamList = {
  ContactsTab: undefined;
  MessagesTab: undefined;
  ProfileTab: undefined;
};

export type RootStackParamList = {
  // 引导 / 启动
  Connection: undefined;
  Onboarding: undefined;
  ProfileSelect: undefined;
  Main: undefined;

  // 通话
  Call: { callId?: string; isIncoming?: boolean; peerId?: string; peerName?: string } | undefined;

  // 备份 / 数据
  BackupWallet: undefined;
  DataTransfer: undefined;
  LanSync: undefined;

  // 插件
  PluginStore: undefined;
  PluginDetail: { pluginInfo: FlowHubPluginInfo; isInstalled: boolean };
  PluginPage: { pluginId: string; pluginTitle?: string };

  // 业务
  Products: undefined;
  SupplyChain: undefined;
  Inventory: undefined;
  SalesOrder: { selectedCustomer?: unknown } | undefined;
  Contacts: undefined;
  CallHistory: undefined;
  Agents: undefined;
  Home: undefined;
  Profile: undefined;

  // 聊天
  ChatDetail: {
    sessionId?: string;
    targetId: string;
    targetName: string;
    targetType: 'personal' | 'agent' | 'team' | 'group';
    targetIcon?: string;
  };
  IdentityManage: undefined;
  Settings: undefined;

  // 邀请（深链）
  InvitePartner: { code?: string; host?: string; type?: string } | undefined;

  // Task 8：Agent 介绍页（与桌面端 /agent-profile/:agentId 一致）
  AgentProfile: { agentId: string };
};

/** 通用 Navigation 快捷类型 */
export type AppNavigation<R extends keyof RootStackParamList = keyof RootStackParamList> =
  StackNavigationProp<RootStackParamList, R>;

/** 通用 Screen props 快捷类型（用于 React.FC 接收 navigation/route） */
export type AppScreenProps<R extends keyof RootStackParamList> = StackScreenProps<RootStackParamList, R>;

/** declare global: 让 useNavigation() 无需显式泛型也能拿到 RootStackParamList */
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
