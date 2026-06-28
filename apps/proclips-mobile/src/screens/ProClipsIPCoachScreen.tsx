/**
 * ProClipsIPCoachScreen - AI IP 助理
 *
 * 对应原型 page-ip-coach：
 *   Hero（compact 雷达图 + 综合 IP 分 + 超越 N% 同行 + 角色标签）
 *   + AI 人设诊断（6 维度卡：维度名 + 评级 + 当前分 + 建议，按 weak→good→excellent 排序）
 *   + IP 成长方案（5 个成长卡：图标 + 标题 + 预计提升 + 难度星标）
 *   + IP 成长轨迹（6 周趋势 SVG + 提升说明）
 *   + 底部 CTA「开启 AI 陪伴成长」
 *
 * 数据随 store.role 切换：商家用 MERCHANT_*，达人用 CREATOR_*
 */
import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import Svg, { Polygon, Polyline, Circle, Line, Text as SvgText, Defs, LinearGradient as SvgLinear, Stop } from 'react-native-svg';
import type { AppScreenProps } from '../types/navigation';
import { colors, gradients, radius } from '../components/Theme';
import { useProClipsStore } from '../stores/ProClipsStore';
import {
  MERCHANT_DIMS, CREATOR_DIMS, MERCHANT_PROFILE, CREATOR_PROFILE,
  MERCHANT_ADVICE, CREATOR_ADVICE, MERCHANT_PLAN, CREATOR_PLAN,
  MERCHANT_TREND, CREATOR_TREND, type IPDim, type IPProfile, type GrowthPlanItem,
} from '../services/ProClipsService';

// 评级排序权重
const RATE_RANK: Record<string, number> = { weak: 0, good: 1, excellent: 2 };

interface DiagItem {
  dim: IPDim;
  v: number;
  rate: string;
  rateClass: 'weak' | 'good' | 'excellent';
  advice: string;
}

