// Metro config for the pnpm monorepo.
// 1. `.sql` drizzle migrations are bundled as source (inlined by babel-plugin-inline-import).
// 2. Singleton pinning: pnpm's isolated layout gives some Expo packages a second peer
//    resolution (apps/web pins a newer React), e.g. @expo/metro-runtime and expo-sqlite can
//    see react@19.2.8 and another react-native copy. Two Reacts in one bundle crash with
//    "Invalid hook call", so these packages always resolve to the app's own copies.
const fs = require('fs');
const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const projectRoot = __dirname;
const config = getDefaultConfig(projectRoot);

config.resolver.sourceExts = [...config.resolver.sourceExts, 'sql'];

const SINGLETONS = [
  'react',
  'react-dom',
  'react-native',
  'react-native-web',
  'expo',
  'expo-modules-core',
  'expo-constants',
  'expo-asset',
  'expo-font',
  'expo-file-system',
  'expo-keep-awake',
  'expo-linking',
  'expo-sqlite',
  'expo-router',
  '@expo/metro-runtime',
  '@react-native/virtualized-lists',
  'react-native-safe-area-context',
  'react-native-screens',
];

// Real directories of the app's own `expo` and `react-native` in the pnpm store.
const expoDir = fs.realpathSync(path.dirname(require.resolve('expo/package.json', { paths: [projectRoot] })));
const reactNativeDir = fs.realpathSync(
  path.dirname(require.resolve('react-native/package.json', { paths: [projectRoot] })),
);

// A package is directly visible from `dir` when it sits in `dir/node_modules` (the app) or
// next to it in the same pnpm store folder (`.pnpm/<pkg>@<hash>/node_modules/<name>`).
// Node's walk-up into `.pnpm/node_modules` is deliberately not used: Metro does not see it.
function visibleFrom(name, dir, isApp) {
  const candidate = isApp ? path.join(dir, 'node_modules', name) : path.join(dir, '..', ...name.split('/'));
  return fs.existsSync(path.join(candidate, 'package.json'));
}

const origins = new Map();
for (const name of SINGLETONS) {
  const order = name.startsWith('@react-native/') ? [reactNativeDir, expoDir] : [expoDir, reactNativeDir];
  if (visibleFrom(name, projectRoot, true)) origins.set(name, path.join(projectRoot, 'package.json'));
  else {
    const dir = order.find((d) => visibleFrom(name, d, false));
    if (dir) origins.set(name, path.join(dir, 'package.json'));
  }
}

const packageNameOf = (request) =>
  request.startsWith('@') ? request.split('/').slice(0, 2).join('/') : request.split('/')[0];

const upstreamResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  const resolve = upstreamResolveRequest ?? context.resolveRequest;
  const isBare = !moduleName.startsWith('.') && !path.isAbsolute(moduleName);
  const origin = isBare ? origins.get(packageNameOf(moduleName)) : undefined;
  if (origin && context.originModulePath !== origin) {
    return resolve({ ...context, originModulePath: origin }, moduleName, platform);
  }
  return resolve(context, moduleName, platform);
};

module.exports = config;
