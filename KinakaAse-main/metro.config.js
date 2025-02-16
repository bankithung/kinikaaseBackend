const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');

const customConfig = {
  resolver: {
    extraNodeModules: {
      crypto: require.resolve('react-native-crypto'),
      stream: require.resolve('stream-browserify'),
    },
  },
};

module.exports = mergeConfig(getDefaultConfig(__dirname), customConfig);