const ProClipsIPCoachScreen: React.FC<AppScreenProps<'ProClipsIPCoach'>> = ({ navigation }) => {
  const role = useProClipsStore((s) => s.role);

  const dims = role === 'creator' ? CREATOR_DIMS : MERCHANT_DIMS;
  const profile: IPProfile = role === 'creator' ? CREATOR_PROFILE : MERCHANT_PROFILE;
  const adviceMap = role === 'creator' ? CREATOR_ADVICE : MERCHANT_ADVICE;
  const plan: GrowthPlanItem[] = role === 'creator' ? CREATOR_PLAN : MERCHANT_PLAN;
  const trend = role === 'creator' ? CREATOR_TREND : MERCHANT_TREND;

  // 诊断列表（按 weak→good→excellent 排序，同级按分值升序）
  const diagList = useMemo<DiagItem[]>(() => {
    const list: DiagItem[] = dims.map((d) => {
      const v = profile.radar[d.key] || 0;
      let rate: string;
      let rateClass: 'weak' | 'good' | 'excellent';
      if (v >= 80) { rate = '优秀'; rateClass = 'excellent'; }
      else if (v >= 70) { rate = '良好'; rateClass = 'good'; }
      else { rate = '待提升'; rateClass = 'weak'; }
      const advice = adviceMap[d.key].replace('{v}', String(v));
      return { dim: d, v, rate, rateClass, advice };
    });
    list.sort((a, b) => (RATE_RANK[a.rateClass] - RATE_RANK[b.rateClass]) || (a.v - b.v));
    return list;
  }, [dims, profile, adviceMap]);

  const trendDelta = trend[trend.length - 1] - trend[0];
  const roleLabel = role === 'creator' ? '达人 IP 诊断' : '商家 IP 诊断';

  const handleRefresh = () => {
    Alert.alert('已刷新', 'AI 已为你刷新诊断（mock）', [{ text: '好的' }]);
  };

  const handleOpenCoach = () => {
    Alert.alert('已开启', 'AI 将持续追踪你的 IP 成长（mock）', [{ text: '好的' }]);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* 导航栏 */}
      <View style={styles.navBar}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.navArrow}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.navTitle}>AI IP 助理</Text>
        <TouchableOpacity style={styles.iconBtn} onPress={handleRefresh}>
          <Text style={styles.navRefresh}>🔄</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.container} contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        {/* Hero：雷达图 + 综合分 */}
        <View style={styles.hero}>
          <RadarSVG role={role} dims={dims} radar={profile.radar} />
          <View style={styles.heroInfo}>
            <Text style={styles.heroScoreLabel}>综合 IP 分</Text>
            <Text style={styles.heroScore}>{profile.ipScore}</Text>
            <Text style={styles.heroPct}>超越 <Text style={styles.bold}>{profile.percentile}%</Text> 同行</Text>
            <View style={styles.heroTagWrap}>
              <Text style={styles.heroTag}>{roleLabel}</Text>
            </View>
          </View>
        </View>

        {/* AI 人设诊断 */}
        <View style={styles.sectionTitleRow}>
          <Text style={styles.sectionIco}>🤖</Text>
          <Text style={styles.sectionTitle}>AI 人设诊断</Text>
        </View>
        {diagList.map((d) => (
          <DiagCard key={d.dim.key} item={d} />
        ))}

        {/* IP 成长方案 */}
        <View style={styles.sectionTitleRow}>
          <Text style={styles.sectionIco}>🎯</Text>
          <Text style={styles.sectionTitle}>你的 IP 成长方案</Text>
        </View>
        {plan.map((p, i) => (
          <GrowthCard key={i} item={p} />
        ))}

        {/* IP 成长轨迹 */}
        <View style={styles.sectionTitleRow}>
          <Text style={styles.sectionIco}>📈</Text>
          <Text style={styles.sectionTitle}>IP 成长轨迹</Text>
        </View>
        <View style={styles.trendCard}>
          <Text style={styles.trendTitle}>最近 6 周 IP 分趋势</Text>
          <TrendSVG data={trend} role={role} />
          <Text style={styles.trendSub}>
            6 周提升 <Text style={styles.bold}>+{trendDelta}</Text> 分，超越 <Text style={styles.bold}>{profile.percentile}%</Text> 同行
          </Text>
        </View>
      </ScrollView>

      {/* 底部 CTA */}
      <View style={styles.ctaBar}>
        <TouchableOpacity activeOpacity={0.85} onPress={handleOpenCoach}>
          <LinearGradient
            colors={[...gradients.main]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.ctaBtn}
          >
            <Text style={styles.ctaStar}>⭐</Text>
            <Text style={styles.ctaText}>开启 AI 陪伴成长</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

export default ProClipsIPCoachScreen;

