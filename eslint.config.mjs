import { createRequire } from 'module'

const require = createRequire(import.meta.url)
const nextPlugin = require('@next/eslint-plugin-next')

export default [
  nextPlugin.flatConfig.recommended,
  nextPlugin.flatConfig.coreWebVitals,
  {
    ignores: ['.next/**', 'out/**', 'build/**', 'next-env.d.ts'],
  },
]
