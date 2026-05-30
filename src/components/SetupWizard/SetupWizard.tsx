import { useCallback, useEffect, useRef, useState } from 'react';
import { Box } from '@mui/material';
import { safeInvoke } from '../../lib/tauri';
import { useAppModeStore, PluginManager } from '../../config/appMode';
import { CEOBubble } from './CEOBubble';
import { StepIndicator } from './StepIndicator';
import { PathSelector } from './PathSelector';
import { CompanyNameInput } from './CompanyNameInput';
import { ModelConfigStep } from './ModelConfigStep';
import { CompletionScreen } from './CompletionScreen';
import { StoreTypeSelector } from './StoreTypeSelector';
import { DataImportStep } from './DataImportStep';
import { IndustrySelector } from './IndustrySelector';
import { PlatformBindStep } from './PlatformBindStep';
import { pluginLoader } from '../../lib/pluginLoader';
import { isTauri } from '../../lib/tauri';
import {
  CHAT_AREA_SX,
  INPUT_AREA_SX,
  WIZARD_CONTAINER_SX,
} from './ceoAgentStyles';
import type { DialogueNode, SetupContext, SetupStep, LightSetupStep } from './dialogueScript';
import {
  getCompletionDialogue,
  getCompanyNameDialogue,
  getGreetingDialogue,
  getLightStoreTypeDialogue,
  getLightDataImportDialogue,
  getLightPlatformBindDialogue,
  getLightContentInitDialogue,
  getLightCompletionDialogue,
  getPathSelectionDialogue,
  getProCloudConfirmDialogue,
} from './dialogueScript';
import { generatePersonalizedText } from './llmEnhancer';

// ==================== 状态常量 ====================

const STANDARD_STEPS = ['industry', 'greeting', 'path', 'company', 'model', 'completion'] as const;
const LIGHT_STEPS = ['industry', 'greeting', 'store_type', 'data_import', 'platform_bind', 'content_init', 'completion'] as const;

/** 从当前模式获取步骤列表 */
function getSteps(isLight: boolean): readonly string[] {
  return isLight ? LIGHT_STEPS : STANDARD_STEPS;
}

interface SetupData {
  installPath: string;
  companyName: string;
  modelProvider: string;
  modelPath?: string;
  spaceInfo?: { total_gb: number; free_gb: number; enough: boolean };
  // Light 版专有
  storeType?: string;
  hasData?: boolean;
  boundPlatforms?: string[];
}

// ==================== 安装状态类型 ====================

interface InstallationStatus {
  completed: boolean;
  company_name?: string | null;
  model_provider?: string | null;
}

// ==================== Setup Config 类型 ====================

interface SetupConfigPayload {
  install_path: string;
  company_name: string;
  model_provider: string;
  model_path: string | null;
}

// ==================== 主组件 ====================

