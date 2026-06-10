import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, ScrollView, Modal, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, TextInput, Button, Card, useTheme, HelperText, ActivityIndicator } from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { pairDevice, setDemoMode } from '../services/AuthService';
import { getLocalIPAddress, isLanSyncAvailable, parseQRCodeData } from '../services/ConnectionManager';
import { showToast } from '../components/Toast';
import { createProfile, setCurrentProfile } from '../services/ProfileManager';
import { openDatabase } from '../services/DatabaseFactory';
import { applySchema } from '../services/SchemaManager';
import { useAppStore } from '../stores/AppStore';
import { logger } from '../utils/logger';
import { getErrorMessage } from '../utils/errorUtils';
import type { AppScreenProps } from '../types/navigation';

const ConnectionScreen: React.FC<AppScreenProps<'Connection'>> = ({ navigation }) => {
  const { colors } = useTheme();
  const [serverUrl, setServerUrl] = useState('http://localhost:8888');
  const [pairingCode, setPairingCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [localIP, setLocalIP] = useState('');
  // P2 项 1：扫码状态
  const [showScanner, setShowScanner] = useState(false);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const scannedRef = useRef(false);

  useEffect(() => {
    loadLocalIP();
  }, []);

  const loadLocalIP = async () => {
    try {
      const ip = await getLocalIPAddress();
      setLocalIP(ip || '无法获取');
    } catch {
      setLocalIP('无法获取');
    }
  };

  const handlePair = async () => {
    setErrorMsg('');

    if (!serverUrl) { setErrorMsg('请填写服务器地址'); return; }
    if (!pairingCode) { setErrorMsg('请填写配对码'); return; }
    if (pairingCode.length !== 6) { setErrorMsg('配对码应为6位数字'); return; }

    setLoading(true);
    try {
      await pairDevice(serverUrl, pairingCode);

      // 配对成功后自动创建默认身份（如果没有身份）
      const { listProfiles } = await import('../services/ProfileManager');
      const profiles = await listProfiles();
      if (profiles.length === 0) {
        const profile = await createProfile('默认身份');
        await openDatabase(profile.id);
        await setCurrentProfile(profile.id);
        await applySchema(await (await import('../services/DatabaseFactory')).getDatabase());
        useAppStore.getState().setProfiles([profile]);
        useAppStore.getState().setPhase('ready');
        logger.log('[Connection] Created default profile:', profile.id);
      }

      showToast('success', '配对成功', '正在跳转...');
      navigation.replace('Main');
    } catch (err) {
      setErrorMsg(getErrorMessage(err, '配对失败，请检查地址和配对码'));
    } finally {
      setLoading(false);
    }
  };

  /** 跳过配对，进入演示模式 */
  const handleDemoMode = async () => {
    setDemoLoading(true);
    try {
      await setDemoMode();

      // 演示模式自动创建演示身份
      const { listProfiles } = await import('../services/ProfileManager');
      const profiles = await listProfiles();
      if (profiles.length === 0) {
        const profile = await createProfile('演示身份');
        await openDatabase(profile.id);
        await setCurrentProfile(profile.id);
        await applySchema(await (await import('../services/DatabaseFactory')).getDatabase());
        useAppStore.getState().setProfiles([profile]);
        useAppStore.getState().setPhase('ready');
        logger.log('[Connection] Created demo profile:', profile.id);
      }

      showToast('success', '已进入演示模式', '可以浏览所有功能界面');
      navigation.replace('Main');
    } catch {
      showToast('error', '进入失败');
    } finally {
      setDemoLoading(false);
    }
  };

  const handleUseLocalIP = () => {
    if (localIP && localIP !== '无法获取') {
      setServerUrl(`http://${localIP}:8888`);
    }
  };

  // P2 项 1：扫码入口。请求权限后打开 Modal，由 CameraView 触发 onBarcodeScanned。
  const handleOpenScanner = async () => {
    if (!cameraPermission?.granted) {
      const result = await requestCameraPermission();
      if (!result.granted) {
        showToast('error', '需要相机权限才能扫码');
        return;
      }
    }
    scannedRef.current = false;
    setShowScanner(true);
  };

  // P2 项 1：扫码回调。解析原始数据，填充表单后关闭 Modal。
  const handleBarcodeScanned = ({ data }: { data: string }) => {
    if (scannedRef.current) return;
    scannedRef.current = true;
    setShowScanner(false);

    const payload = parseQRCodeData(data);
    if (!payload) {
      setErrorMsg('二维码内容无效，应为 { serverUrl, code } JSON 格式');
      return;
    }
    setServerUrl(payload.serverUrl);
    setPairingCode(payload.code);
    setErrorMsg('');
    showToast('success', '已识别', '请确认信息后点击配对');
  };

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
    >
      {/* Logo & 标题 */}
      <View style={styles.header}>
        <View style={styles.logoBox}>
          <MaterialCommunityIcons name="connection" size={48} color={colors.primary} />
        </View>
        <Text variant="headlineSmall" style={styles.title}>
          连接 ProClaw 桌面端
        </Text>
        <Text variant="bodyMedium" style={styles.subtitle}>
          扫描二维码或手动输入连接信息
        </Text>
      </View>

      {/* 表单卡片 */}
      <Card style={styles.formCard}>
        <Card.Content>
          <TextInput
            label="服务器地址"
            value={serverUrl}
            onChangeText={setServerUrl}
            mode="outlined"
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            style={styles.input}
            left={<TextInput.Icon icon="server" />}
          />
          <Button
            mode="text"
            compact
            icon="ip"
            onPress={handleUseLocalIP}
            style={styles.ipBtn}
          >
            本机 IP: {localIP || '获取中...'}
          </Button>

          <TextInput
            label="配对码"
            value={pairingCode}
            onChangeText={setPairingCode}
            mode="outlined"
            keyboardType="numeric"
            maxLength={6}
            style={styles.input}
            left={<TextInput.Icon icon="key" />}
          />

          {errorMsg !== '' && (
            <HelperText type="error" visible style={styles.error}>
              {errorMsg}
            </HelperText>
          )}

          <Button
            mode="contained"
            onPress={handlePair}
            loading={loading}
            disabled={loading}
            style={styles.pairBtn}
            contentStyle={{ paddingVertical: 8 }}
            icon="link-variant"
          >
            {loading ? '配对中...' : '配对设备'}
          </Button>

          {/* 分隔线 */}
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text variant="bodySmall" style={styles.dividerText}>或者</Text>
            <View style={styles.dividerLine} />
          </View>

          <Button
            mode="outlined"
            icon="qrcode-scan"
            onPress={handleOpenScanner}
            style={styles.scanBtn}
          >
            扫码连接
          </Button>

          {/* 分隔线 */}
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text variant="bodySmall" style={styles.dividerText}>或者</Text>
            <View style={styles.dividerLine} />
          </View>

          <Button
            mode="outlined"
            icon="wifi"
            onPress={() => navigation.navigate('LanSync')}
            style={styles.lanBtn}
          >
            局域网同步
          </Button>

          <Button
            mode="elevated"
            icon="play-circle"
            onPress={handleDemoMode}
            loading={demoLoading}
            disabled={demoLoading}
            style={styles.demoBtn}
            contentStyle={{ paddingVertical: 6 }}
            labelStyle={{ color: '#8b5cf6' }}
          >
            {demoLoading ? '进入中...' : '跳过登录，体验演示'}
          </Button>
        </Card.Content>
      </Card>

      {/* P2 项 1：扫码 Modal（仿 LanSyncScreen 模式） */}
      <Modal visible={showScanner} animationType="slide" onRequestClose={() => setShowScanner(false)}>
        <SafeAreaView style={styles.scannerContainer}>
          <View style={styles.scannerHeader}>
            <TouchableOpacity onPress={() => setShowScanner(false)}>
              <MaterialCommunityIcons name="close" size={28} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.scannerTitle}>扫描桌面端二维码</Text>
            <View style={{ width: 28 }} />
          </View>
          <CameraView
            style={styles.cameraPreview}
            facing="back"
            barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
            onBarcodeScanned={handleBarcodeScanned}
          />
          <View style={styles.scannerOverlay}>
            <View style={styles.scanFrame} />
            <Text style={styles.scannerHint}>将桌面端显示的二维码放入框内</Text>
          </View>
        </SafeAreaView>
      </Modal>

      {/* 帮助指南 */}
      <Card style={styles.helpCard}>
        <Card.Title title="连接指南" titleStyle={styles.helpTitle} />
        <Card.Content>
          <View style={styles.helpStep}>
            <MaterialCommunityIcons name="numeric-1-circle" size={20} color={colors.primary} style={styles.helpStepIcon} />
            <Text variant="bodyMedium" style={styles.helpText}>确保移动端和桌面端在同一局域网</Text>
          </View>
          <View style={styles.helpStep}>
            <MaterialCommunityIcons name="numeric-2-circle" size={20} color={colors.primary} style={styles.helpStepIcon} />
            <Text variant="bodyMedium" style={styles.helpText}>在桌面端打开「设备配对」页面</Text>
          </View>
          <View style={styles.helpStep}>
            <MaterialCommunityIcons name="numeric-3-circle" size={20} color={colors.primary} style={styles.helpStepIcon} />
            <Text variant="bodyMedium" style={styles.helpText}>输入配对码 888888 完成配对</Text>
          </View>
          <View style={styles.helpStep}>
            <MaterialCommunityIcons name="numeric-4-circle" size={20} color={colors.primary} style={styles.helpStepIcon} />
            <Text variant="bodyMedium" style={styles.helpText}>配对成功后自动跳转至主界面</Text>
          </View>
        </Card.Content>
      </Card>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#f8f8f8',
  },
  container: {
    flexGrow: 1,
    padding: 20,
    paddingTop: 30,
  },
  header: {
    alignItems: 'center',
    marginBottom: 28,
  },
  logoBox: {
    width: 80,
    height: 80,
    borderRadius: 20,
    backgroundColor: '#e0e7ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontWeight: '700',
    marginBottom: 6,
  },
  subtitle: {
    color: '#666',
  },
  formCard: {
    borderRadius: 14,
    marginBottom: 20,
    backgroundColor: '#fff',
  },
  input: {
    marginBottom: 8,
  },
  ipBtn: {
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  error: {
    fontSize: 13,
    marginBottom: 8,
  },
  pairBtn: {
    borderRadius: 10,
    marginTop: 4,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#e5e7eb',
  },
  dividerText: {
    marginHorizontal: 12,
    color: '#999',
  },
  scanBtn: {
    borderRadius: 10,
    borderColor: '#d1d5db',
  },
  lanBtn: {
    borderRadius: 10,
    borderColor: '#6366f1',
    marginBottom: 8,
  },
  demoBtn: {
    borderRadius: 10,
    borderColor: '#c4b5fd',
    backgroundColor: '#f5f3ff',
  },
  helpCard: {
    borderRadius: 14,
    backgroundColor: '#fff',
  },
  helpTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  // P2 项 1：扫码 Modal 样式
  scannerContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  scannerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  scannerTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  cameraPreview: {
    flex: 1,
  },
  scannerOverlay: {
    position: 'absolute',
    bottom: 80,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  scanFrame: {
    width: 220,
    height: 220,
    borderWidth: 2,
    borderColor: '#6366f1',
    borderRadius: 12,
    backgroundColor: 'transparent',
  },
  scannerHint: {
    color: '#fff',
    marginTop: 16,
    fontSize: 14,
  },
  helpStep: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  helpStepIcon: {
    marginRight: 10,
  },
  helpText: {
    color: '#555',
    flex: 1,
  },
});

export default ConnectionScreen;
