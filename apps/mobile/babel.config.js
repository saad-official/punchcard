// babel-preset-expo already handles expo-router, React Compiler (experiments.reactCompiler)
// and the expo-widgets 'widget' directive. inline-import turns drizzle's .sql migrations
// into strings for `drizzle/migrations.js`.
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [['inline-import', { extensions: ['.sql'] }]],
  };
};
