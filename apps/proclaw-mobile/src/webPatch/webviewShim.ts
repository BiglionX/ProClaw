/**
 * webviewShim.ts
 * Web platform shim for react-native-webview.
 * On web, AgentView uses a plain iframe instead of WebView,
 * so this shim provides a minimal no-op export.
 */
import React from 'react';
import { View } from 'react-native';

const WebView: React.FC<any> = (props) => {
  // On web, AgentView conditionally renders only on non-web platforms,
  // so this component should never actually be rendered.
  return React.createElement(View, props);
};

export default WebView;
