/**
 * CreatorProfileScreen - 达人「我的」Tab
 *
 * 对应原型 page-creator-profile：
 *   人设雷达图（综合分占位，6 维度明细）
 *   + 达人资料（头像 + 名字 + 粉丝）
 *   + IP 助理入口
 *   + 角色切换器
 *   + 列表组（数据追踪 / 收益 / 素材库）
 *   + 列表组（第三方平台）
 *   + 列表组（账户安全 / 结算账户 / 帮助反馈 / 关于）
 */
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import Svg, { Polygon, Line, Circle, Defs, LinearGradient as SvgLinearGradient, Stop } from 'react-native-svg';
import type { AppNavigation } from '../types/navigation';
import { colors, gradients, radius } from '../components/Theme';
import { useProClipsStore } from '../stores/ProClipsStore';
import type { RadarDimension } from '../services/ProClipsService';
import RoleSwitcher from '../components/RoleSwitcher';

export default function CreatorProfileScreen() {
  const navigation = useNavigation<AppNavigation<'Main'>>();
  const radar = useProClipsStore((s) => s.creatorRadar);
  const earnings = useProClipsStore((s) => s.earnings);
  const materials = useProClipsStore((s) => s.materials);
  const notifications = useProClipsStore((s) => s.notifications);
  const platformAccounts = useProClipsStore((s) => s.platformAccounts);

  const totalEarnings = earnings
    .filter((e) => e.status === 'settled')
    .reduce((s, e) => s + e.amount, 0);
  const unreadCount = notifications.filter((n) => !n.read).length;
  const boundPlatformCount = platformAccounts.length;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.body}
        showsVerticalScrollIndicator={false}
      >
        {/* 人设雷达图（SVG 6 边形 + 中心文字） */}
        <LinearGradient
          colors={['rgba(244,63,94,0.18)', 'rgba(251,191,36,0.06)', 'rgba(0,0,0,0)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={styles.radarHost}
        >
          <View style={styles.radarHeader}>
            <Text style={styles.radarTitle}>📊 人设雷达图</Text>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => navigation.navigate('ProClipsIPCoach')}
            >
              <Text style={styles.radarMore}>查看详情 →</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.radarWrap}>
            <RadarSVG dimensions={radar.dimensions} />
            <View style={styles.radarCenter} pointerEvents="none">
              <Text style={styles.radarScoreText}>
                IP <Text style={styles.radarScoreB}>{radar.totalScore}</Text> 分
              </Text>
              <Text style={styles.radarSub}>超过 {radar.percentile}% 同行</Text>
            </View>
          </View>
        </LinearGradient>

        {/* 达人资料 */}
        <View style={styles.personaMeta}>
          <View style={styles.pmAvatar}>
            <Text style={styles.pmAvatarText}>花</Text>
          </View>
          <View style={styles.pmInfo}>
            <Text style={styles.pmName}>李小花</Text>
            <Text style={styles.pmSub}>达人 · 已认证</Text>
          </View>
          <Text style={styles.pmFans}>12.5w 粉丝 · 已分销 23</Text>
        </View>

        {/* IP 助理入口 */}
        <TouchableOpacity
          activeOpacity={0.95}
          onPress={() => navigation.navigate('ProClipsIPCoach')}
        >
          <LinearGradient
            colors={[...gradients.creator]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.ipCoachEntry}
          >
            <Text style={styles.ipTitle}>🤖 AI 助理帮你打造 IP →</Text>
            <Text style={styles.ipSub}>诊断人设短板，定制成长方案</Text>
          </LinearGradient>
        </TouchableOpacity>

        {/* 角色切换器 */}
        <RoleSwitcher />

        {/* 列表组 1：达人专属 */}
        <View style={styles.listGroup}>
          <ListRow
            icon="📊"
            iconBg="rgba(251,191,36,0.16)"
            iconColor={colors.yellow}
            title="数据追踪"
            value={`${materials.length} 个视频`}
            onPress={() => navigation.navigate('ProClipsStatsTracking')}
          />
          <ListRow
            icon="💰"
            iconBg="rgba(244,63,94,0.16)"
            iconColor={colors.rose}
            title="我的收益"
            value={`¥${totalEarnings}`}
            onPress={() => navigation.navigate('Main', { screen: 'Earnings' } as any)}
          />
          <ListRow
            icon="🎬"
            iconBg="rgba(168,85,247,0.16)"
            iconColor={colors.purple}
            title="素材库"
            value={`${materials.length} 个素材`}
            onPress={() => navigation.navigate('Main', { screen: 'Browse' } as any)}
          />
        </View>

        {/* 列表组 2：第三方平台 */}
        <View style={styles.listGroup}>
          <ListRow
            icon="🔗"
            iconBg="rgba(168,85,247,0.16)"
            iconColor={colors.purple}
            title="第三方平台"
            value={`${boundPlatformCount}/6`}
            valuePill
            onPress={() => navigation.navigate('ProClipsPlatforms')}
          />
        </View>

        {/* 列表组 3：账户与设置 */}
        <View style={styles.listGroup}>
          <ListRow
            icon="📬"
            iconBg="rgba(255,107,157,0.14)"
            iconColor={colors.magenta}
            title="消息通知"
            value={unreadCount > 0 ? `${unreadCount}` : undefined}
            valueBadge
            onPress={() => navigation.navigate('ProClipsNotifications')}
          />
          <ListRow
            icon="🔒"
            iconBg="rgba(255,181,71,0.16)"
            iconColor={colors.amber}
            title="账户与安全"
            onPress={() =>
              Alert.alert('账户与安全', '账户与安全设置（mock）', [{ text: '好的' }])
            }
          />
          <ListRow
            icon="🏦"
            iconBg="rgba(0,210,255,0.14)"
            iconColor={colors.cyan}
            title="结算账户"
            value="已绑定"
            onPress={() =>
              Alert.alert('结算账户', '结算账户：尾号 8829（mock）', [{ text: '好的' }])
            }
          />
          <ListRow
            icon="❓"
            iconBg="rgba(255,255,255,0.08)"
            iconColor={colors.txt2}
            title="帮助与反馈"
            onPress={() =>
              Alert.alert('帮助与反馈', '帮助与反馈（mock）', [{ text: '好的' }])
            }
          />
          <ListRow
            icon="ℹ️"
            iconBg="rgba(255,255,255,0.08)"
            iconColor={colors.txt2}
            title="关于 ProClips"
            value="V1.0.0"
            onPress={() =>
              Alert.alert('ProClips V1.0.0', '拍可丽 · 达人视频营销助手（mock）', [
                { text: '好的' },
              ])
            }
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function ListRow({
  icon,
  iconBg,
  iconColor,
  title,
  value,
  valuePill,
  valueBadge,
  onPress,
}: {
  icon: string;
  iconBg: string;
  iconColor: string;
  title: string;
  value?: string;
  valuePill?: boolean;
  valueBadge?: boolean;
  onPress?: () => void;
}) {
  return (
    <TouchableOpacity
      style={styles.listRow}
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.lrIcon, { backgroundColor: iconBg }]}>
        <Text style={[styles.lrIconText, { color: iconColor }]}>{icon}</Text>
      </View>
      <Text style={styles.lrTitle}>{title}</Text>
      {value ? (
        valueBadge ? (
          <View style={styles.lrBadge}>
            <Text style={styles.lrBadgeText}>{value}</Text>
          </View>
        ) : valuePill ? (
          <View style={styles.lrPill}>
            <Text style={styles.lrPillText}>{value}</Text>
          </View>
        ) : (
          <Text style={styles.lrVal}>{value}</Text>
        )
      ) : null}
      <Text style={styles.lrArrow}>›</Text>
    </TouchableOpacity>
  );
}

