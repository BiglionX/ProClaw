/**
 * IncentiveSheet - 推广激励设置面板（5 种可叠加）
 *
 * 对应原型 #incentive-sheet：底部弹层，视频"设公开"时弹出。
 * 5 种激励方式：CPS 比例佣金 / 固定佣金 / 阶梯佣金 / CPM 播放奖励 / 达标奖金
 * 每种可独立启用/禁用，启用后展开对应字段，可多选叠加。
 */
import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView,
  TextInput, Platform,
} from 'react-native';
import { colors, radius } from './Theme';
import type { VideoItem, IncentivePlan } from '../services/ProClipsService';

// ============ 编辑态：每种激励带 enabled 标记 ============
interface EditableIncentive {
  cps: { enabled: boolean; rate: string; minGuarantee: string };
  fixed: { enabled: boolean; amount: string };
  tiered: { enabled: boolean; tiers: Array<{ min: string; max: string; rate: string }> };
  cpm: { enabled: boolean; per1k: string; cap: string };
  bonus: { enabled: boolean; type: 'orders' | 'views'; threshold: string; amount: string };
}

function defaultEditable(): EditableIncentive {
  return {
    cps: { enabled: true, rate: '15', minGuarantee: '0' },
    fixed: { enabled: false, amount: '20' },
    tiered: { enabled: false, tiers: [{ min: '1', max: '10', rate: '10' }, { min: '11', max: '50', rate: '15' }, { min: '51', max: '9999', rate: '20' }] },
    cpm: { enabled: false, per1k: '10', cap: '0' },
    bonus: { enabled: false, type: 'orders', threshold: '100', amount: '500' },
  };
}

function fromPlan(plan?: IncentivePlan): EditableIncentive {
  const e = defaultEditable();
  if (!plan) return e;
  if (plan.cps) { e.cps.enabled = true; e.cps.rate = String(plan.cps.rate); e.cps.minGuarantee = String(plan.cps.minGuarantee || 0); }
  if (plan.fixed !== undefined) { e.fixed.enabled = true; e.fixed.amount = String(plan.fixed); }
  if (plan.tiered && plan.tiered.length) { e.tiered.enabled = true; e.tiered.tiers = plan.tiered.map(t => ({ min: String(t.from), max: String(t.to ?? 9999), rate: String(t.rate) })); }
  if (plan.cpm) { e.cpm.enabled = true; e.cpm.per1k = String(plan.cpm.perThousand); e.cpm.cap = String(plan.cpm.cap || 0); }
  if (plan.bonus) { e.bonus.enabled = true; e.bonus.type = plan.bonus.type === 'orders' ? 'orders' : 'views'; e.bonus.threshold = String(plan.bonus.target); e.bonus.amount = String(plan.bonus.amount); }
  return e;
}

function toPlan(e: EditableIncentive): IncentivePlan {
  const plan: IncentivePlan = {};
  if (e.cps.enabled) plan.cps = { rate: Number(e.cps.rate) || 0, minGuarantee: Number(e.cps.minGuarantee) || 0 };
  if (e.fixed.enabled) plan.fixed = Number(e.fixed.amount) || 0;
  if (e.tiered.enabled) plan.tiered = e.tiered.tiers.map(t => ({ from: Number(t.min) || 0, to: Number(t.max) >= 9999 ? undefined : Number(t.max), rate: Number(t.rate) || 0 }));
  if (e.cpm.enabled) plan.cpm = { perThousand: Number(e.cpm.per1k) || 0, cap: Number(e.cpm.cap) || 0 };
  if (e.bonus.enabled) plan.bonus = { target: Number(e.bonus.threshold) || 0, type: e.bonus.type, amount: Number(e.bonus.amount) || 0 };
  return plan;
}

// ============ 激励项配置 ============
interface ItemDef {
  key: keyof EditableIncentive;
  icon: string;
  name: string;
  tag: string;
  desc: string;
  color: string;
  glow: string;
}

