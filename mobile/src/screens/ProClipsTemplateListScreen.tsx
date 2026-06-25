import React from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { Text, Card } from 'react-native-paper';
import type { AppScreenProps } from '../types/navigation';
import { useProClipsStore } from '../stores/ProClipsStore';
import { TEMPLATES } from '../services/ProClipsService';

const TEMPLATE_DATA = TEMPLATES;

const ProClipsTemplateListScreen: React.FC<AppScreenProps<'ProClipsTemplateList'>> = ({ navigation }) => {
  const setSelectedTemplate = useProClipsStore((state) => state.setSelectedTemplate);

  const renderItem = ({ item }: { item: typeof TEMPLATE_DATA[number] }) => (
    <TouchableOpacity
      onPress={() => {
        setSelectedTemplate(item);
        navigation.navigate('ProClipsTemplateDetail', { templateId: item.id, title: item.title });
      }}
      activeOpacity={0.8}
      style={styles.itemWrapper}
    >
      <Card style={styles.card}>
        <Card.Content>
          <Text variant="titleMedium" style={styles.title}>{item.title}</Text>
          <Text variant="bodyMedium" style={styles.description}>{item.description}</Text>
          <Text variant="bodySmall" style={styles.scenes}>分镜：{item.scenes.join(' / ')}</Text>
        </Card.Content>
      </Card>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <Text variant="headlineMedium" style={styles.heading}>选择视频模板</Text>
      <FlatList
        data={TEMPLATE_DATA}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f6f5ff',
    padding: 16,
  },
  heading: {
    marginBottom: 16,
    color: '#2d2b8a',
    fontWeight: '700',
  },
  listContent: {
    paddingBottom: 24,
  },
  itemWrapper: {
    marginBottom: 14,
  },
  card: {
    borderRadius: 16,
    elevation: 2,
  },
  title: {
    marginBottom: 8,
    color: '#191919',
  },
  description: {
    color: '#52525b',
    marginBottom: 10,
  },
  scenes: {
    color: '#7c3aed',
  },
});

export default ProClipsTemplateListScreen;
