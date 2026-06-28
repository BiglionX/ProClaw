/**
 * AvatarPicker - Agent 头像选择器
 *
 * 功能：
 * - Tab 1：30 个 TeamAvatar 库（FlatList 网格，点击选中）
 * - Tab 2：自定义头像（相册选择 / 拍照 / 移除）
 *
 * 用法：
 *   <AvatarPicker
 *     agentId={agentId}
 *     currentKey={override?.avatar_key || null}
 *     currentDataUrl={customAvatarDataUrl}
 *     onChange={(result) => {
 *       // result: { kind: 'preset', key: 'agent_01' }
 *       //        | { kind: 'custom', dataUrl: '...', relativePath: '...' }
 *       //        | { kind: 'remove' }
 *     }}
 *     size={96}
 *   />
 *
 * Web 平台限制：
 * - expo-image-picker 在 Web 上通过 HTML <input type="file"> 模拟
 * - 拍照按钮在 Web 上禁用
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Surface, SegmentedButtons, Button, TextInput, useTheme } from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { TeamAvatar } from './TeamAvatar';
import { AGENT_AVATAR_PRESETS } from '../types/agentAvatarLibrary';
import { showToast } from './Toast';
import { OUTBOUND_ERROR_MESSAGE } from '../lib/fetchWithTimeout';
import { uploadCustomAvatar } from '../services/agentProfileService';
import { logger } from '../utils/logger';

/** 选择回调的数据形态 */
export type AvatarPickerChange =
  | { kind: 'preset'; key: string }
  | { kind: 'custom'; dataUrl: string; relativePath: string }
  | { kind: 'remove' };

export interface AvatarPickerProps {
  agentId: string;
  currentKey: string | null;
  currentDataUrl: string | null;
  onChange: (change: AvatarPickerChange) => void;
  size?: number;
}