export function SetupWizard() {
  const mode = useAppModeStore(state => state.mode);
  const isLight = mode === 'light';
  const STEPS = getSteps(isLight);

  const [currentStep, setCurrentStep] = useState<SetupStep | LightSetupStep | 'industry'>('industry');
  const [dialogueNodes, setDialogueNodes] = useState<DialogueNode[]>([]);
  const [setupData, setSetupData] = useState<SetupData>({
    installPath: '',
    companyName: '',
    modelProvider: '',
  });
  // 行业选择回调
  const handleIndustrySelected = useCallback(async (industryId: string) => {
    const pm = PluginManager.getInstance();

    // 在 Tauri 环境中自动下载并安装对应行业插件
    if (isTauri()) {
      // 显示加载状态（通过 IndustrySelector 的 loading prop）
      try {
        // 注册进度回调，显示下载进度
        pluginLoader.onProgress((progress) => {
          console.log(`[PluginLoader] ${progress.phase}: ${progress.message}`);
        });
        await pluginLoader.downloadAndInstall(industryId, '1.0.0', '');
        await pluginLoader.switchIndustry(industryId);
      } catch (err) {
        console.error('[SetupWizard] Plugin download failed, using default mode:', err);
        // 插件下载失败不阻塞安装流程，使用默认模式继续
      }
    }

    await pm.setIndustry(industryId as any);
    setCurrentStep('greeting');

    const newMode = useAppModeStore.getState().mode;
    const newIsLight = newMode === 'light';

    const ctx: SetupContext = {
      appMode: newMode,
    };

    if (newIsLight) {
      const personalGreeting = await generatePersonalizedText('greeting', ctx);
      const greetingNodes = getGreetingDialogue(ctx);
      if (personalGreeting) {
        greetingNodes[0].text = personalGreeting;
      }
      const storeNodes = getLightStoreTypeDialogue(ctx);
      setDialogueNodes([...greetingNodes, ...storeNodes]);
    } else {
      const personalGreeting = await generatePersonalizedText('greeting', ctx);
      const greetingNodes = getGreetingDialogue(ctx);
      if (personalGreeting) {
        greetingNodes[0].text = personalGreeting;
      }
      setDialogueNodes(greetingNodes);
    }
  }, []);

  const [installationComplete, setInstallationComplete] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // 初始化：检查安装状态 + 显示欢迎语
  useEffect(() => {
    const init = async () => {
      const status = await safeInvoke<InstallationStatus>('check_installation_status');
      if (status?.completed) {
        setInstallationComplete(true);
        handleEnterWorkspace();
        return;
      }

      // 开始时显示行业选择步骤，不再自动显示欢迎语
      // 如果当前模式已经确定（非初始状态），才自动进入欢迎语
      // 否则让用户先选择行业
    };
    init();
  }, []);

  // 当行业选择完成后，实际欢迎语由 handleIndustrySelected 触发
  useEffect(() => {
    if (currentStep !== 'greeting') return;
    // 如果对话节点已有内容（从行业选择设置），不再重复添加
    if (dialogueNodes.length > 0) return;

    const init = async () => {
      const ctx: SetupContext = {
        appMode: mode,
      };

      if (isLight) {
        const personalGreeting = await generatePersonalizedText('greeting', ctx);
        const greetingNodes = getGreetingDialogue(ctx);
        if (personalGreeting) {
          greetingNodes[0].text = personalGreeting;
        }
        // Light 版欢迎后直接进入店铺类型选择
        const storeNodes = getLightStoreTypeDialogue(ctx);
        setDialogueNodes([...greetingNodes, ...storeNodes]);
        setCurrentStep('store_type');
        return;
      }

      // 尝试 LLM 个性化欢迎语
      const personalGreeting = await generatePersonalizedText('greeting', ctx);
      const greetingNodes = getGreetingDialogue(ctx);
      if (personalGreeting) {
        greetingNodes[0].text = personalGreeting;
      }

      setDialogueNodes(greetingNodes);
    };
    init();
  }, []);

  // 自动滚动到底部
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [dialogueNodes]);

  // ==================== Light 版步骤推进逻辑 ====================

  const handleStoreTypeSelected = useCallback(
    async (type: string) => {
      setSetupData((prev) => ({ ...prev, storeType: type }));

      const ctx: SetupContext = {
        appMode: mode,
        storeType: type as SetupContext['storeType'],
      };

      const storeNodes = getLightStoreTypeDialogue(ctx);
      // 更新已显示的店铺选择对话
      setDialogueNodes((prev) => {
        const withoutStoreItems = prev.filter(n => !n.id.startsWith('store-'));
        return [...withoutStoreItems, ...storeNodes];
      });
    },
    []
  );

  const handleStoreNext = useCallback(() => {
    const ctx: SetupContext = {
      storeType: setupData.storeType as SetupContext['storeType'],
      appMode: mode,
    };
    const importNodes = getLightDataImportDialogue(ctx);
    setCurrentStep('data_import');
    setDialogueNodes((prev) => [...prev, ...importNodes]);
  }, [setupData.storeType]);

  const handleImportSelected = useCallback(
    (hasData: boolean) => {
      setSetupData((prev) => ({ ...prev, hasData }));

      const ctx: SetupContext = {
        appMode: mode,
        storeType: setupData.storeType as SetupContext['storeType'],
        hasData,
      };

      const importNodes = getLightDataImportDialogue(ctx);
      setDialogueNodes((prev) => {
        const withoutImportItems = prev.filter(n => !n.id.startsWith('import-'));
        return [...withoutImportItems, ...importNodes];
      });
    },
    [setupData.storeType]
  );

  const handleImportNext = useCallback(() => {
    const ctx: SetupContext = {
      appMode: mode,
      storeType: setupData.storeType as SetupContext['storeType'],
      hasData: setupData.hasData,
    };
    const platformNodes = getLightPlatformBindDialogue(ctx);
    setCurrentStep('platform_bind');
    setDialogueNodes((prev) => [...prev, ...platformNodes]);
  }, [setupData.storeType, setupData.hasData]);

  const handlePlatformsConfirmed = useCallback(
    (platforms: string[]) => {
      setSetupData((prev) => ({ ...prev, boundPlatforms: platforms }));

      const ctx: SetupContext = {
        appMode: mode,
        storeType: setupData.storeType as SetupContext['storeType'],
        boundPlatforms: platforms,
      };

      const platformNodes = getLightPlatformBindDialogue(ctx);
      setDialogueNodes((prev) => {
        const withoutPlatformItems = prev.filter(n => !n.id.startsWith('platform-'));
        return [...withoutPlatformItems, ...platformNodes];
      });
    },
    [setupData.storeType]
  );

  const handlePlatformNext = useCallback(() => {
    const contentNodes = getLightContentInitDialogue();
    setCurrentStep('content_init');
    setDialogueNodes((prev) => [...prev, ...contentNodes]);
  }, []);

  const handleContentNext = useCallback(() => {
    const completeNodes = getLightCompletionDialogue();
    setCurrentStep('completion');
    setDialogueNodes((prev) => [...prev, ...completeNodes]);
  }, []);

  // ==================== 步骤推进逻辑（标准版） ====================

  const handlePathSelected = useCallback(
    async (path: string, spaceInfo: { total_gb: number; free_gb: number; enough: boolean }) => {
      setSetupData((prev) => ({
        ...prev,
        installPath: path,
        spaceInfo,
      }));

      const ctx: SetupContext = {
        installPath: path,
        freeSpaceGb: spaceInfo.free_gb,
        totalSpaceGb: spaceInfo.total_gb,
        appMode: mode,
      };

      if (!spaceInfo.enough) {
        // 空间不足，显示提示但不推进步骤，让用户重新选择
        const nodes = getPathSelectionDialogue(ctx);
        setDialogueNodes((prev) => [...prev, ...nodes]);
        return;
      }

      // 空间足够，推进到公司名步骤
      const companyNodes = getCompanyNameDialogue(ctx);
      setCurrentStep('company');
      setDialogueNodes((prev) => [...prev, ...companyNodes]);
    },
    []
  );

  const handleNameConfirmed = useCallback(
    async (name: string) => {
      setSetupData((prev) => ({ ...prev, companyName: name }));

      const ctx: SetupContext = {
        installPath: setupData.installPath,
        companyName: name,
        appMode: mode,
      };

      // 尝试 LLM 个性化公司名回应
      const personalResponse = await generatePersonalizedText('company_response', ctx);

      // 构建公司名确认节点
      const confirmNode: DialogueNode = {
        id: 'company-confirm-ceo',
        speaker: 'ceo',
        text: personalResponse || `"${name}"，寓意深远，是个好名字！公司注册成功。`,
        avatar: true,
        isTyping: true,
        options: [
          {
            id: 'company-next',
            label: '继续配置大模型',
            action: 'next',
          },
        ],
      };

      setDialogueNodes((prev) => [...prev, confirmNode]);
    },
    [setupData.installPath]
  );

  const handleModelConfigured = useCallback(
    (provider: string, modelPath?: string) => {
      setSetupData((prev) => ({
        ...prev,
        modelProvider: provider,
        modelPath,
      }));

      if (provider === 'procloud') {
        const confirmNodes = getProCloudConfirmDialogue();
        setDialogueNodes((prev) => [...prev, ...confirmNodes]);
      } else if (provider === 'local') {
        const ctx: SetupContext = {
          installPath: setupData.installPath,
          companyName: setupData.companyName,
          modelProvider: provider,
          modelPath,
          appMode: mode,
        };
        const completionNodes = getCompletionDialogue(ctx);
        setCurrentStep('completion');
        setDialogueNodes((prev) => [...prev, ...completionNodes]);
      }
    },
    [setupData]
  );

  const handleEnterWorkspace = useCallback(async () => {
    if (!setupData.installPath || !setupData.companyName || !setupData.modelProvider) {
      // 尝试直接调用 complete_setup_and_switch（可能是首次初始化跳过后直接完成的场景）
      try {
        await safeInvoke('complete_setup_and_switch', {
          config: {
            install_path: setupData.installPath || 'default',
            company_name: setupData.companyName || '我的企业',
            model_provider: setupData.modelProvider || 'procloud',
            model_path: setupData.modelPath || null,
          },
        });
      } catch (err) {
        // 开发模式下可能失败，忽略
      }

      // 如果不是 Tauri 环境，导航到 login
      window.location.hash = '#/login';
      return;
    }

    // 尝试 LLM 个性化完成总结
    const ctx: SetupContext = {
      installPath: setupData.installPath,
      companyName: setupData.companyName,
      modelProvider: setupData.modelProvider,
      appMode: mode,
    };
    await generatePersonalizedText('completion_summary', ctx);

    // 保存配置到后端并切换到主窗口
    try {
      await safeInvoke('complete_setup_and_switch', {
        config: {
          install_path: setupData.installPath,
          company_name: setupData.companyName,
          model_provider: setupData.modelProvider,
          model_path: setupData.modelPath || null,
        } as SetupConfigPayload,
      });
    } catch (err) {
      console.error('Failed to complete setup:', err);
      // 非 Tauri 环境下导航到 login
      window.location.hash = '#/login';
    }
  }, [setupData]);

  // 如果已安装完成，直接进入主应用
  if (installationComplete) {
    return null;
  }

  return (
    <Box sx={WIZARD_CONTAINER_SX}>
      {/* 自定义标题栏（无边框窗口拖拽区域） */}
      <Box
        data-tauri-drag-region
        sx={{
          height: 32,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: 'rgba(0,0,0,0.5)',
          userSelect: 'none',
          cursor: 'default',
        }}
      >
        <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12 }}>
          ProClaw 安装向导
        </span>
      </Box>

      {/* 步骤指示器 */}
      <StepIndicator steps={STEPS} currentStep={currentStep} />

      {/* 对话区域 */}
      <Box sx={CHAT_AREA_SX}>
        {dialogueNodes.map((node, index) => (
          <CEOBubble
            key={`${node.id}-${index}`}
            speaker={node.speaker}
            text={typeof node.text === 'function' ? node.text({
              installPath: setupData.installPath,
              companyName: setupData.companyName,
              modelProvider: setupData.modelProvider,
              appMode: mode,
            }) : node.text}
            isTyping={node.isTyping}
            showAvatar={node.avatar}
          />
        ))}

        {/* 当前步骤的交互组件 - 行业选择 */}
        {currentStep === 'industry' && (
          <IndustrySelector onIndustrySelected={handleIndustrySelected} />
        )}

        {/* 当前步骤的交互组件 - Light 版 */}
        {isLight && currentStep === 'store_type' && (
          <StoreTypeSelector onStoreTypeSelected={handleStoreTypeSelected} />
        )}

        {isLight && currentStep === 'data_import' && (
          <DataImportStep onImportSelected={handleImportSelected} />
        )}

        {isLight && currentStep === 'platform_bind' && (
          <PlatformBindStep onPlatformsConfirmed={handlePlatformsConfirmed} />
        )}

        {isLight && currentStep === 'completion' && (
          <CompletionScreen
            companyName={setupData.storeType ? ({
              catering: '餐饮店', retail: '零售店', service: '服务店', fresh: '生鲜店', other: '店铺',
            } as Record<string, string>)[setupData.storeType] || '店铺' : '店铺'}
            onEnterWorkspace={handleEnterWorkspace}
          />
        )}

        {/* 当前步骤的交互组件 - 标准版 */}
        {!isLight && currentStep === 'path' && (
          <PathSelector onPathSelected={handlePathSelected} />
        )}

        {!isLight && currentStep === 'company' && (
          <CompanyNameInput onNameConfirmed={handleNameConfirmed} />
        )}

        {!isLight && currentStep === 'model' && (
          <ModelConfigStep
            onModelConfigured={handleModelConfigured}
            appMode={mode === 'virtual_company' ? 'virtual_company' : 'inventory'}
          />
        )}

        {!isLight && currentStep === 'completion' && setupData.companyName && (
          <CompletionScreen
            companyName={setupData.companyName}
            onEnterWorkspace={handleEnterWorkspace}
          />
        )}

        {/* 选项按钮处理 */}
        {dialogueNodes.length > 0 && (() => {
          const lastNode = dialogueNodes[dialogueNodes.length - 1];
          if (!lastNode.options) return null;
          return (
            <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, mt: 1 }}>
              {lastNode.options.map(opt => {
                let handleClick: (() => void) | undefined;

                // 根据选项 ID 判断对应的 Light 步骤推进
                if (opt.action === 'confirm') {
                  handleClick = handleEnterWorkspace;
                } else if (opt.id === 'store-next' || opt.id === 'start-setup') {
                  handleClick = isLight ? handleStoreNext : undefined;
                } else if (opt.id === 'import-next') {
                  handleClick = handleImportNext;
                } else if (opt.id === 'platform-next') {
                  handleClick = handlePlatformNext;
                } else if (opt.id === 'content-next') {
                  handleClick = handleContentNext;
                }

                return handleClick ? (
                  <button
                    key={opt.id}
                    onClick={handleClick}
                    className="MuiButtonBase-root MuiButton-root MuiButton-contained"
                    style={{
                      padding: '8px 24px',
                      background: '#ff3b30',
                      color: '#fff',
                      border: 'none',
                      borderRadius: 8,
                      cursor: 'pointer',
                      fontSize: '0.9rem',
                    }}
                  >
                    {opt.label}
                  </button>
                ) : null;
              })}
            </Box>
          );
        })()}

        <div ref={chatEndRef} />
      </Box>

      {/* 输入区域 */}
      <Box sx={INPUT_AREA_SX}>
        <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1 }}>
          <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11 }}>
            Enter 确认 · ESC 取消
          </span>
        </Box>
      </Box>
    </Box>
  );
}
