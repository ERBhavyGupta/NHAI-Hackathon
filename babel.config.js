module.exports = function(api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      [
        'module-resolver',
        {
          root: ['./'],
          alias: {
            '@': './src'
          }
        }
      ]
    ],
    overrides: [
      {
        test: /node_modules\/(react-native|react-native-worklets)\/.*\.js$/,
        plugins: [
          '@babel/plugin-transform-flow-strip-types',
          ['@babel/plugin-transform-class-properties', { loose: true }],
          ['@babel/plugin-transform-private-methods', { loose: true }],
          ['@babel/plugin-transform-private-property-in-object', { loose: true }],
          ['@babel/plugin-transform-classes', { loose: true }]
        ]
      }
    ]
  };
};
