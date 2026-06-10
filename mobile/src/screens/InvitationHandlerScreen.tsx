import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { acceptInvitation, parseInviteLink, acceptEmployeeInvitation } from '../services/InvitationService';
import { loadServerUrl } from '../services/AuthService';
import { getErrorMessage } from '../utils/errorUtils';
import type { AppScreenProps } from '../types/navigation';

interface InvitationHandlerScreenProps extends AppScreenProps<'InvitePartner'> {}

const DEFAULT_HOST = ''; // 审计 R2-S8：不再硬编码，由 loadServerUrl 动态提供

export const InvitationHandlerScreen: React.FC<InvitationHandlerScreenProps> = ({
  route,
  navigation,
}) => {
  const [inviteCode, setInviteCode] = useState('');
  const [host, setHost] = useState(''); // 审计 R2-S8：动态加载，不再硬编码

  // 加载默认服务器地址
  useEffect(() => {
    loadServerUrl().then(url => {
      if (url && !host) setHost(url);
    });
  }, []);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetchingInfo, setFetchingInfo] = useState(false);
  const [invitationInfo, setInvitationInfo] = useState<any>(null);
  const [infoError, setInfoError] = useState<string | null>(null);
  const [acceptStep, setAcceptStep] = useState<'info' | 'signup' | 'done'>('info');
  const [inviteType, setInviteType] = useState<'order_share' | 'price_update' | 'employee' | null>(null);

  useEffect(() => {
    const code = route.params?.code;
    const hostParam = route.params?.host;
    const typeParam = route.params?.type;

    const initInvitation = async () => {
      if (code) {
        setInviteCode(code);
        if (hostParam) setHost(hostParam);
        if (typeParam) setInviteType(typeParam as any);
        // 审计 R2-S8：fallback 链：route param → state → loadServerUrl → 默认 HTTPS
        const effectiveHost = hostParam || host || await loadServerUrl() || 'https://localhost:8888';
        fetchInvitationInfo(code, effectiveHost);
      }
    };
    initInvitation();
  }, [route.params]);

  const fetchInvitationInfo = useCallback(async (code: string, apiHost: string) => {
    setFetchingInfo(true);
    setInfoError(null);
    try {
      // 尝试从服务器获取邀请详情
      const res = await fetch(`${apiHost}/api/invitations/${code}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      if (res.ok) {
        const data = await res.json();
        setInvitationInfo(data);
      } else {
        // 回退: 从 invite_code 解析基本信息
        setInvitationInfo({
          invite_code: code,
          invitation_type: 'order_share',
          business_ref_id: '',
          inviter_name: '外部伙伴',
          expires_at: Date.now() + 7 * 24 * 60 * 60 * 1000,
        });
      }
    } catch {
      // 网络不可达时, 使用基础信息
      setInvitationInfo({
        invite_code: code,
        invitation_type: 'order_share',
        business_ref_id: '',
        inviter_name: '外部伙伴',
        expires_at: Date.now() + 7 * 24 * 60 * 60 * 1000,
      });
    } finally {
      setFetchingInfo(false);
    }
  }, []);

  const handleAccept = async () => {
    if (!inviteCode) {
      Alert.alert('错误', '邀请码不能为空');
      return;
    }

    if (!name) {
      Alert.alert('错误', '请输入您的姓名');
      return;
    }

    // 员工邀请：还需要手机号
    if (inviteType === 'employee' && !phone) {
      Alert.alert('错误', '员工邀请需要填写手机号');
      return;
    }

    setLoading(true);
    try {
      if (inviteType === 'employee') {
        // 调用员工邀请 API
        const response = await acceptEmployeeInvitation(host, {
          invite_code: inviteCode,
          phone,
          name,
          password: password || undefined,
        });

        if (response.success) {
          setAcceptStep('done');
          const roleNames = response.roles?.join('、') || '';
          Alert.alert(
            '欢迎加入团队!',
            `您已被授予 ${roleNames} 角色，现在可以开始工作了。`,
            [
              {
                text: '开始使用',
                onPress: () => navigation.navigate('Main'),
              },
            ]
          );
        } else {
          Alert.alert('失败', (response as any).message || '接受邀请失败');
        }
      } else {
        // 外部伙伴邀请（原有逻辑）
        const response = await acceptInvitation(host, {
          invite_code: inviteCode,
          new_user: {
            phone: phone || undefined,
            name,
            password: password || undefined,
          },
        });

        if (response.success) {
          setAcceptStep('done');
          Alert.alert(
            '邀请已接受',
            '您已成功加入 ProClaw! 可以开始与伙伴协作了。',
            [
              {
                text: '开始使用',
                onPress: () => navigation.navigate('Main'),
              },
            ]
          );
        } else {
          Alert.alert('失败', (response as any).message || '接受邀请失败');
        }
      }
    } catch (error) {
      Alert.alert('错误', getErrorMessage(error, '接受邀请失败'));
    } finally {
      setLoading(false);
    }
  };

  const handleReject = () => {
    Alert.alert('提示', '确定要拒绝此邀请吗？', [
      { text: '取消', style: 'cancel' },
      {
        text: '确定',
        onPress: () => navigation.goBack(),
        style: 'destructive',
      },
    ]);
  };

  const formatTimeRemaining = (expiresAt: number) => {
    const diff = expiresAt - Date.now();
    if (diff <= 0) return '已过期';
    const hours = Math.floor(diff / (60 * 60 * 1000));
    if (hours < 1) {
      const minutes = Math.floor(diff / (60 * 1000));
      return `${minutes}分钟`;
    }
    if (hours < 24) return `${hours}小时`;
    const days = Math.floor(hours / 24);
    return `${days}天${hours % 24}小时`;
  };

  const isExpired = invitationInfo?.expires_at
    ? invitationInfo.expires_at < Date.now()
    : false;

  // ============ 渲染: 加载中 ============
  if (fetchingInfo) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366f1" />
        <Text style={styles.loadingText}>正在获取邀请信息...</Text>
      </View>
    );
  }

  // ============ 渲染: 处理完成 ============
  if (acceptStep === 'done') {
    return (
      <View style={styles.doneContainer}>
        <MaterialCommunityIcons name="check-circle" size={80} color="#10b981" />
        <Text style={styles.doneTitle}>邀请已接受!</Text>
        <Text style={styles.doneSubtitle}>
          您已成功加入 ProClaw 协作网络
        </Text>
        <View style={styles.doneFeatures}>
          <FeatureItem icon="message-text" text="实时消息与订单交流" />
          <FeatureItem icon="clipboard-text" text="查看共享的订单信息" />
          <FeatureItem icon="phone" text="语音/视频通话协作" />
          <FeatureItem icon="account-group" text="管理您的协作伙伴" />
        </View>
        <TouchableOpacity
          style={styles.startButton}
          onPress={() => navigation.navigate('Main')}
        >
          <Text style={styles.startButtonText}>开始使用</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ============ 渲染: 邀请详情 + 表单 ============
  const invType = invitationInfo?.invitation_type;
  const isOrderShare = invType === 'order_share';
  const isPriceUpdate = invType === 'price_update';

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* Header */}
      <View style={styles.header}>
        <MaterialCommunityIcons
          name={isOrderShare ? 'clipboard-text' : 'tag-text'}
          size={48}
          color="#fff"
        />
        <Text style={styles.title}>
          {isOrderShare ? '订单分享邀请' : isPriceUpdate ? '价格更新通知' : '协作邀请'}
        </Text>
        <Text style={styles.headerSubtitle}>
          {invitationInfo?.inviter_name || '外部伙伴'} 邀请您加入 ProClaw
        </Text>
      </View>

      {/* 邀请详情卡片 */}
      {invitationInfo && (
        <View style={styles.infoCard}>
          {/* 邀请人 */}
          <InfoRow
            icon="account"
            label="邀请人"
            value={invitationInfo.inviter_name || '--'}
          />

          {/* 邀请类型 - 差异化展示 */}
          <InfoRow
            icon="tag"
            label="邀请类型"
            value={isOrderShare ? '订单分享' : isPriceUpdate ? '价格更新' : '协作邀请'}
          />

          {/* 订单分享: 显示订单号 */}
          {isOrderShare && invitationInfo.business_ref_id ? (
            <InfoRow
              icon="file-document"
              label="关联订单"
              value={invitationInfo.business_ref_id}
            />
          ) : null}

          {/* 价格更新: 显示功能说明 */}
          {isPriceUpdate ? (
            <View style={styles.priceUpdateHint}>
              <MaterialCommunityIcons name="information" size={16} color="#f59e0b" />
              <Text style={styles.priceUpdateHintText}>
                接受此邀请后，您将收到该伙伴的价格更新通知
              </Text>
            </View>
          ) : null}

          {/* 剩余时间 */}
          <InfoRow
            icon="clock-outline"
            label="有效期"
            value={formatTimeRemaining(invitationInfo.expires_at)}
            danger={isExpired}
          />

          {isExpired && (
            <View style={styles.expiredBanner}>
              <MaterialCommunityIcons name="alert-circle" size={18} color="#ef4444" />
              <Text style={styles.expiredText}>此邀请已过期</Text>
            </View>
          )}
        </View>
      )}

      {/* 表单区域 - 仅非过期邀请可填写 */}
      {!isExpired && (
        <View style={styles.form}>
          <Text style={styles.sectionTitle}>填写您的信息</Text>

          <Text style={styles.label}>您的姓名 *</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="请输入您的姓名"
            placeholderTextColor="#999"
          />

          <Text style={styles.label}>手机号（可选）</Text>
          <TextInput
            style={styles.input}
            value={phone}
            onChangeText={setPhone}
            placeholder="请输入手机号"
            placeholderTextColor="#999"
            keyboardType="phone-pad"
          />

          <Text style={styles.label}>密码（可选）</Text>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            placeholder="设置登录密码"
            placeholderTextColor="#999"
            secureTextEntry
          />

          {/* 操作按钮 */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.button, styles.acceptButton]}
              onPress={handleAccept}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.buttonText}>接受邀请</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.rejectButton]}
              onPress={handleReject}
              activeOpacity={0.8}
            >
              <Text style={styles.rejectButtonText}>拒绝</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* 过期邀请的操作 */}
      {isExpired && (
        <View style={styles.expiredActions}>
          <TouchableOpacity
            style={[styles.button, styles.rejectButton]}
            onPress={() => navigation.goBack()}
            activeOpacity={0.8}
          >
            <Text style={styles.rejectButtonText}>返回</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
};

// ============ 子组件 ============

const InfoRow: React.FC<{
  icon: string;
  label: string;
  value: string;
  danger?: boolean;
}> = ({ icon, label, value, danger }) => (
  <View style={styles.infoRow}>
    <MaterialCommunityIcons name={icon} size={18} color={danger ? '#ef4444' : '#6366f1'} />
    <View style={styles.infoContent}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={[styles.infoValue, danger && styles.infoValueDanger]}>
        {value}
      </Text>
    </View>
  </View>
);

const FeatureItem: React.FC<{ icon: string; text: string }> = ({ icon, text }) => (
  <View style={styles.featureItem}>
    <MaterialCommunityIcons name={icon} size={22} color="#10b981" />
    <Text style={styles.featureText}>{text}</Text>
  </View>
);

// ============ 样式 ============

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  contentContainer: {
    paddingBottom: 40,
  },

  // Loading
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },

  // Done (引导页)
  doneContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
    backgroundColor: '#f8fafc',
  },
  doneTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    marginTop: 16,
  },
  doneSubtitle: {
    fontSize: 15,
    color: '#6b7280',
    marginTop: 8,
    textAlign: 'center',
  },
  doneFeatures: {
    marginTop: 32,
    width: '100%',
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#fff',
    borderRadius: 10,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  featureText: {
    fontSize: 15,
    color: '#374151',
    marginLeft: 12,
  },
  startButton: {
    marginTop: 24,
    backgroundColor: '#6366f1',
    paddingHorizontal: 40,
    paddingVertical: 14,
    borderRadius: 12,
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 3,
  },
  startButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: 'bold',
  },

  // Header
  header: {
    backgroundColor: '#6366f1',
    padding: 30,
    paddingTop: 50,
    alignItems: 'center',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 12,
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.75)',
    marginTop: 6,
  },

  // Info Card
  infoCard: {
    margin: 16,
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#f0f0f0',
  },
  infoContent: {
    marginLeft: 12,
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: '#9ca3af',
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 15,
    color: '#1f2937',
    fontWeight: '500',
  },
  infoValueDanger: {
    color: '#ef4444',
  },
  priceUpdateHint: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#f0f0f0',
  },
  priceUpdateHintText: {
    fontSize: 13,
    color: '#92400e',
    marginLeft: 8,
    flex: 1,
  },
  expiredBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 4,
    marginTop: 6,
    backgroundColor: '#fef2f2',
    borderRadius: 8,
  },
  expiredText: {
    fontSize: 14,
    color: '#ef4444',
    fontWeight: '600',
    marginLeft: 8,
  },

  // Form
  form: {
    margin: 16,
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    color: '#6b7280',
    marginBottom: 6,
    marginTop: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#f9fafb',
    color: '#1f2937',
  },

  // Actions
  actions: {
    marginTop: 24,
  },
  button: {
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 10,
  },
  acceptButton: {
    backgroundColor: '#6366f1',
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  rejectButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  rejectButtonText: {
    fontSize: 16,
    color: '#6b7280',
  },
  expiredActions: {
    margin: 16,
    marginTop: 8,
  },

  // Employee invitation styles
  roleContainer: {
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#f0f0f0',
  },
  roleLabel: {
    fontSize: 12,
    color: '#9ca3af',
    marginBottom: 6,
  },
  roleChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  roleChip: {
    backgroundColor: '#eef2ff',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  roleChipText: {
    fontSize: 13,
    color: '#6366f1',
    fontWeight: '500',
  },
});

export default InvitationHandlerScreen;
