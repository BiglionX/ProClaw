import React, { useState, useEffect } from 'react';
import { StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { Text, Button, TextInput } from 'react-native-paper';
import type { AppScreenProps } from '../types/navigation';
import { useProClipsStore } from '../stores/ProClipsStore';

const ProClipsProductInfoScreen: React.FC<AppScreenProps<'ProClipsProductInfo'>> = ({ route, navigation }) => {
  const { title } = route.params;
  const productInfo = useProClipsStore((state) => state.productInfo);
  const setProductInfo = useProClipsStore((state) => state.setProductInfo);
  const [name, setName] = useState(productInfo.name);
  const [features, setFeatures] = useState(productInfo.features);
  const [price, setPrice] = useState(productInfo.price);

  useEffect(() => {
    setName(productInfo.name);
    setFeatures(productInfo.features);
    setPrice(productInfo.price);
  }, [productInfo]);

  const handleSave = () => {
    setProductInfo({ name, features, price });
    navigation.navigate('ProClipsScriptReview', route.params);
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.wrapper}
    >
      <ScrollView contentContainerStyle={styles.container}>
        <Text variant="headlineMedium" style={styles.title}>{title} · 商品信息</Text>
        <Text style={styles.subtitle}>填写商品名称、卖点与价格，生成视频文案时将自动应用这些信息。</Text>

        <TextInput
          label="商品名称"
          value={name}
          onChangeText={setName}
          style={styles.input}
          mode="outlined"
        />
        <TextInput
          label="商品卖点"
          value={features}
          onChangeText={setFeatures}
          style={styles.input}
          mode="outlined"
          multiline
          numberOfLines={3}
        />
        <TextInput
          label="参考价格"
          value={price}
          onChangeText={setPrice}
          style={styles.input}
          mode="outlined"
        />

        <Button
          mode="contained"
          onPress={handleSave}
          style={styles.actionButton}
          disabled={!name.trim() || !features.trim()}
        >
          保存并继续
        </Button>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    backgroundColor: '#f8f7ff',
  },
  container: {
    padding: 20,
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
  input: {
    marginBottom: 16,
    backgroundColor: '#fff',
  },
  actionButton: {
    borderRadius: 14,
    paddingVertical: 8,
  },
});

export default ProClipsProductInfoScreen;