const ITEMS: ItemDef[] = [
  { key: 'cps', icon: '💰', name: '比例佣金', tag: 'CPS', desc: '订单金额的百分比，最常用', color: '#00d2ff', glow: 'rgba(0,210,255,0.16)' },
  { key: 'fixed', icon: '🎯', name: '固定佣金', tag: 'FIXED', desc: '每笔订单固定金额，适合低价商品', color: '#ffb547', glow: 'rgba(255,181,71,0.16)' },
  { key: 'tiered', icon: '📊', name: '阶梯佣金', tag: 'TIERED', desc: '按订单量分档，激励冲量', color: '#a855f7', glow: 'rgba(168,85,247,0.18)' },
  { key: 'cpm', icon: '👁️', name: '播放奖励', tag: 'CPM', desc: '达到播放量给固定奖金', color: '#22d3ee', glow: 'rgba(34,211,238,0.16)' },
  { key: 'bonus', icon: '🏆', name: '达标奖金', tag: 'BONUS', desc: '达到订单/播放数给一次性奖金', color: '#fbbf24', glow: 'rgba(251,191,36,0.18)' },
];

// ============ 主组件 ============
interface Props {
  visible: boolean;
  video: VideoItem | null;
  onClose: () => void;
  onConfirm: (plan: IncentivePlan) => void;
  onUnpublish: () => void;
}

