import pluginJs from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';

import eslintPluginAstro from 'eslint-plugin-astro';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';

export default [
  {
    files: ['**/*.{js,mjs,cjs,ts,astro}'],
    ignores: ['node_modules', 'dist', '.husky'],
    languageOptions: {
      globals: globals.browser,
      parser: 'astro-eslint-parser',
      parserOptions: {
        parser: '@typescript-eslint/parser',
        extraFileExtensions: ['.astro'],
      },
    },
  },
  pluginJs.configs.recommended,
  ...tseslint.configs.recommended,

  // Custom plugins
  eslintPluginPrettierRecommended,
  ...eslintPluginAstro.configs.recommended,
  ...eslintPluginAstro.configs['jsx-a11y-recommended'],
];
