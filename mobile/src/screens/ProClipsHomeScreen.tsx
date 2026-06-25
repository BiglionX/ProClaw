import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import type { AppScreenProps } from '../types/navigation';

const ProClipsHomeScreen: React.FC<AppScreenProps<'ProClipsHome'>> = ({ navigation }) => {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>ProClips · 拍可丽</Text>
      <Text style={styles.subtitle}>AI 视频营销助手，帮助商家实现短视频拍摄、文案生成和自动混剪。</Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>1. 模板选择</Text>
        <Text style={styles.cardText}>根据行业推荐短视频模板，包含分镜、拍摄指引和参考样例。</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>2. 拍摄引导</Text>
        <Text style={styles.cardText}>逐镜头引导拍摄，上传素材后自动进入下一步。</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>3. 文案与音色</Text>
        <Text style={styles.cardText}>AI 生成营销文案，支持商家录制专属音色。</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>4. 混剪成片</Text>
        <Text style={styles.cardText}>提交混剪任务，生成带配音、字幕、Logo、BGM 的成品视频。</Text>
      </View>

      <TouchableOpacity
        style={styles.actionButton}
        onPress={() => navigation.navigate('ProClipsTemplateList')}
      >
        <Text style={styles.actionText}>开始使用 ProClips</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#333',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 24,
    lineHeight: 24,
  },
  card: {
    backgroundColor: '#f8f7ff',
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    borderColor: '#e6e0ff',
    borderWidth: 1,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2c2b8a',
    marginBottom: 8,
  },
  cardText: {
    fontSize: 14,
    color: '#555',
    lineHeight: 20,
  },
  actionButton: {
    marginTop: 16,
    backgroundColor: '#6366f1',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
  },
  actionText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});

export default ProClipsHomeScreen;
