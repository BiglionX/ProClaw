/**
 * NvwaX Agent 市场页面
 *
 * 提供 Agent/AiTeam 市场浏览、搜索、分类/行业筛选功能。
 * 通过 NvwaXService 调用 Rust 后端 API。
 *
 * PRD: ProClaw × NvwaX API 集成需求文档
 */

import { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  InputAdornment,
  Paper,
  Tab,
  Tabs,
  TextField,
  Typography,
  Grid,
  Snackbar,
  Alert,
} from '@mui/material';
import {
  Search as SearchIcon,
  Close as CloseIcon,
  Download as DownloadIcon,
  AutoAwesome as AutoAwesomeIcon,
  Refresh as RefreshIcon,
  Settings as SettingsIcon,
} from '@mui/icons-material';
import { NvwaXService } from '../../lib/nvwaxClient';
import type {
  AgentSummary,
  AgentDetail,
  AiTeamSummary,
  AiTeamDetail,
  Category,
  Industry,
} from '../../types/nvwax';

/** 市场模式 */
type MarketMode = 'agents' | 'aiteams';

/** 市场对话框属性 */
interface MarketplaceDialogProps {
  open: boolean;
  onClose: () => void;
  onImportAgent?: (agent: AgentDetail) => void;
  onImportAiTeam?: (aiteam: AiTeamDetail) => void;
}

/** Agent 详情对话框 */
function AgentDetailDialog({
  agentId,
  onClose,
  onImport,
}: {
  agentId: string | null;
  onClose: () => void;
  onImport?: (agent: AgentDetail) => void;
}) {
  const [detail, setDetail] = useState<AgentDetail | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!agentId) return;
    setLoading(true);
    NvwaXService.getAgentDetail(agentId)
      .then(setDetail)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [agentId]);

  return (
    <Dialog open={!!agentId} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span>Agent 详情</span>
        <IconButton onClick={onClose} size="small"><CloseIcon /></IconButton>
      </DialogTitle>
      <DialogContent>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        ) : detail ? (
          <Box>
            <Typography variant="h6">{detail.name}</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              {detail.description || '暂无描述'}
            </Typography>
            <Box sx={{ mt: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              {detail.tags?.map((tag) => (
                <Chip key={tag} label={tag} size="small" />
              ))}
            </Box>
            <Box sx={{ mt: 2 }}>
              <Typography variant="caption" display="block">
                版本: {detail.version || '-'}
              </Typography>
              <Typography variant="caption" display="block">
                作者: {detail.author || '-'}
              </Typography>
              <Typography variant="caption" display="block">
                状态: {detail.status || '-'}
              </Typography>
            </Box>
            {onImport && (
              <Button
                variant="contained"
                startIcon={<DownloadIcon />}
                onClick={() => onImport(detail)}
                sx={{ mt: 2 }}
              >
                导入此 Agent
              </Button>
            )}
          </Box>
        ) : (
          <Typography color="error">加载详情失败</Typography>
        )}
      </DialogContent>
    </Dialog>
  );
}

/** AiTeam 详情对话框 */
function AiTeamDetailDialog({
  aiteamId,
  onClose,
  onImport,
}: {
  aiteamId: string | null;
  onClose: () => void;
  onImport?: (aiteam: AiTeamDetail) => void;
}) {
  const [detail, setDetail] = useState<AiTeamDetail | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!aiteamId) return;
    setLoading(true);
    NvwaXService.getAiTeamDetail(aiteamId)
      .then(setDetail)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [aiteamId]);

  return (
    <Dialog open={!!aiteamId} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span>AiTeam 详情</span>
        <IconButton onClick={onClose} size="small"><CloseIcon /></IconButton>
      </DialogTitle>
      <DialogContent>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        ) : detail ? (
          <Box>
            <Typography variant="h6">{detail.name}</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              {detail.description || '暂无描述'}
            </Typography>
            <Typography variant="caption" display="block" sx={{ mt: 1 }}>
              行业: {detail.industry || '-'}
            </Typography>
            <Typography variant="subtitle2" sx={{ mt: 2, mb: 1 }}>团队成员:</Typography>
            {detail.members?.map((m, i) => (
              <Chip
                key={i}
                label={`${m.agent_name || m.agent_id} (${m.role || '成员'})`}
                size="small"
                sx={{ mr: 0.5, mb: 0.5 }}
              />
            ))}
            {onImport && (
              <Button
                variant="contained"
                startIcon={<DownloadIcon />}
                onClick={() => onImport(detail)}
                sx={{ mt: 2, display: 'block' }}
              >
                导入此 AiTeam
              </Button>
            )}
          </Box>
        ) : (
          <Typography color="error">加载详情失败</Typography>
        )}
      </DialogContent>
    </Dialog>
  );
}

