/**
 * ProClipsAICreatorScreen - AI 智能选达人（商家侧）
 *
 * 对应原型 page-ai-creator：
 *   视频卡（缩略图 + 标题 + 激励摘要）
 *   + 7 组属性筛选 chips（粉丝/行业/地域/性别/口碑/风格/业绩）
 *   + AI 智能匹配按钮
 *   + 结果区（config 提示 / loading / 达人卡片列表）
 *   + 达人卡片（头像 + 名字 + 评分 + 粉丝/行业/地域/性别 + 历史业绩 + 分数 + 理由 + 标签 + 邀请按钮）
 */
import React, { useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import type { AppScreenProps } from '../types/navigation';
import { colors, gradients, radius } from '../components/Theme';
import {
  AC_GROUPS, MOCK_VIDEOS, computeCreatorMatches, incentiveSummary,
  type CreatorCandidate,
} from '../services/ProClipsService';

type Phase = 'config' | 'loading' | 'results';
type ScoredCreator = CreatorCandidate & { _score: number; _reason: string };

function freshSelection(): Record<string, string[]> {
  const sel: Record<string, string[]> = {};
  AC_GROUPS.forEach((g) => { sel[g.key] = ['不限']; });
  return sel;
}

const ProClipsAICreatorScreen: React.FC<AppScreenProps<'ProClipsAICreator'>> = ({ navigation, route }) => {
  const videoIdParam = route.params?.videoId;

  // 选中的视频（mock：取第一条或匹配 id）
  const video = useMemo(() => {
    if (videoIdParam) {
      const v = MOCK_VIDEOS.find((x) => x.id === videoIdParam);
      if (v) return v;
    }
    return MOCK_VIDEOS[0];
  }, [videoIdParam]);

  const [selected, setSelected] = useState<Record<string, string[]>>(freshSelection);
  const [phase, setPhase] = useState<Phase>('config');
  const [matched, setMatched] = useState<ScoredCreator[] | null>(null);
  const [shown, setShown] = useState(5);
  const [invited, setInvited] = useState<Record<string, boolean>>({});

  const incSummary = video.incentive ? incentiveSummary(video.incentive) : '未设激励';

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
    // 模拟 AI 分析延迟
    setTimeout(() => {
      const list = computeCreatorMatches(selected);
      setMatched(list);
      setPhase('results');
    }, 1500);
  };

  const handleInvite = (id: string) => {
    if (invited[id]) return;
    setInvited((prev) => ({ ...prev, [id]: true }));
    Alert.alert('已邀请', '已发送推广邀请，等待达人确认（mock）', [{ text: '好的' }]);
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
        <Text style={styles.navTitle}>AI 智能选达人</Text>
        <TouchableOpacity style={styles.iconBtn} onPress={handleSave}>
          <Text style={styles.navSave}>💾</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.container} contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        {/* 视频卡 */}
        <View style={styles.videoCard}>
          <View style={[styles.videoThumb, { backgroundColor: video.coverColor }]}>
            <Text style={styles.videoPlay}>▶</Text>
          </View>
          <View style={styles.videoInfo}>
            <Text style={styles.videoTitle} numberOfLines={1}>{video.title}</Text>
            <Text style={styles.videoInc}>🎯 激励：{incSummary}</Text>
          </View>
        </View>

        {/* 属性筛选 */}
        <Text style={styles.sectionTitle}>🎛 达人属性要求</Text>
        {AC_GROUPS.map((g) => {
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
            colors={[...gradients.main]}
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
            <Text style={styles.hintText}>设置达人属性要求后，点击上方「AI 智能匹配」开始筛选</Text>
          </View>
        )}

        {phase === 'loading' && (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={colors.magenta} />
            <Text style={styles.loadingText}>AI 分析中…</Text>
            <Text style={styles.loadingSub}>正在从达人库中智能筛选匹配</Text>
          </View>
        )}

        {phase === 'results' && (
          <View>
            {list.length === 0 ? (
              <View style={styles.hintBox}>
                <Text style={styles.hintText}>没有找到匹配的达人，试试放宽属性要求 🤔</Text>
              </View>
            ) : (
              <>
                <View style={styles.resultsHeader}>
                  <Text style={styles.resultsTitle}>🎯 为你推荐 {list.length} 位达人</Text>
                  <Text style={styles.resultsSub}>按匹配度排序</Text>
                </View>
                {shownList.map((c) => (
                  <CreatorCard
                    key={c.id}
                    c={c}
                    invited={!!invited[c.id]}
                    onInvite={() => handleInvite(c.id)}
                  />
                ))}
                {shown < list.length && (
                  <TouchableOpacity
                    style={styles.moreBtn}
                    activeOpacity={0.7}
                    onPress={() => setShown((s) => s + 3)}
                  >
                    <Text style={styles.moreText}>查看更多达人 ↓</Text>
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

export default ProClipsAICreatorScreen;

function CreatorCard({
  c, invited, onInvite,
}: {
  c: ScoredCreator;
  invited: boolean;
  onInvite: () => void;
}) {
  const score = c._score;
  const scoreColor = score >= 90 ? colors.success : score >= 80 ? colors.yellow : colors.txt3;
  const stars = '★'.repeat(c.rating) + (c.rating < 5 ? '☆'.repeat(5 - c.rating) : '');

  return (
    <View style={styles.creatorCard}>
      <View style={styles.creatorTop}>
        <View style={[styles.avatar, { backgroundColor: c.coverColor }]}>
          <Text style={styles.avatarText}>{c.avatar}</Text>
        </View>
        <View style={styles.creatorInfo}>
          <Text style={styles.creatorName}>
            {c.name} <Text style={styles.rating}>{stars}</Text>
          </Text>
          <Text style={styles.creatorMeta}>
            {c.fansText}粉丝 · {c.industry} · {c.region} · {c.gender}
          </Text>
          <Text style={styles.creatorHistory}>
            分销 <Text style={styles.bold}>{c.orders}单</Text> · 累计赚 <Text style={styles.bold}>¥{c.earnings.toLocaleString()}</Text>
          </Text>
        </View>
        <View style={[styles.scoreBox, { borderColor: scoreColor }]}>
          <Text style={[styles.scoreNum, { color: scoreColor }]}>{score}</Text>
          <Text style={styles.scoreLab}>分</Text>
        </View>
      </View>
      <Text style={styles.reason}>💡 {c._reason}</Text>
      <View style={styles.cardFoot}>
        <View style={styles.tagsRow}>
          {c.tags.map((t) => (
            <View key={t} style={styles.tag}>
              <Text style={styles.tagText}>{t}</Text>
            </View>
          ))}
        </View>
        <TouchableOpacity
          style={[styles.inviteBtn, invited && styles.inviteBtnDone]}
          activeOpacity={0.7}
          onPress={onInvite}
          disabled={invited}
        >
          <Text style={[styles.inviteBtnText, invited && styles.inviteBtnTextDone]}>
            {invited ? '已邀请' : '邀请'}
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
  // 视频卡
  videoCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: colors.bgCard, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.line, padding: 10, marginBottom: 16,
  },
  videoThumb: {
    width: 64, height: 48, borderRadius: 8, justifyContent: 'center', alignItems: 'center',
  },
  videoPlay: { fontSize: 16, color: 'rgba(255,255,255,0.85)' },
  videoInfo: { flex: 1 },
  videoTitle: { fontSize: 13, fontWeight: '700', color: colors.txt1, marginBottom: 4 },
  videoInc: { fontSize: 11, color: colors.cyan },
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
  chipActive: { borderColor: colors.cyan, backgroundColor: 'rgba(0,210,255,0.12)' },
  chipText: { fontSize: 11, color: colors.txt2 },
  chipTextActive: { color: colors.cyan, fontWeight: '600' },
  // 匹配按钮
  matchBtnWrap: { marginVertical: 16 },
  matchBtn: {
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
    height: 52, borderRadius: 26, gap: 8,
    shadowColor: colors.purple,
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
  // 达人卡
  creatorCard: {
    backgroundColor: colors.bgCard, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.line, padding: 12, marginBottom: 10,
  },
  creatorTop: { flexDirection: 'row', gap: 10, marginBottom: 8 },
  avatar: {
    width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center',
  },
  avatarText: { fontSize: 18, color: '#fff', fontWeight: '700' },
  creatorInfo: { flex: 1, gap: 3 },
  creatorName: { fontSize: 13, fontWeight: '700', color: colors.txt1 },
  rating: { fontSize: 11, color: colors.yellow },
  creatorMeta: { fontSize: 11, color: colors.txt3 },
  creatorHistory: { fontSize: 11, color: colors.txt2 },
  bold: { fontWeight: '700', color: colors.txt1 },
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
    backgroundColor: 'rgba(168,85,247,0.14)',
  },
  tagText: { fontSize: 10, color: colors.purple },
  inviteBtn: {
    paddingHorizontal: 14, paddingVertical: 6, borderRadius: 14,
    backgroundColor: colors.magenta,
  },
  inviteBtnDone: { backgroundColor: colors.bgCard2, borderWidth: 1, borderColor: colors.line },
  inviteBtnText: { fontSize: 12, fontWeight: '600', color: '#fff' },
  inviteBtnTextDone: { color: colors.txt3 },
  // 更多
  moreBtn: {
    padding: 12, alignItems: 'center', marginTop: 4,
    backgroundColor: colors.bgCard, borderRadius: radius.md, borderWidth: 1, borderColor: colors.line,
  },
  moreText: { fontSize: 12, color: colors.cyan, fontWeight: '600' },
});
