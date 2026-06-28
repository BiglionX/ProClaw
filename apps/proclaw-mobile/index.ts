import './src/webPatch'; // Web 平台补丁：必须在 App 之前加载
import './src/livekit/bootstrap'; // LiveKit globals (native only via .native.ts)
import { registerRootComponent } from 'expo';

import App from './App';

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
