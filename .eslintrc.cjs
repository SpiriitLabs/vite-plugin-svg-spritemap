// @ts-check
const { defineConfig } = require('eslint-define-config')

module.exports = defineConfig({
	root: true,
	parser: '@typescript-eslint/parser',
	plugins: ['@typescript-eslint'],
	extends: [
		'eslint:recommended',
		'plugin:@typescript-eslint/recommended',
		'prettier',
		'plugin:import/recommended',
		'plugin:import/typescript',
		'plugin:node/recommended'
	],
	rules: {
		eqeqeq: ['warn', 'always', { null: 'never' }],
		'@typescript-eslint/no-var-requires': 'off',
		'@typescript-eslint/ban-ts-comment': [
			'error',
			{ 'ts-ignore': 'allow-with-description' }
		],
		'node/no-extraneous-import': 'off',
		'node/no-extraneous-require': 'off',
		'node/no-missing-import': 'off',
		'node/no-missing-require': 'off',
		'node/no-deprecated-api': 'off',
		'node/no-unpublished-import': 'off',
		'node/no-unpublished-require': 'off',
		'node/no-unsupported-features/es-syntax': 'off',
		'import/order': 'error'
	}
})
