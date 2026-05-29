import tsPlugin from '@typescript-eslint/eslint-plugin'
import tsParser from '@typescript-eslint/parser'
import reactPlugin from 'eslint-plugin-react'
import reactHooksPlugin from 'eslint-plugin-react-hooks'
import prettierConfig from 'eslint-config-prettier'

export default [
    {
        files: ['src/**/*.{ts,tsx}'],
        languageOptions: {
            parser: tsParser,
            parserOptions: {
                ecmaVersion: 'latest',
                sourceType: 'module',
                ecmaFeatures: { jsx: true },
            },
            globals: {
                window: 'readonly',
                document: 'readonly',
                console: 'readonly',
                setTimeout: 'readonly',
                clearTimeout: 'readonly',
                Date: 'readonly',
                URL: 'readonly',
                File: 'readonly',
                HTMLInputElement: 'readonly',
                HTMLTextAreaElement: 'readonly',
                KeyboardEvent: 'readonly',
                MutationObserver: 'readonly',
                Image: 'readonly',
                FileReader: 'readonly',
                Promise: 'readonly',
                Math: 'readonly',
                Object: 'readonly',
                Array: 'readonly',
                Boolean: 'readonly',
                Number: 'readonly',
                String: 'readonly',
                Error: 'readonly',
                HTMLElement: 'readonly',
                HTMLCanvasElement: 'readonly',
                HTMLButtonElement: 'readonly',
                HTMLDivElement: 'readonly',
                Element: 'readonly',
                Event: 'readonly',
                MouseEvent: 'readonly',
                TouchEvent: 'readonly',
                WheelEvent: 'readonly',
                CustomEvent: 'readonly',
                AbortController: 'readonly',
                AbortSignal: 'readonly',
                ResizeObserver: 'readonly',
                IntersectionObserver: 'readonly',
                requestAnimationFrame: 'readonly',
                cancelAnimationFrame: 'readonly',
                location: 'readonly',
                history: 'readonly',
                navigator: 'readonly',
                performance: 'readonly',
                localStorage: 'readonly',
                sessionStorage: 'readonly',
                fetch: 'readonly',
                Headers: 'readonly',
                Request: 'readonly',
                Response: 'readonly',
                FormData: 'readonly',
                Blob: 'readonly',
                FileList: 'readonly',
                DataTransfer: 'readonly',
                DragEvent: 'readonly',
                FocusEvent: 'readonly',
                InputEvent: 'readonly',
                ClipboardEvent: 'readonly',
                structuredClone: 'readonly',
                queueMicrotask: 'readonly',
                setInterval: 'readonly',
                clearInterval: 'readonly',
            },
        },
        plugins: {
            '@typescript-eslint': tsPlugin,
            react: reactPlugin,
            'react-hooks': reactHooksPlugin,
        },
        settings: {
            react: { version: 'detect' },
        },
        rules: {
            // TypeScript
            '@typescript-eslint/no-explicit-any': 'warn',
            '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],

            // React
            'react/react-in-jsx-scope': 'off',
            'react/prop-types': 'off',
            'react-hooks/rules-of-hooks': 'error',
            'react-hooks/exhaustive-deps': 'warn',

            // General
            'no-console': ['warn', { allow: ['error', 'warn'] }],
            'no-unused-vars': 'off', // handled by @typescript-eslint/no-unused-vars
        },
    },
    prettierConfig,
]
