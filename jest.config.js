module.exports = {
  preset: '@react-native/jest-preset',
  moduleNameMapper: {
    '^react-native-reanimated$':
      '<rootDir>/__mocks__/react-native-reanimated.js',
    '^react-native-vector-icons/Ionicons$':
      '<rootDir>/__mocks__/react-native-vector-icons/Ionicons.js',
  },
};
