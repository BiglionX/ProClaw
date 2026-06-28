import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Button, Card, Divider } from 'react-native-paper';
import type { AppScreenProps } from '../types/navigation';

const STEPS = [
  '选择模板',
  '上传素材',
  '填写商品信息',
  '确认文案',
  '录制音色',
  '生成混剪',
];

const ProClipsWorkflowScreen: React.FC<AppScreenProps<'ProClipsWorkflow'>> = ({ route, navigation }) => {
  const { title } = route.params;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text variant="headlineMedium" style={styles.title}>{title} · 制作流程</Text>
      <Text style={styles.subtitle}>以下是 ProClips 拍摄与生成的标准流程，按顺序完成即可获得成品视频。</Text>

      {STEPS.map((step, index) => (
        <Card key={step} style={styles.stepCard}>
          <Card.Content>
            <Text style={styles.stepIndex}>Step {index + 1}</Text>
            <Text style={styles.stepText}>{step}</Text>
          </Card.Content>
        </Card>
      ))}

      <Divider style={styles.divider} />
      <Button
        mode="contained"
        onPress={() => navigation.navigate('ProClipsSceneUpload', route.params)}
        style={styles.actionButton}
      >
        开始上传素材
      </Button>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#f7f6ff',
  },
  title: {
    marginBottom: 10,
    color: '#2c2b8a',
    fontWeight: '700',
  },
  subtitle: {
    marginBottom: 20,
    color: '#4b5563',
    lineHeight: 22,
  },
  stepCard: {
    marginBottom: 14,
    borderRadius: 14,
  },
  stepIndex: {
    marginBottom: 8,
    color: '#7c3aed',
    fontWeight: '700',
  },
  stepText: {
    color: '#111827',
    fontSize: 16,
  },
  divider: {
    marginVertical: 24,
  },
  actionButton: {
    borderRadius: 14,
    paddingVertical: 8,
  },
});

export default ProClipsWorkflowScreen;
