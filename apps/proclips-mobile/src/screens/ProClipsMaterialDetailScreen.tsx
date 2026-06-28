/**
 * ProClipsMaterialDetailScreen - 素材详情（达人侧）
 *
 * 对应原型 page-material-detail：
 *   导航栏（‹ + 素材详情 + 收藏）
 *   + 大封面区（coverColor + 播放按钮 + 标题 + 播放/时长/行业）
 *   + 商家卡（logo + 店名 + 行业标签 + 已认证）
 *   + 激励卡（主激励 + 预估收益 + 5 种激励详情列表 + 多种叠加说明）
 *   + 视频简介
 *   + 底部 CTA「推广此视频」→ 弹发布平台 Sheet
 */
import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import type { AppScreenProps, PlatformKey } from '../types/navigation';
import { colors, gradients, radius, platformLabels } from '../components/Theme';
import { useProClipsStore } from '../stores/ProClipsStore';
import type { IncentivePlan, PlatformAccount } from '../services/ProClipsService';

// 5 种激励项配置（对照原型 idc-item：emoji + 32x32 彩色图标盒 + name + detail）
interface IncentiveItemCfg {
  key: keyof IncentivePlan;
  name: string;
  emoji: string;
  bg: string; // 图标盒半透明底色
  fg: string; // 图标盒前景色
  detail: (plan: IncentivePlan) => string;
}
const INC_ITEMS: IncentiveItemCfg[] = [
  {
    key: 'cps',
    name: '比例佣金 (CPS)',
    emoji: '💰',
    bg: 'rgba(0,210,255,0.16)',
    fg: '#00d2ff',
    detail: (p) =>
      p.cps
        ? `订单金额的 ${(p.cps.rate * 100).toFixed(0)}%${
            p.cps.minGuarantee ? ` · 最低保底 ¥${p.cps.minGuarantee}` : ''
          }`
        : '',
  },
  {
    key: 'fixed',
    name: '固定佣金',
    emoji: '🎯',
    bg: 'rgba(255,181,71,0.16)',
    fg: '#ffb547',
    detail: (p) => (p.fixed ? `每笔订单 ¥${p.fixed}` : ''),
  },
  {
    key: 'tiered',
    name: '阶梯佣金',
    emoji: '📊',
    bg: 'rgba(168,85,247,0.18)',
    fg: '#a855f7',
    detail: (p) =>
      p.tiered
        ? p.tiered
            .map(
              (t) => `${t.from}-${t.to ?? '∞'}单 ${(t.rate * 100).toFixed(0)}%`
            )
            .join(' · ')
        : '',
  },
  {
    key: 'cpm',
    name: '播放奖励 (CPM)',
    emoji: '👁️',
    bg: 'rgba(34,211,238,0.16)',
    fg: '#22d3ee',
    detail: (p) =>
      p.cpm
        ? `每千次播放 ¥${p.cpm.perThousand}${
            p.cpm.cap ? ` · 封顶 ¥${p.cpm.cap}` : ' · 不封顶'
          }`
        : '',
  },
  {
    key: 'bonus',
    name: '达标奖金',
    emoji: '🏆',
    bg: 'rgba(251,191,36,0.18)',
    fg: '#fbbf24',
    detail: (p) =>
      p.bonus
        ? `${p.bonus.type === 'orders' ? '订单数' : '播放数'} ≥ ${p.bonus.target} · 一次性 ¥${p.bonus.amount}`
        : '',
  },
];

// 已绑定的可发布平台（mock：从 store 取已绑定平台，未绑定时退回默认 4 个）
const DEFAULT_PLATFORMS: { key: PlatformKey; char: string; grad: string[] }[] = [
  { key: 'douyin', char: '抖音', grad: ['#000000', '#222'] },
  { key: 'kuaishou', char: '快手', grad: ['#FF6600', '#FF8C42'] },
  { key: 'xiaohongshu', char: '小红书', grad: ['#FF2E4D', '#FF6680'] },
  { key: 'wechat_video', char: '视频号', grad: ['#07C160', '#3DD680'] },
];

const ProClipsMaterialDetailScreen: React.FC<
  AppScreenProps<'ProClipsMaterialDetail'>
