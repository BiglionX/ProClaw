import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Button, Card, ActivityIndicator } from 'react-native-paper';
import type { AppScreenProps } from '../types/navigation';
import { useProClipsStore } from '../stores/ProClipsStore';
import { generateScript } from '../services/ProClipsService';

const ProClipsScriptReviewScreen: React.FC<AppScreenProps<'ProClipsScriptReview'>> = ({ route, navigation }) => {
  const { title } = route.params;
  const selectedTemplate = useProClipsStore((state) => state.selectedTemplate);
  const productInfo = useProClipsStore((state) => state.productInfo);
  const generatedScript = useProClipsStore((state) => state.generatedScript);
  const setGeneratedScript = useProClipsStore((state) => state.setGeneratedScript);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadScript = async () => {
      if (!selectedTemplate) return;
      if (generatedScript) return;
      setLoading(true);
      const script = await generateScript(selectedTemplate, productInfo);
      setGeneratedScript(script);
      setLoading(false);
    };
    loadScript();
  }, [selectedTemplate, productInfo, generatedScript, setGeneratedScript]);

  if (!selectedTemplate) {
    return (
      <View style={styles.container}>
        <Text variant="headlineSmall" style={styles.title}>未选择模板</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text variant="headlineMedium" style={styles.title}>{title} · 文案确认</Text>
      <Text style={styles.subtitle}>请阅读并确认 AI 生成的文案，后续会作为视频配音与字幕内容。</Text>

      <Card style={styles.card}>
        <Card.Content>
          {loading ? (
            <ActivityIndicator animating />
          ) : (
            <Text style={styles.scriptText}>{generatedScript || '正在生成文案，请稍候...'}</Text>
          )}
        </Card.Content>
      </Card>

      <Button
        mode="contained"
        onPress={() => navigation.navigate('ProClipsVoiceSample')}
        style={styles.actionButton}
        disabled={loading || !generatedScript}
      >
        确认文案并继续录音
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
    color: '#2d2b8a',
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
    padding: 10,
  },
  scriptText: {
    color: '#111827',
    lineHeight: 24,
    fontSize: 15,
  },
  actionButton: {
    borderRadius: 14,
    paddingVertical: 8,
  },
});

export default ProClipsScriptReviewScreen;
