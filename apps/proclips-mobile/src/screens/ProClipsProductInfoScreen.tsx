/**
 * ProClipsProductInfoScreen - 商品信息
 *
 * 对应原型 page-product-info：导航栏 + 5 字段表单 + 底部 CTA
 * 字段：商品名称 / 核心卖点(chips+输入) / 优惠信息 / 活动时间 / 门店地址
 * 表单绑定 store 的 productInfo / setProductInfo
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import type { AppScreenProps } from '../types/navigation';
import { colors, gradients, radius } from '../components/Theme';
import { useProClipsStore } from '../stores/ProClipsStore';

const ProClipsProductInfoScreen: React.FC<AppScreenProps<'ProClipsProductInfo'>> = ({
  route,
  navigation,
}) => {
  const { templateId, title } = route.params;
  const productInfo = useProClipsStore((s) => s.productInfo);
  const setProductInfo = useProClipsStore((s) => s.setProductInfo);

  const [name, setName] = useState(productInfo.name);
  const [features, setFeatures] = useState<string[]>(productInfo.features);
  const [featureInput, setFeatureInput] = useState('');
  const [promo, setPromo] = useState(productInfo.promo);
  const [activeTime, setActiveTime] = useState(productInfo.activeTime);
  const [storeAddress, setStoreAddress] = useState(productInfo.storeAddress);

  const canSubmit = name.trim().length > 0 && features.length > 0;

  // 追加卖点（回车确认）
  const addFeature = () => {
    const v = featureInput.trim();
    if (v.length === 0) return;
    setFeatures((prev) => [...prev, v]);
    setFeatureInput('');
  };

  const delFeature = (idx: number) => {
    setFeatures((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleNext = () => {
    setProductInfo({ name, features, promo, activeTime, storeAddress });
    navigation.navigate('ProClipsScriptReview', { templateId, title });
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* 导航栏 */}
      <View style={styles.navBar}>
        <TouchableOpacity
          style={styles.iconBtn}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Text style={styles.backChar}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.navTitle}>{`商品信息`}</Text>
        <View style={styles.iconBtn} />
      </View>

      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.body}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* 商品名称 */}
          <View style={styles.formGroup}>
          <Text style={styles.formLabel}>
            <Text>{`商品名称 `}</Text>
            <Text style={styles.req}>*</Text>
          </Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="如：招牌麻辣锅底"
            placeholderTextColor={colors.txt3}
            style={styles.input}
            {...Platform.select({ web: { outlineStyle: 'none' as any } })}
          />
          <Text style={styles.formHint}>{`填写你要主推的商品全名`}</Text>
        </View>

          {/* 核心卖点（chips + 输入） */}
          <View style={styles.formGroup}>
          <Text style={styles.formLabel}>
            <Text>{`核心卖点 `}</Text>
            <Text style={styles.req}>*</Text>
          </Text>
          <View style={styles.tagInputWrap}>
            {features.map((s, i) => (
              <View key={`${s}-${i}`} style={styles.sellpointTag}>
                <Text style={styles.sellpointText}>{s}</Text>
                <TouchableOpacity
                  onPress={() => delFeature(i)}
                  hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                >
                  <Text style={styles.sellpointX}>{`✕`}</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
          <TextInput
            value={featureInput}
            onChangeText={setFeatureInput}
            placeholder="+ 添加卖点（回车确认）"
            placeholderTextColor={colors.txt3}
            style={[styles.input, { marginTop: 8 }]}
            returnKeyType="done"
            onSubmitEditing={addFeature}
            blurOnSubmit={false}
            {...Platform.select({ web: { outlineStyle: 'none' as any } })}
          />
          <Text style={styles.formHint}>{`建议 1-2 个，突出差异化`}</Text>
        </View>

          {/* 优惠信息 */}
          <View style={styles.formGroup}>
          <Text style={styles.formLabel}>{`优惠信息`}</Text>
          <TextInput
            value={promo}
            onChangeText={setPromo}
            placeholder="如：周末双人套餐 5 折，进店报「老王视频」锅底免单"
            placeholderTextColor={colors.txt3}
            style={[styles.input, styles.inputMulti]}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
            {...Platform.select({ web: { outlineStyle: 'none' as any } })}
          />
        </View>

          {/* 活动时间 */}
          <View style={styles.formGroup}>
          <Text style={styles.formLabel}>{`活动时间`}</Text>
          <TextInput
            value={activeTime}
            onChangeText={setActiveTime}
            placeholder="如：本周五 - 周日（3 天）"
            placeholderTextColor={colors.txt3}
            style={styles.input}
            {...Platform.select({ web: { outlineStyle: 'none' as any } })}
          />
        </View>

          {/* 门店地址 */}
          <View style={styles.formGroup}>
          <Text style={styles.formLabel}>{`门店地址`}</Text>
          <TextInput
            value={storeAddress}
            onChangeText={setStoreAddress}
            placeholder="如：万达广场 3 楼 · 老王火锅店"
            placeholderTextColor={colors.txt3}
            style={styles.input}
            {...Platform.select({ web: { outlineStyle: 'none' as any } })}
          />
        </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* 底部 CTA 栏 */}
      <View style={styles.ctaBar}>
        <TouchableOpacity activeOpacity={0.95} onPress={handleNext} disabled={!canSubmit}>
          <LinearGradient
            colors={[...gradients.main]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[styles.ctaBtn, !canSubmit && styles.ctaBtnDisabled]}
          >
            <Text style={styles.ctaText}>{`生成文案 →`}</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bgDeep },
  // 导航栏
  navBar: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    backgroundColor: colors.bgDeep,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  iconBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  backChar: { fontSize: 30, color: colors.txt1, fontWeight: '300', marginTop: -6 },
  navTitle: { flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '700', color: colors.txt1 },
  // 内容
  container: { flex: 1 },
  body: { padding: 16, paddingBottom: 120 },
  // 表单
  formGroup: { marginBottom: 16 },
  formLabel: { fontSize: 13, fontWeight: '600', color: colors.txt1, marginBottom: 7 },
  req: { color: colors.magenta },
  input: {
    backgroundColor: colors.bgCard,
    borderRadius: 12,
    paddingVertical: 13,
    paddingHorizontal: 14,
    color: colors.txt1,
    fontSize: 14,
    borderWidth: 1,
    borderColor: colors.line,
  },
  inputMulti: { minHeight: 90, lineHeight: 22, paddingTop: 13 },
  formHint: { fontSize: 11, color: colors.txt3, marginTop: 5 },
  // 卖点 chips
  tagInputWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
    padding: 9,
    backgroundColor: colors.bgCard,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.line,
  },
  sellpointTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255,107,157,0.14)',
    borderRadius: 20,
    paddingVertical: 5,
    paddingHorizontal: 11,
  },
  sellpointText: { color: colors.magenta, fontSize: 12, fontWeight: '600' },
  sellpointX: { color: colors.magenta, fontSize: 11, opacity: 0.6 },
  // 底部 CTA
  ctaBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.bgDeep,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  ctaBtn: {
    borderRadius: radius.lg,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaBtnDisabled: { opacity: 0.5 },
  ctaText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});

export default ProClipsProductInfoScreen;
