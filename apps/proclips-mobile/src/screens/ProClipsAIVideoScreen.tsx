/**
 * ProClipsAIVideoScreen - AI 智能选品（达人侧）
 *
 * 对应原型 page-ai-video：
 *   达人卡（头像 + 名字 + 粉丝/行业/地域 + 已分销/累计赚）
 *   + 7 组选品偏好 chips（行业/佣金/激励/价位/信誉/难度/地域）
 *   + AI 智能匹配按钮
 *   + 结果区（config / loading / 视频卡片列表）
 *   + 视频卡片（缩略图 + 标题 + 激励 + 商家/星级/价位/难度 + 分数 + 理由 + 标签 + 申请按钮）
 */
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import type { AppScreenProps } from '../types/navigation';
import { colors, radius } from '../components/Theme';
import {
  AV_GROUPS, AC_CREATOR_CTX, computeVideoMatches, incentiveSummary,
  priceLabel, difficultyLabel,
  type MaterialCandidate,
} from '../services/ProClipsService';

type Phase = 'config' | 'loading' | 'results';
type ScoredVideo = MaterialCandidate & { _score: number; _reason: string };

// 达人上下文 mock（与原型 CREATOR 一致）
const CREATOR_INFO = {
  name: '李小花',
  avatar: '花',
  fans: '12.5w',
  distributed: 23,
  monthlyCommission: 1286,
};

function freshSelection(): Record<string, string[]> {
  const sel: Record<string, string[]> = {};
  AV_GROUPS.forEach((g) => { sel[g.key] = ['不限']; });
  return sel;
}

