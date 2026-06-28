/**
 * ProClipsIncentiveSettingsScreen - 推广激励设置
 *
 * 对应原型 incentive-sheet（改为独立页面）：
 *   导航栏（返回 + 推广激励 + 保存）
 *   + 视频信息卡
 *   + 5 种激励项（可启用切换 + 展开字段输入）：
 *     1. CPS 比例佣金：佣金比例% + 最低保底¥（可选）
 *     2. 固定佣金：每单金额¥
 *     3. 阶梯佣金：3 档（min-max 单, rate%）
 *     4. CPM 播放奖励：每千次¥ + 封顶¥（可选）
 *     5. 达标奖金：类型(订单/播放) + 阈值 + 金额¥
 *   + 叠加预览（已启用激励摘要 tags）
 *   + 底部 CTA：保存（至少启用一种）+ 设为私密
 */
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { AppScreenProps } from '../types/navigation';
import { colors, radius } from '../components/Theme';
import {
  MOCK_VIDEOS, defaultIncentive,
  type IncentiveConfig,
} from '../services/ProClipsService';

type IncKey = 'cps' | 'fixed' | 'tiered' | 'cpm' | 'bonus';

const ProClipsIncentiveSettingsScreen: React.FC<AppScreenProps<'ProClipsIncentiveSettings'>> = ({ navigation, route }) => {
  const videoId = route.params?.videoId;
  const video = MOCK_VIDEOS.find((v) => v.id === videoId) || MOCK_VIDEOS[0];

  const [inc, setInc] = useState<IncentiveConfig>(defaultIncentive);

  const toggleEnabled = (key: IncKey) => {
    setInc((prev) => ({
      ...prev,
      [key]: { ...prev[key], enabled: !prev[key].enabled },
    }));
  };

  const setField = <K extends IncKey>(key: K, field: keyof IncentiveConfig[K], value: string) => {
    const num = Number(value) || 0;
    setInc((prev) => ({
      ...prev,
      [key]: { ...prev[key], [field]: num },
    }));
  };

  const setTierField = (i: number, field: 'min' | 'max' | 'rate', value: string) => {
    const num = Number(value) || 0;
    setInc((prev) => ({
      ...prev,
      tiered: {
        ...prev.tiered,
        tiers: prev.tiered.tiers.map((t, idx) => (idx === i ? { ...t, [field]: num } : t)),
      },
    }));
  };

  const setBonusType = (type: 'orders' | 'plays') => {
    setInc((prev) => ({ ...prev, bonus: { ...prev.bonus, type } }));
  };

  const anyEnabled = inc.cps.enabled || inc.fixed.enabled || inc.tiered.enabled || inc.cpm.enabled || inc.bonus.enabled;

  const handleSave = () => {
    if (!anyEnabled) {
      Alert.alert('提示', '请至少启用一种激励方式', [{ text: '好的' }]);
      return;
    }
    Alert.alert('已保存', '已公开，达人可分销（mock）', [{ text: '好的', onPress: () => navigation.goBack() }]);
  };

  const handleUnpublish = () => {
    Alert.alert('设为私密', '确定要设为私密吗？达人将无法分销', [
      { text: '取消', style: 'cancel' },
      { text: '确认', style: 'destructive', onPress: () => navigation.goBack() },
    ]);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* 导航栏 */}
      <View style={styles.navBar}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.navArrow}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.navTitle}>推广激励</Text>
        <TouchableOpacity style={styles.navSave} onPress={handleSave}>
          <Text style={styles.navSaveText}>保存</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.container} contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        {/* 视频信息卡 */}
        <View style={styles.videoCard}>
          <View style={[styles.videoThumb, { backgroundColor: video.coverColor }]}>
            <Text style={styles.videoPlay}>▶</Text>
          </View>
          <View style={styles.videoInfo}>
            <Text style={styles.videoTitle} numberOfLines={1}>{video.title}</Text>
            <Text style={styles.videoMeta}>{video.duration} · {video.createdAt}</Text>
          </View>
        </View>

        {/* 5 种激励项 */}
        {/* CPS */}
        <IncItem
          icon="💰" name="比例佣金" tag="CPS" desc="订单金额的百分比，最常用"
          color={colors.cyan} glow="rgba(0,210,255,0.16)"
          enabled={inc.cps.enabled} onToggle={() => toggleEnabled('cps')}
        >
          <Field label="佣金比例">
            <NumberInput value={String(inc.cps.rate)} onChange={(v) => setField('cps', 'rate', v)} suffix="%" />
          </Field>
          <Field label="最低保底" optional>
            <NumberInput value={String(inc.cps.minGuarantee || 0)} onChange={(v) => setField('cps', 'minGuarantee', v)} prefix="¥" />
          </Field>
        </IncItem>

        {/* 固定佣金 */}
        <IncItem
          icon="🎯" name="固定佣金" tag="FIXED" desc="每笔订单固定金额，适合低价商品"
          color={colors.amber} glow="rgba(255,181,71,0.16)"
          enabled={inc.fixed.enabled} onToggle={() => toggleEnabled('fixed')}
        >
          <Field label="每单金额">
            <NumberInput value={String(inc.fixed.amount)} onChange={(v) => setField('fixed', 'amount', v)} prefix="¥" />
          </Field>
        </IncItem>

        {/* 阶梯佣金 */}
        <IncItem
          icon="📊" name="阶梯佣金" tag="TIERED" desc="按订单量分档，激励冲量"
          color={colors.purple} glow="rgba(168,85,247,0.18)"
          enabled={inc.tiered.enabled} onToggle={() => toggleEnabled('tiered')}
        >
          {inc.tiered.tiers.map((t, i) => (
            <View key={i} style={styles.tierRow}>
              <Text style={styles.tierLabel}>第 {i + 1} 档</Text>
              <View style={styles.tierInputs}>
                <NumberInput value={String(t.min)} onChange={(v) => setTierField(i, 'min', v)} mini />
                <Text style={styles.tierSep}>-</Text>
                <NumberInput value={t.max >= 9999 ? '' : String(t.max)} placeholder="∞" onChange={(v) => setTierField(i, 'max', v)} mini />
                <Text style={styles.tierUnit}>单</Text>
                <NumberInput value={String(t.rate)} onChange={(v) => setTierField(i, 'rate', v)} mini />
                <Text style={styles.tierUnit}>%</Text>
              </View>
            </View>
          ))}
        </IncItem>

        {/* CPM */}
        <IncItem
          icon="👁️" name="播放奖励" tag="CPM" desc="达到播放量给固定奖金"
          color="#22d3ee" glow="rgba(34,211,238,0.16)"
          enabled={inc.cpm.enabled} onToggle={() => toggleEnabled('cpm')}
        >
          <Field label="每千次播放">
            <NumberInput value={String(inc.cpm.per1k)} onChange={(v) => setField('cpm', 'per1k', v)} prefix="¥" />
          </Field>
          <Field label="封顶" optional>
            <NumberInput value={String(inc.cpm.cap || 0)} onChange={(v) => setField('cpm', 'cap', v)} prefix="¥" />
          </Field>
        </IncItem>

        {/* 达标奖金 */}
        <IncItem
          icon="🏆" name="达标奖金" tag="BONUS" desc="达到订单/播放数给一次性奖金"
          color={colors.yellow} glow="rgba(251,191,36,0.18)"
          enabled={inc.bonus.enabled} onToggle={() => toggleEnabled('bonus')}
        >
          <Field label="达标条件">
            <View style={styles.bonusTypeRow}>
              <TouchableOpacity
                style={[styles.bonusTypeBtn, inc.bonus.type === 'orders' && styles.bonusTypeBtnActive]}
                activeOpacity={0.7}
                onPress={() => setBonusType('orders')}
              >
                <Text style={[styles.bonusTypeText, inc.bonus.type === 'orders' && styles.bonusTypeTextActive]}>订单数 ≥</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.bonusTypeBtn, inc.bonus.type === 'plays' && styles.bonusTypeBtnActive]}
                activeOpacity={0.7}
                onPress={() => setBonusType('plays')}
              >
                <Text style={[styles.bonusTypeText, inc.bonus.type === 'plays' && styles.bonusTypeTextActive]}>播放数 ≥</Text>
              </TouchableOpacity>
              <NumberInput value={String(inc.bonus.threshold)} onChange={(v) => setField('bonus', 'threshold', v)} />
            </View>
          </Field>
          <Field label="奖金金额">
            <NumberInput value={String(inc.bonus.amount)} onChange={(v) => setField('bonus', 'amount', v)} prefix="¥" />
          </Field>
        </IncItem>

        {/* 叠加预览已移除（对齐原型：激励面板内无预览卡） */}
      </ScrollView>

      {/* 底部 CTA */}
      <View style={styles.ctaBar}>
        <TouchableOpacity style={styles.btnUnpublish} activeOpacity={0.7} onPress={handleUnpublish}>
          <Text style={styles.btnUnpublishText}>设为私密</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.btnSave, !anyEnabled && styles.btnSaveDisabled]} activeOpacity={0.7} onPress={handleSave} disabled={!anyEnabled}>
          <Text style={styles.btnSaveText}>保存并公开</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

