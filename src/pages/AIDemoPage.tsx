/**
 * AI智能分析演示页面
 * 用于快速验证AI决策系统的核心功能
 */

import {
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Container,
  Divider,
  Grid,
  Paper,
  Typography,
  Alert,
  Chip,
  Tabs,
  Tab,
} from '@mui/material';
import { useState } from 'react';
import {
  TrendingUp as TrendingUpIcon,
  Inventory as InventoryIcon,
  Warning as WarningIcon,
  ShoppingCart as ShoppingCartIcon,
  Refresh as RefreshIcon,
  Psychology,
  Psychology as AgentIcon,
} from '@mui/icons-material';
import {
  analyzeSalesTrend,
  optimizeInventory,
  detectAnomalies,
  generatePurchaseSuggestions,
} from '../lib/aiAnalyticsService';
import { getLLMProviderManager } from '../lib/llmProvider';
import { getAIConfig } from '../lib/aiConfig';
import {
  BusinessAnalystAgent,
  InventoryOptimizerAgent,
  SalesForecasterAgent,
  DecisionAdvisorAgent,
} from '../lib/agents';

type AnalysisType = 'sales' | 'inventory' | 'anomaly' | 'purchase' | null;
type TabValue = 'services' | 'agents';

interface AnalysisResult {
  type: AnalysisType;
  data: any;
  timestamp: Date;
  duration: number;
}

