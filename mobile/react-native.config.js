/**
 * React Native 配置
 *
 * 用于 react-native-asset 在 prebuild 时将资源（字体、图像）复制到原生项目。
 * 当前配置：将 react-native-vector-icons 的所有 TTF 字体打包到 Android assets/
 *
 * 对应 PRD v11.0 第3.2节：Tab 图标（MaterialCommunityIcons）依赖此配置
 *
 * 修复历史：
 *   - v14：补全 react-native-vector-icons 字体打包配置（修复 APK 安装后 Tab 图标缺失问题）
 */
module.exports = {
  project: {
    ios: {},
    android: {},
  },
  assets: [
    './node_modules/react-native-vector-icons/Fonts/',
  ],
};