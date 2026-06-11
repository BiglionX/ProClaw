/**
 * Expo Config Plugin: withReactNativeVectorIconsFonts
 *
 * 在 expo prebuild 之后自动向 android/app/build.gradle 注入
 * `apply from: <react-native-vector-icons>/fonts.gradle`,
 * 让 Gradle 在构建 APK 时自动从 node_modules 复制 TTF 字体。
 *
 * 修复历史：
 *   - v14：补全 react-native-vector-icons 字体打包到 APK（之前 react-native-asset
 *     复制的 fonts/ 目录会被 `expo prebuild --clean` 清空，导致 Tab 图标缺失）
 *
 * 使用：
 *   app.json 的 plugins 数组添加 "./plugins/withReactNativeVectorIconsFonts"
 */
const { withAppBuildGradle } = require('@expo/config-plugins');

const APPLY_LINE = `
# 自动注入：react-native-vector-icons 字体打包
# 由 plugins/withReactNativeVectorIconsFonts.js 维护，请勿手动修改
apply from: file(["node", "--print", "require.resolve('react-native-vector-icons/fonts.gradle')"].execute(null, rootDir).text.trim())
`;

const withReactNativeVectorIconsFonts = (config) => {
  return withAppBuildGradle(config, (config) => {
    let contents = config.modResults.contents;
    if (contents.includes('react-native-vector-icons/fonts.gradle')) {
      return config;
    }
    contents = contents.replace(
      /apply plugin: "com\.facebook\.react"/,
      `apply plugin: "com.facebook.react"${APPLY_LINE}`
    );
    config.modResults.contents = contents;
    return config;
  });
};

module.exports = withReactNativeVectorIconsFonts;