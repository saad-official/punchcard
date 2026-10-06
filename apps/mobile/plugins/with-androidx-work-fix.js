// Forces one androidx.work version. Without it the debug build fails in
// :app:checkDebugDuplicateClasses because one native module pulls
// work-runtime 2.8.1 while another pulls work-runtime-ktx 2.7.1.
const { withAppBuildGradle } = require("expo/config-plugins");

const MARKER = "// punchcard: androidx.work version alignment";
const BLOCK = `
${MARKER}
configurations.all {
  resolutionStrategy {
    force "androidx.work:work-runtime:2.9.1"
    force "androidx.work:work-runtime-ktx:2.9.1"
  }
}
`;

module.exports = function withAndroidxWorkFix(config) {
  return withAppBuildGradle(config, (mod) => {
    if (!mod.modResults.contents.includes(MARKER)) {
      mod.modResults.contents += BLOCK;
    }
    return mod;
  });
};
