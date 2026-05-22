import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';

export default tseslint.config(
  { ignores: ['node_modules', 'data', 'tests/fixtures', 'coverage'] },
  js.configs.recommended,
  {
    files: ['src/**/*.ts', 'tests/**/*.ts'],
    extends: [tseslint.configs.recommended],
  },
  {
    files: ['docs/**/*.js'],
    languageOptions: {
      sourceType: 'script',
      globals: { document: 'readonly', fetch: 'readonly', console: 'readonly' },
    },
  },
  prettier,
);
