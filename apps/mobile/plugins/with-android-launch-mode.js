// RevenueCat: the Activity that starts purchases must not be `singleTask` (Expo's default),
// or Play Billing flows can be cancelled when the app is backgrounded mid-purchase.
// https://www.revenuecat.com/docs/getting-started/installation/reactnative
const { AndroidConfig, withAndroidManifest } = require('expo/config-plugins');

module.exports = function withAndroidLaunchMode(config, { launchMode = 'singleTop' } = {}) {
  return withAndroidManifest(config, (cfg) => {
    const activity = AndroidConfig.Manifest.getMainActivityOrThrow(cfg.modResults);
    activity.$['android:launchMode'] = launchMode;
    return cfg;
  });
};
