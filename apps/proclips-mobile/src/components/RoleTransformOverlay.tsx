/**
 * RoleTransformOverlay - 3 秒魔幻变身动画
 *
 * 对应原型 #role-transform-overlay：商家 ⇄ 达人 角色切换全屏动画。
 *
 * 时序（总 3 秒）：
 *   0.0s  遮罩降临 + 星点闪烁
 *   0.0-1.3s  起始图标出现→消失，能量光环旋转爆发，能量核心缩放
 *   0.85-1.5s 14 个粒子从中心向四周飞散
 *   1.0s  ★ 底层 role 切换（由 RoleSwitcher 触发，光环爆发遮挡）
 *   1.3-2.0s  光晕展开 + 目标图标 morph 出现
 *   1.35-2.0s 新角色名称淡入（letter-spacing 模拟）
 *   2.5-3.0s  overlay 整体淡出
 *
 * 实现说明：
 *   - 光环用 SVG 三色圆环（c1/c2/c3）+ Reanimated 旋转/缩放模拟 conic-gradient
 *   - 粒子用 14 个 Animated.View，各自随机角度/距离/颜色
 *   - 图标 morph：起始图标（scale 0.3→1→0.5 + rotate）→ 目标图标（scale 0.5→1.08→1 + rotate -360→0）
 */
import React, { useEffect, useMemo } from 'react';
import { StyleSheet, View, Text, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withSequence,
  withRepeat,
  Easing,
} from 'react-native-reanimated';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';
import { roleThemes } from './Theme';
import { useProClipsStore } from '../stores/ProClipsStore';
import type { ProClipsRole } from '../types/navigation';

const { width: W, height: H } = Dimensions.get('window');
const CENTER_X = W / 2;
const CENTER_Y = H / 2;

// ============ 星点 / 粒子预生成数据 ============
interface ParticleData {
  angle: number; // 度
  dist: number; // px
  color: string;
  delay: number;
}

interface StarData {
  left: number;
  top: number;
  scale: number;
  delay: number;
}

function buildParticles(from: ProClipsRole, to: ProClipsRole): ParticleData[] {
  const F = roleThemes[from];
  const T = roleThemes[to];
  const palette = [F.c1, F.c2, F.c3, T.c1, T.c2, T.c3, '#ffffff'];
  const n = 14;
  return Array.from({ length: n }, (_, i) => {
    const ang = (360 / n) * i + (Math.random() * 22 - 11);
    const dist = 90 + Math.random() * 130;
    return {
      angle: ang,
      dist,
      color: palette[Math.floor(Math.random() * palette.length)],
      delay: 850 + Math.random() * 120,
    };
  });
}

function buildStars(): StarData[] {
  return Array.from({ length: 28 }, () => ({
    left: Math.random() * 100,
    top: Math.random() * 100,
    scale: 0.4 + Math.random() * 1.3,
    delay: Math.random() * 900,
  }));
}

