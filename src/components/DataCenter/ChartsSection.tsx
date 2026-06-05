import { Box, Paper, Typography } from '@mui/material';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, PieChart, Pie, Cell,
  BarChart, Bar,
} from 'recharts';

// ========== 自定义 Tooltip ==========
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload || !payload.length) return null;
  return (
    <Paper
      elevation={0}
      sx={{
        p: 1.5,
        borderRadius: 2,
        border: '1px solid rgba(0,0,0,0.06)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        backgroundColor: 'rgba(255,255,255,0.9)',
      }}
    >
      <Typography variant="caption" sx={{ fontWeight: 600, display: 'block', mb: 0.5 }}>
        {label}
      </Typography>
      {payload.map((entry: any, idx: number) => (
        <Box key={idx} sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 0.25 }}>
          <Box sx={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: entry.color }} />
          <Typography variant="caption" sx={{ color: '#666' }}>
            {entry.name}: <strong>{entry.value}</strong>
          </Typography>
        </Box>
      ))}
    </Paper>
  );
}

// ========== 品牌色 ==========
const BRAND_RED = '#FF3B30';
const BRAND_PURPLE = '#6366F1';
const BRAND_GREEN = '#10B981';
const BRAND_GOLD = '#F59E0B';

const GRID_STYLE = { stroke: 'rgba(0,0,0,0.04)', strokeDasharray: '3 3' };

interface ChartsSectionProps {
  salesChartData: any[];
  inventoryDistribution: any[];
}

export default function ChartsSection({ salesChartData, inventoryDistribution }: ChartsSectionProps) {
  return (
    <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
      {/* 销售趋势图 */}
      <Paper
        elevation={0}
        sx={{
          flex: '1 1 55%',
          minWidth: 300,
          p: 3,
          borderRadius: 2,
          border: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, fontSize: '0.95rem' }}>
          📈 近7天销售趋势
        </Typography>
        {salesChartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={280}>
            <LineChart
              data={salesChartData}
              margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
            >
              <defs>
                <linearGradient id="salesOutGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={BRAND_RED} stopOpacity={0.15} />
                  <stop offset="100%" stopColor={BRAND_RED} stopOpacity={0} />
                </linearGradient>
                <linearGradient id="salesInGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={BRAND_PURPLE} stopOpacity={0.15} />
                  <stop offset="100%" stopColor={BRAND_PURPLE} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid {...GRID_STYLE} />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#999' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#999' }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                wrapperStyle={{ fontSize: '0.75rem', paddingTop: 8 }}
                iconType="circle"
                iconSize={8}
              />
              <Line
                type="monotone"
                dataKey="出库量"
                stroke={BRAND_RED}
                strokeWidth={2.5}
                dot={{ r: 3, fill: BRAND_RED, strokeWidth: 0 }}
                activeDot={{ r: 5 }}
                fill="url(#salesOutGradient)"
                animationDuration={800}
              />
              <Line
                type="monotone"
                dataKey="入库量"
                stroke={BRAND_PURPLE}
                strokeWidth={2.5}
                dot={{ r: 3, fill: BRAND_PURPLE, strokeWidth: 0 }}
                activeDot={{ r: 5 }}
                fill="url(#salesInGradient)"
                animationDuration={800}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <Box sx={{ textAlign: 'center', py: 8 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              📊 AI 正在学习你的数据
            </Typography>
            <Typography variant="caption" color="text.secondary">
              录入第一笔交易后即可看到趋势
            </Typography>
          </Box>
        )}
      </Paper>

      {/* 库存状态分布 */}
      <Paper
        elevation={0}
        sx={{
          flex: '1 1 35%',
          minWidth: 240,
          p: 3,
          borderRadius: 2,
          border: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, fontSize: '0.95rem' }}>
          📊 库存状态分布
        </Typography>
        {inventoryDistribution.length > 0 ? (
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={inventoryDistribution}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent! * 100).toFixed(0)}%`}
                outerRadius={90}
                innerRadius={45}
                dataKey="value"
                animationBegin={0}
                animationDuration={800}
              >
                {inventoryDistribution.map((entry: any, index: number) => (
                  <Cell key={`cell-${index}`} fill={entry.color || [BRAND_GREEN, BRAND_GOLD, BRAND_RED][index]} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <Box sx={{ textAlign: 'center', py: 8 }}>
            <Typography variant="body2" color="text.secondary">暂无库存数据</Typography>
          </Box>
        )}
      </Paper>

      {/* 交易数量柱状图 */}
      {salesChartData.length > 0 && (
        <Paper
          elevation={0}
          sx={{
            flex: '1 1 100%',
            p: 3,
            borderRadius: 2,
            border: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, fontSize: '0.95rem' }}>
            📊 交易数量趋势
          </Typography>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={salesChartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={BRAND_RED} stopOpacity={0.8} />
                  <stop offset="100%" stopColor={BRAND_RED} stopOpacity={0.3} />
                </linearGradient>
              </defs>
              <CartesianGrid {...GRID_STYLE} />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#999' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#999' }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar
                dataKey="交易数"
                fill="url(#barGradient)"
                radius={[4, 4, 0, 0]}
                animationDuration={800}
              />
            </BarChart>
          </ResponsiveContainer>
        </Paper>
      )}
    </Box>
  );
}
