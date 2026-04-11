import { Alert, Box, Button, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { parseCommand } from '../lib/commandParser';

export default function TestPage() {
  const navigate = useNavigate();

  const testCommands = [
    '添加产品 测试产品',
    '查询库存',
    '销售分析 本月',
    '生成报表 库存报表',
    '库存预警',
  ];

  const testParse = () => {
    console.log('=== 指令解析测试 ===');
    testCommands.forEach(cmd => {
      const result = parseCommand(cmd);
      console.log(`\n输入: "${cmd}"`);
      console.log('识别:', result.action);
      console.log('参数:', result.params);
      console.log('置信度:', result.confidence);
    });
  };

  return (
    <Box sx={{ p: 4 }}>
      <Typography variant="h4" sx={{ mb: 3 }}>
        🧪 功能测试页面
      </Typography>

      <Alert severity="info" sx={{ mb: 3 }}>
        当前运行在 http://localhost:3002/
      </Alert>

      <Box sx={{ mb: 3 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>
          测试指令解析
        </Typography>
        <Button variant="contained" onClick={testParse} sx={{ mr: 2, mb: 1 }}>
          运行测试 (查看控制台)
        </Button>
      </Box>

      <Box>
        <Typography variant="h6" sx={{ mb: 2 }}>
          导航测试
        </Typography>
        <Button
          variant="outlined"
          onClick={() => navigate('/')}
          sx={{ mr: 2, mb: 1 }}
        >
          经营智能体
        </Button>
        <Button
          variant="outlined"
          onClick={() => navigate('/dashboard')}
          sx={{ mr: 2, mb: 1 }}
        >
          仪表盘
        </Button>
        <Button
          variant="outlined"
          onClick={() => navigate('/products')}
          sx={{ mr: 2, mb: 1 }}
        >
          产品库
        </Button>
      </Box>
    </Box>
  );
}
