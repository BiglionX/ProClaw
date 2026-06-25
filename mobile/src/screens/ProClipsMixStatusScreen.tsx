import React, { useEffect, useState } from 'react';
import { StyleSheet, ScrollView } from 'react-native';
import { Text, ProgressBar, Button, Card, ActivityIndicator } from 'react-native-paper';
import type { AppScreenProps } from '../types/navigation';
import { useProClipsStore } from '../stores/ProClipsStore';
import { getMixTaskStatus } from '../services/ProClipsService';

const ProClipsMixStatusScreen: React.FC<AppScreenProps<'ProClipsMixStatus'>> = ({ navigation }) => {
  const mixTask = useProClipsStore((state) => state.mixTask);
  const setMixTask = useProClipsStore((state) => state.setMixTask);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;

    const pollStatus = async () => {
      if (!mixTask) return;
      setLoading(true);
      const status = await getMixTaskStatus(mixTask.taskId, mixTask.progress || 0);
      setMixTask({ ...mixTask, ...status });
      setLoading(false);
      if (status.status === 'processing') {
        timer = setTimeout(pollStatus, 3000);
      }
    };

    if (mixTask && mixTask.status !== 'completed') {
      pollStatus();
    }

    return () => {
      if (timer) {
        clearTimeout(timer);
      }
    };
  }, [mixTask, setMixTask]);

  if (!mixTask) {
    return (
      <ScrollView contentContainerStyle={styles.container}>
        <Text variant="headlineMedium" style={styles.title}>未找到混剪任务</Text>
        <Text style={styles.subtitle}>请返回上一步重新提交。</Text>
        <Button mode="contained" onPress={() => navigation.navigate('ProClipsVoiceSample')} style={styles.actionButton}>
          返回上一步
        </Button>
      </ScrollView>
    );
  }

  const progress = mixTask.progress ?? 0;
  const completed = mixTask.status === 'completed';

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text variant="headlineMedium" style={styles.title}>{completed ? '混剪完成' : '混剪生成中'}</Text>
      <Text style={styles.subtitle}>{completed ? '恭喜，视频已生成。' : '视频正在生成，请耐心等待。生成完成后会在成品视频列表中通知你。'}</Text>

      <Card style={styles.card}>
        <Card.Content>
          <Text style={styles.stepText}>当前状态：{mixTask.status}</Text>
          <ProgressBar progress={progress} style={styles.progress} />
          <Text style={styles.percentText}>{Math.round(progress * 100)}% 完成</Text>
          {loading ? <ActivityIndicator animating style={{ marginTop: 12 }} /> : null}
          {mixTask.errorMessage ? <Text style={styles.errorText}>{mixTask.errorMessage}</Text> : null}
        </Card.Content>
      </Card>

      <Button
        mode={completed ? 'contained' : 'outlined'}
        onPress={() => navigation.navigate('ProClipsHome')}
        style={styles.actionButton}
      >
        {completed ? '返回 ProClips 首页' : '稍后查看进度'}
      </Button>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#eef2ff',
  },
  title: {
    marginBottom: 10,
    color: '#2c2b8a',
    fontWeight: '700',
  },
  subtitle: {
    marginBottom: 18,
    color: '#4b5563',
    lineHeight: 22,
  },
  card: {
    borderRadius: 16,
    marginBottom: 24,
  },
  stepText: {
    marginBottom: 16,
    color: '#111827',
  },
  progress: {
    height: 10,
    borderRadius: 8,
    backgroundColor: '#dbeafe',
  },
  percentText: {
    marginTop: 10,
    color: '#4b5563',
    fontWeight: '700',
  },
  actionButton: {
    borderRadius: 14,
    paddingVertical: 8,
  },
  errorText: {
    marginTop: 12,
    color: '#b91c1c',
  },
});

export default ProClipsMixStatusScreen;
