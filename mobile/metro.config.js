/**
 * Metro configuration for ProClaw Mobile
 * Handles web platform module resolution for native-only packages
 */
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// LiveKit: avoid dual-instance resolution under Metro package exports
config.resolver.unstable_conditionNames = ['react-native', 'require'];

// Resolve react-native-webview to a web mock
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform === 'web' && moduleName === 'react-native-webview') {
    return {
      type: 'sourceFile',
      filePath: require.resolve('./src/webPatch/webviewShim.ts'),
    };
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
