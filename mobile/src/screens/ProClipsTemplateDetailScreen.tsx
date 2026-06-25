import React, { useEffect } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Button, Chip } from 'react-native-paper';
import type { AppScreenProps } from '../types/navigation';
import { useProClipsStore } from '../stores/ProClipsStore';
import { getTemplateById } from '../services/ProClipsService';

const TEMPLATE_DATA = [
  {
    id: 'tpl_1',
    title: '餐饮新品推广',
    description: '适用于菜品展示与门店氛围展示的短视频模板。',
    scenes: ['开场口播', '菜品特写', '环境展示', '优惠信息'],
    duration: '15-30秒',
    sample: '适合餐饮、火锅、甜品等门店宣传。',
  },
  {
    id: 'tpl_2',
    title: '美业门店宣传',
    description: '适用于美发/美甲/美容门店的个人 IP 营销短视频。',
    scenes: ['店铺介绍', '服务展示', '效果前后', '优惠卡片'],
    duration: '15-30秒',
    sample: '适合美发、美容、SPA 等商家。',
  },
  {
    id: 'tpl_3',
    title: '零售热销爆款',
    description: '适用于商品展示、推荐理由和购买引导的视频模板。',
    scenes: ['商品展示', '核心卖点', '使用场景', '结尾促单'],
    duration: '15-30秒',
    sample: '适合零售、小商品、快消品推广。',
  },
];

const ProClipsTemplateDetailScreen: React.FC<AppScreenProps<'ProClipsTemplateDetail'>> = ({ route, navigation }) => {
  const { templateId } = route.params;
  const setSelectedTemplate = useProClipsStore((state) => state.setSelectedTemplate);
  const template = getTemplateById(templateId);

  useEffect(() => {
    if (template) {
      setSelectedTemplate(template);
    }
  }, [template, setSelectedTemplate]);

  if (!template) {
    return (
      <View style={styles.container}>
        <Text variant="headlineSmall" style={styles.title}>模板未找到</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text variant="headlineMedium" style={styles.title}>{template.title}</Text>
      <Text variant="bodyMedium" style={styles.description}>{template.description}</Text>
      <View style={styles.infoRow}>
        <Chip style={styles.chip}>{template.duration}</Chip>
        <Chip style={styles.chip}>适用场景</Chip>
      </View>
      <Text variant="titleMedium" style={styles.sectionTitle}>分镜流程</Text>
      {template.scenes.map((scene, index) => (
        <View key={scene} style={styles.sceneItem}>
          <Text style={styles.sceneIndex}>{index + 1}</Text>
          <Text style={styles.sceneText}>{scene}</Text>
        </View>
      ))}
      <Text variant="titleMedium" style={styles.sectionTitle}>使用说明</Text>
      <Text style={styles.sectionText}>{template.sample}</Text>
      <Button
        mode="contained"
        onPress={() => navigation.navigate('ProClipsWorkflow', route.params)}
        style={styles.actionButton}
      >
        选择该模板并开始
      </Button>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#f8f7ff',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#201c5c',
    marginBottom: 10,
  },
  description: {
    fontSize: 16,
    color: '#4b5563',
    marginBottom: 18,
    lineHeight: 24,
  },
  infoRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 18,
  },
  chip: {
    marginBottom: 8,
    backgroundColor: '#ede9fe',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#312e81',
    marginTop: 12,
    marginBottom: 10,
  },
  sceneItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: '#ffffff',
    borderRadius: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  sceneIndex: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#c7d2fe',
    color: '#312e81',
    textAlign: 'center',
    lineHeight: 28,
    fontWeight: '700',
    marginRight: 12,
  },
  sceneText: {
    flex: 1,
    color: '#1f2937',
  },
  sectionText: {
    color: '#4b5563',
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 24,
  },
  actionButton: {
    marginTop: 8,
    borderRadius: 14,
    backgroundColor: '#6366f1',
  },
});

export default ProClipsTemplateDetailScreen;
