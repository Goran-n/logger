module.exports = function (api) {
  api.cache(true);

  const presets = [
    [ 'latest-node', { target: 'current' } ],
    '@babel/preset-env'
  ];
  const plugins = [
    [
      '@babel/plugin-transform-runtime',
      {
        absoluteRuntime: false,
        corejs: false,
        helpers: true,
        regenerator: true,
        useESModules: false
      }
    ],
    [ 'babel-plugin-module-resolver', {
      alias: {
        '@plugins': './src/plugins',
        '@config': './src/config',
        '@units': './src/units',
        '@schema': './src/schema',
      }
    } ],
    [
      '@babel/plugin-proposal-class-properties',
      {
        loose: true
      }
    ],
    '@babel/plugin-proposal-throw-expressions'
  ];

  return {
    presets,
    plugins
  };
};
