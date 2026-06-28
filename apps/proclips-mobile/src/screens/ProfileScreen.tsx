/**
 * ProfileScreen - 商家「我的」Tab
 *
 * 对应原型 page-profile：人设雷达图 + 资料行 + IP 助理入口 + 角色切换器 + 设置列表
 * Phase 0：核心列表结构，雷达图/角色切换器在 Phase 1/4 补全
 */
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import Svg, { Polygon, Line, Circle, Defs, LinearGradient as SvgLinearGradient, Stop } from 'react-native-svg';
import type { AppNavigation } from '../types/navigation';
import { colors, gradients, radius } from '../components/Theme';
import { useProClipsStore } from '../stores/ProClipsStore';
import type { RadarDimension } from '../services/ProClipsService';
import RoleSwitcher from '../components/RoleSwitcher';

export default function ProfileScreen() {
  const navigation = useNavigation<AppNavigation<'Main'>>();
  const radar = useProClipsStore((s) => s.merchantRadar);
  const platformAccounts = useProClipsStore((s) => s.platformAccounts);
  const unreadCount = useProClipsStore((s) => s.notifications.filter((n) => !n.read).length);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView style={styles.container} contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        {/* 人设雷达图 */}
        <LinearGradient
          colors={['rgba(0,210,255,0.08)', 'rgba(168,85,247,0.08)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.radarHost}
        >
          <RadarSVG dimensions={radar.dimensions} />
          <Text style={styles.radarScore}>
            IP <Text style={styles.radarScoreB}>{radar.totalScore}</Text> 分
          </Text>
          <Text style={styles.radarSub}>超过 {radar.percentile}% 同行</Text>
        </LinearGradient>

        {/* 资料行 */}
        <View style={styles.personaMeta}>
          <View style={styles.pmAvatar}><Text style={styles.pmAvatarText}>王</Text></View>
          <View style={styles.pmInfo}>
            <Text style={styles.pmName}>老王</Text>
            <Text style={styles.pmSub}>老王火锅店 · 万达店</Text>
          </View>
          <View style={styles.pmFans}><Text style={styles.pmFansText}>1.2k 粉丝 · 12 视频</Text></View>
        </View>

        {/* IP 助理入口 */}
        <TouchableOpacity activeOpacity={0.95} onPress={() => navigation.navigate('ProClipsIPCoach')}>
          <LinearGradient colors={[...gradients.main]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.ipCoachEntry}>
            <Text style={styles.ipTitle}>🤖 AI 助理帮你打造 IP →</Text>
            <Text style={styles.ipSub}>诊断人设短板，定制成长方案</Text>
          </LinearGradient>
        </TouchableOpacity>

        {/* 角色切换器：触发 3 秒魔幻变身动画 */}
        <RoleSwitcher />

        {/* 列表组 1 */}
        <View style={styles.listGroup}>
          <ListRow icon="🏪" iconBg="rgba(0,210,255,0.14)" iconColor={colors.cyan} title="店铺资料" value="老王火锅店" />
          <ListRow icon="🎙️" iconBg="rgba(255,107,157,0.14)" iconColor={colors.magenta} title="我的音色" value="已录制" onPress={() => navigation.navigate('ProClipsVoiceSample')} />
          <ListRow icon="🏷️" iconBg="rgba(168,85,247,0.16)" iconColor={colors.purple} title="行业分类" value="餐饮" />
        </View>

        {/* 列表组 2：第三方平台 */}
        <View style={styles.listGroup}>
          <ListRow
            icon="🔗"
            iconBg="rgba(168,85,247,0.16)"
            iconColor={colors.purple}
            title="第三方平台"
            value={`${platformAccounts.length}/6`}
            onPress={() => navigation.navigate('ProClipsPlatforms')}
          />
        </View>

        {/* 列表组 3 */}
        <View style={styles.listGroup}>
          <ListRow
            icon="📬"
            iconBg="rgba(255,107,157,0.14)"
            iconColor={colors.magenta}
            title="消息通知"
            badge={unreadCount}
            onPress={() => navigation.navigate('ProClipsNotifications')}
          />
          <ListRow icon="🔒" iconBg="rgba(255,181,71,0.16)" iconColor={colors.amber} title="账户与安全" />
          <ListRow icon="🔔" iconBg="rgba(0,210,255,0.14)" iconColor={colors.cyan} title="通知设置" />
          <ListRow icon="❓" iconBg="rgba(255,255,255,0.08)" iconColor={colors.txt2} title="帮助与反馈" />
          <ListRow icon="ℹ️" iconBg="rgba(255,255,255,0.08)" iconColor={colors.txt2} title="关于 ProClips" value="V1.0.0" />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function ListRow({
  icon, iconBg, iconColor, title, value, badge, onPress,
}: {
  icon: string; iconBg: string; iconColor: string; title: string; value?: string; badge?: number; onPress?: () => void;
}) {
  return (
    <TouchableOpacity style={styles.listRow} onPress={onPress} disabled={!onPress} activeOpacity={0.7}>
      <View style={[styles.lrIcon, { backgroundColor: iconBg }]}><Text style={[styles.lrIconText, { color: iconColor }]}>{icon}</Text></View>
      <Text style={styles.lrTitle}>{title}</Text>
      {value ? <Text style={styles.lrVal}>{value}</Text> : null}
      {badge ? (
        <View style={styles.lrBadge}><Text style={styles.lrBadgeText}>{badge}</Text></View>
      ) : null}
      <Text style={styles.lrArrow}>›</Text>
    </TouchableOpacity>
  );
}

// ============ 人设雷达图（compact 版） ============
function RadarSVG({ dimensions }: { dimensions: RadarDimension[] }) {
  const size = 100;
  const cx = size / 2;
  const cy = size / 2;
  const maxR = size * 0.4;
  const stop1 = colors.cyan;
  const stop2 = colors.purple;

  const vertex = (i: number, r: number): [number, number] => {
    const a = ((-90 + i * 60) * Math.PI) / 180;
    return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
  };

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

  const dataPts: string[] = [];
  const dots = dimensions.map((d, i) => {
    const r = maxR * (d.value / 100);
    const [x, y] = vertex(i, r);
    dataPts.push(`${x.toFixed(1)},${y.toFixed(1)}`);
    return (
      <Circle
        key={i}
        cx={x.toFixed(1)} cy={y.toFixed(1)} r={2.4}
        fill={stop2} stroke="#fff" strokeWidth={1}
      />
    );
  });

  return (
    <Svg width={size} height={size}>
      <Defs>
        <SvgLinearGradient id="radarFillProfile" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={stop1} stopOpacity={0.45} />
          <Stop offset="1" stopColor={stop2} stopOpacity={0.25} />
        </SvgLinearGradient>
      </Defs>
      {grids}
      {axes}
      <Polygon
        points={dataPts.join(' ')}
        fill="url(#radarFillProfile)"
        stroke={stop1}
        strokeWidth={1.5}
        strokeLinejoin="round"
      />
      {dots}
    </Svg>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bgDeep },
  container: { flex: 1 },
  body: { padding: 16, paddingBottom: 120 },
  radarHost: {
    alignItems: 'center', paddingVertical: 24, borderRadius: radius.lg,
    borderColor: colors.line, borderWidth: 1, marginBottom: 12,
  },
  radarScore: { fontSize: 13, color: colors.txt2, fontWeight: '600', marginTop: 10 },
  radarScoreB: { fontSize: 28, fontWeight: '800', color: colors.cyan },
  radarSub: { fontSize: 11, color: colors.txt2, marginTop: 4 },
  personaMeta: {
    flexDirection: 'row', alignItems: 'center', gap: 11,
    backgroundColor: colors.bgCard, borderColor: colors.line, borderWidth: 1,
    borderRadius: radius.md, padding: 11, marginBottom: 12,
  },
  pmAvatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: colors.magenta, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: 'rgba(255,255,255,0.6)' },
  pmAvatarText: { fontSize: 18, fontWeight: '800', color: '#fff' },
  pmInfo: { flex: 1, minWidth: 0 },
  pmName: { fontSize: 15, fontWeight: '700', color: colors.txt1 },
  pmSub: { fontSize: 11, color: colors.txt2, marginTop: 2 },
  pmFans: { backgroundColor: 'rgba(0,210,255,0.12)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 14 },
  pmFansText: { color: colors.cyan, fontSize: 11, fontWeight: '600' },
  ipCoachEntry: { borderRadius: radius.lg, padding: 16, marginBottom: 12, overflow: 'hidden' },
  ipTitle: { fontSize: 16, fontWeight: '800', color: '#fff' },
  ipSub: { fontSize: 12, color: 'rgba(255,255,255,0.9)', marginTop: 5 },
  listGroup: { backgroundColor: colors.bgCard, borderColor: colors.line, borderWidth: 1, borderRadius: radius.md, marginBottom: 14, overflow: 'hidden' },
  listRow: { flexDirection: 'row', alignItems: 'center', gap: 11, paddingVertical: 13, paddingHorizontal: 14, borderBottomWidth: 1, borderBottomColor: colors.line },
  lrIcon: { width: 32, height: 32, borderRadius: 9, justifyContent: 'center', alignItems: 'center' },
  lrIconText: { fontSize: 16 },
  lrTitle: { flex: 1, fontSize: 14, fontWeight: '500', color: colors.txt1 },
  lrVal: { fontSize: 12, color: colors.txt2 },
  lrBadge: { backgroundColor: colors.error, minWidth: 18, height: 18, borderRadius: 9, paddingHorizontal: 5, justifyContent: 'center', alignItems: 'center' },
  lrBadgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  lrArrow: { fontSize: 18, color: colors.txt3 },
});
