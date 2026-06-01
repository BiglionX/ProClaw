import { useState } from 'react';
import { Box, Button, TextField, Typography } from '@mui/material';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import HomeIcon from '@mui/icons-material/Home';
import { safeInvoke } from '../../lib/tauri';
import { CEOBubble } from './CEOBubble';

interface DiskSpaceInfo {
  total_gb: number;
  free_gb: number;
  enough: boolean;
}

interface PathSelectorProps {
  onPathSelected: (path: string, spaceInfo: DiskSpaceInfo) => void;
}

/** Windows 默认安装路径 */
const DEFAULT_PATH = 'C:\\ProClaw\\Data';

export function PathSelector({ onPathSelected }: PathSelectorProps) {
  const [manualPath, setManualPath] = useState(DEFAULT_PATH);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSelectFolder = async () => {
    try {
      const { open } = await import('@tauri-apps/plugin-dialog');
      const selected = await open({
        directory: true,
        multiple: false,
        title: '选择数据存储目录',
      });
      if (selected) {
        await checkSpace(selected);
      }
    } catch (err) {
      setError('无法打开文件夹选择器，请手动输入路径');
    }
  };

  const handleManualPath = async () => {
    if (!manualPath.trim()) {
      setError('请输入或选择有效路径');
      return;
    }
    await checkSpace(manualPath.trim());
  };

  const checkSpace = async (path: string) => {
    setChecking(true);
    setError(null);
    try {
      const result = await safeInvoke<DiskSpaceInfo>('check_disk_space', { path });
      if (result) {
        onPathSelected(path, result);
      } else {
        // 非 Tauri 环境（开发模式），模拟成功
        onPathSelected(path, { total_gb: 100, free_gb: 50, enough: true });
      }
    } catch (err) {
      setError('检查磁盘空间失败，请重试');
    } finally {
      setChecking(false);
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, width: '100%', maxWidth: 500, mx: 'auto' }}>
      {/* CEO 提示气泡 */}
      <CEOBubble
        speaker="ceo"
        text="请选择一个文件夹来存放您的业务数据。我会为您检查可用空间。"
        isTyping={false}
      />

        <Box sx={{ display: 'flex', gap: 1, flexDirection: 'column' }}>
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            <TextField
              fullWidth
              size="small"
              placeholder="或手动输入路径（如 D:\ProClaw\Data）"
              value={manualPath}
              onChange={(e) => { setManualPath(e.target.value); setError(null); }}
              onKeyDown={(e) => { if (e.key === 'Enter') handleManualPath(); }}
              sx={{
                input: { color: '#fff' },
                '& .MuiOutlinedInput-root': {
                  '& fieldset': { borderColor: 'rgba(255,255,255,0.3)' },
                  '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.5)' },
                },
              }}
              InputProps={{
                sx: { color: '#fff' },
              }}
            />
            <Button
              variant="contained"
              startIcon={<FolderOpenIcon />}
              onClick={handleSelectFolder}
              disabled={checking}
              sx={{
                bgcolor: '#ff3b30',
                '&:hover': { bgcolor: '#d32f2f' },
                whiteSpace: 'nowrap',
                minWidth: 100,
              }}
            >
              浏览...
            </Button>
            <Button
              variant="outlined"
              startIcon={<HomeIcon />}
              onClick={() => setManualPath(DEFAULT_PATH)}
              disabled={checking || manualPath === DEFAULT_PATH}
              sx={{
                color: 'rgba(255,255,255,0.7)',
                borderColor: 'rgba(255,255,255,0.3)',
                '&:hover': {
                  borderColor: 'rgba(255,255,255,0.5)',
                  bgcolor: 'rgba(255,255,255,0.05)',
                },
                whiteSpace: 'nowrap',
              }}
            >
              默认路径
            </Button>
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'center' }}>
            <Button
              variant="contained"
              onClick={handleManualPath}
              disabled={checking || !manualPath.trim()}
              sx={{
                bgcolor: '#ff3b30',
                '&:hover': { bgcolor: '#d32f2f' },
                px: 4,
              }}
            >
              {checking ? '检查磁盘空间...' : '确认此路径'}
            </Button>
          </Box>
        </Box>

      {error && (
        <Typography variant="caption" sx={{ color: '#ff5252' }}>
          {error}
        </Typography>
      )}

      {checking && (
        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.6)' }}>
          正在检查磁盘空间...
        </Typography>
      )}
    </Box>
  );
}
