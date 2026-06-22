/**
 * 域名配置编辑区
 * 显示当前域名、连接状态，支持自定义域名绑定
 */

import { useState } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  Chip,
} from '@mui/material';
import {
  Language as DomainIcon,
  Link as LinkIcon,
  OpenInNew as OpenIcon,
} from '@mui/icons-material';
import { usePreviewContext } from '../PreviewContext';
import { getStoreUrl } from '../../../lib/cloudStoreService';
import { openExternalUrl } from '../../../lib/tauri';

interface DomainSectionProps {
  onDomainChange?: (domain: string) => void;
}

// 域名格式白名单：仅允许合法域名字符 + 至少含一个点号
const DOMAIN_PATTERN = /^(?=.{1,253}$)(?!-)([a-zA-Z0-9-]{1,63}(?<!-)\.)+[a-zA-Z]{2,63}$/;

/**
 * 验证自定义域名是否合法
 * 防止 javascript: / data: / 路径注入等 XSS
 */
function isValidDomain(input: string): boolean {
  const trimmed = input.trim().toLowerCase();
  if (!trimmed) return false;
  // 拒绝包含协议前缀、路径、特殊字符
  if (/[:/?#@\\<>\s]/.test(trimmed)) return false;
  return DOMAIN_PATTERN.test(trimmed);
}

export default function DomainSection({ onDomainChange }: DomainSectionProps) {
  const { store } = usePreviewContext();
  const [customDomain, setCustomDomain] = useState(store?.custom_domain || '');
  const [editing, setEditing] = useState(false);
  const [domainError, setDomainError] = useState<string | null>(null);

  if (!store) return null;

  const storeUrl = getStoreUrl(store);
  const isActive = store.status === 'active';
  const isExpired = store.status === 'expired';
  const isSuspended = store.status === 'suspended';
  const hasCustomDomain = !!store.custom_domain;

  const handleBindDomain = () => {
    const trimmed = customDomain.trim();
    if (!trimmed) {
      setDomainError('域名不能为空');
      return;
    }
    if (!isValidDomain(trimmed)) {
      setDomainError('域名格式不合法，应类似 shop.example.com');
      return;
    }
    if (onDomainChange) {
      onDomainChange(trimmed);
      setEditing(false);
      setDomainError(null);
    }
  };

  const handleCancelEdit = () => {
    setEditing(false);
    setCustomDomain(store.custom_domain || '');
    setDomainError(null);
  };

  return (
    <Box sx={{ p: 2, bgcolor: 'grey.50', borderBottom: '1px solid', borderColor: 'divider' }}>
      {/* 标题行 */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <DomainIcon sx={{ fontSize: 18, color: 'primary.main' }} />
          <Typography variant="subtitle2">域名配置</Typography>
        </Box>
        {/* 连接状态 */}
        <Chip
          icon={<LinkIcon sx={{ fontSize: 14 }} />}
          label={
            isActive ? '已连接'
            : isExpired ? '已过期'
            : isSuspended ? '已停用'
            : '未激活'
          }
          size="small"
          color={isActive ? 'success' : isExpired ? 'error' : isSuspended ? 'default' : 'warning'}
          variant="outlined"
          sx={{ height: 22, '& .MuiChip-label': { px: 1, fontSize: 11 } }}
        />
      </Box>

      {/* 当前生效域名（只读） */}
      <Box sx={{ mb: 1.5 }}>
        <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>
          {hasCustomDomain ? '已绑定自定义域名' : '默认域名'}
        </Typography>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            bgcolor: '#fff',
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 1,
            px: 1.5,
            py: 0.75,
          }}
        >
          <Typography
            variant="body2"
            sx={{
              flex: 1,
              fontFamily: 'monospace',
              fontSize: 12,
              color: 'primary.main',
              fontWeight: 500,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {storeUrl}
          </Typography>
          <Chip label="SSL" size="small" color="success" variant="outlined" sx={{ height: 18, fontSize: 10, '& .MuiChip-label': { px: 0.5 } }} />
        </Box>
      </Box>

      {/* 自定义域名 */}
      <Box>
        <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>
          自定义域名 {hasCustomDomain && '✓'}
        </Typography>
        {editing ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <TextField
                size="small"
                placeholder="shop.yourdomain.com"
                value={customDomain}
                onChange={e => {
                  setCustomDomain(e.target.value);
                  if (domainError) setDomainError(null);
                }}
                error={!!domainError}
                sx={{ flex: 1, '& .MuiInputBase-input': { fontSize: 12, py: 0.75 } }}
              />
              <Button
                size="small"
                variant="contained"
                onClick={handleBindDomain}
                disabled={!customDomain.trim()}
                sx={{ minWidth: 48, fontSize: 12 }}
              >
                绑定
              </Button>
              <Button size="small" onClick={handleCancelEdit} sx={{ minWidth: 32, fontSize: 12 }}>
                取消
              </Button>
            </Box>
            {domainError && (
              <Typography variant="caption" color="error" sx={{ fontSize: 10 }}>
                {domainError}
              </Typography>
            )}
          </Box>
        ) : (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              bgcolor: '#fff',
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 1,
              px: 1.5,
              py: 0.75,
              cursor: 'pointer',
              '&:hover': { borderColor: 'primary.main' },
            }}
            onClick={() => setEditing(true)}
          >
            <Typography
              variant="body2"
              sx={{
                flex: 1,
                fontFamily: 'monospace',
                fontSize: 12,
                color: hasCustomDomain ? 'text.primary' : 'text.secondary',
              }}
            >
              {hasCustomDomain ? store.custom_domain : '点击绑定自定义域名...'}
            </Typography>
            <Typography sx={{ fontSize: 11, color: 'primary.main' }}>
              {hasCustomDomain ? '修改' : '绑定'}
            </Typography>
          </Box>
        )}
        {hasCustomDomain && !editing && (
          <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block', fontSize: 10 }}>
            请确保 CNAME 已指向 proclaw.cc
          </Typography>
        )}
      </Box>

      {/* 在新窗口打开 */}
      <Box sx={{ mt: 1.5, textAlign: 'center' }}>
        <Button
          size="small"
          endIcon={<OpenIcon sx={{ fontSize: 14 }} />}
          onClick={() => {
            // 协议白名单校验
            try {
              const parsed = new URL(storeUrl);
              if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
                console.warn('拒绝打开非 http(s) 协议 URL:', parsed.protocol);
                return;
              }
            } catch (err) {
              console.error('URL 解析失败:', storeUrl, err);
              return;
            }
            // Tauri 环境用 shell.open，浏览器环境用 window.open
            void openExternalUrl(storeUrl);
          }}
          sx={{ fontSize: 11 }}
        >
          在新窗口查看商城
        </Button>
      </Box>
    </Box>
  );
}
