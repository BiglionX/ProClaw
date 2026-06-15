import { useEffect, useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  InputBase,
  Box,
  Typography,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Chip,
  Divider,
} from '@mui/material';
import { Search as SearchIcon, NavigateNext as ArrowIcon } from '@mui/icons-material';

interface SearchEntry {
  /** 唯一标识 */
  id: string;
  /** 显示标题 */
  title: string;
  /** 副标题/描述 */
  subtitle?: string;
  /** 分类 */
  category: '页面' | '操作' | 'AI';
  /** 跳转路径 */
  path?: string;
  /** 关键字（用于模糊匹配） */
  keywords?: string[];
  /** 直接触发的回调（无需跳转） */
  onSelect?: () => void;
}

interface UseGlobalSearchResult {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
}

/**
 * 全局搜索 Hook
 * - 注册 ⌘K (Mac) / Ctrl+K (Windows) 快捷键
 * - 管理打开/关闭状态
 */
export function useGlobalSearch(): UseGlobalSearchResult {
  const [isOpen, setIsOpen] = useState(false);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);
  const toggle = useCallback(() => setIsOpen(prev => !prev), []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // ⌘K (Mac) 或 Ctrl+K (Windows/Linux)
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsOpen(prev => !prev);
        return;
      }
      // Esc 关闭
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  return { isOpen, open, close, toggle };
}

interface GlobalSearchDialogProps {
  open: boolean;
  onClose: () => void;
  /** 额外的搜索条目（由调用方注入，例如来自各业务模块） */
  extraEntries?: SearchEntry[];
}

/**
 * 全局搜索 Dialog
 * 命令面板风格（VS Code / Linear 风格）
 */