export default ProClipsIncentiveSettingsScreen;

// ============ 激励项 ============
function IncItem({
  icon, name, tag, desc, color, glow, enabled, onToggle, children,
}: {
  icon: string;
  name: string;
  tag: string;
  desc: string;
  color: string;
  glow: string;
  enabled: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <View
      style={[
        styles.incItem,
        enabled && {
          borderColor: color,
          shadowColor: color,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.28,
          shadowRadius: 6,
          elevation: 5,
        },
      ]}
    >
      <TouchableOpacity style={styles.incItemHead} activeOpacity={0.7} onPress={onToggle}>
        <View style={[styles.incCheck, enabled && { backgroundColor: color, borderColor: color }]}>
          {enabled && <Text style={styles.incCheckIcon}>✓</Text>}
        </View>
        {/* 36x36 彩色图标盒 */}
        <View style={[styles.incIcon, { backgroundColor: glow }]}>
          <Text style={styles.incIconText}>{icon}</Text>
        </View>
        <View style={styles.incItemInfo}>
          <Text style={styles.incItemName}>
            {name}{' '}
            <Text style={[styles.incItemTag, { color, backgroundColor: glow }]}>{tag}</Text>
          </Text>
          <Text style={styles.incItemDesc}>{desc}</Text>
        </View>
      </TouchableOpacity>
      {enabled && (
        <View style={styles.incItemBody}>
          <View style={styles.incFields}>{children}</View>
        </View>
      )}
    </View>
  );
}

