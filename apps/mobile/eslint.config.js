const { FlatCompat } = require('@eslint/eslintrc');
const globals = require('globals');

// eslint-config-expo's own "flat" entrypoint hardcodes `require('eslint/config')`,
// which breaks in this monorepo because apps/api pins ESLint 8 and hoists an
// eslint@8 copy above the shared node_modules/eslint-config-expo (no "eslint/config"
// export in v8). Bridge the legacy (eslintrc-format) export through FlatCompat instead.
const compat = new FlatCompat({ baseDirectory: __dirname });

module.exports = [
  ...compat.extends('eslint-config-expo'),
  {
    // Runtime globals available in the RN JS engine (timers, console, fetch, ...)
    // that eslint-config-expo's shared ruleset leaves undeclared.
    languageOptions: { globals: { ...globals.browser } },
  },
  {
    files: ['eslint.config.js', 'babel.config.js'],
    languageOptions: { globals: { ...globals.node } },
  },
  { ignores: ['.expo/**', 'node_modules/**'] },
];