export default function IncentiveSheet({ visible, video, onClose, onConfirm, onUnpublish }: Props) {
  const [edit, setEdit] = useState<EditableIncentive>(defaultEditable());

  useEffect(() => {
    if (visible && video) {
      setEdit(fromPlan(video.incentive));
    }
  }, [visible, video]);

  const toggle = (key: keyof EditableIncentive) => {
    setEdit(prev => ({ ...prev, [key]: { ...prev[key], enabled: !prev[key].enabled } } as EditableIncentive));
  };

  const updateField = (key: keyof EditableIncentive, field: string, val: string) => {
    setEdit(prev => ({ ...prev, [key]: { ...prev[key], [field]: val } } as EditableIncentive));
  };

  const updateTier = (i: number, field: 'min' | 'max' | 'rate', val: string) => {
    setEdit(prev => {
      const tiers = [...prev.tiered.tiers];
      tiers[i] = { ...tiers[i], [field]: val };
      return { ...prev, tiered: { ...prev.tiered, tiers } };
    });
  };

  const handleConfirm = () => {
    const anyEnabled = edit.cps.enabled || edit.fixed.enabled || edit.tiered.enabled || edit.cpm.enabled || edit.bonus.enabled;
    if (!anyEnabled) {
      return; // 至少启用一种
    }
    onConfirm(toPlan(edit));
  };

  const isEnabled = (key: keyof EditableIncentive): boolean => (edit[key] as { enabled: boolean }).enabled;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.mask}>
        <TouchableOpacity style={styles.maskTouch} activeOpacity={1} onPress={onClose} />
        <View style={styles.sheet}>
          {/* 头部 */}
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>设置推广激励</Text>
            <Text style={styles.sheetSub}>{video?.title}</Text>
            <Text style={styles.sheetHint}>启用后视频将公开，达人可申请分销 · 可多选叠加</Text>
          </View>

          <ScrollView style={styles.listBody} showsVerticalScrollIndicator={false}>
            {ITEMS.map((it) => {
              const enabled = isEnabled(it.key);
              return (
                <View
                  key={it.key}
                  style={[styles.isItem, enabled && { borderColor: it.color, backgroundColor: it.glow }]}
                >
                  {/* 头部：勾选 + 图标 + 名称 + 描述 */}
                  <TouchableOpacity
                    style={styles.isHead}
                    activeOpacity={0.8}
                    onPress={() => toggle(it.key)}
                  >
                    <View style={[styles.isCheck, enabled && { backgroundColor: it.color, borderColor: it.color }]}>
                      {enabled ? <Text style={styles.isCheckIcon}>✓</Text> : null}
                    </View>
                    <Text style={styles.isIcon}>{it.icon}</Text>
                    <View style={styles.isInfo}>
                      <View style={styles.isNameRow}>
                        <Text style={styles.isName}>{it.name}</Text>
                        <View style={[styles.isTag, { backgroundColor: it.glow }]}><Text style={[styles.isTagText, { color: it.color }]}>{it.tag}</Text></View>
                      </View>
                      <Text style={styles.isDesc}>{it.desc}</Text>
                    </View>
                  </TouchableOpacity>

                  {/* 启用后展开的字段 */}
                  {enabled && it.key === 'cps' && (
                    <View style={styles.isBody}>
                      <FieldRow label="佣金比例" unit="%" value={edit.cps.rate} onChangeText={(v) => updateField('cps', 'rate', v)} />
                      <FieldRow label="最低保底（可选）" unit="¥" value={edit.cps.minGuarantee} onChangeText={(v) => updateField('cps', 'minGuarantee', v)} />
                    </View>
                  )}
                  {enabled && it.key === 'fixed' && (
                    <View style={styles.isBody}>
                      <FieldRow label="每单金额" unit="¥" value={edit.fixed.amount} onChangeText={(v) => updateField('fixed', 'amount', v)} />
                    </View>
                  )}
                  {enabled && it.key === 'tiered' && (
                    <View style={styles.isBody}>
                      {edit.tiered.tiers.map((t, i) => (
                        <View key={i} style={styles.tierRow}>
                          <Text style={styles.tierLabel}>第 {i + 1} 档</Text>
                          <View style={styles.tierInputs}>
                            <MiniInput value={t.min} onChangeText={(v) => updateTier(i, 'min', v)} placeholder="起" />
                            <Text style={styles.tierSep}>-</Text>
                            <MiniInput value={Number(t.max) >= 9999 ? '' : t.max} onChangeText={(v) => updateTier(i, 'max', v)} placeholder="∞" />
                            <Text style={styles.tierUnit}>单</Text>
                            <MiniInput value={t.rate} onChangeText={(v) => updateTier(i, 'rate', v)} placeholder="率" />
                            <Text style={styles.tierUnit}>%</Text>
                          </View>
                        </View>
                      ))}
                    </View>
                  )}
                  {enabled && it.key === 'cpm' && (
                    <View style={styles.isBody}>
                      <FieldRow label="每千次播放" unit="¥" value={edit.cpm.per1k} onChangeText={(v) => updateField('cpm', 'per1k', v)} />
                      <FieldRow label="封顶（可选）" unit="¥" value={edit.cpm.cap} onChangeText={(v) => updateField('cpm', 'cap', v)} />
                    </View>
                  )}
                  {enabled && it.key === 'bonus' && (
                    <View style={styles.isBody}>
                      <View style={styles.fieldRow}>
                        <Text style={styles.fieldLabel}>达标条件</Text>
                        <View style={styles.fieldInputRow}>
                          <TouchableOpacity
                            style={[styles.typeChip, edit.bonus.type === 'orders' && styles.typeChipActive]}
                            onPress={() => updateField('bonus', 'type', 'orders')}
                          >
                            <Text style={[styles.typeChipText, edit.bonus.type === 'orders' && styles.typeChipTextActive]}>订单 ≥</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[styles.typeChip, edit.bonus.type === 'views' && styles.typeChipActive]}
                            onPress={() => updateField('bonus', 'type', 'views')}
                          >
                            <Text style={[styles.typeChipText, edit.bonus.type === 'views' && styles.typeChipTextActive]}>播放 ≥</Text>
                          </TouchableOpacity>
                          <TextInput
                            style={styles.numInput}
                            value={edit.bonus.threshold}
                            onChangeText={(v) => updateField('bonus', 'threshold', v)}
                            keyboardType="numeric"
                            placeholder="数量"
                            placeholderTextColor={colors.txt3}
                          />
                        </View>
                      </View>
                      <FieldRow label="奖金金额" unit="¥" value={edit.bonus.amount} onChangeText={(v) => updateField('bonus', 'amount', v)} />
                    </View>
                  )}
                </View>
              );
            })}
            <View style={{ height: 16 }} />
          </ScrollView>

          {/* 底部操作栏 */}
          <View style={styles.ctaBar}>
            {video?.isPublic ? (
              <TouchableOpacity style={styles.unpublishBtn} onPress={onUnpublish} activeOpacity={0.8}>
                <Text style={styles.unpublishText}>设为私密</Text>
              </TouchableOpacity>
            ) : null}
            <TouchableOpacity
              style={[
                styles.confirmBtn,
                !edit.cps.enabled && !edit.fixed.enabled && !edit.tiered.enabled && !edit.cpm.enabled && !edit.bonus.enabled && styles.confirmBtnDisabled,
              ]}
              onPress={handleConfirm}
              activeOpacity={0.85}
            >
              <Text style={styles.confirmText}>确认公开</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ============ 字段子组件 ============
function FieldRow({ label, unit, value, onChangeText }: { label: string; unit: string; value: string; onChangeText: (v: string) => void }) {
  return (
    <View style={styles.fieldRow}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.fieldInputRow}>
        <Text style={styles.fieldUnit}>{unit}</Text>
        <TextInput
          style={styles.numInput}
          value={value}
          onChangeText={onChangeText}
          keyboardType="numeric"
          placeholder="0"
          placeholderTextColor={colors.txt3}
        />
      </View>
    </View>
  );
}