> = ({ navigation, route }) => {
  const materials = useProClipsStore((s) => s.materials);
  const platformAccounts = useProClipsStore((s) => s.platformAccounts);
  const [sheetVisible, setSheetVisible] = useState(false);

  const material = useMemo(
    () => materials.find((m) => m.id === route.params.materialId) ?? materials[0],
    [materials, route.params.materialId]
  );

  if (!material) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <NavBar title="素材详情" onBack={() => navigation.goBack()} />
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyEmoji}>🤔</Text>
          <Text style={styles.emptyTitle}>未找到素材</Text>
        </View>
      </SafeAreaView>
    );
  }

  const incentive = material.incentive;
  // 主激励显示：优先 CPS > 阶梯 > 固定 > CPM > 达标奖金
  const primaryRateDisplay = (() => {
    if (!incentive) return material.commission;
    if (incentive.cps) return `CPS ${(incentive.cps.rate * 100).toFixed(0)}%`;
    if (incentive.tiered) return `阶梯 ${(
      incentive.tiered[0]?.rate * 100
    ).toFixed(0)}-${(
      (incentive.tiered[incentive.tiered.length - 1]?.rate || 0) * 100
    ).toFixed(0)}%`;
    if (incentive.fixed) return `固定 ¥${incentive.fixed}`;
    if (incentive.cpm) return `CPM ¥${incentive.cpm.perThousand}/k`;
    if (incentive.bonus) return `奖金 ¥${incentive.bonus.amount}`;
    return material.commission;
  })();

  // 预估收益：按 1k 播放 × CPS 或主比率 × 6 估算（与原型公式一致）
  const mainRate =
    incentive?.cps?.rate ??
    (incentive?.tiered ? incentive.tiered[0].rate : 0.1);
  const estEarning = Math.round(material.plays * 0.001 * mainRate * 6);

  // 可发布平台：取已绑定平台，未绑定时用默认
  const publishPlatforms = platformAccounts.length
    ? DEFAULT_PLATFORMS.filter((p) =>
        platformAccounts.some((a: PlatformAccount) => a.platform === p.key)
      )
    : DEFAULT_PLATFORMS;

  const handleSelectPlatform = (key: PlatformKey) => {
    setSheetVisible(false);
    navigation.navigate('ProClipsPublishDouyin', {
      materialId: material.id,
      platform: key,
    });
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <NavBar
        title="素材详情"
        onBack={() => navigation.goBack()}
        right={
          <TouchableOpacity
            style={styles.iconBtn}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            onPress={() => {
              /* mock 收藏 */
            }}
          >
            <Text style={styles.collectedIcon}>♡</Text>
          </TouchableOpacity>
        }
      />

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.body}
        showsVerticalScrollIndicator={false}
      >
        {/* 大封面 */}
        <View style={[styles.mdCover, { backgroundColor: material.coverColor }]}>
          <View style={styles.mdGrad} />
          <View style={styles.mdPlayWrap}>
            <View style={styles.mdPlayCircle}>
              <Text style={styles.mdPlayIcon}>▶</Text>
            </View>
          </View>
          <View style={styles.mdInfo}>
            <Text style={styles.mdTitle} numberOfLines={2}>{material.title}</Text>
            <View style={styles.mdMetaRow}>
              <Text style={styles.mdMetaText}>▶ {formatCount(material.plays)}</Text>
              <Text style={styles.mdMetaText}>⏱ {material.duration}</Text>
              <Text style={styles.mdMetaText}>🏷 {material.industry}</Text>
            </View>
          </View>
          <View style={styles.mdCommissionPill}>
            <Text style={styles.mdCommissionText}>{material.commission}</Text>
          </View>
        </View>

        {/* 商家卡 */}
        <View style={styles.mdmCard}>
          <LinearGradient
            colors={[...gradients.warm]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.mdmLogo}
          >
            <Text style={styles.mdmLogoText}>{material.merchantLogo}</Text>
          </LinearGradient>
          <View style={styles.mdmInfo}>
            <Text style={styles.mdmShop}>{material.merchant}</Text>
            <View style={styles.mdmTagRow}>
              <View style={styles.mdmTagPill}>
                <Text style={styles.mdmTagPillText}>{material.industry}</Text>
              </View>
              <Text style={styles.mdmVerified}>✓ 已认证</Text>
            </View>
          </View>
        </View>

        {/* 激励卡：yellow→rose 渐变 tint 底 */}
        <LinearGradient
          colors={['rgba(251,191,36,0.10)', 'rgba(244,63,94,0.08)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.incCard}
        >
          <View style={styles.incRow}>
            <View>
              <Text style={styles.incLabel}>主激励</Text>
              <Text style={styles.incPrimary}>{primaryRateDisplay}</Text>
            </View>
            <View style={styles.incEstWrap}>
              <Text style={styles.incLabel}>预估收益</Text>
              <Text style={styles.incEst}>≈ ¥{estEarning}</Text>
            </View>
          </View>
          <View style={styles.incDivider} />
          <Text style={styles.incSectionTitle}>🎯 激励详情</Text>
          {incentive ? (
            <View style={styles.incList}>
              {INC_ITEMS.map((item) => {
                const v = incentive[item.key];
                if (!v) return null;
                return (
                  <View key={item.key} style={styles.incItem}>
                    <View style={[styles.incIcon, { backgroundColor: item.bg }]}>
                      <Text style={[styles.incIconEmoji, { color: item.fg }]}>{item.emoji}</Text>
                    </View>
                    <View style={styles.incInfo}>
                      <Text style={styles.incName}>{item.name}</Text>
                      <Text style={styles.incDetail}>{item.detail(incentive)}</Text>
                    </View>
                  </View>
                );
              })}
            </View>
          ) : (
            <Text style={styles.incEmpty}>{material.commission}（详见商家方案）</Text>
          )}
          <View style={styles.incDivider} />
          <Text style={styles.incTip}>
            💡 多种激励可叠加，按实际成交与播放数据结算。预估收益基于当前播放量估算，仅供参考。
          </Text>
        </LinearGradient>

        {/* 视频简介 */}
        <View style={styles.sectionTitle}>
          <Text style={styles.sectionH}>视频简介</Text>
        </View>
        <View style={styles.descBox}>
          <Text style={styles.descText}>{material.description}</Text>
        </View>
      </ScrollView>

      {/* 底部 CTA */}
      <View style={styles.ctaBar}>
        <TouchableOpacity
          activeOpacity={0.95}
          onPress={() => setSheetVisible(true)}
        >
          <LinearGradient
            colors={[...gradients.main]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.ctaBtn}
          >
            <Text style={styles.ctaIcon}>↗</Text>
            <Text style={styles.ctaText}>推广此视频</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* 发布平台选择 Sheet */}
      <Modal
        visible={sheetVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setSheetVisible(false)}
      >
        <Pressable style={styles.sheetMask} onPress={() => setSheetVisible(false)}>
          <Pressable style={styles.sheetBody} onPress={(e) => e.stopPropagation()}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>选择发布平台</Text>
            <Text style={styles.sheetSub}>
              已绑定 {publishPlatforms.length} 个平台 · 一键跳转发布
            </Text>
            <View style={styles.sheetGrid}>
              {publishPlatforms.map((p) => (
                <TouchableOpacity
                  key={p.key}
                  style={styles.sheetPlatItem}
                  activeOpacity={0.85}
                  onPress={() => handleSelectPlatform(p.key)}
                >
                  <LinearGradient
                    colors={[...p.grad]}
                    style={styles.sheetPlatIcon}
                  >
                    <Text style={styles.sheetPlatChar}>{p.char.slice(0, 1)}</Text>
                  </LinearGradient>
                  <Text style={styles.sheetPlatName}>{platformLabels[p.key]}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity
              style={styles.sheetCancel}
              activeOpacity={0.8}
              onPress={() => setSheetVisible(false)}
            >
              <Text style={styles.sheetCancelText}>取消</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
};

// ---- 工具 ----
const formatCount = (n: number) =>
  n >= 10000 ? `${(n / 10000).toFixed(1)}w` : n >= 1000 ? `${(n / 1000).toFixed(1)}k` : `${n}`;

// ---- 导航栏 ----
const NavBar: React.FC<{
  title: string;
  onBack: () => void;
  right?: React.ReactNode;
}> = ({ title, onBack, right }) => (
  <View style={styles.navBar}>
    <TouchableOpacity
      style={styles.iconBtn}
      onPress={onBack}
      hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
    >
      <Text style={styles.backChar}>‹</Text>
    </TouchableOpacity>
    <Text style={styles.navTitle}>{title}</Text>
    {right ?? <View style={styles.iconBtn} />}
  </View>
);

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
  navTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 17,
    fontWeight: '700',
    color: colors.txt1,
  },
  collectedIcon: { fontSize: 22, color: colors.txt1 },
  // 内容
  container: { flex: 1 },
  body: { padding: 16, paddingBottom: 100 },
  emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyEmoji: { fontSize: 56, marginBottom: 16 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: colors.txt2 },
  // 大封面
  mdCover: {
    aspectRatio: 16 / 12,
    borderRadius: radius.lg,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
    position: 'relative',
  },
  mdGrad: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '60%',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  mdPlayWrap: { alignItems: 'center', justifyContent: 'center' },
  mdPlayCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mdPlayIcon: { color: '#fff', fontSize: 20, marginLeft: 4 },
  mdInfo: {
    position: 'absolute',
    left: 14,
    right: 14,
    bottom: 14,
  },
  mdTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 8,
    lineHeight: 24,
  },
  mdMetaRow: { flexDirection: 'row', gap: 12 },
  mdMetaText: { color: 'rgba(255,255,255,0.85)', fontSize: 11, fontWeight: '500' },
  mdCommissionPill: {
    position: 'absolute',
    right: 10,
    top: 10,
    backgroundColor: colors.yellow,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  mdCommissionText: { color: '#000', fontSize: 11, fontWeight: '800' },
  // 商家卡
  mdmCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.bgCard,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 14,
    marginBottom: 14,
  },
  mdmLogo: {
    width: 42,
    height: 42,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mdmLogoText: { fontSize: 20 },
  mdmInfo: { flex: 1, minWidth: 0 },
  mdmShop: { fontSize: 14, fontWeight: '700', color: colors.txt1, marginBottom: 5 },
  mdmTagRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  mdmTagPill: {
    backgroundColor: 'rgba(251,191,36,0.15)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  mdmTagPillText: { color: colors.yellow, fontSize: 10, fontWeight: '700' },
  mdmVerified: { color: colors.success, fontSize: 10, fontWeight: '600' },
  // 激励卡：yellow→rose 渐变 tint
  incCard: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: 'rgba(251,191,36,0.22)',
    padding: 16,
    marginBottom: 16,
  },
  incRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  incLabel: { fontSize: 12, color: colors.txt2, marginBottom: 6, fontWeight: '500' },
  incPrimary: { fontSize: 22, fontWeight: '800', color: colors.cyan },
  incEstWrap: { alignItems: 'flex-end' },
  incEst: { fontSize: 22, fontWeight: '800', color: colors.yellow },
  incDivider: {
    height: 1,
    backgroundColor: colors.line,
    marginVertical: 14,
  },
  incSectionTitle: { fontSize: 13, fontWeight: '700', color: colors.txt1, marginBottom: 12 },
  incList: { gap: 8 },
  incItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 11,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  incIcon: {
    width: 32,
    height: 32,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
  },
  incIconEmoji: { fontSize: 16 },
  incInfo: { flex: 1, minWidth: 0 },
  incName: { fontSize: 12.5, fontWeight: '700', color: colors.txt1 },
  incDetail: { fontSize: 11, color: colors.txt2, marginTop: 2, lineHeight: 17 },
  incEmpty: { fontSize: 12, color: colors.txt3, lineHeight: 18 },
  incTip: { fontSize: 11, color: colors.txt3, lineHeight: 17 },
  // 章节
  sectionTitle: { marginBottom: 10 },
  sectionH: { fontSize: 16, fontWeight: '700', color: colors.txt1 },
  descBox: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 14,
    marginBottom: 16,
  },
  descText: { fontSize: 13, color: colors.txt2, lineHeight: 21 },
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: radius.lg,
    paddingVertical: 15,
  },
  ctaIcon: { color: '#fff', fontSize: 16, fontWeight: '800' },
  ctaText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  // 发布 Sheet
  sheetMask: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  sheetBody: {
    backgroundColor: colors.bgCard,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: 20,
    paddingBottom: 32,
    borderWidth: 1,
    borderColor: colors.line,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.lineStrong,
    alignSelf: 'center',
    marginBottom: 14,
  },
  sheetTitle: { fontSize: 17, fontWeight: '800', color: colors.txt1, textAlign: 'center' },
  sheetSub: {
    fontSize: 12,
    color: colors.txt3,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 18,
  },
  sheetGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  sheetPlatItem: { width: '23%', alignItems: 'center', gap: 8 },
  sheetPlatIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sheetPlatChar: { color: '#fff', fontSize: 18, fontWeight: '800' },
  sheetPlatName: { fontSize: 11, color: colors.txt2, fontWeight: '600' },
  sheetCancel: {
    marginTop: 22,
    paddingVertical: 13,
    borderRadius: radius.lg,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
  },
  sheetCancelText: { color: colors.txt2, fontSize: 14, fontWeight: '600' },
});

export default ProClipsMaterialDetailScreen;
