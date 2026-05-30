/**
 * 行业选择器 - 安装向导第一步
 * 用户选择行业模式，后续安装步骤根据选择适配
 * 
 * 未来（Phase 2+）：从 Supabase 插件目录加载已发布行业列表
 */
import { Box, Button, Card, CardContent, CircularProgress, Typography } from '@mui/material';

export interface IndustryOption {
  id: string;
  name: string;
  icon: string;
  description: string;
  badge?: string;
}

/**
 * 默认行业选项（Phase 1 硬编码，Phase 4 将提取为独立插件）
 * 当无法联网或插件目录不可用时作为回退
 */
export const DEFAULT_INDUSTRIES: IndustryOption[] = [
  {
    id: 'inventory',
    name: '进销存通用版',
    icon: '📦',
    description: '适用于大多数实体商户，含完整进销存管理、报表分析、AI经营团队',
    badge: '推荐',
  },
  {
    id: 'light',
    name: '极简零售版',
    icon: '🛍️',
    description: '县区小微商家首选，简化操作流程，聚焦核心业务',
  },
  {
    id: 'virtual_company',
    name: '虚拟公司版',
    icon: '🏢',
    description: '虚拟团队与Agent协作平台，CEO Agent主控官系统',
  },
];

interface IndustrySelectorProps {
  onIndustrySelected: (industryId: string) => void;
  industries?: IndustryOption[];
  loading?: boolean;
}

export function IndustrySelector({
  onIndustrySelected,
  industries = DEFAULT_INDUSTRIES,
  loading = false,
}: IndustrySelectorProps) {
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <CircularProgress size={32} sx={{ color: 'rgba(255,255,255,0.5)' }} />
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
      <Typography
        variant="subtitle2"
        sx={{ color: 'rgba(255,255,255,0.6)', textAlign: 'center', mb: 1 }}
      >
        选择一个适合您的行业模式：
      </Typography>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        {industries.map((industry) => (
          <Card
            key={industry.id}
            elevation={0}
            sx={{
              bgcolor: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 2,
              cursor: 'pointer',
              transition: 'all 0.2s',
              '&:hover': {
                bgcolor: 'rgba(255,59,48,0.1)',
                borderColor: '#ff3b30',
                transform: 'translateX(4px)',
              },
            }}
            onClick={() => onIndustrySelected(industry.id)}
          >
            <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 2, '&:last-child': { pb: 2 } }}>
              <Typography variant="h4" sx={{ fontSize: '2rem', lineHeight: 1 }}>
                {industry.icon}
              </Typography>
              <Box sx={{ flex: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600, color: '#fff' }}>
                    {industry.name}
                  </Typography>
                  {industry.badge && (
                    <Typography
                      variant="caption"
                      sx={{
                        px: 1,
                        py: 0.25,
                        borderRadius: 1,
                        bgcolor: '#ff3b30',
                        color: '#fff',
                        fontSize: '0.7rem',
                      }}
                    >
                      {industry.badge}
                    </Typography>
                  )}
                </Box>
                <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.6)', mt: 0.5 }}>
                  {industry.description}
                </Typography>
              </Box>
              <Button
                size="small"
                variant="outlined"
                sx={{
                  borderColor: 'rgba(255,255,255,0.2)',
                  color: 'rgba(255,255,255,0.7)',
                  '&:hover': { borderColor: '#ff3b30', color: '#ff3b30' },
                  flexShrink: 0,
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  onIndustrySelected(industry.id);
                }}
              >
                选择
              </Button>
            </CardContent>
          </Card>
        ))}
      </Box>
    </Box>
  );
}