function MiniInput({ value, onChangeText, placeholder }: { value: string; onChangeText: (v: string) => void; placeholder?: string }) {
  return (
    <TextInput
      style={styles.miniInput}
      value={value}
      onChangeText={onChangeText}
      keyboardType="numeric"
      placeholder={placeholder}
      placeholderTextColor={colors.txt3}
    />
  );
}

const styles = StyleSheet.create({
  mask: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)' },
  maskTouch: { flex: 1 },
  sheet: {
    backgroundColor: colors.bgCard,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    maxHeight: '88%',
    borderTopWidth: 1, borderTopColor: colors.cyan,
  },
  sheetHeader: { padding: 18, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: colors.line },
  sheetTitle: { fontSize: 17, fontWeight: '800', color: colors.txt1, textAlign: 'center' },
  sheetSub: { fontSize: 13, color: colors.txt2, textAlign: 'center', marginTop: 6 },
  sheetHint: { fontSize: 11, color: colors.cyan, textAlign: 'center', marginTop: 8 },
  listBody: { padding: 14 },
  isItem: {
    backgroundColor: 'rgba(255,255,255,0.03)', borderColor: colors.line, borderWidth: 1,
    borderRadius: radius.md, marginBottom: 12, overflow: 'hidden',
  },
  isHead: { flexDirection: 'row', alignItems: 'center', gap: 11, padding: 14 },
  isCheck: {
    width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: colors.txt3,
    justifyContent: 'center', alignItems: 'center',
  },
  isCheckIcon: { color: '#fff', fontSize: 13, fontWeight: '800' },
  isIcon: { fontSize: 22 },
  isInfo: { flex: 1, minWidth: 0 },
  isNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  isName: { fontSize: 14, fontWeight: '700', color: colors.txt1 },
  isTag: { paddingHorizontal: 6, paddingVertical: 1, borderRadius: 6 },
  isTagText: { fontSize: 9, fontWeight: '700' },
  isDesc: { fontSize: 11, color: colors.txt3, marginTop: 3 },
  isBody: { padding: 14, paddingTop: 0, gap: 12 },
  fieldRow: { gap: 6 },
  fieldLabel: { fontSize: 12, color: colors.txt2, fontWeight: '500' },
  fieldInputRow: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 2 },
  fieldUnit: { fontSize: 13, color: colors.txt3, fontWeight: '600' },
  numInput: { flex: 1, color: colors.txt1, fontSize: 14, fontWeight: '600', paddingVertical: 10, ...Platform.select({ web: { outlineStyle: 'none' as any } }) },
  tierRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  tierLabel: { fontSize: 11, color: colors.txt3, width: 44 },
  tierInputs: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 },
  miniInput: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: 8,
    color: colors.txt1, fontSize: 12, fontWeight: '600',
    paddingVertical: 7, paddingHorizontal: 8,
    ...Platform.select({ web: { outlineStyle: 'none' as any } }),
  },
  tierSep: { color: colors.txt3, fontSize: 11 },
  tierUnit: { color: colors.txt3, fontSize: 11 },
  typeChip: { paddingHorizontal: 10, paddingVertical: 7, borderRadius: 8, backgroundColor: 'rgba(0,0,0,0.3)', borderWidth: 1, borderColor: colors.line },
  typeChipActive: { backgroundColor: 'rgba(251,191,36,0.15)', borderColor: colors.amber },
  typeChipText: { fontSize: 12, color: colors.txt2, fontWeight: '600' },
  typeChipTextActive: { color: colors.amber, fontWeight: '700' },
  ctaBar: { flexDirection: 'row', gap: 10, padding: 14, borderTopWidth: 1, borderTopColor: colors.line, backgroundColor: colors.bgCard },
  unpublishBtn: { paddingVertical: 13, paddingHorizontal: 18, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: colors.line },
  unpublishText: { color: colors.txt2, fontSize: 14, fontWeight: '600' },
  confirmBtn: { flex: 1, paddingVertical: 13, borderRadius: 14, backgroundColor: colors.cyan, alignItems: 'center', justifyContent: 'center' },
  confirmBtnDisabled: { opacity: 0.4 },
  confirmText: { color: '#fff', fontSize: 14, fontWeight: '800' },
});
