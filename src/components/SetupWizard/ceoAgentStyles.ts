/** 安装向导样式常量 */

export const WIZARD_BG_GRADIENT = 'linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)';

export const CEO_AVATAR_COLORS = {
  primary: '#ff3b30',
  secondary: '#ff9500',
  accent: '#ffd700',
};

export const BUBBLE_STYLES = {
  ceo: {
    bg: 'rgba(255, 59, 48, 0.1)',
    border: '1px solid rgba(255, 59, 48, 0.3)',
    color: '#ffffff',
    align: 'flex-start' as const,
  },
  user: {
    bg: 'rgba(255, 149, 0, 0.15)',
    border: '1px solid rgba(255, 149, 0, 0.3)',
    color: '#ffffff',
    align: 'flex-end' as const,
  },
};

export const STEP_LABELS: Record<string, string> = {
  industry: '选择行业',
  greeting: '欢迎',
  path: '安装位置',
  company: '公司命名',
  model: '大模型配置',
  completion: '安装完成',
  store_type: '店铺类型',
  data_import: '导入数据',
  platform_bind: '绑定平台',
  content_init: '内容初始化',
};

export const WIZARD_CONTAINER_SX = {
  height: '100vh',
  width: '100vw',
  background: WIZARD_BG_GRADIENT,
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
  position: 'relative',
  userSelect: 'none' as const,
};

export const CHAT_AREA_SX = {
  flex: 1,
  overflowY: 'auto',
  px: 3,
  py: 2,
  display: 'flex',
  flexDirection: 'column',
  gap: 2,
  '&::-webkit-scrollbar': {
    width: '4px',
  },
  '&::-webkit-scrollbar-thumb': {
    background: 'rgba(255,255,255,0.2)',
    borderRadius: '2px',
  },
};

export const INPUT_AREA_SX = {
  px: 3,
  py: 2,
  borderTop: '1px solid rgba(255,255,255,0.1)',
  background: 'rgba(0,0,0,0.3)',
};
