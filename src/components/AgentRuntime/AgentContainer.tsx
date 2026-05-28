import { useEffect, useRef, useState } from 'react';
import { Box, CircularProgress, Typography, Alert } from '@mui/material';
import { agentRuntime, type AgentManifest } from '../../lib/agentRuntime';

interface AgentContainerProps {
  /** Agent ID */
  agentId: string;
  /** Agent Manifest */
  manifest: AgentManifest;
  /** Agent 资源基础 URL */
  assetsBaseUrl: string;
  /** 容器宽度 */
  width?: string | number;
  /** 容器高度 */
  height?: string | number;
  /** 是否禁用（显示禁用覆盖层） */
  disabled?: boolean;
}

/**
 * Agent 运行时容器组件
 * 在 iframe 中加载并运行 Agent 的前端界面
 */
export default function AgentContainer({
  agentId,
  manifest,
  assetsBaseUrl,
  width = '100%',
  height = '100%',
  disabled = false,
}: AgentContainerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        setLoading(true);
        setError(null);

        const instance = await agentRuntime.loadAgent(manifest, assetsBaseUrl);
        if (!mounted) {
          agentRuntime.unloadAgent(agentId);
          return;
        }

        // 将 iframe 挂载到容器
        if (instance.iframe && containerRef.current) {
          containerRef.current.appendChild(instance.iframe);
        }

        setLoading(false);
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Failed to load agent');
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      mounted = false;
      agentRuntime.unloadAgent(agentId);
    };
  }, [agentId, manifest, assetsBaseUrl]);

  if (error) {
    return (
      <Box sx={{ width, height, minHeight: 200 }}>
        <Alert severity="error" sx={{ m: 1 }}>
          {error}
        </Alert>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        position: 'relative',
        width,
        height,
        minHeight: 200,
        overflow: 'hidden',
      }}
    >
      {/* 加载中指示器 */}
      {loading && (
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 1,
            bgcolor: 'background.paper',
          }}
        >
          <CircularProgress size={32} />
          <Typography variant="body2" color="text.secondary">
            正在加载 {manifest.name}...
          </Typography>
        </Box>
      )}

      {/* iframe 容器 */}
      <Box
        ref={containerRef}
        sx={{
          width: '100%',
          height: '100%',
          visibility: loading ? 'hidden' : 'visible',
        }}
      />

      {/* 禁用覆盖层 */}
      {disabled && (
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: 'rgba(0, 0, 0, 0.5)',
            zIndex: 10,
          }}
        >
          <Typography variant="body1" color="#fff" fontWeight={600}>
            Agent 已禁用
          </Typography>
        </Box>
      )}
    </Box>
  );
}
