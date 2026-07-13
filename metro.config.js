const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');
const path = require('path');

const config = getDefaultConfig(__dirname);

// react-native-svg ships "react-native": "src/index.ts" which makes Metro use its
// TypeScript source. On Metro 0.81 (RN 0.81 / Expo SDK 54) that source tree fails
// to resolve FeTile on Windows. Force the compiled output instead.
const svgMain = path.resolve(__dirname, 'node_modules/react-native-svg/lib/commonjs/index.js');
const originalResolve = config.resolver?.resolveRequest;
config.resolver.resolveRequest = (ctx, moduleName, platform) => {
  if (moduleName === 'react-native-svg') {
    return { type: 'sourceFile', filePath: svgMain };
  }
  return originalResolve
    ? originalResolve(ctx, moduleName, platform)
    : ctx.resolveRequest(ctx, moduleName, platform);
};

module.exports = withNativeWind(config, { input: './global.css' });