// ============ 主组件 ============
export default function RoleTransformOverlay() {
  const transforming = useProClipsStore((s) => s.transforming);
  const fromRole = useProClipsStore((s) => s.transformFrom);
  const toRole = useProClipsStore((s) => s.transformTo);

  // overlay 整体透明度
  const overlayOpacity = useSharedValue(0);
  // 遮罩
  const backdropOpacity = useSharedValue(0);
  const backdropScale = useSharedValue(0.2);
  // 光环
  const ringOpacity = useSharedValue(0);
  const ringScale = useSharedValue(2.2);
  const ringRotate = useSharedValue(0);
  // 能量核心
  const coreOpacity = useSharedValue(0);
  const coreScale = useSharedValue(0.2);
  // 起始图标
  const fromIconOpacity = useSharedValue(0);
  const fromIconScale = useSharedValue(0.3);
  const fromIconRotate = useSharedValue(-60);
  // 目标图标
  const toIconOpacity = useSharedValue(0);
  const toIconScale = useSharedValue(0.5);
  const toIconRotate = useSharedValue(-360);
  // 光晕
  const haloOpacity = useSharedValue(0);
  const haloScale = useSharedValue(0.5);
  // 名称
  const labelOpacity = useSharedValue(0);
  const labelScale = useSharedValue(0.7);

  // 粒子 & 星点
  const stars = useMemo(() => buildStars(), []);
  const particles = useMemo(
    () => (fromRole && toRole ? buildParticles(fromRole, toRole) : []),
    [fromRole, toRole]
  );

  useEffect(() => {
    if (!transforming || !fromRole || !toRole) return;

    // 重置所有值
    overlayOpacity.value = 0;
    backdropOpacity.value = 0;
    backdropScale.value = 0.2;
    ringOpacity.value = 0;
    ringScale.value = 2.2;
    ringRotate.value = 0;
    coreOpacity.value = 0;
    coreScale.value = 0.2;
    fromIconOpacity.value = 0;
    fromIconScale.value = 0.3;
    fromIconRotate.value = -60;
    toIconOpacity.value = 0;
    toIconScale.value = 0.5;
    toIconRotate.value = -360;
    haloOpacity.value = 0;
    haloScale.value = 0.5;
    labelOpacity.value = 0;
    labelScale.value = 0.7;

    // 阶段 1：overlay + 遮罩降临（0-0.3s）
    overlayOpacity.value = withTiming(1, { duration: 100 });
    backdropOpacity.value = withTiming(1, { duration: 300, easing: Easing.cubic });
    backdropScale.value = withTiming(1, { duration: 300, easing: Easing.cubic });

    // 阶段 2：能量光环（0-1.3s）
    ringOpacity.value = withDelay(
      180,
      withSequence(
        withTiming(0, { duration: 180 }),
        withTiming(1, { duration: 300, easing: Easing.out(Easing.cubic) }),
        withTiming(0.85, { duration: 300 }),
        withTiming(0, { duration: 340, easing: Easing.in(Easing.cubic) })
      )
    );
    ringScale.value = withDelay(
      180,
      withSequence(
        withTiming(2.2, { duration: 180 }),
        withTiming(1, { duration: 300, easing: Easing.out(Easing.cubic) }),
        withTiming(1, { duration: 220 }),
        withTiming(1.7, { duration: 100 }),
        withTiming(3.4, { duration: 340, easing: Easing.in(Easing.cubic) })
      )
    );
    ringRotate.value = withDelay(
      180,
      withSequence(
        withTiming(40, { duration: 180 }),
        withTiming(360, { duration: 300, easing: Easing.out(Easing.cubic) }),
        withTiming(560, { duration: 220 }),
        withTiming(680, { duration: 100 }),
        withTiming(860, { duration: 340, easing: Easing.in(Easing.cubic) })
      )
    );

    // 阶段 2：能量核心（0-1.3s）
    coreOpacity.value = withSequence(
      withTiming(0, { duration: 100 }),
      withTiming(1, { duration: 240 }),
      withTiming(0.9, { duration: 260 }),
      withTiming(0, { duration: 100 }),
      withTiming(0, { duration: 340 })
    );
    coreScale.value = withSequence(
      withTiming(0.2, { duration: 100 }),
      withTiming(1, { duration: 240, easing: Easing.out(Easing.cubic) }),
      withTiming(1.5, { duration: 260 }),
      withTiming(3.4, { duration: 440, easing: Easing.in(Easing.cubic) })
    );

    // 阶段 2：起始图标出现→消失（0-1.3s）
    fromIconOpacity.value = withSequence(
      withTiming(0, { duration: 100 }),
      withTiming(1, { duration: 260, easing: Easing.out(Easing.cubic) }),
      withTiming(1, { duration: 260 }),
      withTiming(0.5, { duration: 100 }),
      withTiming(0, { duration: 340, easing: Easing.in(Easing.cubic) })
    );
    fromIconScale.value = withSequence(
      withTiming(0.3, { duration: 100 }),
      withTiming(1, { duration: 260, easing: Easing.out(Easing.cubic) }),
      withTiming(1, { duration: 260 }),
      withTiming(0.6, { duration: 100 }),
      withTiming(0.5, { duration: 340 })
    );
    fromIconRotate.value = withSequence(
      withTiming(0, { duration: 260, easing: Easing.out(Easing.cubic) }),
      withTiming(0, { duration: 260 }),
      withTiming(180, { duration: 100 }),
      withTiming(360, { duration: 340 })
    );

    // 阶段 4：光晕（1.3-2.0s）
    haloOpacity.value = withDelay(
      1300,
      withSequence(
        withTiming(0, { duration: 50 }),
        withTiming(0.9, { duration: 210, easing: Easing.out(Easing.cubic) }),
        withTiming(0.6, { duration: 280 }),
        withTiming(0, { duration: 210 })
      )
    );
    haloScale.value = withDelay(
      1300,
      withSequence(
        withTiming(0.5, { duration: 50 }),
        withTiming(1, { duration: 210 }),
        withTiming(1.08, { duration: 280 }),
        withTiming(1.35, { duration: 210 })
      )
    );

    // 阶段 4：目标图标 morph 出现（1.3-2.0s）
    toIconOpacity.value = withDelay(
      1300,
      withSequence(
        withTiming(0, { duration: 50 }),
        withTiming(1, { duration: 420, easing: Easing.out(Easing.cubic) })
      )
    );
    toIconScale.value = withDelay(
      1300,
      withSequence(
        withTiming(0.5, { duration: 50 }),
        withTiming(1.08, { duration: 250, easing: Easing.out(Easing.cubic) }),
        withTiming(1, { duration: 170 })
      )
    );
    toIconRotate.value = withDelay(
      1300,
      withTiming(0, { duration: 420, easing: Easing.out(Easing.cubic) })
    );

    // 阶段 4：名称淡入（1.35-1.95s）
    labelOpacity.value = withDelay(
      1350,
      withTiming(1, { duration: 600, easing: Easing.out(Easing.cubic) })
    );
    labelScale.value = withDelay(
      1350,
      withTiming(1, { duration: 600, easing: Easing.out(Easing.cubic) })
    );

    // 阶段 5：整体淡出（2.5-3.0s）
    overlayOpacity.value = withDelay(
      2500,
      withTiming(0, { duration: 500, easing: Easing.in(Easing.cubic) })
    );
  }, [transforming, fromRole, toRole]);

  // 所有 useAnimatedStyle 必须在条件 return 之前（hooks 规则）
  const overlayStyle = useAnimatedStyle(() => ({
    opacity: overlayOpacity.value,
  }));

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
    transform: [{ scale: backdropScale.value }],
  }));

  const ringStyle = useAnimatedStyle(() => ({
    opacity: ringOpacity.value,
    transform: [
      { scale: ringScale.value },
      { rotate: `${ringRotate.value}deg` },
    ],
  }));

  const coreStyle = useAnimatedStyle(() => ({
    opacity: coreOpacity.value,
    transform: [{ scale: coreScale.value }],
  }));

  const fromIconStyle = useAnimatedStyle(() => ({
    opacity: fromIconOpacity.value,
    transform: [
      { scale: fromIconScale.value },
      { rotate: `${fromIconRotate.value}deg` },
    ],
  }));

  const toIconStyle = useAnimatedStyle(() => ({
    opacity: toIconOpacity.value,
    transform: [
      { scale: toIconScale.value },
      { rotate: `${toIconRotate.value}deg` },
    ],
  }));

  const haloStyle = useAnimatedStyle(() => ({
    opacity: haloOpacity.value,
    transform: [{ scale: haloScale.value }],
  }));

  const labelStyle = useAnimatedStyle(() => ({
    opacity: labelOpacity.value,
    transform: [{ scale: labelScale.value }],
  }));

  // 条件 return 必须在所有 hooks 之后
  if (!transforming || !fromRole || !toRole) {
    return null;
  }

  const F = roleThemes[fromRole];
  const T = roleThemes[toRole];
  const ringColors = T; // 光环用目标色（爆发时已切换）

  // SVG 光环周长
  const RING_R = 100;
  const CIRC = 2 * Math.PI * RING_R;
  const ARC = CIRC / 3;

  return (
    <Animated.View style={[styles.overlay, overlayStyle]} pointerEvents="none">
      {/* 阶段 1：深色遮罩 */}
      <Animated.View style={[styles.backdrop, backdropStyle]} />

      {/* 星点（持续闪烁） */}
      <View style={styles.starsLayer}>
        {stars.map((s, i) => (
          <Star key={i} data={s} />
        ))}
      </View>

      {/* 阶段 2：能量光环（SVG 三色圆环） */}
      <Animated.View style={[styles.ringWrap, ringStyle]}>
        <Svg width={248} height={248}>
          <Circle
            cx={124} cy={124} r={RING_R}
            stroke={ringColors.c1} strokeWidth={16} fill="none"
            strokeDasharray={`${ARC} ${CIRC}`} strokeDashoffset={0}
          />
          <Circle
            cx={124} cy={124} r={RING_R}
            stroke={ringColors.c2} strokeWidth={16} fill="none"
            strokeDasharray={`${ARC} ${CIRC}`} strokeDashoffset={-ARC}
          />
          <Circle
            cx={124} cy={124} r={RING_R}
            stroke={ringColors.c3} strokeWidth={16} fill="none"
            strokeDasharray={`${ARC} ${CIRC}`} strokeDashoffset={-ARC * 2}
          />
        </Svg>
      </Animated.View>

      {/* 阶段 2：能量核心 */}
      <Animated.View
        style={[
          styles.core,
          { backgroundColor: '#fff', shadowColor: F.c2 },
          coreStyle,
        ]}
      />

      {/* 阶段 3：粒子飞散 */}
      {particles.map((p, i) => (
        <Particle key={i} data={p} />
      ))}

      {/* 阶段 4：光晕 */}
      <Animated.View style={[styles.haloWrap, haloStyle]}>
        <Svg width={220} height={220}>
          <Defs>
            <RadialGradient id="haloGrad" cx="50%" cy="50%" r="50%">
              <Stop offset="0%" stopColor="rgba(255,255,255,0.22)" />
              <Stop offset="18%" stopColor={T.c2} stopOpacity={0.7} />
              <Stop offset="62%" stopColor={T.c2} stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Circle cx={110} cy={110} r={110} fill="url(#haloGrad)" />
        </Svg>
      </Animated.View>

      {/* 图标 morph：起始 → 目标 */}
      <View style={styles.iconWrap}>
        <Animated.Text style={[styles.icon, styles.iconFrom, fromIconStyle]}>
          {F.icon}
        </Animated.Text>
        <Animated.Text style={[styles.icon, styles.iconTo, toIconStyle]}>
          {T.icon}
        </Animated.Text>
      </View>

      {/* 阶段 4：新角色名称 */}
      <Animated.View style={[styles.labelWrap, labelStyle]}>
        <Text style={[styles.label, { color: T.c1 }]}>
          {T.label}
        </Text>
      </Animated.View>
    </Animated.View>
  );
}