export default function GlobalSearchDialog({
  open,
  onClose,
  extraEntries = [],
}: GlobalSearchDialogProps) {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [activeIdx, setActiveIdx] = useState(0);

  // 静态条目：可跳转的页面
  const baseEntries: SearchEntry[] = useMemo(() => [
    { id: 'page-data', title: '数据中心', subtitle: '经营概览 · 业务分析', category: '页面', path: '/datacenter', keywords: ['dashboard', 'datacenter', 'data', 'center'] },
    { id: 'page-products', title: '商品库', subtitle: 'SPU / SKU 管理', category: '页面', path: '/products', keywords: ['products', 'spu', 'sku', '商品'] },
    { id: 'page-supply', title: '供应链', subtitle: '采购管理', category: '页面', path: '/supplychain', keywords: ['supply', 'chain', 'purchase'] },
    { id: 'page-sales', title: '销售管理', subtitle: '销售订单', category: '页面', path: '/sales', keywords: ['sales', 'order'] },
    { id: 'page-inventory', title: '库存管理', subtitle: '库存查询 / 交易', category: '页面', path: '/inventory', keywords: ['inventory', 'stock'] },
    { id: 'page-teams', title: 'AI 团队', subtitle: 'Agent 协作', category: '页面', path: '/teams', keywords: ['ai', 'team', 'agent'] },
    { id: 'page-knowledge', title: 'AI 知识库', subtitle: '问答 / 资料库', category: '页面', path: '/ai-knowledge', keywords: ['ai', 'knowledge', 'kb'] },
    { id: 'page-customer-service', title: 'AI 客服', subtitle: '在线客服', category: '页面', path: '/customer-service', keywords: ['customer', 'service', 'cs'] },
    { id: 'page-finance', title: '财务管理', subtitle: '利润 / 现金流', category: '页面', path: '/finance-agent', keywords: ['finance'] },
    { id: 'page-contacts', title: '联系人', subtitle: '客户 / 供应商', category: '页面', path: '/contacts', keywords: ['contact', 'customer', 'supplier'] },
    { id: 'page-messages', title: '消息', subtitle: '聊天 / 通知', category: '页面', path: '/messages', keywords: ['message', 'chat'] },
    { id: 'page-user', title: '用户中心', subtitle: '个人资料 / 设备', category: '页面', path: '/user-center', keywords: ['user', 'profile'] },
    { id: 'page-settings', title: '设置', subtitle: '偏好 / 同步', category: '页面', path: '/settings', keywords: ['settings', 'config'] },
    { id: 'page-shop', title: '云商城', subtitle: 'H5 商城', category: '页面', path: '/shop', keywords: ['shop', 'store', 'mall'] },
    { id: 'page-ai-sales', title: 'AI 订单识别', subtitle: '拍照识别订单', category: 'AI', path: '/ai-sales', keywords: ['ai', 'sales', 'ocr'] },
    { id: 'page-plugin-store', title: '插件商店', subtitle: '行业插件', category: '页面', path: '/plugin-store', keywords: ['plugin', 'store'] },
  ], []);

  // 合并条目
  const allEntries = useMemo(() => [...baseEntries, ...extraEntries], [baseEntries, extraEntries]);

  // 模糊匹配：标题、关键字、分类
  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return allEntries.slice(0, 12);

    return allEntries.filter(entry => {
      const haystack = [
        entry.title.toLowerCase(),
        entry.subtitle?.toLowerCase() || '',
        entry.category.toLowerCase(),
        ...(entry.keywords || []).map(k => k.toLowerCase()),
      ].join(' ');
      return haystack.includes(q);
    }).slice(0, 20);
  }, [query, allEntries]);

  // 重置 active idx
  useEffect(() => {
    setActiveIdx(0);
  }, [query]);

  // 重置 query
  useEffect(() => {
    if (!open) setQuery('');
  }, [open]);

  const handleSelect = useCallback((entry: SearchEntry) => {
    if (entry.onSelect) {
      entry.onSelect();
    } else if (entry.path) {
      navigate(entry.path);
    }
    onClose();
  }, [navigate, onClose]);

  // 键盘上下 + Enter
  const handleListKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIdx(prev => Math.min(prev + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIdx(prev => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const entry = results[activeIdx];
      if (entry) handleSelect(entry);
    }
  }, [results, activeIdx, handleSelect]);

  // 按分类分组
  const grouped = useMemo(() => {
    const map = new Map<string, SearchEntry[]>();
    results.forEach((entry, idx) => {
      const list = map.get(entry.category) || [];
      list.push({ ...entry, id: `${entry.id}-${idx}` });
      map.set(entry.category, list);
    });
    return Array.from(map.entries());
  }, [results]);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          mt: '-15vh',
          background: 'rgba(28, 28, 36, 0.96)',
          backdropFilter: 'blur(20px)',
          color: '#fff',
          boxShadow: '0 24px 64px rgba(0,0,0,0.4)',
          border: '1px solid rgba(255,255,255,0.08)',
        },
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          px: 2.5,
          py: 1.5,
          borderBottom: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        <SearchIcon sx={{ color: 'rgba(255,255,255,0.5)' }} />
        <InputBase
          autoFocus
          placeholder="搜索页面、操作、AI 指令..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleListKeyDown}
          sx={{
            flex: 1,
            color: '#fff',
            fontSize: '1rem',
            '& input::placeholder': {
              color: 'rgba(255,255,255,0.35)',
              opacity: 1,
            },
          }}
        />
        <Chip
          label="ESC"
          size="small"
          sx={{
            bgcolor: 'rgba(255,255,255,0.08)',
            color: 'rgba(255,255,255,0.6)',
            fontSize: '0.65rem',
            height: 20,
            fontWeight: 600,
          }}
        />
      </Box>

      <DialogContent sx={{ p: 0, maxHeight: '60vh' }}>
        {results.length === 0 ? (
          <Box sx={{ p: 4, textAlign: 'center', color: 'rgba(255,255,255,0.5)' }}>
            <Typography variant="body2">未找到 "{query}" 相关结果</Typography>
          </Box>
        ) : (
          <List sx={{ py: 0.5 }} onKeyDown={handleListKeyDown}>
            {grouped.map(([category, entries]) => (
              <Box key={category}>
                <Typography
                  variant="overline"
                  sx={{
                    display: 'block',
                    px: 2.5,
                    pt: 1.5,
                    pb: 0.5,
                    color: 'rgba(255,255,255,0.35)',
                    fontSize: '0.65rem',
                    letterSpacing: '1.2px',
                    fontWeight: 600,
                  }}
                >
                  {category}
                </Typography>
                {entries.map((entry) => {
                  const realIdx = results.findIndex(r => r.id === entry.id.replace(/-\d+$/, ''));
                  const isActive = realIdx === activeIdx;
                  return (
                    <ListItemButton
                      key={entry.id}
                      selected={isActive}
                      onClick={() => handleSelect(entry)}
                      onMouseEnter={() => setActiveIdx(realIdx)}
                      sx={{
                        mx: 1,
                        borderRadius: 1.5,
                        py: 0.75,
                        '&.Mui-selected': {
                          bgcolor: 'rgba(255,59,48,0.15)',
                          '&:hover': { bgcolor: 'rgba(255,59,48,0.2)' },
                        },
                        '&:hover': { bgcolor: 'rgba(255,255,255,0.05)' },
                      }}
                    >
                      <ListItemIcon sx={{ minWidth: 32, color: 'rgba(255,255,255,0.5)' }}>
                        {isActive ? <ArrowIcon fontSize="small" /> : <SearchIcon fontSize="small" />}
                      </ListItemIcon>
                      <ListItemText
                        primary={entry.title}
                        secondary={entry.subtitle}
                        primaryTypographyProps={{
                          fontSize: '0.85rem',
                          fontWeight: isActive ? 600 : 500,
                          color: '#fff',
                        }}
                        secondaryTypographyProps={{
                          fontSize: '0.7rem',
                          color: 'rgba(255,255,255,0.45)',
                        }}
                      />
                    </ListItemButton>
                  );
                })}
                <Divider sx={{ borderColor: 'rgba(255,255,255,0.04)', my: 0.5 }} />
              </Box>
            ))}
          </List>
        )}
      </DialogContent>

      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          px: 2.5,
          py: 1.25,
          borderTop: '1px solid rgba(255,255,255,0.08)',
          fontSize: '0.7rem',
          color: 'rgba(255,255,255,0.4)',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Chip label="↑" size="small" sx={hotkeySx} />
          <Chip label="↓" size="small" sx={hotkeySx} />
          <span>选择</span>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Chip label="↵" size="small" sx={hotkeySx} />
          <span>确认</span>
        </Box>
        <Box sx={{ flex: 1 }} />
        <span>ProClaw 全局搜索 · ⌘K</span>
      </Box>
    </Dialog>
  );
}

const hotkeySx = {
  bgcolor: 'rgba(255,255,255,0.08)',
  color: 'rgba(255,255,255,0.6)',
  fontSize: '0.65rem',
  height: 18,
  minWidth: 22,
  fontWeight: 600,
  '& .MuiChip-label': { px: 0.5 },
} as const;