// ============ 人设雷达图（creator 主题色：黄 → 玫红） ============
function RadarSVG({ dimensions }: { dimensions: RadarDimension[] }) {
  const size = 220;
  const cx = size / 2;
  const cy = size / 2;
  const maxR = size * 0.34;
  const stop1 = colors.yellow;
  const stop2 = colors.rose;

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
        cx={x.toFixed(1)} cy={y.toFixed(1)} r={3.4}
        fill={stop2} stroke="#fff" strokeWidth={1.4}
      />
    );
  });

  // 维度标签（外圈）
  const labels = dimensions.map((d, i) => {
    const [vx, vy] = vertex(i, maxR + 22);
    return (
      <React.Fragment key={`lab-${i}`}>
        <Text
          style={{
            position: 'absolute',
            left: vx - 40,
            top: vy - 16,
            width: 80,
            textAlign: 'center',
            fontSize: 11,
            fontWeight: '600',
            color: '#fff',
          }}
        >
          {d.label}
        </Text>
        <Text
          style={{
            position: 'absolute',
            left: vx - 40,
            top: vy + 2,
            width: 80,
            textAlign: 'center',
            fontSize: 11,
            fontWeight: '700',
            color: stop2,
          }}
        >
          {d.value}
        </Text>
      </React.Fragment>
    );
  });

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        <Defs>
          <SvgLinearGradient id="radarFillCreator" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={stop1} stopOpacity={0.55} />
            <Stop offset="1" stopColor={stop2} stopOpacity={0.35} />
          </SvgLinearGradient>
        </Defs>
        {grids}
        {axes}
        <Polygon
          points={dataPts.join(' ')}
          fill="url(#radarFillCreator)"
          stroke={stop2}
          strokeWidth={2}
          strokeLinejoin="round"
        />
        {dots}
      </Svg>
      {labels}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bgDeep },
  container: { flex: 1 },
  body: { padding: 16, paddingBottom: 120 },
  // 雷达图
  radarHost: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 16,
    marginBottom: 14,
    overflow: 'hidden' as any,
  },
  radarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  radarTitle: { fontSize: 14, fontWeight: '700', color: colors.txt1 },
  radarMore: { fontSize: 11, color: colors.yellow, fontWeight: '600' },
  radarWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  radarCenter: {
    position: 'absolute',
    left: '50%',
    top: '50%',
    transform: [{ translateX: -50 }, { translateY: -50 }],
    alignItems: 'center',
    padding: 14,
    borderRadius: 999,
  },
  radarScoreText: { fontSize: 12, color: colors.txt2, fontWeight: '600' },
  radarScoreB: {
    fontSize: 30,
    fontWeight: '900',
    color: colors.yellow,
  },
  radarSub: { fontSize: 10.5, color: colors.txt2, marginTop: 4 },
  // 资料卡
  personaMeta: {
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
  pmAvatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: 'rgba(244,63,94,0.16)',
    borderWidth: 1.5,
    borderColor: colors.rose,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pmAvatarText: { fontSize: 18, fontWeight: '800', color: colors.rose },
  pmInfo: { flex: 1, minWidth: 0 },
  pmName: { fontSize: 16, fontWeight: '800', color: colors.txt1 },
  pmSub: { fontSize: 11, color: colors.txt3, marginTop: 3 },
  pmFans: { fontSize: 11, color: colors.txt2, fontWeight: '500' },
  // IP 助理入口
  ipCoachEntry: {
    borderRadius: radius.lg,
    padding: 16,
    marginBottom: 14,
    overflow: 'hidden',
  },
  ipTitle: { fontSize: 16, fontWeight: '800', color: '#fff' },
  ipSub: { fontSize: 12, color: 'rgba(255,255,255,0.9)', marginTop: 5 },
  // 列表组
  listGroup: {
    backgroundColor: colors.bgCard,
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: radius.md,
    marginBottom: 14,
    overflow: 'hidden',
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    paddingVertical: 13,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  lrIcon: {
    width: 32,
    height: 32,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
  },
  lrIconText: { fontSize: 16 },
  lrTitle: { flex: 1, fontSize: 14, fontWeight: '500', color: colors.txt1 },
  lrVal: { fontSize: 12, color: colors.txt2 },
  lrArrow: { fontSize: 18, color: colors.txt3, marginLeft: 6 },
  // 平台数 pill
  lrPill: {
    backgroundColor: 'rgba(168,85,247,0.2)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  lrPillText: { color: colors.purple, fontSize: 10, fontWeight: '700' },
  // 消息徽章
  lrBadge: {
    backgroundColor: colors.error,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 6,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.error,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.45,
    shadowRadius: 6,
    elevation: 3,
  },
  lrBadgeText: { color: '#fff', fontSize: 10, fontWeight: '800' },
});