// ============ 星点子组件 ============
function Star({ data }: { data: StarData }) {
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.6);

  useEffect(() => {
    opacity.value = withDelay(
      data.delay,
      withRepeat(
        withSequence(
          withTiming(0.85, { duration: 900, easing: Easing.inOut(Easing.ease) }),
          withTiming(0, { duration: 900, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        false
      )
    );
    scale.value = withDelay(
      data.delay,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 900 }),
          withTiming(0.6, { duration: 900 })
        ),
        -1,
        false
      )
    );
  }, [data]);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value * data.scale }],
  }));

  return (
    <Animated.View
      style={[
        styles.star,
        { left: `${data.left}%`, top: `${data.top}%` },
        style,
      ]}
    />
  );
}

// ============ 粒子子组件 ============
function Particle({ data }: { data: ParticleData }) {
  const opacity = useSharedValue(0);
  const translateX = useSharedValue(0);
  const scale = useSharedValue(0.4);

  useEffect(() => {
    const rad = (data.angle * Math.PI) / 180;
    const targetX = Math.cos(rad) * data.dist;

    opacity.value = withDelay(
      data.delay,
      withSequence(
        withTiming(0, { duration: 50 }),
        withTiming(1, { duration: 120 }),
        withTiming(0, { duration: 480, easing: Easing.in(Easing.cubic) })
      )
    );
    translateX.value = withDelay(
      data.delay,
      withSequence(
        withTiming(22 * Math.cos(rad), { duration: 120 }),
        withTiming(targetX, { duration: 480, easing: Easing.in(Easing.cubic) })
      )
    );
    scale.value = withDelay(
      data.delay,
      withSequence(
        withTiming(1, { duration: 120 }),
        withTiming(0.2, { duration: 480 })
      )
    );
  }, [data]);

  const style = useAnimatedStyle(() => {
    const rad = (data.angle * Math.PI) / 180;
    const tx = translateX.value;
    const ty = tx * Math.tan(rad);
    return {
      opacity: opacity.value,
      transform: [
        { translateX: tx },
        { translateY: ty },
        { scale: scale.value },
      ],
    };
  });

  return (
    <Animated.View
      style={[
        styles.particle,
        { backgroundColor: data.color, shadowColor: data.color },
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    zIndex: 9999, elevation: 9999,
  },
  backdrop: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(8,8,18,0.96)',
  },
  starsLayer: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  star: {
    position: 'absolute', width: 3, height: 3, borderRadius: 1.5,
    backgroundColor: '#fff',
    shadowColor: '#fff', shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9, shadowRadius: 6, elevation: 0,
  },
  ringWrap: {
    position: 'absolute', left: CENTER_X - 124, top: CENTER_Y - 124,
    width: 248, height: 248,
  },
  core: {
    position: 'absolute', left: CENTER_X - 8, top: CENTER_Y - 8,
    width: 16, height: 16, borderRadius: 8,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1, shadowRadius: 14, elevation: 0,
  },
  haloWrap: {
    position: 'absolute', left: CENTER_X - 110, top: CENTER_Y - 110,
    width: 220, height: 220,
  },
  iconWrap: {
    position: 'absolute', left: CENTER_X - 48, top: CENTER_Y - 48,
    width: 96, height: 96,
  },
  icon: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    fontSize: 62, lineHeight: 96, textAlign: 'center',
  },
  iconFrom: {},
  iconTo: {},
  labelWrap: {
    position: 'absolute', left: 0, right: 0,
    top: CENTER_Y + 86, alignItems: 'center',
  },
  label: {
    fontSize: 30, fontWeight: '900', letterSpacing: 8,
    textShadowColor: 'rgba(255,255,255,0.18)', textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 24,
  },
  particle: {
    position: 'absolute', left: CENTER_X - 3, top: CENTER_Y - 3,
    width: 6, height: 6, borderRadius: 3,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1, shadowRadius: 10, elevation: 0,
  },
});
