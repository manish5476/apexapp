const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// 1. Enable "Package Exports" support for modern navigation libraries
config.resolver.unstable_enablePackageExports = true;

// 2. Ensure all necessary extensions are resolved, prioritizing JS/TS
config.resolver.sourceExts = [...config.resolver.sourceExts, 'mjs', 'cjs'];

module.exports = config;
