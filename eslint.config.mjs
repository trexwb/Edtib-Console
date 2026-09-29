/**
 * @description ESLint flat config（ESLint 10 已移除 .eslintrc 支持，由此文件替代原 .eslintrc.js + .eslintignore）
 */
import skipFormatting from '@vue/eslint-config-prettier/skip-formatting'
import { defineConfigWithVueTs, vueTsConfigs } from '@vue/eslint-config-typescript'
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended'
import pluginVue from 'eslint-plugin-vue'
import globals from 'globals'

export default defineConfigWithVueTs(
  {
    // 原 .eslintignore 迁移
    ignores: ['node_modules', 'dist', 'public', 'src/assets', 'src/icons', 'library/build/unplugin/components.d.ts'],
  },
  pluginVue.configs['flat/recommended'],
  vueTsConfigs.recommended,
  eslintPluginPrettierRecommended,
  skipFormatting,
  {
    languageOptions: {
      ecmaVersion: 2020,
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.node,
        defineOptions: 'writable',
      },
    },
    rules: {
      '@typescript-eslint/ban-ts-comment': 'warn',
      '@typescript-eslint/no-empty-function': 'off',
      // 规范整改：any 增量拦截（存量重灾区已重构，剩余文件逐步治理）
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/no-this-alias': 'off',
      // 规范整改：console 仅允许 warn/error，生产构建由 vite esbuild.drop 统一移除
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'no-debugger': 'warn',
      'prefer-template': 'error',
      'prettier/prettier': 'warn',
      'vue/attributes-order': ['warn', { alphabetical: true }],
      'vue/component-name-in-template-casing': ['error', 'kebab-case', { registeredComponentsOnly: false, ignores: [] }],
      'vue/html-self-closing': ['error', { html: { void: 'any', normal: 'any', component: 'always' }, svg: 'always', math: 'always' }],
      'vue/multi-word-component-names': 'off',
      'vue/no-reserved-component-names': 'off',
      'vue/no-setup-props-destructure': 'off',
      'vue/no-v-html': 'warn',
      // 规范整改：props 应提供默认值
      'vue/require-default-prop': 'warn',
      'vue/v-on-event-hyphenation': ['error', 'always', { autofix: true }],
    },
  },
)
