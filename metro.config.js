const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Enable "Package Exports" support, which is required for many modern 
// React Navigation and side-drawer dependencies to resolve correctly.
config.resolver.unstable_enablePackageExports = true;

module.exports = config;