function Field({ label, optional, children }: { label: string; optional?: boolean; children: React.ReactNode }) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>
        {label} {optional && <Text style={styles.fieldOpt}>可选</Text>}
      </Text>
      {children}
    </View>
  );
}

function NumberInput({
  value, onChange, prefix, suffix, placeholder, mini,
}: {
  value: string;
  onChange: (v: string) => void;
  prefix?: string;
  suffix?: string;
  placeholder?: string;
  mini?: boolean;
}) {
  return (
    <View style={[styles.numInputRow, mini && styles.numInputRowMini]}>
      {prefix && <Text style={styles.numUnit}>{prefix}</Text>}
      <TextInput
        style={[styles.numInput, mini && styles.numInputMini]}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={colors.txt3}
        keyboardType="numeric"
      />
      {suffix && <Text style={styles.numUnit}>{suffix}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bgDeep },
  container: { flex: 1 },
  body: { padding: 16, paddingBottom: 100 },
  // 导航
  navBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 8, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.line,
  },
  iconBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  navArrow: { fontSize: 28, color: colors.txt1, fontWeight: '300', marginTop: -4 },
  navTitle: { fontSize: 15, fontWeight: '700', color: colors.txt1 },
  navSave: { paddingHorizontal: 12, paddingVertical: 6 },
  navSaveText: { fontSize: 12, fontWeight: '600', color: colors.cyan },
  // 视频卡
  videoCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: colors.bgCard, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.line, padding: 10, marginBottom: 14,
  },
  videoThumb: {
    width: 56, height: 42, borderRadius: 8, justifyContent: 'center', alignItems: 'center',
  },
  videoPlay: { fontSize: 14, color: 'rgba(255,255,255,0.85)' },
  videoInfo: { flex: 1 },
  videoTitle: { fontSize: 13, fontWeight: '700', color: colors.txt1, marginBottom: 4 },
  videoMeta: { fontSize: 11, color: colors.txt3 },
  // 激励项
  incItem: {
    backgroundColor: colors.bgElev, borderRadius: 14,
    borderWidth: 1.5, borderColor: colors.line, padding: 13, marginBottom: 10,
  },
  incItemHead: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  incCheck: {
    width: 22, height: 22, borderRadius: 7, borderWidth: 2, borderColor: colors.txt3,
    justifyContent: 'center', alignItems: 'center',
  },
  incCheckIcon: { fontSize: 13, color: '#fff', fontWeight: '900' },
  // 36x36 彩色图标盒
  incIcon: {
    width: 36, height: 36, borderRadius: 10,
    justifyContent: 'center', alignItems: 'center',
  },
  incIconText: { fontSize: 18 },
  incItemInfo: { flex: 1, minWidth: 0 },
  incItemName: { fontSize: 14, fontWeight: '700', color: colors.txt1 },
  // tag 彩色字+彩色底（color/backgroundColor 由 inline 设置）
  incItemTag: {
    fontSize: 9, fontWeight: '700', letterSpacing: 0.5,
    paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6,
    overflow: 'hidden' as any,
  },
  incItemDesc: { fontSize: 11, color: colors.txt2, marginTop: 3, lineHeight: 16 },
  incItemBody: { padding: 0, paddingHorizontal: 13, paddingBottom: 13 },
  // 字段容器（对齐原型 .is-fields）
  incFields: {
    backgroundColor: colors.bgCard, borderRadius: 11,
    borderWidth: 1, borderColor: colors.line, padding: 12,
  },
  // 字段
  field: { marginBottom: 10 },
  fieldLabel: { fontSize: 11, color: colors.txt2, marginBottom: 6 },
  fieldOpt: { fontSize: 10, color: colors.txt3 },
  numInputRow: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    height: 38, borderRadius: 8, paddingHorizontal: 10,
    backgroundColor: colors.bgCard2, borderWidth: 1, borderColor: colors.line,
  },
  numInputRowMini: { height: 32, paddingHorizontal: 6 },
  numUnit: { fontSize: 12, color: colors.txt2 },
  numInput: { flex: 1, color: colors.txt1, fontSize: 13, paddingVertical: 0 },
  numInputMini: { fontSize: 11, textAlign: 'center' },
  // 阶梯
  tierRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  tierLabel: { fontSize: 11, color: colors.txt2, width: 50 },
  tierInputs: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 4 },
  tierSep: { fontSize: 11, color: colors.txt3 },
  tierUnit: { fontSize: 10, color: colors.txt3 },
  // 达标奖金类型
  bonusTypeRow: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  bonusTypeBtn: {
    paddingHorizontal: 8, paddingVertical: 6, borderRadius: 8,
    backgroundColor: colors.bgCard2, borderWidth: 1, borderColor: colors.line,
  },
  bonusTypeBtnActive: { borderColor: colors.yellow, backgroundColor: 'rgba(251,191,36,0.12)' },
  bonusTypeText: { fontSize: 11, color: colors.txt2 },
  bonusTypeTextActive: { color: colors.yellow, fontWeight: '600' },
  // 底部 CTA
  ctaBar: {
    flexDirection: 'row', gap: 10,
    paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: 'rgba(15,15,30,0.96)', borderTopWidth: 1, borderTopColor: colors.line,
  },
  btnUnpublish: {
    paddingHorizontal: 16, paddingVertical: 13, borderRadius: 12,
    backgroundColor: colors.bgCard2, borderWidth: 1, borderColor: colors.line,
  },
  btnUnpublishText: { fontSize: 13, fontWeight: '600', color: colors.txt2 },
  btnSave: {
    flex: 1, paddingVertical: 13, borderRadius: 12, alignItems: 'center',
    backgroundColor: colors.cyan,
  },
  btnSaveDisabled: { opacity: 0.5 },
  btnSaveText: { fontSize: 14, fontWeight: '700', color: '#000' },
});
