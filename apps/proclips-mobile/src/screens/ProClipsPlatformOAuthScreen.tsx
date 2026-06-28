/**
 * ProClipsPlatformOAuthScreen - 平台 OAuth 授权
 *
 * 对应原型 page-platform-oauth：
 *   3 步状态机：
 *     Step 1 授权确认：Hero + 5 项权限列表（可勾选）+ 同意授权
 *     Step 2 登录：Hero + 手机号/验证码 + 登录并授权
 *     Step 3 成功：Hero + 成功图标 + 绑定账号卡 + 完成
 *
 * 登录逻辑：toast + 1s 后进入 step 3
 * 完成：navigation.goBack()
 */
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import type { AppScreenProps } from '../types/navigation';
import { colors, radius } from '../components/Theme';
import { getPlatformDef, OAUTH_PERMS } from '../services/ProClipsService';

const ProClipsPlatformOAuthScreen: React.FC<AppScreenProps<'ProClipsPlatformOAuth'>> = ({ navigation, route }) => {
  const def = getPlatformDef(route.params.platform);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [perms, setPerms] = useState<boolean[]>([true, true, true, true, false]);
  const [phone, setPhone] = useState('138****8829');
  const [code, setCode] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!def) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>平台未识别</Text>
        </View>
      </SafeAreaView>
    );
  }

  const togglePerm = (i: number) => {
    setPerms((prev) => prev.map((v, idx) => (idx === i ? !v : v)));
  };

  const handleLogin = () => {
    if (!code.trim()) {
      Alert.alert('提示', '请输入验证码', [{ text: '好的' }]);
      return;
    }
    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      setStep(3);
    }, 1000);
  };

  const handleFinish = () => {
    navigation.goBack();
  };

  const handleSendCode = () => {
    Alert.alert('已发送', '验证码已发送（mock）', [{ text: '好的' }]);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* 导航栏 */}
      <View style={styles.navBar}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.navArrow}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.navTitle}>绑定平台账号</Text>
        <View style={styles.iconBtn} />
      </View>

      <ScrollView style={styles.container} contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        {/* Step 1：授权确认 */}
        {step === 1 && (
          <>
            <LinearGradient
              colors={[...def.grad]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.hero}
            >
              <Text style={styles.heroStep}>步骤 1/3 · 授权确认</Text>
              <View style={styles.heroIconWrap}>
                <Text style={styles.heroIconText}>{def.char}</Text>
              </View>
              <Text style={styles.heroTitle}>授权 ProClips 管理你的{def.name}账号</Text>
              <Text style={styles.heroSub}>授权后可一键分发视频并查看多平台数据</Text>
            </LinearGradient>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>将获得以下权限：</Text>
              {OAUTH_PERMS.map((perm, i) => (
                <TouchableOpacity
                  key={i}
                  style={[styles.permRow, perms[i] && styles.permRowChecked]}
                  activeOpacity={0.7}
                  onPress={() => togglePerm(i)}
                >
                  <View style={[styles.permCheck, perms[i] && styles.permCheckOn]}>
                    {perms[i] && <Text style={styles.permCheckIcon}>✓</Text>}
                  </View>
                  <View style={styles.permInfo}>
                    <Text style={styles.permT}>
                      {perm.t}
                      {perm.optional && <Text style={styles.permOpt}> 可选</Text>}
                    </Text>
                    <Text style={styles.permD}>{perm.d}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.note}>🔒 授权后 ProClips 将获得以上权限，你可随时在平台设置中解除授权</Text>

            <View style={styles.ctaRow}>
              <TouchableOpacity style={styles.btnGhost} activeOpacity={0.7} onPress={() => navigation.goBack()}>
                <Text style={styles.btnGhostText}>取消</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.btnPrimary} activeOpacity={0.7} onPress={() => setStep(2)}>
                <Text style={styles.btnPrimaryText}>同意授权</Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        {/* Step 2：登录 */}
        {step === 2 && (
          <>
            <LinearGradient
              colors={[...def.grad]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.hero}
            >
              <Text style={styles.heroStep}>步骤 2/3 · 登录{def.name}</Text>
              <View style={styles.heroIconWrap}>
                <Text style={styles.heroIconText}>{def.char}</Text>
              </View>
              <Text style={styles.heroTitle}>登录你的{def.name}账号</Text>
              <Text style={styles.heroSub}>登录后将完成授权绑定</Text>
            </LinearGradient>

            <View style={styles.card}>
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>手机号</Text>
                <TextInput
                  style={styles.fieldInput}
                  value={phone}
                  onChangeText={setPhone}
                  placeholder="请输入手机号"
                  placeholderTextColor={colors.txt3}
                  keyboardType="phone-pad"
                />
              </View>
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>验证码</Text>
                <View style={styles.codeRow}>
                  <TextInput
                    style={[styles.fieldInput, styles.codeInput]}
                    value={code}
                    onChangeText={setCode}
                    placeholder="6 位验证码"
                    placeholderTextColor={colors.txt3}
                    keyboardType="number-pad"
                    maxLength={6}
                  />
                  <TouchableOpacity style={styles.codeBtn} activeOpacity={0.7} onPress={handleSendCode}>
                    <Text style={styles.codeBtnText}>获取验证码</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            <Text style={styles.note}>🔒 仅用于本次授权登录，ProClips 不会保存你的密码</Text>

            <View style={styles.ctaRow}>
              <TouchableOpacity style={styles.btnGhost} activeOpacity={0.7} onPress={() => setStep(1)}>
                <Text style={styles.btnGhostText}>上一步</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.btnPrimary, submitting && styles.btnPrimaryDisabled]}
                activeOpacity={0.7}
                onPress={handleLogin}
                disabled={submitting}
              >
                <Text style={styles.btnPrimaryText}>{submitting ? '授权中…' : '登录并授权'}</Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        {/* Step 3：成功 */}
        {step === 3 && (
          <>
            <LinearGradient
              colors={[...def.grad]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[styles.hero, styles.heroShort]}
            >
              <Text style={styles.heroStep}>步骤 3/3 · 绑定成功</Text>
            </LinearGradient>

            <View style={styles.successBox}>
              <View style={styles.successCheck}>
                <Text style={styles.successCheckIcon}>✓</Text>
              </View>
              <Text style={styles.successTitle}>绑定成功！</Text>
              <Text style={styles.successSub}>已成功绑定{def.name}账号</Text>
            </View>

            <View style={styles.accountCard}>
              <LinearGradient colors={[...def.grad]} style={styles.platIcon}>
                <Text style={styles.platIconText}>{def.char}</Text>
              </LinearGradient>
              <View style={styles.accountInfo}>
                <Text style={styles.accountName}>老王火锅店</Text>
                <Text style={styles.accountSub}>{def.name} · 1.2w粉</Text>
              </View>
              <View style={styles.tagBound}>
                <Text style={styles.tagBoundText}>已绑定</Text>
              </View>
            </View>

            <View style={styles.ctaRow}>
              <TouchableOpacity style={styles.btnPrimaryFull} activeOpacity={0.7} onPress={handleFinish}>
                <Text style={styles.btnPrimaryText}>完成</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

export default ProClipsPlatformOAuthScreen;

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bgDeep },
  container: { flex: 1 },
  body: { padding: 16, paddingBottom: 40 },
  errorBox: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText: { fontSize: 14, color: colors.txt3 },
  // 导航
  navBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 8, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.line,
  },
  iconBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  navArrow: { fontSize: 28, color: colors.txt1, fontWeight: '300', marginTop: -4 },
  navTitle: { fontSize: 15, fontWeight: '700', color: colors.txt1 },
  // Hero
  hero: {
    borderRadius: radius.lg, padding: 20, alignItems: 'center', marginBottom: 16,
  },
  heroShort: { paddingBottom: 12 },
  heroStep: { fontSize: 11, color: 'rgba(255,255,255,0.85)', fontWeight: '600', marginBottom: 16 },
  heroIconWrap: {
    width: 64, height: 64, borderRadius: 32, justifyContent: 'center', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)', marginBottom: 16,
  },
  heroIconText: { fontSize: 28, color: '#fff', fontWeight: '700' },
  heroTitle: { fontSize: 15, fontWeight: '700', color: '#fff', marginBottom: 6, textAlign: 'center' },
  heroSub: { fontSize: 12, color: 'rgba(255,255,255,0.85)', textAlign: 'center' },
  // 卡片
  card: {
    backgroundColor: colors.bgCard, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.line, padding: 14, marginBottom: 12,
  },
  cardTitle: { fontSize: 13, fontWeight: '700', color: colors.txt1, marginBottom: 10 },
  // 权限
  permRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8,
    borderBottomWidth: 1, borderBottomColor: colors.line,
  },
  permRowChecked: {},
  permCheck: {
    width: 20, height: 20, borderRadius: 6, borderWidth: 1.5, borderColor: colors.line,
    justifyContent: 'center', alignItems: 'center',
  },
  permCheckOn: { backgroundColor: colors.cyan, borderColor: colors.cyan },
  permCheckIcon: { fontSize: 13, color: '#000', fontWeight: '900' },
  permInfo: { flex: 1 },
  permT: { fontSize: 12, fontWeight: '600', color: colors.txt1 },
  permOpt: { fontSize: 10, color: colors.txt3, fontWeight: '400' },
  permD: { fontSize: 11, color: colors.txt3, marginTop: 2 },
  // 表单
  field: { marginBottom: 12 },
  fieldLabel: { fontSize: 12, color: colors.txt2, marginBottom: 6 },
  fieldInput: {
    height: 42, borderRadius: 10, paddingHorizontal: 12,
    backgroundColor: colors.bgCard2, color: colors.txt1, fontSize: 13, paddingVertical: 0,
    borderWidth: 1, borderColor: colors.line,
  },
  codeRow: { flexDirection: 'row', gap: 8 },
  codeInput: { flex: 1 },
  codeBtn: {
    paddingHorizontal: 12, justifyContent: 'center', alignItems: 'center',
    backgroundColor: 'rgba(0,210,255,0.12)', borderWidth: 1, borderColor: 'rgba(0,210,255,0.3)', borderRadius: 10,
  },
  codeBtnText: { fontSize: 11, color: colors.cyan, fontWeight: '600' },
  // 提示
  note: { fontSize: 11, color: colors.txt3, lineHeight: 17, marginBottom: 16 },
  // CTA
  ctaRow: { flexDirection: 'row', gap: 10, marginTop: 4 },
  btnGhost: {
    flex: 1, paddingVertical: 13, borderRadius: 12, alignItems: 'center',
    backgroundColor: colors.bgCard2, borderWidth: 1, borderColor: colors.line,
  },
  btnGhostText: { fontSize: 14, fontWeight: '600', color: colors.txt2 },
  btnPrimary: {
    flex: 1, paddingVertical: 13, borderRadius: 12, alignItems: 'center',
    backgroundColor: colors.cyan,
  },
  btnPrimaryDisabled: { opacity: 0.6 },
  btnPrimaryFull: {
    flex: 1, paddingVertical: 13, borderRadius: 12, alignItems: 'center',
    backgroundColor: colors.cyan,
  },
  btnPrimaryText: { fontSize: 14, fontWeight: '700', color: '#000' },
  // 成功
  successBox: { alignItems: 'center', paddingVertical: 24, marginBottom: 16 },
  successCheck: {
    width: 72, height: 72, borderRadius: 36, justifyContent: 'center', alignItems: 'center',
    backgroundColor: colors.success, marginBottom: 16,
  },
  successCheckIcon: { fontSize: 36, color: '#fff', fontWeight: '900' },
  successTitle: { fontSize: 20, fontWeight: '900', color: colors.txt1, marginBottom: 6 },
  successSub: { fontSize: 13, color: colors.txt3 },
  // 账号卡
  accountCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: colors.bgCard, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.line, padding: 12, marginBottom: 16,
  },
  platIcon: {
    width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center',
  },
  platIconText: { fontSize: 17, color: '#fff', fontWeight: '700' },
  accountInfo: { flex: 1 },
  accountName: { fontSize: 14, fontWeight: '700', color: colors.txt1 },
  accountSub: { fontSize: 12, color: colors.txt2, marginTop: 3 },
  tagBound: {
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8,
    backgroundColor: 'rgba(34,197,94,0.16)', borderWidth: 1, borderColor: 'rgba(34,197,94,0.4)',
  },
  tagBoundText: { fontSize: 10, color: colors.success, fontWeight: '600' },
});