export const AvatarPicker: React.FC<AvatarPickerProps> = ({
  agentId,
  currentKey,
  currentDataUrl,
  onChange,
  size = 96,
}) => {
  const theme = useTheme();
  const [tab, setTab] = useState<'preset' | 'custom'>(
    currentDataUrl ? 'custom' : 'preset',
  );
  const [uploading, setUploading] = useState(false);
  const [customPreview, setCustomPreview] = useState<string | null>(currentDataUrl);

  const handlePickFromLibrary = useCallback(async () => {
    if (Platform.OS === 'web') {
      // Web 平台：使用 HTML <input type="file">
      try {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = async (e: any) => {
          const file = e.target.files?.[0];
          if (!file) return;
          if (file.size > 2 * 1024 * 1024) {
            showToast('error', '头像过大', '请选择 ≤ 2MB 的图片');
            return;
          }
          const reader = new FileReader();
          reader.onload = async () => {
            const dataUrl = String(reader.result || '');
            setCustomPreview(dataUrl);
            try {
              const result = await uploadCustomAvatar(agentId, {
                uri: dataUrl,
                size: file.size,
                mimeType: file.type,
              });
              if (result) {
                onChange({ kind: 'custom', dataUrl, relativePath: result.relative_path });
                showToast('success', '头像已更新');
              }
            } catch (err) {
              showToast('error', '上传失败', OUTBOUND_ERROR_MESSAGE);
            }
          };
          reader.readAsDataURL(file);
        };
        input.click();
      } catch (err) {
        showToast('error', '选择失败', OUTBOUND_ERROR_MESSAGE);
      }
      return;
    }

    try {
      setUploading(true);
      const ImagePicker = await import('expo-image-picker');
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        showToast('error', '权限不足', '请授予相册访问权限');
        setUploading(false);
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (result.canceled || !result.assets?.[0]) {
        setUploading(false);
        return;
      }

      const asset = result.assets[0];
      const dataUrl = asset.uri;
      setCustomPreview(dataUrl);

      const uploadResult = await uploadCustomAvatar(agentId, {
        uri: asset.uri,
        size: asset.fileSize,
        mimeType: asset.mimeType,
      });

      if (uploadResult) {
        onChange({ kind: 'custom', dataUrl, relativePath: uploadResult.relative_path });
        showToast('success', '头像已更新');
      }
    } catch (err) {
      logger.warn('[AvatarPicker] pickFromLibrary failed:', err);
      showToast('error', '选择失败', OUTBOUND_ERROR_MESSAGE);
    } finally {
      setUploading(false);
    }
  }, [agentId, onChange]);

  const handleTakePhoto = useCallback(async () => {
    if (Platform.OS === 'web') {
      showToast('info', '提示', 'Web 端不支持拍照，请使用相册选择');
      return;
    }

    try {
      setUploading(true);
      const ImagePicker = await import('expo-image-picker');
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        showToast('error', '权限不足', '请授予相机权限');
        setUploading(false);
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (result.canceled || !result.assets?.[0]) {
        setUploading(false);
        return;
      }

      const asset = result.assets[0];
      setCustomPreview(asset.uri);

      const uploadResult = await uploadCustomAvatar(agentId, {
        uri: asset.uri,
        size: asset.fileSize,
        mimeType: asset.mimeType,
      });

      if (uploadResult) {
        onChange({ kind: 'custom', dataUrl: asset.uri, relativePath: uploadResult.relative_path });
        showToast('success', '头像已更新');
      }
    } catch (err) {
      logger.warn('[AvatarPicker] takePhoto failed:', err);
      showToast('error', '拍照失败', OUTBOUND_ERROR_MESSAGE);
    } finally {
      setUploading(false);
    }
  }, [agentId, onChange]);

  const handleRemoveCustom = useCallback(() => {
    setCustomPreview(null);
    onChange({ kind: 'remove' });
  }, [onChange]);

  const handleSelectPreset = useCallback(
    (key: string) => {
      onChange({ kind: 'preset', key });
    },
    [onChange],
  );

  // 渲染 preset 网格项
  const renderPresetItem = useCallback(
    ({ item }: { item: (typeof AGENT_AVATAR_PRESETS)[number] }) => {
      const selected = currentKey === item.key;
      return (
        <TouchableOpacity
          style={styles.presetItem}
          onPress={() => handleSelectPreset(item.key)}
          activeOpacity={0.7}
          accessibilityLabel={`选择 ${item.label}`}
        >
          <TeamAvatar
            presetKey={item.key}
            size={56}
            borderColor={selected ? '#fbbf24' : undefined}
            borderWidth={selected ? 3 : 0}
          />
          <Text
            style={[
              styles.presetLabel,
              { color: selected ? '#fbbf24' : theme.colors.onSurfaceVariant },
            ]}
            numberOfLines={1}
          >
            {item.label}
          </Text>
          {selected && (
            <MaterialCommunityIcons
              name="check-circle"
              size={18}
              color="#fbbf24"
              style={styles.presetCheck}
            />
          )}
        </TouchableOpacity>
      );
    },
    [currentKey, handleSelectPreset, theme.colors.onSurfaceVariant],
  );

  return (
    <View style={styles.container}>
      <SegmentedButtons
        value={tab}
        onValueChange={(v) => setTab(v as 'preset' | 'custom')}
        buttons={[
          { value: 'preset', label: '头像库', icon: 'palette' },
          { value: 'custom', label: '自定义', icon: 'image-plus' },
        ]}
        style={styles.tabs}
      />

      {tab === 'preset' && (
        <FlatList
          data={AGENT_AVATAR_PRESETS}
          renderItem={renderPresetItem}
          keyExtractor={(item) => item.key}
          numColumns={6}
          contentContainerStyle={styles.presetGrid}
          scrollEnabled
          nestedScrollEnabled
        />
      )}

      {tab === 'custom' && (
        <View style={styles.customTab}>
          {/* 当前选中预览 */}
          <Surface style={styles.previewBox} elevation={1}>
            {customPreview ? (
              <Image source={{ uri: customPreview }} style={styles.previewImage} />
            ) : (
              <View style={styles.previewPlaceholder}>
                <MaterialCommunityIcons
                  name="image-outline"
                  size={48}
                  color={theme.colors.onSurfaceVariant}
                />
                <Text style={[styles.placeholderText, { color: theme.colors.onSurfaceVariant }]}>
                  尚未选择自定义头像
                </Text>
              </View>
            )}
            {uploading && (
              <View style={styles.uploadingOverlay}>
                <ActivityIndicator size="large" color="#fff" />
                <Text style={styles.uploadingText}>上传中...</Text>
              </View>
            )}
          </Surface>

          {/* 操作按钮 */}
          <View style={styles.actionButtons}>
            <Button
              mode="contained-tonal"
              icon="image-multiple"
              onPress={handlePickFromLibrary}
              disabled={uploading}
              style={styles.actionBtn}
            >
              选择图片
            </Button>
            <Button
              mode="contained-tonal"
              icon="camera"
              onPress={handleTakePhoto}
              disabled={uploading || Platform.OS === 'web'}
              style={styles.actionBtn}
            >
              拍照
            </Button>
          </View>

          {customPreview && (
            <Button
              mode="outlined"
              icon="delete"
              onPress={handleRemoveCustom}
              textColor="#ef4444"
              style={styles.removeBtn}
            >
              移除自定义头像
            </Button>
          )}

          <Text style={[styles.hint, { color: theme.colors.onSurfaceVariant }]}>
            支持 JPG / PNG / WebP，建议正方形，文件 ≤ 2MB
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  tabs: {
    marginBottom: 16,
  },
  presetGrid: {
    paddingBottom: 8,
  },
  presetItem: {
    width: '16.66%',
    alignItems: 'center',
    padding: 6,
    position: 'relative',
  },
  presetLabel: {
    fontSize: 10,
    marginTop: 4,
    textAlign: 'center',
  },
  presetCheck: {
    position: 'absolute',
    top: 2,
    right: 4,
  },
  customTab: {
    paddingVertical: 12,
  },
  previewBox: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignSelf: 'center',
    marginBottom: 16,
    overflow: 'hidden',
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  previewPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {
    fontSize: 11,
    marginTop: 4,
    textAlign: 'center',
  },
  uploadingOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadingText: {
    color: '#fff',
    fontSize: 12,
    marginTop: 6,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'center',
    marginBottom: 12,
  },
  actionBtn: {
    flex: 1,
  },
  removeBtn: {
    borderColor: '#ef4444',
    marginTop: 8,
  },
  hint: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 12,
  },
});

// 占位导入（已移至顶部，避免 Tree-shake 警告）

export default AvatarPicker;