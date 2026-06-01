import { useState } from 'react';
import { Box, Button, TextField } from '@mui/material';
import CloudIcon from '@mui/icons-material/Cloud';
import ComputerIcon from '@mui/icons-material/Computer';
import { safeInvoke } from '../../lib/tauri';
import { CEOBubble } from './CEOBubble';

interface ModelConfigStepProps {
  onModelConfigured: (provider: string, modelPath?: string) => void;
  appMode: 'inventory' | 'virtual_company';
}

interface ConnectionTestResult {
  success: boolean;
  message: string;
}

export function ModelConfigStep({ onModelConfigured, appMode }: ModelConfigStepProps) {
  const [mode, setMode] = useState<'select' | 'local-config' | 'testing' | 'result'>('select');
  const [endpoint, setEndpoint] = useState('http://localhost:11434');
  const [backendType, setBackendType] = useState<'ollama' | 'llamacpp'>('ollama');
  const [testResult, setTestResult] = useState<ConnectionTestResult | null>(null);

  // 对于 ProClaw Plus 版，简化模型配置
  if (appMode === 'inventory') {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, width: '100%', maxWidth: 500, mx: 'auto' }}>
        <CEOBubble
          speaker="ceo"
          text="AI 功能将使用 Pro Cloud 提供的云端模型，无需额外配置。后续可以在设置中修改。"
          isTyping={false}
        />
        <Button
          variant="contained"
          onClick={() => onModelConfigured('procloud')}
          startIcon={<CloudIcon />}
          sx={{
            bgcolor: '#ff3b30',
            '&:hover': { bgcolor: '#d32f2f' },
          }}
        >
          确认使用 Pro Cloud 模型
        </Button>
      </Box>
    );
  }

  const handleSelectProCloud = () => {
    setTestResult(null);
    setMode('result');
    // 显示确认后调用回调
  };

  const handleConfirmProCloud = () => {
    onModelConfigured('procloud');
  };

  const handleSelectLocal = (type: 'ollama' | 'llamacpp') => {
    setBackendType(type);
    setEndpoint(type === 'ollama' ? 'http://localhost:11434' : 'http://localhost:8080');
    setMode('local-config');
  };

  const handleTestConnection = async () => {
    setMode('testing');
    try {
      const command = backendType === 'ollama' ? 'test_ollama_connection' : 'test_llamacpp_connection';
      const result = await safeInvoke<ConnectionTestResult>(command, { endpoint });
      setTestResult(result || { success: false, message: '无法连接到后端服务（开发模式）' });
      setMode('result');
    } catch (err) {
      setTestResult({ success: false, message: err instanceof Error ? err.message : '未知错误' });
      setMode('result');
    }
  };

  const handleConfirmLocal = () => {
    onModelConfigured('local', endpoint);
  };

  if (mode === 'select') {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, width: '100%', maxWidth: 500, mx: 'auto' }}>
        <CEOBubble
          speaker="ceo"
          text="为了增强公司的 AI 能力，请选择大模型配置方式："
          isTyping={false}
        />
        <Button
          variant="contained"
          onClick={handleSelectProCloud}
          startIcon={<CloudIcon />}
          fullWidth
          sx={{
            bgcolor: '#ff3b30',
            '&:hover': { bgcolor: '#d32f2f' },
            py: 1.5,
          }}
        >
          使用 Pro Cloud 模型（推荐，无需配置）
        </Button>
        <Button
          variant="outlined"
          onClick={() => handleSelectLocal('ollama')}
          startIcon={<ComputerIcon />}
          fullWidth
          sx={{
            borderColor: 'rgba(255,149,0,0.5)',
            color: '#ff9500',
            '&:hover': { borderColor: '#ff9500', bgcolor: 'rgba(255,149,0,0.1)' },
            py: 1.5,
          }}
        >
          本地部署 Ollama
        </Button>
        <Button
          variant="outlined"
          onClick={() => handleSelectLocal('llamacpp')}
          startIcon={<ComputerIcon />}
          fullWidth
          sx={{
            borderColor: 'rgba(100,200,255,0.5)',
            color: '#64c8ff',
            '&:hover': { borderColor: '#64c8ff', bgcolor: 'rgba(100,200,255,0.1)' },
            py: 1.5,
          }}
        >
          本地部署 llama.cpp
        </Button>
      </Box>
    );
  }

  if (mode === 'local-config') {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, width: '100%', maxWidth: 500, mx: 'auto' }}>
        <CEOBubble
          speaker="ceo"
          text={`请指定 ${backendType === 'ollama' ? 'Ollama' : 'llama.cpp'} 的服务地址。默认端口为 ${backendType === 'ollama' ? '11434' : '8080'}。`}
          isTyping={false}
        />
        <TextField
          fullWidth
          size="small"
          label="服务地址"
          placeholder={backendType === 'ollama' ? 'http://localhost:11434' : 'http://localhost:8080'}
          value={endpoint}
          onChange={(e) => setEndpoint(e.target.value)}
          sx={{
            input: { color: '#fff' },
            label: { color: 'rgba(255,255,255,0.6)' },
            '& .MuiOutlinedInput-root': {
              '& fieldset': { borderColor: 'rgba(255,255,255,0.3)' },
              '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.5)' },
            },
          }}
          InputLabelProps={{ sx: { color: 'rgba(255,255,255,0.6)' } }}
        />
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            onClick={() => setMode('select')}
            sx={{
              borderColor: 'rgba(255,255,255,0.3)',
              color: 'rgba(255,255,255,0.7)',
            }}
          >
            返回
          </Button>
          <Button
            variant="contained"
            onClick={handleTestConnection}
            sx={{
              bgcolor: '#ff3b30',
              '&:hover': { bgcolor: '#d32f2f' },
            }}
          >
            测试连接
          </Button>
        </Box>
      </Box>
    );
  }

  if (mode === 'testing') {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, width: '100%', maxWidth: 500, mx: 'auto' }}>
        <CEOBubble
          speaker="ceo"
          text="正在测试连接，请稍候..."
          isTyping={false}
        />
      </Box>
    );
  }

  // Result mode
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, width: '100%', maxWidth: 500, mx: 'auto' }}>
      {testResult ? (
        <>
          <CEOBubble
            speaker="ceo"
            text={testResult.success
              ? '大模型已就绪！连接测试通过。我们可以继续了。'
              : `连接测试未通过：${testResult.message}。请检查路径后重试，或切换到 Pro Cloud 模式。`}
            isTyping={false}
          />
          <Box sx={{ display: 'flex', gap: 1 }}>
            {testResult.success ? (
              <Button
                variant="contained"
                onClick={handleConfirmLocal}
                fullWidth
                sx={{
                  bgcolor: '#4caf50',
                  '&:hover': { bgcolor: '#388e3c' },
                }}
              >
                确认使用此配置
              </Button>
            ) : (
              <>
                <Button
                  variant="outlined"
                  onClick={() => setMode('local-config')}
                  sx={{
                    borderColor: 'rgba(255,255,255,0.3)',
                    color: 'rgba(255,255,255,0.7)',
                  }}
                >
                  重新配置
                </Button>
                <Button
                  variant="contained"
                  onClick={handleConfirmProCloud}
                  fullWidth
                  sx={{
                    bgcolor: '#ff3b30',
                    '&:hover': { bgcolor: '#d32f2f' },
                  }}
                >
                  改用 Pro Cloud
                </Button>
              </>
            )}
          </Box>
        </>
      ) : (
        <>
          <CEOBubble
            speaker="ceo"
            text="已选择 Pro Cloud 模型。后续 AI 功能将默认使用云端 API，您可以随时在设置中切换。"
            isTyping={false}
          />
          <Button
            variant="contained"
            onClick={handleConfirmProCloud}
            fullWidth
            sx={{
              bgcolor: '#ff3b30',
              '&:hover': { bgcolor: '#d32f2f' },
            }}
          >
            确认使用 Pro Cloud 模型
          </Button>
        </>
      )}
    </Box>
  );
}