// ============ 雷达图 SVG ============
function RadarSVG({
  role, dims, radar,
}: {
  role: 'merchant' | 'creator';
  dims: IPDim[];
  radar: Record<string, number>;
}) {
  const size = 120;
  const cx = size / 2;
  const cy = size / 2;
  const maxR = size * 0.4;
  const stop1 = role === 'creator' ? colors.yellow : colors.cyan;
  const stop2 = role === 'creator' ? colors.rose : colors.purple;

  const vertex = (i: number, r: number): [number, number] => {
    const a = (-90 + i * 60) * Math.PI / 180;
    return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
  };

  // 5 层网格
  const grids = [20, 40, 60, 80, 100].map((lv, idx) => {
    const pts = Array.from({ length: 6 }, (_, i) => {
      const r = maxR * (lv / 100);
      const [x, y] = vertex(i, r);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(' ');
    return (
      <Polygon
        key={lv}
        points={pts}
        fill="none"
        stroke={`rgba(255,255,255,${(0.06 + idx * 0.018).toFixed(3)})`}
        strokeWidth={1}
      />
    );
  });

  // 6 条轴线
  const axes = Array.from({ length: 6 }, (_, i) => {
    const [x, y] = vertex(i, maxR);
    return (
      <Line
        key={i}
        x1={cx} y1={cy} x2={x.toFixed(1)} y2={y.toFixed(1)}
        stroke="rgba(255,255,255,0.09)" strokeWidth={1}
      />
    );
  });

  // 数据多边形顶点
  const dataPts: string[] = [];
  const dots = dims.map((d, i) => {
    const v = radar[d.key] || 0;
    const r = maxR * (v / 100);
    const [x, y] = vertex(i, r);
    dataPts.push(`${x.toFixed(1)},${y.toFixed(1)}`);
    return (
      <Circle
        key={d.key}
        cx={x.toFixed(1)} cy={y.toFixed(1)} r={2.6}
        fill={stop2} stroke="#fff" strokeWidth={1}
      />
    );
  });

  const gid = `ipRadarGrad_${role}`;

  return (
    <Svg width={size} height={size}>
      <Defs>
        <SvgLinear id={gid} x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor={stop1} />
          <Stop offset="100%" stopColor={stop2} />
        </SvgLinear>
      </Defs>
      {grids}
      {axes}
      <Polygon
        points={dataPts.join(' ')}
        fill={`url(#${gid})`}
        fillOpacity={0.55}
        stroke={stop2}
        strokeWidth={2}
        strokeLinejoin="round"
      />
      {dots}
    </Svg>
  );
}

// ============ 趋势图 SVG ============
function TrendSVG({
  data, role,
}: {
  data: number[];
  role: 'merchant' | 'creator';
}) {
  const W = 280;
  const H = 108;
  const pl = 26, pr = 14, pt = 16, pb = 24;
  const lo = 60, hi = 85;
  const n = data.length;
  const xs = Array.from({ length: n }, (_, i) => pl + i * (W - pl - pr) / (n - 1));
  const ys = data.map((v) => pt + (1 - (v - lo) / (hi - lo)) * (H - pt - pb));
  const s1 = role === 'creator' ? colors.yellow : colors.cyan;
  const s2 = role === 'creator' ? colors.rose : colors.purple;

  const pts = data.map((_, i) => `${xs[i].toFixed(1)},${ys[i].toFixed(1)}`);
  const area = [`${pl},${H - pb}`, ...pts, `${W - pr},${H - pb}`].join(' ');
  const dots = data.map((_, i) => (
    <Circle
      key={i}
      cx={xs[i].toFixed(1)} cy={ys[i].toFixed(1)} r={3.2}
      fill={s2} stroke="#fff" strokeWidth={1.3}
    />
  ));
  const vlabels = data.map((v, i) => (
    <SvgText
      key={i}
      x={xs[i].toFixed(1)} y={(ys[i] - 9).toFixed(1)}
      textAnchor="middle" fill="#fff" fontSize={9.5} fontWeight="700"
    >{v}</SvgText>
  ));
  const xlabs = ['6周前', '', '4周前', '', '2周前', '本周'];
  const xlabels = data.map((_, i) => (
    xlabs[i] ? (
      <SvgText
        key={i}
        x={xs[i].toFixed(1)} y={H - 8}
        textAnchor="middle" fill="rgba(255,255,255,0.42)" fontSize={9}
      >{xlabs[i]}</SvgText>
    ) : null
  ));
  const gid = `ipTrendGrad_${role}`;

  return (
    <Svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet">
      <Defs>
        <SvgLinear id={gid} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor={s1} stopOpacity={0.5} />
          <Stop offset="100%" stopColor={s2} stopOpacity={0} />
        </SvgLinear>
      </Defs>
      <Polygon points={area} fill={`url(#${gid})`} />
      <Polyline
        points={pts.join(' ')}
        fill="none" stroke={s2} strokeWidth={2.2}
        strokeLinejoin="round" strokeLinecap="round"
      />
      {dots}{vlabels}{xlabels}
    </Svg>
  );
}

// ============ 诊断卡 ============
function DiagCard({ item }: { item: DiagItem }) {
  const { dim, v, rate, rateClass, advice } = item;
  const rateColor =
    rateClass === 'excellent' ? colors.success :
    rateClass === 'good' ? colors.yellow : '#fb923c';

  return (
    <View style={[styles.diagCard, styles[`diag_${rateClass}` as keyof typeof styles] as object]}>
      <View style={styles.diagHead}>
        <Text style={styles.diagName}>{dim.name}</Text>
        <View style={[styles.diagRate, { borderColor: rateColor }]}>
          <Text style={[styles.diagRateText, { color: rateColor }]}>{rate}</Text>
        </View>
      </View>
      <Text style={styles.diagScore}>当前 <Text style={styles.bold}>{v}</Text> / 100</Text>
      <Text style={styles.diagAdvice}>{advice}</Text>
    </View>
  );
}

// ============ 成长方案卡 ============
function GrowthCard({ item }: { item: GrowthPlanItem }) {
  return (
    <View style={styles.growthCard}>
      <View style={styles.gcHead}>
        <View style={styles.gcIcoWrap}>
          <Text style={styles.gcIco}>{item.ico}</Text>
        </View>
        <Text style={styles.gcTitle}>{item.title}</Text>
      </View>
      <View style={styles.gcMeta}>
        <Text style={styles.gcBoost}>预计 {item.boost}</Text>
        <Text style={styles.gcStars}>{'⭐'.repeat(item.diff)}</Text>
        <Text style={styles.gcDiff}>难度：{item.diff === 1 ? '简单' : '中等'}</Text>
      </View>
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
  navTitle: { flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '700', color: colors.txt1 },
  navRefresh: { fontSize: 16 },
  // Hero
  hero: {
    flexDirection: 'row', alignItems: 'center', gap: 16,
    backgroundColor: colors.bgCard, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.line, padding: 16, marginBottom: 18,
  },
  heroInfo: { flex: 1, gap: 4 },
  heroScoreLabel: { fontSize: 11, color: colors.txt3 },
  heroScore: { fontSize: 32, fontWeight: '900', color: colors.magenta },
  heroPct: { fontSize: 12, color: colors.txt2 },
  bold: { fontWeight: '700', color: colors.txt1 },
  heroTagWrap: { marginTop: 6 },
  heroTag: {
    fontSize: 10, color: colors.cyan, fontWeight: '600',
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8,
    backgroundColor: 'rgba(0,210,255,0.12)', borderWidth: 1, borderColor: 'rgba(0,210,255,0.3)',
    overflow: 'hidden',
  },
  // section
  sectionTitleRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginTop: 14, marginBottom: 10,
  },
  sectionIco: { fontSize: 14 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: colors.txt1 },
  // 诊断卡
  diagCard: {
    backgroundColor: colors.bgCard, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.line, padding: 12, marginBottom: 8,
  },
  diag_weak: { borderLeftWidth: 3, borderLeftColor: '#fb923c' },
  diag_good: { borderLeftWidth: 3, borderLeftColor: colors.yellow },
  diag_excellent: { borderLeftWidth: 3, borderLeftColor: colors.success },
  diagHead: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: 6,
  },
  diagName: { fontSize: 13, fontWeight: '700', color: colors.txt1 },
  diagRate: {
    paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, borderWidth: 1,
  },
  diagRateText: { fontSize: 10, fontWeight: '600' },
  diagScore: { fontSize: 11, color: colors.txt3, marginBottom: 6 },
  diagAdvice: { fontSize: 11, color: colors.txt2, lineHeight: 17 },
  // 成长方案卡
  growthCard: {
    backgroundColor: colors.bgCard, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.line, padding: 12, marginBottom: 8,
  },
  gcHead: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  gcIcoWrap: {
    width: 30, height: 30, borderRadius: 9,
    backgroundColor: 'rgba(0,210,255,0.14)',
    justifyContent: 'center', alignItems: 'center',
  },
  gcIco: { fontSize: 15 },
  gcTitle: { fontSize: 13, fontWeight: '600', color: colors.txt1, flex: 1 },
  gcMeta: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  gcBoost: { fontSize: 11, color: colors.cyan, fontWeight: '600' },
  gcStars: { fontSize: 10 },
  gcDiff: { fontSize: 11, color: colors.txt3 },
  // 趋势
  trendCard: {
    backgroundColor: colors.bgCard, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.line, padding: 14, marginBottom: 16,
  },
  trendTitle: { fontSize: 12, color: colors.txt2, marginBottom: 8 },
  trendSub: { fontSize: 11, color: colors.txt2, marginTop: 8, textAlign: 'center' },
  // 底部 CTA
  ctaBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: 'rgba(15,15,30,0.96)',
    borderTopWidth: 1, borderTopColor: colors.line,
  },
  ctaBtn: {
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
    height: 48, borderRadius: 24, gap: 8,
  },
  ctaStar: { fontSize: 16 },
  ctaText: { fontSize: 15, fontWeight: '700', color: '#fff' },
});
