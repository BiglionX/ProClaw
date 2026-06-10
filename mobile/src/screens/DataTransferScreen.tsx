/**
 * DataTransferScreen - 跨身份数据导出/导入向导
 * 允许用户将一个身份的数据导出并导入到另一个身份。
 *
 * 对应 PRD v11.0 第6.3节：数据共享机制
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Alert,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { listProfiles, type Profile } from '../services/ProfileManager';
import { exportProfileData, importProfileData, estimateRowCounts, DEFAULT_EXPORT_TABLES } from '../services/DataExportService';
import type { ExportDataPackage, ImportConfig } from '../services/DataExportService';
import { useAppStore } from '../stores/AppStore';

type WizardStep = 'select_profile' | 'select_tables' | 'configure' | 'progress' | 'result';

// 从 DataExportService 导入共享的 DEFAULT_EXPORT_TABLES

const DataTransferScreen: React.FC = () => {
  const [step, setStep] = useState<WizardStep>('select_profile');
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [currentProfile, setCurrentProfileState] = useState<Profile | null>(null);
  const [selectedSource, setSelectedSource] = useState<Profile | null>(null);
  const [rowCounts, setRowCounts] = useState<Record<string, number> | null>(null);
  const [selectedTables, setSelectedTables] = useState<Set<string>>(new Set(DEFAULT_EXPORT_TABLES.map(t => t.key)));
  const [conflictStrategy, setConflictStrategy] = useState<ImportConfig['onConflict']>('skip');
  const [clearBeforeImport, setClearBeforeImport] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0, message: '' });
  const [result, setResult] = useState<{ imported: number; skipped: number; errors: string[] } | null>(null);
  const [executing, setExecuting] = useState(false);

  useEffect(() => {
    loadProfiles();
  }, []);

  const loadProfiles = async () => {
    const items = await listProfiles();
    setProfiles(items);
    const current = useAppStore.getState().currentProfile;
    setCurrentProfileState(current);
  };

  // 选择源身份时预估行数
  const handleSelectSource = async (profile: Profile) => {
    setSelectedSource(profile);
    setRowCounts(null);
    try {
      const counts = await estimateRowCounts(profile.id);
      setRowCounts(counts);
    } catch {
      // 行数预估失败不影响流程
    }
  };

  const toggleTable = (tableKey: string) => {
    setSelectedTables(prev => {
      const next = new Set(prev);
      if (next.has(tableKey)) {
        next.delete(tableKey);
      } else {
        next.add(tableKey);
      }
      return next;
    });
  };

  const toggleAllTables = () => {
    if (selectedTables.size === DEFAULT_EXPORT_TABLES.length) {
      setSelectedTables(new Set());
    } else {
      setSelectedTables(new Set(DEFAULT_EXPORT_TABLES.map(t => t.key)));
    }
  };

  const handleExecute = async () => {
    if (!selectedSource || selectedTables.size === 0) return;

    setExecuting(true);
    setStep('progress');
    setProgress({ current: 0, total: 0, message: '正在导出源身份数据...' });

    try {
      // 1. 导出源身份数据
      const tableNames = Array.from(selectedTables);
      const data = await exportProfileData(selectedSource.id, tableNames);

      setProgress({ current: 1, total: 2, message: '正在导入到当前身份...' });

      // 2. 导入到当前身份
      const config: ImportConfig = {
        onConflict: conflictStrategy,
        includeRelated: true,
        clearBeforeImport,
      };
      const importResult = await importProfileData(
        currentProfile!.id,
        data,
        config
      );

      setResult(importResult);
      setStep('result');
    } catch (error: any) {
      Alert.alert('传输失败', error?.message || '数据传输过程中发生错误');
      setStep('select_profile');
    } finally {
      setExecuting(false);
    }
  };

  const renderProfileStep = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>选择源身份</Text>
      <Text style={styles.stepSubtitle}>
        选择要从中导出数据的身份（当前身份作为导入目标）
      </Text>

      {currentProfile && (
        <View style={styles.targetBadge}>
          <MaterialCommunityIcons name="arrow-down-circle" size={20} color="#00d2ff" />
          <Text style={styles.targetBadgeText}>
            导入目标：{currentProfile.name}
          </Text>
        </View>
      )}

      <FlatList
        data={profiles.filter(p => p.id !== currentProfile?.id)}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[
              styles.profileItem,
              selectedSource?.id === item.id && styles.profileItemSelected,
            ]}
            onPress={() => handleSelectSource(item)}
          >
            <Text style={styles.profileAvatar}>{item.avatar || '\uD83D\uDC64'}</Text>
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>{item.name}</Text>
              <Text style={styles.profileDate}>
                创建于 {new Date(item.createdAt).toLocaleDateString('zh-CN')}
              </Text>
            </View>
            {selectedSource?.id === item.id && (
              <MaterialCommunityIcons name="check-circle" size={24} color="#00d2ff" />
            )}
          </TouchableOpacity>
        )}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.glassEmptyState}>
            <MaterialCommunityIcons name="information-outline" size={48} color="rgba(0,210,255,0.3)" />
            <Text style={styles.emptyText}>没有其他身份可供选择</Text>
            <Text style={styles.emptyHint}>请先在身份管理页面创建其他身份</Text>
          </View>
        }
      />

      <TouchableOpacity
        style={[styles.primaryButton, !selectedSource && styles.buttonDisabled]}
        onPress={() => setStep('select_tables')}
        disabled={!selectedSource}
      >
        <Text style={styles.primaryButtonText}>下一步：选择数据表</Text>
      </TouchableOpacity>
    </View>
  );

  const renderTablesStep = () => (
    <View style={styles.stepContainer}>
      <View style={styles.stepHeader}>
        <TouchableOpacity onPress={() => setStep('select_profile')}>
          <MaterialCommunityIcons name="arrow-left" size={24} color="#00d2ff" />
        </TouchableOpacity>
        <Text style={styles.stepTitle}>选择要传输的数据表</Text>
      </View>

      <TouchableOpacity style={styles.selectAllRow} onPress={toggleAllTables}>
        <MaterialCommunityIcons
          name={selectedTables.size === DEFAULT_EXPORT_TABLES.length ? 'checkbox-marked' : 'checkbox-blank-outline'}
          size={22}
          color="#00d2ff"
        />
        <Text style={styles.selectAllText}>
          {selectedTables.size === DEFAULT_EXPORT_TABLES.length ? '取消全选' : '全选'}
        </Text>
        <Text style={styles.selectAllCount}>{selectedTables.size}/{DEFAULT_EXPORT_TABLES.length}</Text>
      </TouchableOpacity>

      <ScrollView style={styles.tableList}>
        {DEFAULT_EXPORT_TABLES.map(table => {
          const count = rowCounts?.[table.key];
          return (
            <TouchableOpacity
              key={table.key}
              style={styles.tableItem}
              onPress={() => toggleTable(table.key)}
            >
              <MaterialCommunityIcons
                name={selectedTables.has(table.key) ? 'checkbox-marked' : 'checkbox-blank-outline'}
                size={22}
                color={selectedTables.has(table.key) ? '#00d2ff' : 'rgba(255,255,255,0.25)'}
              />
              <MaterialCommunityIcons name={table.icon as any} size={20} color="rgba(255,255,255,0.5)" style={styles.tableIcon} />
              <Text style={styles.tableLabel}>{table.label}</Text>
              {count !== undefined && (
                <Text style={styles.tableCount}>{count > 0 ? `${count} 条` : '空'}</Text>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <TouchableOpacity
        style={[styles.primaryButton, selectedTables.size === 0 && styles.buttonDisabled]}
        onPress={() => setStep('configure')}
        disabled={selectedTables.size === 0}
      >
        <Text style={styles.primaryButtonText}>下一步：传输配置</Text>
      </TouchableOpacity>
    </View>
  );

  const renderConfigureStep = () => (
    <View style={styles.stepContainer}>
      <View style={styles.stepHeader}>
        <TouchableOpacity onPress={() => setStep('select_tables')}>
          <MaterialCommunityIcons name="arrow-left" size={24} color="#00d2ff" />
        </TouchableOpacity>
        <Text style={styles.stepTitle}>传输配置</Text>
      </View>

      <View style={styles.configSummary}>
        <Text style={styles.configSummaryText}>
          从 <Text style={styles.configHighlight}>{selectedSource?.name}</Text> 传输
          {selectedTables.size} 个表到 <Text style={styles.configHighlight}>{currentProfile?.name}</Text>
        </Text>
      </View>

      <Text style={styles.configSectionTitle}>冲突处理策略</Text>
      {([
        { value: 'skip' as const, label: '跳过重复', desc: '目标身份已有相同ID的记录将被保留，不覆盖' },
        { value: 'overwrite' as const, label: '覆盖', desc: '目标身份已有相同ID的记录将被覆盖' },
      ]).map(option => (
        <TouchableOpacity
          key={option.value}
          style={styles.optionRow}
          onPress={() => setConflictStrategy(option.value)}
        >
          <MaterialCommunityIcons
            name={conflictStrategy === option.value ? 'radiobox-marked' : 'radiobox-blank'}
            size={22}
            color={conflictStrategy === option.value ? '#00d2ff' : 'rgba(255,255,255,0.25)'}
          />
          <View style={styles.optionContent}>
            <Text style={styles.optionLabel}>{option.label}</Text>
            <Text style={styles.optionDesc}>{option.desc}</Text>
          </View>
        </TouchableOpacity>
      ))}

      <Text style={styles.configSectionTitle}>导入前操作</Text>
      <TouchableOpacity
        style={styles.optionRow}
        onPress={() => setClearBeforeImport(!clearBeforeImport)}
      >
        <MaterialCommunityIcons
          name={clearBeforeImport ? 'checkbox-marked' : 'checkbox-blank-outline'}
          size={22}
          color={clearBeforeImport ? '#ff6b9d' : 'rgba(255,255,255,0.25)'}
        />
        <View style={styles.optionContent}>
          <Text style={[styles.optionLabel, clearBeforeImport && { color: '#ff6b9d' }]}>
            导入前清空目标表
          </Text>
          <Text style={styles.optionDesc}>先删除目标身份中的所有数据，再导入（不可恢复）</Text>
        </View>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.primaryButton, { backgroundColor: 'rgba(0,245,212,0.25)', borderColor: 'rgba(0,245,212,0.4)' }]}
        onPress={handleExecute}
      >
        <Text style={styles.primaryButtonText}>开始传输</Text>
      </TouchableOpacity>
    </View>
  );

  const renderProgressStep = () => (
    <View style={[styles.stepContainer, styles.centerStep]}>
      <ActivityIndicator size="large" color="#00d2ff" />
      <Text style={styles.progressTitle}>正在传输数据...</Text>
      <Text style={styles.progressMessage}>{progress.message}</Text>
    </View>
  );

  const renderResultStep = () => (
    <View style={[styles.stepContainer, styles.centerStep]}>
      <MaterialCommunityIcons
        name={result && result.errors.length === 0 ? 'check-circle' : 'alert-circle'}
        size={64}
        color={result && result.errors.length === 0 ? '#00f5d4' : '#ff6b9d'}
      />
      <Text style={styles.resultTitle}>
        {result && result.errors.length === 0 ? '传输完成' : '传输完成（有警告）'}
      </Text>

      <View style={styles.resultCard}>
        <View style={styles.resultRow}>
          <Text style={styles.resultLabel}>成功导入</Text>
          <Text style={styles.resultValue}>{result?.imported || 0} 条</Text>
        </View>
        <View style={styles.resultRow}>
          <Text style={styles.resultLabel}>已跳过</Text>
          <Text style={styles.resultValue}>{result?.skipped || 0} 条</Text>
        </View>
        {result && result.errors.length > 0 && (
          <View style={styles.resultRow}>
            <Text style={[styles.resultLabel, { color: '#ff6b9d' }]}>错误</Text>
            <Text style={[styles.resultValue, { color: '#ff6b9d' }]}>{result.errors.length} 条</Text>
          </View>
        )}
      </View>

      {result && result.errors.length > 0 && (
        <ScrollView style={styles.errorList}>
          {result.errors.map((err, idx) => (
            <Text key={idx} style={styles.errorText}>{err}</Text>
          ))}
        </ScrollView>
      )}

      <TouchableOpacity
        style={styles.primaryButton}
        onPress={() => {
          setStep('select_profile');
          setSelectedSource(null);
          setResult(null);
        }}
      >
        <Text style={styles.primaryButtonText}>完成</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <LinearGradient colors={['#0f0c29', '#302b63', '#24243e']} style={{ flex: 1 }}>
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* 步骤指示器 */}
        <View style={styles.glassStepsIndicator}>
          {['select_profile', 'select_tables', 'configure', 'progress', 'result'].map((s, idx) => {
            const stepNames = ['选择身份', '选择表', '配置', '传输', '完成'];
            const isActive = step === s;
            const isDone = ['select_profile', 'select_tables', 'configure', 'progress', 'result'].indexOf(step) > idx;
            return (
              <View key={s} style={styles.stepDotRow}>
                <View style={[styles.stepDot, isActive && styles.stepDotActive, isDone && styles.stepDotDone]}>
                  <Text style={[styles.stepDotText, (isActive || isDone) && styles.stepDotTextActive]}>
                    {isDone ? '\u2713' : idx + 1}
                  </Text>
                </View>
                <Text style={[styles.stepDotLabel, isActive && styles.stepDotLabelActive]}>
                  {stepNames[idx]}
                </Text>
                {idx < 4 && <View style={[styles.stepLine, isDone && styles.stepLineDone]} />}
              </View>
            );
          })}
        </View>

        {step === 'select_profile' && renderProfileStep()}
        {step === 'select_tables' && renderTablesStep()}
        {step === 'configure' && renderConfigureStep()}
        {step === 'progress' && renderProgressStep()}
        {step === 'result' && renderResultStep()}
      </ScrollView>
    </SafeAreaView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    paddingBottom: 40,
  },
  glassStepsIndicator: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  stepDotRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepDotActive: {
    backgroundColor: '#00d2ff',
  },
  stepDotDone: {
    backgroundColor: '#00f5d4',
  },
  stepDotText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.4)',
  },
  stepDotTextActive: {
    color: '#fff',
  },
  stepDotLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.35)',
    marginLeft: 4,
    minWidth: 36,
  },
  stepDotLabelActive: {
    color: '#00d2ff',
    fontWeight: '600',
  },
  stepLine: {
    width: 20,
    height: 2,
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginHorizontal: 4,
  },
  stepLineDone: {
    backgroundColor: '#00f5d4',
  },
  stepContainer: {
    padding: 20,
  },
  centerStep: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
  },
  stepHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  stepTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: 'rgba(255,255,255,0.95)',
    marginBottom: 8,
    marginLeft: 12,
  },
  stepSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.45)',
    marginBottom: 20,
    lineHeight: 20,
  },
  targetBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,210,255,0.1)',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(0,210,255,0.25)',
  },
  targetBadgeText: {
    fontSize: 14,
    color: '#00d2ff',
    fontWeight: '500',
    marginLeft: 8,
  },
  listContent: {
    paddingBottom: 16,
  },
  profileItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  profileItemSelected: {
    borderColor: '#00d2ff',
    backgroundColor: 'rgba(0,210,255,0.08)',
  },
  profileAvatar: {
    fontSize: 32,
    marginRight: 14,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 17,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.9)',
  },
  profileDate: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.35)',
    marginTop: 2,
  },
  glassEmptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 12,
  },
  emptyHint: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.3)',
    marginTop: 4,
  },
  selectAllRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,210,255,0.08)',
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,210,255,0.2)',
  },
  selectAllText: {
    fontSize: 14,
    color: '#00d2ff',
    fontWeight: '500',
    marginLeft: 8,
    flex: 1,
  },
  selectAllCount: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.4)',
  },
  tableList: {
    maxHeight: 400,
  },
  tableItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 10,
    padding: 14,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  tableIcon: {
    marginLeft: 10,
    marginRight: 10,
  },
  tableLabel: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.8)',
    flex: 1,
  },
  tableCount: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.35)',
    marginLeft: 8,
  },
  primaryButton: {
    backgroundColor: 'rgba(0,210,255,0.25)',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 16,
    borderWidth: 1,
    borderColor: 'rgba(0,210,255,0.4)',
    shadowColor: '#00d2ff',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  buttonDisabled: {
    backgroundColor: 'rgba(0,210,255,0.08)',
    borderColor: 'rgba(0,210,255,0.15)',
    },
  configSummary: {
    backgroundColor: 'rgba(0,210,255,0.08)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderLeftWidth: 3,
    borderLeftColor: '#00d2ff',
  },
  configSummaryText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    lineHeight: 20,
  },
  configHighlight: {
    fontWeight: '700',
    color: '#00d2ff',
  },
  configSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 12,
    marginTop: 8,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 10,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  optionContent: {
    flex: 1,
    marginLeft: 10,
  },
  optionLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.8)',
  },
  optionDesc: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.35)',
    marginTop: 2,
    lineHeight: 16,
  },
  progressTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.9)',
    marginTop: 20,
  },
  progressMessage: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 8,
  },
  resultTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: 'rgba(255,255,255,0.95)',
    marginTop: 16,
  },
  resultCard: {
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 14,
    padding: 16,
    marginTop: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  resultRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  resultLabel: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.5)',
  },
  resultValue: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.85)',
  },
  errorList: {
    maxHeight: 120,
    width: '100%',
  },
  errorText: {
    fontSize: 12,
    color: '#ff6b9d',
    marginBottom: 4,
  },
});

export default DataTransferScreen;
