// Web 平台 console.warn 过滤器
// 必须在所有 react-native-web 导入之前执行，因为 warnOnce 在模块初始化时触发
// 下列警告来自第三方依赖，在 web 端不可操作，仅屏蔽开发噪音

const IGNORED_PATTERNS = [
  'shadow*',                              // react-native-web: shadowColor → boxShadow
  'pointerEvents is deprecated',          // react-native-web: props → style
  'useNativeDriver',                      // Animated: web 不支持原生驱动
  'Reduced motion',                       // Reanimated: 系统无障碍设置
  'Support for defaultProps',             // react-native-paper: TextInput.Icon
];

if (typeof window !== 'undefined' && typeof console !== 'undefined') {
  const _warn = console.warn.bind(console);
  console.warn = function (...args: any[]) {
    const msg = typeof args[0] === 'string' ? args[0] : '';
    if (IGNORED_PATTERNS.some(p => msg.includes(p))) return;
    return _warn(...args);
  };
}
