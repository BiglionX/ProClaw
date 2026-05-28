import { useCallback, useEffect, useRef, useState } from 'react';
import { Box } from '@mui/material';
import { safeInvoke } from '../../lib/tauri';
import { APP_MODE } from '../../config/appMode';
import { CEOBubble } from './CEOBubble';
import { StepIndicator } from './StepIndicator';
import { PathSelector } from './PathSelector';
import { CompanyNameInput } from './CompanyNameInput';
import { ModelConfigStep } from './ModelConfigStep';
import { CompletionScreen } from './CompletionScreen';
import {
  CHAT_AREA_SX,
  INPUT_AREA_SX,
  WIZARD_CONTAINER_SX,
} from './ceoAgentStyles';
import type { DialogueNode, SetupContext, SetupStep } from './dialogueScript';
import {
  getCompletionDialogue,
  getCompanyNameDialogue,
  getGreetingDialogue,
  getPathSelectionDialogue,
  getProCloudConfirmDialogue,
} from './dialogueScript';
import { generatePersonalizedText } from './llmEnhancer';

// ==================== 状态常量 ====================

const STEPS: SetupStep[] = ['greeting', 'path', 'company', 'model', 'completion'];

interface SetupData {
  installPath: string;
  companyName: string;
  modelProvider: string;
  modelPath?: string;
  spaceInfo?: { total_gb: number; free_gb: number; enough: boolean };
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
  const [currentStep, setCurrentStep] = useState<SetupStep>('greeting');
  const [dialogueNodes, setDialogueNodes] = useState<DialogueNode[]>([]);
  const [setupData, setSetupData] = useState<SetupData>({
    installPath: '',
    companyName: '',
    modelProvider: '',
  });
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

      const ctx: SetupContext = {
        appMode: APP_MODE,
      };

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

  // ==================== 步骤推进逻辑 ====================

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
        appMode: APP_MODE,
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
        appMode: APP_MODE,
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
          appMode: APP_MODE,
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
      appMode: APP_MODE,
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
              appMode: APP_MODE,
            }) : node.text}
            isTyping={node.isTyping}
            showAvatar={node.avatar}
          />
        ))}

        {/* 当前步骤的交互组件 */}
        {currentStep === 'path' && (
          <PathSelector onPathSelected={handlePathSelected} />
        )}

        {currentStep === 'company' && (
          <CompanyNameInput onNameConfirmed={handleNameConfirmed} />
        )}

        {currentStep === 'model' && (
          <ModelConfigStep
            onModelConfigured={handleModelConfigured}
            appMode={APP_MODE}
          />
        )}

        {currentStep === 'completion' && setupData.companyName && (
          <CompletionScreen
            companyName={setupData.companyName}
            onEnterWorkspace={handleEnterWorkspace}
          />
        )}

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