const ProClipsAIVideoScreen: React.FC<AppScreenProps<'ProClipsAIVideo'>> = ({ navigation }) => {
  const [selected, setSelected] = useState<Record<string, string[]>>(freshSelection);
  const [phase, setPhase] = useState<Phase>('config');
  const [matched, setMatched] = useState<ScoredVideo[] | null>(null);
  const [shown, setShown] = useState(5);
  const [applied, setApplied] = useState<Record<string, boolean>>({});

  const toggleChip = (group: string, opt: string) => {
    setSelected((prev) => {
      const arr = prev[group] ? [...prev[group]] : [];
      if (opt === '不限') {
        return { ...prev, [group]: ['不限'] };
      }
      const i = arr.indexOf(opt);
      if (i >= 0) arr.splice(i, 1);
      else arr.push(opt);
      const ui = arr.indexOf('不限');
      if (ui >= 0) arr.splice(ui, 1);
      if (arr.length === 0) arr.push('不限');
      return { ...prev, [group]: arr };
    });
    setPhase('config');
    setMatched(null);
    setShown(5);
  };

  const runMatch = () => {
    if (phase === 'loading') return;
    setPhase('loading');
    setMatched(null);
    setShown(5);
    setTimeout(() => {
      const list = computeVideoMatches(selected);
      setMatched(list);
      setPhase('results');
    }, 1500);
  };

  const handleApply = (id: string) => {
    if (applied[id]) return;
    setApplied((prev) => ({ ...prev, [id]: true }));
    Alert.alert('已申请', '已提交推广申请，等待商家确认（mock）', [{ text: '好的' }]);
  };

  const handleSave = () => {
    Alert.alert('已保存', 'AI 已为你保存本次匹配（mock）', [{ text: '好的' }]);
  };

  const list = matched || [];
  const shownList = list.slice(0, shown);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* 导航栏 */}
      <View style={styles.navBar}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.navArrow}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.navTitle}>AI 智能选品</Text>
        <TouchableOpacity style={styles.iconBtn} onPress={handleSave}>
          <Text style={styles.navSave}>💾</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.container} contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        {/* 达人卡 */}
        <View style={styles.creatorCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{CREATOR_INFO.avatar}</Text>
          </View>
          <View style={styles.creatorInfo}>
            <Text style={styles.creatorName}>{CREATOR_INFO.name}</Text>
            <Text style={styles.creatorMeta}>
              {CREATOR_INFO.fans}粉丝 · {AC_CREATOR_CTX.industry} · {AC_CREATOR_CTX.region}
            </Text>
            <Text style={styles.creatorHistory}>
              已分销 <Text style={styles.bold}>{CREATOR_INFO.distributed}</Text> 个视频 · 累计赚 <Text style={styles.bold}>¥{CREATOR_INFO.monthlyCommission.toLocaleString()}</Text>
            </Text>
          </View>
        </View>

        {/* 选品偏好 */}
        <Text style={styles.sectionTitle}>🎛 选品偏好</Text>
        {AV_GROUPS.map((g) => {
          const sel = selected[g.key] || ['不限'];
          return (
            <View key={g.key} style={styles.group}>
              <Text style={styles.groupLabel}>{g.label}</Text>
              <View style={styles.chipsRow}>
                {g.options.map((opt) => {
                  const active = sel.includes(opt);
                  return (
                    <TouchableOpacity
                      key={opt}
                      style={[styles.chip, active && styles.chipActive]}
                      activeOpacity={0.7}
                      onPress={() => toggleChip(g.key, opt)}
                    >
                      <Text style={[styles.chipText, active && styles.chipTextActive]}>{opt}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          );
        })}

        {/* 匹配按钮 */}
        <TouchableOpacity
          style={styles.matchBtnWrap}
          activeOpacity={0.85}
          onPress={runMatch}
          disabled={phase === 'loading'}
        >
          <LinearGradient
            colors={[colors.amber, colors.magenta]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.matchBtn, phase === 'loading' && styles.matchBtnDisabled]}
          >
            <Text style={styles.matchIco}>🤖</Text>
            <Text style={styles.matchBtnText}>
              {phase === 'loading' ? 'AI 分析中…' : 'AI 智能匹配'}
            </Text>
          </LinearGradient>
        </TouchableOpacity>

        {/* 结果区 */}
        {phase === 'config' && (
          <View style={styles.hintBox}>
            <Text style={styles.hintText}>设置选品偏好后，点击上方「AI 智能匹配」开始筛选</Text>
          </View>
        )}

        {phase === 'loading' && (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={colors.yellow} />
            <Text style={styles.loadingText}>AI 分析中…</Text>
            <Text style={styles.loadingSub}>正在从素材库智能筛选匹配视频</Text>
          </View>
        )}

        {phase === 'results' && (
          <View>
            {list.length === 0 ? (
              <View style={styles.hintBox}>
                <Text style={styles.hintText}>没有找到匹配的视频，试试放宽选品偏好 🤔</Text>
              </View>
            ) : (
              <>
                <View style={styles.resultsHeader}>
                  <Text style={styles.resultsTitle}>🎯 为你推荐 {list.length} 个视频</Text>
                  <Text style={styles.resultsSub}>按匹配度排序</Text>
                </View>
                {shownList.map((m) => (
                  <VideoCard
                    key={m.id}
                    m={m}
                    applied={!!applied[m.id]}
                    onApply={() => handleApply(m.id)}
                  />
                ))}
                {shown < list.length && (
                  <TouchableOpacity
                    style={styles.moreBtn}
                    activeOpacity={0.7}
                    onPress={() => setShown((s) => s + 3)}
                  >
                    <Text style={styles.moreText}>查看更多视频 ↓</Text>
                  </TouchableOpacity>
                )}
              </>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

export default ProClipsAIVideoScreen;

function VideoCard({
  m, applied, onApply,
}: {
  m: ScoredVideo;
  applied: boolean;
  onApply: () => void;
}) {
  const score = m._score;
  const scoreColor = score >= 90 ? colors.success : score >= 80 ? colors.yellow : colors.txt3;
  const stars = '★'.repeat(m.merchantRating) + (m.merchantRating < 5 ? '☆'.repeat(5 - m.merchantRating) : '');
  const incSummary = incentiveSummary(m.incentive);

  return (
    <View style={styles.videoCard}>
      <View style={styles.videoTop}>
        <View style={[styles.videoThumb, { backgroundColor: m.coverColor }]}>
          <Text style={styles.videoPlay}>▶</Text>
        </View>
        <View style={styles.videoInfo}>
          <Text style={styles.videoTitle} numberOfLines={1}>{m.title}</Text>
          <Text style={styles.videoInc}>🎯 {incSummary}</Text>
          <Text style={styles.videoMeta} numberOfLines={1}>
            {m.merchant} · <Text style={styles.stars}>{stars}</Text> · {priceLabel(m.priceTier)}价位 · {difficultyLabel(m.difficulty)}
          </Text>
        </View>
        <View style={[styles.scoreBox, { borderColor: scoreColor }]}>
          <Text style={[styles.scoreNum, { color: scoreColor }]}>{score}</Text>
          <Text style={styles.scoreLab}>分</Text>
        </View>
      </View>
      <Text style={styles.reason}>💡 {m._reason}</Text>
      <View style={styles.cardFoot}>
        <View style={styles.tagsRow}>
          <View style={styles.tag}><Text style={styles.tagText}>{m.industry}</Text></View>
          <View style={styles.tag}><Text style={styles.tagText}>{priceLabel(m.priceTier)}价</Text></View>
          <View style={styles.tag}>
            <Text style={styles.tagText}>{m.merchantRating === 5 ? '5星商家' : `${m.merchantRating}星`}</Text>
          </View>
        </View>
        <TouchableOpacity
          style={[styles.applyBtn, applied && styles.applyBtnDone]}
          activeOpacity={0.7}
          onPress={onApply}
          disabled={applied}
        >
          <Text style={[styles.applyBtnText, applied && styles.applyBtnTextDone]}>
            {applied ? '已申请' : '申请推广'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bgDeep },
  container: { flex: 1 },
  body: { padding: 16, paddingBottom: 40 },
  // 导航
  navBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 8, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.line,
  },
  iconBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  navArrow: { fontSize: 28, color: colors.txt1, fontWeight: '300', marginTop: -4 },
  navTitle: { fontSize: 15, fontWeight: '700', color: colors.txt1 },
  navSave: { fontSize: 16 },
  // 达人卡
  creatorCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: colors.bgCard, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.line, padding: 12, marginBottom: 16,
  },
  avatar: {
    width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center',
    backgroundColor: colors.magenta,
  },
  avatarText: { fontSize: 20, color: '#fff', fontWeight: '700' },
  creatorInfo: { flex: 1, gap: 3 },
  creatorName: { fontSize: 14, fontWeight: '700', color: colors.txt1 },
  creatorMeta: { fontSize: 11, color: colors.txt3 },
  creatorHistory: { fontSize: 11, color: colors.txt2 },
  bold: { fontWeight: '700', color: colors.txt1 },
  // section
  sectionTitle: { fontSize: 14, fontWeight: '700', color: colors.txt1, marginBottom: 10, marginTop: 4 },
  // group
  group: { marginBottom: 12 },
  groupLabel: { fontSize: 12, color: colors.txt2, marginBottom: 6 },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: {
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 14,
    backgroundColor: colors.bgCard2, borderWidth: 1, borderColor: colors.line,
  },
  chipActive: { borderColor: colors.yellow, backgroundColor: 'rgba(251,191,36,0.12)' },
  chipText: { fontSize: 11, color: colors.txt2 },
  chipTextActive: { color: colors.yellow, fontWeight: '600' },
  // 匹配按钮
  matchBtnWrap: { marginVertical: 16 },
  matchBtn: {
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
    height: 52, borderRadius: 26, gap: 8,
    shadowColor: colors.magenta,
    shadowOpacity: 0.4,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  matchBtnDisabled: { opacity: 0.6 },
  matchIco: { fontSize: 20 },
  matchBtnText: { fontSize: 16, fontWeight: '800', color: '#fff', letterSpacing: 0.5 },
  // 提示/加载
  hintBox: {
    padding: 24, alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.bgCard, borderRadius: radius.md, borderWidth: 1, borderColor: colors.line,
  },
  hintText: { fontSize: 12, color: colors.txt3, textAlign: 'center', lineHeight: 18 },
  loadingBox: { padding: 32, alignItems: 'center' },
  loadingText: { fontSize: 14, fontWeight: '600', color: colors.txt1, marginTop: 12 },
  loadingSub: { fontSize: 11, color: colors.txt3, marginTop: 4 },
  // 结果
  resultsHeader: {
    flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between',
    marginBottom: 10,
  },
  resultsTitle: { fontSize: 14, fontWeight: '700', color: colors.txt1 },
  resultsSub: { fontSize: 11, color: colors.txt3 },
  // 视频卡
  videoCard: {
    backgroundColor: colors.bgCard, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.line, padding: 12, marginBottom: 10,
  },
  videoTop: { flexDirection: 'row', gap: 10, marginBottom: 8 },
  videoThumb: {
    width: 64, height: 48, borderRadius: 8, justifyContent: 'center', alignItems: 'center',
  },
  videoPlay: { fontSize: 16, color: 'rgba(255,255,255,0.85)' },
  videoInfo: { flex: 1, gap: 3 },
  videoTitle: { fontSize: 13, fontWeight: '700', color: colors.txt1 },
  videoInc: { fontSize: 11, color: colors.yellow },
  videoMeta: { fontSize: 11, color: colors.txt3 },
  stars: { color: colors.yellow },
  scoreBox: {
    width: 52, height: 52, borderRadius: 14, borderWidth: 1.5,
    justifyContent: 'center', alignItems: 'center',
  },
  scoreNum: { fontSize: 20, fontWeight: '900' },
  scoreLab: { fontSize: 9, color: colors.txt3, marginTop: -2 },
  reason: {
    fontSize: 11, color: colors.txt2, lineHeight: 16,
    backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 8, padding: 8, marginBottom: 8,
  },
  cardFoot: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  tagsRow: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  tag: {
    paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4,
    backgroundColor: 'rgba(251,191,36,0.14)',
  },
  tagText: { fontSize: 10, color: colors.yellow },
  applyBtn: {
    paddingHorizontal: 14, paddingVertical: 6, borderRadius: 14,
    backgroundColor: colors.rose,
  },
  applyBtnDone: { backgroundColor: colors.bgCard2, borderWidth: 1, borderColor: colors.line },
  applyBtnText: { fontSize: 12, fontWeight: '600', color: '#fff' },
  applyBtnTextDone: { color: colors.txt3 },
  // 更多
  moreBtn: {
    padding: 12, alignItems: 'center', marginTop: 4,
    backgroundColor: colors.bgCard, borderRadius: radius.md, borderWidth: 1, borderColor: colors.line,
  },
  moreText: { fontSize: 12, color: colors.yellow, fontWeight: '600' },
});
