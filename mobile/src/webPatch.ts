// Web 平台 console.warn 过滤器
// 必须在所有 react-native-web 导入之前执行，因为 warnOnce 在模块初始化时触发
// 下列警告来自第三方依赖，在 web 端不可操作，仅屏蔽开发噪音

// 审计 R2-T3：改用正则匹配代替字符串字面量（原 'shadow*' 永远不会匹配星号字符）
const IGNORED_PATTERNS = [
  /shadow/i,                              // react-native-web: shadowColor → boxShadow
  /pointerEvents is deprecated/i,         // react-native-web: props → style
  /useNativeDriver/i,                     // Animated: web 不支持原生驱动
  /Reduced motion/i,                      // Reanimated: 系统无障碍设置
  /Support for defaultProps/i,            // react-native-paper: TextInput.Icon
];

if (typeof window !== 'undefined' && typeof console !== 'undefined') {
  const _warn = console.warn.bind(console);
  console.warn = function (...args: any[]) {
    const msg = typeof args[0] === 'string' ? args[0] : '';
    if (IGNORED_PATTERNS.some(p => p.test(msg))) return;
    return _warn(...args);
  };
}