/** Agent 卡片 */
function AgentCard({
  agent,
  onViewDetail,
}: {
  agent: AgentSummary;
  onViewDetail: (id: string) => void;
}) {
  return (
    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <CardContent sx={{ flexGrow: 1 }}>
        <Typography variant="subtitle1" fontWeight={600} noWrap>
          {agent.name}
        </Typography>
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{
            mt: 0.5,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            height: 40,
          }}
        >
          {agent.description || '暂无描述'}
        </Typography>
        <Box sx={{ mt: 1, display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
          {agent.tags?.slice(0, 3).map((tag) => (
            <Chip key={tag} label={tag} size="small" variant="outlined" />
          ))}
        </Box>
      </CardContent>
      <CardActions>
        <Button size="small" onClick={() => onViewDetail(agent.id)}>
          查看详情
        </Button>
      </CardActions>
    </Card>
  );
}

/** AiTeam 卡片 */
function AiTeamCard({
  aiteam,
  onViewDetail,
}: {
  aiteam: AiTeamSummary;
  onViewDetail: (id: string) => void;
}) {
  return (
    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <CardContent sx={{ flexGrow: 1 }}>
        <Typography variant="subtitle1" fontWeight={600} noWrap>
          {aiteam.name}
        </Typography>
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{
            mt: 0.5,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            height: 40,
          }}
        >
          {aiteam.description || '暂无描述'}
        </Typography>
        <Box sx={{ mt: 1, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          {aiteam.industry && <Chip label={aiteam.industry} size="small" color="primary" variant="outlined" />}
          {aiteam.member_count !== undefined && (
            <Chip label={`${aiteam.member_count} 成员`} size="small" variant="outlined" />
          )}
        </Box>
      </CardContent>
      <CardActions>
        <Button size="small" onClick={() => onViewDetail(aiteam.id)}>
          查看详情
        </Button>
      </CardActions>
    </Card>
  );
}

/** 分类/行业过滤器 */
function FilterBar({
  categories,
  industries,
  mode,
  selectedCategory,
  onCategoryChange,
  selectedIndustry,
  onIndustryChange,
}: {
  categories: Category[];
  industries: Industry[];
  mode: MarketMode;
  selectedCategory: string;
  onCategoryChange: (c: string) => void;
  selectedIndustry: string;
  onIndustryChange: (c: string) => void;
}) {
  if (mode === 'agents') {
    return (
      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
        <Chip
          label="全部"
          size="small"
          variant={selectedCategory === '' ? 'filled' : 'outlined'}
          color={selectedCategory === '' ? 'primary' : 'default'}
          onClick={() => onCategoryChange('')}
        />
        {categories.map((cat) => (
          <Chip
            key={cat.id}
            label={`${cat.name}${cat.count !== undefined ? ` (${cat.count})` : ''}`}
            size="small"
            variant={selectedCategory === cat.id ? 'filled' : 'outlined'}
            color={selectedCategory === cat.id ? 'primary' : 'default'}
            onClick={() => onCategoryChange(cat.id)}
          />
        ))}
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
      <Chip
        label="全部行业"
        size="small"
        variant={selectedIndustry === '' ? 'filled' : 'outlined'}
        color={selectedIndustry === '' ? 'primary' : 'default'}
        onClick={() => onIndustryChange('')}
      />
      {industries.map((ind) => (
        <Chip
          key={ind.id}
          label={`${ind.name}${ind.count !== undefined ? ` (${ind.count})` : ''}`}
          size="small"
          variant={selectedIndustry === ind.id ? 'filled' : 'outlined'}
          color={selectedIndustry === ind.id ? 'primary' : 'default'}
          onClick={() => onIndustryChange(ind.id)}
        />
      ))}
    </Box>
  );
}

// ============================================================
// 主组件
// ============================================================

export default function MarketplaceDialog({ open, onClose, onImportAgent, onImportAiTeam }: MarketplaceDialogProps) {
  const [mode, setMode] = useState<MarketMode>('agents');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState('');

  // Agent 市场数据
  const [agents, setAgents] = useState<AgentSummary[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('');

  // AiTeam 市场数据
  const [aiteams, setAiTeams] = useState<AiTeamSummary[]>([]);
  const [industries, setIndustries] = useState<Industry[]>([]);
  const [selectedIndustry, setSelectedIndustry] = useState('');

  // 分类/行业加载错误
  const [categoriesError, setCategoriesError] = useState('');
  const [industriesError, setIndustriesError] = useState('');

  // 详情弹窗
  const [detailAgentId, setDetailAgentId] = useState<string | null>(null);
  const [detailAiTeamId, setDetailAiTeamId] = useState<string | null>(null);

  // NvwaX 配置状态
  const [configured, setConfigured] = useState(false);
  const [configChecked, setConfigChecked] = useState(false);

  // 分页
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const pageSize = 20;

  /** 加载数据 */
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      if (mode === 'agents') {
        const result = await NvwaXService.searchAgents({
          q: searchQuery || undefined,
          category: selectedCategory || undefined,
          page,
          limit: pageSize,
        });
        setAgents(result.agents || []);
        if (result.pagination) {
          setTotalPages(result.pagination.total_pages);
        }
      } else {
        const result = await NvwaXService.searchAiTeams({
          q: searchQuery || undefined,
          industry: selectedIndustry || undefined,
          page,
          limit: pageSize,
        });
        setAiTeams(result.aiteams || []);
        if (result.pagination) {
          setTotalPages(result.pagination.total_pages);
        }
      }
    } catch (err: any) {
      setSnackbar('加载失败: ' + (err.message || '未知错误'));
    } finally {
      setLoading(false);
    }
  }, [mode, searchQuery, selectedCategory, selectedIndustry, page]);

  /** 加载分类/行业列表 */
  useEffect(() => {
    NvwaXService.getCategories().then(setCategories).catch((e) => setCategoriesError(String(e)));
    NvwaXService.getIndustries().then(setIndustries).catch((e) => setIndustriesError(String(e)));
  }, []);

  useEffect(() => {
    if (open) {
      loadData();
    }
  }, [open, loadData]);

  /** 检测 NvwaX 是否已配置 API Key */
  useEffect(() => {
    if (open) {
      setConfigChecked(false);
      setConfigured(false);
      NvwaXService.isConfigured().then((ok) => {
        setConfigured(ok);
        setConfigChecked(true);
      });
    }
  }, [open]);

  /** 搜索 */
  const handleSearch = () => {
    setPage(1);
    loadData();
  };

  /** 处理导入 Agent */
  const handleImportAgent = (agent: AgentDetail) => {
    onImportAgent?.(agent);
    setDetailAgentId(null);
    setSnackbar(`Agent "${agent.name}" 已选择，请完成导入`);
    NvwaXService.checkBalanceAndAlert();
  };

  /** 处理导入 AiTeam */
  const handleImportAiTeam = (aiteam: AiTeamDetail) => {
    onImportAiTeam?.(aiteam);
    setDetailAiTeamId(null);
    setSnackbar(`AiTeam "${aiteam.name}" 已选择，请完成导入`);
    NvwaXService.checkBalanceAndAlert();
  };

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <AutoAwesomeIcon sx={{ color: '#6366f1' }} />
            <span>NvwaX Agent 市场</span>
          </Box>
          <IconButton onClick={onClose} size="small"><CloseIcon /></IconButton>
        </DialogTitle>

        <DialogContent>
          {/* NvwaX 未配置引导 */}
          {configured === false ? (
            <Paper sx={{ p: 4, textAlign: 'center' }}>
              <AutoAwesomeIcon sx={{ fontSize: 64, color: '#6366f1', mb: 2, opacity: 0.5 }} />
              <Typography variant="h6" gutterBottom>NvwaX 服务未配置</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3, maxWidth: 400, mx: 'auto' }}>
                请先在系统设置中配置 NvwaX API Key，以启用 Agent 市场浏览、Agent/AiTeam 管理和发布功能。
              </Typography>
              <Button
                variant="contained"
                startIcon={<SettingsIcon />}
                onClick={() => { window.open('/settings', '_blank'); onClose(); }}
                sx={{ background: 'linear-gradient(135deg, #6366f1, #a855f7)' }}
              >
                前往设置
              </Button>
            </Paper>
          ) : (
          <>
          {/* Tab 切换 */}
          <Tabs
            value={mode}
            onChange={(_, v) => { setMode(v); setPage(1); }}
            sx={{ mb: 2, borderBottom: 1, borderColor: 'divider' }}
          >
            <Tab label="Agent 市场" value="agents" />
            <Tab label="AiTeam 市场" value="aiteams" />
          </Tabs>

          {/* 搜索栏 */}
          <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
            <TextField
              size="small"
              fullWidth
              placeholder={mode === 'agents' ? '搜索 Agent...' : '搜索 AiTeam...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" />
                  </InputAdornment>
                ),
              }}
            />
            <Button variant="contained" onClick={handleSearch} disabled={loading}>
              搜索
            </Button>
            <IconButton onClick={loadData} disabled={loading}>
              <RefreshIcon />
            </IconButton>
          </Box>

          {/* 过滤器 */}
          {configured && (categoriesError || industriesError) && (
            <Alert severity="warning" sx={{ mb: 1, fontSize: '0.75rem', py: 0 }}>
              {categoriesError && <div>分类加载失败: {categoriesError}</div>}
              {industriesError && <div>行业加载失败: {industriesError}</div>}
            </Alert>
          )}
          <FilterBar
            categories={categories}
            industries={industries}
            mode={mode}
            selectedCategory={selectedCategory}
            onCategoryChange={(c) => { setSelectedCategory(c); setPage(1); }}
            selectedIndustry={selectedIndustry}
            onIndustryChange={(c) => { setSelectedIndustry(c); setPage(1); }}
          />

          {/* 检查配置中 */}
          {!configChecked && (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress size={24} sx={{ mr: 1 }} />
              <Typography color="text.secondary">正在检查 NvwaX 配置...</Typography>
            </Box>
          )}

          {/* 列表 */}
          {configChecked && configured && (loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
              <CircularProgress />
            </Box>
          ) : (
            <>
              {mode === 'agents' ? (
                agents.length === 0 ? (
                  <Paper sx={{ p: 4, textAlign: 'center' }}>
                    <Typography color="text.secondary">暂无 Agent 数据</Typography>
                  </Paper>
                ) : (
                  <Grid container spacing={2}>
                    {agents.map((agent) => (
                      <Grid item xs={12} sm={6} md={4} key={agent.id}>
                        <AgentCard agent={agent} onViewDetail={setDetailAgentId} />
                      </Grid>
                    ))}
                  </Grid>
                )
              ) : (
                aiteams.length === 0 ? (
                  <Paper sx={{ p: 4, textAlign: 'center' }}>
                    <Typography color="text.secondary">暂无 AiTeam 数据</Typography>
                  </Paper>
                ) : (
                  <Grid container spacing={2}>
                    {aiteams.map((aiteam) => (
                      <Grid item xs={12} sm={6} md={4} key={aiteam.id}>
                        <AiTeamCard aiteam={aiteam} onViewDetail={setDetailAiTeamId} />
                      </Grid>
                    ))}
                  </Grid>
                )
              )}

              {/* 分页 */}
              {totalPages > 1 && (
                <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1, mt: 3 }}>
                  <Button
                    size="small"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    上一页
                  </Button>
                  <Typography sx={{ alignSelf: 'center' }}>
                    {page} / {totalPages}
                  </Typography>
                  <Button
                    size="small"
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    下一页
                  </Button>
                </Box>
              )}
            </>
          ))}
          </>
          )}
        </DialogContent>
      </Dialog>

      {/* 详情弹窗 */}
      <AgentDetailDialog
        agentId={detailAgentId}
        onClose={() => setDetailAgentId(null)}
        onImport={handleImportAgent}
      />
      <AiTeamDetailDialog
        aiteamId={detailAiTeamId}
        onClose={() => setDetailAiTeamId(null)}
        onImport={handleImportAiTeam}
      />

      <Snackbar
        open={!!snackbar}
        message={snackbar}
        autoHideDuration={3000}
        onClose={() => setSnackbar('')}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
    </>
  );
}
