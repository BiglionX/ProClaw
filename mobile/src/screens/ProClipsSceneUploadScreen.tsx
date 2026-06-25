import React, { useMemo, useState } from 'react';
import { StyleSheet, ScrollView, Platform } from 'react-native';
import { Text, Button, Card, List } from 'react-native-paper';
import type { AppScreenProps } from '../types/navigation';
import { useProClipsStore } from '../stores/ProClipsStore';
import type { ProClipsTemplate } from '../services/ProClipsService';
import { uploadSceneClip, generateUploadUrl, confirmSceneUpload } from '../services/ProClipsService';

const ProClipsSceneUploadScreen: React.FC<AppScreenProps<'ProClipsSceneUpload'>> = ({ route, navigation }) => {
  const { title } = route.params;
  const selectedTemplate = useProClipsStore((state) => state.selectedTemplate);
  const sceneUploads = useProClipsStore((state) => state.sceneUploads);
  const setSceneUpload = useProClipsStore((state) => state.setSceneUpload);
  const [currentSceneIndex, setCurrentSceneIndex] = useState(0);
  const [uploading, setUploading] = useState(false);

  const template = selectedTemplate as ProClipsTemplate | undefined;
  const scenes = template?.scenes || [];
  const uploadedCount = sceneUploads.filter((item) => item.status === 'uploaded').length;

  const activeScene = useMemo(() => scenes[currentSceneIndex], [scenes, currentSceneIndex]);

  const handleCaptureScene = async () => {
    if (!template || Platform.OS === 'web') {
      navigation.navigate('ProClipsProductInfo', route.params);
      return;
    }

    try {
      setUploading(true);
      const ImagePicker = await import('expo-image-picker');
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        setUploading(false);
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Videos,
        quality: 0.7,
        videoMaxDuration: 30,
      });

      if (result.canceled || !result.assets?.[0]) {
        setUploading(false);
        return;
      }

      const asset = result.assets[0];
      const fileName = asset.fileName || `proclips_scene_${currentSceneIndex + 1}.mp4`;
      // Try presigned upload flow first
      const presign = await generateUploadUrl(template.id, currentSceneIndex, fileName);
      if (presign && presign.uploadUrl) {
        try {
          const FileSystem = await import('expo-file-system');
          await FileSystem.uploadAsync(presign.uploadUrl, asset.uri, { httpMethod: 'PUT' });
          await confirmSceneUpload(template.id, currentSceneIndex, presign.key);
          setSceneUpload({
            sceneIndex: currentSceneIndex,
            uri: asset.uri,
            remoteUrl: presign.uploadUrl,
            status: 'uploaded',
          });
        } catch (err) {
          console.warn('[ProClipsSceneUpload] presigned upload failed, falling back', err);
          const uploadResult = await uploadSceneClip(template.id, currentSceneIndex, asset.uri, fileName);
          setSceneUpload({
            sceneIndex: currentSceneIndex,
            uri: asset.uri,
            remoteUrl: uploadResult.remoteUrl,
            status: 'uploaded',
          });
        }
      } else {
        const uploadResult = await uploadSceneClip(template.id, currentSceneIndex, asset.uri, fileName);
        setSceneUpload({
          sceneIndex: currentSceneIndex,
          uri: asset.uri,
          remoteUrl: uploadResult.remoteUrl,
          status: 'uploaded',
        });
      }

      setCurrentSceneIndex((prev) => Math.min(prev + 1, scenes.length - 1));
    } catch (error) {
      console.warn('[ProClipsSceneUpload] capture failed', error);
    } finally {
      setUploading(false);
    }
  };

  const handleSkip = () => {
    navigation.navigate('ProClipsProductInfo', route.params);
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text variant="headlineMedium" style={styles.title}>{title} · 上传素材</Text>
      <Text style={styles.subtitle}>请按照分镜指引拍摄并上传素材，当前镜头完成后可进入下一步。</Text>

      <Card style={styles.card}>
        <Card.Content>
          {scenes.map((scene, index) => {
            const upload = sceneUploads.find((item) => item.sceneIndex === index);
            return (
              <List.Item
                key={scene}
                title={`${index + 1}. ${scene}`}
                description={upload?.status === 'uploaded' ? '已上传' : index === currentSceneIndex ? '当前拍摄' : '待拍摄'}
                left={() => <Text style={styles.sceneIndex}>{index + 1}</Text>}
              />
            );
          })}
        </Card.Content>
      </Card>

      <Button
        mode="contained"
        onPress={handleCaptureScene}
        loading={uploading}
        disabled={uploading || !template}
        style={styles.actionButton}
      >
        {uploading ? '正在拍摄...' : `拍摄 ${activeScene || '素材'}`}
      </Button>

      <Button
        mode="outlined"
        onPress={handleSkip}
        style={styles.secondaryButton}
      >
        跳过素材上传，直接填写商品信息
      </Button>

      <Text style={styles.footerText}>已完成 {uploadedCount} / {scenes.length} 个镜头</Text>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#fff',
  },
  title: {
    marginBottom: 10,
    color: '#1f2937',
    fontWeight: '700',
  },
  subtitle: {
    marginBottom: 18,
    color: '#4b5563',
    lineHeight: 22,
  },
  card: {
    borderRadius: 16,
    marginBottom: 20,
  },
  sceneIndex: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#6366f1',
    color: '#fff',
    textAlign: 'center',
    lineHeight: 28,
    fontWeight: '700',
    marginRight: 12,
  },
  actionButton: {
    borderRadius: 14,
    paddingVertical: 8,
    marginBottom: 12,
  },
  secondaryButton: {
    borderRadius: 14,
    paddingVertical: 8,
  },
  footerText: {
    marginTop: 16,
    color: '#6b7280',
  },
});

export default ProClipsSceneUploadScreen;
