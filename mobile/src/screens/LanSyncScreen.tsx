/**
 * LanSyncScreen - 局域网同步页面
 * 扫描设备、配对、选择同步方向、显示进度。
 *
 * 对应 PRD v11.0 第4.3节
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  StyleSheet,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { scanLanDevices, LanDevice, getDeviceDisplayName } from '../services/LanDiscoveryService';
import { lanSyncProvider } from '../services/LanSyncProvider';
import type { SyncDirection, PairingStatus } from '../services/LanSyncProvider';
import { getDatabase } from '../services/DatabaseFactory';

type ScreenState = 'scanning' | 'devices' | 'pairing' | 'syncing' | 'complete';

const LanSyncScreen: React.FC = () => {
  const [screenState, setScreenState] = useState<ScreenState>('scanning');
  const [devices, setDevices] = useState<LanDevice[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<LanDevice | null>(null);
  const [pairingCode, setPairingCode] = useState('');
  const [direction, setDirection] = useState<SyncDirection>('merge');
  const [syncProgress, setSyncProgress] = useState({ current: 0, total: 0 });
  const [error, setError] = useState<string | null>(null);
  const [showScanner, setShowScanner] = useState(false);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const scannedRef = useRef(false);

  // 扫描设备
  const handleScan = useCallback(async () => {
    setScreenState('scanning');
    setError(null);
    try {
      const foundDevices = await scanLanDevices();
      setDevices(foundDevices);
      setScreenState('devices');
      if (foundDevices.length === 0) {
        setError('未发现可用的设备，请确保桌面端已开启同步服务');
      }
    } catch (e: any) {
      setError('扫描失败: ' + (e?.message || '未知错误'));
      setScreenState('devices');
    }
  }, []);

  // 选择设备
  const handleSelectDevice = (device: LanDevice) => {
    setSelectedDevice(device);
    setScreenState('pairing');
    setPairingCode('');
    setError(null);
  };

  // 配对并同步
  const handlePairAndSync = async () => {
    if (!selectedDevice || !pairingCode.trim()) {
      setError('请输入配对验证码');
      return;
    }

    setScreenState('syncing');
    setError(null);

    try {
      const db = getDatabase();

      // 设置进度回调
      lanSyncProvider.setProgressCallback((current, total) => {
        setSyncProgress({ current, total });
      });

      // 连接配对
      const connected = await lanSyncProvider.connect(
        selectedDevice,
        pairingCode.trim(),
        db
      );

      if (!connected) {
        setError('配对失败，请检查验证码是否正确');
        setScreenState('pairing');
        return;
      }

      // 执行同步
      const result = await lanSyncProvider.sync(direction);

      if (result.success) {
        setScreenState('complete');
      } else {
        setError(result.errors.join('\n'));
        setScreenState('pairing');
      }
    } catch (e: any) {
      setError('同步失败: ' + (e?.message || '未知错误'));
      setScreenState('pairing');
    }
  };

  // 配对状态指示
  const getPairingStatusText = (status: PairingStatus): string => {
    switch (status) {
      case 'waiting_code': return '等待验证码';
      case 'pairing': return '配对中...';
      case 'connected': return '已连接';
      case 'error': return '配对失败';
      default: return '';
    }
  };

  // 渲染设备列表
  const renderDeviceItem = ({ item }: { item: LanDevice }) => (
    <TouchableOpacity
      style={styles.deviceItem}
      onPress={() => handleSelectDevice(item)}
      activeOpacity={0.7}
    >
      <Text style={styles.deviceIcon}>
        {item.deviceType === 'desktop' ? '💻' : '📱'}
      </Text>
      <View style={styles.deviceInfo}>
        <Text style={styles.deviceName}>{item.name}</Text>
        <Text style={styles.deviceAddress}>
          {item.ip}:{item.port}
        </Text>
      </View>
      <Text style={styles.selectIcon}>→</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>局域网同步</Text>

        {/* 扫描设备 */}
        {(screenState === 'scanning' || screenState === 'devices') && (
          <>
            <TouchableOpacity
              style={styles.scanButton}
              onPress={handleScan}
              disabled={screenState === 'scanning'}
            >
              {screenState === 'scanning' ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.scanButtonText}>扫描设备</Text>
              )}
            </TouchableOpacity>

            {error && (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            {devices.length > 0 && (
              <>
                <Text style={styles.sectionTitle}>
                  发现 {devices.length} 台设备
                </Text>
                <FlatList
                  data={devices}
                  keyExtractor={(item) => item.id}
                  renderItem={renderDeviceItem}
                  style={styles.deviceList}
                />
              </>
            )}

            <Text style={styles.hint}>
              请确保手机和电脑连接同一 WiFi 网络
            </Text>
          </>
        )}

        {/* 配对页面 */}
        {screenState === 'pairing' && (
          <View style={styles.pairingContainer}>
            <Text style={styles.sectionTitle}>
              配对设备: {selectedDevice?.name}
            </Text>
            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>或</Text>
              <View style={styles.dividerLine} />
            </View>

            <TouchableOpacity
              style={styles.scanCodeButton}
              onPress={async () => {
                if (!cameraPermission?.granted) {
                  const result = await requestCameraPermission();
                  if (!result.granted) {
                    setError('需要相机权限才能扫码');
                    return;
                  }
                }
                scannedRef.current = false;
                setShowScanner(true);
              }}
            >
              <MaterialCommunityIcons name="qrcode-scan" size={22} color="#6366f1" />
              <Text style={styles.scanCodeText}>扫码配对</Text>
            </TouchableOpacity>

            <Text style={styles.pairingHint}>
              请在桌面端查看 6 位配对码并输入，或扫描桌面端显示的二维码
            </Text>

            <TextInput
              style={styles.codeInput}
              placeholder="输入配对验证码"
              value={pairingCode}
              onChangeText={setPairingCode}
              maxLength={6}
              keyboardType="number-pad"
              textAlign="center"
            />

            <Text style={styles.directionLabel}>同步方向</Text>
            {(['merge', 'send_only', 'receive_only'] as SyncDirection[]).map((d) => (
              <TouchableOpacity
                key={d}
                style={[
                  styles.directionOption,
                  direction === d && styles.directionOptionActive,
                ]}
                onPress={() => setDirection(d)}
              >
                <Text
                  style={[
                    styles.directionText,
                    direction === d && styles.directionTextActive,
                  ]}
                >
                  {d === 'merge' ? '合并（双向）' :
                   d === 'send_only' ? '仅发送至电脑' : '仅从电脑拉取'}
                </Text>
              </TouchableOpacity>
            ))}

            {error && (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            <View style={styles.pairingActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => {
                  setSelectedDevice(null);
                  setScreenState('devices');
                  setError(null);
                }}
              >
                <Text style={styles.cancelButtonText}>取消</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmButton, !pairingCode.trim() && styles.buttonDisabled]}
                onPress={handlePairAndSync}
                disabled={!pairingCode.trim()}
              >
                <Text style={styles.confirmButtonText}>开始同步</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* 同步中 */}
        {screenState === 'syncing' && (
          <View style={styles.syncingContainer}>
            <ActivityIndicator size="large" color="#6366f1" />
            <Text style={styles.syncingText}>同步中...</Text>
            {syncProgress.total > 0 && (
              <Text style={styles.progressText}>
                {syncProgress.current} / {syncProgress.total}
              </Text>
            )}
          </View>
        )}

        {/* 二维码扫码器 Modal */}
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
            onBarcodeScanned={({ data }) => {
              if (scannedRef.current) return;
              scannedRef.current = true;
              setShowScanner(false);
              // 解析二维码数据为配对码
              const code = data.length === 6 ? data : data.replace(/[^0-9]/g, '').substring(0, 6);
              if (code.length === 6) {
                setPairingCode(code);
              } else {
                setError('无效的二维码，请扫描桌面端显示的配对码');
              }
            }}
          />
          <View style={styles.scannerOverlay}>
            <View style={styles.scanFrame} />
            <Text style={styles.scannerHint}>将桌面端显示的二维码放入框内</Text>
          </View>
        </SafeAreaView>
      </Modal>

      {/* 同步完成 */}
        {screenState === 'complete' && (
          <View style={styles.completeContainer}>
            <Text style={styles.completeIcon}>✅</Text>
            <Text style={styles.completeText}>同步完成</Text>
            <TouchableOpacity
              style={styles.doneButton}
              onPress={() => {
                lanSyncProvider.disconnect();
                setScreenState('devices');
                setSelectedDevice(null);
              }}
            >
              <Text style={styles.doneButtonText}>完成</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9ff',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a2e',
    marginBottom: 20,
  },
  scanButton: {
    backgroundColor: '#6366f1',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 20,
  },
  scanButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  deviceList: {
    marginBottom: 20,
  },
  deviceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  deviceIcon: {
    fontSize: 28,
    marginRight: 14,
  },
  deviceInfo: {
    flex: 1,
  },
  deviceName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  deviceAddress: {
    fontSize: 13,
    color: '#999',
    marginTop: 2,
  },
  selectIcon: {
    fontSize: 18,
    color: '#ccc',
  },
  errorBox: {
    backgroundColor: '#fef2f2',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
    borderLeftWidth: 3,
    borderLeftColor: '#ef4444',
  },
  errorText: {
    fontSize: 14,
    color: '#dc2626',
  },
  hint: {
    textAlign: 'center',
    fontSize: 13,
    color: '#999',
    marginTop: 16,
  },
  pairingContainer: {
    flex: 1,
  },
  pairingHint: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
  },
  codeInput: {
    borderWidth: 2,
    borderColor: '#6366f1',
    borderRadius: 12,
    padding: 16,
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1a1a2e',
    backgroundColor: '#fff',
    marginBottom: 24,
    letterSpacing: 8,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#e0e0e0',
  },
  dividerText: {
    marginHorizontal: 12,
    fontSize: 13,
    color: '#999',
  },
  scanCodeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f0f0ff',
    borderRadius: 12,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#d0d0ff',
    marginBottom: 20,
  },
  scanCodeText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#6366f1',
    marginLeft: 8,
  },
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
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  cameraPreview: {
    flex: 1,
  },
  scannerOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanFrame: {
    width: 250,
    height: 250,
    borderWidth: 2,
    borderColor: '#fff',
    borderRadius: 16,
    backgroundColor: 'transparent',
  },
  scannerHint: {
    color: '#fff',
    fontSize: 14,
    marginTop: 20,
    textAlign: 'center',
  },
  directionLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
  },
  directionOption: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 14,
    marginBottom: 8,
    borderWidth: 2,
    borderColor: '#e0e0e0',
  },
  directionOptionActive: {
    borderColor: '#6366f1',
    backgroundColor: '#f0f0ff',
  },
  directionText: {
    fontSize: 15,
    color: '#666',
  },
  directionTextActive: {
    color: '#6366f1',
    fontWeight: '600',
  },
  pairingActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#f0f0f0',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#666',
  },
  confirmButton: {
    flex: 1,
    backgroundColor: '#6366f1',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  confirmButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  syncingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  syncingText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
  },
  progressText: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
  },
  completeContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  completeIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  completeText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginBottom: 24,
  },
  doneButton: {
    backgroundColor: '#6366f1',
    borderRadius: 12,
    paddingHorizontal: 40,
    paddingVertical: 14,
  },
  doneButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});

export default LanSyncScreen;
