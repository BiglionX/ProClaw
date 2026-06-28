/**
 * __mocks__/react-native.ts
 * Jest mock for react-native - provides Platform and other commonly used exports
 */

export const Platform = {
  OS: 'web',
  Version: 'mock',
  select: (obj: any) => obj.web || obj.default || {},
};

export const LogBox = {
  ignoreLogs: () => {},
  ignoreAllLogs: () => {},
};

export const NativeModules = {};

export const DeviceEventEmitter = {
  addListener: () => ({ remove: () => {} }),
  removeAllListeners: () => {},
};

export const NativeEventEmitter = class {
  constructor() {}
  addListener() {
    return { remove: () => {} };
  }
  removeAllListeners() {}
};

export const Appearance = {
  getColorScheme: () => 'light',
  addChangeListener: () => ({ remove: () => {} }),
};

export const Dimensions = {
  get: () => ({ width: 375, height: 812 }),
  addEventListener: () => ({ remove: () => {} }),
};

const ReactNative = {
  Platform,
  LogBox,
  NativeModules,
  DeviceEventEmitter,
  NativeEventEmitter,
  Appearance,
  Dimensions,
};

export default ReactNative;