export default function AIDemoPage() {
  const [loading, setLoading] = useState(false);
  const [currentAnalysis, setCurrentAnalysis] = useState<AnalysisType>(null);
  const [results, setResults] = useState<AnalysisResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [providerStatus, setProviderStatus] = useState<string>('');
  const [tabValue, setTabValue] = useState<TabValue>('services');
  const [agentLoading, setAgentLoading] = useState(false);
  const [agentResult, setAgentResult] = useState<any>(null);

  // 检查LLM提供商状态
  const checkProviderStatus = async () => {
    try {
      const config = await getAIConfig();
      const manager = getLLMProviderManager();
      await manager.initialize(config);
      
      const stats = manager.getStats();
      setProviderStatus(
        `已加载 ${stats.active}/${stats.total} 个LLM提供商: ${stats.providers.join(', ')}`
      );
    } catch (err) {
      setProviderStatus(`初始化失败: ${err instanceof Error ? err.message : '未知错误'}`);
    }
  };

  // 执行分析
  const runAnalysis = async (type: AnalysisType) => {
    if (!type) return;

    setLoading(true);
    setCurrentAnalysis(type);
    setError(null);

    const startTime = Date.now();

    try {
      let result: any;

      switch (type) {
        case 'sales':
          result = await analyzeSalesTrend('30d');
          break;
        case 'inventory':
          result = await optimizeInventory();
          break;
        case 'anomaly':
          result = await detectAnomalies();
          break;
        case 'purchase':
          result = await generatePurchaseSuggestions();
          break;
      }

      const duration = Date.now() - startTime;
      
      setResults(prev => [
        {
          type,
          data: result,
          timestamp: new Date(),
          duration,
        },
        ...prev.slice(0, 4), // 只保留最近5条结果
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : '分析失败');
    } finally {
      setLoading(false);
      setCurrentAnalysis(null);
    }
  };

  // 清除所有结果
  const clearResults = () => {
    setResults([]);
    setError(null);
  };

  // 测试Agent
  const testAgent = async (agentType: 'business' | 'inventory' | 'sales' | 'decision') => {
    setAgentLoading(true);
    setAgentResult(null);
    setError(null);

    try {
      let result: any;

      switch (agentType) {
        case 'business': {
          const agent = new BusinessAnalystAgent();
          result = await agent.analyzeBusiness('30d');
          break;
        }
        case 'inventory': {
          const agent = new InventoryOptimizerAgent();
          result = await agent.optimize();
          break;
        }
        case 'sales': {
          const agent = new SalesForecasterAgent();
          result = await agent.forecast(30);
          break;
        }
        case 'decision': {
          const agent = new DecisionAdvisorAgent();
          result = await agent.provideRecommendation(
            '我需要优化库存并提高销售额，预算有限，请提供战略建议'
          );
          break;
        }
      }

      setAgentResult({
        type: agentType,
        data: result,
        timestamp: new Date(),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Agent执行失败');
    } finally {
      setAgentLoading(false);
    }
  };

  // 渲染分析类型图标
  const getAnalysisIcon = (type: AnalysisType) => {
    switch (type) {
      case 'sales':
        return <TrendingUpIcon />;
      case 'inventory':
        return <InventoryIcon />;
      case 'anomaly':
        return <WarningIcon />;
      case 'purchase':
        return <ShoppingCartIcon />;
      default:
        return null;
    }
  };

  // 渲染分析类型标签
  const getAnalysisLabel = (type: AnalysisType) => {
    switch (type) {
      case 'sales':
        return '销售预测';
      case 'inventory':
        return '库存优化';
      case 'anomaly':
        return '异常检测';
      case 'purchase':
        return '采购建议';
      default:
        return '未知';
    }
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* 页面标题 */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" sx={{ fontWeight: 700, mb: 1 }}>
          🤖 AI智能决策系统 - 演示版
        </Typography>
        <Typography variant="body1" color="text.secondary">
          测试大模型驱动的深度分析和智能决策功能
        </Typography>
      </Box>

      {/* LLM提供商状态 */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">LLM提供商状态</Typography>
            <Button
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={checkProviderStatus}
              size="small"
            >
              检查状态
            </Button>
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            {providerStatus || '点击“检查状态”按钮查看LLM提供商配置'}
          </Typography>
        </CardContent>
      </Card>
      
      {/* Tab切换 */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={tabValue} onChange={(_, newValue) => setTabValue(newValue)}>
          <Tab label="分析服务" value="services" />
          <Tab label="AI Agents" value="agents" icon={<AgentIcon />} iconPosition="start" />
        </Tabs>
      </Box>

      {/* Tab内容 */}
      {tabValue === 'services' && (
        <>
          {/* 分析操作区 */}
          <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={3}>
          <Button
            fullWidth
            variant="contained"
            startIcon={<TrendingUpIcon />}
            onClick={() => runAnalysis('sales')}
            disabled={loading}
            sx={{ height: 80 }}
          >
            销售预测
          </Button>
        </Grid>
        <Grid item xs={12} md={3}>
          <Button
            fullWidth
            variant="contained"
            startIcon={<InventoryIcon />}
            onClick={() => runAnalysis('inventory')}
            disabled={loading}
            sx={{ height: 80 }}
          >
            库存优化
          </Button>
        </Grid>
        <Grid item xs={12} md={3}>
          <Button
            fullWidth
            variant="contained"
            startIcon={<WarningIcon />}
            onClick={() => runAnalysis('anomaly')}
            disabled={loading}
            sx={{ height: 80 }}
          >
            异常检测
          </Button>
        </Grid>
        <Grid item xs={12} md={3}>
          <Button
            fullWidth
            variant="contained"
            startIcon={<ShoppingCartIcon />}
            onClick={() => runAnalysis('purchase')}
            disabled={loading}
            sx={{ height: 80 }}
          >
            采购建议
          </Button>
        </Grid>
      </Grid>

      {/* 加载状态 */}
      {loading && (
        <Paper sx={{ p: 4, textAlign: 'center', mb: 3 }}>
          <CircularProgress sx={{ mb: 2 }} />
          <Typography>
            正在执行{getAnalysisLabel(currentAnalysis)}分析...
          </Typography>
          <Typography variant="body2" color="text.secondary">
            这可能需要几秒钟时间
          </Typography>
        </Paper>
      )}

      {/* 错误提示 */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* 分析结果 */}
      {results.length > 0 && (
        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">分析结果</Typography>
            <Button variant="outlined" size="small" onClick={clearResults}>
              清除结果
            </Button>
          </Box>

          <Grid container spacing={2}>
            {results.map((result, index) => (
              <Grid item xs={12} key={index}>
                <Card>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                      {getAnalysisIcon(result.type)}
                      <Typography variant="h6">
                        {getAnalysisLabel(result.type)}
                      </Typography>
                      <Chip
                        label={`${result.duration}ms`}
                        size="small"
                        color="primary"
                        variant="outlined"
                      />
                      <Typography variant="caption" color="text.secondary">
                        {result.timestamp.toLocaleTimeString()}
                      </Typography>
                    </Box>

                    <Divider sx={{ my: 2 }} />

                    {/* 显示原始数据（简化版） */}
                    <Box
                      component="pre"
                      sx={{
                        bgcolor: 'grey.100',
                        p: 2,
                        borderRadius: 1,
                        overflow: 'auto',
                        maxHeight: 300,
                        fontSize: '0.875rem',
                      }}
                    >
                      {JSON.stringify(result.data, null, 2)}
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>
      )}

      {/* 使用说明 */}
      {results.length === 0 && !loading && (
        <Paper sx={{ p: 4, textAlign: 'center', bgcolor: 'grey.50' }}>
          <Typography variant="h6" gutterBottom>
            开始使用AI智能分析
          </Typography>
          <Typography color="text.secondary" paragraph>
            点击上方任意按钮执行相应的AI分析任务。
            <br />
            系统将调用配置的LLM提供商进行深度分析，并返回结构化结果。
          </Typography>
          <Typography variant="body2" color="text.secondary">
            💡 提示：首次使用前，请确保已在设置中配置了有效的LLM API密钥
          </Typography>
        </Paper>
      )}
        </>
      )}

      {/* Agents Tab */}
      {tabValue === 'agents' && (
        <Box>
          <Typography variant="h6" gutterBottom sx={{ mb: 3 }}>
            AI Agents 测试
          </Typography>
          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid item xs={12} md={3}>
              <Button
                fullWidth
                variant="contained"
                startIcon={<AgentIcon />}
                onClick={() => testAgent('business')}
                disabled={agentLoading}
                sx={{ height: 80 }}
              >
                业务分析Agent
              </Button>
            </Grid>
            <Grid item xs={12} md={3}>
              <Button
                fullWidth
                variant="contained"
                startIcon={<InventoryIcon />}
                onClick={() => testAgent('inventory')}
                disabled={agentLoading}
                sx={{ height: 80 }}
              >
                库存优化Agent
              </Button>
            </Grid>
            <Grid item xs={12} md={3}>
              <Button
                fullWidth
                variant="contained"
                startIcon={<TrendingUpIcon />}
                onClick={() => testAgent('sales')}
                disabled={agentLoading}
                sx={{ height: 80 }}
              >
                销售预测Agent
              </Button>
            </Grid>
            <Grid item xs={12} md={3}>
              <Button
                fullWidth
                variant="contained"
                startIcon={<Psychology />}
                onClick={() => testAgent('decision')}
                disabled={agentLoading}
                sx={{ height: 80 }}
              >
                决策建议Agent
              </Button>
            </Grid>
          </Grid>

          {/* Agent加载状态 */}
          {agentLoading && (
            <Paper sx={{ p: 4, textAlign: 'center', mb: 3 }}>
              <CircularProgress sx={{ mb: 2 }} />
              <Typography>Agent正在执行分析...</Typography>
            </Paper>
          )}

          {/* Agent结果 */}
          {agentResult && (
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <AgentIcon />
                  <Typography variant="h6">
                    {agentResult.type === 'business' && '业务分析'}
                    {agentResult.type === 'inventory' && '库存优化'}
                    {agentResult.type === 'sales' && '销售预测'}
                    {agentResult.type === 'decision' && '决策建议'}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {agentResult.timestamp.toLocaleTimeString()}
                  </Typography>
                </Box>
                <Divider sx={{ my: 2 }} />
                <Box
                  component="pre"
                  sx={{
                    bgcolor: 'grey.100',
                    p: 2,
                    borderRadius: 1,
                    overflow: 'auto',
                    maxHeight: 400,
                    fontSize: '0.875rem',
                  }}
                >
                  {JSON.stringify(agentResult.data, null, 2)}
                </Box>
              </CardContent>
            </Card>
          )}

          {!agentResult && !agentLoading && (
            <Paper sx={{ p: 4, textAlign: 'center', bgcolor: 'grey.50' }}>
              <Typography variant="h6" gutterBottom>
                AI Agents 系统
              </Typography>
              <Typography color="text.secondary" paragraph>
                Agents是专业的AI助手，能够执行复杂的分析任务并提供智能建议。
                <br />
                每个Agent都有专门的工具和知识库，能够提供更深度的洞察。
              </Typography>
            </Paper>
          )}
        </Box>
      )}
    </Container>
  );
}
